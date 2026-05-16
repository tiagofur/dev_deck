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

type ollamaProvider struct {
	baseURL string
	model   string
	httpc   *http.Client
}

func NewOllama(baseURL, model string) *Service {
	provider := &ollamaProvider{
		baseURL: strings.TrimSuffix(strings.TrimSpace(baseURL), "/"),
		model:   strings.TrimSpace(model),
		httpc:   &http.Client{Timeout: 60 * time.Second}, // Ollama can be slow locally
	}
	if provider.model == "" {
		provider.model = "llama3"
	}
	if provider.baseURL == "" {
		provider.baseURL = "http://localhost:11434"
	}
	return NewWith(provider, provider)
}

func (p *ollamaProvider) Enabled() bool {
	return p != nil && p.baseURL != ""
}

func (p *ollamaProvider) Summarize(ctx context.Context, in Input) (string, error) {
	resp, err := p.generate(ctx, "You summarize developer-saved items. Return exactly one concise sentence, max 160 characters. No markdown, no bullets.", summarizePrompt(in))
	if err != nil {
		return "", err
	}
	return truncate(strings.TrimSpace(resp), 160), nil
}

func (p *ollamaProvider) SuggestTags(ctx context.Context, in Input) ([]string, error) {
	resp, err := p.generate(ctx, "You suggest tags for developer-saved items. Return ONLY a JSON array of up to 6 short lowercase tags. No prose.", tagsPrompt(in))
	if err != nil {
		return nil, err
	}
	
	// Clean the response in case Ollama adds markdown backticks
	resp = strings.TrimPrefix(strings.TrimSpace(resp), "```json")
	resp = strings.TrimPrefix(resp, "```")
	resp = strings.TrimSuffix(resp, "```")
	resp = strings.TrimSpace(resp)

	var tags []string
	if err := json.Unmarshal([]byte(resp), &tags); err != nil {
		return nil, fmt.Errorf("decode ollama tags json: %w (raw: %s)", err, resp)
	}
	return uniqueTags(tags), nil
}

type ollamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	System string `json:"system"`
	Stream bool   `json:"stream"`
}

type ollamaResponse struct {
	Response string `json:"response"`
	Error    string `json:"error,omitempty"`
}

func (p *ollamaProvider) generate(ctx context.Context, system, prompt string) (string, error) {
	if !p.Enabled() {
		return "", errors.New("ollama provider disabled")
	}

	body, err := json.Marshal(ollamaRequest{
		Model:  p.model,
		System: system,
		Prompt: prompt,
		Stream: false,
	})
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("%s/api/generate", p.baseURL)
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

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("ollama http %d: %s", resp.StatusCode, string(raw))
	}

	var decoded ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return "", fmt.Errorf("decode ollama response: %w", err)
	}
	if decoded.Error != "" {
		return "", errors.New(decoded.Error)
	}

	return strings.TrimSpace(decoded.Response), nil
}
