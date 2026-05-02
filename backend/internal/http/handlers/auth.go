package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"devdeck/internal/authctx"
	"devdeck/internal/authservice"
	"devdeck/internal/domain/auth"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
)

type AuthHandler struct {
	store       *store.Store
	authService *authservice.Service
	config      AuthConfig
}

type AuthConfig struct {
	GitHubClientID          string
	GitHubClientSecret      string
	GitHubOAuthCallbackURL  string
	GoogleClientID          string
	GoogleClientSecret      string
	GoogleOAuthCallbackURL  string
	AppleClientID           string
	AppleTeamID             string
	AppleKeyID              string
	ApplePrivateKey         string
	AppleOAuthCallbackURL   string
	WebOAuthRedirectURL     string
	DesktopOAuthRedirectURL string
}

func NewAuthHandler(s *store.Store, as *authservice.Service, cfg AuthConfig) *AuthHandler {
	return &AuthHandler{store: s, authService: as, config: cfg}
}

// GET /api/auth/providers
func (h *AuthHandler) Providers(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"providers": h.enabledProviders(),
	})
}

// GET /api/auth/{provider}/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	provider, ok := parseAuthProvider(chi.URLParam(r, "provider"))
	if !ok || !h.providerEnabled(provider) {
		writeError(w, http.StatusNotFound, "PROVIDER_NOT_FOUND", "provider not enabled")
		return
	}

	device := normalizeAuthDevice(r.URL.Query().Get("device"))
	state := auth.OAuthState{
		State:       randomState(),
		Provider:    provider,
		RedirectURI: h.redirectURIForDevice(device),
		Device:      device,
		ExpiresAt:   time.Now().Add(10 * time.Minute),
	}
	if err := h.store.SaveOAuthState(r.Context(), state); err != nil {
		writeInternal(w, err)
		return
	}

	authURL, err := h.buildAuthURL(provider, state)
	if err != nil {
		writeInternal(w, err)
		return
	}
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// GET|POST /api/auth/{provider}/callback
func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	provider, ok := parseAuthProvider(chi.URLParam(r, "provider"))
	if !ok || !h.providerEnabled(provider) {
		writeError(w, http.StatusNotFound, "PROVIDER_NOT_FOUND", "provider not enabled")
		return
	}
	if err := r.ParseForm(); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_CALLBACK", "invalid callback payload")
		return
	}
	if providerErr := r.FormValue("error"); providerErr != "" {
		writeError(w, http.StatusBadGateway, "OAUTH_DENIED", providerErr)
		return
	}

	stateValue := r.FormValue("state")
	if stateValue == "" {
		writeError(w, http.StatusBadRequest, "INVALID_STATE", "missing oauth state")
		return
	}
	oauthState, err := h.store.ConsumeOAuthState(r.Context(), stateValue)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusBadRequest, "INVALID_STATE", "oauth state mismatch or expired")
			return
		}
		writeInternal(w, err)
		return
	}
	if oauthState.Provider != provider {
		h.redirectWithError(w, r, oauthState.RedirectURI, "INVALID_STATE", "oauth provider mismatch")
		return
	}

	code := r.FormValue("code")
	if code == "" {
		h.redirectWithError(w, r, oauthState.RedirectURI, "MISSING_CODE", "missing authorization code")
		return
	}

	identity, err := h.fetchExternalIdentity(r, provider, code)
	if err != nil {
		h.redirectWithError(w, r, oauthState.RedirectURI, "OAUTH_ERROR", err.Error())
		return
	}
	user, err := h.store.EnsureUserForIdentity(r.Context(), *identity)
	if err != nil {
		h.redirectWithError(w, r, oauthState.RedirectURI, "AUTH_PERSIST_FAILED", err.Error())
		return
	}
	pair, err := h.generateTokenPair(r, *user)
	if err != nil {
		h.redirectWithError(w, r, oauthState.RedirectURI, "TOKEN_ISSUE_FAILED", err.Error())
		return
	}

	redirectTo, err := appendTokenPair(oauthState.RedirectURI, pair)
	if err != nil {
		writeInternal(w, err)
		return
	}
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
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
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

func (h *AuthHandler) enabledProviders() []auth.ProviderInfo {
	out := make([]auth.ProviderInfo, 0, 3)
	for _, provider := range []auth.Provider{auth.ProviderGitHub, auth.ProviderGoogle, auth.ProviderApple} {
		if !h.providerEnabled(provider) {
			continue
		}
		out = append(out, auth.ProviderInfo{
			Provider: provider,
			Label:    providerLabel(provider),
		})
	}
	return out
}

func (h *AuthHandler) providerEnabled(provider auth.Provider) bool {
	switch provider {
	case auth.ProviderGitHub:
		return strings.TrimSpace(h.config.GitHubClientID) != "" && strings.TrimSpace(h.config.GitHubClientSecret) != ""
	case auth.ProviderGoogle:
		return strings.TrimSpace(h.config.GoogleClientID) != "" && strings.TrimSpace(h.config.GoogleClientSecret) != ""
	case auth.ProviderApple:
		return strings.TrimSpace(h.config.AppleClientID) != "" &&
			strings.TrimSpace(h.config.AppleTeamID) != "" &&
			strings.TrimSpace(h.config.AppleKeyID) != "" &&
			strings.TrimSpace(h.config.ApplePrivateKey) != ""
	default:
		return false
	}
}

func (h *AuthHandler) redirectURIForDevice(device string) string {
	if device == "desktop" {
		return h.config.DesktopOAuthRedirectURL
	}
	return h.config.WebOAuthRedirectURL
}

func normalizeAuthDevice(device string) string {
	if strings.EqualFold(strings.TrimSpace(device), "desktop") {
		return "desktop"
	}
	return "web"
}

func parseAuthProvider(raw string) (auth.Provider, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "github":
		return auth.ProviderGitHub, true
	case "google":
		return auth.ProviderGoogle, true
	case "apple":
		return auth.ProviderApple, true
	default:
		return "", false
	}
}

func providerLabel(provider auth.Provider) string {
	switch provider {
	case auth.ProviderGitHub:
		return "GitHub"
	case auth.ProviderGoogle:
		return "Google"
	case auth.ProviderApple:
		return "Apple"
	default:
		return string(provider)
	}
}

func randomState() string {
	return fmt.Sprintf("%d-%s", time.Now().UnixNano(), strings.ReplaceAll(time.Now().UTC().Format(time.RFC3339Nano), ":", ""))
}

func appendTokenPair(redirectURI string, pair *auth.TokenPair) (string, error) {
	parsed, err := url.Parse(redirectURI)
	if err != nil {
		return "", err
	}
	q := parsed.Query()
	q.Set("token", pair.AccessToken)
	q.Set("refresh_token", pair.RefreshToken)
	q.Set("expires_in", strconv.FormatInt(pair.ExpiresIn, 10))
	parsed.RawQuery = q.Encode()
	return parsed.String(), nil
}

func (h *AuthHandler) redirectWithError(w http.ResponseWriter, r *http.Request, redirectURI, code, message string) {
	parsed, err := url.Parse(redirectURI)
	if err != nil {
		writeError(w, http.StatusBadGateway, code, message)
		return
	}
	q := parsed.Query()
	q.Set("error", code)
	q.Set("error_description", message)
	parsed.RawQuery = q.Encode()
	http.Redirect(w, r, parsed.String(), http.StatusTemporaryRedirect)
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
