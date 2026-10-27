package handlers

import (
	"net/http"
)

// SystemFeatures are server-controlled feature flags surfaced to clients.
// Anything absent or false stays hidden in the UI.
type SystemFeatures struct {
	Explore    bool `json:"explore"`
	Reputation bool `json:"reputation"`
	TeamReview bool `json:"team_review"`
	Realtime   bool `json:"realtime"`
}

type SystemConfigHandler struct {
	aiProvider     string
	syncEnabled    bool
	billingEnabled bool
	features       SystemFeatures
}

func NewSystemConfigHandler(aiProvider string, syncEnabled bool, billingEnabled bool, features SystemFeatures) *SystemConfigHandler {
	return &SystemConfigHandler{
		aiProvider:     aiProvider,
		syncEnabled:    syncEnabled,
		billingEnabled: billingEnabled,
		features:       features,
	}
}

func (h *SystemConfigHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ai_provider":    h.aiProvider,
		"sync_enabled":   h.syncEnabled,
		"billing_enabled": h.billingEnabled,
		"features":       h.features,
	})
}
