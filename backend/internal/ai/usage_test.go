package ai

import (
	"testing"
)

func TestEstimateCents_KnownModels(t *testing.T) {
	tests := []struct {
		model string
		in    int
		out   int
		want  float64
	}{
		// gpt-4o-mini: $0.15/$0.60 per 1M → 1000 in + 100 out
		{"gpt-4o-mini", 1000, 100, 0.021},
		{"gpt-4o-mini-2024-07-18", 1000, 100, 0.021}, // substring match
		// text-embedding-3-small: $0.02/1M in, $0 out
		{"text-embedding-3-small", 1000, 0, 0.002},
		// gemini-3.8-flash: $0.75/$3.75 per 1M (promo through 2026-12-31)
		{"gemini-3.8-flash", 1000, 100, 0.1125},
		// deepseek-chat: $0.27/$1.10 per 1M
		{"deepseek-chat", 1000, 100, 0.038},
		// unknown models price at zero, never block
		{"some-future-model", 100000, 100000, 0},
		{"", 100, 100, 0},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			got := EstimateCents(tt.model, tt.in, tt.out)
			if diff := got - tt.want; diff > 0.0001 || diff < -0.0001 {
				t.Errorf("EstimateCents(%q) = %v, want %v", tt.model, got, tt.want)
			}
		})
	}
}

func TestEstimateTokensFromLen(t *testing.T) {
	if got := EstimateTokensFromLen(0); got != 1 {
		t.Errorf("empty text must estimate at least 1 token, got %d", got)
	}
	if got := EstimateTokensFromLen(400); got != 100 {
		t.Errorf("400 chars = 100 tokens, got %d", got)
	}
	if got := EstimateTokens("hello world, this is a test"); got < 1 {
		t.Errorf("EstimateTokens must be >= 1, got %d", got)
	}
}

func TestCostOf(t *testing.T) {
	got := CostOf("gpt-4o-mini", Usage{InputTokens: 1000, OutputTokens: 100})
	if diff := got - 0.021; diff > 0.0001 || diff < -0.0001 {
		t.Errorf("CostOf = %v, want 0.021", got)
	}
}
