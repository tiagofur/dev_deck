package enricher

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"devdeck/internal/domain/repos"
)

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
