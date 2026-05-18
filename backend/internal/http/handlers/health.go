package handlers

import (
	"net/http"
	"devdeck/internal/store"
)

type HealthHandler struct {
	store *store.Store
}

func NewHealthHandler(s *store.Store) *HealthHandler {
	return &HealthHandler{store: s}
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if err := h.store.Ping(r.Context()); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"status":"error","details":"database unreachable"}`))
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
