package handlers

import (
	"net/http"
)

type SystemConfigHandler struct {
	aiProvider  string
	syncEnabled bool
}

func NewSystemConfigHandler(aiProvider string, syncEnabled bool) *SystemConfigHandler {
	return &SystemConfigHandler{
		aiProvider:  aiProvider,
		syncEnabled: syncEnabled,
	}
}

func (h *SystemConfigHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ai_provider":  h.aiProvider,
		"sync_enabled": h.syncEnabled,
	})
}
