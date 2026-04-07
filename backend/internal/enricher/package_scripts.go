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

// PackageScript is a single entry from package.json "scripts".
type PackageScript struct {
	Name    string `json:"name"`
	Command string `json:"command"`
}

// FetchPackageScripts hits the GitHub Contents API to grab package.json and
// extracts the "scripts" object.
//
//	GET https://api.github.com/repos/{owner}/{repo}/contents/package.json
func (g *GitHubEnricher) FetchPackageScripts(ctx context.Context, owner, repo string) ([]PackageScript, error) {
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/package.json", owner, repo)
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
		return nil, fmt.Errorf("github package.json: forbidden (rate limit?)")
	default:
		return nil, fmt.Errorf("github package.json: %s", resp.Status)
	}

	var body struct {
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode package.json response: %w", err)
	}

	var raw string
	if body.Encoding == "base64" {
		clean := strings.ReplaceAll(body.Content, "\n", "")
		decoded, err := base64.StdEncoding.DecodeString(clean)
		if err != nil {
			return nil, fmt.Errorf("decode base64 package.json: %w", err)
		}
		raw = string(decoded)
	} else {
		raw = body.Content
	}

	// Parse only the "scripts" field from package.json.
	var pkg struct {
		Scripts map[string]string `json:"scripts"`
	}
	if err := json.Unmarshal([]byte(raw), &pkg); err != nil {
		return nil, fmt.Errorf("parse package.json: %w", err)
	}
	if len(pkg.Scripts) == 0 {
		return nil, ErrNotFound
	}

	scripts := make([]PackageScript, 0, len(pkg.Scripts))
	for name, cmd := range pkg.Scripts {
		scripts = append(scripts, PackageScript{Name: name, Command: cmd})
	}
	return scripts, nil
}

// GetPackageScripts is the public entry point on Service. Only github.com URLs
// are supported; other sources return ErrNotFound.
func (s *Service) GetPackageScripts(ctx context.Context, rawURL string) ([]PackageScript, error) {
	u, err := url.Parse(rawURL)
	if err != nil || u.Host == "" {
		return nil, ErrInvalidURL
	}
	if !isGitHubHost(u.Host) {
		return nil, ErrNotFound
	}
	owner, repo, ok := extractGitHubOwnerRepo(u.Path)
	if !ok {
		return nil, ErrNotFound
	}
	return s.github.FetchPackageScripts(ctx, owner, repo)
}
