package store_test

import (
	"context"
	"errors"
	"testing"

	"devdeck/internal/domain/repos"
	"devdeck/internal/store"
	"devdeck/internal/testutil"
)

func newStore(t *testing.T) (*store.Store, context.Context) {
	t.Helper()
	pool := testutil.SetupPostgres(t)
	return store.New(pool), context.Background()
}

func TestStore_CreateRepo_DerivesNameFromGithubURL(t *testing.T) {
	st, ctx := newStore(t)

	r, err := st.CreateRepo(ctx, repos.CreateInput{
		URL:   "https://github.com/charmbracelet/bubbletea",
		Notes: "tui framework",
		Tags:  []string{"go", "tui"},
	})
	if err != nil {
		t.Fatalf("CreateRepo failed: %v", err)
	}
	if r.Source != "github" {
		t.Errorf("expected source=github, got %q", r.Source)
	}
	if r.Owner == nil || *r.Owner != "charmbracelet" {
		t.Errorf("expected owner=charmbracelet, got %+v", r.Owner)
	}
	if r.Name != "bubbletea" {
		t.Errorf("expected name=bubbletea, got %q", r.Name)
	}
	if r.Notes != "tui framework" {
		t.Errorf("expected notes preserved, got %q", r.Notes)
	}
	if len(r.Tags) != 2 {
		t.Errorf("expected 2 tags, got %d", len(r.Tags))
	}
}

func TestStore_CreateRepo_GenericSource(t *testing.T) {
	st, ctx := newStore(t)

	r, err := st.CreateRepo(ctx, repos.CreateInput{URL: "https://gitlab.com/foo/bar"})
	if err != nil {
		t.Fatalf("CreateRepo failed: %v", err)
	}
	if r.Source != "generic" {
		t.Errorf("expected source=generic, got %q", r.Source)
	}
}

func TestStore_CreateRepo_DuplicateURL(t *testing.T) {
	st, ctx := newStore(t)

	url := "https://github.com/foo/bar"
	if _, err := st.CreateRepo(ctx, repos.CreateInput{URL: url}); err != nil {
		t.Fatalf("first insert failed: %v", err)
	}
	_, err := st.CreateRepo(ctx, repos.CreateInput{URL: url})
	if !errors.Is(err, store.ErrAlreadyExists) {
		t.Fatalf("expected ErrAlreadyExists on duplicate, got %v", err)
	}
}

func TestStore_CreateRepo_InvalidURL(t *testing.T) {
	st, ctx := newStore(t)

	_, err := st.CreateRepo(ctx, repos.CreateInput{URL: "not a url"})
	if err == nil {
		t.Fatal("expected error on invalid URL, got nil")
	}
}

func TestStore_GetRepo_NotFound(t *testing.T) {
	st, ctx := newStore(t)

	_, err := st.GetRepo(ctx, mustUUID(t, "00000000-0000-0000-0000-000000000000"))
	if !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestStore_ListRepos_FiltersAndPagination(t *testing.T) {
	st, ctx := newStore(t)

	// Insert 3 repos with varying language/tag.
	for i, urlAndLang := range []struct {
		url, lang, tag string
	}{
		{"https://github.com/u/go-one", "Go", "cli"},
		{"https://github.com/u/go-two", "Go", "lib"},
		{"https://github.com/u/py-one", "Python", "lib"},
	} {
		r, err := st.CreateRepo(ctx, repos.CreateInput{
			URL:  urlAndLang.url,
			Tags: []string{urlAndLang.tag},
		})
		if err != nil {
			t.Fatalf("seed insert %d failed: %v", i, err)
		}
		// Set the language via UpdateMetadata since CreateRepo doesn't accept it.
		lang := urlAndLang.lang
		if _, err := st.UpdateMetadata(ctx, r.ID, &repos.Metadata{
			Language: &lang,
			Topics:   []string{},
		}); err != nil {
			t.Fatalf("set lang %d failed: %v", i, err)
		}
	}

	// All
	all, err := st.ListRepos(ctx, repos.ListParams{})
	if err != nil {
		t.Fatalf("ListRepos failed: %v", err)
	}
	if all.Total != 3 {
		t.Errorf("expected 3 total, got %d", all.Total)
	}

	// Filter by language
	goOnly, err := st.ListRepos(ctx, repos.ListParams{Lang: "Go"})
	if err != nil {
		t.Fatalf("ListRepos lang filter failed: %v", err)
	}
	if goOnly.Total != 2 {
		t.Errorf("expected 2 Go repos, got %d", goOnly.Total)
	}

	// Filter by tag
	libOnly, err := st.ListRepos(ctx, repos.ListParams{Tag: "lib"})
	if err != nil {
		t.Fatalf("ListRepos tag filter failed: %v", err)
	}
	if libOnly.Total != 2 {
		t.Errorf("expected 2 lib repos, got %d", libOnly.Total)
	}

	// Pagination
	page, err := st.ListRepos(ctx, repos.ListParams{Limit: 2, Offset: 0})
	if err != nil {
		t.Fatalf("ListRepos pagination failed: %v", err)
	}
	if len(page.Items) != 2 {
		t.Errorf("expected 2 items in page, got %d", len(page.Items))
	}
	if page.Total != 3 {
		t.Errorf("expected total 3 even with limit, got %d", page.Total)
	}
}

func TestStore_UpdateRepo_PatchesNotesTagsArchived(t *testing.T) {
	st, ctx := newStore(t)

	r, err := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/r"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	notes := "now with notes"
	archived := true
	updated, err := st.UpdateRepo(ctx, r.ID, repos.UpdateInput{
		Notes:    &notes,
		Tags:     []string{"a", "b"},
		Archived: &archived,
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Notes != notes {
		t.Errorf("notes not updated: %q", updated.Notes)
	}
	if !updated.Archived {
		t.Errorf("archived not updated")
	}
	if len(updated.Tags) != 2 {
		t.Errorf("tags not updated: %+v", updated.Tags)
	}
}

func TestStore_DeleteRepo(t *testing.T) {
	st, ctx := newStore(t)

	r, err := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/r"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := st.DeleteRepo(ctx, r.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := st.GetRepo(ctx, r.ID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound after delete, got %v", err)
	}
	// Idempotency: deleting again should return ErrNotFound.
	if err := st.DeleteRepo(ctx, r.ID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound on second delete, got %v", err)
	}
}

func TestStore_MarkSeenAndDiscoveryNext(t *testing.T) {
	st, ctx := newStore(t)

	r1, _ := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/r1"})
	r2, _ := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/r2"})

	// Both never seen → discovery returns one of them, then after MarkSeen
	// it should return the other on next call.
	first, err := st.GetDiscoveryNext(ctx)
	if err != nil {
		t.Fatalf("discovery next: %v", err)
	}
	if first.ID != r1.ID && first.ID != r2.ID {
		t.Fatalf("unexpected discovery result: %s", first.ID)
	}
	if err := st.MarkSeen(ctx, first.ID); err != nil {
		t.Fatalf("mark seen: %v", err)
	}
	second, err := st.GetDiscoveryNext(ctx)
	if err != nil {
		t.Fatalf("discovery next 2: %v", err)
	}
	if second.ID == first.ID {
		t.Errorf("expected different repo on second call, got same %s", second.ID)
	}
}

func TestStore_UpdateMetadata_PersistsEnricherFields(t *testing.T) {
	st, ctx := newStore(t)

	r, err := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/r"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	desc := "the description"
	lang := "Go"
	color := "#00ADD8"
	avatar := "https://avatars.example/u"
	updated, err := st.UpdateMetadata(ctx, r.ID, &repos.Metadata{
		Description:   &desc,
		Language:      &lang,
		LanguageColor: &color,
		Stars:         42,
		Forks:         3,
		AvatarURL:     &avatar,
		Topics:        []string{"x", "y"},
	})
	if err != nil {
		t.Fatalf("update metadata: %v", err)
	}
	if updated.Description == nil || *updated.Description != desc {
		t.Errorf("description not persisted: %+v", updated.Description)
	}
	if updated.Stars != 42 {
		t.Errorf("stars not persisted: %d", updated.Stars)
	}
	if updated.LastFetchedAt == nil {
		t.Errorf("expected last_fetched_at to be set")
	}
	if len(updated.Topics) != 2 {
		t.Errorf("topics not persisted: %+v", updated.Topics)
	}
}
