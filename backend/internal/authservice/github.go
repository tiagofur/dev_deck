package authservice

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"devdeck/internal/domain/auth"
)

// ExchangeGitHubCode exchanges an authorization code for an access token.
func (s *Service) ExchangeGitHubCode(ctx context.Context, clientID, clientSecret, code string) (string, error) {
	body := fmt.Sprintf(
		`{"client_id":"%s","client_secret":"%s","code":"%s"}`,
		clientID, clientSecret, code,
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://github.com/login/oauth/access_token", strings.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Error != "" {
		return "", fmt.Errorf("github oauth: %s", result.Error)
	}
	return result.AccessToken, nil
}

// FetchGitHubUser fetches the GitHub user profile for the given token.
func (s *Service) FetchGitHubUser(ctx context.Context, token string) (*auth.GitHubUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "DevDeck/0.1")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var ghUser auth.GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&ghUser); err != nil {
		return nil, err
	}
	return &ghUser, nil
}
