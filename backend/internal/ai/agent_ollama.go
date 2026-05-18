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

	"devdeck/internal/ai/agent"
)

// AgentOllama implements the agent.Agent interface using Ollama's chat API.
// Note: Tool calling support in Ollama depends on the model (e.g., llama3.1).
type AgentOllama struct {
	baseURL string
	model   string
	httpc   *http.Client
}

func NewAgentOllama(baseURL, model string) *AgentOllama {
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	if model == "" {
		model = "llama3.1" // llama3.1 has better tool calling support
	}
	return &AgentOllama{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		model:   model,
		httpc:   &http.Client{Timeout: 90 * time.Second}, // Ollama tools can be slow
	}
}

func (a *AgentOllama) Enabled() bool {
	return a.baseURL != ""
}

func (a *AgentOllama) Chat(ctx context.Context, messages []agent.Message, tools []agent.Tool) (*agent.Response, error) {
	if !a.Enabled() {
		return nil, errors.New("ollama agent disabled")
	}

	// Ollama /api/chat format mirrors OpenAI but tools are model-dependent
	type ollamaChatRequest struct {
		Model    string          `json:"model"`
		Messages []agent.Message `json:"messages"`
		Tools    []any           `json:"tools,omitempty"`
		Stream   bool            `json:"stream"`
	}

	reqBody := ollamaChatRequest{
		Model:    a.model,
		Messages: messages,
		Stream:   false,
	}

	for _, t := range tools {
		reqBody.Tools = append(reqBody.Tools, map[string]any{
			"type": "function",
			"function": map[string]any{
				"name":        t.Name,
				"description": t.Description,
				"parameters":  t.Parameters,
			},
		})
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/api/chat", a.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("ollama agent http %d: %s", resp.StatusCode, string(raw))
	}

	type ollamaChatResponse struct {
		Message struct {
			Role      string           `json:"role"`
			Content   string           `json:"content"`
			ToolCalls []agent.ToolCall `json:"tool_calls"`
		} `json:"message"`
		Error string `json:"error,omitempty"`
	}

	var decoded ollamaChatResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return nil, fmt.Errorf("decode ollama agent response: %w", err)
	}

	if decoded.Error != "" {
		return nil, errors.New(decoded.Error)
	}

	return &agent.Response{
		Content:   decoded.Message.Content,
		ToolCalls: decoded.Message.ToolCalls,
	}, nil
}
