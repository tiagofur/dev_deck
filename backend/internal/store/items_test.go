package store_test

import (
	"testing"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/items"
	"devdeck/internal/store"
)

func TestStore_ListItems_StackFilter(t *testing.T) {
	st, ctx := newStore(t)

	userID := mustUUID(t, "00000000-0000-0000-0000-000000000001")
	ctx = authctx.WithUserID(ctx, userID)

	// Create test items
	testData := []struct {
		title  string
		tags   []string
		aiTags []string
		meta   map[string]any
	}{
		{
			title: "Go Backend",
			tags:  []string{"backend", "go"},
			meta:  map[string]any{"language": "Go"},
		},
		{
			title:  "React Frontend",
			tags:   []string{"frontend"},
			aiTags: []string{"react", "typescript"},
			meta:   map[string]any{"language": "TypeScript"},
		},
		{
			title: "Python AI Tool",
			tags:  []string{"cli"},
			meta:  map[string]any{"language": "Python", "topics": []string{"automation", "ai"}},
		},
	}

	for _, d := range testData {
		it, err := st.CreateItem(ctx, store.CreateItemInput{
			Type:  items.TypeRepo,
			Title: d.title,
			Tags:  d.tags,
			Meta:  d.meta,
		})
		if err != nil {
			t.Fatalf("failed to create item %q: %v", d.title, err)
		}
		if len(d.aiTags) > 0 {
			if err := st.UpdateItemAIFields(ctx, it.ID, "summary", d.aiTags); err != nil {
				t.Fatalf("failed to update AI tags for %q: %v", d.title, err)
			}
		}
	}

	tests := []struct {
		name     string
		stack    []string
		expected []string
	}{
		{
			name:     "Filter by Go",
			stack:    []string{"go"},
			expected: []string{"Go Backend"},
		},
		{
			name:     "Filter by React (AI tag)",
			stack:    []string{"react"},
			expected: []string{"React Frontend"},
		},
		{
			name:     "Filter by AI (Topic)",
			stack:    []string{"ai"},
			expected: []string{"Python AI Tool"},
		},
		{
			name:     "Filter by multiple (Go or React)",
			stack:    []string{"go", "react"},
			expected: []string{"Go Backend", "React Frontend"},
		},
		{
			name:     "Case insensitive search (GO)",
			stack:    []string{"GO"},
			expected: []string{"Go Backend"},
		},
		{
			name:     "No match",
			stack:    []string{"rust"},
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := st.ListItems(ctx, items.ListParams{Stack: tt.stack})
			if err != nil {
				t.Fatalf("ListItems failed: %v", err)
			}

			if len(res.Items) != len(tt.expected) {
				t.Errorf("expected %d items, got %d", len(tt.expected), len(res.Items))
			}

			found := make(map[string]bool)
			for _, it := range res.Items {
				found[it.Title] = true
			}

			for _, exp := range tt.expected {
				if !found[exp] {
					t.Errorf("expected item %q not found in results", exp)
				}
			}
		})
	}
}

func TestStore_AskDevDeck_Citations(t *testing.T) {
	st, ctx := newStore(t)

	userID := mustUUID(t, "00000000-0000-0000-0000-000000000001")
	ctx = authctx.WithUserID(ctx, userID)

	// Create a test item
	it, err := st.CreateItem(ctx, store.CreateItemInput{
		Type:  items.TypeRepo,
		Title: "Test Citation Item",
		URL:   strPtr("https://example.com/citation"),
	})
	if err != nil {
		t.Fatalf("failed to create item: %v", err)
	}

	// Run Ask (text search fallback since embedding is nil)
	res, err := st.AskDevDeck(ctx, userID, "Citation", nil, 5)
	if err != nil {
		t.Fatalf("AskDevDeck failed: %v", err)
	}

	if len(res.Citations) == 0 {
		t.Fatal("expected at least one citation, got 0")
	}

	found := false
	for _, c := range res.Citations {
		if c.ID == it.ID && c.Title == "Test Citation Item" && c.URL == "https://example.com/citation" {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("expected citation for item %s not found or incorrect", it.ID)
	}
}
