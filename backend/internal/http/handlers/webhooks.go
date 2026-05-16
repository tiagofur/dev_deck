package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type WebhooksHandler struct {
	store *store.Store
}

func NewWebhooksHandler(s *store.Store) *WebhooksHandler {
	return &WebhooksHandler{store: s}
}

// POST /api/me/webhooks
func (h *WebhooksHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	orgID, _ := authctx.OrgID(r.Context())

	var req struct {
		Name   string   `json:"name"`
		URL    string   `json:"url"`
		Events []string `json:"events"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if req.Name == "" || req.URL == "" {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "name and url are required")
		return
	}

	var pUserID, pOrgID *uuid.UUID
	if orgID != uuid.Nil {
		pOrgID = &orgID
	} else {
		pUserID = &userID
	}

	webhook, err := h.store.CreateWebhook(r.Context(), pUserID, pOrgID, req.Name, req.URL, req.Events)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, webhook)
}

// GET /api/me/webhooks
func (h *WebhooksHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	orgIDRaw, _ := authctx.OrgID(r.Context())
	var orgID *uuid.UUID
	if orgIDRaw != uuid.Nil {
		orgID = &orgIDRaw
	}

	list, err := h.store.ListWebhooks(r.Context(), userID, orgID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"webhooks": list,
	})
}

// DELETE /api/me/webhooks/{id}
func (h *WebhooksHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	if err := h.store.DeleteWebhook(r.Context(), userID, id); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
