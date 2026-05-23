package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"devdeck/internal/domain/circles"
	"github.com/google/uuid"
)

type circleResp struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	InviteCode  string    `json:"invite_code"`
	CreatedBy   uuid.UUID `json:"created_by"`
}

func TestCircles_CRUDAndFlows(t *testing.T) {
	ts := newTestServer(t)

	// 1. Create a Circle
	createRec := ts.do(t, http.MethodPost, "/api/circles", map[string]any{
		"name":        "GDE Argentina",
		"description": "Argentinean Google Developer Experts sharing tips.",
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create circle: expected 201, got %d, body: %s", createRec.Code, createRec.Body.String())
	}
	created := decodeJSON[circleResp](t, createRec)
	if created.Name != "GDE Argentina" || created.Description != "Argentinean Google Developer Experts sharing tips." {
		t.Fatalf("unexpected circle data: %+v", created)
	}
	if created.InviteCode == "" {
		t.Fatalf("expected invite code to be generated, got empty")
	}

	// 2. List User Circles
	listRec := ts.do(t, http.MethodGet, "/api/circles", nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list user circles: expected 200, got %d", listRec.Code)
	}
	list := decodeJSON[[]circleResp](t, listRec)
	if len(list) != 1 || list[0].ID != created.ID {
		t.Fatalf("expected exactly 1 user circle, got: %+v", list)
	}

	// 3. Get Circle Details (Member auth)
	getRec := ts.do(t, http.MethodGet, "/api/circles/"+created.ID.String(), nil)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get circle details: expected 200, got %d, body: %s", getRec.Code, getRec.Body.String())
	}
	details := decodeJSON[circleResp](t, getRec)
	if details.ID != created.ID {
		t.Fatalf("mismatched circle details ID: %s != %s", details.ID, created.ID)
	}

	// 4. Share Item to Circle
	// First seed an item via /api/items/capture
	item := seedCapture(t, ts, capturePayload{
		Text:     "alias gs='git status'",
		TypeHint: "cli",
	})

	shareRec := ts.do(t, http.MethodPost, "/api/circles/"+created.ID.String()+"/share", map[string]any{
		"item_id":       item.ID.String(),
		"share_context": "Useful when teaching fast Git status checks.",
	})
	if shareRec.Code != http.StatusNoContent {
		t.Fatalf("share item: expected 204, got %d, body: %s", shareRec.Code, shareRec.Body.String())
	}

	// 5. List Circle Items
	circleItemsRec := ts.do(t, http.MethodGet, "/api/circles/"+created.ID.String()+"/items", nil)
	if circleItemsRec.Code != http.StatusOK {
		t.Fatalf("list circle items: expected 200, got %d, body: %s", circleItemsRec.Code, circleItemsRec.Body.String())
	}
	circleItems := decodeJSON[[]itemResp](t, circleItemsRec)
	if len(circleItems) != 1 || circleItems[0].ID != item.ID {
		t.Fatalf("expected 1 circle item matching seed, got: %+v", circleItems)
	}
	if got := circleItems[0].Meta["circle_share_context"]; got != "Useful when teaching fast Git status checks." {
		t.Fatalf("expected share context metadata, got: %v", got)
	}

	// 6. List Members
	membersRec := ts.do(t, http.MethodGet, "/api/circles/"+created.ID.String()+"/members", nil)
	if membersRec.Code != http.StatusOK {
		t.Fatalf("list members: expected 200, got %d, body: %s", membersRec.Code, membersRec.Body.String())
	}
	members := decodeJSON[[]circles.CircleMemberDetail](t, membersRec)
	if len(members) != 1 || members[0].Role != "owner" {
		t.Fatalf("expected exactly 1 owner member, got: %+v", members)
	}

	// 7. Join Circle with Invite Code
	// Let's test joining the circle with the invite code
	joinRec := ts.do(t, http.MethodPost, "/api/circles/join", map[string]any{
		"invite_code": created.InviteCode,
	})
	if joinRec.Code != http.StatusOK {
		t.Fatalf("join circle: expected 200, got %d, body: %s", joinRec.Code, joinRec.Body.String())
	}
	joined := decodeJSON[circleResp](t, joinRec)
	if joined.ID != created.ID {
		t.Fatalf("unexpected joined circle ID: %s", joined.ID)
	}

	// 8. Leave Circle
	leaveRec := ts.do(t, http.MethodDelete, "/api/circles/"+created.ID.String()+"/members", nil)
	if leaveRec.Code != http.StatusNoContent {
		t.Fatalf("leave circle: expected 204, got %d, body: %s", leaveRec.Code, leaveRec.Body.String())
	}
}

func TestCircles_UnauthorizedAndForbidden(t *testing.T) {
	ts := newTestServer(t)

	// Try without token auth: should fail
	req, _ := http.NewRequest(http.MethodGet, "/api/circles", nil)
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 on unauthorized, got %d", rec.Code)
	}

	// Access invalid/missing circle UUID: should fail with 404
	randomUUID := uuid.New().String()
	getRec := ts.do(t, http.MethodGet, "/api/circles/"+randomUUID, nil)
	if getRec.Code != http.StatusNotFound {
		t.Errorf("expected 404 on missing circle, got %d", getRec.Code)
	}
}
