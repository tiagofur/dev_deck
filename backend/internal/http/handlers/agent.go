package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"devdeck/internal/ai"
	"devdeck/internal/ai/agent"
	"devdeck/internal/store"
)

type AgentHandler struct {
	store *store.Store
	ai    *ai.Service
}

func NewAgentHandler(s *store.Store, aiSvc *ai.Service) *AgentHandler {
	return &AgentHandler{store: s, ai: aiSvc}
}

type AgentChatRequest struct {
	History []agent.Message `json:"history"`
}

// POST /api/agent/chat
func (h *AgentHandler) Chat(w http.ResponseWriter, r *http.Request) {
	if h.ai == nil || !h.ai.Enabled() || h.ai.Agent() == nil {
		writeError(w, http.StatusServiceUnavailable, "AI_DISABLED", "ai agent is not configured")
		return
	}

	var req AgentChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json")
		return
	}

	// Setup SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "SSE_UNSUPPORTED", "streaming not supported")
		return
	}

	sendEvent := func(data any) {
		buf, _ := json.Marshal(data)
		fmt.Fprintf(w, "data: %s\n\n", buf)
		flusher.Flush()
	}

	orch := agent.NewOrchestrator(h.ai.Agent())
	tools := agent.DefaultTools(h.store)

	// Custom orchestrator logic for streaming (simplified for MVP)
	// We'll just stream the final augmented history for now,
	// but the structure is ready for token-by-token streaming.
	newHistory, err := orch.Chat(r.Context(), req.History, tools)
	if err != nil {
		sendEvent(map[string]any{"error": err.Error()})
		return
	}

	sendEvent(map[string]any{"history": newHistory, "done": true})
}
