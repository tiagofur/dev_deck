package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"devdeck/internal/domain/items"
	"devdeck/internal/domain/repos"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const itemColumns = `id, item_type, title, url, url_normalized, description,
	notes, tags, why_saved, when_to_use, source_channel, meta, ai_summary,
	ai_tags, enrichment_status, archived, created_at, updated_at, last_seen_at`

func scanItem(row pgx.Row) (*items.Item, error) {
	var it items.Item
	var rawMeta []byte
	var itemType, enrichStatus string
	err := row.Scan(
		&it.ID, &itemType, &it.Title, &it.URL, &it.URLNormalized,
		&it.Description, &it.Notes, &it.Tags, &it.WhySaved, &it.WhenToUse,
		&it.SourceChannel, &rawMeta, &it.AISummary, &it.AITags,
		&enrichStatus, &it.Archived, &it.CreatedAt, &it.UpdatedAt, &it.LastSeenAt,
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
			item_type, title, url, url_normalized, description, notes, tags,
			why_saved, source_channel, meta, enrichment_status
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING `+itemColumns,
		string(in.Type), in.Title, in.URL, in.URLNormalized, in.Description,
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
	row := s.pool.QueryRow(ctx, `SELECT `+itemColumns+` FROM items WHERE id = $1`, id)
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
	row := s.pool.QueryRow(ctx,
		`SELECT `+itemColumns+` FROM items WHERE url_normalized = $1 LIMIT 1`, norm)
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
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM repos WHERE url_normalized = $1 LIMIT 1`, norm).Scan(&id)
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

	where := []string{"1=1"}
	args := []any{}
	idx := 1

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
	if p.Q != "" {
		where = append(where, fmt.Sprintf(
			"(title || ' ' || COALESCE(description,'') || ' ' || COALESCE(array_to_string(tags,' '),'')) %% $%d",
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

	if len(sets) == 0 {
		return s.GetItem(ctx, id)
	}

	// Always bump updated_at so the "recently edited" sort works.
	sets = append(sets, "updated_at = NOW()")

	args = append(args, id)
	q := fmt.Sprintf(
		"UPDATE items SET %s WHERE id = $%d RETURNING %s",
		strings.Join(sets, ", "), idx, itemColumns,
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
	tag, err := s.pool.Exec(ctx, `DELETE FROM items WHERE id = $1`, id)
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
	tag, err := s.pool.Exec(ctx,
		`UPDATE items SET last_seen_at = NOW() WHERE id = $1`, id)
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
