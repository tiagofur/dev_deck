package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	ErrInvalidInvite = errors.New("invalid or used invite code")
)

type Invite struct {
	ID        uuid.UUID  `json:"id"`
	Code      string     `json:"code"`
	CreatorID uuid.UUID  `json:"creator_id"`
	UsedByID  *uuid.UUID `json:"used_by_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
}

type WaitlistEntry struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Status    string    `json:"status"` // pending, invited
	CreatedAt time.Time `json:"created_at"`
}

// ───── Waitlist ─────

func (s *Store) JoinWaitlist(ctx context.Context, email string) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO waitlist (email) VALUES ($1)
		ON CONFLICT (email) DO NOTHING
	`, strings.ToLower(strings.TrimSpace(email)))
	return err
}

func (s *Store) ListWaitlist(ctx context.Context) ([]WaitlistEntry, error) {
	rows, err := s.Reader().Query(ctx, `SELECT id, email, status, created_at FROM waitlist ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []WaitlistEntry
	for rows.Next() {
		var e WaitlistEntry
		if err := rows.Scan(&e.ID, &e.Email, &e.Status, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ───── Invites ─────

func (s *Store) CreateInvite(ctx context.Context, adminID uuid.UUID, code string) (*Invite, error) {
	var inv Invite
	err := s.Reader().QueryRow(ctx, `
		INSERT INTO invites (code, creator_id)
		VALUES ($1, $2)
		RETURNING id, code, creator_id, created_at
	`, strings.ToUpper(code), adminID).Scan(&inv.ID, &inv.Code, &inv.CreatorID, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (s *Store) ListInvites(ctx context.Context) ([]Invite, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT id, code, creator_id, used_by_id, created_at, used_at
		FROM invites
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Invite
	for rows.Next() {
		var inv Invite
		if err := rows.Scan(&inv.ID, &inv.Code, &inv.CreatorID, &inv.UsedByID, &inv.CreatedAt, &inv.UsedAt); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

func (s *Store) ValidateInviteCode(ctx context.Context, code string) (uuid.UUID, error) {
	var id uuid.UUID
	err := s.Reader().QueryRow(ctx, `
		SELECT id FROM invites WHERE code = $1 AND used_by_id IS NULL
	`, strings.ToUpper(code)).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrInvalidInvite
		}
		return uuid.Nil, err
	}
	return id, nil
}

func (s *Store) UseInviteCode(ctx context.Context, tx pgx.Tx, inviteID, userID uuid.UUID) error {
	res, err := tx.Exec(ctx, `
		UPDATE invites SET used_by_id = $1, used_at = NOW()
		WHERE id = $2 AND used_by_id IS NULL
	`, userID, inviteID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrInvalidInvite
	}
	return nil
}

func (s *Store) MarkEmailInvited(ctx context.Context, tx pgx.Tx, email string) error {
	_, err := tx.Exec(ctx, `UPDATE waitlist SET status = 'invited' WHERE email = $1`, strings.ToLower(email))
	return err
}
