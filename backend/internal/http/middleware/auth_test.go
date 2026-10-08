package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"devdeck/internal/authctx"
	"devdeck/internal/config"
	"devdeck/internal/http/middleware"
)

func TestTokenAuth_EmptyAPITokenRejects(t *testing.T) {
	// config.Load refuses to boot with AUTH_MODE=token and an empty API_TOKEN;
	// this proves the middleware itself also fails closed if that ever changes.
	handler := middleware.TokenAuth(config.Config{AuthMode: "token"}, nil, nil)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Errorf("next must not run with an empty API_TOKEN")
		}),
	)

	for _, auth := range []string{"Bearer ", "Bearer", "Bearer anything", ""} {
		req := httptest.NewRequest("GET", "/", nil)
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("Authorization %q: expected 401, got %d", auth, rr.Code)
		}
	}
}

func TestTokenAuth_StaticModeSetsTestUserID(t *testing.T) {
	handler := middleware.TokenAuth(config.Config{AuthMode: "token", APIToken: "secret"}, nil, nil)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := authctx.UserID(r.Context())
			if !ok {
				t.Error("expected user ID in context")
				return
			}
			if userID.String() != "00000000-0000-0000-0000-000000000001" {
				t.Errorf("unexpected user ID %s", userID)
			}
		}),
	)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer secret")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("valid token rejected: got %d", rr.Code)
	}
}

func TestOptionalTokenAuth_EmptyAPITokenIsAnonymous(t *testing.T) {
	handler := middleware.OptionalTokenAuth(config.Config{AuthMode: "token"}, nil, nil)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, ok := authctx.UserID(r.Context()); ok {
				t.Error("empty API_TOKEN must not authenticate as the fixed test user")
			}
		}),
	)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer ")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Optional auth always continues; the assertion above is what matters.
	if rr.Code != http.StatusOK {
		t.Errorf("optional auth must continue, got %d", rr.Code)
	}
}
