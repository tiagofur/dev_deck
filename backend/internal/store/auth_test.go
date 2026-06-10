package store_test

import (
	"testing"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/auth"
	"devdeck/internal/domain/items"
	"devdeck/internal/store/seed"
)

func TestStore_Auth_GitHub(t *testing.T) {
	st, ctx := newStore(t)
	// ctx returned by newStore is already background or has cleanup

	ghUser := auth.GitHubUser{
		ID:        12345,
		Login:     "testuser",
		AvatarURL: "https://avatar.com/u",
		Name:      "Test User",
	}

	// 1. Upsert (Create)
	user, err := st.UpsertUser(ctx, ghUser)
	if err != nil {
		t.Fatalf("UpsertUser failed: %v", err)
	}
	if user.GitHubID == nil || *user.GitHubID != ghUser.ID || user.Login != ghUser.Login {
		t.Errorf("unexpected user data: %+v", user)
	}

	// 2. Get by GitHub ID
	found, err := st.GetUserByGitHubID(ctx, ghUser.ID)
	if err != nil {
		t.Fatalf("GetUserByGitHubID failed: %v", err)
	}
	if found.ID != user.ID {
		t.Errorf("id mismatch: %s != %s", found.ID, user.ID)
	}

	// 3. Upsert (Update)
	ghUser.Login = "updated"
	updated, err := st.UpsertUser(ctx, ghUser)
	if err != nil {
		t.Fatalf("UpsertUser update failed: %v", err)
	}
	if updated.Login != "updated" || updated.ID != user.ID {
		t.Errorf("update failed or created new user: %+v", updated)
	}

	// 4. Get by ID
	byID, err := st.GetUserByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetUserByID failed: %v", err)
	}
	if byID.GitHubID == nil || *byID.GitHubID != ghUser.ID {
		t.Errorf("github id mismatch: %d", byID.GitHubID)
	}
}

func TestStore_InstallStarterKit_SeedsContextualDemoItems(t *testing.T) {
	st, ctx := newStore(t)

	userID := mustUUID(t, "00000000-0000-0000-0000-000000000001")
	ctx = authctx.WithUserID(ctx, userID)

	wantItems := 0
	for _, kit := range seed.GetStarterKits() {
		if kit.ID == seed.DemoKitID {
			wantItems = len(kit.Items)
		}
	}
	if wantItems == 0 {
		t.Fatal("demo kit not found or empty")
	}

	if err := st.InstallStarterKit(ctx, seed.DemoKitID); err != nil {
		t.Fatalf("InstallStarterKit failed: %v", err)
	}

	res, err := st.ListItems(ctx, items.ListParams{
		Sort:  "title_asc",
		Limit: 100,
	})
	if err != nil {
		t.Fatalf("ListItems failed: %v", err)
	}
	if res.Total != wantItems {
		t.Fatalf("expected %d demo items, got %d", wantItems, res.Total)
	}

	var repo *items.Item
	var prompt *items.Item
	for _, it := range res.Items {
		if it.SourceChannel != "onboarding" {
			t.Fatalf("expected onboarding source channel for %q, got %q", it.Title, it.SourceChannel)
		}
		if it.WhySaved == "" {
			t.Fatalf("expected why_saved for %q", it.Title)
		}
		if it.WhenToUse == "" {
			t.Fatalf("expected when_to_use for %q", it.Title)
		}
		switch it.Title {
		case "TanStack Query offline mutation patterns":
			repo = it
		case "Launch PR risk review prompt":
			prompt = it
		}
	}

	if repo == nil {
		t.Fatal("expected TanStack Query demo repo")
	}
	if repo.URLNormalized == nil || *repo.URLNormalized != "https://github.com/TanStack/query" {
		t.Fatalf("expected normalized repo URL, got %v", repo.URLNormalized)
	}
	if repo.Description == nil || *repo.Description == "" {
		t.Fatal("expected repo description")
	}
	if repo.Meta["language"] != "TypeScript" {
		t.Fatalf("expected repo language metadata, got %#v", repo.Meta["language"])
	}

	if prompt == nil {
		t.Fatal("expected launch review prompt")
	}
	if prompt.Type != items.TypePrompt {
		t.Fatalf("expected prompt item type, got %q", prompt.Type)
	}
	if prompt.Notes == "" {
		t.Fatal("expected prompt notes")
	}

	if err := st.InstallStarterKit(ctx, seed.DemoKitID); err != nil {
		t.Fatalf("InstallStarterKit second run failed: %v", err)
	}

	after, err := st.ListItems(ctx, items.ListParams{
		Sort:  "title_asc",
		Limit: 100,
	})
	if err != nil {
		t.Fatalf("ListItems after second run failed: %v", err)
	}
	if after.Total != wantItems {
		t.Fatalf("expected idempotent install to keep %d items, got %d", wantItems, after.Total)
	}
}
