package handlers

import (
	"testing"
	"time"

	"heapdeck/internal/ai"
	"heapdeck/internal/enricher"
)

func TestRankHits_OrdersByScore(t *testing.T) {
	recent := time.Now().AddDate(0, 0, -5).Format(time.RFC3339)
	stale := time.Now().AddDate(-2, 0, 0).Format(time.RFC3339)

	hits := []enricher.SearchHit{
		{FullName: "old/famous", HTMLURL: "https://github.com/old/famous", Description: "image tools", Language: "Python", Stars: 50000, PushedAt: stale},
		{FullName: "new/fit", HTMLURL: "https://github.com/new/fit", Description: "fast image resize library", Language: "Go", Stars: 800, PushedAt: recent, Topics: []string{"go", "imaging"}},
		{FullName: "mid/other", HTMLURL: "https://github.com/mid/other", Description: "unrelated database", Language: "Go", Stars: 2000, PushedAt: recent},
	}
	query := ai.DiscoveryQuery{GitHubQuery: "image resize language:go", Language: "go", Keywords: []string{"image", "resize"}}

	ranked := rankHits(hits, query)
	if len(ranked) != 3 {
		t.Fatalf("ranked = %d, want 3", len(ranked))
	}
	// The recent Go match with keyword overlap must beat the stale famous
	// repo and the recent-but-irrelevant one.
	if ranked[0].FullName != "new/fit" {
		t.Fatalf("first = %s (score %.2f), want new/fit; order: %s, %s, %s",
			ranked[0].FullName, ranked[0].Score, ranked[0].FullName, ranked[1].FullName, ranked[2].FullName)
	}
	if ranked[0].MatchReason == "" {
		t.Error("winner must carry a match reason")
	}
	for i := 1; i < len(ranked); i++ {
		if ranked[i].Score > ranked[i-1].Score {
			t.Fatalf("not sorted desc at %d: %v then %v", i, ranked[i-1].Score, ranked[i].Score)
		}
	}
}

func TestRankHits_EmptyInput(t *testing.T) {
	if got := rankHits(nil, ai.DiscoveryQuery{}); len(got) != 0 {
		t.Fatalf("empty in must yield empty out, got %v", got)
	}
}
