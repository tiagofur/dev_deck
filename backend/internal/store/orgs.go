package store

import (
	"context"

	"devdeck/internal/domain/auth"

	"github.com/google/uuid"
)

func (s *Store) CreateOrganization(ctx context.Context, userID uuid.UUID, name string) (*auth.Organization, error) {
	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var org auth.Organization
	err = tx.QueryRow(ctx, `
		INSERT INTO orgs (name, slug)
		VALUES ($1, generate_org_slug($1))
		RETURNING id, name, slug, plan, created_at, updated_at
	`, name).Scan(&org.ID, &org.Name, &org.Slug, &org.Plan, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO org_members (org_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, org.ID, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &org, nil
}

func (s *Store) ListUserOrganizations(ctx context.Context, userID uuid.UUID) ([]auth.Organization, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT o.id, o.name, o.slug, o.plan, o.created_at, o.updated_at
		FROM orgs o
		JOIN org_members om ON om.org_id = o.id
		WHERE om.user_id = $1
		ORDER BY o.name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []auth.Organization
	for rows.Next() {
		var o auth.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.Plan, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Store) IsOrgMember(ctx context.Context, userID, orgID uuid.UUID) (string, bool) {
	var role string
	err := s.Reader().QueryRow(ctx, `
		SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2
	`, userID, orgID).Scan(&role)
	if err != nil {
		return "", false
	}
	return role, true
}

func (s *Store) AddOrgMember(ctx context.Context, orgID, userID uuid.UUID, role string) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO org_members (org_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, orgID, userID, role)
	return err
}

type OrgInsights struct {
	TotalItems     int              `json:"total_items"`
	TopLanguages   []LanguageStat   `json:"top_languages"`
	TopCurators    []CuratorStat    `json:"top_curators"`
	RecentActivity int              `json:"recent_activity"`
}

type LanguageStat struct {
	Language string  `json:"language"`
	Count    int     `json:"count"`
	Share    float64 `json:"share"`
}

type CuratorStat struct {
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	ItemCount   int    `json:"item_count"`
}

func (s *Store) ListAllOrganizations(ctx context.Context) ([]auth.Organization, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT id, name, slug, plan, created_at, updated_at FROM orgs
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []auth.Organization
	for rows.Next() {
		var o auth.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.Plan, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Store) GetOrgInsights(ctx context.Context, orgID uuid.UUID) (*OrgInsights, error) {
	var insights OrgInsights

	// 1. Total items
	err := s.Reader().QueryRow(ctx, `
		SELECT COUNT(*) FROM items WHERE org_id = $1 AND archived = false
	`, orgID).Scan(&insights.TotalItems)
	if err != nil {
		return nil, err
	}

	// 2. Top Languages
	rows, err := s.Reader().Query(ctx, `
		SELECT meta->>'language' as lang, COUNT(*) as c
		FROM items
		WHERE org_id = $1 AND archived = false AND meta->>'language' IS NOT NULL
		GROUP BY lang
		ORDER BY c DESC
		LIMIT 5
	`, orgID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ls LanguageStat
			if err := rows.Scan(&ls.Language, &ls.Count); err == nil {
				if insights.TotalItems > 0 {
					ls.Share = float64(ls.Count) / float64(insights.TotalItems)
				}
				insights.TopLanguages = append(insights.TopLanguages, ls)
			}
		}
	}

	// 3. Top Curators
	rows, err = s.Reader().Query(ctx, `
		SELECT u.display_name, u.avatar_url, COUNT(i.id) as c
		FROM items i
		JOIN users u ON u.id = i.user_id
		WHERE i.org_id = $1 AND i.archived = false
		GROUP BY u.id, u.display_name, u.avatar_url
		ORDER BY c DESC
		LIMIT 5
	`, orgID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var cs CuratorStat
			if err := rows.Scan(&cs.DisplayName, &cs.AvatarURL, &cs.ItemCount); err == nil {
				insights.TopCurators = append(insights.TopCurators, cs)
			}
		}
	}

	// 4. Recent activity (last 7 days)
	err = s.Reader().QueryRow(ctx, `
		SELECT COUNT(*) FROM activity_log
		WHERE org_id = $1 AND created_at > NOW() - INTERVAL '7 days'
	`, orgID).Scan(&insights.RecentActivity)
	if err != nil {
		return nil, err
	}

	return &insights, nil
}
