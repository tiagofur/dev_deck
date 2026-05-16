// Package jobs runs background work that shouldn't block HTTP responses.
//
// Right now the only job is repo/item enrichment: after POST /api/items/capture
// or POST /api/repos finishes, we enqueue an enrichment task so stars,
// description, language, OG metadata etc. get pulled without the user
// waiting on GitHub's or a third party's latency.
//
// The queue is an in-memory bounded channel backed by one worker goroutine.
// That's intentionally simple for Wave 4.5 — if/when we need persistence
// across restarts or horizontal scaling, this package is the seam to swap
// for a real queue (NATS, Postgres LISTEN/NOTIFY, etc.) without touching
// handlers.
package jobs

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"devdeck/internal/ai"
	"devdeck/internal/domain/items"
	"devdeck/internal/enricher"
	"devdeck/internal/metrics"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

// EnrichKind classifies a job so the worker knows which store path to
// update. The set is small and closed so we can match on it safely.
type EnrichKind string

const (
	// KindRepo updates rows in the legacy `repos` table (pre-items migration).
	KindRepo EnrichKind = "repo"
	// KindItem updates rows in the new `items` table created in Wave 4.5 §16.9.
	KindItem EnrichKind = "item"
)

// EnrichJob is the unit of work the queue processes.
type EnrichJob struct {
	Kind   EnrichKind
	ID     uuid.UUID
	UserID uuid.UUID
	OrgID  *uuid.UUID
	URL    string
	Type   items.Type
}

// EnrichQueue is the producer-facing handle. Handlers call Enqueue;
// the worker loop runs in a goroutine started by Start.
type EnrichQueue struct {
	ch       chan EnrichJob
	store    *store.Store
	ai       *ai.Service
	enricher *enricher.Service
	timeout  time.Duration
}

// NewEnrichQueue allocates a queue with the given buffer size. A buffer
// of 64 is plenty for a single-node deployment; enqueues beyond that
// drop the oldest waiting job instead of blocking the handler.
func NewEnrichQueue(st *store.Store, en *enricher.Service, aiSvc *ai.Service, buffer int) *EnrichQueue {
	if buffer <= 0 {
		buffer = 64
	}
	return &EnrichQueue{
		ch:       make(chan EnrichJob, buffer),
		store:    st,
		ai:       aiSvc,
		enricher: en,
		timeout:  15 * time.Second,
	}
}

// CanProcess returns true when the queue has at least one stage that can do
// useful work for the given job.
func (q *EnrichQueue) CanProcess(job EnrichJob) bool {
	if q == nil {
		return false
	}
	return q.canFetchMetadata(job) || q.canRunAI(job)
}

// Enqueue pushes a job onto the queue without blocking. If the buffer
// is full we drop the job and record it as "skipped" in metrics — the
// cron refresher will pick it up on the next pass anyway.
func (q *EnrichQueue) Enqueue(job EnrichJob) {
	if q == nil {
		return
	}
	select {
	case q.ch <- job:
	default:
		slog.Warn("enrich: queue full, dropping job", "kind", job.Kind, "id", job.ID)
		metrics.EnrichJobs.WithLabelValues(string(job.Kind), "skipped").Inc()
	}
}

// Start runs the worker loop in a new goroutine. It exits when ctx is
// canceled. Call exactly once per queue.
func (q *EnrichQueue) Start(ctx context.Context) {
	if q == nil {
		return
	}
	go func() {
		for {
			select {
			case <-ctx.Done():
				slog.Info("enrich: worker shutting down")
				return
			case job := <-q.ch:
				q.run(ctx, job)
			}
		}
	}()
}

func (q *EnrichQueue) run(parent context.Context, job EnrichJob) {
	ctx, cancel := context.WithTimeout(parent, q.timeout)
	defer cancel()

	if !q.CanProcess(job) {
		metrics.EnrichJobs.WithLabelValues(string(job.Kind), "skipped").Inc()
		return
	}

	processed := false
	hadError := false

	if q.canFetchMetadata(job) {
		// Load custom enrichers for this user/org
		var extra []enricher.ExternalEnricher
		customs, err := q.store.ListCustomEnrichers(ctx, job.UserID, job.OrgID)
		if err == nil {
			for _, c := range customs {
				extra = append(extra, enricher.NewWebhookEnricher(c.Name, c.URLPattern, c.EndpointURL, c.AuthHeader))
			}
		}

		md, err := q.enricher.Enrich(ctx, job.URL, extra)
		if err != nil {
			level := slog.LevelWarn
			if errors.Is(err, enricher.ErrNotFound) {
				level = slog.LevelInfo
			}
			slog.Log(ctx, level, "enrich: fetch failed",
				"err", err, "kind", job.Kind, "id", job.ID, "url", job.URL)
			hadError = true
		} else {
			switch job.Kind {
			case KindRepo:
				if _, err := q.store.UpdateMetadata(ctx, job.ID, md); err != nil {
					slog.Warn("enrich: update repo metadata failed", "err", err, "id", job.ID)
					hadError = true
				} else {
					processed = true
				}
			case KindItem:
				if err := q.store.UpdateItemFromMetadata(ctx, job.ID, md); err != nil {
					slog.Warn("enrich: update item metadata failed", "err", err, "id", job.ID)
					hadError = true
				} else {
					processed = true
				}
			default:
				slog.Warn("enrich: unknown job kind", "kind", job.Kind)
				hadError = true
			}
		}
	}

	if job.Kind == KindItem && q.canRunAI(job) {
		it, err := q.store.GetItem(ctx, job.ID)
		if err != nil {
			slog.Warn("enrich: load item for ai failed", "err", err, "id", job.ID)
			hadError = true
		} else {
			out, err := q.ai.EnrichItem(ctx, it)
			if err != nil {
				slog.Warn("enrich: ai enrich failed", "err", err, "id", job.ID)
				hadError = true
			}
			if err := q.store.UpdateItemAIFields(ctx, job.ID, out.Summary, out.Tags); err != nil {
				slog.Warn("enrich: update item ai fields failed", "err", err, "id", job.ID)
				hadError = true
			} else {
				processed = true
			}
		}
	}

	status := resolveStatus(processed, hadError)
	if job.Kind == KindItem {
		if err := q.store.UpdateItemEnrichmentStatus(ctx, job.ID, items.EnrichmentStatus(status)); err != nil {
			slog.Warn("enrich: update item status failed", "err", err, "id", job.ID, "status", status)
		}
	}
	metrics.EnrichJobs.WithLabelValues(string(job.Kind), status).Inc()
}

func (q *EnrichQueue) canRunAI(job EnrichJob) bool {
	return q != nil && job.Kind == KindItem && q.ai != nil && q.ai.Enabled() && canAutoEnrichItemType(job.Type)
}

func (q *EnrichQueue) canFetchMetadata(job EnrichJob) bool {
	if q == nil || q.enricher == nil || job.URL == "" {
		return false
	}
	if job.Kind == KindRepo {
		return true
	}
	return canAutoEnrichItemType(job.Type)
}

func canAutoEnrichItemType(t items.Type) bool {
	switch t {
	case items.TypeRepo, items.TypePlugin, items.TypeArticle, items.TypeTool, items.TypeAgent, items.TypeWorkflow, items.TypeCLI:
		return true
	default:
		return false
	}
}

func resolveStatus(processed, hadError bool) string {
	if hadError {
		return "error"
	}
	if processed {
		return "ok"
	}
	return "skipped"
}
