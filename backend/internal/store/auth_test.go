package store_test

import (
	"errors"
	"testing"
	"time"

	"devdeck/internal/domain/auth"
	"devdeck/internal/store"
)

func TestStore_UpsertUser_CreatesAndUpdates(t *testing.T) {
	st, ctx := newStore(t)

	gh := auth.GitHubUser{
		ID: 12345, Login: "ada", AvatarURL: "https://avatars/ada", Name: "Ada Lovelace",
	}
	first, err := st.UpsertUser(ctx, gh)
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	if first.Login != "ada" {
		t.Errorf("unexpected user: %+v", first)
	}

	// Update name → should reuse same DB row.
	gh.Name = "Ada L"
	second, err := st.UpsertUser(ctx, gh)
	if err != nil {
		t.Fatalf("second upsert: %v", err)
	}
	if second.ID != first.ID {
		t.Errorf("expected same id on upsert, got %s vs %s", first.ID, second.ID)
	}
	if second.DisplayName != "Ada L" {
		t.Errorf("display name not updated: %q", second.DisplayName)
	}
}

func TestStore_GetUserByGitHubID(t *testing.T) {
	st, ctx := newStore(t)

	if _, err := st.GetUserByGitHubID(ctx, 99999); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound for missing github id, got %v", err)
	}

	user, err := st.UpsertUser(ctx, auth.GitHubUser{ID: 1, Login: "x", Name: "X"})
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	got, err := st.GetUserByGitHubID(ctx, 1)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.ID != user.ID {
		t.Errorf("expected matching id, got %s vs %s", got.ID, user.ID)
	}
}

func TestStore_EnsureUserForIdentity_LinksVerifiedEmailAcrossProviders(t *testing.T) {
	st, ctx := newStore(t)

	email := "ada@example.com"
	first, err := st.EnsureUserForIdentity(ctx, auth.ExternalIdentity{
		Provider:       auth.ProviderGitHub,
		ProviderUserID: "123",
		Email:          &email,
		EmailVerified:  true,
		ProviderLogin:  "ada",
		DisplayName:    "Ada Lovelace",
		AvatarURL:      "https://avatars/ada",
	})
	if err != nil {
		t.Fatalf("github identity: %v", err)
	}

	second, err := st.EnsureUserForIdentity(ctx, auth.ExternalIdentity{
		Provider:       auth.ProviderGoogle,
		ProviderUserID: "google-123",
		Email:          &email,
		EmailVerified:  true,
		DisplayName:    "Ada L",
	})
	if err != nil {
		t.Fatalf("google identity: %v", err)
	}

	if second.ID != first.ID {
		t.Fatalf("expected provider linking to reuse same user, got %s vs %s", second.ID, first.ID)
	}
	if second.PrimaryEmail == nil || *second.PrimaryEmail != email {
		t.Fatalf("expected primary email %q, got %+v", email, second.PrimaryEmail)
	}
}

func TestStore_RefreshSession_LifecycleAndExpiry(t *testing.T) {
	st, ctx := newStore(t)

	user, err := st.UpsertUser(ctx, auth.GitHubUser{ID: 1, Login: "x", Name: "X"})
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}

	const hash = "deadbeef"
	if err := st.CreateRefreshSession(ctx, user.ID, hash, time.Now().Add(1*time.Hour)); err != nil {
		t.Fatalf("create session: %v", err)
	}

	// First Get consumes the session (DELETE … RETURNING).
	id, err := st.GetRefreshSession(ctx, hash)
	if err != nil {
		t.Fatalf("get session: %v", err)
	}
	if *id != user.ID {
		t.Errorf("expected user id %s, got %s", user.ID, *id)
	}

	// Second Get must fail because the row is gone.
	if _, err := st.GetRefreshSession(ctx, hash); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound on consumed session, got %v", err)
	}
}

func TestStore_GetRefreshSession_RejectsExpired(t *testing.T) {
	st, ctx := newStore(t)

	user, err := st.UpsertUser(ctx, auth.GitHubUser{ID: 2, Login: "y", Name: "Y"})
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	const hash = "expired"
	if err := st.CreateRefreshSession(ctx, user.ID, hash, time.Now().Add(-1*time.Minute)); err != nil {
		t.Fatalf("create expired session: %v", err)
	}
	if _, err := st.GetRefreshSession(ctx, hash); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound for expired session, got %v", err)
	}
}

func TestStore_DeleteAllRefreshSessions(t *testing.T) {
	st, ctx := newStore(t)

	user, err := st.UpsertUser(ctx, auth.GitHubUser{ID: 3, Login: "z", Name: "Z"})
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	for _, h := range []string{"a", "b", "c"} {
		_ = st.CreateRefreshSession(ctx, user.ID, h, time.Now().Add(1*time.Hour))
	}
	if err := st.DeleteAllRefreshSessions(ctx, user.ID); err != nil {
		t.Fatalf("delete all: %v", err)
	}
	if _, err := st.GetRefreshSession(ctx, "a"); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound after delete-all, got %v", err)
	}
}
