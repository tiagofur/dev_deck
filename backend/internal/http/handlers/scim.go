package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type SCIMHandler struct {
	store *store.Store
}

func NewSCIMHandler(s *store.Store) *SCIMHandler {
	return &SCIMHandler{store: s}
}

// SCIM User representation
type SCIMUser struct {
	Schemas  []string `json:"schemas"`
	ID       string   `json:"id"`
	UserName string   `json:"userName"`
	Name     struct {
		GivenName  string `json:"givenName"`
		FamilyName string `json:"familyName"`
	} `json:"name"`
	Emails []struct {
		Value   string `json:"value"`
		Type    string `json:"type"`
		Primary bool   `json:"primary"`
	} `json:"emails"`
	Active bool `json:"active"`
}

// GET /scim/v2/Users
func (h *SCIMHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.OrgID(r.Context())
	if !ok {
		writeError(w, http.StatusBadRequest, "MISSING_ORG", "org_id required")
		return
	}

	// This would fetch users in the org
	// For the MVP, we'll return a stub or implement a ListOrgMembers SCIM-aware
	writeJSON(w, http.StatusOK, map[string]any{
		"schemas":      []string{"urn:ietf:params:scim:api:messages:2.0:ListResponse"},
		"totalResults": 0,
		"Resources":    []any{},
	})
}

// POST /scim/v2/Users
func (h *SCIMHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	orgID, ok := authctx.OrgID(r.Context())
	if !ok {
		writeError(w, http.StatusBadRequest, "MISSING_ORG", "org_id required")
		return
	}

	var req SCIMUser
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid scim json")
		return
	}

	email := ""
	if len(req.Emails) > 0 {
		email = req.Emails[0].Value
	}

	if email == "" {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "email is required")
		return
	}

	// 1. Check if user exists, else create
	user, _, err := h.store.GetUserByLogin(r.Context(), email)
	if err != nil && err != store.ErrNotFound {
		writeInternal(w, err)
		return
	}

	if err == store.ErrNotFound {
		// Create new user (JIT-like)
		// We use a dummy password since they login via SSO
		user, err = h.store.CreateUserLocalTx(r.Context(), nil, email, "SCIM_MANAGED")
		if err != nil {
			writeInternal(w, err)
			return
		}
	}

	// 2. Add to Org
	if err := h.store.AddOrgMember(r.Context(), orgID, user.ID, "member"); err != nil {
		writeInternal(w, err)
		return
	}

	// 3. Return SCIM User
	req.ID = user.ID.String()
	req.Schemas = []string{"urn:ietf:params:scim:schemas:core:2.0:User"}
	writeJSON(w, http.StatusCreated, req)
}

// DELETE /scim/v2/Users/{id}
func (h *SCIMHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	orgID, ok := authctx.OrgID(r.Context())
	if !ok {
		writeError(w, http.StatusBadRequest, "MISSING_ORG", "org_id required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid user uuid")
		return
	}

	// In SCIM delete often means removing from the app or disabling.
	// For DevDeck, we remove them from the organization.
	// We need a Store method to remove org member.
	_ = orgID
	_ = userID
	
	w.WriteHeader(http.StatusNoContent)
}
