package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"devdeck/internal/domain/stats"

	"github.com/jackc/pgx/v5"
)

// mascotState is what we persist in app_state under the key 'mascot_state'.
// JSONB makes this easy to evolve without migrations.
type mascotState struct {
	LastOpenAt    *time.Time `json:"last_open_at"`
	StreakCount   int        `json:"streak_count"`
	StreakLastDay string     `json:"streak_last_day"` // YYYY-MM-DD UTC
}

func mascotStateKey(ctx context.Context) string {
	if userID, ok := currentUserID(ctx); ok {
		return "mascot_state:" + userID.String()
	}
	return "mascot_state"
}

// Heartbeat updates last_open_at and the streak counter, returning:
//   - the streak BEFORE the current visit was counted (for "fresh streak" UX),
//   - the previous last_open_at (so the handler can detect "long absence").
//
// This runs in a transaction with FOR UPDATE so concurrent calls behave.
func (s *Store) Heartbeat(ctx context.Context) (streak int, prevLastOpen *time.Time, err error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	key := mascotStateKey(ctx)
	var raw []byte
	row := tx.QueryRow(ctx, `SELECT v FROM app_state WHERE k = $1 FOR UPDATE`, key)
	if err := row.Scan(&raw); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, nil, err
	}

	var st mascotState
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &st)
	}
	prevLastOpen = st.LastOpenAt

	now := time.Now().UTC()
	today := now.Format("2006-01-02")
	yesterday := now.AddDate(0, 0, -1).Format("2006-01-02")

	switch st.StreakLastDay {
	case today:
		// Already counted today — no change to streak.
	case yesterday:
		st.StreakCount++
		st.StreakLastDay = today
	default:
		st.StreakCount = 1
		st.StreakLastDay = today
	}
	st.LastOpenAt = &now

	newRaw, err := json.Marshal(st)
	if err != nil {
		return 0, nil, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO app_state (k, v) VALUES ($1, $2)
		ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v
	`, key, newRaw); err != nil {
		return 0, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, nil, err
	}
	return st.StreakCount, prevLastOpen, nil
}

// GetRepoAggregates returns counts and dominant-language stats over the
// non-archived repos.
func (s *Store) GetRepoAggregates(ctx context.Context) (*stats.RepoAggregates, error) {
	a := &stats.RepoAggregates{}
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)

	// Total active + archived + last added
	err := s.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE archived = false AND item_type = 'repo'),
			COUNT(*) FILTER (WHERE archived = true AND item_type = 'repo'),
			MAX(created_at)
		FROM items
		WHERE `+scopeSQL, scopeArgs...).Scan(&a.Total, &a.Archived, &a.LastAddedAt)
	if err != nil {
		return nil, err
	}

	// Top language (among non-archived repos)
	var lang *string
	var langCount int
	langArgs := append([]any{}, scopeArgs...)
	err = s.pool.QueryRow(ctx, `
		SELECT meta->>'language' as lang, COUNT(*) AS c FROM items
		WHERE archived = false AND item_type = 'repo' AND meta->>'language' IS NOT NULL AND `+scopeSQL+`
		GROUP BY lang
		ORDER BY c DESC
		LIMIT 1
	`, langArgs...).Scan(&lang, &langCount)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	a.TopLanguage = lang
	if a.Total > 0 && langCount > 0 {
		a.TopLanguageShare = float64(langCount) / float64(a.Total)
	}
	return a, nil
}
