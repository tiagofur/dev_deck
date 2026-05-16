package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type OrgsHandler struct {
	store *store.Store
}

func NewOrgsHandler(s *store.Store) *OrgsHandler {
	return &OrgsHandler{store: s}
}

// POST /api/orgs
func (h *OrgsHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	org, err := h.store.CreateOrganization(r.Context(), userID, req.Name)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, org)
}

// GET /api/orgs
func (h *OrgsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	orgs, err := h.store.ListUserOrganizations(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"orgs": orgs,
	})
}

// POST /api/orgs/{id}/members
func (h *OrgsHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	// Simple implementation for Phase 33 Step C: add by userID
	orgID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	var req struct {
		UserID uuid.UUID `json:"user_id"`
		Role   string    `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if err := h.store.AddOrgMember(r.Context(), orgID, req.UserID, req.Role); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"added": true})
}

// GET /api/orgs/{id}/feed
func (h *OrgsHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	orgID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	// Verify membership
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	if _, ok := h.store.IsOrgMember(r.Context(), userID, orgID); !ok {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "not a member of this organization")
		return
	}

	limit := parseLimitFromQuery(r.URL.Query().Get("limit"), 50, 200)
	list, err := h.store.ListOrgActivity(r.Context(), orgID, limit)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"org_id": orgID,
		"events": list,
	})
}
