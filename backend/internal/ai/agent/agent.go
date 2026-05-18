package agent

import (
	"context"
	"encoding/json"
)

type Role string

const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleTool      Role = "tool"
)

type Message struct {
	Role    Role    `json:"role"`
	Content string  `json:"content"`
	Name    string  `json:"name,omitempty"` // For tool messages
	ToolID  string  `json:"tool_call_id,omitempty"`
}

type Tool struct {
	Name         string                                                              `json:"name"`
	Description  string                                                              `json:"description"`
	Parameters   json.RawMessage                                                     `json:"parameters"` // JSON Schema
	IsClientSide bool                                                                `json:"is_client_side"`
	Execute      func(ctx context.Context, args map[string]any) (json.RawMessage, error) `json:"-"`
}

type Agent interface {
	Chat(ctx context.Context, messages []Message, tools []Tool) (*Response, error)
	Enabled() bool
}

type Response struct {
	Content   string     `json:"content"`
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
}

type ToolCall struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"` // always "function"
	Function  FunctionCall    `json:"function"`
}

type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"` // JSON string
}
