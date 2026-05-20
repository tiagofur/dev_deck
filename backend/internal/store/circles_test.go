package store_test

import (
	"context"
	"devdeck/internal/authctx"
	"errors"
	"testing"

	"devdeck/internal/domain/auth"
	"devdeck/internal/domain/items"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

func TestStore_Circles(t *testing.T) {
	st, ctx := newStore(t)

	// Create test users
	u1, err := st.UpsertUser(ctx, auth.GitHubUser{
		ID:        1001,
		Login:     "user1",
		AvatarURL: "https://avatar.com/1",
		Name:      "User One",
	})
	if err != nil {
		t.Fatalf("failed to create user 1: %v", err)
	}

	u2, err := st.UpsertUser(ctx, auth.GitHubUser{
		ID:        1002,
		Login:     "user2",
		AvatarURL: "https://avatar.com/2",
		Name:      "User Two",
	})
	if err != nil {
		t.Fatalf("failed to create user 2: %v", err)
	}

	// 1. Create Circle
	c1, err := st.CreateCircle(ctx, u1.ID, "Cool Devs", "A circle for extremely cool devs.")
	if err != nil {
		t.Fatalf("CreateCircle failed: %v", err)
	}
	if c1.Name != "Cool Devs" || c1.Description != "A circle for extremely cool devs." || c1.CreatedBy != u1.ID {
		t.Errorf("unexpected circle data: %+v", c1)
	}
	if c1.InviteCode == "" {
		t.Errorf("expected generated invite code, got empty")
	}

	// Verify owner is added automatically
	members, err := st.ListCircleMembers(ctx, c1.ID)
	if err != nil {
		t.Fatalf("ListCircleMembers failed: %v", err)
	}
	if len(members) != 1 || members[0].UserID != u1.ID || members[0].Role != "owner" {
		t.Errorf("unexpected members: %+v", members)
	}

	// 2. Join via Invite Code
	cJoined, err := st.JoinCircleByInviteCode(ctx, u2.ID, c1.InviteCode)
	if err != nil {
		t.Fatalf("JoinCircleByInviteCode failed: %v", err)
	}
	if cJoined.ID != c1.ID {
		t.Errorf("joined circle ID mismatch: %s != %s", cJoined.ID, c1.ID)
	}

	// Verify both members are present
	members, err = st.ListCircleMembers(ctx, c1.ID)
	if err != nil {
		t.Fatalf("ListCircleMembers failed: %v", err)
	}
	if len(members) != 2 {
		t.Errorf("expected 2 members, got %d", len(members))
	}

	// 3. Check membership roles
	role1, ok1 := st.IsCircleMember(ctx, u1.ID, c1.ID)
	if !ok1 || role1 != "owner" {
		t.Errorf("expected user1 owner role, got role=%q, ok=%t", role1, ok1)
	}

	role2, ok2 := st.IsCircleMember(ctx, u2.ID, c1.ID)
	if !ok2 || role2 != "member" {
		t.Errorf("expected user2 member role, got role=%q, ok=%t", role2, ok2)
	}

	// 4. Share Item to Circle
	// Create a mock item owned by user1. We'll set auth context to mock user_id context so CreateItem works
	mockUserCtx := authctx.WithUserID(ctx, u1.ID)
	it, err := st.CreateItem(mockUserCtx, store.CreateItemInput{
		Type:  items.TypeNote,
		Title: "Cool Tip",
		Notes: "Useful bash snippet.",
	})
	if err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}

	err = st.ShareItemToCircle(ctx, c1.ID, it.ID, u1.ID)
	if err != nil {
		t.Fatalf("ShareItemToCircle failed: %v", err)
	}

	// List Circle Items
	circleItems, err := st.ListCircleItems(ctx, c1.ID)
	if err != nil {
		t.Fatalf("ListCircleItems failed: %v", err)
	}
	if len(circleItems) != 1 || circleItems[0].ID != it.ID || circleItems[0].Title != "Cool Tip" {
		t.Errorf("unexpected circle items: %+v", circleItems)
	}

	// 5. Leave Circle
	err = st.LeaveCircle(ctx, c1.ID, u2.ID)
	if err != nil {
		t.Fatalf("LeaveCircle failed: %v", err)
	}

	// Verify membership is removed
	roleLeave, okLeave := st.IsCircleMember(ctx, u2.ID, c1.ID)
	if okLeave || roleLeave != "" {
		t.Errorf("expected user2 to not be a member, got role=%q, ok=%t", roleLeave, okLeave)
	}
}

func TestStore_Circles_GetNotFound(t *testing.T) {
	st, ctx := newStore(t)

	_, err := st.GetCircleByID(ctx, uuid.New())
	if !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	_, err = st.GetCircleByInviteCode(ctx, "INVALID")
	if !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
