package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"devdeck/internal/ai/agent"
)

// AgentOpenAI implements the agent.Agent interface using OpenAI's chat completions.
type AgentOpenAI struct {
	apiKey string
	model  string
	httpc  *http.Client
}

func NewAgentOpenAI(apiKey, model string) *AgentOpenAI {
	if model == "" {
		model = "gpt-4o"
	}
	return &AgentOpenAI{
		apiKey: apiKey,
		model:  model,
		httpc:  &http.Client{Timeout: 30 * time.Second},
	}
}

func (a *AgentOpenAI) Enabled() bool {
	return a.apiKey != ""
}

func (a *AgentOpenAI) Chat(ctx context.Context, messages []agent.Message, tools []agent.Tool) (*agent.Response, error) {
	if !a.Enabled() {
		return nil, errors.New("openai agent disabled")
	}

	// 1. Prepare request
	type openAIRequest struct {
		Model    string           `json:"model"`
		Messages []agent.Message  `json:"messages"`
		Tools    []any            `json:"tools,omitempty"`
	}

	reqBody := openAIRequest{
		Model:    a.model,
		Messages: messages,
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

	// 2. Execute POST
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+a.apiKey)
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
		return nil, fmt.Errorf("openai agent http %d: %s", resp.StatusCode, string(raw))
	}

	// 3. Decode response
	type openAIResponse struct {
		Choices []struct {
			Message struct {
				Role      string           `json:"role"`
				Content   string           `json:"content"`
				ToolCalls []agent.ToolCall `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
	}

	var decoded openAIResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return nil, fmt.Errorf("decode openai agent response: %w", err)
	}

	if len(decoded.Choices) == 0 {
		return nil, errors.New("openai agent returned no choices")
	}

	choice := decoded.Choices[0].Message
	return &agent.Response{
		Content:   choice.Content,
		ToolCalls: choice.ToolCalls,
	}, nil
}
