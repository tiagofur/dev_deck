package handlers_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
)

type runbookListResp struct {
	Runbooks []struct {
		ID        uuid.UUID `json:"id"`
		ItemID    uuid.UUID `json:"item_id"`
		Title     string    `json:"title"`
		ItemTitle string    `json:"item_title"`
	} `json:"runbooks"`
}

func TestRunbooks_ListAll_EmptyByDefault(t *testing.T) {
	ts := newTestServer(t)

	rec := ts.do(t, http.MethodGet, "/api/runbooks", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list all runbooks: %d %s", rec.Code, rec.Body.String())
	}
	out := decodeJSON[runbookListResp](t, rec)
	if len(out.Runbooks) != 0 {
		t.Errorf("expected empty runbook list, got %d", len(out.Runbooks))
	}
}

func TestRunbooks_ListAll_ReturnsRunbooksWithItemTitle(t *testing.T) {
	ts := newTestServer(t)

	item := seedCapture(t, ts, capturePayload{Text: "brew install ripgrep", TitleHint: "ripgrep setup"})

	rec := ts.do(t, http.MethodPost, "/api/items/"+item.ID.String()+"/runbooks", map[string]any{
		"title": "Install ripgrep",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create runbook: %d %s", rec.Code, rec.Body.String())
	}

	rec = ts.do(t, http.MethodGet, "/api/runbooks", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list all runbooks: %d %s", rec.Code, rec.Body.String())
	}
	out := decodeJSON[runbookListResp](t, rec)
	if len(out.Runbooks) != 1 {
		t.Fatalf("expected 1 runbook, got %d", len(out.Runbooks))
	}

	rb := out.Runbooks[0]
	if rb.Title != "Install ripgrep" {
		t.Errorf("wrong runbook title: %q", rb.Title)
	}
	if rb.ItemID != item.ID {
		t.Errorf("wrong item_id: %s (want %s)", rb.ItemID, item.ID)
	}
	if rb.ItemTitle == "" {
		t.Error("expected item_title to be populated from the parent item")
	}
}
