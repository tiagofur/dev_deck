package handlers

import (
	"net/http"

	"heapdeck/internal/authctx"
	"heapdeck/internal/store"
)

// UsageHandler serves the Pro AI budget state for the current user.
type UsageHandler struct {
	store       *store.Store
	budgetCents int
}

func NewUsageHandler(s *store.Store, budgetCents int) *UsageHandler {
	return &UsageHandler{store: s, budgetCents: budgetCents}
}

// GET /api/me/ai-usage — monthly AI spend vs cap, plus per-action
// breakdown. Free users get zeros (nothing priced on them); billing-off
// deployments report cap 0 so clients hide the meter.
func (h *UsageHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	usage, err := h.store.GetMonthlyUsage(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"plan":       h.store.GetUserPlan(r.Context(), userID),
		"used_cents": usage.UsedCents,
		"cap_cents":  h.budgetCents,
		"resets_at":  usage.ResetsAt,
		"by_action":  usage.ByAction,
	})
}
