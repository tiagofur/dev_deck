// Package stats holds the data shapes returned by /api/stats.
//
// The "mascot mood" is computed from these stats by the handler so the
// frontend can read a single string and animate accordingly.
package stats

import "time"

type Mood string

const (
	MoodIdle        Mood = "idle"
	MoodHappy       Mood = "happy"
	MoodSleeping    Mood = "sleeping"
	MoodJudging     Mood = "judging"
	MoodCelebrating Mood = "celebrating"
)

// Stats is the public response shape of GET /api/stats.
type Stats struct {
	TotalRepos       int        `json:"total_repos"`
	TotalArchived    int        `json:"total_archived"`
	TopLanguage      *string    `json:"top_language"`
	TopLanguageShare float64    `json:"top_language_share"`
	LastAddedAt      *time.Time `json:"last_added_at"`
	LastOpenAt       *time.Time `json:"last_open_at"`
	StreakDays       int        `json:"streak_days"`
	MascotMood       Mood       `json:"mascot_mood"`
}

// RepoAggregates is the internal projection used by the store layer.
type RepoAggregates struct {
	Total            int
	Archived         int
	TopLanguage      *string
	TopLanguageShare float64
	LastAddedAt      *time.Time
}
