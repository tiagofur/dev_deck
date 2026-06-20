package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"devdeck/internal/ai"
	"devdeck/internal/authservice"
	"devdeck/internal/config"
	"devdeck/internal/domain/auth"
	"devdeck/internal/email"
	httpapi "devdeck/internal/http"
	"devdeck/internal/store"
	"devdeck/internal/testutil"

	"golang.org/x/crypto/bcrypt"
)

const (
	cookieTestPassword = "s3cret-password"
	cookieTestOrigin   = "http://localhost:5173"
)

// authTestServer wires a jwt-mode router with a real authservice + Postgres so
// the cookie-mode auth endpoints (login/refresh/logout/callback) are reachable.
// AuthCookieMode is configurable per test to prove the flag gate.
type authTestServer struct {
	router      http.Handler
	store       *store.Store
	authService *authservice.Service
}

func newAuthTestServer(t *testing.T, cookieMode bool) *authTestServer {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)

	// Short-lived access tokens, generous refresh window for the cookie MaxAge.
	as := authservice.New("test-jwt-secret", 15*time.Minute, 24*time.Hour)

	cfg := config.Config{
		Port:              "0",
		AuthMode:          "jwt",
		JWTSecret:         "test-jwt-secret",
		LocalAuthEnabled:  true,
		RateLimitDisabled: true,
		CORSOrigins:       cookieTestOrigin + ",https://app.devdeck.io",
		AuthCookieMode:    cookieMode,
		// Secure off so the test cookie is readable without an https transport;
		// the attribute itself is asserted separately via a dedicated case.
		AuthCookieSecure:        false,
		WebOAuthRedirectURL:     "http://localhost:5173/auth/callback",
		DesktopOAuthRedirectURL: "devdeck://auth/callback",
	}

	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		AuthService: as,
		AI:          ai.NewHeuristic(),
		Embeddings:  ai.NewEmbeddingsService(nil),
		EmailSender: &email.NoopSender{},
	})

	return &authTestServer{router: router, store: st, authService: as}
}

// createLocalUser inserts a user with a bcrypt password so LoginLocal works.
func (ts *authTestServer) createLocalUser(t *testing.T, login string) *auth.User {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(cookieTestPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	u, err := ts.store.CreateUserLocal(context.Background(), login, string(hash))
	if err != nil {
		t.Fatalf("create local user: %v", err)
	}
	return u
}

// post dispatches a JSON POST to the given path with optional headers and
// returns the recorder. A nil body sends no request body.
func (ts *authTestServer) post(t *testing.T, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		rdr = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(http.MethodPost, path, rdr)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	return rec
}

// findCookie returns the named Set-Cookie from a recorder, or nil.
func findCookie(rec *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func decodePair(t *testing.T, rec *httptest.ResponseRecorder) auth.TokenPair {
	t.Helper()
	var p auth.TokenPair
	if err := json.NewDecoder(rec.Body).Decode(&p); err != nil {
		t.Fatalf("decode pair: %v\nbody: %s", err, rec.Body.String())
	}
	return p
}

// ─── Flag OFF: behavior must be byte-identical to the legacy flow ───

func TestCookie_LoginLocal_FlagOff_NoCookie_BodyTokens(t *testing.T) {
	ts := newAuthTestServer(t, false)
	ts.createLocalUser(t, "off-login@example.com")

	rec := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "off-login@example.com",
		"password": cookieTestPassword,
	}, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	if c := findCookie(rec, "devdeck_refresh"); c != nil {
		t.Errorf("flag off must not set the refresh cookie, got %+v", c)
	}
	pair := decodePair(t, rec)
	if pair.AccessToken == "" || pair.RefreshToken == "" || pair.ExpiresIn == 0 {
		t.Errorf("flag off must return full token pair in body, got %+v", pair)
	}
}

func TestCookie_Refresh_FlagOff_BodyOnly_NoOriginCheck(t *testing.T) {
	ts := newAuthTestServer(t, false)
	ts.createLocalUser(t, "off-refresh@example.com")

	login := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "off-refresh@example.com",
		"password": cookieTestPassword,
	}, nil)
	pair := decodePair(t, login)

	// No Origin header, body-supplied token: must still succeed (no origin check
	// when the flag is off).
	rec := ts.post(t, "/api/auth/refresh", map[string]string{
		"refresh_token": pair.RefreshToken,
	}, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	if c := findCookie(rec, "devdeck_refresh"); c != nil {
		t.Errorf("flag off refresh must not set a cookie, got %+v", c)
	}
	got := decodePair(t, rec)
	if got.RefreshToken == "" {
		t.Errorf("flag off refresh must return refresh token in body")
	}
}

func TestCookie_Logout_FlagOff_NoCookieCleared(t *testing.T) {
	ts := newAuthTestServer(t, false)
	ts.createLocalUser(t, "off-logout@example.com")

	login := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "off-logout@example.com",
		"password": cookieTestPassword,
	}, nil)
	pair := decodePair(t, login)

	rec := ts.post(t, "/api/auth/logout", map[string]string{
		"refresh_token": pair.RefreshToken,
	}, nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
	if c := findCookie(rec, "devdeck_refresh"); c != nil {
		t.Errorf("flag off logout must not emit a Set-Cookie, got %+v", c)
	}
}

// ─── Flag ON ───

func TestCookie_LoginLocal_FlagOn_SetsCookieAndBody(t *testing.T) {
	ts := newAuthTestServer(t, true)
	ts.createLocalUser(t, "on-login@example.com")

	rec := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "on-login@example.com",
		"password": cookieTestPassword,
	}, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}

	c := findCookie(rec, "devdeck_refresh")
	if c == nil {
		t.Fatal("flag on login must set devdeck_refresh cookie")
	}
	if !c.HttpOnly {
		t.Errorf("cookie must be HttpOnly")
	}
	if c.SameSite != http.SameSiteLaxMode {
		t.Errorf("cookie SameSite must be Lax, got %v", c.SameSite)
	}
	if c.Path != "/api/auth" {
		t.Errorf("cookie Path must be /api/auth, got %q", c.Path)
	}
	if c.MaxAge <= 0 {
		t.Errorf("cookie MaxAge must be positive, got %d", c.MaxAge)
	}

	// Body still carries the pair (additive — desktop/extension depend on it).
	pair := decodePair(t, rec)
	if pair.AccessToken == "" || pair.RefreshToken == "" || pair.ExpiresIn == 0 {
		t.Errorf("flag on login must still return full token pair in body, got %+v", pair)
	}
	if c.Value != pair.RefreshToken {
		t.Errorf("cookie value must equal body refresh token")
	}
}

func TestCookie_LoginLocal_FlagOn_SecureAttribute(t *testing.T) {
	// Dedicated server with Secure on to assert the attribute is wired.
	pool := testutil.SetupPostgres(t)
	st := store.New(pool)
	as := authservice.New("test-jwt-secret", 15*time.Minute, 24*time.Hour)
	cfg := config.Config{
		Port: "0", AuthMode: "jwt", JWTSecret: "test-jwt-secret",
		LocalAuthEnabled: true, RateLimitDisabled: true,
		CORSOrigins:      cookieTestOrigin,
		AuthCookieMode:   true,
		AuthCookieSecure: true,
	}
	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store: st, AuthService: as, AI: ai.NewHeuristic(),
		Embeddings: ai.NewEmbeddingsService(nil), EmailSender: &email.NoopSender{},
	})
	hash, _ := bcrypt.GenerateFromPassword([]byte(cookieTestPassword), bcrypt.DefaultCost)
	if _, err := st.CreateUserLocal(context.Background(), "secure@example.com", string(hash)); err != nil {
		t.Fatalf("create user: %v", err)
	}

	body, _ := json.Marshal(map[string]string{"email": "secure@example.com", "password": cookieTestPassword})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	c := findCookie(rec, "devdeck_refresh")
	if c == nil {
		t.Fatal("expected cookie")
	}
	if !c.Secure {
		t.Errorf("cookie must be Secure when AuthCookieSecure=true")
	}
}

func TestCookie_Refresh_FlagOn_CookieFirst_NoBody(t *testing.T) {
	ts := newAuthTestServer(t, true)
	ts.createLocalUser(t, "on-cookie-refresh@example.com")

	login := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "on-cookie-refresh@example.com",
		"password": cookieTestPassword,
	}, nil)
	loginCookie := findCookie(login, "devdeck_refresh")
	if loginCookie == nil {
		t.Fatal("login did not set cookie")
	}

	// Refresh with cookie + valid Origin, NO body.
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
	req.Header.Set("Origin", cookieTestOrigin)
	req.AddCookie(&http.Cookie{Name: "devdeck_refresh", Value: loginCookie.Value})
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	newCookie := findCookie(rec, "devdeck_refresh")
	if newCookie == nil {
		t.Fatal("refresh must rotate and set a new cookie")
	}
	if newCookie.Value == loginCookie.Value {
		t.Errorf("refresh must rotate the token (new cookie value)")
	}
	pair := decodePair(t, rec)
	if pair.AccessToken == "" {
		t.Errorf("refresh must return a new access token in body")
	}
}

func TestCookie_Refresh_FlagOn_BodyFallback_NoCookie(t *testing.T) {
	ts := newAuthTestServer(t, true)
	ts.createLocalUser(t, "on-body-refresh@example.com")

	login := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "on-body-refresh@example.com",
		"password": cookieTestPassword,
	}, nil)
	pair := decodePair(t, login)

	// No cookie sent; refresh token in body + valid Origin → body fallback works
	// (desktop/extension path).
	rec := ts.post(t, "/api/auth/refresh", map[string]string{
		"refresh_token": pair.RefreshToken,
	}, map[string]string{"Origin": cookieTestOrigin})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 via body fallback, got %d, body: %s", rec.Code, rec.Body.String())
	}
	if findCookie(rec, "devdeck_refresh") == nil {
		t.Errorf("cookie-mode refresh should still rotate the cookie on body fallback")
	}
}

func TestCookie_Refresh_FlagOn_RejectsDisallowedOrigin(t *testing.T) {
	ts := newAuthTestServer(t, true)
	ts.createLocalUser(t, "on-bad-origin@example.com")

	login := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "on-bad-origin@example.com",
		"password": cookieTestPassword,
	}, nil)
	loginCookie := findCookie(login, "devdeck_refresh")

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	req.AddCookie(&http.Cookie{Name: "devdeck_refresh", Value: loginCookie.Value})
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for disallowed origin, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestCookie_Logout_FlagOn_ClearsCookieAndInvalidates(t *testing.T) {
	ts := newAuthTestServer(t, true)
	ts.createLocalUser(t, "on-logout@example.com")

	login := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "on-logout@example.com",
		"password": cookieTestPassword,
	}, nil)
	loginCookie := findCookie(login, "devdeck_refresh")
	if loginCookie == nil {
		t.Fatal("login did not set cookie")
	}

	// Logout sends the cookie, no body.
	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	req.Header.Set("Origin", cookieTestOrigin)
	req.AddCookie(&http.Cookie{Name: "devdeck_refresh", Value: loginCookie.Value})
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
	cleared := findCookie(rec, "devdeck_refresh")
	if cleared == nil {
		t.Fatal("logout must emit a clearing Set-Cookie")
	}
	if cleared.MaxAge >= 0 || cleared.Value != "" {
		t.Errorf("clearing cookie must have MaxAge<0 and empty value, got %+v", cleared)
	}

	// The session must be invalidated: reusing the old refresh token fails.
	reuse := ts.post(t, "/api/auth/refresh", map[string]string{
		"refresh_token": loginCookie.Value,
	}, map[string]string{"Origin": cookieTestOrigin})
	if reuse.Code != http.StatusUnauthorized {
		t.Errorf("reusing the logged-out refresh token must fail with 401, got %d", reuse.Code)
	}
}

func TestCookie_Refresh_SingleUse_SecondUseFails(t *testing.T) {
	ts := newAuthTestServer(t, true)
	ts.createLocalUser(t, "on-rotate@example.com")

	login := ts.post(t, "/api/auth/login", map[string]string{
		"email":    "on-rotate@example.com",
		"password": cookieTestPassword,
	}, nil)
	loginCookie := findCookie(login, "devdeck_refresh")

	// First refresh consumes the original token.
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
	req.Header.Set("Origin", cookieTestOrigin)
	req.AddCookie(&http.Cookie{Name: "devdeck_refresh", Value: loginCookie.Value})
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("first refresh: expected 200, got %d", rec.Code)
	}

	// Reusing the now-consumed original token must fail (single-use rotation).
	reuse := ts.post(t, "/api/auth/refresh", map[string]string{
		"refresh_token": loginCookie.Value,
	}, map[string]string{"Origin": cookieTestOrigin})
	if reuse.Code != http.StatusUnauthorized {
		t.Errorf("second use of rotated token must fail with 401, got %d", reuse.Code)
	}
}
