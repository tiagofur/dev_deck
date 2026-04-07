package store

import (
	"context"
	"errors"
	"time"

	"devdeck/internal/domain/auth"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ─── Users ───

func (s *Store) GetUserByGitHubID(ctx context.Context, githubID int64) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, github_id, login, avatar_url, display_name, created_at
		FROM users WHERE github_id = $1
	`, githubID)
	var u auth.User
	err := row.Scan(&u.ID, &u.GitHubID, &u.Login, &u.AvatarURL, &u.DisplayName, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (s *Store) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, github_id, login, avatar_url, display_name, created_at
		FROM users WHERE id = $1
	`, id)
	var u auth.User
	err := row.Scan(&u.ID, &u.GitHubID, &u.Login, &u.AvatarURL, &u.DisplayName, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (s *Store) UpsertUser(ctx context.Context, ghUser auth.GitHubUser) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO users (github_id, login, avatar_url, display_name)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (github_id) DO UPDATE SET
			login = EXCLUDED.login,
			avatar_url = EXCLUDED.avatar_url,
			display_name = EXCLUDED.display_name,
			updated_at = NOW()
		RETURNING id, github_id, login, avatar_url, display_name, created_at
	`, ghUser.ID, ghUser.Login, ghUser.AvatarURL, ghUser.Name)
	var u auth.User
	if err := row.Scan(&u.ID, &u.GitHubID, &u.Login, &u.AvatarURL, &u.DisplayName, &u.CreatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}

// ─── Refresh Sessions ───

func (s *Store) CreateRefreshSession(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO refresh_sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

func (s *Store) GetRefreshSession(ctx context.Context, tokenHash string) (*uuid.UUID, error) {
	row := s.pool.QueryRow(ctx, `
		DELETE FROM refresh_sessions
		WHERE token_hash = $1 AND expires_at > NOW()
		RETURNING user_id
	`, tokenHash)
	var userID uuid.UUID
	if err := row.Scan(&userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &userID, nil
}

func (s *Store) DeleteAllRefreshSessions(ctx context.Context, userID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM refresh_sessions WHERE user_id = $1`, userID)
	return err
}
