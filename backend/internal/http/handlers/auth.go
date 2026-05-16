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

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
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
	WebOAuthRedirectURL     string
	DesktopOAuthRedirectURL string
	RequireInvite           bool
}

func NewAuthHandler(s *store.Store, as *authservice.Service, cfg AuthConfig) *AuthHandler {
	return &AuthHandler{store: s, authService: as, config: cfg}
}

// GET /api/auth/providers
func (h *AuthHandler) Providers(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"providers": []map[string]string{
			{"provider": "github", "label": "GitHub"},
		},
	})
}

// GET /api/auth/github/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	inviteCode := r.URL.Query().Get("invite_code")
	device := normalizeAuthDevice(r.URL.Query().Get("device"))
	state := randomState()

	// Store state, device and invite in a secure cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state + "|" + device + "|" + inviteCode,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&state=%s&scope=user:email",
		h.config.GitHubClientID,
		url.QueryEscape(h.config.GitHubOAuthCallbackURL),
		state,
	)

	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// GET /api/auth/github/callback
func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("oauth_state")
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STATE", "missing oauth cookie")
		return
	}

	parts := strings.Split(cookie.Value, "|")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "INVALID_STATE", "malformed oauth cookie")
		return
	}
	storedState, device := parts[0], parts[1]
	inviteCode := ""
	if len(parts) > 2 {
		inviteCode = parts[2]
	}

	if r.FormValue("state") != storedState {
		writeError(w, http.StatusBadRequest, "INVALID_STATE", "state mismatch")
		return
	}

	// Clear the cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "oauth_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	code := r.FormValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "MISSING_CODE", "missing code")
		return
	}

	ghUser, err := h.fetchGitHubUser(code)
	if err != nil {
		writeError(w, http.StatusBadGateway, "OAUTH_ERROR", err.Error())
		return
	}

	// Invite check for new users
	var inviteID uuid.UUID
	if h.config.RequireInvite {
		// Check if user already exists
		_, err := h.store.GetUserByGitHubID(r.Context(), ghUser.ID)
		if errors.Is(err, store.ErrNotFound) {
			if inviteCode == "" {
				http.Redirect(w, r, h.config.WebOAuthRedirectURL+"?error=INVITE_REQUIRED", http.StatusTemporaryRedirect)
				return
			}
			id, err := h.store.ValidateInviteCode(r.Context(), inviteCode)
			if err != nil {
				http.Redirect(w, r, h.config.WebOAuthRedirectURL+"?error=INVALID_INVITE", http.StatusTemporaryRedirect)
				return
			}
			inviteID = id
		}
	}

	user, err := h.store.UpsertUser(r.Context(), *ghUser)
	if err != nil {
		writeInternal(w, err)
		return
	}

	// Consume invite if needed
	if inviteID != uuid.Nil {
		tx, _ := h.store.Pool().Begin(r.Context())
		if tx != nil {
			_ = h.store.UseInviteCode(r.Context(), tx, inviteID, user.ID)
			_ = tx.Commit(r.Context())
		}
	}

	pair, err := h.generateTokenPair(r, *user)
	if err != nil {
		writeInternal(w, err)
		return
	}

	redirectBase := h.config.WebOAuthRedirectURL
	if device == "desktop" {
		redirectBase = h.config.DesktopOAuthRedirectURL
	}

	redirectTo, _ := appendTokenPair(redirectBase, pair)
	http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
}

func (h *AuthHandler) fetchGitHubUser(code string) (*auth.GitHubUser, error) {
	// 1. Exchange code for token
	data := url.Values{}
	data.Set("client_id", h.config.GitHubClientID)
	data.Set("client_secret", h.config.GitHubClientSecret)
	data.Set("code", code)

	req, _ := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}
	if tokenResp.Error != "" {
		return nil, errors.New(tokenResp.Error)
	}

	// 2. Fetch user profile
	req, _ = http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	resp, err = http.DefaultClient.Do(req)
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

// POST /api/auth/refresh
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	tokenHash := h.authService.HashRefreshToken(body.RefreshToken)
	userID, err := h.store.GetRefreshSession(r.Context(), tokenHash)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "expired or invalid session")
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
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.RefreshToken != "" {
		tokenHash := h.authService.HashRefreshToken(body.RefreshToken)
		_, _ = h.store.GetRefreshSession(r.Context(), tokenHash)
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email      string `json:"email"`
		Password   string `json:"password"`
		InviteCode string `json:"invite_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if body.Email == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "email and password are required")
		return
	}

	var inviteID uuid.UUID
	if h.config.RequireInvite {
		if body.InviteCode == "" {
			writeError(w, http.StatusForbidden, "INVITE_REQUIRED", "an invite code is required to register")
			return
		}
		id, err := h.store.ValidateInviteCode(r.Context(), body.InviteCode)
		if err != nil {
			writeError(w, http.StatusForbidden, "INVALID_INVITE", "the invite code is invalid or has already been used")
			return
		}
		inviteID = id
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		writeInternal(w, err)
		return
	}

	// We use a transaction to ensure user creation and invite consumption are atomic
	tx, err := h.store.Pool().Begin(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	defer tx.Rollback(r.Context())

	user, err := h.store.CreateUserLocalTx(r.Context(), tx, body.Email, string(hash))
	if err != nil {
		if errors.Is(err, store.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "USER_EXISTS", "user already exists")
			return
		}
		writeInternal(w, err)
		return
	}

	if inviteID != uuid.Nil {
		if err := h.store.UseInviteCode(r.Context(), tx, inviteID, user.ID); err != nil {
			// This shouldn't really happen if ValidateInviteCode was ok, unless race condition
			writeError(w, http.StatusForbidden, "INVITE_ERROR", err.Error())
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"message": "user created", "id": user.ID})
}

// POST /api/auth/login
func (h *AuthHandler) LoginLocal(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	user, hash, err := h.store.GetUserByLogin(r.Context(), body.Email)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
			return
		}
		writeInternal(w, err)
		return
	}

	if hash == "" {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "user has no password set (try GitHub login)")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
		return
	}

	pair, err := h.generateTokenPair(r, *user)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, pair)
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
		writeError(w, http.StatusNotFound, "USER_NOT_FOUND", "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// PATCH /api/auth/me
func (h *AuthHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "not authenticated")
		return
	}

	var req struct {
		Bio      *string `json:"bio"`
		Username *string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	user, err := h.store.UpdateUser(r.Context(), userID, req.Bio, req.Username)
	if err != nil {
		if errors.Is(err, store.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "USERNAME_TAKEN", "username already taken")
			return
		}
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, user)
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
	if err := h.store.CreateRefreshSession(r.Context(), user.ID, hashedRefresh, h.authService.RefreshExpiry()); err != nil {
		return nil, err
	}
	return &auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		ExpiresIn:    expiresIn,
	}, nil
}

func normalizeAuthDevice(device string) string {
	if strings.ToLower(device) == "desktop" {
		return "desktop"
	}
	return "web"
}

func randomState() string {
	return strconv.FormatInt(time.Now().UnixNano(), 36)
}

func appendTokenPair(redirectURI string, pair *auth.TokenPair) (string, error) {
	parsed, _ := url.Parse(redirectURI)
	q := parsed.Query()
	q.Set("token", pair.AccessToken)
	q.Set("refresh_token", pair.RefreshToken)
	q.Set("expires_in", strconv.FormatInt(pair.ExpiresIn, 10))
	parsed.RawQuery = q.Encode()
	return parsed.String(), nil
}
