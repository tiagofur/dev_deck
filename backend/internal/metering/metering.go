// Package metering prices AI calls and enforces the monthly Pro cap.
//
// One event is recorded per priced call (enrich, embedding, agent turn,
// discovery query). The monthly cap (~$3 default) protects margin: past
// it, synchronous endpoints answer 429 AI_QUOTA_EXCEEDED and background
// work silently falls back to the $0 heuristic. Record failures never
// fail the user request — metering is best-effort, the AI result won.
package metering

import (
	"context"
	"errors"
	"log/slog"

	"heapdeck/internal/ai"
	"heapdeck/internal/store"

	"github.com/google/uuid"
)

// ErrQuotaExceeded signals the monthly AI budget is spent.
var ErrQuotaExceeded = errors.New("monthly ai budget exceeded")

// Recorder prices events against the cap. Zero-value (nil store) disables
// everything: allowed everywhere, records nothing (self-host/tests).
type Recorder struct {
	store       *store.Store
	budgetCents float64
	provider    string
}

// New builds a recorder. Pass the configured AI provider name so events
// carry it without every call site repeating it. budgetCents <= 0 or a
// nil store disables enforcement and persistence.
func New(st *store.Store, budgetCents int, provider string) *Recorder {
	return &Recorder{store: st, budgetCents: float64(budgetCents), provider: provider}
}

func (r *Recorder) enabled() bool {
	return r != nil && r.store != nil && r.budgetCents > 0
}

// Allowed reports whether the user may spend on another AI call. Unknown
// users and DB errors fail open for reads: blocking on a metering outage
// would be worse than leaking a few cents of margin.
func (r *Recorder) Allowed(ctx context.Context, userID uuid.UUID) bool {
	if !r.enabled() {
		return true
	}
	spent, err := r.store.MonthlySpendCents(ctx, userID)
	if err != nil {
		slog.Warn("metering: spend lookup failed, allowing", "err", err)
		return true
	}
	return spent < r.budgetCents
}

// Usage mirrors ai.Usage without importing the ai package (which would
// create an import cycle: ai doesn't know about metering, metering prices
// ai's reports). Call sites convert with one line.
type Usage struct {
	InputTokens  int
	OutputTokens int
}

// FromAI converts the ai-layer usage report.
func FromAI(u *ai.Usage) *Usage {
	if u == nil {
		return nil
	}
	return &Usage{InputTokens: u.InputTokens, OutputTokens: u.OutputTokens}
}

// RecordDetailed persists a fully-shaped event.
func (r *Recorder) RecordDetailed(ctx context.Context, userID uuid.UUID, ev store.AIUsageEvent) {
	if !r.enabled() {
		return
	}
	if ev.Provider == "" {
		ev.Provider = r.provider
	}
	if err := r.store.RecordAIUsage(ctx, userID, ev); err != nil {
		slog.Warn("metering: record failed", "err", err, "action", ev.Action)
	}
}

// RecordUsage prices token counts against the model table and persists.
func (r *Recorder) RecordUsage(ctx context.Context, userID uuid.UUID, action, model string, usage *Usage) {
	var in, out int
	if usage != nil {
		in, out = usage.InputTokens, usage.OutputTokens
	}
	r.RecordDetailed(ctx, userID, store.AIUsageEvent{
		Action:         action,
		Model:          model,
		InputTokens:    in,
		OutputTokens:   out,
		EstimatedCents: ai.EstimateCents(model, in, out),
	})
}
