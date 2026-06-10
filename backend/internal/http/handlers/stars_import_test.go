package handlers_test

import (
	"net/http"
	"testing"
)

type starsImportResp struct {
	Username string `json:"username"`
	Total    int    `json:"total"`
	Imported int    `json:"imported"`
	Skipped  int    `json:"skipped"`
}

func TestStarsImport_ImportsAndDedupes(t *testing.T) {
	ts := newTestServer(t)

	rec := ts.do(t, http.MethodPost, "/api/import/github-stars", map[string]any{"username": "octofake"})
	if rec.Code != http.StatusOK {
		t.Fatalf("import: %d %s", rec.Code, rec.Body.String())
	}
	out := decodeJSON[starsImportResp](t, rec)
	if out.Total != 2 || out.Imported != 2 || out.Skipped != 0 {
		t.Fatalf("first import: got total=%d imported=%d skipped=%d", out.Total, out.Imported, out.Skipped)
	}

	// Items exist as repos with metadata from the starred payload.
	itemsRec := ts.do(t, http.MethodGet, "/api/items?type=repo", nil)
	list := decodeJSON[itemListResp](t, itemsRec)
	if list.Total != 2 {
		t.Fatalf("expected 2 repo items after import, got %d", list.Total)
	}
	for _, it := range list.Items {
		if it.Meta["stars"] == nil {
			t.Errorf("item %s missing stars metadata", it.Title)
		}
		if len(it.Tags) == 0 || it.Tags[0] != "github-stars" {
			t.Errorf("item %s missing github-stars tag: %v", it.Title, it.Tags)
		}
	}

	// Second run is a no-op: everything dedupes.
	rec = ts.do(t, http.MethodPost, "/api/import/github-stars", map[string]any{"username": "octofake"})
	out = decodeJSON[starsImportResp](t, rec)
	if out.Imported != 0 || out.Skipped != 2 {
		t.Fatalf("re-import: got imported=%d skipped=%d, want 0/2", out.Imported, out.Skipped)
	}
}

func TestStarsImport_UnknownUserFails(t *testing.T) {
	ts := newTestServer(t)

	rec := ts.do(t, http.MethodPost, "/api/import/github-stars", map[string]any{"username": "ghostuser"})
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 for unknown github user, got %d %s", rec.Code, rec.Body.String())
	}
}
