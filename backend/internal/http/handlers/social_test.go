package handlers_test

import (
	"context"
	"net/http"
	"testing"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/auth"
	"devdeck/internal/domain/items"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

type feedResp struct {
	Events []struct {
		Item struct {
			ID        uuid.UUID `json:"id"`
			Title     string    `json:"title"`
			ItemType  string    `json:"item_type"`
			Archived  bool      `json:"archived"`
			CreatedBy uuid.UUID `json:"user_id"`
		} `json:"item"`
		CuratorName      string `json:"curator_name"`
		CuratorAvatarURL string `json:"curator_avatar_url"`
	} `json:"events"`
}

func TestSocial_FollowUnfollowAndFeed(t *testing.T) {
	ts := newTestServer(t)

	// Create a well-known test user in the DB (matching middleware's testUserID)
	testUserID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	_, err := ts.store.UpsertUser(context.Background(), auth.GitHubUser{
		ID:    1,
		Login: "testuser",
		Name:  "Test User",
	})
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	// Create a curator user that we will follow
	curator, err := ts.store.UpsertUser(context.Background(), auth.GitHubUser{
		ID:        2,
		Login:     "curator",
		AvatarURL: "https://avatars.com/curator",
		Name:      "Curator User",
	})
	if err != nil {
		t.Fatalf("failed to create curator: %v", err)
	}

	// 1. Follow curator
	followRec := ts.do(t, http.MethodPost, "/api/users/curator/follow", nil)
	if followRec.Code != http.StatusNoContent {
		t.Fatalf("follow failed: expected 204, got %d, body: %s", followRec.Code, followRec.Body.String())
	}

	// Verify they are followed in the store
	isFollowing, err := ts.store.IsFollowing(context.Background(), testUserID, curator.ID)
	if err != nil {
		t.Fatalf("IsFollowing failed: %v", err)
	}
	if !isFollowing {
		t.Errorf("expected testUserID to follow curator")
	}

	// 2. Try to follow yourself -> should return 400 Bad Request
	selfFollowRec := ts.do(t, http.MethodPost, "/api/users/testuser/follow", nil)
	if selfFollowRec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 on self-follow, got %d, body: %s", selfFollowRec.Code, selfFollowRec.Body.String())
	}

	// 3. Create a public deck and item for curator to verify Following Feed
	deck, err := ts.store.CreateDeck(context.Background(), curator.ID, store.CreateDeckInput{
		Title:    "Curator Public Deck",
		IsPublic: true,
	})
	if err != nil {
		t.Fatalf("CreateDeck failed: %v", err)
	}

	curatorCtx := authctx.WithUserID(context.Background(), curator.ID)
	item, err := ts.store.CreateItem(curatorCtx, store.CreateItemInput{
		Type:  items.TypeNote,
		Title: "Cool Go Tip",
		Notes: "Use go test -race.",
	})
	if err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}

	err = ts.store.AddItemsToDeck(context.Background(), deck.ID, []uuid.UUID{item.ID})
	if err != nil {
		t.Fatalf("AddItemsToDeck failed: %v", err)
	}

	// 4. Retrieve feed
	feedRec := ts.do(t, http.MethodGet, "/api/feed/following?limit=5", nil)
	if feedRec.Code != http.StatusOK {
		t.Fatalf("get feed failed: expected 200, got %d, body: %s", feedRec.Code, feedRec.Body.String())
	}
	feed := decodeJSON[feedResp](t, feedRec)
	if len(feed.Events) != 1 {
		t.Fatalf("expected feed to have 1 event, got %d", len(feed.Events))
	}
	if feed.Events[0].Item.ID != item.ID || feed.Events[0].CuratorName != "curator" {
		t.Errorf("unexpected feed event data: %+v", feed.Events[0])
	}

	// 5. Unfollow curator
	unfollowRec := ts.do(t, http.MethodDelete, "/api/users/curator/follow", nil)
	if unfollowRec.Code != http.StatusNoContent {
		t.Fatalf("unfollow failed: expected 204, got %d, body: %s", unfollowRec.Code, unfollowRec.Body.String())
	}

	// Verify no longer following
	isFollowing, err = ts.store.IsFollowing(context.Background(), testUserID, curator.ID)
	if err != nil {
		t.Fatalf("IsFollowing failed: %v", err)
	}
	if isFollowing {
		t.Errorf("expected testUserID to have unfollowed curator")
	}

	// 6. Retrieve feed again -> should be empty
	feedRec2 := ts.do(t, http.MethodGet, "/api/feed/following", nil)
	if feedRec2.Code != http.StatusOK {
		t.Fatalf("get feed failed: expected 200, got %d", feedRec2.Code)
	}
	feed2 := decodeJSON[feedResp](t, feedRec2)
	if len(feed2.Events) != 0 {
		t.Errorf("expected empty feed after unfollow, got %d events", len(feed2.Events))
	}
}
