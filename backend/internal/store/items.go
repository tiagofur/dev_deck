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

const itemColumns = `id, item_type, title, url, url_normalized, description,
	notes, tags, why_saved, when_to_use, source_channel, meta, ai_summary,
	ai_tags, enrichment_status, archived, is_favorite, created_at, updated_at, last_seen_at`

func scanItem(row pgx.Row) (*items.Item, error) {
	var it items.Item
	var rawMeta []byte
	var itemType, enrichStatus string
	err := row.Scan(
		&it.ID, &itemType, &it.Title, &it.URL, &it.URLNormalized,
		&it.Description, &it.Notes, &it.Tags, &it.WhySaved, &it.WhenToUse,
		&it.SourceChannel, &rawMeta, &it.AISummary, &it.AITags,
		&enrichStatus, &it.Archived, &it.IsFavorite, &it.CreatedAt, &it.UpdatedAt, &it.LastSeenAt,
	)
	if err != nil {
		return nil, err
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

// CreateItemInput is what the capture handler persists after running
// the heuristic classifier. Non-pointer strings are never nil so the
// store can INSERT without extra branching.
type CreateItemInput struct {
	Type             items.Type
	Title            string
	URL              *string
	URLNormalized    *string
	Description      *string
	Notes            string
	Tags             []string
	WhySaved         string
	SourceChannel    string
	Meta             map[string]any
	EnrichmentStatus items.EnrichmentStatus
}

// CreateItem inserts an item and returns the stored row. Returns
// ErrAlreadyExists if a row with the same url_normalized is already
// present — the handler translates that into a "duplicate_of" response.
func (s *Store) CreateItem(ctx context.Context, in CreateItemInput) (*items.Item, error) {
	if in.Tags == nil {
		in.Tags = []string{}
	}
	if in.Meta == nil {
		in.Meta = map[string]any{}
	}
	if in.EnrichmentStatus == "" {
		in.EnrichmentStatus = items.EnrichmentPending
	}
	if in.SourceChannel == "" {
		in.SourceChannel = "manual"
	}
	metaJSON, err := json.Marshal(in.Meta)
	if err != nil {
		return nil, fmt.Errorf("encode item meta: %w", err)
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO items (
			user_id, item_type, title, url, url_normalized, description, notes, tags,
			why_saved, source_channel, meta, enrichment_status
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING `+itemColumns,
		currentUserIDPtr(ctx), string(in.Type), in.Title, in.URL, in.URLNormalized, in.Description,
		in.Notes, in.Tags, in.WhySaved, in.SourceChannel, metaJSON,
		string(in.EnrichmentStatus),
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

// GetItem returns a single item by id.
func (s *Store) GetItem(ctx context.Context, id uuid.UUID) (*items.Item, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.pool.QueryRow(ctx, `SELECT `+itemColumns+` FROM items WHERE id = $1 AND `+scopeSQL, args...)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return it, nil
}

// FindItemByNormalizedURL returns the existing item that matches the given
// normalized URL, or ErrNotFound if none exists.
func (s *Store) FindItemByNormalizedURL(ctx context.Context, norm string) (*items.Item, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{norm}, scopeArgs...)
	row := s.pool.QueryRow(ctx,
		`SELECT `+itemColumns+` FROM items WHERE url_normalized = $1 AND `+scopeSQL+` LIMIT 1`, args...)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return it, nil
}

// FindRepoIDByNormalizedURL looks up a legacy repos row by its normalized
// URL. Used by the capture handler so a POST /api/items/capture with a
// github URL that was originally added via /api/repos still dedupes.
func (s *Store) FindRepoIDByNormalizedURL(ctx context.Context, norm string) (uuid.UUID, error) {
	var id uuid.UUID
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{norm}, scopeArgs...)
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM repos WHERE url_normalized = $1 AND `+scopeSQL+` LIMIT 1`, args...).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrNotFound
		}
		return uuid.Nil, err
	}
	return id, nil
}

// SetRepoURLNormalized backfills the legacy repos.url_normalized column
// for newly created rows. Called from the capture handler's repo path.
func (s *Store) SetRepoURLNormalized(ctx context.Context, id uuid.UUID, norm string) error {
	_, err := s.pool.Exec(ctx, `UPDATE repos SET url_normalized = $1 WHERE id = $2`, norm, id)
	return err
}

// UpdateItemEnrichmentStatus sets the enrichment_status column. Used by
// the capture handler after enqueueing a job.
func (s *Store) UpdateItemEnrichmentStatus(ctx context.Context, id uuid.UUID, status items.EnrichmentStatus) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE items SET enrichment_status = $1, updated_at = NOW() WHERE id = $2`,
		string(status), id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListItems runs the paginated list query for GET /api/items with the
// filters from p. Archived items are hidden by default to match the
// repos list semantics — callers pass ListParams.Archived = &true to
// see an archive view.
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

	if p.Archived != nil {
		where = append(where, fmt.Sprintf("archived = $%d", idx))
		args = append(args, *p.Archived)
		idx++
	} else {
		where = append(where, "archived = false")
	}
	if p.Type != "" {
		where = append(where, fmt.Sprintf("item_type = $%d", idx))
		args = append(args, p.Type)
		idx++
	}
	if p.Tag != "" {
		where = append(where, fmt.Sprintf("$%d = ANY(tags)", idx))
		args = append(args, p.Tag)
		idx++
	}
	if p.Favorites {
		where = append(where, fmt.Sprintf("is_favorite = $%d", idx))
		args = append(args, true)
		idx++
	}
	if p.Q != "" {
		where = append(where, fmt.Sprintf(
			"(title || ' ' || COALESCE(description,'') || ' ' || COALESCE(ai_summary,'') || ' ' || COALESCE(array_to_string(tags,' '),'') || ' ' || COALESCE(array_to_string(ai_tags,' '),'')) %% $%d",
			idx,
		))
		args = append(args, p.Q)
		idx++
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

	whereSQL := strings.Join(where, " AND ")

	var total int
	if err := s.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM items WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return nil, err
	}

	listArgs := append(args, p.Limit, p.Offset)
	listSQL := fmt.Sprintf(
		"SELECT %s FROM items WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d",
		itemColumns, whereSQL, orderBy, idx, idx+1,
	)
	rows, err := s.pool.Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*items.Item{}
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &items.ListResult{Total: total, Items: out}, nil
}

// UpdateItem applies the non-nil fields of UpdateInput. Returns the
// updated row. ErrNotFound if no row with that id.
func (s *Store) UpdateItem(ctx context.Context, id uuid.UUID, in items.UpdateInput) (*items.Item, error) {
	sets := []string{}
	args := []any{}
	idx := 1

	if in.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", idx))
		args = append(args, *in.Title)
		idx++
	}
	if in.Notes != nil {
		sets = append(sets, fmt.Sprintf("notes = $%d", idx))
		args = append(args, *in.Notes)
		idx++
	}
	if in.Tags != nil {
		sets = append(sets, fmt.Sprintf("tags = $%d", idx))
		args = append(args, in.Tags)
		idx++
	}
	if in.WhySaved != nil {
		sets = append(sets, fmt.Sprintf("why_saved = $%d", idx))
		args = append(args, *in.WhySaved)
		idx++
	}
	if in.WhenToUse != nil {
		sets = append(sets, fmt.Sprintf("when_to_use = $%d", idx))
		args = append(args, *in.WhenToUse)
		idx++
	}
	if in.Archived != nil {
		sets = append(sets, fmt.Sprintf("archived = $%d", idx))
		args = append(args, *in.Archived)
		idx++
	}
	if in.ItemType != nil {
		sets = append(sets, fmt.Sprintf("item_type = $%d", idx))
		args = append(args, *in.ItemType)
		idx++
	}
	if in.IsFavorite != nil {
		sets = append(sets, fmt.Sprintf("is_favorite = $%d", idx))
		args = append(args, *in.IsFavorite)
		idx++
	}

	if len(sets) == 0 {
		return s.GetItem(ctx, id)
	}

	// Always bump updated_at so the "recently edited" sort works.
	sets = append(sets, "updated_at = NOW()")

	args = append(args, id)
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", idx+1)
	args = append(args, scopeArgs...)
	q := fmt.Sprintf(
		"UPDATE items SET %s WHERE id = $%d AND %s RETURNING %s",
		strings.Join(sets, ", "), idx, scopeSQL, itemColumns,
	)
	row := s.pool.QueryRow(ctx, q, args...)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return it, nil
}

// DeleteItem removes a row. ErrNotFound if the id didn't exist.
func (s *Store) DeleteItem(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx, `DELETE FROM items WHERE id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// MarkItemSeen bumps last_seen_at so discovery-mode rotation works on
// items the same way it does on repos.
func (s *Store) MarkItemSeen(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx,
		`UPDATE items SET last_seen_at = NOW() WHERE id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateItemFromMetadata merges enricher output into the JSONB meta
// column, keeps the first-class columns in sync where possible, and
// marks enrichment as ok. Called from the background enrich worker.
func (s *Store) UpdateItemFromMetadata(ctx context.Context, id uuid.UUID, md *repos.Metadata) error {
	if md == nil {
		return errors.New("nil metadata")
	}
	// Fetch current meta, merge, write back. We keep this in a single
	// transaction so concurrent enrichments don't stomp each other.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var existing []byte
	if err := tx.QueryRow(ctx, `SELECT meta FROM items WHERE id = $1 FOR UPDATE`, id).Scan(&existing); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	meta := map[string]any{}
	if len(existing) > 0 {
		_ = json.Unmarshal(existing, &meta)
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

// UpdateItemAIFields stores AI-generated summary and suggestion tags.
func (s *Store) UpdateItemAIFields(ctx context.Context, id uuid.UUID, summary string, tags []string) error {
	if tags == nil {
		tags = []string{}
	}
	tag, err := s.pool.Exec(ctx, `
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
	tx, err := s.pool.Begin(ctx)
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
	rows, err := s.pool.Query(ctx, q, userID)
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

// ─── Embeddings ───

// SearchMode specifies how to perform the search.
type SearchMode string

const (
	SearchModeText    SearchMode = "text"    // pg_trgm only
	SearchModeVector SearchMode = "semantic" // embeddings only
	SearchModeHybrid SearchMode = "hybrid"  // both combined
)

// SearchItemsResult is a single search result with score.
type SearchItemsResult struct {
	ID         uuid.UUID    `json:"id"`
	Type       items.Type `json:"type"`
	Title      string    `json:"title"`
	WhySaved   string    `json:"why_saved,omitempty"`
	URL        string    `json:"url,omitempty"`
	Similarity float64  `json:"similarity"`
}

// EmbedItem inserts or updates the embedding for an item.
func (s *Store) EmbedItem(ctx context.Context, id uuid.UUID, embedding []float32) error {
	if embedding == nil {
		return nil // no-op
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE items
		SET embedding = $1, updated_at = NOW()
		WHERE id = $2
	`, embedding, id)
	return err
}

// SearchItems performs search across a user's items.
// For vector mode, queryEmbedding must be provided. For hybrid, both text query and embedding are used.
func (s *Store) SearchItems(ctx context.Context, userID uuid.UUID, mode SearchMode, query string, queryEmbedding []float32, limit int) ([]SearchItemsResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	switch mode {
	case SearchModeVector, SearchModeHybrid:
		if len(queryEmbedding) == 0 {
			return nil, errors.New("embedding required for semantic search")
		}
		return s.searchItemsHybrid(ctx, userID, query, queryEmbedding, limit, mode == SearchModeHybrid)
	default:
		return s.searchItemsText(ctx, userID, query, limit)
	}
}

func (s *Store) searchItemsText(ctx context.Context, userID uuid.UUID, query string, limit int) ([]SearchItemsResult, error) {
	const q = `
		SELECT id, item_type, title, why_saved, url,
		       similarity(title, $3) + similarity(COALESCE(why_saved, ''), $3) as sim
		FROM items
		WHERE user_id = $1
		  AND archived = false
		  AND (title ILIKE '%' || $3 || '%'
		       OR why_saved ILIKE '%' || $3 || '%'
		       OR EXISTS (
		           SELECT 1 FROM unnest(ai_tags) t WHERE t ILIKE '%' || $3 || '%'
		       ))
		ORDER BY sim DESC
		LIMIT $2
	`
	rows, err := s.pool.Query(ctx, q, userID, limit, query)
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
		r.Similarity = normalizeSim(sim)
		results = append(results, r)
	}
	if results == nil {
		results = []SearchItemsResult{}
	}
	return results, rows.Err()
}

func (s *Store) searchItemsHybrid(ctx context.Context, userID uuid.UUID, query string, embedding []float32, limit int, useText bool) ([]SearchItemsResult, error) {
	// Get vector results
	vecQ := `
		SELECT id, item_type, title, why_saved, url,
		       1 - (embedding <=> $3) as sim
		FROM items
		WHERE user_id = $1
		  AND archived = false
		  AND embedding IS NOT NULL
		ORDER BY embedding <=> $3
		LIMIT $2
	`
	rows, err := s.pool.Query(ctx, vecQ, userID, limit, embedding)
	if err != nil {
		return nil, err
	}

	var vecResults []SearchItemsResult
	for rows.Next() {
		var r SearchItemsResult
		var sim float64
		if err := rows.Scan(&r.ID, &r.Type, &r.Title, &r.WhySaved, &r.URL, &sim); err != nil {
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
	textResults, err := s.searchItemsText(ctx, userID, query, limit)
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
