package handlers

import (
	"net/http"
	"time"

	"devdeck/internal/domain/stats"
	"devdeck/internal/store"
)

type StatsHandler struct {
	store *store.Store
}

func NewStatsHandler(s *store.Store) *StatsHandler {
	return &StatsHandler{store: s}
}

// GET /api/stats
//
// Side effect: also bumps last_open_at + streak. The frontend polls this
// endpoint on app open and every few minutes.
func (h *StatsHandler) Get(w http.ResponseWriter, r *http.Request) {
	streak, prevLastOpen, err := h.store.Heartbeat(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}

	agg, err := h.store.GetRepoAggregates(r.Context())
	if err != nil {
		writeInternal(w, err)
		return
	}

	mood := computeMood(agg, streak, prevLastOpen)

	now := time.Now().UTC()
	resp := stats.Stats{
		TotalRepos:       agg.Total,
		TotalArchived:    agg.Archived,
		TopLanguage:      agg.TopLanguage,
		TopLanguageShare: agg.TopLanguageShare,
		LastAddedAt:      agg.LastAddedAt,
		LastOpenAt:       &now,
		StreakDays:       streak,
		MascotMood:       mood,
	}
	writeJSON(w, http.StatusOK, resp)
}

// computeMood picks a mood based on simple heuristics. Order matters —
// more "interesting" moods take precedence over `idle`.
//
//	celebrating  → user just added a repo (within last 2 minutes)
//	sleeping     → previous last_open_at was more than 7 days ago
//	judging      → top language dominates (>70% with at least 5 repos)
//	happy        → streak >= 3 OR last_added_at within last hour
//	idle         → default
func computeMood(agg *stats.RepoAggregates, streak int, prevLastOpen *time.Time) stats.Mood {
	now := time.Now()

	if agg.LastAddedAt != nil && now.Sub(*agg.LastAddedAt) < 2*time.Minute {
		return stats.MoodCelebrating
	}
	if prevLastOpen != nil && now.Sub(*prevLastOpen) > 7*24*time.Hour {
		return stats.MoodSleeping
	}
	if agg.Total >= 5 && agg.TopLanguageShare > 0.7 {
		return stats.MoodJudging
	}
	if streak >= 3 {
		return stats.MoodHappy
	}
	if agg.LastAddedAt != nil && now.Sub(*agg.LastAddedAt) < 1*time.Hour {
		return stats.MoodHappy
	}
	return stats.MoodIdle
}
