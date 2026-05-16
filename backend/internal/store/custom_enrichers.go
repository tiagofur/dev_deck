package store

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type CustomEnricher struct {
	ID          uuid.UUID  `json:"id"`
	OrgID       *uuid.UUID `json:"org_id,omitempty"`
	UserID      *uuid.UUID `json:"user_id,omitempty"`
	Name        string     `json:"name"`
	URLPattern  string     `json:"url_pattern"`
	EndpointURL string     `json:"endpoint_url"`
	AuthHeader  *string    `json:"auth_header,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (s *Store) CreateCustomEnricher(ctx context.Context, userID, orgID *uuid.UUID, name, pattern, endpoint string, auth *string) (*CustomEnricher, error) {
	var e CustomEnricher
	err := s.Reader().QueryRow(ctx, `
		INSERT INTO custom_enrichers (user_id, org_id, name, url_pattern, endpoint_url, auth_header)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, org_id, user_id, name, url_pattern, endpoint_url, auth_header, created_at, updated_at
	`, userID, orgID, name, pattern, endpoint, auth).Scan(
		&e.ID, &e.OrgID, &e.UserID, &e.Name, &e.URLPattern, &e.EndpointURL, &e.AuthHeader, &e.CreatedAt, &e.UpdatedAt,
	)
	return &e, err
}

func (s *Store) ListCustomEnrichers(ctx context.Context, userID uuid.UUID, orgID *uuid.UUID) ([]CustomEnricher, error) {
	var rows pgx.Rows
	var err error
	
	if orgID != nil {
		rows, err = s.Reader().Query(ctx, `SELECT id, org_id, user_id, name, url_pattern, endpoint_url, auth_header, created_at, updated_at FROM custom_enrichers WHERE org_id = $1`, *orgID)
	} else {
		rows, err = s.Reader().Query(ctx, `SELECT id, org_id, user_id, name, url_pattern, endpoint_url, auth_header, created_at, updated_at FROM custom_enrichers WHERE user_id = $1 AND org_id IS NULL`, userID)
	}
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []CustomEnricher
	for rows.Next() {
		var e CustomEnricher
		if err := rows.Scan(&e.ID, &e.OrgID, &e.UserID, &e.Name, &e.URLPattern, &e.EndpointURL, &e.AuthHeader, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) DeleteCustomEnricher(ctx context.Context, id uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `DELETE FROM custom_enrichers WHERE id = $1`, id)
	return err
}
