package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"devdeck/internal/domain/cheatsheets"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const cheatColumns = `id, slug, title, category, icon, color, description, is_seed, created_at, updated_at`
const entryColumns = `id, cheatsheet_id, label, command, description, tags, position`

func scanCheatsheet(row pgx.Row) (*cheatsheets.Cheatsheet, error) {
	var c cheatsheets.Cheatsheet
	err := row.Scan(
		&c.ID, &c.Slug, &c.Title, &c.Category,
		&c.Icon, &c.Color, &c.Description, &c.IsSeed,
		&c.CreatedAt, &c.UpdatedAt,
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
	q := `SELECT ` + cheatColumns + ` FROM cheatsheets`
	args := []any{}
	if category != "" {
		q += ` WHERE category = $1`
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
	row := s.pool.QueryRow(ctx, `SELECT `+cheatColumns+` FROM cheatsheets WHERE id = $1`, id)
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
	row := s.pool.QueryRow(ctx, `
		INSERT INTO cheatsheets (slug, title, category, icon, color, description)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+cheatColumns,
		in.Slug, in.Title, in.Category, in.Icon, in.Color, in.Description,
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

	sets = append(sets, fmt.Sprintf("updated_at = $%d", idx))
	args = append(args, "NOW()")
	idx++

	args = append(args, id)
	q := fmt.Sprintf(
		"UPDATE cheatsheets SET %s WHERE id = $%d RETURNING %s",
		strings.Join(sets, ", "), idx, cheatColumns,
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
	tag, err := s.pool.Exec(ctx, `DELETE FROM cheatsheets WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ───── Entries CRUD ─────

func (s *Store) ListEntriesByCheatsheet(ctx context.Context, cheatsheetID uuid.UUID) ([]cheatsheets.Entry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+entryColumns+` FROM cheatsheet_entries
		WHERE cheatsheet_id = $1
		ORDER BY position ASC
	`, cheatsheetID)
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
	row := s.pool.QueryRow(ctx, `
		INSERT INTO cheatsheet_entries (cheatsheet_id, label, command, description, tags, position)
		VALUES ($1, $2, $3, $4, $5,
			COALESCE((SELECT MAX(position) + 1 FROM cheatsheet_entries WHERE cheatsheet_id = $1), 0)
		)
		RETURNING `+entryColumns,
		cheatsheetID, in.Label, in.Command, in.Description, tags,
	)
	e, err := scanEntry(row)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Store) GetEntry(ctx context.Context, id uuid.UUID) (*cheatsheets.Entry, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+entryColumns+` FROM cheatsheet_entries WHERE id = $1`, id)
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

	args = append(args, id)
	q := fmt.Sprintf(
		"UPDATE cheatsheet_entries SET %s WHERE id = $%d RETURNING %s",
		strings.Join(sets, ", "), idx, entryColumns,
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
	tag, err := s.pool.Exec(ctx, `DELETE FROM cheatsheet_entries WHERE id = $1`, id)
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
	_, err := s.pool.Exec(ctx, `
		INSERT INTO repo_cheatsheet_links (repo_id, cheatsheet_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, repoID, cheatsheetID)
	return err
}

func (s *Store) UnlinkCheatsheet(ctx context.Context, repoID, cheatsheetID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM repo_cheatsheet_links
		WHERE repo_id = $1 AND cheatsheet_id = $2
	`, repoID, cheatsheetID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) ListCheatsheetsByRepo(ctx context.Context, repoID uuid.UUID) ([]*cheatsheets.Cheatsheet, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+cheatColumns+` FROM cheatsheets c
		JOIN repo_cheatsheet_links rcl ON rcl.cheatsheet_id = c.id
		WHERE rcl.repo_id = $1
		ORDER BY c.title ASC
	`, repoID)
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
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, COALESCE(owner,''), COALESCE(description,''), COALESCE(language,'')
		FROM repos
		WHERE name ILIKE $1 OR description ILIKE $1 OR COALESCE(language,'') ILIKE $1
		ORDER BY similarity(name, $2) DESC
		LIMIT $3
	`, pattern, query, limit)
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
	rows, err = s.pool.Query(ctx, `
		SELECT id, title, category, description
		FROM cheatsheets
		WHERE title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
		ORDER BY similarity(title, $2) DESC
		LIMIT $3
	`, pattern, query, limit)
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
	rows, err = s.pool.Query(ctx, `
		SELECT ce.id, ce.label, ce.command, ce.description, c.title
		FROM cheatsheet_entries ce
		JOIN cheatsheets c ON c.id = ce.cheatsheet_id
		WHERE ce.label ILIKE $1 OR ce.command ILIKE $1 OR ce.description ILIKE $1
		ORDER BY similarity(ce.label, $2) DESC
		LIMIT $3
	`, pattern, query, limit)
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
	row := s.pool.QueryRow(ctx, `SELECT `+cheatColumns+` FROM cheatsheets WHERE slug = $1`, slug)
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
	})
	if err != nil {
		return fmt.Errorf("seed cheatsheet %q: %w", sc.Slug, err)
	}

	// Mark as seed.
	_, err = s.pool.Exec(ctx, `UPDATE cheatsheets SET is_seed = TRUE WHERE id = $1`, c.ID)
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
