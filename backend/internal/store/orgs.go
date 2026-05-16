package store

import (
	"context"

	"devdeck/internal/domain/auth"

	"github.com/google/uuid"
)

func (s *Store) CreateOrganization(ctx context.Context, userID uuid.UUID, name string) (*auth.Organization, error) {
	tx, err := s.pool.Begin(ctx)
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
	rows, err := s.pool.Query(ctx, `
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
	err := s.pool.QueryRow(ctx, `
		SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2
	`, userID, orgID).Scan(&role)
	if err != nil {
		return "", false
	}
	return role, true
}

func (s *Store) AddOrgMember(ctx context.Context, orgID, userID uuid.UUID, role string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO org_members (org_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, orgID, userID, role)
	return err
}
