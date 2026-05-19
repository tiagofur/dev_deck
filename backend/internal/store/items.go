package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"devdeck/internal/domain/items"
	"devdeck/internal/domain/repos"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const itemColumns = `id, user_id, org_id, item_type, title, url, url_normalized, description,
	notes, tags, why_saved, when_to_use, source_channel, meta, ai_summary,
	ai_tags, enrichment_status, archived, is_favorite, created_at, updated_at, last_seen_at`

const itemColumnsPrefixed = `i.id, i.user_id, i.org_id, i.item_type, i.title, i.url, i.url_normalized, i.description,
	i.notes, i.tags, i.why_saved, i.when_to_use, i.source_channel, i.meta, i.ai_summary,
	i.ai_tags, i.enrichment_status, i.archived, i.is_favorite, i.created_at, i.updated_at, i.last_seen_at`

func scanItem(row pgx.Row) (*items.Item, error) {
	var it items.Item
	var rawMeta []byte
	var itemType, enrichStatus string
	var userID *uuid.UUID
	err := row.Scan(
		&it.ID, &userID, &it.OrgID, &itemType, &it.Title, &it.URL, &it.URLNormalized,
		&it.Description, &it.Notes, &it.Tags, &it.WhySaved, &it.WhenToUse,
		&it.SourceChannel, &rawMeta, &it.AISummary, &it.AITags,
		&enrichStatus, &it.Archived, &it.IsFavorite, &it.CreatedAt, &it.UpdatedAt, &it.LastSeenAt,
	)
	if err != nil {
		return nil, err
	}
	if userID != nil {
		it.UserID = *userID
	}
	it.Type = items.Type(itemType)
	it.EnrichmentStatus = items.EnrichmentStatus(enrichStatus)
	if len(rawMeta) > 0 {
		if err := json.Unmarshal(rawMeta, &it.Meta); err != nil {
			return nil, fmt.Errorf("decode item meta: %w", err)
		}
	}
	if it.Meta == nil {
		it.Meta = map[string]any{}
	}
	if it.Tags == nil {
		it.Tags = []string{}
	}
	if it.AITags == nil {
		it.AITags = []string{}
	}
	return &it, nil
}

type CreateItemInput struct {
	Type          items.Type
	Title         string
	URL           *string
	URLNormalized *string
	Description   *string
	Notes         string
	Tags          []string
	WhySaved      string
	WhenToUse     string
	SourceChannel string
	Meta          map[string]any
}

func (s *Store) CreateItem(ctx context.Context, in CreateItemInput) (*items.Item, error) {
	userID := currentUserIDPtr(ctx)
	orgID := currentOrgIDPtr(ctx)

	if in.Tags == nil {
		in.Tags = []string{}
	}
	if in.Meta == nil {
		in.Meta = map[string]any{}
	}

	metaJSON, _ := json.Marshal(in.Meta)

	row := s.Writer().QueryRow(ctx, `
		INSERT INTO items (
			user_id, org_id, item_type, title, url, url_normalized, 
			description, notes, tags, why_saved, when_to_use, 
			source_channel, meta, enrichment_status
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
		RETURNING `+itemColumns,
		userID, orgID, string(in.Type), in.Title, in.URL, in.URLNormalized,
		in.Description, in.Notes, in.Tags, in.WhySaved, in.WhenToUse,
		in.SourceChannel, metaJSON,
	)

	it, err := scanItem(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return it, nil
}

func (s *Store) GetItem(ctx context.Context, id uuid.UUID) (*items.Item, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.Reader().QueryRow(ctx, `SELECT `+itemColumns+` FROM items WHERE id = $1 AND `+scopeSQL, args...)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return it, nil
}

func (s *Store) GetItemByNormalizedURL(ctx context.Context, userID uuid.UUID, normURL string) (*items.Item, error) {
	row := s.Reader().QueryRow(ctx, `
		SELECT `+itemColumns+` FROM items 
		WHERE user_id = $1 AND url_normalized = $2 AND archived = false
		LIMIT 1`,
		userID, normURL,
	)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return it, nil
}

func (s *Store) ListItems(ctx context.Context, p items.ListParams) (*items.ListResult, error) {
	if p.Limit <= 0 || p.Limit > 500 {
		p.Limit = 100
	}
	if p.Offset < 0 {
		p.Offset = 0
	}

	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	where := []string{scopeSQL}
	args := append([]any{}, scopeArgs...)
	idx := len(args) + 1

	if p.Type != "" {
		where = append(where, fmt.Sprintf("item_type = $%d", idx))
		args = append(args, p.Type)
		idx++
	}

	if p.Tag != "" {
		where = append(where, fmt.Sprintf("($%d = ANY(tags) OR $%d = ANY(ai_tags))", idx, idx))
		args = append(args, p.Tag)
		idx++
	}

	if len(p.Stack) > 0 {
		where = append(where, fmt.Sprintf(`(
			EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE lower(t) = ANY($%d::text[]))
			OR EXISTS (SELECT 1 FROM unnest(ai_tags) AS t WHERE lower(t) = ANY($%d::text[]))
			OR lower(COALESCE(meta->>'language','')) = ANY($%d::text[])
			OR EXISTS (
				SELECT 1
				FROM jsonb_array_elements_text(COALESCE(meta->'topics','[]'::jsonb)) AS topic
				WHERE lower(topic) = ANY($%d::text[])
			)
		)`, idx, idx, idx, idx))
		args = append(args, p.Stack)
		idx++
	}

	if p.Favorites {
		where = append(where, "is_favorite = true")
	}

	if p.Archived != nil {
		where = append(where, fmt.Sprintf("archived = $%d", idx))
		args = append(args, *p.Archived)
		idx++
	} else {
		where = append(where, "archived = false")
	}

	if p.Q != "" {
		where = append(where, fmt.Sprintf(
			"(title || ' ' || COALESCE(description,'') || ' ' || COALESCE(immutable_array_to_string(tags,' '),'')) %% $%d",
			idx,
		))
		args = append(args, p.Q)
		idx++
	}

	if p.CreatedAfter != nil {
		where = append(where, fmt.Sprintf("created_at > $%d", idx))
		args = append(args, *p.CreatedAfter)
		idx++
	}

	whereSQL := strings.Join(where, " AND ")

	var total int
	countSQL := "SELECT COUNT(*) FROM items WHERE " + whereSQL
	if err := s.Reader().QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, err
	}

	orderBy := "created_at DESC"
	switch p.Sort {
	case "added_asc":
		orderBy = "created_at ASC"
	case "updated_desc":
		orderBy = "updated_at DESC"
	case "title_asc":
		orderBy = "title ASC"
	}

	listArgs := append(args, p.Limit, p.Offset)
	listSQL := fmt.Sprintf(
		"SELECT %s FROM items WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d",
		itemColumns, whereSQL, orderBy, idx, idx+1,
	)
	rows, err := s.Reader().Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var itemsList []*items.Item
	for rows.Next() {
		r, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		itemsList = append(itemsList, r)
	}

	return &items.ListResult{Total: total, Items: itemsList}, rows.Err()
}

func (s *Store) UpdateItem(ctx context.Context, id uuid.UUID, in items.UpdateInput) (*items.Item, error) {
	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := tx.QueryRow(ctx, `SELECT `+itemColumns+` FROM items WHERE id = $1 AND `+scopeSQL+` FOR UPDATE`, args...)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if in.Notes != nil {
		it.Notes = *in.Notes
	}
	if in.Tags != nil {
		it.Tags = in.Tags
	}
	if in.Archived != nil {
		it.Archived = *in.Archived
	}
	if in.IsFavorite != nil {
		it.IsFavorite = *in.IsFavorite
	}

	if in.Title != nil {
		it.Title = *in.Title
	}
	if in.WhySaved != nil {
		it.WhySaved = *in.WhySaved
	}
	if in.WhenToUse != nil {
		it.WhenToUse = *in.WhenToUse
	}
	if in.ItemType != nil {
		it.Type = items.Type(*in.ItemType)
	}

	updateScopeSQL, updateScopeArgs := ownerClause(ctx, "user_id", 10)
	updateArgs := append([]any{
		it.Title, it.Notes, it.Tags, it.Archived, it.IsFavorite, it.WhySaved, it.WhenToUse, string(it.Type), id,
	}, updateScopeArgs...)
	updatedRow := tx.QueryRow(ctx, `
		UPDATE items
		SET title = $1,
		    notes = $2,
		    tags = $3,
		    archived = $4,
		    is_favorite = $5,
		    why_saved = $6,
		    when_to_use = $7,
		    item_type = $8,
		    updated_at = NOW()
		WHERE id = $9 AND `+updateScopeSQL+`
		RETURNING `+itemColumns,
		updateArgs...)

	updated, err := scanItem(updatedRow)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *Store) DeleteItem(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.Writer().Exec(ctx, `DELETE FROM items WHERE id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) MarkItemSeen(ctx context.Context, id uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `UPDATE items SET last_seen_at = NOW() WHERE id = $1`, id)
	return err
}

func (s *Store) UpdateItemMetadata(ctx context.Context, id uuid.UUID, md *repos.Metadata) error {
	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	row := tx.QueryRow(ctx, `SELECT meta FROM items WHERE id = $1 FOR UPDATE`, id)
	var rawMeta []byte
	if err := row.Scan(&rawMeta); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	var meta map[string]any
	if len(rawMeta) > 0 {
		_ = json.Unmarshal(rawMeta, &meta)
	}
	if meta == nil {
		meta = map[string]any{}
	}

	if md.Language != nil {
		meta["language"] = *md.Language
	}
	if md.LanguageColor != nil {
		meta["language_color"] = *md.LanguageColor
	}
	meta["stars"] = md.Stars
	meta["forks"] = md.Forks
	if md.AvatarURL != nil {
		meta["avatar_url"] = *md.AvatarURL
	}
	if md.OGImageURL != nil {
		meta["og_image_url"] = *md.OGImageURL
	}
	if md.Homepage != nil {
		meta["homepage"] = *md.Homepage
	}
	if md.Topics != nil {
		meta["topics"] = md.Topics
	}
	merged, err := json.Marshal(meta)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		UPDATE items
		SET meta = $1,
		    description = COALESCE($2, description),
		    enrichment_status = 'ok',
		    updated_at = NOW()
		WHERE id = $3
	`, merged, md.Description, id)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Store) UpdateItemEnrichmentStatus(ctx context.Context, id uuid.UUID, status items.EnrichmentStatus) error {
	_, err := s.Writer().Exec(ctx, `UPDATE items SET enrichment_status = $1 WHERE id = $2`, string(status), id)
	return err
}

// UpdateItemAIFields stores AI-generated summary and suggestion tags.
func (s *Store) UpdateItemAIFields(ctx context.Context, id uuid.UUID, summary string, tags []string) error {
	if tags == nil {
		tags = []string{}
	}
	tag, err := s.Writer().Exec(ctx, `
		UPDATE items
		SET ai_summary = $1,
		    ai_tags = $2,
		    updated_at = NOW()
		WHERE id = $3
	`, summary, tags, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ReviewItemAITags updates the editable AI suggestion set and optionally
// merges the reviewed suggestions into the user's manual tags.
func (s *Store) ReviewItemAITags(ctx context.Context, id uuid.UUID, in items.ReviewAITagsInput) (*items.Item, error) {
	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	selectScopeSQL, selectScopeArgs := ownerClause(ctx, "user_id", 2)
	selectArgs := append([]any{id}, selectScopeArgs...)
	row := tx.QueryRow(ctx,
		`SELECT `+itemColumns+` FROM items WHERE id = $1 AND `+selectScopeSQL+` FOR UPDATE`,
		selectArgs...)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	aiTags := normalizeTags(in.AITags)
	manualTags := it.Tags
	if in.Apply {
		manualTags = mergeTags(it.Tags, aiTags)
	}

	updateScopeSQL, updateScopeArgs := ownerClause(ctx, "user_id", 4)
	updateArgs := append([]any{aiTags, manualTags, id}, updateScopeArgs...)
	updatedRow := tx.QueryRow(ctx, `
		UPDATE items
		SET ai_tags = $1,
		    tags = $2,
		    updated_at = NOW()
		WHERE id = $3 AND `+updateScopeSQL+`
		RETURNING `+itemColumns,
		updateArgs...,
	)
	updated, err := scanItem(updatedRow)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func normalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return []string{}
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(tags))
	for _, tag := range tags {
		t := strings.ToLower(strings.TrimSpace(tag))
		t = strings.ReplaceAll(t, " ", "-")
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		out = append(out, t)
	}
	sort.Strings(out)
	return out
}

func mergeTags(existing, suggested []string) []string {
	return normalizeTags(append(append([]string{}, existing...), suggested...))
}

// GetUserTags returns all unique tags (manual + AI) for a user's items, sorted by usage count.
func (s *Store) GetUserTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	const q = `
		SELECT tag, COUNT(*) as cnt
		FROM (
			SELECT unnest(tags) as tag FROM items WHERE user_id = $1 AND array_length(tags, 1) > 0
			UNION ALL
			SELECT unnest(ai_tags) as tag FROM items WHERE user_id = $1 AND array_length(ai_tags, 1) > 0
		) t(tag)
		GROUP BY tag
		ORDER BY cnt DESC, tag ASC
		LIMIT 50
	`
	rows, err := s.Reader().Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var tag string
		var cnt int
		if err := rows.Scan(&tag, &cnt); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

// ───── Search & Recommendations ─────

type SearchMode string

const (
	SearchModeText   SearchMode = "text"
	SearchModeVector SearchMode = "vector"
	SearchModeHybrid SearchMode = "hybrid"
)

type SearchItemsResult struct {
	ID            uuid.UUID  `json:"id"`
	Type          string     `json:"item_type"`
	Title         string     `json:"title"`
	WhySaved      string     `json:"why_saved"`
	URL           *string    `json:"url"`
	Similarity    float64    `json:"similarity"`
	OrgID         *uuid.UUID `json:"org_id,omitempty"`
	CuratorName   string     `json:"curator_name,omitempty"`
	CuratorAvatar string     `json:"curator_avatar,omitempty"`
}

func (s *Store) SearchItems(ctx context.Context, mode SearchMode, query string, queryEmbedding []float32, limit int) ([]SearchItemsResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	switch mode {
	case SearchModeVector, SearchModeHybrid:
		if len(queryEmbedding) == 0 {
			return nil, errors.New("embedding required for semantic search")
		}
		return s.searchItemsHybrid(ctx, query, queryEmbedding, limit, mode == SearchModeHybrid)
	default:
		return s.searchItemsText(ctx, query, limit)
	}
}

func (s *Store) searchItemsText(ctx context.Context, query string, limit int) ([]SearchItemsResult, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "i.user_id", 3)
	q := fmt.Sprintf(`
		SELECT i.id, i.item_type, i.title, i.why_saved, i.url,
		       similarity(i.title, $1) + similarity(COALESCE(i.why_saved, ''), $1) as sim,
		       i.org_id, COALESCE(u.username, '') as curator_name, COALESCE(u.avatar_url, '') as curator_avatar
		FROM items i
		LEFT JOIN users u ON u.id = i.user_id
		WHERE %s
		  AND i.archived = false
		  AND (i.title ILIKE '%%' || $1 || '%%'
		       OR i.why_saved ILIKE '%%' || $1 || '%%'
		       OR $1 = ANY(i.tags)
		       OR EXISTS (
		           SELECT 1 FROM unnest(i.ai_tags) t WHERE t ILIKE '%%' || $1 || '%%'
		       ))
		ORDER BY sim DESC
		LIMIT $2
	`, scopeSQL)

	args := append([]any{query, limit}, scopeArgs...)
	rows, err := s.Reader().Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SearchItemsResult
	for rows.Next() {
		var r SearchItemsResult
		var sim float64
		if err := rows.Scan(&r.ID, &r.Type, &r.Title, &r.WhySaved, &r.URL, &sim, &r.OrgID, &r.CuratorName, &r.CuratorAvatar); err != nil {
			return nil, err
		}
		r.Similarity = normalizeSim(sim)
		results = append(results, r)
	}
	if results == nil {
		results = []SearchItemsResult{}
	}
	return results, rows.Err()
}

func (s *Store) searchItemsHybrid(ctx context.Context, query string, embedding []float32, limit int, useText bool) ([]SearchItemsResult, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "i.user_id", 3)
	// Get vector results
	vecQ := fmt.Sprintf(`
		SELECT i.id, i.item_type, i.title, i.why_saved, i.url,
		       1 - (i.embedding <=> $1) as sim,
		       i.org_id, COALESCE(u.username, '') as curator_name, COALESCE(u.avatar_url, '') as curator_avatar
		FROM items i
		LEFT JOIN users u ON u.id = i.user_id
		WHERE %s
		  AND i.archived = false
		  AND i.embedding IS NOT NULL
		ORDER BY i.embedding <=> $1
		LIMIT $2
	`, scopeSQL)

	args := append([]any{embedding, limit}, scopeArgs...)
	rows, err := s.Reader().Query(ctx, vecQ, args...)
	if err != nil {
		return nil, err
	}

	var vecResults []SearchItemsResult
	for rows.Next() {
		var r SearchItemsResult
		var sim float64
		if err := rows.Scan(&r.ID, &r.Type, &r.Title, &r.WhySaved, &r.URL, &sim, &r.OrgID, &r.CuratorName, &r.CuratorAvatar); err != nil {
			return nil, err
		}
		r.Similarity = sim // 1 - cosine_distance = similarity
		vecResults = append(vecResults, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()

	if !useText || query == "" {
		if vecResults == nil {
			vecResults = []SearchItemsResult{}
		}
		return vecResults, nil
	}

	// Get text results and merge
	textResults, err := s.searchItemsText(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	// RRF (Reciprocal Rank Fusion) merge
	return mergeRRF(vecResults, textResults, limit), nil
}

func mergeRRF(vec, text []SearchItemsResult, limit int) []SearchItemsResult {
	const k = 60.0 // RRF constant

	scores := map[uuid.UUID]float64{}
	rank := map[uuid.UUID]SearchItemsResult{}

	for i, r := range vec {
		scores[r.ID] += k / float64(i+1)
		rank[r.ID] = r
	}
	for i, r := range text {
		scores[r.ID] += k / float64(i+1)
		if _, ok := rank[r.ID]; !ok {
			rank[r.ID] = r
		}
	}

	// Sort by combined score
	type scored struct {
		id    uuid.UUID
		score float64
	}
	var sorted []scored
	for id, score := range scores {
		sorted = append(sorted, scored{id, score})
	}
	for i := 0; i < len(sorted)-1; i++ {
		for j := i + 1; j < len(sorted); j++ {
			if sorted[j].score > sorted[i].score {
				sorted[i], sorted[j] = sorted[j], sorted[i]
			}
		}
	}

	var result []SearchItemsResult
	for i, s := range sorted {
		if i >= limit {
			break
		}
		if r, ok := rank[s.id]; ok {
			result = append(result, r)
		}
	}
	if result == nil {
		result = []SearchItemsResult{}
	}
	return result
}

func normalizeSim(sim float64) float64 {
	if sim > 1 {
		return 1
	}
	if sim < 0 {
		return 0
	}
	return sim
}

// GetRelatedItems returns K items most similar to the given item by embedding.
func (s *Store) GetRelatedItems(ctx context.Context, itemID uuid.UUID, limit int) ([]SearchItemsResult, error) {
	if limit <= 0 || limit > 20 {
		limit = 5
	}
	// Get the source item's embedding
	var srcEmbedding []float32
	err := s.Reader().QueryRow(ctx, `
		SELECT embedding FROM items WHERE id = $1 AND embedding IS NOT NULL
	`, itemID).Scan(&srcEmbedding)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if srcEmbedding == nil {
		return nil, errors.New("item has no embedding")
	}

	// Find similar items by cosine distance
	const q = `
		SELECT id, item_type, title, why_saved, url,
		       1 - (embedding <=> $1) as sim
		FROM items
		WHERE id != $2
		  AND user_id = (SELECT user_id FROM items WHERE id = $2)
		  AND archived = false
		  AND embedding IS NOT NULL
		ORDER BY embedding <=> $1
		LIMIT $3
	`
	rows, err := s.Reader().Query(ctx, q, srcEmbedding, itemID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SearchItemsResult
	for rows.Next() {
		var r SearchItemsResult
		var sim float64
		if err := rows.Scan(&r.ID, &r.Type, &r.Title, &r.WhySaved, &r.URL, &sim); err != nil {
			return nil, err
		}
		r.Similarity = sim
		results = append(results, r)
	}
	if results == nil {
		results = []SearchItemsResult{}
	}
	return results, rows.Err()
}

// Citation is a reference to a source item in an AI response.
type Citation struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
	URL   string    `json:"url,omitempty"`
}

// AskResult is the response for /api/ask
type AskResult struct {
	Answer    string              `json:"answer"`
	Sources   []SearchItemsResult `json:"sources"`
	Citations []Citation          `json:"citations"`
}

// AskDevDeck searches the user's vault and returns an answer with sources (RAG).
func (s *Store) AskDevDeck(ctx context.Context, question string, embedding []float32, limit int) (*AskResult, error) {
	if limit <= 0 || limit > 10 {
		limit = 5
	}

	var results []SearchItemsResult
	var err error

	if len(embedding) == 0 {
		// Fallback to text search if no embedding
		results, err = s.searchItemsText(ctx, question, limit)
	} else {
		// Search by embedding
		results, err = s.searchItemsHybrid(ctx, question, embedding, limit, false)
	}

	if err != nil {
		return nil, err
	}

	citations := make([]Citation, 0, len(results))
	for _, r := range results {
		citations = append(citations, Citation{
			ID:    r.ID,
			Title: r.Title,
			URL:   derefStr(r.URL),
		})
	}

	answer := ""
	if len(results) == 0 {
		answer = "No encontré información relevante en tu vault para responder esa pregunta."
	} else {
		if len(embedding) == 0 {
			answer = formatTextAnswer(question, results)
		} else {
			answer = formatRAGAnswer(question, results)
		}
	}

	return &AskResult{
		Answer:    answer,
		Sources:   results,
		Citations: citations,
	}, nil
}

func formatTextAnswer(q string, results []SearchItemsResult) string {
	if len(results) == 0 {
		return "No encontré información relevante en tu vault."
	}
	return "Basado en tu vault, encontré " + formatCount(len(results)) + " elementos relacionados con \"" + q + "\":\n\n" +
		formatSources(results)
}

func formatRAGAnswer(q string, results []SearchItemsResult) string {
	if len(results) == 0 {
		return "No encontré información relevante en tu vault para responder esa pregunta."
	}
	return "Basado en tu vault, encontré " + formatCount(len(results)) + " elementos relevantes:\n\n" +
		formatSources(results)
}

func formatCount(n int) string {
	switch n {
	case 1:
		return "1"
	case 2:
		return "2"
	default:
		return fmt.Sprintf("%d", n)
	}
}

func formatSources(results []SearchItemsResult) string {
	var out string
	for i, r := range results {
		out += fmt.Sprintf("%d. %s", i+1, r.Title)
		if derefStr(r.URL) != "" {
			out += " (" + derefStr(r.URL) + ")"
		}
		out += "\n"
	}
	return out
}

func (s *Store) GetDiscoveryNext(ctx context.Context) (*repos.Repo, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	row := s.Reader().QueryRow(ctx, `
		SELECT `+itemColumns+` FROM items
		WHERE archived = false AND item_type = 'repo'
		  AND `+scopeSQL+`
		ORDER BY last_seen_at NULLS FIRST, created_at ASC
		LIMIT 1
	`, scopeArgs...)
	r, err := scanRepoLegacy(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r, nil
}
