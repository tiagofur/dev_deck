package handlers

import (
	"errors"
	"net/http"

	"devdeck/internal/store"
)

type DiscoveryHandler struct {
	store *store.Store
}

func NewDiscoveryHandler(s *store.Store) *DiscoveryHandler {
	return &DiscoveryHandler{store: s}
}

// GET /api/discovery/next
//
// Returns the next repo to surface in the swipe deck. Returns 204
// when there are no more eligible repos so the frontend can show a
// "all done!" empty state.
func (h *DiscoveryHandler) Next(w http.ResponseWriter, r *http.Request) {
	repo, err := h.store.GetDiscoveryNext(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, repo)
}
