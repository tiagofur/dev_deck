package enricher

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// FetchReadme hits the GitHub Contents API to grab the README of a repo.
//
//	GET https://api.github.com/repos/{owner}/{repo}/readme
//
// The response embeds the README content base64-encoded; we decode and
// return it as raw markdown.
func (g *GitHubEnricher) FetchReadme(ctx context.Context, owner, repo string) (string, error) {
	if err := validateOwnerRepo(owner, repo); err != nil {
		return "", err
	}
	apiURL := fmt.Sprintf("%s/repos/%s/%s/readme", g.apiBase, owner, repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "DevDeck/0.1")
	if g.token != "" {
		req.Header.Set("Authorization", "Bearer "+g.token)
	}

	resp, err := g.httpc.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		// continue
	case http.StatusNotFound:
		return "", ErrNotFound
	case http.StatusForbidden:
		return "", fmt.Errorf("github readme: forbidden (rate limit?)")
	default:
		return "", fmt.Errorf("github readme: %s", resp.Status)
	}

	var body struct {
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", fmt.Errorf("decode readme response: %w", err)
	}
	if body.Encoding != "base64" {
		// Some endpoints return raw — defensive fallback.
		return body.Content, nil
	}
	// GitHub wraps base64 lines with \n; remove them before decoding.
	clean := strings.ReplaceAll(body.Content, "\n", "")
	decoded, err := base64.StdEncoding.DecodeString(clean)
	if err != nil {
		return "", fmt.Errorf("decode base64: %w", err)
	}
	return string(decoded), nil
}

// GetReadme is the public entry point on Service. Only github.com URLs
// have a README via API; other URLs return ErrNotFound so the handler
// can map to a clean 404.
func (s *Service) GetReadme(ctx context.Context, rawURL string) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil || u.Host == "" {
		return "", ErrInvalidURL
	}
	if !isGitHubHost(u.Host) {
		return "", ErrNotFound
	}
	owner, repo, ok := extractGitHubOwnerRepo(u.Path)
	if !ok {
		return "", ErrNotFound
	}
	return s.github.FetchReadme(ctx, owner, repo)
}
