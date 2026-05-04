package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/items"
	"devdeck/internal/jobs"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// Ola 5 Fase 17 — generic items CRUD on top of the polymorphic
// `items` table introduced in Wave 4.5 §16.9.
//
// Creation is handled by the existing POST /api/items/capture flow
// (see handlers/capture.go) because all types share the same "text or
// URL in, classified item out" contract. This file adds the List/Get/
// Update/Delete endpoints plus MarkSeen for discovery-mode parity
// with repos.

type ItemsHandler struct {
	store *store.Store
	queue *jobs.EnrichQueue
}

func NewItemsHandler(s *store.Store, q *jobs.EnrichQueue) *ItemsHandler {
	return &ItemsHandler{store: s, queue: q}
}

// GET /api/items
//
// Query params:
//
//	type     — repo|cli|plugin|... (empty = all)
//	tag      — single tag filter
//	q        — fuzzy text filter via pg_trgm
//	archived — true/false (default: hide archived)
//	sort     — added_desc|added_asc|updated_desc|title_asc
//	limit    — 1..500 (default 100)
//	offset   — pagination
func (h *ItemsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := items.ListParams{
		Type:       q.Get("type"),
		Tag:        q.Get("tag"),
		Q:          q.Get("q"),
		Sort:       q.Get("sort"),
		Favorites:  q.Get("favorites") == "true",
	}
	if v := q.Get("archived"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			p.Archived = &b
		}
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			p.Limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			p.Offset = n
		}
	}
	if p.Type != "" && !items.IsValid(p.Type) {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_TYPE", "unknown item type filter")
		return
	}

	res, err := h.store.ListItems(r.Context(), p)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// GET /api/items/{id}
func (h *ItemsHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseItemID(w, r)
	if !ok {
		return
	}
	it, err := h.store.GetItem(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "item not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, it)
}

// PATCH /api/items/{id}
func (h *ItemsHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseItemID(w, r)
	if !ok {
		return
	}
	var in items.UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.ItemType != nil && !items.IsValid(*in.ItemType) {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_TYPE", "unknown item_type")
		return
	}
	it, err := h.store.UpdateItem(r.Context(), id, in)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "item not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, it)
}

// DELETE /api/items/{id}
func (h *ItemsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseItemID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteItem(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "item not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/items/{id}/seen — discovery mode rotation helper.
func (h *ItemsHandler) MarkSeen(w http.ResponseWriter, r *http.Request) {
	id, ok := parseItemID(w, r)
	if !ok {
		return
	}
	if err := h.store.MarkItemSeen(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "item not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/items/{id}/ai-enrich — re-run async enrichment/AI manually.
func (h *ItemsHandler) AIEnrich(w http.ResponseWriter, r *http.Request) {
	id, ok := parseItemID(w, r)
	if !ok {
		return
	}
	it, err := h.store.GetItem(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "item not found")
			return
		}
		writeInternal(w, err)
		return
	}
	job := jobs.EnrichJob{Kind: jobs.KindItem, ID: it.ID, Type: it.Type}
	if it.URL != nil {
		job.URL = *it.URL
	}
	if h.queue == nil || !h.queue.CanProcess(job) {
		writeError(w, http.StatusConflict, "ENRICHMENT_UNAVAILABLE", "item cannot be enriched right now")
		return
	}
	h.queue.Enqueue(job)
	if err := h.store.UpdateItemEnrichmentStatus(r.Context(), it.ID, items.EnrichmentQueued); err != nil {
		writeInternal(w, err)
		return
	}
	it.EnrichmentStatus = items.EnrichmentQueued
	writeJSON(w, http.StatusAccepted, it)
}

// PATCH /api/items/{id}/ai-tags — review/edit AI suggested tags.
func (h *ItemsHandler) ReviewAITags(w http.ResponseWriter, r *http.Request) {
	id, ok := parseItemID(w, r)
	if !ok {
		return
	}
	var in items.ReviewAITagsInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	it, err := h.store.ReviewItemAITags(r.Context(), id, in)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "item not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, it)
}

// GET /api/items/tags — all unique tags for the authenticated user.
func (h *ItemsHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "must be authenticated")
		return
	}
	tags, err := h.store.GetUserTags(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tags)
}

func parseItemID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "id")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}
