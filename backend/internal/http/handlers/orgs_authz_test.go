package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"heapdeck/internal/ai"
	"heapdeck/internal/authservice"
	"heapdeck/internal/config"
	"heapdeck/internal/domain/auth"
	"heapdeck/internal/email"
	"heapdeck/internal/enricher"
	httpapi "heapdeck/internal/http"
	"heapdeck/internal/jobs"
	"heapdeck/internal/store"
	"heapdeck/internal/testutil"
)

// orgAuthzServer is a JWT-mode variant of testServer so tests can act as
// several distinct users instead of the single static-token test user.
type orgAuthzServer struct {
	router http.Handler
	store  *store.Store
	auth   *authservice.Service
}

func newOrgAuthzServer(t *testing.T) *orgAuthzServer {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)

	en := enricher.NewForTest("http://github-fake.invalid")
	aiSvc := ai.NewHeuristic()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	q := jobs.NewEnrichQueue(st, en, aiSvc, 32, nil)
	q.Start(ctx)

	const secret = "org-authz-test-secret"
	as := authservice.New(secret, time.Hour, time.Hour)
	cfg := config.Config{
		Port:              "0",
		AuthMode:          "jwt",
		JWTSecret:         secret,
		RateLimitDisabled: true, // shared localhost IP would trip per-IP limits
	}
	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		Enricher:    en,
		AuthService: as,
		EnrichQueue: q,
		AI:          aiSvc,
		Embeddings:  ai.NewEmbeddingsService(nil),
		EmailSender: &email.NoopSender{},
	})
	return &orgAuthzServer{router: router, store: st, auth: as}
}

func (s *orgAuthzServer) user(t *testing.T, login string) auth.User {
	t.Helper()
	u, err := s.store.CreateUserLocalTx(context.Background(), nil, login, "not-a-real-hash")
	if err != nil {
		t.Fatalf("create user %s: %v", login, err)
	}
	return *u
}

func (s *orgAuthzServer) token(t *testing.T, u auth.User) string {
	t.Helper()
	tok, _, err := s.auth.GenerateAccessToken(u)
	if err != nil {
		t.Fatalf("mint token for %s: %v", u.ID, err)
	}
	return tok
}

func (s *orgAuthzServer) do(t *testing.T, method, path, token, orgHeader string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var rdr *bytes.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		rdr = bytes.NewReader(raw)
	} else {
		rdr = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if orgHeader != "" {
		req.Header.Set("X-Org-ID", orgHeader)
	}
	rr := httptest.NewRecorder()
	s.router.ServeHTTP(rr, req)
	return rr
}

// Org routes must authorize against the org id in the path. An admin of their
// own org presenting their own X-Org-ID header must not gain access to a
// foreign org named in the path (insights, SCIM tokens) nor into membership
// management.
func TestOrgRoutes_ResolveMembershipFromPath(t *testing.T) {
	s := newOrgAuthzServer(t)
	ctx := context.Background()

	owner := s.user(t, "org-owner")
	outsider := s.user(t, "org-outsider")

	org, err := s.store.CreateOrganization(ctx, owner.ID, "Acme")
	if err != nil {
		t.Fatalf("create org: %v", err)
	}
	// The outsider administers their own org and presents it as X-Org-ID.
	outOrg, err := s.store.CreateOrganization(ctx, outsider.ID, "Outsiders")
	if err != nil {
		t.Fatalf("create outsider org: %v", err)
	}

	outTok := s.token(t, outsider)
	orgPath := "/api/orgs/" + org.ID.String()

	cases := []struct {
		name   string
		method string
		path   string
		body   any
	}{
		{"insights", "GET", orgPath + "/insights", nil},
		{"scim token", "POST", orgPath + "/scim/token", nil},
		{"add member", "POST", orgPath + "/members", map[string]any{"user_id": outsider.ID, "role": "admin"}},
		{"feed", "GET", orgPath + "/feed", nil},
		{"discovery trending", "GET", orgPath + "/discovery/trending", nil},
		{"discovery recommendations", "GET", orgPath + "/discovery/recommendations", nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := s.do(t, tc.method, tc.path, outTok, outOrg.ID.String(), tc.body)
			if rr.Code != http.StatusForbidden {
				t.Fatalf("%s %s: expected 403 for non-member, got %d: %s",
					tc.method, tc.path, rr.Code, rr.Body.String())
			}
		})
	}

	// Sanity: the owner passes the same routes.
	ownerTok := s.token(t, owner)
	rr := s.do(t, "GET", orgPath+"/insights", ownerTok, "", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("owner insights: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	rr = s.do(t, "POST", orgPath+"/members", ownerTok, "", map[string]any{"user_id": outsider.ID, "role": "viewer"})
	if rr.Code != http.StatusOK {
		t.Fatalf("owner add member: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}

// AddMember requires org:admin on the target org, and the assignable roles
// are whitelisted — "owner" can never be granted through the API.
func TestAddMember_RequiresAdminAndValidRole(t *testing.T) {
	s := newOrgAuthzServer(t)
	ctx := context.Background()

	owner := s.user(t, "members-owner")
	member := s.user(t, "members-viewer")
	outsider := s.user(t, "members-outsider")

	org, err := s.store.CreateOrganization(ctx, owner.ID, "Acme Members")
	if err != nil {
		t.Fatalf("create org: %v", err)
	}
	membersPath := "/api/orgs/" + org.ID.String() + "/members"
	ownerTok := s.token(t, owner)

	// Non-member cannot add themselves.
	rr := s.do(t, "POST", membersPath, s.token(t, outsider), "", map[string]any{"user_id": outsider.ID, "role": "admin"})
	if rr.Code != http.StatusForbidden {
		t.Fatalf("self-invite by outsider: expected 403, got %d: %s", rr.Code, rr.Body.String())
	}

	// Owner adds a viewer.
	rr = s.do(t, "POST", membersPath, ownerTok, "", map[string]any{"user_id": member.ID, "role": "viewer"})
	if rr.Code != http.StatusOK {
		t.Fatalf("owner add viewer: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// The viewer (org:read only) cannot manage members.
	rr = s.do(t, "POST", membersPath, s.token(t, member), "", map[string]any{"user_id": outsider.ID, "role": "viewer"})
	if rr.Code != http.StatusForbidden {
		t.Fatalf("viewer add member: expected 403, got %d: %s", rr.Code, rr.Body.String())
	}
	// ...but can read org-scoped data.
	rr = s.do(t, "GET", "/api/orgs/"+org.ID.String()+"/feed", s.token(t, member), "", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("viewer feed: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// Role whitelist: owner is not assignable, nor are unknown/empty roles.
	for _, role := range []string{"owner", "root", "member", ""} {
		rr := s.do(t, "POST", membersPath, ownerTok, "", map[string]any{"user_id": outsider.ID, "role": role})
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("role %q: expected 400, got %d: %s", role, rr.Code, rr.Body.String())
		}
	}
}

// The X-Org-ID header is honored only for orgs the caller belongs to; every
// data route (including the full vault export) must reject foreign orgs.
func TestContextOrg_RejectsForeignOrgHeader(t *testing.T) {
	s := newOrgAuthzServer(t)
	ctx := context.Background()

	owner := s.user(t, "ctx-owner")
	outsider := s.user(t, "ctx-outsider")

	org, err := s.store.CreateOrganization(ctx, owner.ID, "Acme Context")
	if err != nil {
		t.Fatalf("create org: %v", err)
	}

	ownerTok := s.token(t, owner)
	outTok := s.token(t, outsider)
	orgHeader := org.ID.String()

	// Outsider presenting the foreign org header is rejected on data routes.
	rr := s.do(t, "GET", "/api/repos", outTok, orgHeader, nil)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("foreign org repos: expected 403, got %d: %s", rr.Code, rr.Body.String())
	}
	rr = s.do(t, "GET", "/api/export/vault", outTok, orgHeader, nil)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("foreign org vault export: expected 403, got %d: %s", rr.Code, rr.Body.String())
	}

	// Without the header the same caller falls back to their personal scope.
	rr = s.do(t, "GET", "/api/repos", outTok, "", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("personal repos: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// A member keeps using the org scope normally.
	rr = s.do(t, "GET", "/api/repos", ownerTok, orgHeader, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("member org repos: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}
