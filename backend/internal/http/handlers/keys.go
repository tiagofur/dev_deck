package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type KeysHandler struct {
	store *store.Store
}

func NewKeysHandler(s *store.Store) *KeysHandler {
	return &KeysHandler{store: s}
}

// POST /api/me/keys
func (h *KeysHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "name is required")
		return
	}

	raw, key, err := h.store.CreateAPIKey(r.Context(), userID, req.Name)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"token": raw, // ONLY SHOWN ONCE
		"key":   key,
	})
}

// GET /api/me/keys
func (h *KeysHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	keys, err := h.store.ListAPIKeys(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"keys": keys,
	})
}

// DELETE /api/me/keys/{id}
func (h *KeysHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	if err := h.store.DeleteAPIKey(r.Context(), userID, id); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
