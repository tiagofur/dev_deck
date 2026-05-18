package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/items"
	"devdeck/internal/domain/repos"
	"devdeck/internal/jobs"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ItemsHandler struct {
	store *store.Store
	queue *jobs.EnrichQueue
}

func NewItemsHandler(s *store.Store, q *jobs.EnrichQueue) *ItemsHandler {
	return &ItemsHandler{store: s, queue: q}
}

func (h *ItemsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := repos.ListParams{
		Tag:  q.Get("tag"),
		Lang: q.Get("lang"),
		Q:    q.Get("q"),
		Sort: q.Get("sort"),
	}
	if v := q.Get("archived"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			p.Archived = &b
		}
	}
	if v := q.Get("limit"); v != "" {
		p.Limit, _ = strconv.Atoi(v)
	}
	if v := q.Get("offset"); v != "" {
		p.Offset, _ = strconv.Atoi(v)
	}

	res, err := h.store.ListItems(r.Context(), p)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

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

func (h *ItemsHandler) Check(w http.ResponseWriter, r *http.Request) {
	var body struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	userID, _ := authctx.UserID(r.Context())
	norm := items.NormalizeURL(body.URL)
	it, err := h.store.GetItemByNormalizedURL(r.Context(), userID, norm)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusOK, map[string]any{"item": nil})
			return
		}
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"item": it})
}

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
	job := jobs.EnrichJob{
		Kind:   jobs.KindItem,
		ID:     it.ID,
		UserID: it.UserID,
		Type:   it.Type,
	}
	if it.URL != nil {
		job.URL = *it.URL
	}
	if h.queue == nil || !h.queue.CanProcess(job) {
		writeError(w, http.StatusConflict, "ENRICHMENT_UNAVAILABLE", "item cannot be enriched")
		return
	}
	h.queue.Enqueue(job)
	_ = h.store.UpdateItemEnrichmentStatus(r.Context(), it.ID, items.EnrichmentQueued)
	writeJSON(w, http.StatusAccepted, it)
}

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
