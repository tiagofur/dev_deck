package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"heapdeck/internal/config"
	"heapdeck/internal/http/middleware"
)

func TestProGater_BypassWhenBillingDisabledOrStaticMode(t *testing.T) {
	tests := []struct {
		name string
		cfg  config.Config
	}{
		{name: "billing off jwt mode", cfg: config.Config{AuthMode: "jwt", BillingEnabled: false}},
		{name: "billing off static mode", cfg: config.Config{AuthMode: "token", BillingEnabled: false}},
		{name: "billing on static mode", cfg: config.Config{AuthMode: "token", BillingEnabled: true}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := middleware.NewProGater(tt.cfg, nil)
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusTeapot)
			})

			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if !g.IsPro(req) {
				t.Error("expected IsPro=true when gating is bypassed")
			}

			rr := httptest.NewRecorder()
			g.RequirePro(next).ServeHTTP(rr, req)
			if rr.Code != http.StatusTeapot {
				t.Errorf("expected next handler to run (418), got %d", rr.Code)
			}
		})
	}
}

func TestProGater_FailsClosedWithoutUserOrStore(t *testing.T) {
	cfg := config.Config{AuthMode: "jwt", BillingEnabled: true}
	g := middleware.NewProGater(cfg, nil)
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("next must not run without an authenticated user")
	})

	// No UserID in context → 401, same as RequireAdmin.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if g.IsPro(req) {
		t.Error("expected IsPro=false without an authenticated user")
	}
	rr := httptest.NewRecorder()
	g.RequirePro(next).ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}
