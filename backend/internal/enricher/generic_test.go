package enricher

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

const sampleHTML = `<!doctype html>
<html>
<head>
  <title>Fallback Title</title>
  <meta property="og:title" content="OG Title">
  <meta property="og:description" content="A description from Open Graph">
  <meta property="og:image" content="https://example.com/cover.png">
  <meta property="og:url" content="https://example.com/canonical">
</head>
<body>hi</body>
</html>`

func TestOpenGraphEnricher_Fetch_ParsesMeta(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") == "" {
			t.Error("expected User-Agent header")
		}
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(sampleHTML))
	}))
	defer srv.Close()

	en := &OpenGraphEnricher{httpc: &http.Client{Timeout: 5 * time.Second}, allowInternal: true}
	md, err := en.Fetch(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("Fetch failed: %v", err)
	}
	if md.Description == nil || *md.Description != "A description from Open Graph" {
		t.Errorf("unexpected description: %+v", md.Description)
	}
	if md.OGImageURL == nil || *md.OGImageURL != "https://example.com/cover.png" {
		t.Errorf("unexpected og:image: %+v", md.OGImageURL)
	}
	if md.Homepage == nil || *md.Homepage != "https://example.com/canonical" {
		t.Errorf("unexpected og:url: %+v", md.Homepage)
	}
}

const noOGHTML = `<!doctype html>
<html><head><title>Just a Title</title></head><body>x</body></html>`

func TestOpenGraphEnricher_Fetch_FallsBackToTitle(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(noOGHTML))
	}))
	defer srv.Close()

	en := &OpenGraphEnricher{httpc: &http.Client{Timeout: 5 * time.Second}, allowInternal: true}
	md, err := en.Fetch(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("Fetch failed: %v", err)
	}
	if md.Description == nil || *md.Description != "Just a Title" {
		t.Errorf("expected fallback to <title>, got %+v", md.Description)
	}
}

func TestOpenGraphEnricher_Fetch_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	en := &OpenGraphEnricher{httpc: &http.Client{Timeout: 5 * time.Second}, allowInternal: true}
	_, err := en.Fetch(context.Background(), srv.URL)
	if err == nil {
		t.Fatal("expected error on 500, got nil")
	}
}

func TestService_Enrich_DispatchesByHost(t *testing.T) {
	// Generic site responds with HTML so we can verify the generic path is hit.
	genericSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><head><meta property="og:title" content="Hi"></head></html>`))
	}))
	defer genericSrv.Close()

	// NewForTest bypasses the SSRF guard so httptest.Server on 127.0.0.1 works.
	svc := NewForTest("")
	md, err := svc.Enrich(context.Background(), genericSrv.URL)
	if err != nil {
		t.Fatalf("Enrich failed: %v", err)
	}
	if md.Description == nil || *md.Description != "Hi" {
		t.Errorf("expected generic enricher to fill description from og:title, got %+v", md.Description)
	}
}

func TestService_Enrich_InvalidURL(t *testing.T) {
	svc := NewForTest("")
	_, err := svc.Enrich(context.Background(), "::not-a-url")
	if err != ErrInvalidURL {
		t.Fatalf("expected ErrInvalidURL, got %v", err)
	}
}
