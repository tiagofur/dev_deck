package auth

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/google/uuid"
)

type Provider string

const (
	ProviderGitHub Provider = "github"
	ProviderGoogle Provider = "google"
	ProviderApple  Provider = "apple"
	ProviderLocal  Provider = "local"
)

// User represents an authenticated account in DevDeck.
type User struct {
	ID            uuid.UUID  `json:"id"`
	PrimaryEmail  *string    `json:"primary_email"`
	EmailVerified bool       `json:"email_verified"`
	PasswordHash  *string    `json:"-"`
	Login         string     `json:"login"`
	AvatarURL     string     `json:"avatar_url"`
	DisplayName   string     `json:"display_name"`
	CreatedAt     time.Time  `json:"created_at"`
	LastLoginAt   *time.Time `json:"last_login_at"`
}

// TokenPair is the response body for login/refresh.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // seconds
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ExternalIdentity is the normalized provider profile we persist/link
// regardless of whether it came from GitHub, Google, or Apple.
type ExternalIdentity struct {
	Provider       Provider
	ProviderUserID string
	Email          *string
	EmailVerified  bool
	ProviderLogin  string
	DisplayName    string
	AvatarURL      string
	ProfileJSON    json.RawMessage
}

type OAuthState struct {
	State        string
	Provider     Provider
	RedirectURI  string
	CodeVerifier string
	Nonce        string
	Device       string
	ExpiresAt    time.Time
}

type ProviderInfo struct {
	Provider Provider `json:"provider"`
	Label    string   `json:"label"`
}

// GitHubUser is kept as a compatibility adapter for old tests/helpers.
type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	Name      string `json:"name"`
	Email     string `json:"email"`
}

func (g GitHubUser) AsExternalIdentity(emailVerified bool) ExternalIdentity {
	var email *string
	if g.Email != "" {
		email = &g.Email
	}
	return ExternalIdentity{
		Provider:       ProviderGitHub,
		ProviderUserID: int64ToString(g.ID),
		Email:          email,
		EmailVerified:  emailVerified,
		ProviderLogin:  g.Login,
		DisplayName:    g.Name,
		AvatarURL:      g.AvatarURL,
	}
}

func int64ToString(v int64) string {
	return strconv.FormatInt(v, 10)
}
