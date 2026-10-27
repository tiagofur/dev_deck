package enricher

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGitHubEnricher_SearchRepositories(t *testing.T) {
	var gotQuery, gotAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.Query().Get("q")
		gotAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"items": [{
			"full_name": "disintegration/imaging",
			"html_url": "https://github.com/disintegration/imaging",
			"description": "Simple Go imaging",
			"language": "Go",
			"stargazers_count": 4200,
			"forks_count": 300,
			"topics": ["go", "imaging"],
			"pushed_at": "2026-09-01T00:00:00Z",
			"owner": {"avatar_url": "https://avatars.example/u1"}
		}]}`))
	}))
	defer server.Close()

	g := newGitHubEnricher("tok", server.URL, server.Client())
	hits, err := g.SearchRepositories(context.Background(), SearchOptions{Query: "imaging language:go", PerPage: 5})
	if err != nil {
		t.Fatalf("SearchRepositories: %v", err)
	}
	if len(hits) != 1 {
		t.Fatalf("hits = %d, want 1", len(hits))
	}
	h := hits[0]
	if h.FullName != "disintegration/imaging" || h.Stars != 4200 || h.Language != "Go" {
		t.Fatalf("hit = %+v", h)
	}
	if len(h.Topics) != 2 || h.AvatarURL == "" {
		t.Fatalf("hit topics/avatar = %+v", h)
	}
	if gotQuery != "imaging language:go" {
		t.Errorf("q = %q", gotQuery)
	}
	if gotAuth != "Bearer tok" {
		t.Errorf("auth header = %q", gotAuth)
	}
}

func TestGitHubEnricher_SearchRateLimited(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Retry-After", "30")
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	g := newGitHubEnricher("", server.URL, server.Client())
	_, err := g.SearchRepositories(context.Background(), SearchOptions{Query: "x"})
	if err != ErrGitHubRateLimited && err.Error() != "github search rate limit exceeded: retry in 30s" {
		t.Fatalf("err = %v, want ErrGitHubRateLimited", err)
	}
}
