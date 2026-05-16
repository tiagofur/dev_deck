package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type RunbooksHandler struct {
	store *store.Store
}

func NewRunbooksHandler(s *store.Store) *RunbooksHandler {
	return &RunbooksHandler{store: s}
}

// GET /api/items/{id}/runbooks
func (h *RunbooksHandler) List(w http.ResponseWriter, r *http.Request) {
	itemID, ok := parseItemID(w, r)
	if !ok {
		return
	}

	runbooks, err := h.store.ListRunbooksByItem(r.Context(), itemID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"item_id":  itemID,
		"runbooks": runbooks,
	})
}

// POST /api/items/{id}/runbooks
func (h *RunbooksHandler) Create(w http.ResponseWriter, r *http.Request) {
	itemID, ok := parseItemID(w, r)
	if !ok {
		return
	}

	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "MISSING_TITLE", "title is required")
		return
	}

	rb, err := h.store.CreateRunbook(r.Context(), userID, itemID, req.Title, req.Description)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, rb)
}

// PATCH /api/runbooks/{id}
func (h *RunbooksHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUIDParam(w, r, "id")
	if !ok {
		return
	}

	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	rb, err := h.store.UpdateRunbook(r.Context(), id, userID, req.Title, req.Description)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, rb)
}

// DELETE /api/runbooks/{id}
func (h *RunbooksHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUIDParam(w, r, "id")
	if !ok {
		return
	}

	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	if err := h.store.DeleteRunbook(r.Context(), id, userID); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/runbooks/{id}/steps
func (h *RunbooksHandler) CreateStep(w http.ResponseWriter, r *http.Request) {
	runbookID, ok := parseUUIDParam(w, r, "id")
	if !ok {
		return
	}

	var req struct {
		Label       string  `json:"label"`
		Command     *string `json:"command"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if req.Label == "" {
		writeError(w, http.StatusBadRequest, "MISSING_LABEL", "label is required")
		return
	}

	st, err := h.store.CreateRunbookStep(r.Context(), runbookID, req.Label, req.Command, req.Description)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, st)
}

// PATCH /api/runbook-steps/{id}
func (h *RunbooksHandler) UpdateStep(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUIDParam(w, r, "id")
	if !ok {
		return
	}

	var req struct {
		Label       *string `json:"label"`
		Command     *string `json:"command"`
		Description *string `json:"description"`
		IsCompleted *bool   `json:"is_completed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	st, err := h.store.UpdateRunbookStep(r.Context(), id, req.Label, req.Command, req.Description, req.IsCompleted)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, st)
}

// DELETE /api/runbook-steps/{id}
func (h *RunbooksHandler) DeleteStep(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUIDParam(w, r, "id")
	if !ok {
		return
	}

	if err := h.store.DeleteRunbookStep(r.Context(), id); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/runbooks/{id}/steps/reorder
func (h *RunbooksHandler) ReorderSteps(w http.ResponseWriter, r *http.Request) {
	runbookID, ok := parseUUIDParam(w, r, "id")
	if !ok {
		return
	}

	var req struct {
		StepIDs []uuid.UUID `json:"step_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if err := h.store.ReorderRunbookSteps(r.Context(), runbookID, req.StepIDs); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func parseUUIDParam(w http.ResponseWriter, r *http.Request, name string) (uuid.UUID, bool) {
	raw := chi.URLParam(r, name)
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}
