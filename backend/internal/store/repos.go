package store

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"devdeck/internal/domain/items"
	"devdeck/internal/domain/repos"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const repoColumns = `id, url, source, owner, name, description, language, language_color,
	stars, forks, avatar_url, og_image_url, homepage, topics, notes, tags,
	archived, added_at, last_fetched_at, last_seen_at`

// repoColumnsQ is repoColumns as a qualified list so it works inside
// INSERT … RETURNING with a trailing url_normalized we want to set but
// don't want to return.


func scanRepo(row pgx.Row) (*repos.Repo, error) {
	var r repos.Repo
	err := row.Scan(
		&r.ID, &r.URL, &r.Source, &r.Owner, &r.Name, &r.Description, &r.Language,
		&r.LanguageColor, &r.Stars, &r.Forks, &r.AvatarURL, &r.OGImageURL, &r.Homepage,
		&r.Topics, &r.Notes, &r.Tags, &r.Archived, &r.AddedAt, &r.LastFetchedAt, &r.LastSeenAt,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// CreateRepo inserts a new repo from the basic input. In Wave 1 we derive
// source/owner/name from the URL itself; the enricher (Wave 2) will fill in
// the rest later via UpdateMetadata.
func (s *Store) CreateRepo(ctx context.Context, in repos.CreateInput) (*repos.Repo, error) {
	source, owner, name, err := parseRepoURL(in.URL)
	if err != nil {
		return nil, err
	}
	if in.Tags == nil {
		in.Tags = []string{}
	}

	// Backfill url_normalized so /api/items/capture dedupes cross-table.
	norm := items.NormalizeURL(in.URL)

	row := s.pool.QueryRow(ctx, `
		INSERT INTO repos (user_id, url, source, owner, name, notes, tags, url_normalized)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+repoColumns,
		currentUserIDPtr(ctx), in.URL, source, nilIfEmpty(owner), name, in.Notes, in.Tags, norm,
	)
	r, err := scanRepo(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return r, nil
}

func (s *Store) GetRepo(ctx context.Context, id uuid.UUID) (*repos.Repo, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.pool.QueryRow(ctx,
		`SELECT `+repoColumns+` FROM repos WHERE id = $1 AND `+scopeSQL,
		args...)
	r, err := scanRepo(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r, nil
}

func (s *Store) ListRepos(ctx context.Context, p repos.ListParams) (*repos.ListResult, error) {
	if p.Limit <= 0 || p.Limit > 500 {
		p.Limit = 100
	}
	if p.Offset < 0 {
		p.Offset = 0
	}

	// Build WHERE dynamically with positional args.
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	where := []string{scopeSQL}
	args := append([]any{}, scopeArgs...)
	idx := len(args) + 1

	if p.Archived != nil {
		where = append(where, fmt.Sprintf("archived = $%d", idx))
		args = append(args, *p.Archived)
		idx++
	} else {
		// Default: hide archived
		where = append(where, "archived = false")
	}
	if p.Lang != "" {
		where = append(where, fmt.Sprintf("language = $%d", idx))
		args = append(args, p.Lang)
		idx++
	}
	if p.Tag != "" {
		where = append(where, fmt.Sprintf("$%d = ANY(tags)", idx))
		args = append(args, p.Tag)
		idx++
	}
	if p.Q != "" {
		where = append(where, fmt.Sprintf(
			"(name || ' ' || COALESCE(description,'') || ' ' || COALESCE(array_to_string(tags,' '),'')) %% $%d",
			idx,
		))
		args = append(args, p.Q)
		idx++
	}

	orderBy := "added_at DESC"
	switch p.Sort {
	case "added_asc":
		orderBy = "added_at ASC"
	case "stars_desc":
		orderBy = "stars DESC NULLS LAST"
	case "name_asc":
		orderBy = "name ASC"
	}

	whereSQL := strings.Join(where, " AND ")

	// Total count
	var total int
	countSQL := "SELECT COUNT(*) FROM repos WHERE " + whereSQL
	if err := s.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, err
	}

	// Items
	listArgs := append(args, p.Limit, p.Offset)
	listSQL := fmt.Sprintf(
		"SELECT %s FROM repos WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d",
		repoColumns, whereSQL, orderBy, idx, idx+1,
	)
	rows, err := s.pool.Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []*repos.Repo{}
	for rows.Next() {
		r, err := scanRepo(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &repos.ListResult{Total: total, Items: items}, nil
}

func (s *Store) UpdateRepo(ctx context.Context, id uuid.UUID, in repos.UpdateInput) (*repos.Repo, error) {
	sets := []string{}
	args := []any{}
	idx := 1

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
	if in.Archived != nil {
		sets = append(sets, fmt.Sprintf("archived = $%d", idx))
		args = append(args, *in.Archived)
		idx++
	}

	if len(sets) == 0 {
		return s.GetRepo(ctx, id)
	}

	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", idx+1)
	args = append(args, id)
	args = append(args, scopeArgs...)
	q := fmt.Sprintf(
		"UPDATE repos SET %s WHERE id = $%d AND %s RETURNING %s",
		strings.Join(sets, ", "), idx, scopeSQL, repoColumns,
	)
	row := s.pool.QueryRow(ctx, q, args...)
	r, err := scanRepo(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r, nil
}

func (s *Store) DeleteRepo(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx, `DELETE FROM repos WHERE id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateMetadata persists enricher output and sets last_fetched_at = NOW().
// Used by both POST /api/repos (after the basic insert) and POST
// /api/repos/:id/refresh, plus the cron worker.
func (s *Store) UpdateMetadata(ctx context.Context, id uuid.UUID, md *repos.Metadata) (*repos.Repo, error) {
	if md.Topics == nil {
		md.Topics = []string{}
	}
	row := s.pool.QueryRow(ctx, `
		UPDATE repos SET
			description     = $2,
			language        = $3,
			language_color  = $4,
			stars           = $5,
			forks           = $6,
			avatar_url      = $7,
			og_image_url    = $8,
			homepage        = $9,
			topics          = $10,
			last_fetched_at = NOW()
		WHERE id = $1
		RETURNING `+repoColumns,
		id,
		md.Description, md.Language, md.LanguageColor,
		md.Stars, md.Forks,
		md.AvatarURL, md.OGImageURL, md.Homepage, md.Topics,
	)
	r, err := scanRepo(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r, nil
}

// GetDiscoveryNext returns the next repo to surface in discovery mode.
// Strategy: oldest last_seen_at first (NULLs = never seen → top priority),
// tie-broken by oldest added_at. Skips archived.
//
// Returns ErrNotFound if there are no eligible repos.
func (s *Store) GetDiscoveryNext(ctx context.Context) (*repos.Repo, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	row := s.pool.QueryRow(ctx, `
		SELECT `+repoColumns+` FROM repos
		WHERE archived = false
		  AND `+scopeSQL+`
		ORDER BY last_seen_at NULLS FIRST, added_at ASC
		LIMIT 1
	`, scopeArgs...)
	r, err := scanRepo(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r, nil
}

// MarkSeen sets last_seen_at = NOW() for a repo. Used by discovery mode
// to signal "the user looked at this card".
func (s *Store) MarkSeen(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx,
		`UPDATE repos SET last_seen_at = NOW() WHERE id = $1 AND `+scopeSQL,
		args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListStaleRepos returns non-archived repos whose last_fetched_at is NULL
// or older than `before`. Ordered NULLS FIRST so never-fetched repos get
// processed first. Used by the cron refresher.
func (s *Store) ListStaleRepos(ctx context.Context, before time.Time, limit int) ([]*repos.Repo, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+repoColumns+` FROM repos
		WHERE archived = false
		  AND (last_fetched_at IS NULL OR last_fetched_at < $1)
		ORDER BY last_fetched_at NULLS FIRST
		LIMIT $2
	`, before, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*repos.Repo{}
	for rows.Next() {
		r, err := scanRepo(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ───────────────────────── helpers ─────────────────────────

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// parseRepoURL extracts (source, owner, name) from a repo URL.
// Examples:
//
//	https://github.com/charmbracelet/bubbletea  → ("github", "charmbracelet", "bubbletea")
//	https://gitlab.com/foo/bar                  → ("generic", "foo", "bar")
//	https://example.com/some/page               → ("generic", "", "page")
func parseRepoURL(raw string) (source, owner, name string, err error) {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return "", "", "", errors.New("invalid url")
	}
	source = "generic"
	if strings.EqualFold(u.Host, "github.com") || strings.HasSuffix(strings.ToLower(u.Host), ".github.com") {
		source = "github"
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	switch len(parts) {
	case 0:
		name = u.Host
	case 1:
		name = parts[0]
	default:
		owner = parts[0]
		name = parts[1]
	}
	if name == "" {
		return "", "", "", errors.New("could not derive name from url")
	}
	return source, owner, name, nil
}
