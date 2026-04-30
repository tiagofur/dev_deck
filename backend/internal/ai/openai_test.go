package ai

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"devdeck/internal/domain/items"
)

func TestSanitizeForAI(t *testing.T) {
	item := &items.Item{
		Type:        items.TypeTool,
		Title:       "  ripgrep  ",
		Description: ptr("Fast search tool"),
		URL:         ptr("https://ripgrep.dev"),
		Notes:       "private",
		WhySaved:    "private why",
		WhenToUse:   "private when",
		Meta: map[string]any{
			"language":        "Rust",
			"topics":          []any{"search"},
			"capture_context": "popup",
		},
	}
	in := SanitizeForAI(item)
	if in.Title != "ripgrep" {
		t.Fatalf("title = %q", in.Title)
	}
	if in.Description != "Fast search tool" {
		t.Fatalf("description = %q", in.Description)
	}
	if _, ok := in.Meta["capture_context"]; ok {
		t.Fatal("capture_context should not be forwarded")
	}
	if in.Meta["language"] != "Rust" {
		t.Fatal("language should be preserved")
	}
}

func TestOpenAIProviderSummarizeAndTags(t *testing.T) {
	responses := []string{
		`{"choices":[{"message":{"content":"[\"cli\",\"search\"]"}}]}`,
		`{"choices":[{"message":{"content":"Short summary."}}]}`,
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(responses[0]))
		if len(responses) > 1 {
			responses = responses[1:]
		}
	}))
	defer server.Close()

	oldURL := openAIBaseURLForTests
	openAIBaseURLForTests = server.URL
	defer func() { openAIBaseURLForTests = oldURL }()

	p := &openAIProvider{apiKey: "test", model: "gpt-4o-mini", httpc: server.Client()}
	tags, err := p.SuggestTags(context.Background(), Input{Type: items.TypeCLI, Title: "ripgrep"})
	if err != nil {
		t.Fatalf("SuggestTags error = %v", err)
	}
	if len(tags) != 2 || tags[0] != "cli" || tags[1] != "search" {
		t.Fatalf("tags = %#v", tags)
	}
	summary, err := p.Summarize(context.Background(), Input{Type: items.TypeCLI, Title: "ripgrep"})
	if err != nil {
		t.Fatalf("Summarize error = %v", err)
	}
	if summary != "Short summary." {
		t.Fatalf("summary = %q", summary)
	}
}
