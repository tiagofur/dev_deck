package handlers

import (
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type SocialHandler struct {
	store *store.Store
}

func NewSocialHandler(s *store.Store) *SocialHandler {
	return &SocialHandler{store: s}
}

// POST /api/users/{username}/follow
func (h *SocialHandler) Follow(w http.ResponseWriter, r *http.Request) {
	followerID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	username := chi.URLParam(r, "username")
	profile, err := h.store.GetPublicProfile(r.Context(), username)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
			return
		}
		writeInternal(w, err)
		return
	}

	followingID := profile["id"].(uuid.UUID)
	if followerID == followingID {
		writeError(w, http.StatusBadRequest, "INVALID_ACTION", "you cannot follow yourself")
		return
	}

	if err := h.store.FollowUser(r.Context(), followerID, followingID); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/users/{username}/follow
func (h *SocialHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	followerID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	username := chi.URLParam(r, "username")
	profile, err := h.store.GetPublicProfile(r.Context(), username)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
			return
		}
		writeInternal(w, err)
		return
	}

	followingID := profile["id"].(uuid.UUID)
	if err := h.store.UnfollowUser(r.Context(), followerID, followingID); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/feed/following
func (h *SocialHandler) GetFollowingFeed(w http.ResponseWriter, r *http.Request) {
	followerID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	limit := parseLimitFromQuery(r.URL.Query().Get("limit"), 50, 100)
	events, err := h.store.GetFollowingFeed(r.Context(), followerID, limit)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"events": events,
	})
}
