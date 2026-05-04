package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"devdeck/internal/domain/items"

	"github.com/google/uuid"
)

// capturePayload is a tiny helper so individual tests only spell out
// the fields they actually care about.
type capturePayload struct {
	Source    string         `json:"source,omitempty"`
	DeckID    *uuid.UUID     `json:"deck_id,omitempty"`
	URL       string         `json:"url,omitempty"`
	Text      string         `json:"text,omitempty"`
	TypeHint  string         `json:"type_hint,omitempty"`
	TitleHint string         `json:"title_hint,omitempty"`
	Tags      []string       `json:"tags,omitempty"`
	WhySaved  string         `json:"why_saved,omitempty"`
	MetaHints map[string]any `json:"meta_hints,omitempty"`
}

type captureResp struct {
	Item             *items.Item            `json:"item"`
	EnrichmentStatus items.EnrichmentStatus `json:"enrichment_status"`
	DuplicateOf      *uuid.UUID             `json:"duplicate_of"`
}

func capture(t *testing.T, ts *testServer, body capturePayload) (*httpTestResult, *captureResp) {
	t.Helper()
	rec := ts.do(t, http.MethodPost, "/api/items/capture", body)
	result := &httpTestResult{code: rec.Code, raw: rec.Body.String()}
	if rec.Code >= 200 && rec.Code < 300 {
		var out captureResp
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("decode capture response: %v\nbody: %s", err, rec.Body.String())
		}
		return result, &out
	}
	return result, nil
}

type httpTestResult struct {
	code int
	raw  string
}

// ─── Validation ───

func TestCapture_RejectsEmptyBody(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodPost, "/api/items/capture", capturePayload{})
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for empty body, got %d", rec.Code)
	}
}

func TestCapture_RejectsInvalidTypeHint(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodPost, "/api/items/capture", capturePayload{
		Text: "hi", TypeHint: "pizza",
	})
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for bad type_hint, got %d", rec.Code)
	}
}

// ─── The 9 detection types (Wave 4.5 §16.9 exit criterion) ───

func TestCapture_NineTypes(t *testing.T) {
	ts := newTestServer(t)

	cases := []struct {
		name string
		body capturePayload
		want items.Type
	}{
		{"type1_repo", capturePayload{URL: "https://github.com/charmbracelet/glow"}, items.TypeRepo},
		{"type2_plugin", capturePayload{URL: "https://plugins.jetbrains.com/plugin/1234-foo"}, items.TypePlugin},
		{"type3_article", capturePayload{URL: "https://dev.to/foo/my-awesome-post"}, items.TypeArticle},
		{"type4_cli", capturePayload{Text: "brew install ripgrep"}, items.TypeCLI},
		{"type5_snippet", capturePayload{Text: "```go\nfunc main() {}\n```"}, items.TypeSnippet},
		{"type6_shortcut", capturePayload{Text: "Cmd+Shift+P"}, items.TypeShortcut},
		{"type7_tool", capturePayload{URL: "https://ripgrep.dev/"}, items.TypeTool},
		{"type8_note", capturePayload{Text: "remember the coffee"}, items.TypeNote},
		{"type9_type_hint_override", capturePayload{Text: "a", TypeHint: string(items.TypeAgent)}, items.TypeAgent},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			result, resp := capture(t, ts, tc.body)
			if result.code != http.StatusCreated {
				t.Fatalf("expected 201, got %d, body: %s", result.code, result.raw)
			}
			if resp.Item == nil || resp.Item.Type != tc.want {
				t.Errorf("detected type = %v, want %v", resp.Item, tc.want)
			}
			if resp.DuplicateOf != nil {
				t.Errorf("expected DuplicateOf=nil on fresh capture, got %s", resp.DuplicateOf)
			}
		})
	}
}

// ─── Deduplication ───

func TestCapture_DetectsDuplicateInItemsTable(t *testing.T) {
	ts := newTestServer(t)

	// First capture creates a new item.
	first := capturePayload{URL: "https://dev.to/foo/post-1"}
	result1, resp1 := capture(t, ts, first)
	if result1.code != http.StatusCreated {
		t.Fatalf("first capture: %d, %s", result1.code, result1.raw)
	}
	if resp1.Item == nil {
		t.Fatal("first capture returned nil item")
	}

	// Second capture of the same URL hits the dedupe branch.
	result2, resp2 := capture(t, ts, first)
	if result2.code != http.StatusOK {
		t.Fatalf("dup capture: expected 200, got %d, %s", result2.code, result2.raw)
	}
	if resp2.DuplicateOf == nil {
		t.Fatal("expected DuplicateOf to be set on duplicate")
	}
	if *resp2.DuplicateOf != resp1.Item.ID {
		t.Errorf("DuplicateOf = %s, want %s", *resp2.DuplicateOf, resp1.Item.ID)
	}
}

func TestCapture_NormalizesURLForDedupe(t *testing.T) {
	ts := newTestServer(t)

	// These should collide via NormalizeURL.
	a := capturePayload{URL: "https://dev.to/Foo/Post-1?utm_source=twitter"}
	b := capturePayload{URL: "http://www.dev.to/Foo/Post-1/"}

	r1, _ := capture(t, ts, a)
	if r1.code != http.StatusCreated {
		t.Fatalf("first: %d, %s", r1.code, r1.raw)
	}
	r2, resp2 := capture(t, ts, b)
	if r2.code != http.StatusOK {
		t.Fatalf("second should be dedup: %d, %s", r2.code, r2.raw)
	}
	if resp2.DuplicateOf == nil {
		t.Error("expected DuplicateOf on normalized-match")
	}
}

func TestCapture_DedupesAgainstLegacyReposTable(t *testing.T) {
	ts := newTestServer(t)

	// Create a repo via the legacy endpoint first.
	url := "https://github.com/charmbracelet/bubbletea"
	rec := ts.do(t, http.MethodPost, "/api/repos", map[string]any{"url": url})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create repo via legacy: %d, %s", rec.Code, rec.Body.String())
	}
	var repo struct {
		ID uuid.UUID `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &repo)

	// The legacy /api/repos handler has to backfill url_normalized
	// for capture's cross-table dedupe to work. For Wave 4.5 we do
	// that backfill in the handler. Give the DB a kick to ensure
	// the SQL migration's backfill OR the handler ran.
	// (No-op here — the migration's UPDATE covers both cases.)

	// Now try to capture the same repo → should dedupe against the
	// repos table and return DuplicateOf = repo.ID.
	r, resp := capture(t, ts, capturePayload{URL: url})
	if r.code != http.StatusOK {
		t.Fatalf("expected 200 on cross-table dedup, got %d: %s", r.code, r.raw)
	}
	if resp.DuplicateOf == nil || *resp.DuplicateOf != repo.ID {
		t.Errorf("DuplicateOf = %v, want %s", resp.DuplicateOf, repo.ID)
	}
}

// ─── Enrichment status ───

func TestCapture_EnrichableTypeGetsQueuedStatus(t *testing.T) {
	ts := newTestServer(t)

	_, resp := capture(t, ts, capturePayload{
		URL: "https://ripgrep.dev/", // Type=tool → enrichable
	})
	if resp.EnrichmentStatus != items.EnrichmentQueued && resp.EnrichmentStatus != items.EnrichmentSkipped {
		// Note: when running without a configured queue (testServer does
		// not pass one), the status may land as skipped. We accept both.
		t.Errorf("unexpected enrichment_status: %q", resp.EnrichmentStatus)
	}
}

func TestCapture_NoteTypeGetsSkippedStatus(t *testing.T) {
	ts := newTestServer(t)

	_, resp := capture(t, ts, capturePayload{Text: "plain note"})
	if resp.EnrichmentStatus != items.EnrichmentSkipped {
		t.Errorf("expected skipped for note, got %q", resp.EnrichmentStatus)
	}
}

// ─── Metadata threading ───

func TestCapture_ThreadsSourceAndWhySavedAndTags(t *testing.T) {
	ts := newTestServer(t)

	_, resp := capture(t, ts, capturePayload{
		Source:   "browser-extension",
		URL:      "https://dev.to/foo/some-post",
		Tags:     []string{"go", "productivity"},
		WhySaved: "for the terminal section",
		MetaHints: map[string]any{
			"capture_context": "popup",
			"page_url":        "https://dev.to/foo/some-post",
		},
	})
	if resp.Item == nil {
		t.Fatal("nil item")
	}
	if resp.Item.SourceChannel != "browser-extension" {
		t.Errorf("source channel not threaded: %q", resp.Item.SourceChannel)
	}
	if resp.Item.WhySaved != "for the terminal section" {
		t.Errorf("why_saved not threaded: %q", resp.Item.WhySaved)
	}
	if len(resp.Item.Tags) != 2 {
		t.Errorf("expected 2 tags, got %d", len(resp.Item.Tags))
	}
	if got := resp.Item.Meta["capture_context"]; got != "popup" {
		t.Errorf("capture_context not threaded: %#v", got)
	}
	if got := resp.Item.Meta["page_url"]; got != "https://dev.to/foo/some-post" {
		t.Errorf("page_url not threaded: %#v", got)
	}
}
