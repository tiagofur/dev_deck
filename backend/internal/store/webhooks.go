package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"devdeck/internal/webhooks"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Webhook struct {
	ID        uuid.UUID  `json:"id"`
	UserID    *uuid.UUID `json:"user_id,omitempty"`
	OrgID     *uuid.UUID `json:"org_id,omitempty"`
	Name      string     `json:"name"`
	URL       string     `json:"url"`
	Secret    string     `json:"secret"`
	Events    []string   `json:"events"`
	IsActive  bool       `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
}

func (s *Store) CreateWebhook(ctx context.Context, userID, orgID *uuid.UUID, name, url string, events []string) (*Webhook, error) {
	// Generate random secret
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	secret := hex.EncodeToString(b)

	var w Webhook
	err := s.Reader().QueryRow(ctx, `
		INSERT INTO webhooks (user_id, org_id, name, url, secret, events)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, org_id, name, url, secret, events, is_active, created_at
	`, userID, orgID, name, url, secret, events).Scan(
		&w.ID, &w.UserID, &w.OrgID, &w.Name, &w.URL, &w.Secret, &w.Events, &w.IsActive, &w.CreatedAt,
	)
	return &w, err
}

func (s *Store) ListWebhooks(ctx context.Context, userID uuid.UUID, orgID *uuid.UUID) ([]Webhook, error) {
	var rows interface {
		Next() bool
		Scan(dest ...any) error
		Close()
		Err() error
	}
	var err error

	if orgID != nil {
		rows, err = s.Reader().Query(ctx, `
			SELECT id, user_id, org_id, name, url, secret, events, is_active, created_at
			FROM webhooks
			WHERE org_id = $1
		`, *orgID)
	} else {
		rows, err = s.Reader().Query(ctx, `
			SELECT id, user_id, org_id, name, url, secret, events, is_active, created_at
			FROM webhooks
			WHERE user_id = $1 AND org_id IS NULL
		`, userID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Webhook
	for rows.Next() {
		var w Webhook
		if err := rows.Scan(&w.ID, &w.UserID, &w.OrgID, &w.Name, &w.URL, &w.Secret, &w.Events, &w.IsActive, &w.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (s *Store) DeleteWebhook(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	// Simple owner check: must match user_id OR be in an org the user is member of (for simplicity, we assume org_id was checked in handler or we check it here).
	// Let's do a strict check on user_id OR org_membership.
	_, err := s.Writer().Exec(ctx, `
		DELETE FROM webhooks
		WHERE id = $1 AND (user_id = $2 OR org_id IN (SELECT org_id FROM org_members WHERE user_id = $2))
	`, id, userID)
	return err
}

// FindWebhooksForEvent finds active webhooks for a given org/user and event type.
// Internal for the dispatcher.
func (s *Store) FindWebhooksForEvent(ctx context.Context, orgID, userID uuid.UUID, event string) ([]webhooks.WebhookData, error) {
	var rows pgx.Rows
	var err error

	if orgID != uuid.Nil {
		rows, err = s.Reader().Query(ctx, `
			SELECT id, url, secret
			FROM webhooks
			WHERE org_id = $1 AND is_active = true AND events ? $2
		`, orgID, event)
	} else {
		rows, err = s.Reader().Query(ctx, `
			SELECT id, url, secret
			FROM webhooks
			WHERE user_id = $1 AND org_id IS NULL AND is_active = true AND events ? $2
		`, userID, event)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []webhooks.WebhookData
	for rows.Next() {
		var w webhooks.WebhookData
		if err := rows.Scan(&w.ID, &w.URL, &w.Secret); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}
