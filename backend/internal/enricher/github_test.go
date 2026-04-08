package enricher

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// newTestEnricher constructs a GitHubEnricher pointed at the given httptest server.
func newTestEnricher(serverURL string) *GitHubEnricher {
	return newGitHubEnricher("test-token", serverURL, &http.Client{Timeout: 5 * time.Second})
}

func TestGitHubEnricher_Fetch_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/charmbracelet/bubbletea" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Errorf("expected Authorization header, got %q", got)
		}
		if got := r.Header.Get("X-GitHub-Api-Version"); got != "2022-11-28" {
			t.Errorf("missing api version header: %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"description": "A powerful little TUI framework",
			"language": "Go",
			"stargazers_count": 25000,
			"forks_count": 800,
			"homepage": "https://charm.sh",
			"topics": ["tui","go","bubble-tea"],
			"owner": {"avatar_url": "https://avatars.example/charmbracelet"}
		}`))
	}))
	defer srv.Close()

	en := newTestEnricher(srv.URL)
	md, err := en.Fetch(context.Background(), "charmbracelet", "bubbletea")
	if err != nil {
		t.Fatalf("Fetch failed: %v", err)
	}
	if md.Description == nil || *md.Description != "A powerful little TUI framework" {
		t.Errorf("unexpected description: %+v", md.Description)
	}
	if md.Language == nil || *md.Language != "Go" {
		t.Errorf("unexpected language: %+v", md.Language)
	}
	if md.Stars != 25000 {
		t.Errorf("expected 25000 stars, got %d", md.Stars)
	}
	if md.Forks != 800 {
		t.Errorf("expected 800 forks, got %d", md.Forks)
	}
	if len(md.Topics) != 3 {
		t.Errorf("expected 3 topics, got %d", len(md.Topics))
	}
	if md.AvatarURL == nil || *md.AvatarURL != "https://avatars.example/charmbracelet" {
		t.Errorf("unexpected avatar: %+v", md.AvatarURL)
	}
	// Go has a known color mapping
	if md.LanguageColor == nil {
		t.Error("expected LanguageColor for 'Go' to be populated")
	}
}

func TestGitHubEnricher_Fetch_NotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	en := newTestEnricher(srv.URL)
	_, err := en.Fetch(context.Background(), "ghost", "missing")
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestGitHubEnricher_Fetch_Forbidden(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	en := newTestEnricher(srv.URL)
	_, err := en.Fetch(context.Background(), "any", "any")
	if err == nil {
		t.Fatal("expected error on 403, got nil")
	}
}

func TestGitHubEnricher_FetchReadme_Success(t *testing.T) {
	// Base64 of "# Hello\nThis is the README"
	const encoded = "IyBIZWxsbwpUaGlzIGlzIHRoZSBSRUFETUU="
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/foo/bar/readme" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"content":"` + encoded + `","encoding":"base64"}`))
	}))
	defer srv.Close()

	en := newTestEnricher(srv.URL)
	md, err := en.FetchReadme(context.Background(), "foo", "bar")
	if err != nil {
		t.Fatalf("FetchReadme failed: %v", err)
	}
	if md != "# Hello\nThis is the README" {
		t.Errorf("unexpected readme: %q", md)
	}
}

func TestGitHubEnricher_FetchReadme_NotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	en := newTestEnricher(srv.URL)
	_, err := en.FetchReadme(context.Background(), "foo", "bar")
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestGitHubEnricher_FetchPackageScripts_Success(t *testing.T) {
	// Base64 of {"name":"x","scripts":{"dev":"vite","test":"vitest","build":"vite build"}}
	const encoded = "eyJuYW1lIjoieCIsInNjcmlwdHMiOnsiZGV2Ijoidml0ZSIsInRlc3QiOiJ2aXRlc3QiLCJidWlsZCI6InZpdGUgYnVpbGQifX0="
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/foo/bar/contents/package.json" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"content":"` + encoded + `","encoding":"base64"}`))
	}))
	defer srv.Close()

	en := newTestEnricher(srv.URL)
	scripts, err := en.FetchPackageScripts(context.Background(), "foo", "bar")
	if err != nil {
		t.Fatalf("FetchPackageScripts failed: %v", err)
	}
	if len(scripts) != 3 {
		t.Fatalf("expected 3 scripts, got %d", len(scripts))
	}
	got := map[string]string{}
	for _, s := range scripts {
		got[s.Name] = s.Command
	}
	if got["dev"] != "vite" || got["test"] != "vitest" || got["build"] != "vite build" {
		t.Errorf("unexpected scripts: %+v", got)
	}
}

func TestGitHubEnricher_FetchPackageScripts_Empty(t *testing.T) {
	// Base64 of {"name":"x","scripts":{}}
	const encoded = "eyJuYW1lIjoieCIsInNjcmlwdHMiOnt9fQ=="
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"content":"` + encoded + `","encoding":"base64"}`))
	}))
	defer srv.Close()

	en := newTestEnricher(srv.URL)
	_, err := en.FetchPackageScripts(context.Background(), "foo", "bar")
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound on empty scripts, got %v", err)
	}
}

func TestExtractGitHubOwnerRepo(t *testing.T) {
	cases := []struct {
		path        string
		owner, repo string
		ok          bool
	}{
		{"/foo/bar", "foo", "bar", true},
		{"/foo/bar.git", "foo", "bar", true},
		{"/foo", "", "", false},
		{"/", "", "", false},
		{"/foo/bar/baz", "foo", "bar", true},
	}
	for _, tc := range cases {
		owner, repo, ok := extractGitHubOwnerRepo(tc.path)
		if ok != tc.ok || owner != tc.owner || repo != tc.repo {
			t.Errorf("extractGitHubOwnerRepo(%q) = (%q, %q, %v), want (%q, %q, %v)",
				tc.path, owner, repo, ok, tc.owner, tc.repo, tc.ok)
		}
	}
}

func TestIsGitHubHost(t *testing.T) {
	if !isGitHubHost("github.com") {
		t.Error("github.com should be a GitHub host")
	}
	if !isGitHubHost("WWW.GITHUB.COM") {
		t.Error("WWW.GITHUB.COM should be a GitHub host")
	}
	if isGitHubHost("gitlab.com") {
		t.Error("gitlab.com is not a GitHub host")
	}
}
