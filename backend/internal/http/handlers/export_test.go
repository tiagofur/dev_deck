package handlers_test

import (
	"net/http"
	"strings"
	"testing"
)

type vaultExportResp struct {
	Version string `json:"version"`
	Items   []struct {
		Title    string   `json:"title"`
		ItemType string   `json:"item_type"`
		Tags     []string `json:"tags"`
		WhySaved string   `json:"why_saved"`
	} `json:"items"`
	Runbooks    []struct{ Title string } `json:"runbooks"`
	Cheatsheets []struct {
		Title   string `json:"title"`
		Entries []struct {
			Label string `json:"label"`
		} `json:"entries"`
	} `json:"cheatsheets"`
}

func TestVaultExport_JSONIncludesItemsAndRunbooks(t *testing.T) {
	ts := newTestServer(t)

	item := seedCapture(t, ts, capturePayload{
		Text:     "brew install ripgrep",
		WhySaved: "fast grep",
	})
	rec := ts.do(t, http.MethodPost, "/api/items/"+item.ID.String()+"/runbooks", map[string]any{
		"title": "Setup ripgrep",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create runbook: %d %s", rec.Code, rec.Body.String())
	}

	rec = ts.do(t, http.MethodGet, "/api/export/vault", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("export: %d %s", rec.Code, rec.Body.String())
	}
	if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "devdeck-vault-") {
		t.Errorf("missing attachment filename, got %q", cd)
	}

	out := decodeJSON[vaultExportResp](t, rec)
	if out.Version != "1" {
		t.Errorf("version: %q", out.Version)
	}
	if len(out.Items) != 1 {
		t.Fatalf("expected 1 item in export, got %d", len(out.Items))
	}
	if out.Items[0].WhySaved != "fast grep" {
		t.Errorf("why_saved not exported: %q", out.Items[0].WhySaved)
	}
	if len(out.Runbooks) != 1 || out.Runbooks[0].Title != "Setup ripgrep" {
		t.Fatalf("runbooks not exported: %+v", out.Runbooks)
	}
}

func TestVaultExport_MarkdownRendersSections(t *testing.T) {
	ts := newTestServer(t)
	seedCapture(t, ts, capturePayload{Text: "Cmd+Shift+P"})

	rec := ts.do(t, http.MethodGet, "/api/export/vault?format=markdown", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("markdown export: %d %s", rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	for _, want := range []string{"# DevDeck vault export", "## Items (1)", "Cmd+Shift+P", "## Runbooks (0)"} {
		if !strings.Contains(body, want) {
			t.Errorf("markdown missing %q\n%s", want, body)
		}
	}
}

func TestVaultExport_RejectsUnknownFormat(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodGet, "/api/export/vault?format=xml", nil)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for unknown format, got %d", rec.Code)
	}
}
