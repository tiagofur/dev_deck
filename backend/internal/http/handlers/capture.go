package handlers

import (
	"encoding/json"
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/items"
	"devdeck/internal/jobs"
	"devdeck/internal/metrics"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

type CaptureHandler struct {
	store *store.Store
	queue *jobs.EnrichQueue
}

func NewCaptureHandler(s *store.Store, q *jobs.EnrichQueue) *CaptureHandler {
	return &CaptureHandler{store: s, queue: q}
}

func (h *CaptureHandler) Capture(w http.ResponseWriter, r *http.Request) {
	var in items.CaptureInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		metrics.CaptureItems.WithLabelValues(sourceLabel(""), "unknown", "invalid").Inc()
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.URL == "" && in.Text == "" {
		metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), "unknown", "invalid").Inc()
		writeError(w, http.StatusUnprocessableEntity, "MISSING_INPUT", "either url or text is required")
		return
	}
	if in.TypeHint != "" && !items.IsValid(in.TypeHint) {
		metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), "unknown", "invalid").Inc()
		writeError(w, http.StatusUnprocessableEntity, "INVALID_TYPE", "invalid type_hint")
		return
	}

	det := items.DetectType(in)
	var normPtr *string
	if in.URL != "" {
		norm := items.NormalizeURL(in.URL)
		if norm != "" {
			normPtr = &norm
		}
	}

	userID, _ := authctx.UserID(r.Context())

	// Dedupe
	if normPtr != nil {
		existing, err := h.store.GetItemByNormalizedURL(r.Context(), userID, *normPtr)
		if err == nil {
			if in.DeckID != nil {
				_ = h.store.AddItemsToDeck(r.Context(), *in.DeckID, []uuid.UUID{existing.ID})
			}
			metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), string(existing.Type), "duplicate").Inc()
			dupID := existing.ID
			writeJSON(w, http.StatusOK, items.CaptureResponse{
				Item:             existing,
				EnrichmentStatus: existing.EnrichmentStatus,
				DuplicateOf:      &dupID,
			})
			return
		}
	}

	// Persist
	input := store.CreateItemInput{
		Type:          det.Type,
		Title:         det.Title,
		Notes:         in.Text,
		Tags:          in.Tags,
		WhySaved:      in.WhySaved,
		SourceChannel: sourceLabel(in.Source),
		Meta:          in.MetaHints,
	}
	if in.URL != "" {
		input.URL = &in.URL
	}
	input.URLNormalized = normPtr

	item, err := h.store.CreateItem(r.Context(), input)
	if err != nil {
		writeInternal(w, err)
		return
	}

	if in.DeckID != nil {
		_ = h.store.AddItemsToDeck(r.Context(), *in.DeckID, []uuid.UUID{item.ID})
	}

	// Enrichment
	job := jobs.EnrichJob{
		Kind:   jobs.KindItem,
		ID:     item.ID,
		UserID: item.UserID,
		Type:   item.Type,
	}
	if item.URL != nil {
		job.URL = *item.URL
	}
	orgID, _ := authctx.OrgID(r.Context())
	if orgID != uuid.Nil {
		job.OrgID = &orgID
	}

	enrichStatus := items.EnrichmentSkipped
	if h.queue != nil && h.queue.CanProcess(job) {
		h.queue.Enqueue(job)
		enrichStatus = items.EnrichmentQueued
		_ = h.store.UpdateItemEnrichmentStatus(r.Context(), item.ID, enrichStatus)
	}
	item.EnrichmentStatus = enrichStatus

	metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), string(item.Type), "created").Inc()
	writeJSON(w, http.StatusCreated, items.CaptureResponse{
		Item:             item,
		EnrichmentStatus: enrichStatus,
	})
}

func sourceLabel(s string) string {
	switch s {
	case "browser-extension", "cli", "web-paste", "share-target", "manual":
		return s
	default:
		return "other"
	}
}
