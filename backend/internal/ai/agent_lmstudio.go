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

// AgentLMStudio implements the agent.Agent interface using LM Studio's
// OpenAI-compatible chat completions API.  No API key is required.
type AgentLMStudio struct {
	baseURL string
	model   string
	httpc   *http.Client
}

// NewAgentLMStudio creates an agent backed by LM Studio.
// baseURL defaults to http://localhost:1234 when empty.
// model is optional; LM Studio will use whichever model is currently loaded.
func NewAgentLMStudio(baseURL, model string) *AgentLMStudio {
	if baseURL == "" {
		baseURL = "http://localhost:1234"
	}
	return &AgentLMStudio{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		model:   model,
		httpc:   &http.Client{Timeout: 90 * time.Second},
	}
}

func (a *AgentLMStudio) Enabled() bool {
	return a.baseURL != ""
}

func (a *AgentLMStudio) Chat(ctx context.Context, messages []agent.Message, tools []agent.Tool) (*agent.Response, error) {
	if !a.Enabled() {
		return nil, errors.New("lmstudio agent disabled")
	}

	type lmStudioChatRequest struct {
		Model    string          `json:"model,omitempty"`
		Messages []agent.Message `json:"messages"`
		Tools    []any           `json:"tools,omitempty"`
		Stream   bool            `json:"stream"`
	}

	reqBody := lmStudioChatRequest{
		Messages: messages,
		Stream:   false,
	}
	if a.model != "" {
		reqBody.Model = a.model
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

	url := fmt.Sprintf("%s/v1/chat/completions", a.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("lmstudio agent http %d: %s", resp.StatusCode, string(raw))
	}

	type lmStudioChatResponse struct {
		Choices []struct {
			Message struct {
				Role      string           `json:"role"`
				Content   string           `json:"content"`
				ToolCalls []agent.ToolCall `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error,omitempty"`
	}

	var decoded lmStudioChatResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return nil, fmt.Errorf("decode lmstudio agent response: %w", err)
	}

	if decoded.Error != nil {
		return nil, errors.New(decoded.Error.Message)
	}
	if len(decoded.Choices) == 0 {
		return nil, errors.New("lmstudio agent returned no choices")
	}

	choice := decoded.Choices[0].Message
	return &agent.Response{
		Content:   choice.Content,
		ToolCalls: choice.ToolCalls,
	}, nil
}
