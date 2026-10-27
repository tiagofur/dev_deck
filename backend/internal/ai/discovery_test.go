package ai

import (
	"context"
	"strings"
	"testing"
)

func TestDiscoveryBuilderHeuristic(t *testing.T) {
	b := NewDiscoveryBuilder("", "")
	if b.Enabled() {
		t.Fatal("builder without key must be heuristic-only")
	}

	q, usage, err := b.Build(context.Background(), "lightweight Go CLI to resize images", "")
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	if usage != nil {
		t.Fatalf("heuristic usage must be nil, got %+v", usage)
	}
	if q.Language != "go" {
		t.Errorf("language = %q, want go", q.Language)
	}
	for _, want := range []string{"language:go", "in:name,description", "stars:>50", "pushed:>2024-01-01"} {
		if !strings.Contains(q.GitHubQuery, want) {
			t.Errorf("query %q must contain %q", q.GitHubQuery, want)
		}
	}
	if len(q.Keywords) == 0 {
		t.Error("keywords must not be empty")
	}
}

func TestDiscoveryBuilderLanguageHintWins(t *testing.T) {
	b := NewDiscoveryBuilder("", "")
	q, _, err := b.Build(context.Background(), "image resizing tool", "rust")
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	if q.Language != "rust" {
		t.Errorf("language = %q, want rust (explicit hint)", q.Language)
	}
	if !strings.Contains(q.GitHubQuery, "language:rust") {
		t.Errorf("query %q must contain language:rust", q.GitHubQuery)
	}
}

func TestDiscoveryBuilderEmptyNeed(t *testing.T) {
	b := NewDiscoveryBuilder("", "")
	if _, _, err := b.Build(context.Background(), "   ", ""); err == nil {
		t.Fatal("empty need must fail")
	}
}
