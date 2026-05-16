package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	ActionURL *string    `json:"action_url,omitempty"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (s *Store) CreateNotification(ctx context.Context, userID uuid.UUID, nType, title, body string, actionURL *string) (*Notification, error) {
	var n Notification
	err := s.Reader().QueryRow(ctx, `
		INSERT INTO notifications (user_id, type, title, body, action_url)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, type, title, body, action_url, read_at, created_at
	`, userID, nType, title, body, actionURL).Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body, &n.ActionURL, &n.ReadAt, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (s *Store) ListNotifications(ctx context.Context, userID uuid.UUID, unreadOnly bool) ([]Notification, error) {
	where := "user_id = $1"
	if unreadOnly {
		where += " AND read_at IS NULL"
	}

	rows, err := s.Reader().Query(ctx, `
		SELECT id, user_id, type, title, body, action_url, read_at, created_at
		FROM notifications
		WHERE `+where+`
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body, &n.ActionURL, &n.ReadAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (s *Store) MarkNotificationRead(ctx context.Context, userID, id uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		UPDATE notifications SET read_at = NOW()
		WHERE id = $1 AND user_id = $2 AND read_at IS NULL
	`, id, userID)
	return err
}

func (s *Store) MarkAllNotificationsRead(ctx context.Context, userID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		UPDATE notifications SET read_at = NOW()
		WHERE user_id = $1 AND read_at IS NULL
	`, userID)
	return err
}

func (s *Store) GetUnreadNotificationsCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := s.Reader().QueryRow(ctx, `
		SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL
	`, userID).Scan(&count)
	return count, err
}
