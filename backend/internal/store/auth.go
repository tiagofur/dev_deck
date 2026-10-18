package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"heapdeck/internal/domain/auth"
	"heapdeck/internal/domain/items"
	"heapdeck/internal/store/seed"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const userColumns = `id, github_id, login, username, bio, plan, avatar_url, display_name, role, region, onboarding_completed, created_at, stack_tags, website, location, github_url`
const userColumnsWithHash = `id, github_id, login, username, bio, plan, avatar_url, display_name, role, password_hash, region, onboarding_completed, created_at, stack_tags, website, location, github_url`

func scanUser(row pgx.Row) (*auth.User, error) {
	var u auth.User
	err := row.Scan(&u.ID, &u.GitHubID, &u.Login, &u.Username, &u.Bio, &u.Plan, &u.AvatarURL, &u.DisplayName, &u.Role, &u.Region, &u.OnboardingCompleted, &u.CreatedAt, &u.StackTags, &u.Website, &u.Location, &u.GitHubURL)
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
	err := row.Scan(&u.ID, &u.GitHubID, &u.Login, &u.Username, &u.Bio, &u.Plan, &u.AvatarURL, &u.DisplayName, &u.Role, &hash, &u.Region, &u.OnboardingCompleted, &u.CreatedAt, &u.StackTags, &u.Website, &u.Location, &u.GitHubURL)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrNotFound
		}
		return nil, "", err
	}
	return &u, derefStr(hash), nil
}

func (s *Store) GetUserByGitHubID(ctx context.Context, githubID int64) (*auth.User, error) {
	row := s.Reader().QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE github_id = $1`, githubID)
	return scanUser(row)
}

func (s *Store) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	row := s.Reader().QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id)
	return scanUser(row)
}

// UpsertUser creates or updates the user behind a GitHub identity. If a
// local account registered before login validation already owns the same
// login, the GitHub identity is stored under a "-gh" suffixed login instead
// of failing the whole OAuth flow with a 500.
func (s *Store) UpsertUser(ctx context.Context, ghUser auth.GitHubUser) (*auth.User, error) {
	user, err := s.upsertGitHubUser(ctx, ghUser, ghUser.Login)
	if err != nil && isUniqueViolation(err) {
		return s.upsertGitHubUser(ctx, ghUser, ghUser.Login+"-gh")
	}
	return user, err
}

func (s *Store) upsertGitHubUser(ctx context.Context, ghUser auth.GitHubUser, login string) (*auth.User, error) {
	row := s.Writer().QueryRow(ctx, `
		INSERT INTO users (github_id, login, username, avatar_url, display_name, role, region)
		VALUES ($1, $2, $3, $4, $5, 'user', $6)
		ON CONFLICT (github_id) WHERE github_id IS NOT NULL DO UPDATE SET
			login = EXCLUDED.login,
			avatar_url = EXCLUDED.avatar_url,
			display_name = EXCLUDED.display_name,
			updated_at = NOW()
		RETURNING `+userColumns,
		ghUser.ID, login, ghUser.Login, ghUser.AvatarURL, ghUser.Name, s.appRegion)
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
	err := s.Reader().QueryRow(ctx, `
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
	rows, err := s.Reader().Query(ctx, `
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

func (s *Store) UpdateUser(ctx context.Context, userID uuid.UUID, bio *string, username *string, stackTags []string, website *string, location *string, githubURL *string, avatarURL *string) (*auth.User, error) {
	row := s.Writer().QueryRow(ctx, `
		UPDATE users SET
			bio = COALESCE($2, bio),
			username = COALESCE($3, username),
			stack_tags = COALESCE($4, stack_tags),
			website = COALESCE($5, website),
			location = COALESCE($6, location),
			github_url = COALESCE($7, github_url),
			avatar_url = COALESCE($8, avatar_url),
			updated_at = NOW()
		WHERE id = $1
		RETURNING `+userColumns, userID, bio, username, stackTags, website, location, githubURL, avatarURL)
	return scanUser(row)
}

func (s *Store) CompleteOnboarding(ctx context.Context, userID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `UPDATE users SET onboarding_completed = true WHERE id = $1`, userID)
	return err
}

func (s *Store) InstallStarterKit(ctx context.Context, kitID string) error {
	kits := seed.GetStarterKits()
	var selected *seed.StarterKit
	for _, k := range kits {
		if k.ID == kitID {
			selected = &k
			break
		}
	}

	if selected == nil {
		return ErrNotFound
	}

	for _, si := range selected.Items {
		var url *string
		var normalizedURL *string
		if si.URL != "" {
			url = &si.URL
			norm := items.NormalizeURL(si.URL)
			if norm != "" {
				normalizedURL = &norm
			}
		}
		exists, err := s.onboardingItemExists(ctx, si.Title)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		if _, err := s.CreateItem(ctx, CreateItemInput{
			Type:          si.Type,
			Title:         si.Title,
			URL:           url,
			URLNormalized: normalizedURL,
			Description:   stringPtrOrNil(si.Description),
			Notes:         si.Notes,
			Tags:          si.Tags,
			WhySaved:      si.WhySaved,
			WhenToUse:     si.WhenToUse,
			SourceChannel: "onboarding",
			Meta:          si.Meta,
		}); err != nil && !errors.Is(err, ErrAlreadyExists) {
			return err
		}
	}

	return nil
}

func (s *Store) onboardingItemExists(ctx context.Context, title string) (bool, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	args := append([]any{}, scopeArgs...)
	args = append(args, title)

	var exists bool
	err := s.Reader().QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM items
			WHERE `+scopeSQL+`
			  AND source_channel = 'onboarding'
			  AND title = $`+fmt.Sprint(len(args))+`
		)
	`, args...).Scan(&exists)
	return exists, err
}

func stringPtrOrNil(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

// ─── Refresh Sessions ───

func (s *Store) CreateRefreshSession(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO refresh_sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

func (s *Store) GetRefreshSession(ctx context.Context, tokenHash string) (*uuid.UUID, error) {
	row := s.Reader().QueryRow(ctx, `
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
	row := s.Reader().QueryRow(ctx, `SELECT `+userColumnsWithHash+` FROM users WHERE login = $1`, login)
	return scanUserWithHash(row)
}

func (s *Store) CreateUserLocal(ctx context.Context, login, passwordHash string) (*auth.User, error) {
	return s.CreateUserLocalTx(ctx, nil, login, passwordHash)
}

func (s *Store) CreateUserLocalTx(ctx context.Context, tx pgx.Tx, login, passwordHash string) (*auth.User, error) {
	var row pgx.Row
	q := `INSERT INTO users (login, password_hash, display_name, role, region)
		  VALUES ($1, $2, $1, 'user', $3)
		  ON CONFLICT (login) DO NOTHING
		  RETURNING ` + userColumns

	if tx != nil {
		row = tx.QueryRow(ctx, q, login, passwordHash, s.appRegion)
	} else {
		row = s.Writer().QueryRow(ctx, q, login, passwordHash, s.appRegion)
	}

	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return u, nil
}

// CreatePasswordResetToken stores a hashed reset token valid until expiresAt.
func (s *Store) CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
		VALUES ($1, $2, $3)
	`, tokenHash, userID, expiresAt)
	return err
}

// ConsumePasswordResetToken deletes a valid (non-expired) reset token and
// returns its user. Single-use: the row is gone once consumed.
func (s *Store) ConsumePasswordResetToken(ctx context.Context, tokenHash string) (uuid.UUID, error) {
	row := s.Writer().QueryRow(ctx, `
		DELETE FROM password_reset_tokens
		WHERE token_hash = $1 AND expires_at > NOW()
		RETURNING user_id
	`, tokenHash)
	var userID uuid.UUID
	if err := row.Scan(&userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrNotFound
		}
		return uuid.Nil, err
	}
	return userID, nil
}

// GetUserPasswordHash returns the local password hash, or "" when the user
// signs in through an external provider.
func (s *Store) GetUserPasswordHash(ctx context.Context, userID uuid.UUID) (string, error) {
	var hash *string
	err := s.Reader().QueryRow(ctx, `
		SELECT password_hash FROM users WHERE id = $1
	`, userID).Scan(&hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	if hash == nil {
		return "", nil
	}
	return *hash, nil
}

// UpdateUserPasswordHash replaces the local password hash.
func (s *Store) UpdateUserPasswordHash(ctx context.Context, userID uuid.UUID, hash string) error {
	_, err := s.Writer().Exec(ctx, `
		UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1
	`, userID, hash)
	return err
}

// RevokeUserSessions deletes every refresh session of a user (used after a
// password reset or change, so old credentials stop working everywhere).
func (s *Store) RevokeUserSessions(ctx context.Context, userID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		DELETE FROM refresh_sessions WHERE user_id = $1
	`, userID)
	return err
}

// GetUserByGoogleID returns the user linked to a Google identity.
func (s *Store) GetUserByGoogleID(ctx context.Context, googleID string) (*auth.User, error) {
	row := s.Reader().QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE google_id = $1`, googleID)
	return scanUser(row)
}

// UpsertGoogleUser creates or updates the user behind a Google identity.
// Google emails are verified, so login = email (same convention as local
// accounts). If a local account already owns that login — registered before
// this provider existed — the Google identity falls back to a suffixed login
// instead of failing the whole OAuth flow.
func (s *Store) UpsertGoogleUser(ctx context.Context, gUser auth.GoogleUser) (*auth.User, error) {
	user, err := s.upsertGoogleUser(ctx, gUser, gUser.Email)
	if err != nil && isUniqueViolation(err) {
		return s.upsertGoogleUser(ctx, gUser, gUser.Email+"-google")
	}
	return user, err
}

func (s *Store) upsertGoogleUser(ctx context.Context, gUser auth.GoogleUser, login string) (*auth.User, error) {
	row := s.Writer().QueryRow(ctx, `
		INSERT INTO users (google_id, login, username, avatar_url, display_name, role, region)
		VALUES ($1, $2, $3, $4, $5, 'user', $6)
		ON CONFLICT (google_id) WHERE google_id IS NOT NULL DO UPDATE SET
			login = EXCLUDED.login,
			avatar_url = EXCLUDED.avatar_url,
			display_name = EXCLUDED.display_name,
			updated_at = NOW()
		RETURNING `+userColumns,
		gUser.Sub, login, gUser.Name, gUser.Picture, gUser.Name, s.appRegion)
	return scanUser(row)
}
