package auth

import (
	"time"

	"github.com/google/uuid"
)

// User represents an authenticated user (sourced from GitHub OAuth).
type User struct {
	ID          uuid.UUID `json:"id"`
	GitHubID    int64     `json:"github_id"`
	Login       string    `json:"login"`
	AvatarURL   string    `json:"avatar_url"`
	DisplayName string    `json:"display_name"`
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
