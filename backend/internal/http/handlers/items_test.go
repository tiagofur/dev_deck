package handlers_test

import (
	"net/http"
	"testing"

	"devdeck/internal/domain/items"

	"github.com/google/uuid"
)

// itemResp is a slim shape matching what scanItem returns. We decode
// only what the test needs so the fixture stays stable if we add
// fields to the Item struct.
type itemResp struct {
	ID               uuid.UUID `json:"id"`
	Type             string    `json:"item_type"`
	Title            string    `json:"title"`
	Tags             []string  `json:"tags"`
	Notes            string    `json:"notes"`
	Archived         bool      `json:"archived"`
	WhySaved         string    `json:"why_saved"`
	WhenToUse        string    `json:"when_to_use"`
	AISummary        string    `json:"ai_summary"`
	AITags           []string  `json:"ai_tags"`
	EnrichmentStatus string    `json:"enrichment_status"`
}

type itemListResp struct {
	Total int        `json:"total"`
	Items []itemResp `json:"items"`
}

// seedCapture is a helper that uses the existing /api/items/capture
// flow to create test fixtures. Lets us avoid duplicating the Item
// JSON shape in every test.
func seedCapture(t *testing.T, ts *testServer, body capturePayload) itemResp {
	t.Helper()
	rec, resp := capture(t, ts, body)
	if rec.code != http.StatusCreated {
		t.Fatalf("seed capture: %d %s", rec.code, rec.raw)
	}
	if resp == nil || resp.Item == nil {
		t.Fatalf("seed capture returned nil item")
	}
	return itemResp{
		ID:    resp.Item.ID,
		Type:  string(resp.Item.Type),
		Title: resp.Item.Title,
		Tags:  resp.Item.Tags,
	}
}

// ─── List ───

func TestItems_List_FiltersByType(t *testing.T) {
	ts := newTestServer(t)

	seedCapture(t, ts, capturePayload{URL: "https://github.com/charmbracelet/glow"}) // repo
	seedCapture(t, ts, capturePayload{Text: "brew install ripgrep"})                 // cli
	seedCapture(t, ts, capturePayload{Text: "Cmd+Shift+P"})                          // shortcut
	seedCapture(t, ts, capturePayload{URL: "https://dev.to/foo/post"})               // article
	seedCapture(t, ts, capturePayload{Text: "remember to update deps"})              // note

	rec := ts.do(t, http.MethodGet, "/api/items", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list all: %d %s", rec.Code, rec.Body.String())
	}
	all := decodeJSON[itemListResp](t, rec)
	if all.Total != 5 {
		t.Errorf("expected 5 items, got %d", all.Total)
	}

	rec = ts.do(t, http.MethodGet, "/api/items?type=cli", nil)
	cli := decodeJSON[itemListResp](t, rec)
	if cli.Total != 1 {
		t.Errorf("expected 1 cli item, got %d", cli.Total)
	}
	if cli.Items[0].Type != "cli" {
		t.Errorf("wrong type in filter: %q", cli.Items[0].Type)
	}

	rec = ts.do(t, http.MethodGet, "/api/items?type=note", nil)
	note := decodeJSON[itemListResp](t, rec)
	if note.Total != 1 {
		t.Errorf("expected 1 note, got %d", note.Total)
	}
}

func TestItems_List_RejectsInvalidType(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodGet, "/api/items?type=pizza", nil)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", rec.Code)
	}
}

func TestItems_List_FiltersByStack(t *testing.T) {
	ts := newTestServer(t)

	seedCapture(t, ts, capturePayload{Text: "brew install ripgrep", Tags: []string{"cli", "rust"}})
	seedCapture(t, ts, capturePayload{Text: "go test ./...", Tags: []string{"go", "testing"}})
	seedCapture(t, ts, capturePayload{Text: "remember the deploy checklist", Tags: []string{"ops"}})

	rec := ts.do(t, http.MethodGet, "/api/items?stack=go,rust", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("list by stack: %d %s", rec.Code, rec.Body.String())
	}
	got := decodeJSON[itemListResp](t, rec)
	if got.Total != 2 {
		t.Fatalf("expected 2 stack matches, got %d", got.Total)
	}
	for _, it := range got.Items {
		if it.Title == "remember the deploy checklist" {
			t.Fatalf("unexpected non-stack item in result: %+v", it)
		}
	}
}

func TestItems_List_HidesArchivedByDefault(t *testing.T) {
	ts := newTestServer(t)

	a := seedCapture(t, ts, capturePayload{Text: "note A"})
	_ = seedCapture(t, ts, capturePayload{Text: "note B"})

	// Archive A
	archived := true
	patch := ts.do(t, http.MethodPatch, "/api/items/"+a.ID.String(), items.UpdateInput{
		Archived: &archived,
	})
	if patch.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", patch.Code, patch.Body.String())
	}

	// Default list excludes archived.
	def := decodeJSON[itemListResp](t, ts.do(t, http.MethodGet, "/api/items", nil))
	if def.Total != 1 {
		t.Errorf("expected 1 active item, got %d", def.Total)
	}
	// Explicit archived=true returns the archived ones.
	arch := decodeJSON[itemListResp](t, ts.do(t, http.MethodGet, "/api/items?archived=true", nil))
	if arch.Total != 1 {
		t.Errorf("expected 1 archived item, got %d", arch.Total)
	}
}

func TestItems_List_Pagination(t *testing.T) {
	ts := newTestServer(t)

	for i := 0; i < 5; i++ {
		_ = seedCapture(t, ts, capturePayload{Text: "note " + string(rune('A'+i))})
	}

	page := decodeJSON[itemListResp](t,
		ts.do(t, http.MethodGet, "/api/items?limit=2&offset=0", nil))
	if len(page.Items) != 2 {
		t.Errorf("expected 2 items in page, got %d", len(page.Items))
	}
	if page.Total != 5 {
		t.Errorf("expected total=5 regardless of limit, got %d", page.Total)
	}
}

// ─── Get ───

func TestItems_Get_ReturnsItem(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{URL: "https://github.com/a/b"})

	rec := ts.do(t, http.MethodGet, "/api/items/"+seed.ID.String(), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("get: %d %s", rec.Code, rec.Body.String())
	}
	got := decodeJSON[itemResp](t, rec)
	if got.ID != seed.ID {
		t.Errorf("id mismatch")
	}
	if got.Type != "repo" {
		t.Errorf("type = %q", got.Type)
	}
}

func TestItems_Get_NotFound(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodGet,
		"/api/items/00000000-0000-0000-0000-000000000000", nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

func TestItems_Get_InvalidID(t *testing.T) {
	ts := newTestServer(t)
	rec := ts.do(t, http.MethodGet, "/api/items/not-a-uuid", nil)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

// ─── Update ───

func TestItems_Update_PartialPatch(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{Text: "initial note"})

	title := "renamed"
	why := "for future grep"
	rec := ts.do(t, http.MethodPatch, "/api/items/"+seed.ID.String(), items.UpdateInput{
		Title:    &title,
		WhySaved: &why,
		Tags:     []string{"x", "y"},
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body.String())
	}
	got := decodeJSON[itemResp](t, rec)
	if got.Title != "renamed" {
		t.Errorf("title not updated: %q", got.Title)
	}
	if got.WhySaved != "for future grep" {
		t.Errorf("why_saved not updated: %q", got.WhySaved)
	}
	if len(got.Tags) != 2 {
		t.Errorf("tags not updated: %+v", got.Tags)
	}
}

func TestItems_Update_RejectsInvalidType(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{Text: "x"})

	bad := "pizza"
	rec := ts.do(t, http.MethodPatch, "/api/items/"+seed.ID.String(), items.UpdateInput{
		ItemType: &bad,
	})
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", rec.Code)
	}
}

func TestItems_Update_ReclassifyType(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{Text: "short note"})
	if seed.Type != "note" {
		t.Fatalf("seed should be note, got %q", seed.Type)
	}

	newType := "snippet"
	rec := ts.do(t, http.MethodPatch, "/api/items/"+seed.ID.String(), items.UpdateInput{
		ItemType: &newType,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body.String())
	}
	got := decodeJSON[itemResp](t, rec)
	if got.Type != "snippet" {
		t.Errorf("type not reclassified: %q", got.Type)
	}
}

// ─── Delete ───

func TestItems_Delete_NoContent(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{Text: "to delete"})

	rec := ts.do(t, http.MethodDelete, "/api/items/"+seed.ID.String(), nil)
	if rec.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rec.Code)
	}
	getRec := ts.do(t, http.MethodGet, "/api/items/"+seed.ID.String(), nil)
	if getRec.Code != http.StatusNotFound {
		t.Errorf("expected 404 after delete, got %d", getRec.Code)
	}
}

// ─── Mark seen ───

func TestItems_MarkSeen(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{Text: "seen me"})

	rec := ts.do(t, http.MethodPost, "/api/items/"+seed.ID.String()+"/seen", nil)
	if rec.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rec.Code)
	}
}

func TestItems_AIEnrich_QueuesItem(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{Text: "brew install ripgrep"})

	rec := ts.do(t, http.MethodPost, "/api/items/"+seed.ID.String()+"/ai-enrich", nil)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d %s", rec.Code, rec.Body.String())
	}
	got := decodeJSON[itemResp](t, rec)
	if got.EnrichmentStatus != "queued" {
		t.Fatalf("expected queued, got %q", got.EnrichmentStatus)
	}
}

func TestItems_ReviewAITags_AppliesSuggestions(t *testing.T) {
	ts := newTestServer(t)
	seed := seedCapture(t, ts, capturePayload{Text: "brew install ripgrep", Tags: []string{"manual"}})

	rec := ts.do(t, http.MethodPatch, "/api/items/"+seed.ID.String()+"/ai-tags", items.ReviewAITagsInput{
		AITags: []string{"CLI", "ripgrep", "manual"},
		Apply:  true,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	got := decodeJSON[itemResp](t, rec)
	if len(got.AITags) != 3 {
		t.Fatalf("expected 3 ai tags, got %#v", got.AITags)
	}
	if len(got.Tags) != 3 {
		t.Fatalf("expected merged manual tags, got %#v", got.Tags)
	}
}
