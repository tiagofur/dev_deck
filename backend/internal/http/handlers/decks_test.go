package handlers_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
)

type deckResp struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Description *string   `json:"description"`
	IsPublic    bool      `json:"is_public"`
}

func TestDecks_CRUDAndItems(t *testing.T) {
	ts := newTestServer(t)

	createRec := ts.do(t, http.MethodPost, "/api/decks", map[string]any{
		"title":       "Terminal",
		"description": "daily shell stuff",
		"is_public":   false,
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create deck: %d %s", createRec.Code, createRec.Body.String())
	}
	created := decodeJSON[struct {
		Deck deckResp `json:"deck"`
	}](t, createRec)
	if created.Deck.Title != "Terminal" {
		t.Fatalf("title = %q, want %q", created.Deck.Title, "Terminal")
	}

	listRec := ts.do(t, http.MethodGet, "/api/decks", nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list decks: %d %s", listRec.Code, listRec.Body.String())
	}
	list := decodeJSON[struct {
		Decks []deckResp `json:"decks"`
	}](t, listRec)
	if len(list.Decks) != 1 {
		t.Fatalf("expected 1 deck, got %d", len(list.Decks))
	}

	item := seedCapture(t, ts, capturePayload{Text: "brew install fzf"})
	addRec := ts.do(t, http.MethodPost, "/api/decks/"+created.Deck.ID.String()+"/items", map[string]any{
		"item_ids": []string{item.ID.String()},
	})
	if addRec.Code != http.StatusOK {
		t.Fatalf("add items: %d %s", addRec.Code, addRec.Body.String())
	}

	getRec := ts.do(t, http.MethodGet, "/api/decks/"+created.Deck.ID.String(), nil)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get deck: %d %s", getRec.Code, getRec.Body.String())
	}
	got := decodeJSON[struct {
		Deck  deckResp    `json:"deck"`
		Items []uuid.UUID `json:"items"`
	}](t, getRec)
	if len(got.Items) != 1 || got.Items[0] != item.ID {
		t.Fatalf("deck items = %v, want [%s]", got.Items, item.ID)
	}

	patchRec := ts.do(t, http.MethodPatch, "/api/decks/"+created.Deck.ID.String(), map[string]any{
		"title":     "CLI",
		"is_public": true,
	})
	if patchRec.Code != http.StatusOK {
		t.Fatalf("patch deck: %d %s", patchRec.Code, patchRec.Body.String())
	}
	patched := decodeJSON[struct {
		Deck deckResp `json:"deck"`
	}](t, patchRec)
	if patched.Deck.Title != "CLI" || !patched.Deck.IsPublic {
		t.Fatalf("patched deck = %+v", patched.Deck)
	}

	removeRec := ts.do(t, http.MethodDelete, "/api/decks/"+created.Deck.ID.String()+"/items/"+item.ID.String(), nil)
	if removeRec.Code != http.StatusOK {
		t.Fatalf("remove item: %d %s", removeRec.Code, removeRec.Body.String())
	}

	deleteRec := ts.do(t, http.MethodDelete, "/api/decks/"+created.Deck.ID.String(), nil)
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("delete deck: %d %s", deleteRec.Code, deleteRec.Body.String())
	}
}
