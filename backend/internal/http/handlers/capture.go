package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"devdeck/internal/domain/items"
	"devdeck/internal/jobs"
	"devdeck/internal/metrics"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

// CaptureHandler wires POST /api/items/capture. See docs/CAPTURE.md for
// the full spec and Wave 4.5 §16.9 for the checklist.
//
// The handler is deliberately small: it parses, classifies, dedupes,
// persists, and enqueues enrichment. All the interesting logic lives in
// internal/domain/items (type detection + URL normalization) and the
// store; the handler is just glue.
type CaptureHandler struct {
	store *store.Store
	queue *jobs.EnrichQueue
}

func NewCaptureHandler(s *store.Store, q *jobs.EnrichQueue) *CaptureHandler {
	return &CaptureHandler{store: s, queue: q}
}

// Capture handles POST /api/items/capture.
//
// Success paths (200 OK):
//  1. New item created — returns item + enrichment_status=queued.
//  2. Duplicate detected — returns existing item + duplicate_of set.
//
// Error paths:
//   - 400 for invalid JSON or missing url+text.
//   - 422 for an invalid explicit type_hint.
//   - 500 for store errors that aren't uniqueness violations.
func (h *CaptureHandler) Capture(w http.ResponseWriter, r *http.Request) {
	var in items.CaptureInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		metrics.CaptureItems.WithLabelValues(sourceLabel(""), "unknown", "invalid").Inc()
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.URL == "" && in.Text == "" {
		metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), "unknown", "invalid").Inc()
		writeError(w, http.StatusUnprocessableEntity, "MISSING_INPUT",
			"either url or text is required")
		return
	}
	if in.TypeHint != "" && !items.IsValid(in.TypeHint) {
		metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), "unknown", "invalid").Inc()
		writeError(w, http.StatusUnprocessableEntity, "INVALID_TYPE_HINT",
			"unknown item type_hint")
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

	// ─── Dedupe ───
	// 1. Items table (new capture-created rows).
	if normPtr != nil {
		existing, err := h.store.FindItemByNormalizedURL(r.Context(), *normPtr)
		if err == nil {
			if in.DeckID != nil {
				if derr := h.store.AddItemsToDeck(r.Context(), *in.DeckID, []uuid.UUID{existing.ID}); derr != nil {
					writeInternal(w, derr)
					return
				}
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
		if !errors.Is(err, store.ErrNotFound) {
			writeInternal(w, err)
			return
		}

		// 2. Legacy repos table (pre-items rows). If it exists there we
		//    still return a "duplicate" response so the client doesn't
		//    double-save, but we don't synthesise an item — we just point
		//    at the repo's id. Clients can dereference /api/repos/{id}.
		if repoID, err := h.store.FindRepoIDByNormalizedURL(r.Context(), *normPtr); err == nil {
			metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), "repo", "duplicate").Inc()
			id := repoID
			writeJSON(w, http.StatusOK, items.CaptureResponse{
				Item:             nil,
				EnrichmentStatus: items.EnrichmentSkipped,
				DuplicateOf:      &id,
			})
			return
		} else if !errors.Is(err, store.ErrNotFound) {
			writeInternal(w, err)
			return
		}
	}

	// ─── Persist ───
	input := store.CreateItemInput{
		Type:             det.Type,
		Title:            det.Title,
		Notes:            in.Text, // for note/snippet/shortcut, Text is the body
		Tags:             in.Tags,
		WhySaved:         in.WhySaved,
		SourceChannel:    sourceLabel(in.Source),
		Meta:             in.MetaHints,
		EnrichmentStatus: items.EnrichmentPending,
	}
	if in.URL != "" {
		u := in.URL
		input.URL = &u
	}
	if normPtr != nil {
		input.URLNormalized = normPtr
	}

	item, err := h.store.CreateItem(r.Context(), input)
	if err != nil {
		// Race: someone slipped a duplicate in between our lookup and the
		// insert. Re-run the dedupe lookup and return the row we now see.
		if errors.Is(err, store.ErrAlreadyExists) && normPtr != nil {
			if existing, gerr := h.store.FindItemByNormalizedURL(r.Context(), *normPtr); gerr == nil {
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
		slog.Error("capture: unexpected error", "err", err, "input_title", input.Title, "input_url", in.URL)
		writeInternal(w, err)
		return
	}

	if in.DeckID != nil {
		if err := h.store.AddItemsToDeck(r.Context(), *in.DeckID, []uuid.UUID{item.ID}); err != nil {
			writeInternal(w, err)
			return
		}
	}

	// ─── Enqueue enrichment / AI analysis ───
	enrichStatus := items.EnrichmentSkipped
	job := jobs.EnrichJob{
		Kind: jobs.KindItem,
		ID:   item.ID,
		Type: item.Type,
	}
	if item.URL != nil {
		job.URL = *item.URL
	}
	if h.queue != nil && h.queue.CanProcess(job) {
		h.queue.Enqueue(job)
		enrichStatus = items.EnrichmentQueued
		if err := h.store.UpdateItemEnrichmentStatus(r.Context(), item.ID, enrichStatus); err != nil {
			// Non-fatal: we already created the item, just note the drift.
			// Response still reports the attempted status.
			metrics.EnrichJobs.WithLabelValues("item", "error").Inc()
		} else {
			item.EnrichmentStatus = enrichStatus
		}
	} else {
		item.EnrichmentStatus = enrichStatus
	}

	metrics.CaptureItems.WithLabelValues(sourceLabel(in.Source), string(item.Type), "created").Inc()
	writeJSON(w, http.StatusCreated, items.CaptureResponse{
		Item:             item,
		EnrichmentStatus: enrichStatus,
		DuplicateOf:      nil,
	})
}

// sourceLabel caps the cardinality of the source label on the metrics.
// Unknown sources fall back to "other" so we don't grow the label set
// forever.
func sourceLabel(s string) string {
	switch s {
	case "browser-extension", "cli", "web-paste", "share-target", "manual":
		return s
	case "":
		return "manual"
	default:
		return "other"
	}
}

// compile-time check that uuid stays in use even if the handler changes.
var _ = uuid.Nil
