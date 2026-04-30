package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"devdeck/internal/authservice"
	"devdeck/internal/domain/auth"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

type AuthHandler struct {
	store       *store.Store
	authService *authservice.Service
	config      AuthConfig
}

type AuthConfig struct {
	GitHubClientID     string
	GitHubClientSecret string
	GitHubCallbackURL  string
	AppRedirectURL     string
	AllowedLogins      map[string]bool // empty = allow all
}

func NewAuthHandler(s *store.Store, as *authservice.Service, cfg AuthConfig) *AuthHandler {
	return &AuthHandler{store: s, authService: as, config: cfg}
}

// GET /api/auth/github/login
// Redirects the user to GitHub's OAuth consent page.
func (h *AuthHandler) GitHubLogin(w http.ResponseWriter, r *http.Request) {
	// Generate a random state for CSRF protection.
	state := uuid.New().String()
	// In production, store state in a short-lived cookie.
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300, // 5 minutes
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	url := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&state=%s&scope=read:user",
		h.config.GitHubClientID, h.config.GitHubCallbackURL, state,
	)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// GET /api/auth/github/callback
// Handles the OAuth callback from GitHub.
func (h *AuthHandler) GitHubCallback(w http.ResponseWriter, r *http.Request) {
	// Validate state.
	state := r.URL.Query().Get("state")
	cookie, err := r.Cookie("oauth_state")
	if err != nil || cookie.Value != state {
		writeError(w, http.StatusBadRequest, "INVALID_STATE", "oauth state mismatch")
		return
	}
	// Clear the state cookie.
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", MaxAge: -1})

	code := r.URL.Query().Get("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "MISSING_CODE", "missing authorization code")
		return
	}

	// Exchange code for access token.
	ghToken, err := h.exchangeGitHubCode(r, code)
	if err != nil {
		writeError(w, http.StatusBadGateway, "GITHUB_ERROR", "failed to exchange code: "+err.Error())
		return
	}

	// Fetch GitHub user profile.
	ghUser, err := h.fetchGitHubUser(r, ghToken)
	if err != nil {
		writeError(w, http.StatusBadGateway, "GITHUB_ERROR", "failed to fetch github user: "+err.Error())
		return
	}

	// Check allowlist.
	if len(h.config.AllowedLogins) > 0 && !h.config.AllowedLogins[ghUser.Login] {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "user not in allowlist")
		return
	}

	// Upsert user in DB.
	user, err := h.store.UpsertUser(r.Context(), *ghUser)
	if err != nil {
		writeInternal(w, err)
		return
	}

	// Generate token pair.
	pair, err := h.generateTokenPair(r, *user)
	if err != nil {
		writeInternal(w, err)
		return
	}

	// Redirect to the frontend with tokens in URL fragment.
	// The frontend reads the fragment and stores the tokens.
	redirectTo := fmt.Sprintf("%s#access_token=%s&refresh_token=%s&expires_in=%d",
		h.config.AppRedirectURL, pair.AccessToken, pair.RefreshToken, pair.ExpiresIn)
	http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
}

// POST /api/auth/refresh
// Body: { "refresh_token": "..." }
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if body.RefreshToken == "" {
		writeError(w, http.StatusBadRequest, "MISSING_TOKEN", "refresh_token is required")
		return
	}

	tokenHash := h.authService.HashRefreshToken(body.RefreshToken)
	userID, err := h.store.GetRefreshSession(r.Context(), tokenHash)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "refresh token not found or expired")
			return
		}
		writeInternal(w, err)
		return
	}

	user, err := h.store.GetUserByID(r.Context(), *userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	pair, err := h.generateTokenPair(r, *user)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, pair)
}

// POST /api/auth/logout
// Body: { "refresh_token": "..." }
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if body.RefreshToken != "" {
		tokenHash := h.authService.HashRefreshToken(body.RefreshToken)
		_, err := h.store.GetRefreshSession(r.Context(), tokenHash) // deletes via RETURNING
		_ = err
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/auth/me
// Returns the current user's profile (requires JWT auth).
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDCtxKey).(uuid.UUID)
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "not authenticated")
		return
	}
	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "USER_NOT_FOUND", "user not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// ───── helpers ─────

type contextKey string

const userIDCtxKey contextKey = "user_id"

// UserIDCtxKey returns the context key used to store the authenticated user ID.
func UserIDCtxKey() contextKey {
	return userIDCtxKey
}

func (h *AuthHandler) generateTokenPair(r *http.Request, user auth.User) (*auth.TokenPair, error) {
	accessToken, expiresIn, err := h.authService.GenerateAccessToken(user)
	if err != nil {
		return nil, err
	}

	rawRefresh, hashedRefresh, err := h.authService.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	expiresAt := h.authService.RefreshExpiry()
	if err := h.store.CreateRefreshSession(r.Context(), user.ID, hashedRefresh, expiresAt); err != nil {
		return nil, err
	}

	return &auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		ExpiresIn:    expiresIn,
	}, nil
}

func (h *AuthHandler) exchangeGitHubCode(r *http.Request, code string) (string, error) {
	body := fmt.Sprintf(
		`{"client_id":"%s","client_secret":"%s","code":"%s"}`,
		h.config.GitHubClientID, h.config.GitHubClientSecret, code,
	)
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		"https://github.com/login/oauth/access_token", strings.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Error != "" {
		return "", fmt.Errorf("github oauth: %s", result.Error)
	}
	return result.AccessToken, nil
}

func (h *AuthHandler) fetchGitHubUser(r *http.Request, token string) (*auth.GitHubUser, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet,
		"https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "DevDeck/0.1")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var ghUser auth.GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&ghUser); err != nil {
		return nil, err
	}
	return &ghUser, nil
}
