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

const deepSeekBaseURL = "https://api.deepseek.com"

var deepSeekBaseURLForTests = deepSeekBaseURL

type deepSeekProvider struct {
	apiKey string
	model  string
	httpc  *http.Client
}

func NewDeepSeek(apiKey, model string) *Service {
	provider := &deepSeekProvider{
		apiKey: strings.TrimSpace(apiKey),
		model:  strings.TrimSpace(model),
		httpc:  &http.Client{Timeout: 20 * time.Second},
	}
	if provider.model == "" {
		provider.model = "deepseek-chat" // V3.2 chat model
	}
	return NewWith(provider, provider)
}

func NewDeepSeekFromConfig(apiKey string) *Service {
	return NewDeepSeek(apiKey, "")
}

func (p *deepSeekProvider) Enabled() bool {
	return p != nil && p.apiKey != ""
}

func (p *deepSeekProvider) Summarize(ctx context.Context, in Input) (string, error) {
	resp, err := p.complete(ctx, []deepSeekMessage{
		{Role: "system", Content: "You summarize developer-saved items. Return exactly one concise sentence, max 160 characters. No markdown, no bullets."},
		{Role: "user", Content: summarizePrompt(in)},
	})
	if err != nil {
		return "", err
	}
	return truncate(strings.TrimSpace(resp), 160), nil
}

func (p *deepSeekProvider) SuggestTags(ctx context.Context, in Input) ([]string, error) {
	resp, err := p.complete(ctx, []deepSeekMessage{
		{Role: "system", Content: "You suggest tags for developer-saved items. Return ONLY a JSON array of up to 6 short lowercase tags. No prose."},
		{Role: "user", Content: tagsPrompt(in)},
	})
	if err != nil {
		return nil, err
	}
	var tags []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(resp)), &tags); err != nil {
		return nil, fmt.Errorf("decode deepseek tags json: %w", err)
	}
	return uniqueTags(tags), nil
}

type deepSeekMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type deepSeekRequest struct {
	Model       string            `json:"model"`
	Temperature float64          `json:"temperature,omitempty"`
	MaxTokens   int              `json:"max_tokens,omitempty"`
	Messages    []deepSeekMessage `json:"messages"`
}

type deepSeekResponse struct {
	Choices []struct {
		Message deepSeekMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *deepSeekProvider) complete(ctx context.Context, messages []deepSeekMessage) (string, error) {
	if !p.Enabled() {
		return "", errors.New("deepseek provider disabled")
	}
	body, err := json.Marshal(deepSeekRequest{
		Model:       p.model,
		Temperature: 0.2,
		MaxTokens:   512,
		Messages:   messages,
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, deepSeekBaseURLForTests+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
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
	var decoded deepSeekResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return "", fmt.Errorf("decode deepseek response: %w", err)
	}
	if decoded.Error != nil {
		return "", errors.New(decoded.Error.Message)
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("deepseek http %d: %s", resp.StatusCode, string(raw))
	}
	if len(decoded.Choices) == 0 {
		return "", errors.New("deepseek returned no choices")
	}
	return strings.TrimSpace(decoded.Choices[0].Message.Content), nil
}