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
	"regexp"
	"strings"
	"time"

	"devdeck/internal/domain/repos"
)

var (
	ErrInvalidURL = errors.New("invalid url")
	ErrNotFound   = errors.New("upstream not found")
)

type ExternalEnricher interface {
	Name() string
	URLPattern() string
	Fetch(ctx context.Context, rawURL string) (*repos.Metadata, error)
}

type Service struct {
	github   *GitHubEnricher
	generic  *OpenGraphEnricher
	external []ExternalEnricher
}

func (s *Service) SetExternalEnrichers(ext []ExternalEnricher) {
	s.external = ext
}

// defaultGitHubAPIBase is the public GitHub REST API root. Tests inject a
// different base via newGitHubEnricher to point at an httptest.Server.
const defaultGitHubAPIBase = "https://api.github.com"

func New(githubToken string) *Service {
	return NewWithGitHubBase(githubToken, defaultGitHubAPIBase)
}

// NewWithGitHubBase is a constructor that allows overriding the GitHub REST
// API root URL. Tests use it to point at an httptest.Server. Production code
// should use New, which defaults to the real api.github.com.
//
// The returned Service uses the SSRF-hardened transport for the generic
// Open Graph scraper. GitHub calls use a separate client because they
// always target api.github.com and never see user-supplied hosts.
func NewWithGitHubBase(githubToken, githubAPIBase string) *Service {
	genericClient := &http.Client{
		Timeout:   10 * time.Second,
		Transport: ssrfSafeTransport(10 * time.Second),
	}
	githubClient := &http.Client{Timeout: 10 * time.Second}
	return &Service{
		github:  newGitHubEnricher(githubToken, githubAPIBase, githubClient),
		generic: &OpenGraphEnricher{httpc: genericClient},
	}
}

// NewForTest constructs a Service whose generic scraper allows loopback /
// private IPs, so httptest-backed tests can point Enrich at 127.0.0.1
// without tripping the SSRF guard. NEVER call from production code.
func NewForTest(githubAPIBase string) *Service {
	httpc := &http.Client{Timeout: 10 * time.Second}
	return &Service{
		github:  newGitHubEnricher("", githubAPIBase, httpc),
		generic: &OpenGraphEnricher{httpc: httpc, allowInternal: true},
	}
}

// newGitHubEnricher constructs a GitHubEnricher with an explicit API base.
// Exposed at package level so tests can stand up an httptest.Server.
func newGitHubEnricher(token, apiBase string, httpc *http.Client) *GitHubEnricher {
	if apiBase == "" {
		apiBase = defaultGitHubAPIBase
	}
	return &GitHubEnricher{token: token, apiBase: apiBase, httpc: httpc}
}

// Enrich resolves metadata for the given URL. Returns ErrInvalidURL if the
// URL can't be parsed; other errors come from the underlying strategy.
func (s *Service) Enrich(ctx context.Context, rawURL string, extra []ExternalEnricher) (*repos.Metadata, error) {
	// 1. Try external plugins first
	allExternal := append([]ExternalEnricher{}, s.external...)
	allExternal = append(allExternal, extra...)

	for _, ext := range allExternal {
		matched, _ := regexp.MatchString(ext.URLPattern(), rawURL)
		if matched {
			md, err := ext.Fetch(ctx, rawURL)
			if err == nil && md != nil {
				return md, nil
			}
		}
	}

	// 2. Built-in providers
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
