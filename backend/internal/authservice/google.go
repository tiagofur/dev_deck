package authservice

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"heapdeck/internal/domain/auth"
)

// ExchangeGoogleCode exchanges an OAuth authorization code for tokens at
// accounts.google.com. redirectURI must be the exact callback URL used to
// start the flow — Google rejects mismatches.
func (s *Service) ExchangeGoogleCode(ctx context.Context, clientID, clientSecret, redirectURI, code string) (string, error) {
	form := url.Values{
		"code":          {code},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	var result struct {
		AccessToken      string `json:"access_token"`
		Error            string `json:"error"`
		ErrorDescription string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode google token response: %w", err)
	}
	if result.AccessToken == "" {
		if result.Error != "" {
			return "", fmt.Errorf("google oauth: %s: %s", result.Error, result.ErrorDescription)
		}
		return "", fmt.Errorf("google oauth: no access token in response")
	}
	return result.AccessToken, nil
}

// FetchGoogleUser calls the OIDC userinfo endpoint. The email returned by
// these scopes is always Google-verified.
func (s *Service) FetchGoogleUser(ctx context.Context, token string) (*auth.GoogleUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var gUser auth.GoogleUser
	if err := json.NewDecoder(resp.Body).Decode(&gUser); err != nil {
		return nil, fmt.Errorf("decode google userinfo: %w", err)
	}
	if gUser.Sub == "" {
		return nil, fmt.Errorf("google userinfo: missing sub claim")
	}
	return &gUser, nil
}
