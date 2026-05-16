package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type APIKey struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	Name       string     `json:"name"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// CreateAPIKey generates a new random token, hashes it, and stores it.
// Returns the RAW token (only shown once) and the record.
func (s *Store) CreateAPIKey(ctx context.Context, userID uuid.UUID, name string) (string, *APIKey, error) {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", nil, err
	}
	raw := "devdeck_" + hex.EncodeToString(bytes)
	hash := hashToken(raw)

	var k APIKey
	err := s.pool.QueryRow(ctx, `
		INSERT INTO api_keys (user_id, name, token_hash)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, name, last_used_at, created_at
	`, userID, name, hash).Scan(&k.ID, &k.UserID, &k.Name, &k.LastUsedAt, &k.CreatedAt)

	if err != nil {
		return "", nil, err
	}
	return raw, &k, nil
}

func (s *Store) ListAPIKeys(ctx context.Context, userID uuid.UUID) ([]APIKey, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, name, last_used_at, created_at
		FROM api_keys
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []APIKey
	for rows.Next() {
		var k APIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.LastUsedAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

func (s *Store) DeleteAPIKey(ctx context.Context, userID, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

// ValidateAPIKey checks if a raw token is valid and returns the associated UserID.
func (s *Store) ValidateAPIKey(ctx context.Context, rawToken string) (uuid.UUID, error) {
	hash := hashToken(rawToken)
	var userID uuid.UUID
	var id uuid.UUID
	err := s.pool.QueryRow(ctx, `
		UPDATE api_keys
		SET last_used_at = NOW()
		WHERE token_hash = $1
		RETURNING user_id, id
	`, hash).Scan(&userID, &id)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrNotFound
		}
		return uuid.Nil, err
	}
	return userID, nil
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}
