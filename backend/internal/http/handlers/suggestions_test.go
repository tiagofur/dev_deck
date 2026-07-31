package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

type suggestion struct {
	Label   string `json:"label"`
	Command string `json:"command"`
}

func TestHandlers_Suggestions_SecurityLeak(t *testing.T) {
	ts := newTestServer(t)

	// Create a PUBLIC cheatsheet
	resPublic := ts.do(t, http.MethodPost, "/api/cheatsheets", map[string]any{
		"slug":       "public-sheet",
		"title":      "Public Sheet",
		"category":   "test",
		"visibility": "public",
	})
	if resPublic.Code != http.StatusCreated {
		t.Fatalf("failed to create public sheet: %d, body: %s", resPublic.Code, resPublic.Body.String())
	}
	publicSheet := decodeJSON[cheatsheetResp](t, resPublic)

	// Add entry to public sheet
	ts.do(t, http.MethodPost, "/api/cheatsheets/"+publicSheet.ID.String()+"/entries", map[string]any{
		"label":   "Public Command",
		"command": "echo public-info",
	})

	// Create a PRIVATE cheatsheet
	resPrivate := ts.do(t, http.MethodPost, "/api/cheatsheets", map[string]any{
		"slug":       "private-sheet",
		"title":      "Private Sheet",
		"category":   "test",
		"visibility": "private",
	})
	if resPrivate.Code != http.StatusCreated {
		t.Fatalf("failed to create private sheet: %d, body: %s", resPrivate.Code, resPrivate.Body.String())
	}
	privateSheet := decodeJSON[cheatsheetResp](t, resPrivate)

	// Add entry to private sheet
	ts.do(t, http.MethodPost, "/api/cheatsheets/"+privateSheet.ID.String()+"/entries", map[string]any{
		"label":   "Private Command",
		"command": "secret-command --key=12345",
	})

	// Query for the private command
	rec := ts.do(t, http.MethodGet, "/api/suggestions/commands?q=secret", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("suggestions failed: %d", rec.Code)
	}

	var results []suggestion
	if err := json.NewDecoder(rec.Body).Decode(&results); err != nil {
		t.Fatalf("failed to decode results: %v", err)
	}

	// Confirm VULNERABILITY: private command is currently returned
	foundPrivate := false
	for _, s := range results {
		if s.Command == "secret-command --key=12345" {
			foundPrivate = true
			break
		}
	}

	if foundPrivate {
		t.Errorf("Security Leak: Private command was found in suggestions")
	}

	// Query for public command
	rec2 := ts.do(t, http.MethodGet, "/api/suggestions/commands?q=public", nil)
	var results2 []suggestion
	json.NewDecoder(rec2.Body).Decode(&results2)

	foundPublic := false
	for _, s := range results2 {
		if s.Command == "echo public-info" {
			foundPublic = true
			break
		}
	}
	if !foundPublic {
		t.Errorf("Expected to find public command, but it was not found")
	}
}
