package handlers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"devdeck/internal/domain/items"

	"github.com/google/uuid"
)

// orgResp is a minimal representation of an organization response.
type orgResp struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Slug string    `json:"slug"`
}

// doWithOrg sends a request with the X-Org-ID header set to the given org ID.
func (ts *testServer) doWithOrg(t *testing.T, method, path string, body any, orgID uuid.UUID) *httptest.ResponseRecorder {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		rdr = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Authorization", "Bearer "+testToken)
	req.Header.Set("X-Org-ID", orgID.String())
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	return rec
}

// createOrg is a helper that creates an organization and returns its ID.
func createOrg(t *testing.T, ts *testServer, name string) uuid.UUID {
	t.Helper()
	rec := ts.do(t, http.MethodPost, "/api/orgs", map[string]any{"name": name})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create org: expected 201, got %d, body: %s", rec.Code, rec.Body.String())
	}
	var resp orgResp
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode org response: %v", err)
	}
	return resp.ID
}

// ─── Workspace Capture Tests ───

func TestCapture_InWorkspace_SetsOrgID(t *testing.T) {
	ts := newTestServer(t)

	// Create a workspace (org).
	orgID := createOrg(t, ts, "Acme Team")

	// Capture an item with X-Org-ID header set.
	result, resp := captureWithOrg(t, ts, capturePayload{
		URL:      "https://github.com/acme/internal-tool",
		TypeHint: string(items.TypeRepo),
		Tags:     []string{"internal", "tool"},
	}, orgID)

	if result.code != http.StatusCreated {
		t.Fatalf("capture in workspace: expected 201, got %d, body: %s", result.code, result.raw)
	}
	if resp.Item == nil {
		t.Fatal("expected captured item")
	}
	if resp.Item.OrgID == nil {
		t.Fatal("expected org_id to be set on captured item")
	}
	if *resp.Item.OrgID != orgID {
		t.Errorf("org_id = %s, want %s", *resp.Item.OrgID, orgID)
	}
	if resp.Item.Type != items.TypeRepo {
		t.Errorf("item type = %q, want %q", resp.Item.Type, items.TypeRepo)
	}
}

func TestCapture_InPersonal_SetsNilOrgID(t *testing.T) {
	ts := newTestServer(t)

	// Capture an item WITHOUT X-Org-ID header (personal workspace).
	result, resp := capture(t, ts, capturePayload{
		URL:      "https://github.com/acme/personal-tool",
		TypeHint: string(items.TypeRepo),
	})

	if result.code != http.StatusCreated {
		t.Fatalf("capture personal: expected 201, got %d, body: %s", result.code, result.raw)
	}
	if resp.Item == nil {
		t.Fatal("expected captured item")
	}
	if resp.Item.OrgID != nil {
		t.Errorf("expected org_id=nil for personal capture, got %s", *resp.Item.OrgID)
	}
}

func TestCapture_InWorkspace_DifferentWorkspacesHaveDifferentOrgIDs(t *testing.T) {
	ts := newTestServer(t)

	// Create two workspaces.
	org1 := createOrg(t, ts, "Team Alpha")
	org2 := createOrg(t, ts, "Team Beta")

	// Capture items in each workspace with different URLs.
	result1, resp1 := captureWithOrg(t, ts, capturePayload{
		URL:      "https://github.com/alpha/tool-a",
		TypeHint: string(items.TypeRepo),
	}, org1)
	if result1.code != http.StatusCreated || resp1.Item == nil {
		t.Fatalf("capture in org1: %d %s", result1.code, result1.raw)
	}

	result2, resp2 := captureWithOrg(t, ts, capturePayload{
		URL:      "https://github.com/beta/tool-b",
		TypeHint: string(items.TypeRepo),
	}, org2)
	if result2.code != http.StatusCreated || resp2.Item == nil {
		t.Fatalf("capture in org2: %d %s", result2.code, result2.raw)
	}

	// Verify each item is in the correct workspace.
	if resp1.Item.OrgID == nil || *resp1.Item.OrgID != org1 {
		t.Errorf("item1 org_id = %v, want %s", resp1.Item.OrgID, org1)
	}
	if resp2.Item.OrgID == nil || *resp2.Item.OrgID != org2 {
		t.Errorf("item2 org_id = %v, want %s", resp2.Item.OrgID, org2)
	}
}

func TestCapture_InWorkspace_CanListItemsByWorkspace(t *testing.T) {
	ts := newTestServer(t)

	// Create a workspace.
	orgID := createOrg(t, ts, "Test Team")

	// Capture items in the workspace.
	for i, url := range []string{
		"https://github.com/team/tool-1",
		"https://github.com/team/tool-2",
		"https://github.com/team/tool-3",
	} {
		_, resp := captureWithOrg(t, ts, capturePayload{
			URL:      url,
			TypeHint: string(items.TypeRepo),
		}, orgID)
		if resp == nil || resp.Item == nil {
			t.Fatalf("capture %d failed", i)
		}
	}

	// List items with X-Org-ID header — should only return workspace items.
	rec := ts.doWithOrg(t, http.MethodGet, "/api/items", nil, orgID)
	if rec.Code != http.StatusOK {
		t.Fatalf("list items: expected 200, got %d", rec.Code)
	}
	var listResp struct {
		Total int          `json:"total"`
		Items []items.Item `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &listResp); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if listResp.Total != 3 {
		t.Errorf("expected 3 items in workspace, got %d", listResp.Total)
	}
	// Verify all items have the correct org_id.
	for _, item := range listResp.Items {
		if item.OrgID == nil || *item.OrgID != orgID {
			t.Errorf("item %s has org_id %v, want %s", item.ID, item.OrgID, orgID)
		}
	}
}

func TestCapture_InWorkspace_DuplicatePreservesOrgID(t *testing.T) {
	ts := newTestServer(t)

	// Create a workspace.
	orgID := createOrg(t, ts, "Dup Team")

	// First capture.
	result1, resp1 := captureWithOrg(t, ts, capturePayload{
		URL:      "https://github.com/dup/shared-tool",
		TypeHint: string(items.TypeRepo),
	}, orgID)
	if result1.code != http.StatusCreated || resp1.Item == nil {
		t.Fatalf("first capture: %d %s", result1.code, result1.raw)
	}

	// Duplicate capture in the same workspace.
	result2, resp2 := captureWithOrg(t, ts, capturePayload{
		URL:      "https://github.com/dup/shared-tool",
		TypeHint: string(items.TypeRepo),
	}, orgID)
	if result2.code != http.StatusOK {
		t.Fatalf("dup capture: expected 200, got %d, %s", result2.code, result2.raw)
	}
	if resp2.DuplicateOf == nil || *resp2.DuplicateOf != resp1.Item.ID {
		t.Errorf("duplicate_of = %v, want %s", resp2.DuplicateOf, resp1.Item.ID)
	}
}

func TestCapture_InWorkspace_TextNoteType(t *testing.T) {
	ts := newTestServer(t)

	// Create a workspace.
	orgID := createOrg(t, ts, "Notes Team")

	// Capture a text note in the workspace.
	result, resp := captureWithOrg(t, ts, capturePayload{
		Text:     "Remember to update the deployment docs",
		TypeHint: string(items.TypeNote),
	}, orgID)

	if result.code != http.StatusCreated {
		t.Fatalf("capture note: expected 201, got %d, body: %s", result.code, result.raw)
	}
	if resp.Item == nil {
		t.Fatal("expected captured item")
	}
	if resp.Item.OrgID == nil {
		t.Fatal("expected org_id to be set on captured note")
	}
	if *resp.Item.OrgID != orgID {
		t.Errorf("org_id = %s, want %s", *resp.Item.OrgID, orgID)
	}
	if resp.Item.Type != items.TypeNote {
		t.Errorf("item type = %q, want %q", resp.Item.Type, items.TypeNote)
	}
}

// captureWithOrg is a helper that captures an item with the X-Org-ID header set.
func captureWithOrg(t *testing.T, ts *testServer, body capturePayload, orgID uuid.UUID) (*httpTestResult, *captureResp) {
	t.Helper()
	rec := ts.doWithOrg(t, http.MethodPost, "/api/items/capture", body, orgID)
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
