package handlers_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"heapdeck/internal/ai"
	"heapdeck/internal/authservice"
	"heapdeck/internal/config"
	"heapdeck/internal/domain/auth"
	"heapdeck/internal/email"
	"heapdeck/internal/enricher"
	httpapi "heapdeck/internal/http"
	"heapdeck/internal/store"
	"heapdeck/internal/testutil"

	"golang.org/x/crypto/bcrypt"
)

type discoveryTestServer struct {
	router http.Handler
	store  *store.Store
}

func newDiscoveryTestServer(t *testing.T) *discoveryTestServer {
	t.Helper()

	gh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"items": [
			{
				"full_name": "disintegration/imaging",
				"html_url": "https://github.com/disintegration/imaging",
				"description": "Simple Go image resize and processing",
				"language": "Go",
				"stargazers_count": 4200,
				"forks_count": 300,
				"topics": ["go", "imaging"],
				"pushed_at": "2026-09-01T00:00:00Z",
				"owner": {"avatar_url": "https://avatars.example/u1"}
			},
			{
				"full_name": "stale/old-resizer",
				"html_url": "https://github.com/stale/old-resizer",
				"description": "abandoned perl image tool",
				"language": "Perl",
				"stargazers_count": 9000,
				"forks_count": 100,
				"topics": ["images"],
				"pushed_at": "2019-01-01T00:00:00Z",
				"owner": {"avatar_url": "https://avatars.example/u2"}
			}
		]}`))
	}))
	t.Cleanup(gh.Close)

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)
	as := authservice.New("test-jwt-secret", 15*time.Minute, 24*time.Hour)

	cfg := config.Config{
		Port:                 "0",
		AuthMode:             "jwt",
		JWTSecret:            "test-jwt-secret",
		LocalAuthEnabled:     true,
		RateLimitDisabled:    true,
		BillingEnabled:       true,
		AIMonthlyBudgetCents: 300,
		// No Gemini key → heuristic query builder ($0 path).
	}

	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		Enricher:    enricher.NewWithGitHubBase("", gh.URL),
		AuthService: as,
		AI:          ai.NewHeuristic(),
		Embeddings:  ai.NewEmbeddingsService(nil),
		EmailSender: &email.NoopSender{},
	})
	return &discoveryTestServer{router: router, store: st}
}

func (ts *discoveryTestServer) createLocalUser(t *testing.T, login string) *auth.User {
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

func (ts *discoveryTestServer) token(t *testing.T, login string) string {
	t.Helper()
	body := `{"email":` + `"` + login + `","password":"` + cookieTestPassword + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	return decodePair(t, rec).AccessToken
}

func TestDiscoveryGitHub_ProOnlyRanked(t *testing.T) {
	ts := newDiscoveryTestServer(t)
	u := ts.createLocalUser(t, "disco@example.test")
	token := ts.token(t, "disco@example.test")

	get := func(token string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/api/discovery/github?q=Go+CLI+to+resize+images", nil)
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		rec := httptest.NewRecorder()
		ts.router.ServeHTTP(rec, req)
		return rec
	}

	// Free → 402.
	if rec := get(token); rec.Code != http.StatusPaymentRequired {
		t.Fatalf("free discovery: expected 402, got %d, body: %s", rec.Code, rec.Body.String())
	}

	if err := ts.store.SetUserPlan(context.Background(), u.ID, auth.PlanPro); err != nil {
		t.Fatalf("SetUserPlan: %v", err)
	}
	rec := get(token)
	if rec.Code != http.StatusOK {
		t.Fatalf("pro discovery: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	type result struct {
		FullName    string  `json:"full_name"`
		URL         string  `json:"url"`
		Score       float64 `json:"score"`
		MatchReason string  `json:"match_reason"`
	}
	type discoResp struct {
		Query       string   `json:"query"`
		GitHubQuery string   `json:"github_query"`
		Results     []result `json:"results"`
		Cached      bool     `json:"cached"`
	}
	out := decodeJSON[discoResp](t, rec)
	if out.GitHubQuery == "" {
		t.Error("github_query must be echoed for transparency")
	}
	if len(out.Results) != 2 {
		t.Fatalf("results = %d, want 2", len(out.Results))
	}
	// Fresh Go match must outrank the stale famous repo.
	if out.Results[0].FullName != "disintegration/imaging" {
		t.Fatalf("first = %s, want disintegration/imaging", out.Results[0].FullName)
	}
	if out.Results[0].URL == "" || out.Results[0].MatchReason == "" {
		t.Error("results must carry url + match_reason for 1-click save UX")
	}

	// Missing query → 400.
	req := httptest.NewRequest(http.MethodGet, "/api/discovery/github", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec = httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("missing q: expected 400, got %d", rec.Code)
	}
}
