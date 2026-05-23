package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CirclesHandler struct {
	store *store.Store
}

func NewCirclesHandler(s *store.Store) *CirclesHandler {
	return &CirclesHandler{store: s}
}

type CreateCircleInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (h *CirclesHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	var in CreateCircleInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if in.Name == "" {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_NAME", "circle name cannot be empty")
		return
	}

	c, err := h.store.CreateCircle(r.Context(), userID, in.Name, in.Description)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, c)
}

func (h *CirclesHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	list, err := h.store.ListUserCircles(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, list)
}

func (h *CirclesHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	circleID, ok := parseCircleID(w, r)
	if !ok {
		return
	}

	circle, err := h.store.GetCircleByID(r.Context(), circleID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CIRCLE_NOT_FOUND", "circle not found")
			return
		}
		writeInternal(w, err)
		return
	}

	_, isMember := h.store.IsCircleMember(r.Context(), userID, circle.ID)
	if !isMember {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "you are not a member of this circle")
		return
	}

	writeJSON(w, http.StatusOK, circle)
}

type JoinCircleInput struct {
	InviteCode string `json:"invite_code"`
}

func (h *CirclesHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	var in JoinCircleInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if in.InviteCode == "" {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_INVITE_CODE", "invite code cannot be empty")
		return
	}

	c, err := h.store.JoinCircleByInviteCode(r.Context(), userID, in.InviteCode)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CIRCLE_NOT_FOUND", "circle with this invite code not found")
			return
		}
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, c)
}

type ShareItemInput struct {
	ItemID       uuid.UUID `json:"item_id"`
	ShareContext string    `json:"share_context"`
}

func (h *CirclesHandler) ShareItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	circleID, ok := parseCircleID(w, r)
	if !ok {
		return
	}

	var in ShareItemInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if in.ItemID == uuid.Nil {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_ITEM_ID", "item_id cannot be nil")
		return
	}

	// Verify user is a member of the circle
	_, isMember := h.store.IsCircleMember(r.Context(), userID, circleID)
	if !isMember {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "you are not a member of this circle")
		return
	}

	// Verify user owns/has access to the item
	_, err := h.store.GetItem(r.Context(), in.ItemID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "item not found")
			return
		}
		writeInternal(w, err)
		return
	}

	err = h.store.ShareItemToCircle(r.Context(), circleID, in.ItemID, userID, strings.TrimSpace(in.ShareContext))
	if err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *CirclesHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	circleID, ok := parseCircleID(w, r)
	if !ok {
		return
	}

	// Verify membership
	_, isMember := h.store.IsCircleMember(r.Context(), userID, circleID)
	if !isMember {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "you are not a member of this circle")
		return
	}

	itemsList, err := h.store.ListCircleItems(r.Context(), circleID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, itemsList)
}

func (h *CirclesHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	circleID, ok := parseCircleID(w, r)
	if !ok {
		return
	}

	// Verify membership
	_, isMember := h.store.IsCircleMember(r.Context(), userID, circleID)
	if !isMember {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "you are not a member of this circle")
		return
	}

	membersList, err := h.store.ListCircleMembers(r.Context(), circleID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, membersList)
}

func (h *CirclesHandler) Leave(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}

	circleID, ok := parseCircleID(w, r)
	if !ok {
		return
	}

	// Verify membership
	_, isMember := h.store.IsCircleMember(r.Context(), userID, circleID)
	if !isMember {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "you are not a member of this circle")
		return
	}

	err := h.store.LeaveCircle(r.Context(), circleID, userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func parseCircleID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "id")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}
