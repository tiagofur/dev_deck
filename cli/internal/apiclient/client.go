// Package apiclient is a thin HTTP wrapper over the DevDeck REST API.
// It's deliberately simple — no retries, no rate limiting, no
// codegen — because the CLI does one request per command and the
// ergonomic budget is "fits on a laptop screen".
package apiclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client holds the base URL and bearer token. Create one per command
// via New(); it's safe to reuse but not worth pooling.
type Client struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

// New constructs a Client with a 15-second default timeout.
func New(baseURL, token string) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Token:   token,
		HTTP:    &http.Client{Timeout: 15 * time.Second},
	}
}

// APIError is the structured error the backend returns when it can't
// satisfy a request. We flatten the nested {error:{code,message}}
// envelope into a flat Go type for ergonomic comparisons.
type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("api %d %s: %s", e.Status, e.Code, e.Message)
}

// ─── Capture ───

// CaptureInput mirrors backend/internal/domain/items.CaptureInput.
// We keep the struct small and only expose the fields the CLI sets.
type CaptureInput struct {
	Source    string   `json:"source,omitempty"`
	URL       string   `json:"url,omitempty"`
	Text      string   `json:"text,omitempty"`
	TitleHint string   `json:"title_hint,omitempty"`
	TypeHint  string   `json:"type_hint,omitempty"`
	Tags      []string `json:"tags,omitempty"`
	WhySaved  string   `json:"why_saved,omitempty"`
}

// Item is a subset of the backend item type. We only decode the
// fields the CLI prints; the rest stays in Raw for future use.
type Item struct {
	ID               string `json:"id"`
	Type             string `json:"item_type"`
	Title            string `json:"title"`
	URL              string `json:"url"`
	EnrichmentStatus string `json:"enrichment_status"`
}

// CaptureResponse mirrors backend's CaptureResponse.
type CaptureResponse struct {
	Item             *Item  `json:"item"`
	EnrichmentStatus string `json:"enrichment_status"`
	DuplicateOf      string `json:"duplicate_of"`
}

// Capture sends a POST /api/items/capture. Success returns the server's
// response; on 2xx errors the backend's envelope is surfaced as *APIError.
func (c *Client) Capture(ctx context.Context, in CaptureInput) (*CaptureResponse, error) {
	var out CaptureResponse
	if err := c.do(ctx, http.MethodPost, "/api/items/capture", in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ─── Search ───

// SearchResult mirrors backend/internal/store.SearchResult.
type SearchResult struct {
	Type     string `json:"type"`
	ID       string `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Extra    string `json:"extra"`
}

type searchResponse struct {
	Query   string         `json:"query"`
	Results []SearchResult `json:"results"`
}

// Search hits GET /api/search. Empty query returns an error upstream.
func (c *Client) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	var body searchResponse
	path := fmt.Sprintf("/api/search?q=%s&limit=%d", urlQueryEscape(query), limit)
	if err := c.do(ctx, http.MethodGet, path, nil, &body); err != nil {
		return nil, err
	}
	return body.Results, nil
}

// ─── Repos (legacy list endpoint) ───
//
// There is no /api/items list endpoint yet (that ships in Ola 5).
// For `devdeck list` we use the existing /api/repos endpoint so the
// CLI has something to show today.

type ListReposParams struct {
	Query string
	Tag   string
	Lang  string
	Limit int
}

type Repo struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Owner       *string  `json:"owner"`
	URL         string   `json:"url"`
	Description *string  `json:"description"`
	Language    *string  `json:"language"`
	Stars       int      `json:"stars"`
	Tags        []string `json:"tags"`
}

type listReposResponse struct {
	Total int    `json:"total"`
	Items []Repo `json:"items"`
}

// ListRepos returns the user's repos from /api/repos.
func (c *Client) ListRepos(ctx context.Context, p ListReposParams) ([]Repo, int, error) {
	q := make([]string, 0, 4)
	if p.Query != "" {
		q = append(q, "q="+urlQueryEscape(p.Query))
	}
	if p.Tag != "" {
		q = append(q, "tag="+urlQueryEscape(p.Tag))
	}
	if p.Lang != "" {
		q = append(q, "lang="+urlQueryEscape(p.Lang))
	}
	if p.Limit > 0 {
		q = append(q, fmt.Sprintf("limit=%d", p.Limit))
	}
	path := "/api/repos"
	if len(q) > 0 {
		path += "?" + strings.Join(q, "&")
	}
	var body listReposResponse
	if err := c.do(ctx, http.MethodGet, path, nil, &body); err != nil {
		return nil, 0, err
	}
	return body.Items, body.Total, nil
}

// ─── Health ───

// Health hits GET /healthz. Used by `devdeck status` as a liveness check.
// The endpoint is public so the token is optional here.
func (c *Client) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/healthz", nil)
	if err != nil {
		return err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("healthz returned %s", resp.Status)
	}
	return nil
}

// ─── internals ───

// do handles the common request dance: marshal, auth, decode, error envelope.
func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	var buf io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal body: %w", err)
		}
		buf = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, buf)
	if err != nil {
		return err
	}
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "devdeck-cli/0.1")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("%s %s: %w", method, path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return decodeAPIError(resp)
	}
	if out != nil && resp.StatusCode != http.StatusNoContent {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return fmt.Errorf("decode response: %w", err)
		}
	}
	return nil
}

func decodeAPIError(resp *http.Response) error {
	var envelope struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	body, _ := io.ReadAll(resp.Body)
	_ = json.Unmarshal(body, &envelope)
	apiErr := &APIError{
		Status:  resp.StatusCode,
		Code:    envelope.Error.Code,
		Message: envelope.Error.Message,
	}
	if apiErr.Code == "" {
		apiErr.Code = "UNKNOWN"
	}
	if apiErr.Message == "" {
		apiErr.Message = resp.Status
	}
	return apiErr
}

// urlQueryEscape delegates to the stdlib so we handle UTF-8 correctly.
// Kept as a named helper so the call sites stay readable and tests can
// pin the exact encoding behaviour.
func urlQueryEscape(s string) string {
	return url.QueryEscape(s)
}
