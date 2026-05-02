package store

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"devdeck/internal/domain/auth"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const userColumns = `id, primary_email, email_verified, password_hash, login, avatar_url, display_name, created_at, last_login_at`

func scanUser(row pgx.Row) (*auth.User, error) {
	var u auth.User
	var email *string
	var login *string
	var avatar *string
	var displayName *string
	err := row.Scan(
		&u.ID,
		&email,
		&u.EmailVerified,
		&u.PasswordHash,
		&login,
		&avatar,
		&displayName,
		&u.CreatedAt,
		&u.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	u.PrimaryEmail = email
	if login != nil {
		u.Login = *login
	}
	if avatar != nil {
		u.AvatarURL = *avatar
	}
	if displayName != nil {
		u.DisplayName = *displayName
	}
	return &u, nil
}

func (s *Store) GetUserByGitHubID(ctx context.Context, githubID int64) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM users u
		JOIN auth_identities ai ON ai.user_id = u.id
		WHERE ai.provider = 'github' AND ai.provider_user_id = $1
	`, auth.GitHubUser{ID: githubID}.AsExternalIdentity(false).ProviderUserID)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (s *Store) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM users
		WHERE id = $1
	`, id)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (s *Store) UpsertUser(ctx context.Context, ghUser auth.GitHubUser) (*auth.User, error) {
	identity := ghUser.AsExternalIdentity(strings.TrimSpace(ghUser.Email) != "")
	return s.EnsureUserForIdentity(ctx, identity)
}

func (s *Store) EnsureUserForIdentity(ctx context.Context, identity auth.ExternalIdentity) (*auth.User, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	user, err := getUserByIdentityTx(ctx, tx, identity.Provider, identity.ProviderUserID)
	switch {
	case err == nil:
		// already linked
	case errors.Is(err, ErrNotFound):
		if identity.EmailVerified && identity.Email != nil {
			user, err = getUserByPrimaryEmailTx(ctx, tx, *identity.Email)
		}
		if errors.Is(err, ErrNotFound) || user == nil {
			user, err = createUserFromIdentityTx(ctx, tx, identity)
		}
		if err != nil {
			return nil, err
		}
	default:
		return nil, err
	}

	if err := updateUserFromIdentityTx(ctx, tx, user.ID, identity); err != nil {
		return nil, err
	}
	if err := upsertIdentityTx(ctx, tx, user.ID, identity); err != nil {
		return nil, err
	}

	updated, err := getUserByIDTx(ctx, tx, user.ID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func getUserByIdentityTx(ctx context.Context, tx pgx.Tx, provider auth.Provider, providerUserID string) (*auth.User, error) {
	row := tx.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM users u
		JOIN auth_identities ai ON ai.user_id = u.id
		WHERE ai.provider = $1 AND ai.provider_user_id = $2
	`, string(provider), providerUserID)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func getUserByPrimaryEmailTx(ctx context.Context, tx pgx.Tx, email string) (*auth.User, error) {
	row := tx.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM users
		WHERE lower(primary_email) = lower($1)
	`, email)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func getUserByIDTx(ctx context.Context, tx pgx.Tx, id uuid.UUID) (*auth.User, error) {
	row := tx.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func createUserFromIdentityTx(ctx context.Context, tx pgx.Tx, identity auth.ExternalIdentity) (*auth.User, error) {
	row := tx.QueryRow(ctx, `
		INSERT INTO users (primary_email, email_verified, login, avatar_url, display_name, last_login_at)
		VALUES ($1, $2, NULLIF($3, ''), $4, $5, NOW())
		RETURNING `+userColumns,
		identity.Email,
		identity.EmailVerified,
		strings.TrimSpace(identity.ProviderLogin),
		strings.TrimSpace(identity.AvatarURL),
		chooseDisplayName(identity),
	)
	return scanUser(row)
}

func updateUserFromIdentityTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, identity auth.ExternalIdentity) error {
	_, err := tx.Exec(ctx, `
		UPDATE users
		SET primary_email = CASE
				WHEN $2::text IS NOT NULL AND (primary_email IS NULL OR email_verified = false) THEN $2
				ELSE primary_email
			END,
		    email_verified = CASE WHEN $3 THEN true ELSE email_verified END,
		    login = CASE WHEN NULLIF($4, '') IS NOT NULL THEN $4 ELSE login END,
		    avatar_url = CASE WHEN NULLIF($5, '') IS NOT NULL THEN $5 ELSE avatar_url END,
		    display_name = CASE WHEN NULLIF($6, '') IS NOT NULL THEN $6 ELSE display_name END,
		    last_login_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`, userID,
		identity.Email,
		identity.EmailVerified,
		strings.TrimSpace(identity.ProviderLogin),
		strings.TrimSpace(identity.AvatarURL),
		chooseDisplayName(identity),
	)
	return err
}

func upsertIdentityTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, identity auth.ExternalIdentity) error {
	profileJSON := identity.ProfileJSON
	if len(profileJSON) == 0 {
		profileJSON = json.RawMessage(`{}`)
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO auth_identities (
			user_id, provider, provider_user_id, email, email_verified,
			provider_login, display_name, avatar_url, profile_json, last_login_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
		ON CONFLICT (provider, provider_user_id) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			email = EXCLUDED.email,
			email_verified = EXCLUDED.email_verified,
			provider_login = EXCLUDED.provider_login,
			display_name = EXCLUDED.display_name,
			avatar_url = EXCLUDED.avatar_url,
			profile_json = EXCLUDED.profile_json,
			last_login_at = NOW(),
			updated_at = NOW()
	`, userID,
		string(identity.Provider),
		identity.ProviderUserID,
		identity.Email,
		identity.EmailVerified,
		strings.TrimSpace(identity.ProviderLogin),
		chooseDisplayName(identity),
		strings.TrimSpace(identity.AvatarURL),
		profileJSON,
	)
	return err
}

func chooseDisplayName(identity auth.ExternalIdentity) string {
	if name := strings.TrimSpace(identity.DisplayName); name != "" {
		return name
	}
	if login := strings.TrimSpace(identity.ProviderLogin); login != "" {
		return login
	}
	if identity.Email != nil {
		return strings.TrimSpace(*identity.Email)
	}
	return ""
}

func (s *Store) SaveOAuthState(ctx context.Context, state auth.OAuthState) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO oauth_states (state, provider, redirect_uri, code_verifier, nonce, device, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`, state.State, string(state.Provider), state.RedirectURI, state.CodeVerifier, state.Nonce, state.Device, state.ExpiresAt)
	return err
}

func (s *Store) ConsumeOAuthState(ctx context.Context, rawState string) (*auth.OAuthState, error) {
	row := s.pool.QueryRow(ctx, `
		DELETE FROM oauth_states
		WHERE state = $1 AND expires_at > NOW()
		RETURNING state, provider, redirect_uri, code_verifier, nonce, device, expires_at
	`, rawState)
	var state auth.OAuthState
	var provider string
	err := row.Scan(
		&state.State,
		&provider,
		&state.RedirectURI,
		&state.CodeVerifier,
		&state.Nonce,
		&state.Device,
		&state.ExpiresAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	state.Provider = auth.Provider(provider)
	return &state, nil
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

// ─── Local Auth ───

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM users
		WHERE lower(primary_email) = lower($1)
	`, email)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (s *Store) CreateUserWithPassword(ctx context.Context, email, passwordHash string) (*auth.User, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO users (primary_email, email_verified, password_hash, display_name)
		VALUES ($1, false, $2, $1)
		RETURNING `+userColumns,
		email, passwordHash,
	)
	u, err := scanUser(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrAlreadyExists
		}
		return nil, err
	}
	return u, nil
}

func (s *Store) UpdatePasswordHash(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1
	`, userID, passwordHash)
	return err
}

func (s *Store) SetEmailVerified(ctx context.Context, userID uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Update user
	_, err = tx.Exec(ctx, `UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1`, userID)
	if err != nil {
		return err
	}

	// Create/Link local identity
	row := tx.QueryRow(ctx, `SELECT primary_email FROM users WHERE id = $1`, userID)
	var email string
	if err := row.Scan(&email); err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO auth_identities (user_id, provider, provider_user_id, email, email_verified, display_name)
		VALUES ($1, 'local', $2, $2, true, $2)
		ON CONFLICT (provider, provider_user_id) DO UPDATE SET email_verified = true, updated_at = NOW()
	`, userID, email)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ─── Tokens (Verify/Reset) ───

func (s *Store) CreateEmailVerificationToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

func (s *Store) ConsumeEmailVerificationToken(ctx context.Context, tokenHash string) (*uuid.UUID, error) {
	row := s.pool.QueryRow(ctx, `
		DELETE FROM email_verification_tokens
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

func (s *Store) CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

func (s *Store) ConsumePasswordResetToken(ctx context.Context, tokenHash string) (*uuid.UUID, error) {
	row := s.pool.QueryRow(ctx, `
		DELETE FROM password_reset_tokens
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
