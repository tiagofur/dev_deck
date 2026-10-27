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

const openAIBaseURL = "https://api.openai.com/v1/chat/completions"

var openAIBaseURLForTests = openAIBaseURL

type openAIProvider struct {
	apiKey string
	model  string
	httpc  *http.Client
}

func NewOpenAI(apiKey, model string) *Service {
	provider := &openAIProvider{
		apiKey: strings.TrimSpace(apiKey),
		model:  strings.TrimSpace(model),
		httpc:  &http.Client{Timeout: 20 * time.Second},
	}
	if provider.model == "" {
		provider.model = "gpt-4o-mini"
	}
	return NewWith(provider, provider)
}

func (p *openAIProvider) Enabled() bool {
	return p != nil && p.apiKey != ""
}

// AIConfigModel exposes the model for cost lookup.
func (p *openAIProvider) AIConfigModel() string {
	if p == nil {
		return ""
	}
	return p.model
}

func (p *openAIProvider) Summarize(ctx context.Context, in Input) (string, error) {
	summary, _, err := p.SummarizeDetailed(ctx, in)
	return summary, err
}

// SummarizeDetailed reports the provider's token usage for metering.
func (p *openAIProvider) SummarizeDetailed(ctx context.Context, in Input) (string, *Usage, error) {
	resp, usage, err := p.complete(ctx, []openAIMessage{
		{Role: "system", Content: "You summarize developer-saved items. Return exactly one concise sentence, max 160 characters. No markdown, no bullets."},
		{Role: "user", Content: summarizePrompt(in)},
	})
	if err != nil {
		return "", nil, err
	}
	return truncate(strings.TrimSpace(resp), 160), usage, nil
}

func (p *openAIProvider) SuggestTags(ctx context.Context, in Input) ([]string, error) {
	tags, _, err := p.SuggestTagsDetailed(ctx, in)
	return tags, err
}

// SuggestTagsDetailed reports the provider's token usage for metering.
func (p *openAIProvider) SuggestTagsDetailed(ctx context.Context, in Input) ([]string, *Usage, error) {
	resp, usage, err := p.complete(ctx, []openAIMessage{
		{Role: "system", Content: "You suggest tags for developer-saved items. Return ONLY a JSON array of up to 6 short lowercase tags. No prose."},
		{Role: "user", Content: tagsPrompt(in)},
	})
	if err != nil {
		return nil, nil, err
	}
	var tags []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(resp)), &tags); err != nil {
		return nil, usage, fmt.Errorf("decode openai tags json: %w", err)
	}
	return uniqueTags(tags), usage, nil
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIRequest struct {
	Model       string          `json:"model"`
	Temperature float64         `json:"temperature"`
	Messages    []openAIMessage `json:"messages"`
}

type openAIResponse struct {
	Choices []struct {
		Message openAIMessage `json:"message"`
	} `json:"choices"`
	Usage *struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage,omitempty"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *openAIProvider) complete(ctx context.Context, messages []openAIMessage) (string, *Usage, error) {
	if !p.Enabled() {
		return "", nil, errors.New("openai provider disabled")
	}
	body, err := json.Marshal(openAIRequest{
		Model:       p.model,
		Temperature: 0.2,
		Messages:    messages,
	})
	if err != nil {
		return "", nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIBaseURLForTests, bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpc.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", nil, err
	}
	var decoded openAIResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return "", nil, fmt.Errorf("decode openai response: %w", err)
	}
	if decoded.Error != nil {
		return "", nil, errors.New(decoded.Error.Message)
	}
	if resp.StatusCode >= 300 {
		return "", nil, fmt.Errorf("openai http %d", resp.StatusCode)
	}
	if len(decoded.Choices) == 0 {
		return "", nil, errors.New("openai returned no choices")
	}
	var usage *Usage
	if decoded.Usage != nil {
		usage = &Usage{InputTokens: decoded.Usage.PromptTokens, OutputTokens: decoded.Usage.CompletionTokens}
	}
	return strings.TrimSpace(decoded.Choices[0].Message.Content), usage, nil
}

func summarizePrompt(in Input) string {
	return fmt.Sprintf("Type: %s\nTitle: %s\nDescription: %s\nURL: %s\nMeta: %s", in.Type, in.Title, in.Description, deref(in.URL), metaPrompt(in.Meta))
}

func tagsPrompt(in Input) string {
	return fmt.Sprintf("Suggest tags for this developer item.\nType: %s\nTitle: %s\nDescription: %s\nURL: %s\nMeta: %s", in.Type, in.Title, in.Description, deref(in.URL), metaPrompt(in.Meta))
}

func metaPrompt(meta map[string]any) string {
	if len(meta) == 0 {
		return "{}"
	}
	raw, err := json.Marshal(meta)
	if err != nil {
		return "{}"
	}
	return string(raw)
}
