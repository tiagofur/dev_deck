// Package enricher fetches metadata for a repo URL.
//
// Two strategies:
//   - GitHub: hits the public REST API (api.github.com/repos/{owner}/{repo}).
//     Authenticated with $GITHUB_TOKEN if set (5000 req/h vs 60 anonymous).
//   - Generic: fetches the page HTML and parses Open Graph <meta> tags.
//
// The Service.Enrich entry point dispatches based on the URL host.
// Errors are returned but callers are expected to treat enrichment as
// best-effort: a failure should not block creating a repo.
package enricher

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"devdeck/internal/domain/repos"
)

var (
	ErrInvalidURL = errors.New("invalid url")
	ErrNotFound   = errors.New("upstream not found")
)

type Service struct {
	github  *GitHubEnricher
	generic *OpenGraphEnricher
}

func New(githubToken string) *Service {
	httpc := &http.Client{Timeout: 10 * time.Second}
	return &Service{
		github:  &GitHubEnricher{token: githubToken, httpc: httpc},
		generic: &OpenGraphEnricher{httpc: httpc},
	}
}

// Enrich resolves metadata for the given URL. Returns ErrInvalidURL if the
// URL can't be parsed; other errors come from the underlying strategy.
func (s *Service) Enrich(ctx context.Context, rawURL string) (*repos.Metadata, error) {
	u, err := url.Parse(rawURL)
	if err != nil || u.Host == "" {
		return nil, ErrInvalidURL
	}
	if isGitHubHost(u.Host) {
		owner, repo, ok := extractGitHubOwnerRepo(u.Path)
		if ok {
			return s.github.Fetch(ctx, owner, repo)
		}
		// github.com but not /owner/repo (e.g. github.com/explore) → fall through
	}
	return s.generic.Fetch(ctx, rawURL)
}

func isGitHubHost(host string) bool {
	h := strings.ToLower(host)
	return h == "github.com" || h == "www.github.com"
}

func extractGitHubOwnerRepo(path string) (owner, repo string, ok bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	repo = strings.TrimSuffix(parts[1], ".git")
	return parts[0], repo, true
}
