package store_test

import (
	"errors"
	"testing"

	"devdeck/internal/domain/cheatsheets"
	"devdeck/internal/domain/items"
	"devdeck/internal/domain/repos"
	"devdeck/internal/store"
)

// (helper not used yet — kept for future tests)

func TestStore_CreateCheatsheet_RejectsDuplicateSlug(t *testing.T) {
	st, ctx := newStore(t)
	if _, err := st.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug: "git", Title: "Git", Category: "vcs",
	}); err != nil {
		t.Fatalf("first create: %v", err)
	}
	_, err := st.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug: "git", Title: "Git 2", Category: "vcs",
	})
	if !errors.Is(err, store.ErrAlreadyExists) {
		t.Fatalf("expected ErrAlreadyExists on dup slug, got %v", err)
	}
}

func TestStore_CreateEntry_AssignsPosition(t *testing.T) {
	st, ctx := newStore(t)
	c, err := st.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug: "git", Title: "Git", Category: "vcs",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	for i, label := range []string{"status", "log", "diff"} {
		e, err := st.CreateEntry(ctx, c.ID, cheatsheets.CreateEntryInput{
			Label: label, Command: "git " + label,
		})
		if err != nil {
			t.Fatalf("create entry %d: %v", i, err)
		}
		if e.Position != i {
			t.Errorf("expected position=%d, got %d", i, e.Position)
		}
	}

	entries, err := st.ListEntriesByCheatsheet(ctx, c.ID)
	if err != nil {
		t.Fatalf("list entries: %v", err)
	}
	if len(entries) != 3 {
		t.Errorf("expected 3 entries, got %d", len(entries))
	}
}

func TestStore_GetCheatsheetDetail_IncludesEntries(t *testing.T) {
	st, ctx := newStore(t)
	c, _ := st.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug: "git", Title: "Git", Category: "vcs",
	})
	_, _ = st.CreateEntry(ctx, c.ID, cheatsheets.CreateEntryInput{
		Label: "status", Command: "git status",
	})

	detail, err := st.GetCheatsheetDetail(ctx, c.ID)
	if err != nil {
		t.Fatalf("detail: %v", err)
	}
	if len(detail.Entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(detail.Entries))
	}
	if detail.Entries[0].Label != "status" {
		t.Errorf("unexpected entry: %+v", detail.Entries[0])
	}
}

func TestStore_LinkUnlinkCheatsheet(t *testing.T) {
	st, ctx := newStore(t)
	c, _ := st.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug: "git", Title: "Git", Category: "vcs",
	})
	r, _ := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/r"})

	if err := st.LinkCheatsheet(ctx, r.ID, c.ID); err != nil {
		t.Fatalf("link: %v", err)
	}
	// Re-linking should be idempotent (ON CONFLICT DO NOTHING).
	if err := st.LinkCheatsheet(ctx, r.ID, c.ID); err != nil {
		t.Fatalf("re-link should be idempotent: %v", err)
	}

	linked, err := st.ListCheatsheetsByRepo(ctx, r.ID)
	if err != nil {
		t.Fatalf("list linked: %v", err)
	}
	if len(linked) != 1 {
		t.Fatalf("expected 1 linked cheatsheet, got %d", len(linked))
	}

	if err := st.UnlinkCheatsheet(ctx, r.ID, c.ID); err != nil {
		t.Fatalf("unlink: %v", err)
	}
	if err := st.UnlinkCheatsheet(ctx, r.ID, c.ID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound on second unlink, got %v", err)
	}
}

func TestStore_Search_FindsAcrossEntities(t *testing.T) {
	st, ctx := newStore(t)

	// Repo
	r, _ := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/awesome-go"})
	desc := "Curated list of awesome Go frameworks"
	lang := "Go"
	_, _ = st.UpdateMetadata(ctx, r.ID, &repos.Metadata{Description: &desc, Language: &lang, Topics: []string{}})

	// Cheatsheet
	c, _ := st.CreateCheatsheet(ctx, cheatsheets.CreateCheatsheetInput{
		Slug: "go-cheats", Title: "Go cheats", Category: "language",
		Description: "Useful Go snippets",
	})
	_, _ = st.CreateEntry(ctx, c.ID, cheatsheets.CreateEntryInput{
		Label: "go fmt", Command: "go fmt ./...",
	})
	_, _ = st.CreateItem(ctx, store.CreateItemInput{
		Type:     items.TypeCLI,
		Title:    "goimports",
		Notes:    "go install golang.org/x/tools/cmd/goimports@latest",
		WhySaved: "format Go imports automatically",
		Tags:     []string{"go", "cli"},
	})

	results, err := st.Search(ctx, SearchModeText, "go", nil, 20)
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("expected at least one result for 'go'")
	}
	// We should see at least one of each type.
	seen := map[string]bool{}
	for _, res := range results {
		seen[res.Type] = true
	}
	if !seen["repo"] {
		t.Error("expected at least one repo result")
	}
	if !seen["cheatsheet"] {
		t.Error("expected at least one cheatsheet result")
	}
	if !seen["entry"] {
		t.Error("expected at least one entry result")
	}
	if !seen["item"] {
		t.Error("expected at least one item result")
	}
}

func TestStore_SeedCheatsheet_Idempotent(t *testing.T) {
	st, ctx := newStore(t)
	seed := cheatsheets.SeedCheatsheet{
		Slug: "git", Title: "Git", Category: "vcs",
		Description: "Version control",
		Entries: []cheatsheets.SeedEntry{
			{Label: "status", Command: "git status"},
			{Label: "log", Command: "git log --oneline"},
		},
	}
	if err := st.SeedCheatsheet(ctx, seed); err != nil {
		t.Fatalf("first seed: %v", err)
	}
	if err := st.SeedCheatsheet(ctx, seed); err != nil {
		t.Fatalf("second seed should be no-op: %v", err)
	}

	c, err := st.GetCheatsheetBySlug(ctx, "git")
	if err != nil {
		t.Fatalf("get by slug: %v", err)
	}
	if !c.IsSeed {
		t.Error("expected is_seed=true after seeding")
	}
	entries, _ := st.ListEntriesByCheatsheet(ctx, c.ID)
	if len(entries) != 2 {
		t.Errorf("expected 2 entries (no duplicates), got %d", len(entries))
	}
}
