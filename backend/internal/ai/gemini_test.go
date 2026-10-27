package ai

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"heapdeck/internal/config"
	"heapdeck/internal/domain/items"
)

func TestGeminiProviderSummarizeAndTags(t *testing.T) {
	var gotPath, gotKey string
	var gotBody string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotKey = r.URL.Query().Get("key")
		buf := make([]byte, r.ContentLength)
		_, _ = r.Body.Read(buf)
		gotBody = string(buf)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"candidates": [{"content": {"parts": [{"text": "[\"cli\",\"search\"]"}]}}],
			"usageMetadata": {"promptTokenCount": 90, "candidatesTokenCount": 12}
		}`))
	}))
	defer server.Close()

	oldURL := geminiBaseURLForTests
	geminiBaseURLForTests = server.URL
	defer func() { geminiBaseURLForTests = oldURL }()

	svc := NewGemini("test-key", "")
	if svc.Model() != "gemini-3.8-flash" {
		t.Fatalf("default model = %q, want gemini-3.8-flash", svc.Model())
	}

	// Exercise through the public detailed path (two calls: summary + tags).
	out, err := svc.EnrichItemDetailed(context.Background(), &items.Item{
		Type:  items.TypeCLI,
		Title: "ripgrep",
	})
	if err != nil {
		t.Fatalf("EnrichItemDetailed error = %v", err)
	}
	if len(out.Tags) != 2 || out.Tags[0] != "cli" || out.Tags[1] != "search" {
		t.Fatalf("tags = %#v", out.Tags)
	}
	if out.Usage == nil || out.Usage.InputTokens != 180 || out.Usage.OutputTokens != 24 {
		t.Fatalf("usage = %+v, want {180 24} summed over two calls", out.Usage)
	}

	if !strings.HasSuffix(gotPath, "/models/gemini-3.8-flash:generateContent") {
		t.Errorf("path = %q, want .../models/gemini-3.8-flash:generateContent", gotPath)
	}
	if gotKey != "test-key" {
		t.Errorf("auth must travel in ?key=, got %q", gotKey)
	}
	if !strings.Contains(gotBody, "maxOutputTokens") || !strings.Contains(gotBody, "systemInstruction") {
		t.Errorf("request must carry systemInstruction + generationConfig, got %s", gotBody)
	}
}

func TestGeminiProviderDisabledWithoutKey(t *testing.T) {
	svc := NewGemini("", "")
	if svc.Enabled() {
		t.Fatal("gemini without key must be disabled")
	}
	if _, err := svc.EnrichItem(context.Background(), &items.Item{Type: items.TypeCLI}); err != nil {
		t.Fatalf("disabled enrich must return empty, got err %v", err)
	}
}

func TestGeminiProviderHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":{"message":"bad key"}}`))
	}))
	defer server.Close()

	oldURL := geminiBaseURLForTests
	geminiBaseURLForTests = server.URL
	defer func() { geminiBaseURLForTests = oldURL }()

	svc := NewGemini("bad", "gemini-3.8-flash")
	if _, err := svc.EnrichItem(context.Background(), &items.Item{Type: items.TypeCLI, Title: "x"}); err == nil {
		t.Fatal("expected error from API failure")
	}
}

func TestNewFromConfigGemini(t *testing.T) {
	svc := NewFromConfig(config.Config{AIProvider: "gemini", GeminiAPIKey: "k", GeminiModel: "custom-flash"})
	if !svc.Enabled() {
		t.Fatal("gemini service must be enabled with a key")
	}
	if svc.Model() != "custom-flash" {
		t.Fatalf("Model() = %q, want custom-flash", svc.Model())
	}
	if svc.Agent() != nil {
		t.Fatal("gemini has no chat agent wired (punctual actions only)")
	}
}

func TestEmbeddingsFromConfigGeminiPairsOpenAI(t *testing.T) {
	emb := NewEmbeddingsServiceFromConfig(config.Config{AIProvider: "gemini", OpenAIAPIKey: "k"})
	if !emb.Enabled() {
		t.Fatal("gemini + openai key must enable OpenAI embeddings")
	}
	if emb.Dim() != 1536 {
		t.Fatalf("dim = %d, want 1536", emb.Dim())
	}

	emb = NewEmbeddingsServiceFromConfig(config.Config{AIProvider: "gemini"})
	if emb.Enabled() {
		t.Fatal("gemini without openai key must leave embeddings disabled")
	}
}

func TestLoadGeminiValidation(t *testing.T) {
	t.Setenv("DB_URL", "postgres://x")
	t.Setenv("API_TOKEN", "t")
	t.Setenv("AI_PROVIDER", "gemini")
	t.Setenv("AI_EXTERNAL_OPT_IN", "false")
	t.Setenv("GEMINI_API_KEY", "")

	if _, err := config.Load(); err == nil {
		t.Fatal("gemini without opt-in must fail config load")
	}

	t.Setenv("AI_EXTERNAL_OPT_IN", "true")
	if _, err := config.Load(); err == nil {
		t.Fatal("gemini without key must fail config load")
	}

	t.Setenv("GEMINI_API_KEY", "k")
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("valid gemini config must load: %v", err)
	}
	if cfg.GeminiModel != "gemini-3.8-flash" {
		t.Fatalf("default model = %q", cfg.GeminiModel)
	}
}
