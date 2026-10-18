package handlers_test

import (
	"net/http"
	"testing"
)

// Webhook delivery targets are user-supplied; the SSRF blocklist that guards
// the enricher must apply at creation time too.
func TestWebhookCreate_RejectsNonPublicURLs(t *testing.T) {
	ts := newTestServer(t)

	cases := []struct {
		name string
		url  string
	}{
		{"cloud metadata", "http://169.254.169.254/latest/meta-data/"},
		{"loopback", "http://127.0.0.1:5432/hook"},
		{"private range", "http://192.168.1.10/hook"},
		{"non-http scheme", "ftp://example.com/hook"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := ts.do(t, http.MethodPost, "/api/me/webhooks", map[string]any{
				"name":   "hook",
				"url":    tc.url,
				"events": []string{"item.created"},
			})
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("%s: expected 400, got %d: %s", tc.url, rec.Code, rec.Body.String())
			}
		})
	}

	// A public endpoint is accepted.
	rec := ts.do(t, http.MethodPost, "/api/me/webhooks", map[string]any{
		"name":   "public",
		"url":    "https://example.com/hook",
		"events": []string{"item.created"},
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("public url: expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
}
