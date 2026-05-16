package store_test

import (
	"testing"

	"devdeck/internal/domain/auth"
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
