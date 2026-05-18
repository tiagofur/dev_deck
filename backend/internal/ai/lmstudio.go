package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// lmStudioProvider talks to a locally-running LM Studio instance using its
// OpenAI-compatible REST API.  No API key is required.
type lmStudioProvider struct {
	baseURL string
	model   string
	httpc   *http.Client
}

// NewLMStudio creates a Service backed by LM Studio.
// baseURL defaults to http://localhost:1234 when empty.
// model is optional; when empty LM Studio uses whichever model is currently loaded.
func NewLMStudio(baseURL, model string) *Service {
	provider := &lmStudioProvider{
		baseURL: strings.TrimSuffix(strings.TrimSpace(baseURL), "/"),
		model:   strings.TrimSpace(model),
		httpc:   &http.Client{Timeout: 60 * time.Second},
	}
	if provider.baseURL == "" {
		provider.baseURL = "http://localhost:1234"
	}
	return NewWith(provider, provider)
}

func (p *lmStudioProvider) Enabled() bool {
	return p != nil && p.baseURL != ""
}

func (p *lmStudioProvider) Summarize(ctx context.Context, in Input) (string, error) {
	resp, err := p.complete(ctx, []lmStudioMessage{
		{Role: "system", Content: "You summarize developer-saved items. Return exactly one concise sentence, max 160 characters. No markdown, no bullets."},
		{Role: "user", Content: summarizePrompt(in)},
	})
	if err != nil {
		return "", err
	}
	return truncate(strings.TrimSpace(resp), 160), nil
}

func (p *lmStudioProvider) SuggestTags(ctx context.Context, in Input) ([]string, error) {
	resp, err := p.complete(ctx, []lmStudioMessage{
		{Role: "system", Content: "You suggest tags for developer-saved items. Return ONLY a JSON array of up to 6 short lowercase tags. No prose."},
		{Role: "user", Content: tagsPrompt(in)},
	})
	if err != nil {
		return nil, err
	}
	// Strip optional markdown code fences that some models add.
	resp = strings.TrimPrefix(strings.TrimSpace(resp), "```json")
	resp = strings.TrimPrefix(resp, "```")
	resp = strings.TrimSuffix(resp, "```")
	resp = strings.TrimSpace(resp)

	var tags []string
	if err := json.Unmarshal([]byte(resp), &tags); err != nil {
		return nil, fmt.Errorf("decode lmstudio tags json: %w (raw: %s)", err, resp)
	}
	return uniqueTags(tags), nil
}

type lmStudioMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type lmStudioRequest struct {
	Model       string            `json:"model,omitempty"`
	Temperature float64           `json:"temperature"`
	Messages    []lmStudioMessage `json:"messages"`
}

type lmStudioResponse struct {
	Choices []struct {
		Message lmStudioMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *lmStudioProvider) complete(ctx context.Context, messages []lmStudioMessage) (string, error) {
	if !p.Enabled() {
		return "", errors.New("lmstudio provider disabled")
	}

	reqPayload := lmStudioRequest{
		Temperature: 0.2,
		Messages:    messages,
	}
	if p.model != "" {
		reqPayload.Model = p.model
	}

	body, err := json.Marshal(reqPayload)
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("%s/v1/chat/completions", p.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpc.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var decoded lmStudioResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return "", fmt.Errorf("decode lmstudio response: %w", err)
	}
	if decoded.Error != nil {
		return "", errors.New(decoded.Error.Message)
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("lmstudio http %d: %s", resp.StatusCode, string(raw))
	}
	if len(decoded.Choices) == 0 {
		return "", errors.New("lmstudio returned no choices")
	}
	return strings.TrimSpace(decoded.Choices[0].Message.Content), nil
}
