package apiclient

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// helper — spin up an httptest.Server that serves a fixed response for
// a given method+path and records the last request for assertions.
type fakeBackend struct {
	server  *httptest.Server
	lastReq struct {
		method string
		path   string
		auth   string
		body   []byte
	}
}

func newFakeBackend(t *testing.T, handler http.HandlerFunc) *fakeBackend {
	t.Helper()
	fb := &fakeBackend{}
	fb.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fb.lastReq.method = r.Method
		fb.lastReq.path = r.URL.Path + func() string {
			if r.URL.RawQuery != "" {
				return "?" + r.URL.RawQuery
			}
			return ""
		}()
		fb.lastReq.auth = r.Header.Get("Authorization")
		fb.lastReq.body, _ = io.ReadAll(r.Body)
		handler(w, r)
	}))
	t.Cleanup(fb.server.Close)
	return fb
}

func TestCapture_SendsBearerAndBody(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{
			"item": {"id":"abc","item_type":"repo","title":"foo/bar","url":"https://github.com/foo/bar","enrichment_status":"queued"},
			"enrichment_status": "queued",
			"duplicate_of": null
		}`))
	})
	client := New(fb.server.URL, "my-token")

	res, err := client.Capture(context.Background(), CaptureInput{
		Source: "cli",
		URL:    "https://github.com/foo/bar",
		Tags:   []string{"go"},
	})
	if err != nil {
		t.Fatalf("Capture: %v", err)
	}
	if fb.lastReq.method != http.MethodPost {
		t.Errorf("method = %s, want POST", fb.lastReq.method)
	}
	if fb.lastReq.path != "/api/items/capture" {
		t.Errorf("path = %s", fb.lastReq.path)
	}
	if fb.lastReq.auth != "Bearer my-token" {
		t.Errorf("auth = %q", fb.lastReq.auth)
	}
	var sentBody CaptureInput
	if err := json.Unmarshal(fb.lastReq.body, &sentBody); err != nil {
		t.Fatalf("body json: %v", err)
	}
	if sentBody.URL != "https://github.com/foo/bar" {
		t.Errorf("url not threaded: %q", sentBody.URL)
	}
	if sentBody.Source != "cli" {
		t.Errorf("source not threaded: %q", sentBody.Source)
	}
	if res.Item == nil || res.Item.Type != "repo" {
		t.Errorf("item not decoded: %+v", res.Item)
	}
}

func TestCapture_DecodesDuplicate(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"item": null,
			"enrichment_status": "skipped",
			"duplicate_of": "00000000-0000-0000-0000-000000000001"
		}`))
	})
	client := New(fb.server.URL, "t")
	res, err := client.Capture(context.Background(), CaptureInput{URL: "https://x"})
	if err != nil {
		t.Fatalf("Capture: %v", err)
	}
	if res.DuplicateOf == "" {
		t.Error("expected DuplicateOf set")
	}
}

func TestCapture_SurfacesAPIError(t *testing.T) {
	newFB := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"error":{"code":"MISSING_INPUT","message":"either url or text is required"}}`))
	})
	client := New(newFB.server.URL, "t")
	_, err := client.Capture(context.Background(), CaptureInput{})
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("expected *APIError, got %T: %v", err, err)
	}
	if apiErr.Status != http.StatusUnprocessableEntity {
		t.Errorf("status = %d", apiErr.Status)
	}
	if apiErr.Code != "MISSING_INPUT" {
		t.Errorf("code = %q", apiErr.Code)
	}
}

func TestSearch_BuildsQueryString(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"query":"ripgrep","results":[{"type":"repo","id":"1","title":"ripgrep"}]}`))
	})
	client := New(fb.server.URL, "t")
	results, err := client.Search(context.Background(), "ripgrep turbo", 5, "")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if !strings.Contains(fb.lastReq.path, "q=ripgrep+turbo") {
		t.Errorf("query not escaped: %s", fb.lastReq.path)
	}
	if !strings.Contains(fb.lastReq.path, "limit=5") {
		t.Errorf("limit not sent: %s", fb.lastReq.path)
	}
	if len(results) != 1 {
		t.Errorf("results len = %d", len(results))
	}
}

func TestListRepos_BuildsFilters(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"total":1,"items":[{"id":"1","name":"foo","url":"https://github.com/u/foo","stars":42}]}`))
	})
	client := New(fb.server.URL, "t")
	repos, total, err := client.ListRepos(context.Background(), ListReposParams{
		Lang: "Go", Tag: "cli", Limit: 10,
	})
	if err != nil {
		t.Fatalf("ListRepos: %v", err)
	}
	if total != 1 {
		t.Errorf("total = %d", total)
	}
	if len(repos) != 1 {
		t.Errorf("len = %d", len(repos))
	}
	if !strings.Contains(fb.lastReq.path, "lang=Go") {
		t.Errorf("lang filter missing: %s", fb.lastReq.path)
	}
	if !strings.Contains(fb.lastReq.path, "tag=cli") {
		t.Errorf("tag filter missing: %s", fb.lastReq.path)
	}
	if !strings.Contains(fb.lastReq.path, "limit=10") {
		t.Errorf("limit missing: %s", fb.lastReq.path)
	}
}

func TestGetRepo_FetchesByID(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"id":"1","name":"foo","url":"https://github.com/u/foo","stars":42}`))
	})
	client := New(fb.server.URL, "t")
	repo, err := client.GetRepo(context.Background(), "repo-123")
	if err != nil {
		t.Fatalf("GetRepo: %v", err)
	}
	if fb.lastReq.path != "/api/repos/repo-123" {
		t.Errorf("path = %s", fb.lastReq.path)
	}
	if repo.URL != "https://github.com/u/foo" {
		t.Errorf("url = %q", repo.URL)
	}
}

func TestGetItem_FetchesByID(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"id":"1","item_type":"article","title":"rg docs","url":"https://rg.dev"}`))
	})
	client := New(fb.server.URL, "t")
	item, err := client.GetItem(context.Background(), "item-123")
	if err != nil {
		t.Fatalf("GetItem: %v", err)
	}
	if fb.lastReq.path != "/api/items/item-123" {
		t.Errorf("path = %s", fb.lastReq.path)
	}
	if item.URL == nil || *item.URL != "https://rg.dev" {
		t.Errorf("url = %+v", item.URL)
	}
}

func TestHealth_OK(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	client := New(fb.server.URL, "")
	if err := client.Health(context.Background()); err != nil {
		t.Fatalf("Health: %v", err)
	}
}

func TestHealth_Error(t *testing.T) {
	fb := newFakeBackend(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	})
	client := New(fb.server.URL, "")
	if err := client.Health(context.Background()); err == nil {
		t.Fatal("expected error on 503")
	}
}

func TestURLQueryEscape(t *testing.T) {
	cases := map[string]string{
		"hello":        "hello",
		"hello world":  "hello+world",
		"a=b":          "a%3Db",
		"a&b":          "a%26b",
		"café":         "caf%C3%A9",
	}
	for in, want := range cases {
		if got := urlQueryEscape(in); got != want {
			t.Errorf("urlQueryEscape(%q) = %q, want %q", in, got, want)
		}
	}
}
