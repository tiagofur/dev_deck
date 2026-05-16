package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type EnrichersHandler struct {
	store *store.Store
}

func NewEnrichersHandler(s *store.Store) *EnrichersHandler {
	return &EnrichersHandler{store: s}
}

// POST /api/me/enrichers
func (h *EnrichersHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	orgID, _ := authctx.OrgID(r.Context())

	var req struct {
		Name        string  `json:"name"`
		URLPattern  string  `json:"url_pattern"`
		EndpointURL string  `json:"endpoint_url"`
		AuthHeader  *string `json:"auth_header"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	var pUserID, pOrgID *uuid.UUID
	if orgID != uuid.Nil {
		pOrgID = &orgID
	} else {
		pUserID = &userID
	}

	enc, err := h.store.CreateCustomEnricher(r.Context(), pUserID, pOrgID, req.Name, req.URLPattern, req.EndpointURL, req.AuthHeader)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, enc)
}

// GET /api/me/enrichers
func (h *EnrichersHandler) List(w http.ResponseWriter, r *http.Request) {
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

	list, err := h.store.ListCustomEnrichers(r.Context(), userID, orgID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"enrichers": list,
	})
}

// DELETE /api/me/enrichers/{id}
func (h *EnrichersHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}

	if err := h.store.DeleteCustomEnricher(r.Context(), id); err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
