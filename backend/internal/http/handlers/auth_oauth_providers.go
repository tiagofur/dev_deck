package handlers

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"devdeck/internal/domain/auth"

	"github.com/golang-jwt/jwt/v5"
)

func (h *AuthHandler) buildAuthURL(provider auth.Provider, state auth.OAuthState) (string, error) {
	switch provider {
	case auth.ProviderGitHub:
		return buildURL("https://github.com/login/oauth/authorize", map[string]string{
			"client_id":    h.config.GitHubClientID,
			"redirect_uri": h.config.GitHubOAuthCallbackURL,
			"state":        state.State,
			"scope":        "read:user user:email",
		}), nil
	case auth.ProviderGoogle:
		return buildURL("https://accounts.google.com/o/oauth2/v2/auth", map[string]string{
			"client_id":     h.config.GoogleClientID,
			"redirect_uri":  h.config.GoogleOAuthCallbackURL,
			"response_type": "code",
			"scope":         "openid email profile",
			"state":         state.State,
			"access_type":   "offline",
			"prompt":        "consent",
		}), nil
	case auth.ProviderApple:
		return buildURL("https://appleid.apple.com/auth/authorize", map[string]string{
			"client_id":     h.config.AppleClientID,
			"redirect_uri":  h.config.AppleOAuthCallbackURL,
			"response_type": "code",
			"response_mode": "form_post",
			"scope":         "name email",
			"state":         state.State,
		}), nil
	default:
		return "", fmt.Errorf("unsupported provider %q", provider)
	}
}

func (h *AuthHandler) fetchExternalIdentity(r *http.Request, provider auth.Provider, code string) (*auth.ExternalIdentity, error) {
	switch provider {
	case auth.ProviderGitHub:
		token, err := h.exchangeOAuthCode(r, "https://github.com/login/oauth/access_token", url.Values{
			"client_id":     {h.config.GitHubClientID},
			"client_secret": {h.config.GitHubClientSecret},
			"code":          {code},
			"redirect_uri":  {h.config.GitHubOAuthCallbackURL},
		})
		if err != nil {
			return nil, err
		}
		return h.fetchGitHubIdentity(r, token)
	case auth.ProviderGoogle:
		token, err := h.exchangeOAuthCode(r, "https://oauth2.googleapis.com/token", url.Values{
			"client_id":     {h.config.GoogleClientID},
			"client_secret": {h.config.GoogleClientSecret},
			"code":          {code},
			"grant_type":    {"authorization_code"},
			"redirect_uri":  {h.config.GoogleOAuthCallbackURL},
		})
		if err != nil {
			return nil, err
		}
		return h.fetchGoogleIdentity(r, token)
	case auth.ProviderApple:
		clientSecret, err := h.appleClientSecret()
		if err != nil {
			return nil, err
		}
		tokenResp, err := h.exchangeOAuthTokenJSON(r, "https://appleid.apple.com/auth/token", url.Values{
			"client_id":     {h.config.AppleClientID},
			"client_secret": {clientSecret},
			"code":          {code},
			"grant_type":    {"authorization_code"},
			"redirect_uri":  {h.config.AppleOAuthCallbackURL},
		})
		if err != nil {
			return nil, err
		}
		return h.fetchAppleIdentity(r, tokenResp.IDToken)
	default:
		return nil, fmt.Errorf("unsupported provider %q", provider)
	}
}

type oauthTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	Error       string `json:"error"`
}

func (h *AuthHandler) exchangeOAuthCode(r *http.Request, endpoint string, values url.Values) (string, error) {
	resp, err := h.exchangeOAuthTokenJSON(r, endpoint, values)
	if err != nil {
		return "", err
	}
	if resp.AccessToken == "" {
		return "", errors.New("oauth provider returned empty access token")
	}
	return resp.AccessToken, nil
}

func (h *AuthHandler) exchangeOAuthTokenJSON(r *http.Request, endpoint string, values url.Values) (*oauthTokenResponse, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, endpoint, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out oauthTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("oauth provider error: %s", out.Error)
	}
	return &out, nil
}

func (h *AuthHandler) fetchGitHubIdentity(r *http.Request, token string) (*auth.ExternalIdentity, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "DevDeck/0.1")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var profile struct {
		ID        int64           `json:"id"`
		Login     string          `json:"login"`
		AvatarURL string          `json:"avatar_url"`
		Name      string          `json:"name"`
		Raw       json.RawMessage `json:"-"`
	}
	raw, err := readRawJSON(resp)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &profile); err != nil {
		return nil, err
	}

	email, verified, err := h.fetchGitHubVerifiedEmail(r, token)
	if err != nil {
		return nil, err
	}

	return &auth.ExternalIdentity{
		Provider:       auth.ProviderGitHub,
		ProviderUserID: fmt.Sprintf("%d", profile.ID),
		Email:          email,
		EmailVerified:  verified,
		ProviderLogin:  profile.Login,
		DisplayName:    profile.Name,
		AvatarURL:      profile.AvatarURL,
		ProfileJSON:    raw,
	}, nil
}

func (h *AuthHandler) fetchGitHubVerifiedEmail(r *http.Request, token string) (*string, bool, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, "https://api.github.com/user/emails", nil)
	if err != nil {
		return nil, false, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "DevDeck/0.1")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()

	var emails []struct {
		Email    string `json:"email"`
		Verified bool   `json:"verified"`
		Primary  bool   `json:"primary"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return nil, false, err
	}
	for _, candidate := range emails {
		if candidate.Verified && candidate.Primary {
			return &candidate.Email, true, nil
		}
	}
	for _, candidate := range emails {
		if candidate.Verified {
			return &candidate.Email, true, nil
		}
	}
	return nil, false, nil
}

func (h *AuthHandler) fetchGoogleIdentity(r *http.Request, token string) (*auth.ExternalIdentity, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, "https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := readRawJSON(resp)
	if err != nil {
		return nil, err
	}
	var profile struct {
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := json.Unmarshal(raw, &profile); err != nil {
		return nil, err
	}
	email := nullableString(profile.Email)
	return &auth.ExternalIdentity{
		Provider:       auth.ProviderGoogle,
		ProviderUserID: profile.Sub,
		Email:          email,
		EmailVerified:  profile.EmailVerified,
		DisplayName:    profile.Name,
		AvatarURL:      profile.Picture,
		ProfileJSON:    raw,
	}, nil
}

func (h *AuthHandler) fetchAppleIdentity(r *http.Request, idToken string) (*auth.ExternalIdentity, error) {
	if strings.TrimSpace(idToken) == "" {
		return nil, errors.New("apple token exchange returned empty id_token")
	}
	claims := jwt.MapClaims{}
	if _, _, err := new(jwt.Parser).ParseUnverified(idToken, claims); err != nil {
		return nil, fmt.Errorf("parse apple id_token: %w", err)
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return nil, errors.New("apple id_token missing sub")
	}
	var email *string
	if rawEmail, ok := claims["email"].(string); ok {
		email = nullableString(rawEmail)
	}
	verified := false
	switch v := claims["email_verified"].(type) {
	case bool:
		verified = v
	case string:
		verified = strings.EqualFold(v, "true")
	}
	displayName := extractAppleDisplayName(r.FormValue("user"), email)
	return &auth.ExternalIdentity{
		Provider:       auth.ProviderApple,
		ProviderUserID: sub,
		Email:          email,
		EmailVerified:  verified,
		DisplayName:    displayName,
		ProfileJSON:    json.RawMessage(fmt.Sprintf(`{"id_token":%q}`, idToken)),
	}, nil
}

func (h *AuthHandler) appleClientSecret() (string, error) {
	block, _ := pem.Decode([]byte(h.config.ApplePrivateKey))
	if block == nil {
		return "", errors.New("invalid APPLE_PRIVATE_KEY PEM")
	}
	keyAny, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return "", fmt.Errorf("parse APPLE_PRIVATE_KEY: %w", err)
	}
	key, ok := keyAny.(*ecdsa.PrivateKey)
	if !ok {
		return "", errors.New("APPLE_PRIVATE_KEY must be an EC private key")
	}
	now := time.Now()
	claims := jwt.MapClaims{
		"iss": h.config.AppleTeamID,
		"iat": now.Unix(),
		"exp": now.Add(5 * time.Minute).Unix(),
		"aud": "https://appleid.apple.com",
		"sub": h.config.AppleClientID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = h.config.AppleKeyID
	signed, err := token.SignedString(key)
	if err != nil {
		return "", err
	}
	return signed, nil
}

func buildURL(base string, params map[string]string) string {
	u, _ := url.Parse(base)
	q := u.Query()
	for key, value := range params {
		if strings.TrimSpace(value) == "" {
			continue
		}
		q.Set(key, value)
	}
	u.RawQuery = q.Encode()
	return u.String()
}

func readRawJSON(resp *http.Response) (json.RawMessage, error) {
	defer resp.Body.Close()
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(resp.Body); err != nil {
		return nil, err
	}
	return json.RawMessage(buf.Bytes()), nil
}

func nullableString(v string) *string {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	s := strings.TrimSpace(v)
	return &s
}

func extractAppleDisplayName(rawUser string, fallbackEmail *string) string {
	if strings.TrimSpace(rawUser) != "" {
		var payload struct {
			Name struct {
				FirstName string `json:"firstName"`
				LastName  string `json:"lastName"`
			} `json:"name"`
		}
		if err := json.Unmarshal([]byte(rawUser), &payload); err == nil {
			name := strings.TrimSpace(strings.TrimSpace(payload.Name.FirstName) + " " + strings.TrimSpace(payload.Name.LastName))
			if name != "" {
				return name
			}
		}
	}
	if fallbackEmail != nil {
		return *fallbackEmail
	}
	return ""
}
