package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

type InvitesHandler struct {
	store *store.Store
}

func NewInvitesHandler(s *store.Store) *InvitesHandler {
	return &InvitesHandler{store: s}
}

// POST /api/waitlist — public endpoint to join
func (h *InvitesHandler) JoinWaitlist(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	email := strings.TrimSpace(body.Email)
	if email == "" || !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "INVALID_EMAIL", "a valid email is required")
		return
	}

	if err := h.store.JoinWaitlist(r.Context(), email); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"message": "joined waitlist"})
}

// GET /api/admin/waitlist — list waitlist (admin only)
func (h *InvitesHandler) ListWaitlist(w http.ResponseWriter, r *http.Request) {
	entries, err := h.store.ListWaitlist(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

// POST /api/admin/invites — generate new invite (admin only)
func (h *InvitesHandler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	adminID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var body struct {
		Code  string `json:"code"`
		Email string `json:"email,omitempty"` // Optional: link to a waitlist email
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	code := strings.TrimSpace(body.Code)
	if code == "" {
		code = strings.ToUpper(uuid.New().String()[:8]) // Random 8-char code
	}

	inv, err := h.store.CreateInvite(r.Context(), adminID, code)
	if err != nil {
		writeInternal(w, err)
		return
	}

	// If an email was provided, mark it as invited in waitlist
	if body.Email != "" {
		tx, _ := h.store.Pool().Begin(r.Context())
		if tx != nil {
			_ = h.store.MarkEmailInvited(r.Context(), tx, body.Email)
			_ = tx.Commit(r.Context())
		}
	}

	writeJSON(w, http.StatusCreated, inv)
}

// GET /api/admin/invites — list all invites (admin only)
func (h *InvitesHandler) ListInvites(w http.ResponseWriter, r *http.Request) {
	invites, err := h.store.ListInvites(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"invites": invites})
}
