package handlers_test

import (
	"net/http"
	"testing"
)

func TestHandlers_SystemConfig_Get(t *testing.T) {
	ts := newTestServer(t)

	rec := ts.do(t, http.MethodGet, "/api/system/config", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}

	type systemConfig struct {
		AIProvider  string `json:"ai_provider"`
		SyncEnabled bool   `json:"sync_enabled"`
	}

	config := decodeJSON[systemConfig](t, rec)
	
	// ai_provider defaults to "heuristic" in newTestServer because it uses ai.NewHeuristic()
	// actually, the config endpoint is wired up in router.go using:
	// systemH := handlers.NewSystemConfigHandler(cfg.AIProvider, false)
	// In newTestServer, cfg has AIProvider unset (empty string). Let's verify that.
	if config.AIProvider != "" {
		t.Errorf("expected empty string for AIProvider, got %q", config.AIProvider)
	}

	if config.SyncEnabled {
		t.Errorf("expected SyncEnabled to be false, got true")
	}
}
