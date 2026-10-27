package enricher

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// ErrGitHubRateLimited signals the search API quota is spent. Callers map
// it to 429 so clients back off instead of seeing a generic 500.
var ErrGitHubRateLimited = errors.New("github search rate limit exceeded")

// SearchOptions bounds a repository search request.
type SearchOptions struct {
	// Query is the full GitHub search string, qualifiers included.
	Query string
	// PerPage caps results (GitHub max 100, we default far lower).
	PerPage int
}

// SearchHit is one ranked repository from /search/repositories.
type SearchHit struct {
	FullName    string   `json:"full_name"`
	HTMLURL     string   `json:"html_url"`
	Description string   `json:"description"`
	Language    string   `json:"language"`
	Stars       int      `json:"stars"`
	Forks       int      `json:"forks"`
	Topics      []string `json:"topics"`
	PushedAt    string   `json:"pushed_at"`
	AvatarURL   string   `json:"avatar_url"`
}

// SearchRepositories queries GET /search/repositories. The query string is
// built server-side (never raw user input) by the discovery layer.
func (g *GitHubEnricher) SearchRepositories(ctx context.Context, opts SearchOptions) ([]SearchHit, error) {
	if g == nil {
		return nil, errors.New("github enricher not configured")
	}
	perPage := opts.PerPage
	if perPage <= 0 || perPage > 30 {
		perPage = 10
	}
	params := url.Values{}
	params.Set("q", opts.Query)
	params.Set("per_page", strconv.Itoa(perPage))
	params.Set("sort", "stars")
	params.Set("order", "desc")

	apiURL := fmt.Sprintf("%s/search/repositories?%s", g.apiBase, params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "HeapDeck/0.1")
	if g.token != "" {
		req.Header.Set("Authorization", "Bearer "+g.token)
	}

	resp, err := g.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	switch resp.StatusCode {
	case http.StatusOK:
		// continue
	case http.StatusForbidden:
		// Search has its own quota (30 req/min authenticated, 10 anon).
		// Honor Retry-After when present so callers can surface it.
		if wait := resp.Header.Get("Retry-After"); wait != "" {
			if secs, convErr := strconv.Atoi(wait); convErr == nil && secs > 0 {
				return nil, fmt.Errorf("%w: retry in %ds", ErrGitHubRateLimited, secs)
			}
		}
		return nil, ErrGitHubRateLimited
	case http.StatusUnprocessableEntity:
		return nil, errors.New("github rejected the search query")
	default:
		return nil, fmt.Errorf("github search api: %s", resp.Status)
	}

	var decoded struct {
		Items []struct {
			FullName        string   `json:"full_name"`
			HTMLURL         string   `json:"html_url"`
			Description     *string  `json:"description"`
			Language        *string  `json:"language"`
			StargazersCount int      `json:"stargazers_count"`
			ForksCount      int      `json:"forks_count"`
			Topics          []string `json:"topics"`
			PushedAt        string   `json:"pushed_at"`
			Owner           struct {
				AvatarURL string `json:"avatar_url"`
			} `json:"owner"`
		} `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, fmt.Errorf("decode github search response: %w", err)
	}

	hits := make([]SearchHit, 0, len(decoded.Items))
	for _, it := range decoded.Items {
		hit := SearchHit{
			FullName: it.FullName,
			HTMLURL:  it.HTMLURL,
			Stars:    it.StargazersCount,
			Forks:    it.ForksCount,
			Topics:   it.Topics,
			PushedAt: it.PushedAt,
		}
		if it.Description != nil {
			hit.Description = *it.Description
		}
		if it.Language != nil {
			hit.Language = *it.Language
		}
		if hit.Topics == nil {
			hit.Topics = []string{}
		}
		hit.AvatarURL = it.Owner.AvatarURL
		hits = append(hits, hit)
	}
	return hits, nil
}

// SearchGitHub exposes repository search on the Service so handlers don't
// reach into the unexported github client.
func (s *Service) SearchGitHub(ctx context.Context, opts SearchOptions) ([]SearchHit, error) {
	if s == nil || s.github == nil {
		return nil, errors.New("github search not configured")
	}
	// Bound the call tighter than the client's 10s: discovery is
	// synchronous in the request path.
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	return s.github.SearchRepositories(ctx, opts)
}
