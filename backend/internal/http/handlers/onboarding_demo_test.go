package handlers_test

import (
	"net/http"
	"testing"
)

func TestOnboarding_DemoKit_InstallAndRemove(t *testing.T) {
	ts := newTestServer(t)

	// Install the demo kit.
	rec := ts.do(t, http.MethodPost, "/api/onboarding/install", map[string]any{"kit_id": "devdeck-demo"})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("install demo kit: %d %s", rec.Code, rec.Body.String())
	}

	// Every installed item carries the demo tag.
	rec = ts.do(t, http.MethodGet, "/api/items?tag=demo&limit=100", nil)
	list := decodeJSON[itemListResp](t, rec)
	if list.Total < 15 {
		t.Fatalf("expected at least 15 demo items, got %d", list.Total)
	}
	total := list.Total

	// A user keeps an item by removing the demo tag before cleanup.
	kept := list.Items[0]
	keptTags := []string{}
	for _, tag := range kept.Tags {
		if tag != "demo" {
			keptTags = append(keptTags, tag)
		}
	}
	rec = ts.do(t, http.MethodPatch, "/api/items/"+kept.ID.String(), map[string]any{"tags": keptTags})
	if rec.Code != http.StatusOK {
		t.Fatalf("untag kept item: %d %s", rec.Code, rec.Body.String())
	}

	// Bulk-remove the rest.
	rec = ts.do(t, http.MethodDelete, "/api/onboarding/demo", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("remove demo: %d %s", rec.Code, rec.Body.String())
	}
	out := decodeJSON[struct {
		Removed int `json:"removed"`
	}](t, rec)
	if out.Removed != total-1 {
		t.Errorf("expected %d removed, got %d", total-1, out.Removed)
	}

	// The kept item survives; no demo-tagged items remain.
	rec = ts.do(t, http.MethodGet, "/api/items?tag=demo&limit=100", nil)
	remaining := decodeJSON[itemListResp](t, rec)
	if remaining.Total != 0 {
		t.Errorf("expected 0 demo items after cleanup, got %d", remaining.Total)
	}
	rec = ts.do(t, http.MethodGet, "/api/items/"+kept.ID.String(), nil)
	if rec.Code != http.StatusOK {
		t.Errorf("kept item should survive cleanup, got %d", rec.Code)
	}
}
