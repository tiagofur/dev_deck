package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"devdeck/internal/ai"
	"devdeck/internal/config"
	"devdeck/internal/enricher"
	httpapi "devdeck/internal/http"
	"devdeck/internal/jobs"
	"devdeck/internal/store"
	"devdeck/internal/testutil"

	"github.com/google/uuid"
)

const testToken = "test-api-token"

// testServer wires up a fully-configured router backed by a real Postgres
// (testcontainers) and a fake GitHub-API (httptest.Server). It returns a
// teardown that the caller's t.Cleanup will fire.
type testServer struct {
	router      http.Handler
	store       *store.Store
	githubAPI   *httptest.Server
	githubCalls map[string]int
}

// newTestServer spins up postgres + a fake GitHub API + a router. It panics
// if anything fails so test bodies stay readable. The returned server is
// ready to receive requests via httptest.NewRecorder.
func newTestServer(t *testing.T) *testServer {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)

	calls := map[string]int{}
	gh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls[r.URL.Path]++
		switch r.URL.Path {
		case "/repos/charmbracelet/bubbletea":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{
				"description": "TUI framework",
				"language": "Go",
				"stargazers_count": 1000,
				"forks_count": 50,
				"topics": ["go","tui"],
				"owner": {"avatar_url": "https://avatars.example/charmbracelet"}
			}`))
		case "/repos/notfound/repo":
			w.WriteHeader(http.StatusNotFound)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(gh.Close)

	// NewForTest bypasses the SSRF guard so handler tests can point the
	// generic enricher at 127.0.0.1 httptest.Server URLs.
	en := enricher.NewForTest(gh.URL)
	aiSvc := ai.NewHeuristic()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	q := jobs.NewEnrichQueue(st, en, aiSvc, 32)
	q.Start(ctx)

	cfg := config.Config{
		Port:              "0",
		AuthMode:          "token",
		APIToken:          testToken,
		RateLimitDisabled: true, // so burst tests don't hit 429 on the shared IP
	}
	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		Enricher:    en,
		EnrichQueue: q,
		AI:          aiSvc,
		Embeddings:  ai.NewEmbeddingsService(nil),
		EmailSender: &email.NoopSender{},
	})
	return &testServer{
		router:      router,
		store:       st,
		githubAPI:   gh,
		githubCalls: calls,
	}
}

// do is a convenience that builds a request, signs it with the test token,
// dispatches it, and returns the recorder.
func (ts *testServer) do(t *testing.T, method, path string, body any) *httptest.ResponseRecorder {
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
	req.Header.Set("Authorization", "Bearer "+testToken)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	return rec
}

func decodeJSON[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var out T
	if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v\nbody: %s", err, rec.Body.String())
	}
	return out
}

// ─── Auth ───

func TestHandlers_Auth_RejectsMissingToken(t *testing.T) {
	ts := newTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/repos", nil)
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestHandlers_Auth_RejectsWrongToken(t *testing.T) {
	ts := newTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/repos", nil)
	req.Header.Set("Authorization", "Bearer wrong")
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestHandlers_Auth_ProtectsAdminRoutes(t *testing.T) {
	ts := newTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestHandlers_Health_Public(t *testing.T) {
	ts := newTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

// ─── Repos ───

type repoResp struct {
	ID          uuid.UUID `json:"id"`
	URL         string    `json:"url"`
	Source      string    `json:"source"`
	Name        string    `json:"name"`
	Owner       *string   `json:"owner"`
	Description *string   `json:"description"`
	Language    *string   `json:"language"`
	Stars       int       `json:"stars"`
	Tags        []string  `json:"tags"`
}

func TestHandlers_Repos_CreateAndGet(t *testing.T) {
	ts := newTestServer(t)

	rec := ts.do(t, http.MethodPost, "/api/repos", map[string]any{
		"url":  "https://github.com/charmbracelet/bubbletea",
		"tags": []string{"go", "tui"},
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d, body: %s", rec.Code, rec.Body.String())
	}
	created := decodeJSON[repoResp](t, rec)
	if created.Source != "github" {
		t.Errorf("expected source=github, got %q", created.Source)
	}
	// The fake GitHub API should have been called.
	if ts.githubCalls["/repos/charmbracelet/bubbletea"] != 1 {
		t.Errorf("expected 1 call to fake GitHub API, got %d",
			ts.githubCalls["/repos/charmbracelet/bubbletea"])
	}
	// Enrichment populated description/language/stars.
	if created.Description == nil || *created.Description != "TUI framework" {
		t.Errorf("expected description from enrichment, got %+v", created.Description)
	}
	if created.Stars != 1000 {
		t.Errorf("expected stars=1000, got %d", created.Stars)
	}

	// GET by id
	getRec := ts.do(t, http.MethodGet, "/api/repos/"+created.ID.String(), nil)
	if getRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", getRec.Code)
	}
}

func TestHandlers_Repos_Create_DuplicateConflict(t *testing.T) {
	ts := newTestServer(t)

	body := map[string]any{"url": "https://github.com/charmbracelet/bubbletea"}
	first := ts.do(t, http.MethodPost, "/api/repos", body)
	if first.Code != http.StatusCreated {
		t.Fatalf("first create: expected 201, got %d", first.Code)
	}
	second := ts.do(t, http.MethodPost, "/api/repos", body)
	if second.Code != http.StatusConflict {
		t.Errorf("second create: expected 409, got %d", second.Code)
	}
}

func TestHandlers_Repos_Create_InvalidURL(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodPost, "/api/repos", map[string]any{"url": ""})
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", rec.Code)
	}
}

func TestHandlers_Repos_List_FiltersByLang(t *testing.T) {
	ts := newTestServer(t)

	// Create one Go repo via fake-github enrichment, plus one generic that
	// won't have a language.
	_ = ts.do(t, http.MethodPost, "/api/repos", map[string]any{
		"url": "https://github.com/charmbracelet/bubbletea",
	})
	_ = ts.do(t, http.MethodPost, "/api/repos", map[string]any{
		"url": "https://example.com/some/page",
	})

	rec := ts.do(t, http.MethodGet, "/api/repos?lang=Go", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	type listResp struct {
		Total int        `json:"total"`
		Items []repoResp `json:"items"`
	}
	out := decodeJSON[listResp](t, rec)
	if out.Total != 1 {
		t.Errorf("expected 1 Go repo, got total=%d", out.Total)
	}
}

func TestHandlers_Repos_PatchAndDelete(t *testing.T) {
	ts := newTestServer(t)

	rec := ts.do(t, http.MethodPost, "/api/repos", map[string]any{
		"url": "https://github.com/charmbracelet/bubbletea",
	})
	created := decodeJSON[repoResp](t, rec)

	// Patch notes + tags
	patchRec := ts.do(t, http.MethodPatch, "/api/repos/"+created.ID.String(), map[string]any{
		"notes": "shiny new notes",
		"tags":  []string{"x", "y"},
	})
	if patchRec.Code != http.StatusOK {
		t.Fatalf("patch: expected 200, got %d, body: %s", patchRec.Code, patchRec.Body.String())
	}

	// Delete
	delRec := ts.do(t, http.MethodDelete, "/api/repos/"+created.ID.String(), nil)
	if delRec.Code != http.StatusNoContent {
		t.Errorf("delete: expected 204, got %d", delRec.Code)
	}

	// Get after delete → 404
	getRec := ts.do(t, http.MethodGet, "/api/repos/"+created.ID.String(), nil)
	if getRec.Code != http.StatusNotFound {
		t.Errorf("get after delete: expected 404, got %d", getRec.Code)
	}
}

func TestHandlers_Repos_Get_BadUUID(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodGet, "/api/repos/not-a-uuid", nil)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 on bad UUID, got %d", rec.Code)
	}
}

// ─── Commands ───

type cmdResp struct {
	ID       uuid.UUID `json:"id"`
	Label    string    `json:"label"`
	Command  string    `json:"command"`
	Position int       `json:"position"`
}

func TestHandlers_Commands_CRUDFlow(t *testing.T) {
	ts := newTestServer(t)

	repoRec := ts.do(t, http.MethodPost, "/api/repos", map[string]any{
		"url": "https://github.com/charmbracelet/bubbletea",
	})
	repo := decodeJSON[repoResp](t, repoRec)
	repoPath := "/api/repos/" + repo.ID.String()

	// Create command
	createRec := ts.do(t, http.MethodPost, repoPath+"/commands", map[string]any{
		"label":   "Dev",
		"command": "go run .",
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create cmd: expected 201, got %d, body: %s", createRec.Code, createRec.Body.String())
	}
	cmd := decodeJSON[cmdResp](t, createRec)
	if cmd.Position != 0 {
		t.Errorf("expected position 0, got %d", cmd.Position)
	}

	// Batch create
	batchRec := ts.do(t, http.MethodPost, repoPath+"/commands/batch", map[string]any{
		"commands": []map[string]any{
			{"label": "test", "command": "go test ./..."},
			{"label": "build", "command": "go build ./..."},
		},
	})
	if batchRec.Code != http.StatusCreated {
		t.Fatalf("batch: expected 201, got %d, body: %s", batchRec.Code, batchRec.Body.String())
	}
	batch := decodeJSON[[]cmdResp](t, batchRec)
	if len(batch) != 2 {
		t.Fatalf("expected 2 batched commands, got %d", len(batch))
	}

	// List
	listRec := ts.do(t, http.MethodGet, repoPath+"/commands", nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list cmds: expected 200, got %d", listRec.Code)
	}
	list := decodeJSON[[]cmdResp](t, listRec)
	if len(list) != 3 {
		t.Errorf("expected 3 commands total, got %d", len(list))
	}

	// Reorder
	reorderRec := ts.do(t, http.MethodPost, repoPath+"/commands/reorder", map[string]any{
		"order": []string{batch[1].ID.String(), batch[0].ID.String(), cmd.ID.String()},
	})
	if reorderRec.Code != http.StatusNoContent {
		t.Errorf("reorder: expected 204, got %d, body: %s", reorderRec.Code, reorderRec.Body.String())
	}

	listRec2 := ts.do(t, http.MethodGet, repoPath+"/commands", nil)
	list2 := decodeJSON[[]cmdResp](t, listRec2)
	if list2[0].ID != batch[1].ID {
		t.Errorf("reorder did not persist; first id = %s", list2[0].ID)
	}

	// Update
	newLabel := "renamed"
	updRec := ts.do(t, http.MethodPatch, repoPath+"/commands/"+cmd.ID.String(), map[string]any{
		"label": newLabel,
	})
	if updRec.Code != http.StatusOK {
		t.Errorf("update: expected 200, got %d", updRec.Code)
	}

	// Delete
	delRec := ts.do(t, http.MethodDelete, repoPath+"/commands/"+cmd.ID.String(), nil)
	if delRec.Code != http.StatusNoContent {
		t.Errorf("delete: expected 204, got %d", delRec.Code)
	}
}

func TestHandlers_Commands_Create_RejectsUnknownRepo(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodPost,
		"/api/repos/00000000-0000-0000-0000-000000000000/commands",
		map[string]any{"label": "x", "command": "echo x"})
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unknown repo, got %d", rec.Code)
	}
}

// ─── Cheatsheets ───

type cheatsheetResp struct {
	ID       uuid.UUID `json:"id"`
	Slug     string    `json:"slug"`
	Title    string    `json:"title"`
	Category string    `json:"category"`
}

func TestHandlers_Cheatsheets_CRUDFlow(t *testing.T) {
	ts := newTestServer(t)

	createRec := ts.do(t, http.MethodPost, "/api/cheatsheets", map[string]any{
		"slug":     "git",
		"title":    "Git",
		"category": "vcs",
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d, body: %s", createRec.Code, createRec.Body.String())
	}
	c := decodeJSON[cheatsheetResp](t, createRec)
	cPath := "/api/cheatsheets/" + c.ID.String()

	// Add an entry
	entryRec := ts.do(t, http.MethodPost, cPath+"/entries", map[string]any{
		"label":   "status",
		"command": "git status",
	})
	if entryRec.Code != http.StatusCreated {
		t.Fatalf("create entry: expected 201, got %d", entryRec.Code)
	}

	// Get detail
	detailRec := ts.do(t, http.MethodGet, cPath, nil)
	if detailRec.Code != http.StatusOK {
		t.Fatalf("get detail: expected 200, got %d", detailRec.Code)
	}
	type detailResp struct {
		ID      uuid.UUID `json:"id"`
		Entries []struct {
			ID    uuid.UUID `json:"id"`
			Label string    `json:"label"`
		} `json:"entries"`
	}
	detail := decodeJSON[detailResp](t, detailRec)
	if len(detail.Entries) != 1 || detail.Entries[0].Label != "status" {
		t.Errorf("unexpected detail: %+v", detail)
	}

	// List with category filter
	listRec := ts.do(t, http.MethodGet, "/api/cheatsheets?category=vcs", nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d", listRec.Code)
	}
	list := decodeJSON[[]cheatsheetResp](t, listRec)
	if len(list) != 1 {
		t.Errorf("expected 1 cheatsheet in vcs, got %d", len(list))
	}

	// Patch
	patchRec := ts.do(t, http.MethodPatch, cPath, map[string]any{
		"title": "Git (the cheats)",
	})
	if patchRec.Code != http.StatusOK {
		t.Fatalf("patch: expected 200, got %d, body: %s", patchRec.Code, patchRec.Body.String())
	}

	// Delete
	delRec := ts.do(t, http.MethodDelete, cPath, nil)
	if delRec.Code != http.StatusNoContent {
		t.Errorf("delete: expected 204, got %d", delRec.Code)
	}
}

func TestHandlers_Cheatsheets_DuplicateSlug(t *testing.T) {
	ts := newTestServer(t)

	body := map[string]any{"slug": "git", "title": "Git", "category": "vcs"}
	first := ts.do(t, http.MethodPost, "/api/cheatsheets", body)
	if first.Code != http.StatusCreated {
		t.Fatalf("first: expected 201, got %d", first.Code)
	}
	second := ts.do(t, http.MethodPost, "/api/cheatsheets", body)
	if second.Code != http.StatusConflict {
		t.Errorf("expected 409 on dup slug, got %d", second.Code)
	}
}

func TestHandlers_Cheatsheets_RejectsMissingFields(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodPost, "/api/cheatsheets", map[string]any{"slug": "git"})
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", rec.Code)
	}
}

// ─── Search ───

func TestHandlers_Search_FindsAcrossEntities(t *testing.T) {
	ts := newTestServer(t)

	// Seed: a repo + a cheatsheet with an entry
	_ = ts.do(t, http.MethodPost, "/api/repos", map[string]any{
		"url": "https://github.com/charmbracelet/bubbletea",
	})
	_ = seedCapture(t, ts, capturePayload{
		Text:     "brew install bubbletea",
		TypeHint: "cli",
		WhySaved: "terminal UI experiments",
	})
	c := decodeJSON[cheatsheetResp](t, ts.do(t, http.MethodPost, "/api/cheatsheets", map[string]any{
		"slug": "tui-cheats", "title": "TUI cheats", "category": "tool",
	}))
	_ = ts.do(t, http.MethodPost, "/api/cheatsheets/"+c.ID.String()+"/entries", map[string]any{
		"label": "bubbletea quickstart", "command": "go get github.com/charmbracelet/bubbletea",
	})

	rec := ts.do(t, http.MethodGet, "/api/search?q=bubble", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("search: expected 200, got %d", rec.Code)
	}
	type searchResp struct {
		Query   string               `json:"query"`
		Results []store.SearchResult `json:"results"`
	}
	out := decodeJSON[searchResp](t, rec)
	if len(out.Results) == 0 {
		t.Fatal("expected at least one search result")
	}
	seen := map[string]bool{}
	for _, result := range out.Results {
		seen[result.Type] = true
	}
	if !seen["item"] {
		t.Fatalf("expected item result, got %+v", out.Results)
	}
}

func TestHandlers_Search_RequiresQuery(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodGet, "/api/search", nil)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

// ─── Stats ───

func TestHandlers_Stats_ReturnsAggregatesAndMood(t *testing.T) {
	ts := newTestServer(t)

	rec := ts.do(t, http.MethodGet, "/api/stats", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	if !strings.Contains(body, "mascot_mood") {
		t.Errorf("expected mascot_mood in response: %s", body)
	}
}

// Suppress "imported and not used" warnings if any helpers go unused.
var _ context.Context = nil
var _ = io.Discard
