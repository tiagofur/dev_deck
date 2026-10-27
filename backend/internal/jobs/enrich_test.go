package jobs

import (
	"context"
	"testing"

	"heapdeck/internal/ai"
	"heapdeck/internal/domain/items"

	"github.com/google/uuid"
)

func TestEnrichQueue_AIFor_BranchesByPlan(t *testing.T) {
	job := EnrichJob{Kind: KindItem, ID: uuid.New(), UserID: uuid.New(), Type: items.TypeRepo}

	t.Run("nil resolver uses configured service", func(t *testing.T) {
		q := NewEnrichQueue(nil, nil, ai.NewDisabled(), 8, nil)
		if got := q.aiFor(job); got == nil || got.Enabled() {
			t.Fatalf("nil resolver must return the configured service (disabled here), got enabled=%v", got != nil && got.Enabled())
		}
		if q.canRunAI(job) {
			t.Error("canRunAI must be false when the configured service is disabled")
		}
	})

	t.Run("pro user uses configured service", func(t *testing.T) {
		q := NewEnrichQueue(nil, nil, ai.NewDisabled(), 8, func(context.Context, uuid.UUID) bool { return true })
		if got := q.aiFor(job); got == nil || got.Enabled() {
			t.Fatal("pro user must get the configured service")
		}
	})

	t.Run("free user falls back to heuristic", func(t *testing.T) {
		q := NewEnrichQueue(nil, nil, ai.NewDisabled(), 8, func(context.Context, uuid.UUID) bool { return false })
		got := q.aiFor(job)
		if got == nil || !got.Enabled() {
			t.Fatal("free user must get the always-on heuristic service")
		}
		if !q.canRunAI(job) {
			t.Error("canRunAI must be true for free users via the heuristic fallback")
		}
	})

	t.Run("non enrichable types never run ai", func(t *testing.T) {
		q := NewEnrichQueue(nil, nil, ai.NewHeuristic(), 8, func(context.Context, uuid.UUID) bool { return false })
		snippet := EnrichJob{Kind: KindItem, ID: uuid.New(), UserID: uuid.New(), Type: items.TypeSnippet}
		if q.canRunAI(snippet) {
			t.Error("canRunAI must stay false for non-auto-enrich types even with heuristic fallback")
		}
	})
}
