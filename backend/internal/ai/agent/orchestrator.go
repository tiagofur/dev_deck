package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"devdeck/internal/metrics"
)

type Orchestrator struct {
	agent Agent
}

func NewOrchestrator(a Agent) *Orchestrator {
	return &Orchestrator{agent: a}
}

func (o *Orchestrator) Chat(ctx context.Context, history []Message, tools []Tool) ([]Message, error) {
	if !o.agent.Enabled() {
		return nil, fmt.Errorf("ai agent is disabled")
	}

	start := time.Now()
	defer func() {
		metrics.AgentChatDuration.Observe(time.Since(start).Seconds())
	}()

	messages := append([]Message{}, history...)

	// Limit loops to avoid infinite recursive tool calls
	for i := 0; i < 5; i++ {
		resp, err := o.agent.Chat(ctx, messages, tools)
		if err != nil {
			return nil, err
		}

		// Add assistant message to history
		assistantMsg := Message{
			Role:    RoleAssistant,
			Content: resp.Content,
		}
		messages = append(messages, assistantMsg)

		if len(resp.ToolCalls) == 0 {
			// No tools requested, we are done
			return messages, nil
		}

		// Execute tools
		hasClientSide := false
		for _, tc := range resp.ToolCalls {
			slog.Info("agent calling tool", "name", tc.Function.Name, "args", tc.Function.Arguments)

			var tool *Tool
			for _, t := range tools {
				if t.Name == tc.Function.Name {
					tool = &t
					break
				}
			}

			if tool == nil {
				// Tool not found
				messages = append(messages, Message{
					Role:    RoleTool,
					Content: fmt.Sprintf("Error: tool %s not found", tc.Function.Name),
					ToolID:  tc.ID,
				})
				continue
			}

			if tool.IsClientSide {
				hasClientSide = true
				continue
			}

			var args map[string]any
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
				messages = append(messages, Message{
					Role:    RoleTool,
					Content: fmt.Sprintf("Error: invalid arguments for tool %s", tc.Function.Name),
					ToolID:  tc.ID,
				})
				continue
			}

			metrics.AgentToolCalls.WithLabelValues(tc.Function.Name).Inc()
			result, err := tool.Execute(ctx, args)
			if err != nil {
				messages = append(messages, Message{
					Role:    RoleTool,
					Content: fmt.Sprintf("Error executing tool %s: %v", tc.Function.Name, err),
					ToolID:  tc.ID,
				})
				continue
			}

			messages = append(messages, Message{
				Role:    RoleTool,
				Name:    tool.Name,
				Content: string(result),
				ToolID:  tc.ID,
			})
		}

		if hasClientSide {
			// Stop the loop and return history so the client can execute the tool
			return messages, nil
		}
	}

	return messages, nil
}
