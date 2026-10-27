package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AI action names recorded in ai_usage_events.action. Keep stable: the
// /me/ai-usage endpoint and future billing reports group by these.
const (
	AIActionEnrich      = "enrich"
	AIActionEmbedSearch = "embed_search"
	AIActionEmbedItem   = "embed_item"
	AIActionAgentChat   = "agent_chat"
	AIActionDiscovery   = "discovery"
)

// AIUsageEvent is one priced AI call.
type AIUsageEvent struct {
	Action         string
	Provider       string
	Model          string
	InputTokens    int
	OutputTokens   int
	EstimatedCents float64
}

// RecordAIUsage persists one metering event. Local providers ($0) are
// recorded too when asked — the caller decides whether zero-cost events
// are worth the row (background enrich skips them, chat records them).
func (s *Store) RecordAIUsage(ctx context.Context, userID uuid.UUID, ev AIUsageEvent) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO ai_usage_events (user_id, action, provider, model, input_tokens, output_tokens, estimated_cents)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, userID, ev.Action, ev.Provider, ev.Model, ev.InputTokens, ev.OutputTokens, ev.EstimatedCents)
	return err
}

// AIActionUsage aggregates one action's spend within the current month.
type AIActionUsage struct {
	Action string  `json:"action"`
	Events int     `json:"events"`
	Cents  float64 `json:"cents"`
}

// MonthlyUsage is the shaped response for GET /api/me/ai-usage.
type MonthlyUsage struct {
	UsedCents float64         `json:"used_cents"`
	ByAction  []AIActionUsage `json:"by_action"`
	ResetsAt  time.Time       `json:"resets_at"`
}

// GetMonthlyUsage sums the user's spend since the first of the current
// UTC month, plus per-action breakdown. Cheap: single indexed range scan.
func (s *Store) GetMonthlyUsage(ctx context.Context, userID uuid.UUID) (*MonthlyUsage, error) {
	now := time.Now().UTC()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	resetsAt := monthStart.AddDate(0, 1, 0)

	rows, err := s.Reader().Query(ctx, `
		SELECT action, COUNT(*), COALESCE(SUM(estimated_cents), 0)
		FROM ai_usage_events
		WHERE user_id = $1 AND created_at >= $2
		GROUP BY action
		ORDER BY action
	`, userID, monthStart)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := &MonthlyUsage{ResetsAt: resetsAt, ByAction: []AIActionUsage{}}
	for rows.Next() {
		var a AIActionUsage
		if err := rows.Scan(&a.Action, &a.Events, &a.Cents); err != nil {
			return nil, err
		}
		out.ByAction = append(out.ByAction, a)
		out.UsedCents += a.Cents
	}
	return out, rows.Err()
}

// MonthlySpendCents returns just the total for cap checks.
func (s *Store) MonthlySpendCents(ctx context.Context, userID uuid.UUID) (float64, error) {
	now := time.Now().UTC()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	var total float64
	err := s.Reader().QueryRow(ctx, `
		SELECT COALESCE(SUM(estimated_cents), 0)
		FROM ai_usage_events
		WHERE user_id = $1 AND created_at >= $2
	`, userID, monthStart).Scan(&total)
	return total, err
}
