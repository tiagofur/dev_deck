package ai

import (
	"context"
	"reflect"
	"testing"

	"devdeck/internal/domain/items"
)

func TestHeuristicSummarize(t *testing.T) {
	h := heuristicProvider{}
	tests := []struct {
		name string
		in   Input
		want string
	}{
		{
			name: "description wins for repo",
			in: Input{
				Type:        items.TypeRepo,
				Title:       "charmbracelet/bubbletea",
				Description: "A powerful TUI framework for Go",
			},
			want: "A powerful TUI framework for Go.",
		},
		{
			name: "article fallback includes host",
			in: Input{
				Type:  items.TypeArticle,
				Title: "How to test CLIs",
				URL:   ptr("https://dev.to/foo/how-to-test-clis"),
			},
			want: "Article saved from devto: How to test CLIs.",
		},
		{
			name: "shortcut fallback",
			in: Input{
				Type:  items.TypeShortcut,
				Title: "Cmd+Shift+P",
			},
			want: "Keyboard shortcut saved for quick recall: Cmd+Shift+P.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := h.Summarize(context.Background(), tt.in)
			if err != nil {
				t.Fatalf("Summarize() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("Summarize() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestHeuristicSuggestTags(t *testing.T) {
	h := heuristicProvider{}
	tests := []struct {
		name string
		in   Input
		want []string
	}{
		{
			name: "repo pulls language topics and host",
			in: Input{
				Type:  items.TypeRepo,
				Title: "charmbracelet/bubbletea",
				URL:   ptr("https://github.com/charmbracelet/bubbletea"),
				Meta: map[string]any{
					"language": "Go",
					"topics":   []any{"tui", "terminal"},
				},
			},
			want: []string{"bubbletea", "github", "go", "repository", "terminal", "tui"},
		},
		{
			name: "cli extracts command name",
			in: Input{
				Type:  items.TypeCLI,
				Title: "brew install ripgrep",
			},
			want: []string{"brew", "cli", "install", "ripgrep"},
		},
		{
			name: "shortcut adds platform",
			in: Input{
				Type:  items.TypeShortcut,
				Title: "Cmd+Shift+P",
			},
			want: []string{"cmd", "mac", "shift", "shortcut"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := h.SuggestTags(context.Background(), tt.in)
			if err != nil {
				t.Fatalf("SuggestTags() error = %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("SuggestTags() = %#v, want %#v", got, tt.want)
			}
		})
	}
}

func TestServiceEnrichItem(t *testing.T) {
	svc := NewHeuristic()
	item := &items.Item{
		Type:  items.TypeRepo,
		Title: "charmbracelet/bubbletea",
		URL:   ptr("https://github.com/charmbracelet/bubbletea"),
		Description: ptr("A powerful TUI framework for Go"),
		Meta: map[string]any{"language": "Go", "topics": []any{"tui"}},
	}

	out, err := svc.EnrichItem(context.Background(), item)
	if err != nil {
		t.Fatalf("EnrichItem() error = %v", err)
	}
	if out.Summary != "A powerful TUI framework for Go." {
		t.Fatalf("summary = %q", out.Summary)
	}
	if len(out.Tags) == 0 {
		t.Fatal("expected tags")
	}
}

func ptr[T any](v T) *T { return &v }
