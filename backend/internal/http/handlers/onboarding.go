package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/store"
	"devdeck/internal/store/seed"
)

type OnboardingHandler struct {
	store *store.Store
}

func NewOnboardingHandler(s *store.Store) *OnboardingHandler {
	return &OnboardingHandler{store: s}
}

// GET /api/onboarding/kits
func (h *OnboardingHandler) ListKits(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"kits": seed.GetStarterKits()})
}

// POST /api/onboarding/install
func (h *OnboardingHandler) InstallKit(w http.ResponseWriter, r *http.Request) {
	var body struct {
		KitID string `json:"kit_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json")
		return
	}

	if err := h.store.InstallStarterKit(r.Context(), body.KitID); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
