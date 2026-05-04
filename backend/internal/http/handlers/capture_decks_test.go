package handlers_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
)

func TestCapture_AssignsNewItemToDeck(t *testing.T) {
	ts := newTestServer(t)

	deckRec := ts.do(t, http.MethodPost, "/api/decks", map[string]any{"title": "Research"})
	if deckRec.Code != http.StatusCreated {
		t.Fatalf("create deck: %d %s", deckRec.Code, deckRec.Body.String())
	}
	deck := decodeJSON[struct {
		Deck deckResp `json:"deck"`
	}](t, deckRec)

	res, resp := capture(t, ts, capturePayload{
		Text:   "remember to study ripgrep flags",
		DeckID: &deck.Deck.ID,
	})
	if res.code != http.StatusCreated {
		t.Fatalf("capture: %d %s", res.code, res.raw)
	}
	if resp == nil || resp.Item == nil {
		t.Fatal("expected captured item")
	}

	getRec := ts.do(t, http.MethodGet, "/api/decks/"+deck.Deck.ID.String(), nil)
	got := decodeJSON[struct {
		Items []uuid.UUID `json:"items"`
	}](t, getRec)
	if len(got.Items) != 1 || got.Items[0] != resp.Item.ID {
		t.Fatalf("deck items = %v, want [%s]", got.Items, resp.Item.ID)
	}
}

func TestCapture_DuplicateAlsoAssignsExistingItemToDeck(t *testing.T) {
	ts := newTestServer(t)

	first, firstResp := capture(t, ts, capturePayload{URL: "https://dev.to/foo/post-1"})
	if first.code != http.StatusCreated || firstResp == nil || firstResp.Item == nil {
		t.Fatalf("first capture: %d %s", first.code, first.raw)
	}

	deckRec := ts.do(t, http.MethodPost, "/api/decks", map[string]any{"title": "Articles"})
	deck := decodeJSON[struct {
		Deck deckResp `json:"deck"`
	}](t, deckRec)

	dup, dupResp := capture(t, ts, capturePayload{
		URL:    "https://dev.to/foo/post-1",
		DeckID: &deck.Deck.ID,
	})
	if dup.code != http.StatusOK {
		t.Fatalf("duplicate capture: %d %s", dup.code, dup.raw)
	}
	if dupResp == nil || dupResp.DuplicateOf == nil || *dupResp.DuplicateOf != firstResp.Item.ID {
		t.Fatalf("duplicate_of = %v, want %s", dupResp.DuplicateOf, firstResp.Item.ID)
	}

	getRec := ts.do(t, http.MethodGet, "/api/decks/"+deck.Deck.ID.String(), nil)
	got := decodeJSON[struct {
		Items []uuid.UUID `json:"items"`
	}](t, getRec)
	if len(got.Items) != 1 || got.Items[0] != firstResp.Item.ID {
		t.Fatalf("deck items = %v, want [%s]", got.Items, firstResp.Item.ID)
	}
}
