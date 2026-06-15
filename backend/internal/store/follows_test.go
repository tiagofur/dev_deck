package store_test

import (
	"testing"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/auth"
	"devdeck/internal/domain/items"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

func TestStore_Follows(t *testing.T) {
	st, ctx := newStore(t)

	// Create test users
	u1, err := st.UpsertUser(ctx, auth.GitHubUser{
		ID:        2001,
		Login:     "curator",
		AvatarURL: "https://avatar.com/curator",
		Name:      "Curator User",
	})
	if err != nil {
		t.Fatalf("failed to create curator: %v", err)
	}

	u2, err := st.UpsertUser(ctx, auth.GitHubUser{
		ID:        2002,
		Login:     "follower",
		AvatarURL: "https://avatar.com/follower",
		Name:      "Follower User",
	})
	if err != nil {
		t.Fatalf("failed to create follower: %v", err)
	}

	// 1. Initially not following
	isFollowing, err := st.IsFollowing(ctx, u2.ID, u1.ID)
	if err != nil {
		t.Fatalf("IsFollowing failed: %v", err)
	}
	if isFollowing {
		t.Errorf("expected not following initially")
	}

	// 2. Follow curator
	err = st.FollowUser(ctx, u2.ID, u1.ID)
	if err != nil {
		t.Fatalf("FollowUser failed: %v", err)
	}

	isFollowing, err = st.IsFollowing(ctx, u2.ID, u1.ID)
	if err != nil {
		t.Fatalf("IsFollowing check failed: %v", err)
	}
	if !isFollowing {
		t.Errorf("expected following to be true")
	}

	// Verify points awarded (u1 should have +10 points)
	profile, err := st.GetPublicProfile(ctx, u1.Login)
	if err != nil {
		t.Fatalf("GetPublicProfile failed: %v", err)
	}
	reputationPoints, ok := profile["reputation_points"].(int32)
	if !ok || reputationPoints != 10 {
		t.Errorf("expected curator to have 10 reputation points, got %v", profile["reputation_points"])
	}

	// 3. Unfollow curator
	err = st.UnfollowUser(ctx, u2.ID, u1.ID)
	if err != nil {
		t.Fatalf("UnfollowUser failed: %v", err)
	}

	isFollowing, err = st.IsFollowing(ctx, u2.ID, u1.ID)
	if err != nil {
		t.Fatalf("IsFollowing check failed: %v", err)
	}
	if isFollowing {
		t.Errorf("expected following to be false after unfollow")
	}
}

func TestStore_GetFollowingFeed(t *testing.T) {
	st, ctx := newStore(t)

	// Create test users
	curator, err := st.UpsertUser(ctx, auth.GitHubUser{
		ID:    3001,
		Login: "curator2",
		Name:  "Curator Two",
	})
	if err != nil {
		t.Fatalf("failed to create curator: %v", err)
	}

	follower, err := st.UpsertUser(ctx, auth.GitHubUser{
		ID:    3002,
		Login: "follower2",
		Name:  "Follower Two",
	})
	if err != nil {
		t.Fatalf("failed to create follower: %v", err)
	}

	// Follow curator
	err = st.FollowUser(ctx, follower.ID, curator.ID)
	if err != nil {
		t.Fatalf("failed to follow: %v", err)
	}

	// Create a public deck and a private deck owned by curator
	publicDeck, err := st.CreateDeck(ctx, curator.ID, store.CreateDeckInput{
		Title:    "Public Deck",
		IsPublic: true,
	})
	if err != nil {
		t.Fatalf("failed to create public deck: %v", err)
	}

	privateDeck, err := st.CreateDeck(ctx, curator.ID, store.CreateDeckInput{
		Title:    "Private Deck",
		IsPublic: false,
	})
	if err != nil {
		t.Fatalf("failed to create private deck: %v", err)
	}

	// Create items owned by curator
	curatorCtx := authctx.WithUserID(ctx, curator.ID)
	itemPublic, err := st.CreateItem(curatorCtx, store.CreateItemInput{
		Type:  items.TypeNote,
		Title: "Public Note",
		Notes: "Visible to followers",
	})
	if err != nil {
		t.Fatalf("failed to create public item: %v", err)
	}

	itemPrivate, err := st.CreateItem(curatorCtx, store.CreateItemInput{
		Type:  items.TypeNote,
		Title: "Private Note",
		Notes: "Hidden from followers",
	})
	if err != nil {
		t.Fatalf("failed to create private item: %v", err)
	}

	// Add items to decks
	err = st.AddItemsToDeck(ctx, publicDeck.ID, []uuid.UUID{itemPublic.ID})
	if err != nil {
		t.Fatalf("failed to add item to public deck: %v", err)
	}

	err = st.AddItemsToDeck(ctx, privateDeck.ID, []uuid.UUID{itemPrivate.ID})
	if err != nil {
		t.Fatalf("failed to add item to private deck: %v", err)
	}

	// Retrieve feed
	feed, err := st.GetFollowingFeed(ctx, follower.ID, 10)
	if err != nil {
		t.Fatalf("GetFollowingFeed failed: %v", err)
	}

	// We should see itemPublic but NOT itemPrivate
	if len(feed) != 1 {
		t.Fatalf("expected feed size 1, got %d", len(feed))
	}
	if feed[0].Item.ID != itemPublic.ID {
		t.Errorf("expected item %s in feed, got %s", itemPublic.ID, feed[0].Item.ID)
	}
	if feed[0].CuratorName != "curator2" {
		t.Errorf("expected curator name 'curator2', got %q", feed[0].CuratorName)
	}

	// Unfollow and verify feed is empty
	err = st.UnfollowUser(ctx, follower.ID, curator.ID)
	if err != nil {
		t.Fatalf("unfollow failed: %v", err)
	}

	feed, err = st.GetFollowingFeed(ctx, follower.ID, 10)
	if err != nil {
		t.Fatalf("GetFollowingFeed failed: %v", err)
	}
	if len(feed) != 0 {
		t.Errorf("expected empty feed after unfollow, got %d items", len(feed))
	}
}
