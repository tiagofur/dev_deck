package handlers

import (
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type NotificationsHandler struct {
	store *store.Store
}

func NewNotificationsHandler(s *store.Store) *NotificationsHandler {
	return &NotificationsHandler{store: s}
}

// GET /api/me/notifications
func (h *NotificationsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	unreadOnly := r.URL.Query().Get("unread") == "true"
	list, err := h.store.ListNotifications(r.Context(), userID, unreadOnly)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"notifications": list,
	})
}

// GET /api/me/notifications/count
func (h *NotificationsHandler) Count(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	count, err := h.store.GetUnreadNotificationsCount(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"unread_count": count,
	})
}

// PATCH /api/me/notifications/{id}/read
func (h *NotificationsHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	if err := h.store.MarkNotificationRead(r.Context(), userID, id); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/me/notifications/read-all
func (h *NotificationsHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	if err := h.store.MarkAllNotificationsRead(r.Context(), userID); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
