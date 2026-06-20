package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"devdeck/internal/http/handlers"
)

// These tests exercise the cookie-mode CSRF (Origin) guard at the handler
// boundary WITHOUT a database. In cookie mode the Origin check runs before any
// store/authService access, so a nil-dep handler is sufficient to prove the
// 403 path and the flag gate. They are CI-verifiable on every platform.

func newOriginGuardHandler(cookieMode bool, origins []string) *handlers.AuthHandler {
	return handlers.NewAuthHandler(nil, nil, handlers.AuthConfig{
		AuthCookieMode: cookieMode,
		AllowedOrigins: origins,
	})
}

func TestRefresh_OriginGuard_DBFree(t *testing.T) {
	allowed := []string{"http://localhost:5173", "https://app.devdeck.io"}

	tests := []struct {
		name       string
		cookieMode bool
		origin     string
		referer    string
		wantCode   int // only meaningful for the rejection case
		wantReject bool
	}{
		{
			name:       "flag on, disallowed origin rejected",
			cookieMode: true,
			origin:     "https://evil.example.com",
			wantCode:   http.StatusForbidden,
			wantReject: true,
		},
		{
			name:       "flag on, no origin and no referer rejected",
			cookieMode: true,
			wantCode:   http.StatusForbidden,
			wantReject: true,
		},
		{
			name:       "flag on, disallowed referer rejected",
			cookieMode: true,
			referer:    "https://evil.example.com/page",
			wantCode:   http.StatusForbidden,
			wantReject: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := newOriginGuardHandler(tt.cookieMode, allowed)
			req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if tt.referer != "" {
				req.Header.Set("Referer", tt.referer)
			}
			rec := httptest.NewRecorder()
			h.Refresh(rec, req)

			if tt.wantReject {
				if rec.Code != tt.wantCode {
					t.Fatalf("expected %d, got %d, body: %s", tt.wantCode, rec.Code, rec.Body.String())
				}
				if !strings.Contains(rec.Body.String(), "ORIGIN_NOT_ALLOWED") {
					t.Errorf("expected ORIGIN_NOT_ALLOWED error, got %s", rec.Body.String())
				}
			}
		})
	}
}

// TestRefresh_FlagOff_NoOriginGuard proves the flag gate: with the flag OFF,
// the Origin guard is never consulted. (With nil deps the handler would panic
// when it reaches the store, so we only assert the guard does not short-circuit
// to 403 — i.e. it proceeds past the cookie-mode block.)
func TestRefresh_FlagOff_SkipsOriginGuard(t *testing.T) {
	h := newOriginGuardHandler(false, []string{"http://localhost:5173"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(`{"refresh_token":"x"}`))
	req.Header.Set("Origin", "https://evil.example.com")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	defer func() {
		// Reaching the store with nil deps panics; that is expected and proves
		// the flag-off path did NOT return 403 from the origin guard.
		_ = recover()
		if rec.Code == http.StatusForbidden {
			t.Errorf("flag off must not run the origin guard (no 403)")
		}
	}()
	h.Refresh(rec, req)
}
