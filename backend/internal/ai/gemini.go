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

// Gemini REST endpoint. Auth goes in the ?key= query param, not a header.
const geminiBaseURL = "https://generativelanguage.googleapis.com/v1beta"

var geminiBaseURLForTests = geminiBaseURL

type geminiProvider struct {
	apiKey string
	model  string
	httpc  *http.Client
}

func NewGemini(apiKey, model string) *Service {
	provider := &geminiProvider{
		apiKey: strings.TrimSpace(apiKey),
		model:  strings.TrimSpace(model),
		httpc:  &http.Client{Timeout: 20 * time.Second},
	}
	if provider.model == "" {
		provider.model = "gemini-3.8-flash"
	}
	return NewWith(provider, provider)
}

func (p *geminiProvider) Enabled() bool {
	return p != nil && p.apiKey != ""
}

// AIConfigModel exposes the model for cost lookup.
func (p *geminiProvider) AIConfigModel() string {
	if p == nil {
		return ""
	}
	return p.model
}

func (p *geminiProvider) Summarize(ctx context.Context, in Input) (string, error) {
	summary, _, err := p.SummarizeDetailed(ctx, in)
	return summary, err
}

// SummarizeDetailed reports the provider's token usage for metering.
func (p *geminiProvider) SummarizeDetailed(ctx context.Context, in Input) (string, *Usage, error) {
	resp, usage, err := p.complete(ctx,
		"You summarize developer-saved items. Return exactly one concise sentence, max 160 characters. No markdown, no bullets.",
		summarizePrompt(in))
	if err != nil {
		return "", nil, err
	}
	return truncate(strings.TrimSpace(resp), 160), usage, nil
}

func (p *geminiProvider) SuggestTags(ctx context.Context, in Input) ([]string, error) {
	tags, _, err := p.SuggestTagsDetailed(ctx, in)
	return tags, err
}

// SuggestTagsDetailed reports the provider's token usage for metering.
func (p *geminiProvider) SuggestTagsDetailed(ctx context.Context, in Input) ([]string, *Usage, error) {
	resp, usage, err := p.complete(ctx,
		"You suggest tags for developer-saved items. Return ONLY a JSON array of up to 6 short lowercase tags. No prose.",
		tagsPrompt(in))
	if err != nil {
		return nil, nil, err
	}
	var tags []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(resp)), &tags); err != nil {
		return nil, usage, fmt.Errorf("decode gemini tags json: %w", err)
	}
	return uniqueTags(tags), usage, nil
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiRequest struct {
	SystemInstruction *geminiContent  `json:"systemInstruction,omitempty"`
	Contents          []geminiContent `json:"contents"`
	GenerationConfig  geminiGenConfig `json:"generationConfig"`
}

type geminiGenConfig struct {
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
}

type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
	UsageMetadata *struct {
		PromptTokens     int `json:"promptTokenCount"`
		CandidatesTokens int `json:"candidatesTokenCount"`
	} `json:"usageMetadata,omitempty"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *geminiProvider) complete(ctx context.Context, system, user string) (string, *Usage, error) {
	if !p.Enabled() {
		return "", nil, errors.New("gemini provider disabled")
	}
	body, err := json.Marshal(geminiRequest{
		SystemInstruction: &geminiContent{Parts: []geminiPart{{Text: system}}},
		Contents:          []geminiContent{{Role: "user", Parts: []geminiPart{{Text: user}}}},
		GenerationConfig:  geminiGenConfig{Temperature: 0.2, MaxOutputTokens: 512},
	})
	if err != nil {
		return "", nil, err
	}
	url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", geminiBaseURLForTests, p.model, p.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
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
	var decoded geminiResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return "", nil, fmt.Errorf("decode gemini response: %w", err)
	}
	if decoded.Error != nil {
		return "", nil, errors.New(decoded.Error.Message)
	}
	if resp.StatusCode >= 300 {
		return "", nil, fmt.Errorf("gemini http %d: %s", resp.StatusCode, string(raw))
	}
	if len(decoded.Candidates) == 0 || len(decoded.Candidates[0].Content.Parts) == 0 {
		return "", nil, errors.New("gemini returned no candidates")
	}
	var usage *Usage
	if decoded.UsageMetadata != nil {
		usage = &Usage{InputTokens: decoded.UsageMetadata.PromptTokens, OutputTokens: decoded.UsageMetadata.CandidatesTokens}
	}
	return strings.TrimSpace(decoded.Candidates[0].Content.Parts[0].Text), usage, nil
}
