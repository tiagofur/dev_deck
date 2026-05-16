package store

import (
	"context"
	"encoding/json"
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

// scanRepoLegacy is a helper to scan an items row into a legacy repos.Repo struct.
func scanRepoLegacy(row pgx.Row) (*repos.Repo, error) {
	it, err := scanItem(row)
	if err != nil {
		return nil, err
	}
	if it.Type != "repo" {
		return nil, fmt.Errorf("item %s is not a repo (type: %s)", it.ID, it.Type)
	}

	r := &repos.Repo{
		ID:             it.ID,
		URL:            derefStr(it.URL),
		Source:         castStr(it.Meta["source"], "generic"),
		Owner:          castPtrStr(it.Meta["owner"]),
		Name:           it.Title,
		Description:    it.Description,
		Language:       castPtrStr(it.Meta["language"]),
		LanguageColor:  castPtrStr(it.Meta["language_color"]),
		AvatarURL:      castPtrStr(it.Meta["avatar_url"]),
		OGImageURL:     castPtrStr(it.Meta["og_image_url"]),
		Homepage:       castPtrStr(it.Meta["homepage"]),
		Notes:          it.Notes,
		Tags:           it.Tags,
		Archived:       it.Archived,
		AddedAt:        it.CreatedAt,
		LastSeenAt:     it.LastSeenAt,
	}
	
	if v, ok := it.Meta["stars"].(float64); ok {
		r.Stars = int(v)
	}
	if v, ok := it.Meta["forks"].(float64); ok {
		r.Forks = int(v)
	}
	if v, ok := it.Meta["topics"].([]any); ok {
		r.Topics = make([]string, len(v))
		for i, t := range v {
			if s, ok := t.(string); ok {
				r.Topics[i] = s
			}
		}
	} else {
		r.Topics = []string{}
	}
	if v, ok := it.Meta["last_fetched_at"].(string); ok {
		t, _ := time.Parse(time.RFC3339, v)
		r.LastFetchedAt = &t
	}

	return r, nil
}

func castStr(v any, def string) string {
	if s, ok := v.(string); ok {
		return s
	}
	return def
}

func castPtrStr(v any) *string {
	if s, ok := v.(string); ok {
		return &s
	}
	return nil
}

// CreateRepo inserts a new repo using the unified items table.
func (s *Store) CreateRepo(ctx context.Context, in repos.CreateInput) (*repos.Repo, error) {
	source, owner, name, err := parseRepoURL(in.URL)
	if err != nil {
		return nil, err
	}
	
	meta := map[string]any{
		"source": source,
		"owner":  nilIfEmpty(owner),
	}
	
	norm := items.NormalizeURL(in.URL)
	
	it, err := s.CreateItem(ctx, CreateItemInput{
		Type:          "repo",
		Title:         name,
		URL:           &in.URL,
		URLNormalized: &norm,
		Notes:         in.Notes,
		Tags:          in.Tags,
		Meta:          meta,
		SourceChannel: "legacy-api",
	})
	if err != nil {
		return nil, err
	}
	
	return s.GetRepo(ctx, it.ID)
}

func (s *Store) GetRepo(ctx context.Context, id uuid.UUID) (*repos.Repo, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.pool.QueryRow(ctx,
		`SELECT `+itemColumns+` FROM items WHERE id = $1 AND item_type = 'repo' AND `+scopeSQL,
		args...)
	return scanRepoLegacy(row)
}

func (s *Store) ListRepos(ctx context.Context, p repos.ListParams) (*repos.ListResult, error) {
	if p.Limit <= 0 || p.Limit > 500 {
		p.Limit = 100
	}
	if p.Offset < 0 {
		p.Offset = 0
	}

	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	where := []string{scopeSQL, "item_type = 'repo'"}
	args := append([]any{}, scopeArgs...)
	idx := len(args) + 1

	if p.Archived != nil {
		where = append(where, fmt.Sprintf("archived = $%d", idx))
		args = append(args, *p.Archived)
		idx++
	} else {
		where = append(where, "archived = false")
	}
	if p.Lang != "" {
		where = append(where, fmt.Sprintf("meta->>'language' = $%d", idx))
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
			"(title || ' ' || COALESCE(description,'') || ' ' || COALESCE(immutable_array_to_string(tags,' '),'')) %% $%d",
			idx,
		))
		args = append(args, p.Q)
		idx++
	}

	orderBy := "created_at DESC"
	switch p.Sort {
	case "added_asc":
		orderBy = "created_at ASC"
	case "stars_desc":
		orderBy = "(meta->>'stars')::int DESC NULLS LAST"
	case "name_asc":
		orderBy = "title ASC"
	}

	whereSQL := strings.Join(where, " AND ")

	var total int
	countSQL := "SELECT COUNT(*) FROM items WHERE " + whereSQL
	if err := s.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
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

	itemsList := []*repos.Repo{}
	for rows.Next() {
		r, err := scanRepoLegacy(rows)
		if err != nil {
			return nil, err
		}
		itemsList = append(itemsList, r)
	}
	return &repos.ListResult{Total: total, Items: itemsList}, rows.Err()
}

func (s *Store) UpdateRepo(ctx context.Context, id uuid.UUID, in repos.UpdateInput) (*repos.Repo, error) {
	// Re-use UpdateItem logic
	input := items.UpdateInput{
		Notes:    in.Notes,
		Tags:     in.Tags,
		Archived: in.Archived,
	}
	_, err := s.UpdateItem(ctx, id, input)
	if err != nil {
		return nil, err
	}
	return s.GetRepo(ctx, id)
}

func (s *Store) DeleteRepo(ctx context.Context, id uuid.UUID) error {
	return s.DeleteItem(ctx, id)
}

func (s *Store) UpdateMetadata(ctx context.Context, id uuid.UUID, md *repos.Metadata) (*repos.Repo, error) {
	// Fetch current item to get existing meta
	it, err := s.GetItem(ctx, id)
	if err != nil {
		return nil, err
	}

	meta := it.Meta
	meta["description"] = md.Description
	meta["language"] = md.Language
	meta["language_color"] = md.LanguageColor
	meta["stars"] = md.Stars
	meta["forks"] = md.Forks
	meta["avatar_url"] = md.AvatarURL
	meta["og_image_url"] = md.OGImageURL
	meta["homepage"] = md.Homepage
	meta["topics"] = md.Topics
	meta["last_fetched_at"] = time.Now().Format(time.RFC3339)

	metaJSON, _ := json.Marshal(meta)
	_, err = s.pool.Exec(ctx, `
		UPDATE items SET
			description = $2,
			meta = $3,
			updated_at = NOW()
		WHERE id = $1
	`, id, md.Description, metaJSON)
	if err != nil {
		return nil, err
	}
	return s.GetRepo(ctx, id)
}

func (s *Store) GetDiscoveryNext(ctx context.Context) (*repos.Repo, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	row := s.pool.QueryRow(ctx, `
		SELECT `+itemColumns+` FROM items
		WHERE archived = false AND item_type = 'repo'
		  AND `+scopeSQL+`
		ORDER BY last_seen_at NULLS FIRST, created_at ASC
		LIMIT 1
	`, scopeArgs...)
	return scanRepoLegacy(row)
}

func (s *Store) MarkSeenRepo(ctx context.Context, id uuid.UUID) error {
	return s.MarkItemSeen(ctx, id)
}

func (s *Store) ListStaleRepos(ctx context.Context, before time.Time, limit int) ([]*repos.Repo, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := s.pool.Query(ctx, `
		SELECT `+itemColumns+` FROM items
		WHERE archived = false AND item_type = 'repo'
		  AND ((meta->>'last_fetched_at') IS NULL OR (meta->>'last_fetched_at')::timestamptz < $1)
		ORDER BY (meta->>'last_fetched_at') NULLS FIRST
		LIMIT $2
	`, before, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*repos.Repo{}
	for rows.Next() {
		r, err := scanRepoLegacy(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ───────────────────────── helpers ─────────────────────────

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
