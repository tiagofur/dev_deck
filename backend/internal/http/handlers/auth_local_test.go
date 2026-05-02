package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"devdeck/internal/authservice"
	"devdeck/internal/config"
	httpapi "devdeck/internal/http"
	"devdeck/internal/store"
	"devdeck/internal/testutil"
)

type MockSender struct {
	SentEmails []SentEmail
}

type SentEmail struct {
	To      string
	Subject string
	HTML    string
}

func (m *MockSender) Send(ctx context.Context, to, subject, html string) error {
	m.SentEmails = append(m.SentEmails, SentEmail{To: to, Subject: subject, HTML: html})
	return nil
}

func setupAuthTest(t *testing.T) (*testServer, *MockSender) {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)
	
	mockEmail := &MockSender{}
	
	cfg := config.Config{
		Port:              "0",
		AuthMode:          "jwt",
		LocalAuthEnabled:  true,
		RateLimitDisabled: true,
		FrontendURL:       "http://localhost:3000",
		JWTSecret:         "test-secret-at-least-32-chars-long-!!!",
	}

	as := authservice.New(cfg.JWTSecret, 1*time.Hour, 24*time.Hour)
	
	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		AuthService: as,
		EmailSender: mockEmail,
	})

	ts := &testServer{
		router: router,
		store:  st,
	}
	
	return ts, mockEmail
}

func TestHandlers_LocalAuth_Flow(t *testing.T) {
	ts, mockEmail := setupAuthTest(t)

	// 1. Register
	regRec := ts.do(t, http.MethodPost, "/api/auth/register", map[string]any{
		"email":    "test@example.com",
		"password": "password123",
	})
	if regRec.Code != http.StatusCreated {
		t.Fatalf("register: expected 201, got %d, body: %s", regRec.Code, regRec.Body.String())
	}

	if len(mockEmail.SentEmails) != 1 {
		t.Fatalf("expected 1 email sent, got %d", len(mockEmail.SentEmails))
	}
	
	emailHTML := mockEmail.SentEmails[0].HTML
	// Extract token from link in HTML: http://localhost:3000/verify-email?token=...
	tokenStart := strings.Index(emailHTML, "token=") + 6
	tokenEnd := strings.Index(emailHTML[tokenStart:], "\"")
	if tokenEnd == -1 {
		// Fallback for different quote types
		tokenEnd = strings.Index(emailHTML[tokenStart:], "'")
	}
	verifyToken := emailHTML[tokenStart : tokenStart+tokenEnd]

	// 2. Login (should fail before verification)
	loginRec1 := ts.do(t, http.MethodPost, "/api/auth/login", map[string]any{
		"email":    "test@example.com",
		"password": "password123",
	})
	if loginRec1.Code != http.StatusForbidden {
		t.Errorf("login before verify: expected 403, got %d", loginRec1.Code)
	}

	// 3. Verify Email
	verifyRec := httptest.NewRecorder()
	verifyReq := httptest.NewRequest(http.MethodGet, "/api/auth/verify-email?token="+verifyToken, nil)
	ts.router.ServeHTTP(verifyRec, verifyReq)
	if verifyRec.Code != http.StatusSeeOther {
		t.Errorf("verify: expected 303 redirect, got %d", verifyRec.Code)
	}
	
	loc := verifyRec.Header().Get("Location")
	if !strings.Contains(loc, "verified=true") {
		t.Errorf("verify redirect: expected verified=true, got %q", loc)
	}

	// 4. Login (should succeed now)
	loginRec2 := ts.do(t, http.MethodPost, "/api/auth/login", map[string]any{
		"email":    "test@example.com",
		"password": "password123",
	})
	if loginRec2.Code != http.StatusOK {
		t.Fatalf("login after verify: expected 200, got %d, body: %s", loginRec2.Code, loginRec2.Body.String())
	}
	
	var tokens struct {
		Access  string `json:"access_token"`
		Refresh string `json:"refresh_token"`
	}
	if err := json.NewDecoder(loginRec2.Body).Decode(&tokens); err != nil {
		t.Fatalf("decode login tokens: %v", err)
	}
	if tokens.Access == "" {
		t.Error("expected access token, got empty")
	}

	// 5. Forgot Password
	forgotRec := ts.do(t, http.MethodPost, "/api/auth/forgot-password", map[string]any{
		"email": "test@example.com",
	})
	if forgotRec.Code != http.StatusOK {
		t.Fatalf("forgot: expected 200, got %d", forgotRec.Code)
	}

	if len(mockEmail.SentEmails) != 2 {
		t.Fatalf("expected 2 emails sent total, got %d", len(mockEmail.SentEmails))
	}
	
	resetHTML := mockEmail.SentEmails[1].HTML
	tokenStart = strings.Index(resetHTML, "token=") + 6
	tokenEnd = strings.Index(resetHTML[tokenStart:], "\"")
	if tokenEnd == -1 {
		tokenEnd = strings.Index(resetHTML[tokenStart:], "'")
	}
	resetToken := resetHTML[tokenStart : tokenStart+tokenEnd]

	// 6. Reset Password
	resetRec := ts.do(t, http.MethodPost, "/api/auth/reset-password", map[string]any{
		"token":        resetToken,
		"new_password": "newpassword456",
	})
	if resetRec.Code != http.StatusOK {
		t.Fatalf("reset: expected 200, got %d, body: %s", resetRec.Code, resetRec.Body.String())
	}

	// 7. Login with new password
	loginRec3 := ts.do(t, http.MethodPost, "/api/auth/login", map[string]any{
		"email":    "test@example.com",
		"password": "newpassword456",
	})
	if loginRec3.Code != http.StatusOK {
		t.Errorf("login with new pass: expected 200, got %d", loginRec3.Code)
	}

	// 8. Change Password (protected)
	changeReq := httptest.NewRequest(http.MethodPost, "/api/auth/change-password", strings.NewReader(`{"current_password":"newpassword456","new_password":"finalpassword789"}`))
	changeReq.Header.Set("Authorization", "Bearer "+tokens.Access)
	changeReq.Header.Set("Content-Type", "application/json")
	changeRec := httptest.NewRecorder()
	ts.router.ServeHTTP(changeRec, changeReq)
	
	// Note: tokens.Access might be invalid if the reset invalidated it?
	// Actually, loginRec3 gave us NEW tokens, but we used tokens.Access from loginRec2.
	// Since reset-password should ideally invalidate existing sessions, let's see.
	// Our current implementation doesn't explicitly invalidate sessions on password change/reset (beyond normal expiration).
	
	if changeRec.Code != http.StatusOK {
		t.Errorf("change pass: expected 200, got %d, body: %s", changeRec.Code, changeRec.Body.String())
	}
}

func TestHandlers_LocalAuth_RegisterDuplicate(t *testing.T) {
	ts, _ := setupAuthTest(t)

	body := map[string]any{"email": "dup@example.com", "password": "password123"}
	ts.do(t, http.MethodPost, "/api/auth/register", body)
	
	rec := ts.do(t, http.MethodPost, "/api/auth/register", body)
	if rec.Code != http.StatusConflict {
		t.Errorf("expected 409 for duplicate email, got %d", rec.Code)
	}
}

func TestHandlers_LocalAuth_LoginWrongPassword(t *testing.T) {
	ts, _ := setupAuthTest(t)

	ts.do(t, http.MethodPost, "/api/auth/register", map[string]any{"email": "wrong@example.com", "password": "correct"})
	
	// We don't verify email, so login should fail with 403 or 401?
	// If password is wrong, it should fail with 401 REGARDLESS of verification (to not leak info).
	// Actually, our code checks password first.
	
	rec := ts.do(t, http.MethodPost, "/api/auth/login", map[string]any{"email": "wrong@example.com", "password": "wrong"})
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong password, got %d", rec.Code)
	}
}
