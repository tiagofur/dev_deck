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

// DashScope API endpoints.
const dashScopeBaseURL = "https://dashscope.aliyuncs.com/api/v1"

var dashScopeBaseURLForTests = dashScopeBaseURL

type qwenProvider struct {
	apiKey string
	model  string
	httpc  *http.Client
}

func NewQwen(apiKey, model string) *Service {
	provider := &qwenProvider{
		apiKey: strings.TrimSpace(apiKey),
		model:  strings.TrimSpace(model),
		httpc:  &http.Client{Timeout: 20 * time.Second},
	}
	if provider.model == "" {
		provider.model = "qwen-turbo" // cheaper, faster
	}
	return NewWith(provider, provider)
}

func NewQwenFromConfig(apiKey string) *Service {
	return NewQwen(apiKey, "") // uses default model
}

func (p *qwenProvider) Enabled() bool {
	return p != nil && p.apiKey != ""
}

func (p *qwenProvider) Summarize(ctx context.Context, in Input) (string, error) {
	resp, err := p.complete(ctx, []qwenMessage{
		{Role: "system", Content: "You summarize developer-saved items. Return exactly one concise sentence, max 160 characters. No markdown, no bullets."},
		{Role: "user", Content: summarizePrompt(in)},
	})
	if err != nil {
		return "", err
	}
	return truncate(strings.TrimSpace(resp), 160), nil
}

func (p *qwenProvider) SuggestTags(ctx context.Context, in Input) ([]string, error) {
	resp, err := p.complete(ctx, []qwenMessage{
		{Role: "system", Content: "You suggest tags for developer-saved items. Return ONLY a JSON array of up to 6 short lowercase tags. No prose."},
		{Role: "user", Content: tagsPrompt(in)},
	})
	if err != nil {
		return nil, err
	}
	var tags []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(resp)), &tags); err != nil {
		return nil, fmt.Errorf("decode qwen tags json: %w", err)
	}
	return uniqueTags(tags), nil
}

type qwenMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type qwenRequest struct {
	Model      string     `json:"model"`
	Input      qwenInput  `json:"input"`
	Parameters qwenParams `json:"parameters"`
}

type qwenInput struct {
	Messages []qwenMessage `json:"messages"`
}

type qwenParams struct {
	ResultFormat string  `json:"result_format"`
	MaxTokens  int     `json:"max_tokens,omitempty"`
	Temperature float64 `json:"temperature,omitempty"`
}

type qwenResponse struct {
	Code      string `json:"code"`
	Message  string `json:"message"`
	Output   qwenOutput `json:"output"`
	Usage    qwenUsage `json:"usage"`
}

type qwenOutput struct {
	Choices []struct {
		FinishReason string     `json:"finish_reason"`
		Message   qwenMessage `json:"message"`
	} `json:"choices"`
}

type qwenUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

func (p *qwenProvider) complete(ctx context.Context, messages []qwenMessage) (string, error) {
	if !p.Enabled() {
		return "", errors.New("qwen provider disabled")
	}
	body, err := json.Marshal(qwenRequest{
		Model: p.model,
		Input: qwenInput{Messages: messages},
		Parameters: qwenParams{
			ResultFormat: "message",
			MaxTokens:   512,
			Temperature: 0.2,
		},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, dashScopeBaseURLForTests+"/services/aigc/text-generation/generation", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-DashScope-Async", "disable") // sync call

	resp, err := p.httpc.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var decoded qwenResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return "", fmt.Errorf("decode qwen response: %w", err)
	}
	if decoded.Code != "" && decoded.Code != "Success" {
		return "", fmt.Errorf("qwen error: %s", decoded.Message)
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("qwen http %d: %s", resp.StatusCode, string(raw))
	}
	if len(decoded.Output.Choices) == 0 {
		return "", errors.New("qwen returned no choices")
	}
	return strings.TrimSpace(decoded.Output.Choices[0].Message.Content), nil
}