package enricher

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"

	"devdeck/internal/domain/repos"
)

// ErrInvalidGitHubIdentifier is returned when owner/repo doesn't match
// the GitHub-allowed character set. Rejecting early keeps us from
// issuing requests for user-supplied garbage and incidentally blocks
// path-traversal attempts like "../../secrets".
var ErrInvalidGitHubIdentifier = errors.New("invalid github owner/repo")

// githubIdentRE is the character class GitHub allows for owner/repo
// names: letters, digits, dot, dash, underscore. Length is capped at
// 100 to match what GitHub actually accepts.
var githubIdentRE = regexp.MustCompile(`^[A-Za-z0-9._-]{1,100}$`)

// validateOwnerRepo rejects any identifier that doesn't match the GitHub
// character set. Used by Fetch, FetchReadme, and FetchPackageScripts.
func validateOwnerRepo(owner, repo string) error {
	if !githubIdentRE.MatchString(owner) || !githubIdentRE.MatchString(repo) {
		return ErrInvalidGitHubIdentifier
	}
	return nil
}

type GitHubEnricher struct {
	token   string
	apiBase string // e.g. "https://api.github.com" — overridable for tests
	httpc   *http.Client
}

// ghRepoResp is a partial schema of the GitHub /repos endpoint.
// We only decode the fields we actually use.
type ghRepoResp struct {
	Description     *string  `json:"description"`
	Language        *string  `json:"language"`
	StargazersCount int      `json:"stargazers_count"`
	ForksCount      int      `json:"forks_count"`
	Homepage        *string  `json:"homepage"`
	Topics          []string `json:"topics"`
	Owner           struct {
		AvatarURL string `json:"avatar_url"`
	} `json:"owner"`
}

func (g *GitHubEnricher) Fetch(ctx context.Context, owner, repo string) (*repos.Metadata, error) {
	if err := validateOwnerRepo(owner, repo); err != nil {
		return nil, err
	}
	apiURL := fmt.Sprintf("%s/repos/%s/%s", g.apiBase, owner, repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "DevDeck/0.1")
	if g.token != "" {
		req.Header.Set("Authorization", "Bearer "+g.token)
	}

	resp, err := g.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		// continue
	case http.StatusNotFound:
		return nil, ErrNotFound
	case http.StatusForbidden:
		return nil, fmt.Errorf("github api: forbidden (rate limit? set GITHUB_TOKEN)")
	default:
		return nil, fmt.Errorf("github api: %s", resp.Status)
	}

	var r ghRepoResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return nil, fmt.Errorf("decode github response: %w", err)
	}

	md := &repos.Metadata{
		Description: nilIfEmptyPtr(r.Description),
		Language:    nilIfEmptyPtr(r.Language),
		Stars:       r.StargazersCount,
		Forks:       r.ForksCount,
		Homepage:    nilIfEmptyPtr(r.Homepage),
		Topics:      r.Topics,
	}
	if r.Owner.AvatarURL != "" {
		a := r.Owner.AvatarURL
		md.AvatarURL = &a
	}
	if md.Language != nil {
		if c, ok := languageColors[*md.Language]; ok {
			cc := c
			md.LanguageColor = &cc
		}
	}
	if md.Topics == nil {
		md.Topics = []string{}
	}
	return md, nil
}

// nilIfEmptyPtr collapses *string("") into nil so the DB stores NULL
// rather than an empty string.
func nilIfEmptyPtr(s *string) *string {
	if s == nil || *s == "" {
		return nil
	}
	return s
}
