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

const (
	openAIEmbeddingsURL = "https://api.openai.com/v1/embeddings"
	dashScopeEmbeddingsURL = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding"
)

type Embedder interface {
	// Embed generates embeddings for the given text.
	// Returns []float32 with dimension size (1536 for OpenAI, 1024 for Qwen).
	Embed(ctx context.Context, text string) ([]float32, error)
	// Dim returns the embedding dimension for this provider.
	Dim() int
	// Enabled returns true if the provider is configured.
	Enabled() bool
}

// ─── OpenAI Embeddings (text-embedding-3-small) ───

type openAIEmbedder struct {
	apiKey string
	dim    int
	httpc  *http.Client
}

func NewOpenAIEmbedder(apiKey string) *openAIEmbedder {
	return &openAIEmbedder{
		apiKey: strings.TrimSpace(apiKey),
		dim:    1536, // text-embedding-3-small
		httpc: &http.Client{Timeout: 30 * time.Second},
	}
}

func (e *openAIEmbedder) Enabled() bool {
	return e != nil && e.apiKey != ""
}

func (e *openAIEmbedder) Dim() int {
	return e.dim
}

func (e *openAIEmbedder) Embed(ctx context.Context, text string) ([]float32, error) {
	if !e.Enabled() {
		return nil, errors.New("openai embedder disabled")
	}

	body, err := json.Marshal(map[string]any{
		"model": "text-embedding-3-small",
		"input": text,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIEmbeddingsURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+e.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var embResp struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &embResp); err != nil {
		return nil, fmt.Errorf("decode openai embeddings response: %w", err)
	}
	if embResp.Error != nil {
		return nil, errors.New(embResp.Error.Message)
	}
	if len(embResp.Data) == 0 {
		return nil, errors.New("openai returned no embeddings")
	}

	return embResp.Data[0].Embedding, nil
}

// ─── Qwen Embeddings ───

type qwenEmbedder struct {
	apiKey string
	dim    int
	httpc  *http.Client
}

func NewQwenEmbedder(apiKey string) *qwenEmbedder {
	return &qwenEmbedder{
		apiKey: strings.TrimSpace(apiKey),
		dim:    1024, // qwen-text-embedding
		httpc: &http.Client{Timeout: 30 * time.Second},
	}
}

func (e *qwenEmbedder) Enabled() bool {
	return e != nil && e.apiKey != ""
}

func (e *qwenEmbedder) Dim() int {
	return e.dim
}

type qwenEmbedRequest struct {
	Model   string `json:"model"`
	Input   string `json:"input"`
	TextType string `json:"text_type"` // "query" or "document"
}

type qwenEmbedResponse struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	Output   struct {
		Embeddings []struct {
			TextIndex int       `json:"text_index"`
			Embedding []float32 `json:"embedding"`
		} `json:"embeddings"`
	} `json:"output"`
}

func (e *qwenEmbedder) Embed(ctx context.Context, text string) ([]float32, error) {
	if !e.Enabled() {
		return nil, errors.New("qwen embedder disabled")
	}

	body, err := json.Marshal(qwenEmbedRequest{
		Model:   "text-embedding-3",
		Input:   text,
		TextType: "document",
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, dashScopeEmbeddingsURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+e.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-DashScope-Async", "disable")

	resp, err := e.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var embResp qwenEmbedResponse
	if err := json.Unmarshal(raw, &embResp); err != nil {
		return nil, fmt.Errorf("decode qwen embeddings response: %w", err)
	}
	if embResp.Code != "" && embResp.Code != "Success" {
		return nil, fmt.Errorf("qwen error: %s", embResp.Message)
	}
	if len(embResp.Output.Embeddings) == 0 {
		return nil, errors.New("qwen returned no embeddings")
	}

	return embResp.Output.Embeddings[0].Embedding, nil
}

// ─── Service ───

type EmbeddingsService struct {
	embedder Embedder
}

func NewEmbeddingsService(embedder Embedder) *EmbeddingsService {
	return &EmbeddingsService{embedder: embedder}
}

func (s *EmbeddingsService) Enabled() bool {
	return s != nil && s.embedder != nil && s.embedder.Enabled()
}

// EmbedItem generates embedding for an item's content.
func (s *EmbeddingsService) EmbedItem(ctx context.Context, title, description, url string) ([]float32, error) {
	if !s.Enabled() {
		return nil, errors.New("embeddings service not enabled")
	}

	// Combine text fields for embedding
	text := combineText(title, description, url)
	if text == "" {
		text = "empty item"
	}

	return s.embedder.Embed(ctx, text)
}

// EmbedSearch generates embedding for a search query.
func (s *EmbeddingsService) EmbedSearch(ctx context.Context, query string) ([]float32, error) {
	if !s.Enabled() {
		return nil, errors.New("embeddings service not enabled")
	}
	return s.embedder.Embed(ctx, query)
}

func (s *EmbeddingsService) Dim() int {
	if s.embedder == nil {
		return 0
	}
	return s.embedder.Dim()
}

func combineText(title, description, url string) string {
	var parts []string
	if title != "" {
		parts = append(parts, title)
	}
	if description != "" {
		parts = append(parts, description)
	}
	// Skip URL to keep embeddings small and focused
	return strings.Join(parts, ". ")
}