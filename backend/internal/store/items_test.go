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
		tag      string
		stack    []string
		expected []string
	}{
		{
			name:     "Filter by Go tag",
			tag:      "go",
			expected: []string{"Go Backend"},
		},
		{
			name:     "Filter by React (AI tag)",
			tag:      "react",
			expected: []string{"React Frontend"},
		},
		{
			name:     "Filter by TypeScript language",
			stack:    []string{"typescript"},
			expected: []string{"React Frontend"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := st.ListItems(ctx, items.ListParams{
				Tag:   tt.tag,
				Stack: tt.stack,
			})
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

	t.Run("Reproduce user report: sort=added_desc, limit=200", func(t *testing.T) {
		res, err := st.ListItems(ctx, items.ListParams{
			Sort:  "added_desc",
			Limit: 200,
		})
		if err != nil {
			t.Fatalf("ListItems failed with added_desc: %v", err)
		}
		if res.Total == 0 {
			t.Log("No items found, but query succeeded")
		}
	})
}

func TestStore_ListItems_EmptyVault(t *testing.T) {
	st, ctx := newStore(t)

	res, err := st.ListItems(ctx, items.ListParams{
		Sort:  "added_desc",
		Limit: 200,
	})
	if err != nil {
		t.Fatalf("ListItems empty vault failed: %v", err)
	}
	if res.Total != 0 {
		t.Fatalf("expected zero total for empty vault, got %d", res.Total)
	}
	if len(res.Items) != 0 {
		t.Fatalf("expected zero items for empty vault, got %d", len(res.Items))
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
	res, err := st.AskDevDeck(ctx, "Citation", nil, 5)
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

func TestStore_CreateItem_WithoutOrg_SetsNullOrgID(t *testing.T) {
	st, ctx := newStore(t)

	userID := mustUUID(t, "00000000-0000-0000-0000-000000000001")
	ctx = authctx.WithUserID(ctx, userID)

	it, err := st.CreateItem(ctx, store.CreateItemInput{
		Type:  items.TypeNote,
		Title: "note without org",
		Notes: "test",
	})
	if err != nil {
		t.Fatalf("create item: %v", err)
	}
	if it.OrgID != nil {
		t.Fatalf("expected org_id to be nil, got %s", *it.OrgID)
	}
}

func TestStore_ListItems_Security(t *testing.T) {
	st, ctx := newStore(t)

	userID := mustUUID(t, "00000000-0000-0000-0000-000000000001")
	ctx = authctx.WithUserID(ctx, userID)

	// Create a legitimate item
	_, err := st.CreateItem(ctx, store.CreateItemInput{
		Type:  items.TypeArticle,
		Title: "Legit Item",
		Tags:  []string{"secure"},
	})
	if err != nil {
		t.Fatalf("failed to create item: %v", err)
	}

	// Attempt SQL injection via Tag filter
	// If vulnerable, this could potentially bypass the WHERE clause or cause an error
	maliciousTag := "secure') OR '1'='1"
	res, err := st.ListItems(ctx, items.ListParams{
		Tag: maliciousTag,
	})

	if err != nil {
		// An error is actually a good sign if the driver rejects malformed input,
		// but we expect it to just return 0 items because the tag doesn't match.
		t.Logf("ListItems with malicious tag returned error (possibly safe): %v", err)
	} else if res.Total > 0 {
		// If res.Total > 0, it might mean the OR '1'='1' worked.
		// However, in this case, ListItems adds archived=false by default.
		// Let's check if it matched the legit item.
		for _, it := range res.Items {
			found := false
			for _, tag := range it.Tags {
				if tag == maliciousTag {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("SQL Injection successful? Found item %q which does not have tag %q", it.Title, maliciousTag)
			}
		}
	}

	// Attempt SQL injection via Q (search) filter
	maliciousQuery := "') OR 1=1 --"
	res, err = st.ListItems(ctx, items.ListParams{
		Q: maliciousQuery,
	})
	if err != nil {
		t.Logf("ListItems with malicious query returned error (possibly safe): %v", err)
	} else if res.Total > 0 {
		for _, it := range res.Items {
			// If it matches "Legit Item" but the query is clearly not in any searchable field,
			// it's an injection.
			if it.Title != maliciousQuery && it.Description == nil {
				t.Errorf("SQL Injection successful in Q? Found item %q which does not match query %q", it.Title, maliciousQuery)
			}
		}
	}
}
