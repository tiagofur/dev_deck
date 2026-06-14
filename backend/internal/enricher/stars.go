package enricher

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// StarredRepo is the subset of GET /users/{username}/starred we import.
type StarredRepo struct {
	FullName    string   `json:"full_name"`
	HTMLURL     string   `json:"html_url"`
	Description *string  `json:"description"`
	Language    *string  `json:"language"`
	Stars       int      `json:"stargazers_count"`
	Forks       int      `json:"forks_count"`
	Topics      []string `json:"topics"`
	Owner       struct {
		AvatarURL string `json:"avatar_url"`
	} `json:"owner"`
}

// ListStarred fetches up to maxRepos of a user's public starred repos.
// It uses the server-side GitHub token when configured (the same one the
// enricher uses), so no user OAuth token ever needs to be stored.
func (s *Service) ListStarred(ctx context.Context, username string, maxRepos int) ([]StarredRepo, error) {
	return s.github.listStarred(ctx, username, maxRepos)
}

const starredPerPage = 100

func (g *GitHubEnricher) listStarred(ctx context.Context, username string, maxRepos int) ([]StarredRepo, error) {
	if username == "" {
		return nil, fmt.Errorf("username is required")
	}
	if maxRepos <= 0 {
		maxRepos = starredPerPage
	}

	var all []StarredRepo
	for page := 1; len(all) < maxRepos; page++ {
		endpoint := fmt.Sprintf(
			"%s/users/%s/starred?per_page=%d&page=%d",
			g.apiBase, url.PathEscape(username), starredPerPage, page,
		)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/vnd.github+json")
		if g.token != "" {
			req.Header.Set("Authorization", "Bearer "+g.token)
		}

		resp, err := g.httpc.Do(req)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode == http.StatusNotFound {
			_ = resp.Body.Close()
			return nil, fmt.Errorf("github user %q not found", username)
		}
		if resp.StatusCode != http.StatusOK {
			_ = resp.Body.Close()
			return nil, fmt.Errorf("github starred request failed with status %d", resp.StatusCode)
		}

		var pageRepos []StarredRepo
		err = json.NewDecoder(resp.Body).Decode(&pageRepos)
		_ = resp.Body.Close()
		if err != nil {
			return nil, err
		}

		all = append(all, pageRepos...)
		if len(pageRepos) < starredPerPage {
			break
		}
	}

	if len(all) > maxRepos {
		all = all[:maxRepos]
	}
	return all, nil
}
