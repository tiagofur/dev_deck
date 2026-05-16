package auth

import (
	"time"

	"github.com/google/uuid"
)

// User represents an authenticated user (sourced from GitHub OAuth).
type User struct {
	ID          uuid.UUID `json:"id"`
	GitHubID    *int64    `json:"github_id"`
	Login       string    `json:"login"`
	Username    *string   `json:"username,omitempty"`
	Bio         *string   `json:"bio,omitempty"`
	Plan        string    `json:"plan"`
	AvatarURL   string    `json:"avatar_url"`
	DisplayName string    `json:"display_name"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
}

// TokenPair is the response body for login/refresh.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // seconds
}

// GitHubUser is the subset of the GitHub /user response we need.
type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	Name      string `json:"name"`
}

type Provider string

const (
	ProviderGitHub Provider = "github"
)

type OAuthState struct {
	State        string
	Provider     Provider
	RedirectURI  string
	CodeVerifier string
	Nonce        string
	Device       string
	ExpiresAt    time.Time
}
