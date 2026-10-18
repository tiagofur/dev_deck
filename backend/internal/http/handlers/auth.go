package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"heapdeck/internal/authctx"
	"heapdeck/internal/authservice"
	"heapdeck/internal/domain/auth"
	"heapdeck/internal/email"
	"heapdeck/internal/store"

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

	// ADR 0004: HttpOnly cookie refresh tokens (web).
	AuthCookieMode   bool     // gates all cookie behavior; false → legacy body/Bearer
	AuthCookieSecure bool     // Secure attribute on the refresh cookie (off for http dev)
	AllowedOrigins   []string // CORS origin allowlist, used for the refresh Origin check

	// Transactional email for flows like password reset (NoopSender in tests).
	EmailSender email.Sender
	// FrontendURL is the base URL used to build password reset links.
	FrontendURL string
}

// refreshCookieName is the HttpOnly cookie that carries the refresh token in
// cookie mode. Scoped to /api/auth so it is only sent to the auth endpoints.
const refreshCookieName = "heapdeck_refresh"

// refreshCookiePath scopes the cookie to the auth subtree.
const refreshCookiePath = "/api/auth"

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
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	code := r.FormValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "MISSING_CODE", "missing code")
		return
	}

	// Exchange code for access token.
	ghToken, err := h.authService.ExchangeGitHubCode(r.Context(), h.config.GitHubClientID, h.config.GitHubClientSecret, code)
	if err != nil {
		writeError(w, http.StatusBadGateway, "GITHUB_ERROR", "failed to exchange code: "+err.Error())
		return
	}

	// Fetch GitHub user profile.
	ghUser, err := h.authService.FetchGitHubUser(r.Context(), ghToken)
	if err != nil {
		writeError(w, http.StatusBadGateway, "GITHUB_ERROR", "failed to fetch github user: "+err.Error())
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

	// ADR 0004: in cookie mode, set the refresh token as an HttpOnly cookie on
	// this top-level navigation (SameSite=Lax permits it) and keep the refresh
	// token OUT of the redirect URL so it never lands in browser history. The
	// desktop redirect (custom scheme) is unaffected — desktop still gets the
	// full pair in the URL. Cookie mode is requested only by the web client.
	if h.config.AuthCookieMode && device != "desktop" {
		h.setRefreshCookie(w, pair.RefreshToken)
		redirectTo, _ := appendAccessTokenOnly(redirectBase, pair)
		http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
		return
	}

	redirectTo, _ := appendTokenPair(redirectBase, pair)
	http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
}

// POST /api/auth/refresh
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	refreshToken := ""

	if h.config.AuthCookieMode {
		// ADR 0004: cookie-authenticated refresh is a CSRF target. SameSite=Lax
		// already blocks cross-site POSTs; additionally verify the Origin/Referer
		// matches an allowed origin.
		if !h.originAllowed(r) {
			writeError(w, http.StatusForbidden, "ORIGIN_NOT_ALLOWED", "request origin is not allowed")
			return
		}
		// Cookie-first: read the refresh token from the HttpOnly cookie.
		if c, err := r.Cookie(refreshCookieName); err == nil {
			refreshToken = c.Value
		}
	}

	// Body fallback (always for flag-off; for cookie mode only when the cookie
	// is absent, so desktop/extension keep working). The body is optional in
	// cookie mode, so an empty/EOF body is not an error there.
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		if !h.config.AuthCookieMode || !errors.Is(err, io.EOF) {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
			return
		}
	}
	if refreshToken == "" {
		refreshToken = body.RefreshToken
	}

	tokenHash := h.authService.HashRefreshToken(refreshToken)
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
	// Rotate the cookie with the freshly-minted refresh token.
	if h.config.AuthCookieMode {
		h.setRefreshCookie(w, pair.RefreshToken)
	}
	writeJSON(w, http.StatusOK, pair)
}

// POST /api/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	refreshToken := body.RefreshToken
	// ADR 0004: in cookie mode, resolve the token from the cookie when the body
	// has none, and clear the cookie regardless.
	if h.config.AuthCookieMode {
		if refreshToken == "" {
			if c, err := r.Cookie(refreshCookieName); err == nil {
				refreshToken = c.Value
			}
		}
		h.clearRefreshCookie(w)
	}

	// When a refresh token is provided, the server-side session MUST be
	// invalidated. GetRefreshSession is delete-on-read by hash, so calling it
	// consumes the single-use session. (Previously the result was discarded but
	// the call already deletes the row; we keep that behavior explicit here.)
	if refreshToken != "" {
		tokenHash := h.authService.HashRefreshToken(refreshToken)
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
	if !emailPattern.MatchString(body.Email) {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "enter a valid email address")
		return
	}
	if err := validatePassword(body.Password); err != nil {
		writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", err.Error())
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

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), passwordHashCost)
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
	defer func() { _ = tx.Rollback(r.Context()) }()

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
		// Equalize timing with the wrong-password path and give no hint
		// about whether the account exists or signs in via GitHub.
		_ = bcrypt.CompareHashAndPassword([]byte(dummyBcryptHash), []byte(body.Password))
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
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
	// ADR 0004: in cookie mode also set the refresh token as an HttpOnly cookie.
	// The body still carries the full pair (additive) so desktop/extension and
	// the flag-off path are unchanged.
	if h.config.AuthCookieMode {
		h.setRefreshCookie(w, pair.RefreshToken)
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
		Bio       *string  `json:"bio"`
		Username  *string  `json:"username"`
		StackTags []string `json:"stack_tags"`
		Website   *string  `json:"website"`
		Location  *string  `json:"location"`
		GitHubURL *string  `json:"github_url"`
		AvatarURL *string  `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	user, err := h.store.UpdateUser(r.Context(), userID, req.Bio, req.Username, req.StackTags, req.Website, req.Location, req.GitHubURL, req.AvatarURL)
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

// POST /api/auth/me/avatar
func (h *AuthHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "not authenticated")
		return
	}

	// Limit request size to 5MB
	r.Body = http.MaxBytesReader(w, r.Body, 5*1024*1024)
	// #nosec G120 -- request body is already bounded by MaxBytesReader above.
	if err := r.ParseMultipartForm(5 * 1024 * 1024); err != nil {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "file is too large (max 5MB)")
		return
	}

	file, _, err := r.FormFile("avatar")
	if err != nil {
		writeError(w, http.StatusBadRequest, "MISSING_FILE", "missing avatar file field")
		return
	}
	defer func() { _ = file.Close() }()

	// Read first 512 bytes to validate content type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && n == 0 {
		writeError(w, http.StatusBadRequest, "INVALID_FILE", "cannot read file")
		return
	}
	contentType := http.DetectContentType(buffer[:n])
	if !strings.HasPrefix(contentType, "image/") {
		writeError(w, http.StatusBadRequest, "INVALID_FORMAT", "file is not a valid image")
		return
	}

	// Reset file pointer
	if _, err := file.Seek(0, 0); err != nil {
		writeInternal(w, err)
		return
	}

	// Ensure uploads directory exists
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, 0750); err != nil {
		writeInternal(w, err)
		return
	}

	// Generate filename using userID and timestamp
	filename := fmt.Sprintf("%s-%d.png", userID, time.Now().Unix())
	filepath := filepath.Join(uploadsDir, filename)

	// #nosec G304 -- filepath is built from a server-generated UUID and timestamp under a fixed uploads dir; not user-controlled.
	out, err := os.Create(filepath)
	if err != nil {
		writeInternal(w, err)
		return
	}
	defer func() { _ = out.Close() }()

	if _, err = io.Copy(out, file); err != nil {
		writeInternal(w, err)
		return
	}

	// Update database
	avatarURL := "/uploads/" + filename
	_, err = h.store.UpdateUser(r.Context(), userID, nil, nil, nil, nil, nil, nil, &avatarURL)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"avatar_url": avatarURL})
}

// PATCH /api/auth/me/onboarding/complete
func (h *AuthHandler) CompleteOnboarding(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "not authenticated")
		return
	}

	if err := h.store.CompleteOnboarding(r.Context(), userID); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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

// randomState returns 32 bytes of CSPRNG entropy, base64url-encoded, for the
// OAuth anti-CSRF state parameter. A timestamp (the previous implementation)
// is predictable and enabled login CSRF.
func randomState() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand failing means we cannot build a safe OAuth flow.
		panic("crypto/rand unavailable: " + err.Error())
	}
	return base64.RawURLEncoding.EncodeToString(buf)
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

// appendAccessTokenOnly is the cookie-mode variant of appendTokenPair: it adds
// only the access token + expiry to the redirect URL and OMITS the refresh
// token (which is delivered via the HttpOnly cookie, never in browser history).
func appendAccessTokenOnly(redirectURI string, pair *auth.TokenPair) (string, error) {
	parsed, _ := url.Parse(redirectURI)
	q := parsed.Query()
	q.Set("token", pair.AccessToken)
	q.Set("expires_in", strconv.FormatInt(pair.ExpiresIn, 10))
	parsed.RawQuery = q.Encode()
	return parsed.String(), nil
}

// setRefreshCookie writes the refresh token as an HttpOnly cookie scoped to the
// auth path. MaxAge mirrors the refresh-token TTL so the cookie and the
// server-side session expire together.
func (h *AuthHandler) setRefreshCookie(w http.ResponseWriter, token string) {
	maxAge := int(time.Until(h.authService.RefreshExpiry()).Seconds())
	if maxAge < 1 {
		maxAge = 1
	}
	// #nosec G124 -- Secure attribute is configured dynamically based on environment (disabled in local dev, enabled in prod).
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     refreshCookiePath,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   h.config.AuthCookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

// clearRefreshCookie expires the refresh cookie using the same attributes so
// the browser drops it.
func (h *AuthHandler) clearRefreshCookie(w http.ResponseWriter) {
	// #nosec G124 -- Secure attribute is configured dynamically based on environment (disabled in local dev, enabled in prod).
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     refreshCookiePath,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.config.AuthCookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

// originAllowed checks the request Origin (falling back to Referer) against the
// configured CORS allowlist. Used as a lightweight CSRF defense on the
// cookie-authenticated refresh endpoint. An empty allowlist allows all (the
// caller only invokes this in cookie mode, where an allowlist is expected).
func (h *AuthHandler) originAllowed(r *http.Request) bool {
	if len(h.config.AllowedOrigins) == 0 {
		return true
	}
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		// Fall back to Referer's origin (scheme://host[:port]).
		if ref := r.Header.Get("Referer"); ref != "" {
			if u, err := url.Parse(ref); err == nil && u.Scheme != "" && u.Host != "" {
				origin = u.Scheme + "://" + u.Host
			}
		}
	}
	if origin == "" {
		return false
	}
	for _, allowed := range h.config.AllowedOrigins {
		if strings.EqualFold(strings.TrimSpace(allowed), origin) {
			return true
		}
	}
	return false
}

// Password policy shared by register, reset and change.
const (
	passwordHashCost  = 12
	minPasswordLength = 10
)

func validatePassword(password string) error {
	if len(password) < minPasswordLength {
		return fmt.Errorf("password must be at least %d characters", minPasswordLength)
	}
	return nil
}

// emailPattern keeps registrations to plausible addresses; it also prevents
// arbitrary logins that would collide with GitHub handles in UpsertUser.
var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// dummyBcryptHash is a bcrypt digest used to equalize response timing when
// the account does not exist or has no local password, so request latency
// cannot reveal account existence. Computed once at startup from a public
// constant string — it is a timing pad, not a credential.
var dummyBcryptHash = bcryptDigest("heapdeck-timing-pad")

func bcryptDigest(plain string) string {
	digest, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		// bcrypt over a fixed in-memory string cannot fail.
		panic("bcrypt digest failed: " + err.Error())
	}
	return string(digest)
}

const resetEmailBodyHTML = `<!doctype html>
<html>
  <body style="font-family: sans-serif">
    <h2>Reset your HeapDeck password</h2>
    <p>Use the link below to choose a new password. It expires in 1 hour and can be used only once.</p>
    <p><a href="%s">Choose a new password</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  </body>
</html>`

// POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	// Identical response whether or not the account exists: no enumeration.
	const genericMessage = "if that email has an account, a password reset link has been sent"
	if body.Email == "" || !emailPattern.MatchString(body.Email) {
		writeJSON(w, http.StatusOK, map[string]string{"message": genericMessage})
		return
	}

	user, hash, err := h.store.GetUserByLogin(r.Context(), body.Email)
	if err == nil && hash != "" && h.config.EmailSender != nil {
		raw := make([]byte, 32)
		if _, err := rand.Read(raw); err == nil {
			token := base64.RawURLEncoding.EncodeToString(raw)
			sum := sha256.Sum256([]byte(token))
			if err := h.store.CreatePasswordResetToken(r.Context(), user.ID, hex.EncodeToString(sum[:]), time.Now().Add(time.Hour)); err == nil {
				link := strings.TrimRight(h.config.FrontendURL, "/") + "/reset-password?token=" + token
				htmlBody := fmt.Sprintf(resetEmailBodyHTML, html.EscapeString(link))
				if serr := h.config.EmailSender.Send(r.Context(), user.Login, "Reset your HeapDeck password", htmlBody); serr != nil {
					slog.Error("forgot-password: failed to send email", "err", serr)
				}
			} else {
				slog.Error("forgot-password: failed to store reset token", "err", err)
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": genericMessage})
}

// POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if body.Token == "" {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "token is required")
		return
	}
	if err := validatePassword(body.NewPassword); err != nil {
		writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", err.Error())
		return
	}

	sum := sha256.Sum256([]byte(body.Token))
	userID, err := h.store.ConsumePasswordResetToken(r.Context(), hex.EncodeToString(sum[:]))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_TOKEN", "this reset link is invalid or has expired")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), passwordHashCost)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if err := h.store.UpdateUserPasswordHash(r.Context(), userID, string(hash)); err != nil {
		writeInternal(w, err)
		return
	}
	// A reset invalidates every refresh session: whoever holds old
	// credentials (or an old bearer) starts from zero.
	if err := h.store.RevokeUserSessions(r.Context(), userID); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated; sign in with your new password"})
}

// POST /api/auth/change-password
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if err := validatePassword(body.NewPassword); err != nil {
		writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", err.Error())
		return
	}

	currentHash, err := h.store.GetUserPasswordHash(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if currentHash == "" {
		writeError(w, http.StatusBadRequest, "NO_PASSWORD", "this account signs in with an external provider")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(body.CurrentPassword)) != nil {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "current password is incorrect")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), passwordHashCost)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if err := h.store.UpdateUserPasswordHash(r.Context(), userID, string(hash)); err != nil {
		writeInternal(w, err)
		return
	}
	if err := h.store.RevokeUserSessions(r.Context(), userID); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated"})
}
