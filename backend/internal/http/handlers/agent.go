package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"heapdeck/internal/ai"
	"heapdeck/internal/ai/agent"
	"heapdeck/internal/authctx"
	"heapdeck/internal/metering"
	"heapdeck/internal/store"
)

type AgentHandler struct {
	store *store.Store
	ai    *ai.Service
	meter *metering.Recorder
}

func NewAgentHandler(s *store.Store, aiSvc *ai.Service, meter *metering.Recorder) *AgentHandler {
	return &AgentHandler{store: s, ai: aiSvc, meter: meter}
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

	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	if h.meter != nil && !h.meter.Allowed(r.Context(), userID) {
		writeError(w, http.StatusTooManyRequests, "AI_QUOTA_EXCEEDED", "monthly AI budget spent; resets next month")
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
		_, _ = fmt.Fprintf(w, "data: %s\n\n", buf)
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

	// The agent interface doesn't report token usage, so estimate from
	// the request/response text. Conservative on purpose (margin > UX).
	if h.meter != nil {
		inChars, outChars := 0, 0
		for _, m := range req.History {
			inChars += len(m.Content)
		}
		for _, m := range newHistory[len(req.History):] {
			outChars += len(m.Content)
		}
		h.meter.RecordUsage(r.Context(), userID, store.AIActionAgentChat, h.ai.Model(), &metering.Usage{
			InputTokens:  ai.EstimateTokensFromLen(inChars),
			OutputTokens: ai.EstimateTokensFromLen(outChars),
		})
	}

	sendEvent(map[string]any{"history": newHistory, "done": true})
}
