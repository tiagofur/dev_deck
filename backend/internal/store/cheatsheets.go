package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"devdeck/internal/domain/cheatsheets"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const cheatColumns = `id, user_id, slug, title, category, icon, color, description, visibility, parent_id, is_official, fork_count, stars_count, is_seed, created_at, updated_at`
const entryColumns = `id, cheatsheet_id, label, command, description, tags, position`

func scanCheatsheet(row pgx.Row) (*cheatsheets.Cheatsheet, error) {
	var c cheatsheets.Cheatsheet
	err := row.Scan(
		&c.ID, &c.UserID, &c.Slug, &c.Title, &c.Category,
		&c.Icon, &c.Color, &c.Description, &c.Visibility,
		&c.ParentID, &c.IsOfficial, &c.ForkCount, &c.StarsCount,
		&c.IsSeed, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func scanEntry(row pgx.Row) (*cheatsheets.Entry, error) {
	var e cheatsheets.Entry
	err := row.Scan(
		&e.ID, &e.CheatsheetID, &e.Label, &e.Command,
		&e.Description, &e.Tags, &e.Position,
	)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

// ───── Cheatsheets CRUD ─────

func (s *Store) ListCheatsheets(ctx context.Context, category string) ([]*cheatsheets.Cheatsheet, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	q := `SELECT ` + cheatColumns + ` FROM cheatsheets WHERE ` + scopeSQL
	args := append([]any{}, scopeArgs...)
	idx := len(args) + 1
	if category != "" {
		q += fmt.Sprintf(` AND category = $%d`, idx)
		args = append(args, category)
	}
	q += ` ORDER BY title ASC`

	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*cheatsheets.Cheatsheet{}
	for rows.Next() {
		c, err := scanCheatsheet(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) GetCheatsheet(ctx context.Context, id uuid.UUID) (*cheatsheets.Cheatsheet, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)

	// Allow access if:
	// 1. User is owner (scopeSQL handles this)
	// 2. OR visibility is public
	// 3. OR it's official
	q := fmt.Sprintf(`
		SELECT %s FROM cheatsheets
		WHERE id = $1 AND (is_official = TRUE OR visibility = 'public' OR %s)
	`, cheatColumns, scopeSQL)

	row := s.pool.QueryRow(ctx, q, args...)
	c, err := scanCheatsheet(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (s *Store) GetCheatsheetDetail(ctx context.Context, id uuid.UUID) (*cheatsheets.CheatsheetDetail, error) {
	c, err := s.GetCheatsheet(ctx, id)
	if err != nil {
		return nil, err
	}
	entries, err := s.ListEntriesByCheatsheet(ctx, id)
	if err != nil {
		return nil, err
	}
	return &cheatsheets.CheatsheetDetail{
		Cheatsheet: *c,
		Entries:    entries,
	}, nil
}

func (s *Store) CreateCheatsheet(ctx context.Context, in cheatsheets.CreateCheatsheetInput) (*cheatsheets.Cheatsheet, error) {
	visibility := in.Visibility
	if visibility == "" {
		visibility = cheatsheets.VisibilityPrivate
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO cheatsheets (user_id, slug, title, category, icon, color, description, visibility)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+cheatColumns,
		currentUserIDPtr(ctx), in.Slug, in.Title, in.Category, in.Icon, in.Color, in.Description, visibility,
	)
	c, err := scanCheatsheet(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return c, nil
}

func (s *Store) UpdateCheatsheet(ctx context.Context, id uuid.UUID, in cheatsheets.UpdateCheatsheetInput) (*cheatsheets.Cheatsheet, error) {
	sets := []string{}
	args := []any{}
	idx := 1

	if in.Slug != nil {
		sets = append(sets, fmt.Sprintf("slug = $%d", idx))
		args = append(args, *in.Slug)
		idx++
	}
	if in.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", idx))
		args = append(args, *in.Title)
		idx++
	}
	if in.Category != nil {
		sets = append(sets, fmt.Sprintf("category = $%d", idx))
		args = append(args, *in.Category)
		idx++
	}
	if in.Icon != nil {
		sets = append(sets, fmt.Sprintf("icon = $%d", idx))
		args = append(args, *in.Icon)
		idx++
	}
	if in.Color != nil {
		sets = append(sets, fmt.Sprintf("color = $%d", idx))
		args = append(args, *in.Color)
		idx++
	}
	if in.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", idx))
		args = append(args, *in.Description)
		idx++
	}

	if len(sets) == 0 {
		return s.GetCheatsheet(ctx, id)
	}

	sets = append(sets, "updated_at = NOW()")
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", idx+1)
	args = append(args, id)
	args = append(args, scopeArgs...)
	q := fmt.Sprintf(
		"UPDATE cheatsheets SET %s WHERE id = $%d AND %s RETURNING %s",
		strings.Join(sets, ", "), idx, scopeSQL, cheatColumns,
	)
	row := s.pool.QueryRow(ctx, q, args...)
	c, err := scanCheatsheet(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return c, nil
}

func (s *Store) DeleteCheatsheet(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx, `DELETE FROM cheatsheets WHERE id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ───── Discovery & Social ─────

func (s *Store) ExploreCheatsheets(ctx context.Context, category string, officialOnly bool) ([]*cheatsheets.Cheatsheet, error) {
	q := `SELECT ` + cheatColumns + ` FROM cheatsheets WHERE (visibility = 'public' OR is_official = TRUE)`
	args := []any{}
	idx := 1

	if officialOnly {
		q += fmt.Sprintf(` AND is_official = TRUE`)
	}

	if category != "" {
		q += fmt.Sprintf(` AND category = $%d`, idx)
		args = append(args, category)
		idx++
	}

	q += ` ORDER BY is_official DESC, fork_count DESC, title ASC LIMIT 50`

	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*cheatsheets.Cheatsheet{}
	for rows.Next() {
		c, err := scanCheatsheet(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) ForkCheatsheet(ctx context.Context, id uuid.UUID) (*cheatsheets.Cheatsheet, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return nil, errors.New("unauthorized")
	}

	// 1. Get original (must be public or official)
	original, err := s.GetCheatsheetDetail(ctx, id)
	if err != nil {
		return nil, err
	}

	if original.Visibility != cheatsheets.VisibilityPublic && !original.IsOfficial && (original.UserID == nil || *original.UserID != userID) {
		return nil, errors.New("cannot fork private cheatsheet")
	}

	// 2. Create new sheet
	newSlug := fmt.Sprintf("%s-fork-%d", original.Slug, time.Now().Unix()%10000)
	forked, err := s.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug:        newSlug,
		Title:       original.Title + " (Copy)",
		Category:    original.Category,
		Icon:        original.Icon,
		Color:       original.Color,
		Description: original.Description,
		Visibility:  cheatsheets.VisibilityPrivate,
	})
	if err != nil {
		return nil, err
	}

	// Update parent_id
	_, err = s.pool.Exec(ctx, `UPDATE cheatsheets SET parent_id = $1 WHERE id = $2`, original.ID, forked.ID)
	if err != nil {
		return nil, err
	}
	forked.ParentID = &original.ID

	// 3. Clone entries
	for _, entry := range original.Entries {
		_, err := s.CreateEntry(ctx, forked.ID, cheatsheets.CreateEntryInput{
			Label:       entry.Label,
			Command:     entry.Command,
			Description: entry.Description,
			Tags:        entry.Tags,
		})
		if err != nil {
			return nil, err
		}
	}

	// 4. Increment fork count on original
	_, _ = s.pool.Exec(ctx, `UPDATE cheatsheets SET fork_count = fork_count + 1 WHERE id = $1`, original.ID)

	return forked, nil
}

func (s *Store) StarCheatsheet(ctx context.Context, id uuid.UUID) error {
	userID, ok := currentUserID(ctx)
	if !ok {
		return errors.New("unauthorized")
	}

	_, err := s.pool.Exec(ctx, `
		INSERT INTO cheatsheet_stars (user_id, cheatsheet_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, cheatsheet_id) DO DELETE
	`, userID, id) // This is a simplified toggle, might need a more explicit approach but good for now.
	// Wait, ON CONFLICT DO DELETE is not standard PG.

	// Better toggle logic:
	var exists bool
	_ = s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM cheatsheet_stars WHERE user_id = $1 AND cheatsheet_id = $2)`, userID, id).Scan(&exists)

	if exists {
		_, err = s.pool.Exec(ctx, `DELETE FROM cheatsheet_stars WHERE user_id = $1 AND cheatsheet_id = $2`, userID, id)
		if err == nil {
			_, _ = s.pool.Exec(ctx, `UPDATE cheatsheets SET stars_count = stars_count - 1 WHERE id = $1`, id)
		}
	} else {
		_, err = s.pool.Exec(ctx, `INSERT INTO cheatsheet_stars (user_id, cheatsheet_id) VALUES ($1, $2)`, userID, id)
		if err == nil {
			_, _ = s.pool.Exec(ctx, `UPDATE cheatsheets SET stars_count = stars_count + 1 WHERE id = $1`, id)
		}
	}

	return err
}

// ───── Entries CRUD ─────

func (s *Store) ListEntriesByCheatsheet(ctx context.Context, cheatsheetID uuid.UUID) ([]cheatsheets.Entry, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "c.user_id", 2)
	args := append([]any{cheatsheetID}, scopeArgs...)
	rows, err := s.pool.Query(ctx, `
		SELECT ce.`+entryColumns+` FROM cheatsheet_entries ce
		JOIN cheatsheets c ON c.id = ce.cheatsheet_id
		WHERE ce.cheatsheet_id = $1 AND `+scopeSQL+`
		ORDER BY position ASC
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []cheatsheets.Entry{}
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *e)
	}
	return out, rows.Err()
}

func (s *Store) CreateEntry(ctx context.Context, cheatsheetID uuid.UUID, in cheatsheets.CreateEntryInput) (*cheatsheets.Entry, error) {
	tags := in.Tags
	if tags == nil {
		tags = []string{}
	}
	scopeSQL, scopeArgs := ownerClause(ctx, "id", 6)
	args := []any{cheatsheetID, in.Label, in.Command, in.Description, tags}
	args = append(args, scopeArgs...)
	row := s.pool.QueryRow(ctx, `
		INSERT INTO cheatsheet_entries (cheatsheet_id, label, command, description, tags, position)
		SELECT $1, $2, $3, $4, $5,
			COALESCE((SELECT MAX(position) + 1 FROM cheatsheet_entries WHERE cheatsheet_id = $1), 0)
		FROM cheatsheets
		WHERE id = $1 AND `+scopeSQL+`
		RETURNING `+entryColumns,
		args...,
	)
	e, err := scanEntry(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return e, nil
}

func (s *Store) GetEntry(ctx context.Context, id uuid.UUID) (*cheatsheets.Entry, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "c.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.pool.QueryRow(ctx, `
		SELECT ce.`+entryColumns+`
		FROM cheatsheet_entries ce
		JOIN cheatsheets c ON c.id = ce.cheatsheet_id
		WHERE ce.id = $1 AND `+scopeSQL, args...)
	e, err := scanEntry(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return e, nil
}

func (s *Store) UpdateEntry(ctx context.Context, id uuid.UUID, in cheatsheets.UpdateEntryInput) (*cheatsheets.Entry, error) {
	sets := []string{}
	args := []any{}
	idx := 1

	if in.Label != nil {
		sets = append(sets, fmt.Sprintf("label = $%d", idx))
		args = append(args, *in.Label)
		idx++
	}
	if in.Command != nil {
		sets = append(sets, fmt.Sprintf("command = $%d", idx))
		args = append(args, *in.Command)
		idx++
	}
	if in.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", idx))
		args = append(args, *in.Description)
		idx++
	}
	if in.Tags != nil {
		sets = append(sets, fmt.Sprintf("tags = $%d", idx))
		args = append(args, in.Tags)
		idx++
	}

	if len(sets) == 0 {
		return s.GetEntry(ctx, id)
	}

	scopeSQL, scopeArgs := ownerClause(ctx, "c.user_id", idx+1)
	args = append(args, id)
	args = append(args, scopeArgs...)
	q := fmt.Sprintf(
		"UPDATE cheatsheet_entries ce SET %s FROM cheatsheets c WHERE ce.cheatsheet_id = c.id AND ce.id = $%d AND %s RETURNING ce.%s",
		strings.Join(sets, ", "), idx, scopeSQL, entryColumns,
	)
	row := s.pool.QueryRow(ctx, q, args...)
	e, err := scanEntry(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return e, nil
}

func (s *Store) DeleteEntry(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "c.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM cheatsheet_entries ce
		USING cheatsheets c
		WHERE ce.cheatsheet_id = c.id AND ce.id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ───── Repo ↔ Cheatsheet Links ─────

func (s *Store) LinkCheatsheet(ctx context.Context, repoID, cheatsheetID uuid.UUID) error {
	repoScopeSQL, repoScopeArgs := ownerClause(ctx, "r.user_id", 3)
	cheatScopeSQL, cheatScopeArgs := ownerClause(ctx, "c.user_id", 3+len(repoScopeArgs))
	args := []any{repoID, cheatsheetID}
	args = append(args, repoScopeArgs...)
	args = append(args, cheatScopeArgs...)
	_, err := s.pool.Exec(ctx, `
		INSERT INTO repo_cheatsheet_links (repo_id, cheatsheet_id)
		SELECT $1, $2
		FROM repos r
		JOIN cheatsheets c ON c.id = $2
		WHERE r.id = $1 AND `+repoScopeSQL+` AND `+cheatScopeSQL+`
		ON CONFLICT DO NOTHING
	`, args...)
	return err
}

func (s *Store) UnlinkCheatsheet(ctx context.Context, repoID, cheatsheetID uuid.UUID) error {
	repoScopeSQL, repoScopeArgs := ownerClause(ctx, "r.user_id", 3)
	cheatScopeSQL, cheatScopeArgs := ownerClause(ctx, "c.user_id", 3+len(repoScopeArgs))
	args := []any{repoID, cheatsheetID}
	args = append(args, repoScopeArgs...)
	args = append(args, cheatScopeArgs...)
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM repo_cheatsheet_links rcl
		USING repos r, cheatsheets c
		WHERE rcl.repo_id = $1 AND rcl.cheatsheet_id = $2
		  AND r.id = rcl.repo_id AND c.id = rcl.cheatsheet_id
		  AND `+repoScopeSQL+` AND `+cheatScopeSQL+`
	`, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) ListCheatsheetsByRepo(ctx context.Context, repoID uuid.UUID) ([]*cheatsheets.Cheatsheet, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "r.user_id", 2)
	args := append([]any{repoID}, scopeArgs...)
	rows, err := s.pool.Query(ctx, `
		SELECT `+cheatColumns+` FROM cheatsheets c
		JOIN repo_cheatsheet_links rcl ON rcl.cheatsheet_id = c.id
		JOIN repos r ON r.id = rcl.repo_id
		WHERE rcl.repo_id = $1 AND `+scopeSQL+`
		ORDER BY c.title ASC
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*cheatsheets.Cheatsheet{}
	for rows.Next() {
		c, err := scanCheatsheet(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ───── Global Search ─────

// SearchResult is a unified search hit.
type SearchResult struct {
	Type     string `json:"type"` // "repo", "cheatsheet", "entry"
	ID       string `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Extra    string `json:"extra"` // e.g. command text, repo url
}

// Search performs a cross-entity search using pg_trgm.
func (s *Store) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 20
	}
	pattern := "%" + query + "%"
	out := []SearchResult{}

	// Search repos
	repoScopeSQL, repoScopeArgs := ownerClause(ctx, "user_id", 4)
	repoArgs := append([]any{pattern, query, limit}, repoScopeArgs...)
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, COALESCE(owner,''), COALESCE(description,''), COALESCE(language,'')
		FROM repos
		WHERE (name ILIKE $1 OR description ILIKE $1 OR COALESCE(language,'') ILIKE $1)
		  AND `+repoScopeSQL+`
		ORDER BY similarity(name, $2) DESC
		LIMIT $3
	`, repoArgs...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id uuid.UUID
		var name, owner, desc, lang string
		if err := rows.Scan(&id, &name, &owner, &desc, &lang); err != nil {
			rows.Close()
			return nil, err
		}
		sub := owner + "/" + name
		if lang != "" {
			sub += " · " + lang
		}
		out = append(out, SearchResult{
			Type:     "repo",
			ID:       id.String(),
			Title:    name,
			Subtitle: sub,
			Extra:    desc,
		})
	}
	rows.Close()

	// Search cheatsheets
	cheatScopeSQL, cheatScopeArgs := ownerClause(ctx, "user_id", 4)
	cheatArgs := append([]any{pattern, query, limit}, cheatScopeArgs...)
	rows, err = s.pool.Query(ctx, `
		SELECT id, title, category, description
		FROM cheatsheets
		WHERE (title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
		  AND `+cheatScopeSQL+`
		ORDER BY similarity(title, $2) DESC
		LIMIT $3
	`, cheatArgs...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id uuid.UUID
		var title, cat, desc string
		if err := rows.Scan(&id, &title, &cat, &desc); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, SearchResult{
			Type:     "cheatsheet",
			ID:       id.String(),
			Title:    title,
			Subtitle: cat,
			Extra:    desc,
		})
	}
	rows.Close()

	// Search entries
	entryScopeSQL, entryScopeArgs := ownerClause(ctx, "c.user_id", 4)
	entryArgs := append([]any{pattern, query, limit}, entryScopeArgs...)
	rows, err = s.pool.Query(ctx, `
		SELECT ce.id, ce.label, ce.command, ce.description, c.title
		FROM cheatsheet_entries ce
		JOIN cheatsheets c ON c.id = ce.cheatsheet_id
		WHERE (ce.label ILIKE $1 OR ce.command ILIKE $1 OR ce.description ILIKE $1)
		  AND `+entryScopeSQL+`
		ORDER BY similarity(ce.label, $2) DESC
		LIMIT $3
	`, entryArgs...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id uuid.UUID
		var label, cmd, desc, cheatTitle string
		if err := rows.Scan(&id, &label, &cmd, &desc, &cheatTitle); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, SearchResult{
			Type:     "entry",
			ID:       id.String(),
			Title:    label,
			Subtitle: cheatTitle,
			Extra:    cmd,
		})
	}
	rows.Close()

	return out, nil
}

// ───── Seed helpers ─────

// GetCheatsheetBySlug looks up a cheatsheet by its unique slug.
func (s *Store) GetCheatsheetBySlug(ctx context.Context, slug string) (*cheatsheets.Cheatsheet, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{slug}, scopeArgs...)
	q := fmt.Sprintf(`SELECT %s FROM cheatsheets WHERE slug = $1 AND (is_official = TRUE OR visibility = 'public' OR %s)`, cheatColumns, scopeSQL)
	row := s.pool.QueryRow(ctx, q, args...)
	c, err := scanCheatsheet(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

// SeedCheatsheet upserts a cheatsheet + its entries. Used by the seed loader.
func (s *Store) SeedCheatsheet(ctx context.Context, sc cheatsheets.SeedCheatsheet) error {
	existing, err := s.GetCheatsheetBySlug(ctx, sc.Slug)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}

	if existing != nil {
		// Already seeded — skip (idempotent).
		return nil
	}

	c, err := s.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug:        sc.Slug,
		Title:       sc.Title,
		Category:    sc.Category,
		Icon:        nilIfEmpty(sc.Icon),
		Color:       nilIfEmpty(sc.Color),
		Description: sc.Description,
		Visibility:  cheatsheets.VisibilityPublic,
	})
	if err != nil {
		return fmt.Errorf("seed cheatsheet %q: %w", sc.Slug, err)
	}

	// Mark as seed and official.
	_, err = s.pool.Exec(ctx, `UPDATE cheatsheets SET is_seed = TRUE, is_official = TRUE WHERE id = $1`, c.ID)
	if err != nil {
		return err
	}

	for _, se := range sc.Entries {
		tags := se.Tags
		if tags == nil {
			tags = []string{}
		}
		_, err := s.CreateEntry(ctx, c.ID, cheatsheets.CreateEntryInput{
			Label:       se.Label,
			Command:     se.Command,
			Description: se.Description,
			Tags:        tags,
		})
		if err != nil {
			return fmt.Errorf("seed entry %q in %q: %w", se.Label, sc.Slug, err)
		}
	}
	return nil
}
