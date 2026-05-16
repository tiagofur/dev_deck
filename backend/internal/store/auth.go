package store

import (
	"context"
	"errors"
	"time"

	"devdeck/internal/domain/auth"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const userColumns = `id, github_id, login, username, bio, plan, avatar_url, display_name, role, created_at`
const userColumnsWithHash = `id, github_id, login, username, bio, plan, avatar_url, display_name, role, password_hash, created_at`

func scanUser(row pgx.Row) (*auth.User, error) {
	var u auth.User
	err := row.Scan(&u.ID, &u.GitHubID, &u.Login, &u.Username, &u.Bio, &u.Plan, &u.AvatarURL, &u.DisplayName, &u.Role, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func scanUserWithHash(row pgx.Row) (*auth.User, string, error) {
	var u auth.User
	var hash *string
	err := row.Scan(&u.ID, &u.GitHubID, &u.Login, &u.Username, &u.Bio, &u.Plan, &u.AvatarURL, &u.DisplayName, &u.Role, &hash, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrNotFound
		}
		return nil, "", err
	}
	return &u, derefStr(hash), nil
}

func (s *Store) GetUserByGitHubID(ctx context.Context, githubID int64) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE github_id = $1`, githubID)
	return scanUser(row)
}

func (s *Store) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id)
	return scanUser(row)
}

func (s *Store) UpsertUser(ctx context.Context, ghUser auth.GitHubUser) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO users (github_id, login, username, avatar_url, display_name, role)
		VALUES ($1, $2, $2, $3, $4, 'user')
		ON CONFLICT (github_id) DO UPDATE SET
			login = EXCLUDED.login,
			avatar_url = EXCLUDED.avatar_url,
			display_name = EXCLUDED.display_name,
			updated_at = NOW()
		RETURNING `+userColumns, ghUser.ID, ghUser.Login, ghUser.AvatarURL, ghUser.Name)
	return scanUser(row)
}

func (s *Store) GetPublicProfile(ctx context.Context, username string) (map[string]any, error) {
	var profile struct {
		ID               uuid.UUID
		Username         string
		Bio              *string
		AvatarURL        *string
		CreatedAt        time.Time
		PublicDecksCount int64
		FollowersCount   int64
		FollowingCount   int64
		ReputationPoints int32
	}
	err := s.pool.QueryRow(ctx, `
		SELECT id, username, bio, avatar_url, created_at, public_decks_count, followers_count, following_count, reputation_points
		FROM get_user_by_username($1)
	`, username).Scan(
		&profile.ID, &profile.Username, &profile.Bio, &profile.AvatarURL, &profile.CreatedAt,
		&profile.PublicDecksCount, &profile.FollowersCount, &profile.FollowingCount, &profile.ReputationPoints,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return map[string]any{
		"id":                 profile.ID,
		"username":           profile.Username,
		"bio":                profile.Bio,
		"avatar_url":         profile.AvatarURL,
		"created_at":         profile.CreatedAt,
		"public_decks_count": profile.PublicDecksCount,
		"followers_count":    profile.FollowersCount,
		"following_count":    profile.FollowingCount,
		"reputation_points":  profile.ReputationPoints,
	}, nil
}

func (s *Store) ListUsersAdmin(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.login, u.username, u.plan, u.role, u.created_at,
		       (SELECT COUNT(*) FROM items WHERE user_id = u.id) as item_count
		FROM users u
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []map[string]any
	for rows.Next() {
		var id uuid.UUID
		var login, plan, role string
		var username *string
		var createdAt time.Time
		var itemCount int64
		if err := rows.Scan(&id, &login, &username, &plan, &role, &createdAt, &itemCount); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id":         id,
			"login":      login,
			"username":   username,
			"plan":       plan,
			"role":       role,
			"created_at": createdAt,
			"item_count": itemCount,
		})
	}
	return out, nil
}

func (s *Store) UpdateUser(ctx context.Context, userID uuid.UUID, bio *string, username *string) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE users SET
			bio = COALESCE($2, bio),
			username = COALESCE($3, username),
			updated_at = NOW()
		WHERE id = $1
		RETURNING `+userColumns, userID, bio, username)
	return scanUser(row)
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

func (s *Store) GetUserByLogin(ctx context.Context, login string) (*auth.User, string, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE login = $1`, login)
	return scanUserWithHash(row)
}

func (s *Store) CreateUserLocal(ctx context.Context, login, passwordHash string) (*auth.User, error) {
	return s.CreateUserLocalTx(ctx, nil, login, passwordHash)
}

func (s *Store) CreateUserLocalTx(ctx context.Context, tx pgx.Tx, login, passwordHash string) (*auth.User, error) {
	var row pgx.Row
	q := `INSERT INTO users (login, password_hash, display_name, role)
		  VALUES ($1, $2, $1, 'user')
		  ON CONFLICT (login) DO NOTHING
		  RETURNING ` + userColumns
	
	if tx != nil {
		row = tx.QueryRow(ctx, q, login, passwordHash)
	} else {
		row = s.pool.QueryRow(ctx, q, login, passwordHash)
	}

	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return u, nil
}
