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

	"heapdeck/internal/ai"
	"heapdeck/internal/authservice"
	"heapdeck/internal/config"
	"heapdeck/internal/domain/auth"
	"heapdeck/internal/email"
	httpapi "heapdeck/internal/http"
	"heapdeck/internal/store"
	"heapdeck/internal/testutil"

	"golang.org/x/crypto/bcrypt"
)

// fakeEmbedder returns a zero 1536-dim vector so semantic paths run
// end-to-end without a provider key.
type fakeEmbedder struct{}

func (fakeEmbedder) Embed(_ context.Context, _ string) ([]float32, error) {
	return make([]float32, 1536), nil
}
func (fakeEmbedder) Dim() int  { return 1536 }
func (fakeEmbedder) Enabled() bool { return true }

type proTestServer struct {
	router http.Handler
	store  *store.Store
}

func newProTestServer(t *testing.T, billingEnabled bool) *proTestServer {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)
	as := authservice.New("test-jwt-secret", 15*time.Minute, 24*time.Hour)

	cfg := config.Config{
		Port:              "0",
		AuthMode:          "jwt",
		JWTSecret:         "test-jwt-secret",
		LocalAuthEnabled:  true,
		RateLimitDisabled: true,
		BillingEnabled:    billingEnabled,
	}

	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		AuthService: as,
		AI:          ai.NewHeuristic(),
		Embeddings:  ai.NewEmbeddingsService(fakeEmbedder{}),
		EmailSender: &email.NoopSender{},
	})
	return &proTestServer{router: router, store: st}
}

func (ts *proTestServer) createLocalUser(t *testing.T, login string) *auth.User {
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

// loginAs returns a Bearer access token for the given login.
func (ts *proTestServer) loginAs(t *testing.T, login string) string {
	t.Helper()
	rec := ts.do(t, http.MethodPost, "/api/auth/login", map[string]string{
		"email":    login,
		"password": cookieTestPassword,
	}, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("login: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	return decodePair(t, rec).AccessToken
}

func (ts *proTestServer) do(t *testing.T, method, path string, body any, token string) *httptest.ResponseRecorder {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		rdr = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, rdr)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	return rec
}

func TestProGating_AskRequiresProWhenBillingOn(t *testing.T) {
	ts := newProTestServer(t, true)
	u := ts.createLocalUser(t, "free-ask@example.test")
	token := ts.loginAs(t, "free-ask@example.test")

	rec := ts.do(t, http.MethodPost, "/api/ask", map[string]string{"question": "tools for agents?"}, token)
	if rec.Code != http.StatusPaymentRequired {
		t.Fatalf("free ask: expected 402, got %d, body: %s", rec.Code, rec.Body.String())
	}

	// Upgrade in the DB *after* the token was minted: the gate must read
	// the fresh plan, not the stale JWT claim.
	if err := ts.store.SetUserPlan(context.Background(), u.ID, auth.PlanPro); err != nil {
		t.Fatalf("SetUserPlan: %v", err)
	}
	rec = ts.do(t, http.MethodPost, "/api/ask", map[string]string{"question": "tools for agents?"}, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("pro ask: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestProGating_AgentChatRequiresProWhenBillingOn(t *testing.T) {
	ts := newProTestServer(t, true)
	u := ts.createLocalUser(t, "free-agent@example.test")
	token := ts.loginAs(t, "free-agent@example.test")

	rec := ts.do(t, http.MethodPost, "/api/agent/chat", map[string]any{"history": []any{}}, token)
	if rec.Code != http.StatusPaymentRequired {
		t.Fatalf("free agent/chat: expected 402, got %d, body: %s", rec.Code, rec.Body.String())
	}

	// Pro passes the gate; the 503 comes from the handler because the
	// heuristic service has no chat agent wired — deterministic, no network.
	if err := ts.store.SetUserPlan(context.Background(), u.ID, auth.PlanPro); err != nil {
		t.Fatalf("SetUserPlan: %v", err)
	}
	rec = ts.do(t, http.MethodPost, "/api/agent/chat", map[string]any{"history": []any{}}, token)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("pro agent/chat: expected 503 AI_DISABLED, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestProGating_SearchVectorRequiresProHybridDowngrades(t *testing.T) {
	ts := newProTestServer(t, true)
	u := ts.createLocalUser(t, "free-search@example.test")
	token := ts.loginAs(t, "free-search@example.test")

	rec := ts.do(t, http.MethodGet, "/api/search?q=docker&mode=vector", nil, token)
	if rec.Code != http.StatusPaymentRequired {
		t.Fatalf("free vector search: expected 402, got %d, body: %s", rec.Code, rec.Body.String())
	}

	rec = ts.do(t, http.MethodGet, "/api/search?q=docker&mode=hybrid", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("free hybrid search: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	type searchResp struct {
		Mode        string `json:"mode"`
		AIDowngraded bool  `json:"ai_downgraded"`
	}
	out := decodeJSON[searchResp](t, rec)
	if out.Mode != "text" || !out.AIDowngraded {
		t.Fatalf("free hybrid must degrade to text with ai_downgraded=true, got %+v", out)
	}

	if err := ts.store.SetUserPlan(context.Background(), u.ID, auth.PlanPro); err != nil {
		t.Fatalf("SetUserPlan: %v", err)
	}
	rec = ts.do(t, http.MethodGet, "/api/search?q=docker&mode=vector", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("pro vector search: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	rec = ts.do(t, http.MethodGet, "/api/search?q=docker&mode=hybrid", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("pro hybrid search: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	pro := decodeJSON[searchResp](t, rec)
	if pro.Mode != "hybrid" || pro.AIDowngraded {
		t.Fatalf("pro hybrid must stay hybrid without downgrade, got %+v", pro)
	}
}

func TestProGating_BillingOffTreatsEveryoneAsPro(t *testing.T) {
	ts := newProTestServer(t, false)
	ts.createLocalUser(t, "free-no-billing@example.test")
	token := ts.loginAs(t, "free-no-billing@example.test")

	rec := ts.do(t, http.MethodPost, "/api/ask", map[string]string{"question": "anything"}, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("billing off: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	rec = ts.do(t, http.MethodGet, "/api/search?q=docker&mode=vector", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("billing off vector: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestProGating_SystemConfigExposesBilling(t *testing.T) {
	for _, enabled := range []bool{true, false} {
		ts := newProTestServer(t, enabled)
		rec := ts.do(t, http.MethodGet, "/api/system/config", nil, "")
		if rec.Code != http.StatusOK {
			t.Fatalf("billing=%v: expected 200, got %d", enabled, rec.Code)
		}
		type cfgResp struct {
			BillingEnabled bool `json:"billing_enabled"`
		}
		out := decodeJSON[cfgResp](t, rec)
		if out.BillingEnabled != enabled {
			t.Errorf("billing=%v: config reports billing_enabled=%v", enabled, out.BillingEnabled)
		}
	}
}
