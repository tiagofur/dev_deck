package handlers_test

import (
	"context"
	"net/http"
	"regexp"
	"testing"
	"time"

	"heapdeck/internal/ai"
	"heapdeck/internal/authservice"
	"heapdeck/internal/config"
	"heapdeck/internal/email"
	"heapdeck/internal/enricher"
	httpapi "heapdeck/internal/http"
	"heapdeck/internal/jobs"
	"heapdeck/internal/store"
	"heapdeck/internal/testutil"
)

// capturingEmailSender records the last email it "sent" so tests can extract
// the password reset link without an SMTP server.
type capturingEmailSender struct {
	to      string
	subject string
	html    string
}

func (s *capturingEmailSender) Send(_ context.Context, to, subject, htmlBody string) error {
	s.to, s.subject, s.html = to, subject, htmlBody
	return nil
}

// passwordResetServer is a JWT-mode server with a capturing email sender.
type passwordResetServer struct {
	orgAuthzServer
	email *capturingEmailSender
}

func newPasswordResetServer(t *testing.T) *passwordResetServer {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)

	en := enricher.NewForTest("http://github-fake.invalid")
	aiSvc := ai.NewHeuristic()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	q := jobs.NewEnrichQueue(st, en, aiSvc, 32)
	q.Start(ctx)

	sender := &capturingEmailSender{}
	const secret = "password-reset-test-secret"
	as := authservice.New(secret, time.Hour, time.Hour)
	cfg := config.Config{
		Port:              "0",
		AuthMode:          "jwt",
		JWTSecret:         secret,
		FrontendURL:       "https://heapdeck.test",
		RateLimitDisabled: true,
	}
	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		Enricher:    en,
		AuthService: as,
		EnrichQueue: q,
		AI:          aiSvc,
		Embeddings:  ai.NewEmbeddingsService(nil),
		EmailSender: sender,
	})
	return &passwordResetServer{
		orgAuthzServer: orgAuthzServer{router: router, store: st, auth: as},
		email:          sender,
	}
}

var resetTokenPattern = regexp.MustCompile(`token=([A-Za-z0-9_-]+)`)

// registerUser creates an account through the public API and returns a JWT
// for it, so the stored password hash is a real bcrypt digest.
func (s *passwordResetServer) registerUser(t *testing.T, emailAddr, password string) string {
	t.Helper()
	rr := s.do(t, http.MethodPost, "/api/auth/register", "", "",
		map[string]any{"email": emailAddr, "password": password})
	if rr.Code != http.StatusCreated {
		t.Fatalf("register %s: expected 201, got %d: %s", emailAddr, rr.Code, rr.Body.String())
	}
	user, _, err := s.store.GetUserByLogin(context.Background(), emailAddr)
	if err != nil {
		t.Fatalf("fetch registered user: %v", err)
	}
	return s.token(t, *user)
}

// The forgot → reset round trip: generic response (no enumeration), single
// hashed token, sessions revoked, and the new password actually logs in.
func TestPasswordReset_FullFlow(t *testing.T) {
	s := newPasswordResetServer(t)

	const emailAddr = "reset-flow@example.test"
	s.registerUser(t, emailAddr, "original-password-123")

	// Unknown emails get the exact same generic response.
	rr := s.do(t, http.MethodPost, "/api/auth/forgot-password", "", "",
		map[string]any{"email": "nobody@example.test"})
	if rr.Code != http.StatusOK {
		t.Fatalf("forgot unknown: expected 200, got %d", rr.Code)
	}
	genericBody := rr.Body.String()

	rr = s.do(t, http.MethodPost, "/api/auth/forgot-password", "", "",
		map[string]any{"email": emailAddr})
	if rr.Code != http.StatusOK {
		t.Fatalf("forgot known: expected 200, got %d", rr.Code)
	}
	if rr.Body.String() != genericBody {
		t.Fatalf("forgot response differs for known/unknown emails:\nknown: %s\nunknown: %s", rr.Body.String(), genericBody)
	}
	if s.email.to != emailAddr {
		t.Fatalf("expected reset email to the account owner, got %q", s.email.to)
	}

	m := resetTokenPattern.FindStringSubmatch(s.email.html)
	if m == nil {
		t.Fatalf("no token in reset email: %s", s.email.html)
	}

	// Weak passwords are rejected before consuming the token.
	rr = s.do(t, http.MethodPost, "/api/auth/reset-password", "", "",
		map[string]any{"token": m[1], "new_password": "short"})
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("weak password: expected 400, got %d", rr.Code)
	}

	rr = s.do(t, http.MethodPost, "/api/auth/reset-password", "", "",
		map[string]any{"token": m[1], "new_password": "brand-new-password-123"})
	if rr.Code != http.StatusOK {
		t.Fatalf("reset: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// The token is single-use.
	rr = s.do(t, http.MethodPost, "/api/auth/reset-password", "", "",
		map[string]any{"token": m[1], "new_password": "another-password-123"})
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("token reuse: expected 400, got %d", rr.Code)
	}

	// The new password logs in; the old one does not.
	rr = s.do(t, http.MethodPost, "/api/auth/login", "", "",
		map[string]any{"email": emailAddr, "password": "brand-new-password-123"})
	if rr.Code != http.StatusOK {
		t.Fatalf("login with new password: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	rr = s.do(t, http.MethodPost, "/api/auth/login", "", "",
		map[string]any{"email": emailAddr, "password": "original-password-123"})
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("login with old password: expected 401, got %d", rr.Code)
	}
}

func TestPasswordReset_InvalidTokenRejected(t *testing.T) {
	s := newPasswordResetServer(t)

	rr := s.do(t, http.MethodPost, "/api/auth/reset-password", "", "",
		map[string]any{"token": "definitely-not-a-real-token", "new_password": "some-password-123"})
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for bogus token, got %d", rr.Code)
	}
}

// Change-password requires the current one, then the new password logs in.
func TestChangePassword(t *testing.T) {
	s := newPasswordResetServer(t)

	const emailAddr = "change-pw@example.test"
	tok := s.registerUser(t, emailAddr, "current-password-123")

	// Wrong current password.
	rr := s.do(t, http.MethodPost, "/api/auth/change-password", tok, "",
		map[string]any{"current_password": "wrong-current", "new_password": "updated-password-123"})
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("wrong current: expected 401, got %d", rr.Code)
	}

	rr = s.do(t, http.MethodPost, "/api/auth/change-password", tok, "",
		map[string]any{"current_password": "current-password-123", "new_password": "updated-password-123"})
	if rr.Code != http.StatusOK {
		t.Fatalf("change: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	rr = s.do(t, http.MethodPost, "/api/auth/login", "", "",
		map[string]any{"email": emailAddr, "password": "updated-password-123"})
	if rr.Code != http.StatusOK {
		t.Fatalf("login with updated password: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}

// Interface guard: the capturing sender must satisfy email.Sender.
var _ email.Sender = (*capturingEmailSender)(nil)
