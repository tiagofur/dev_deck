package ai

import (
	"strings"
)

// Usage carries token counts reported by a provider for one API call.
// Providers that don't report usage leave it nil and callers estimate.
type Usage struct {
	InputTokens  int
	OutputTokens int
}

// ModelCost is USD per 1M tokens.
type ModelCost struct {
	InputPer1M  float64
	OutputPer1M float64
}

// modelCosts maps model name fragments to prices. Lookup is substring-based
// so "gpt-4o-mini-2024-07-18" still matches "gpt-4o-mini". Entries are
// checked in order; keep specific models before family fallbacks.
//
// Prices verified 2026-10-27 from provider pricing pages and public
// aggregators. Re-verify before changing the monthly cap: a stale table
// either over-blocks users or leaks margin.
var modelCosts = []struct {
	fragment string
	cost     ModelCost
}{
	// OpenAI
	{"gpt-4o-mini", ModelCost{InputPer1M: 0.15, OutputPer1M: 0.60}},
	{"text-embedding-3-small", ModelCost{InputPer1M: 0.02, OutputPer1M: 0.0}},
	{"gpt-4o", ModelCost{InputPer1M: 2.50, OutputPer1M: 10.00}},
	// Google Gemini
	{"gemini-2.5-flash", ModelCost{InputPer1M: 0.30, OutputPer1M: 2.50}},
	{"gemini-flash", ModelCost{InputPer1M: 0.30, OutputPer1M: 2.50}},
	// DeepSeek (approximate public pricing, re-verify)
	{"deepseek-chat", ModelCost{InputPer1M: 0.27, OutputPer1M: 1.10}},
	{"deepseek", ModelCost{InputPer1M: 0.27, OutputPer1M: 1.10}},
	// Alibaba Qwen (approximate public pricing, re-verify)
	{"qwen-turbo", ModelCost{InputPer1M: 0.05, OutputPer1M: 0.20}},
	{"qwen", ModelCost{InputPer1M: 0.20, OutputPer1M: 0.60}},
}

// EstimateCents converts token usage to USD cents for a model. Unknown
// models return 0 — metering records the event with zero cost rather than
// blocking on a missing price entry. Local providers (ollama, lmstudio,
// heuristic) always cost 0.
func EstimateCents(model string, in, out int) float64 {
	model = strings.ToLower(strings.TrimSpace(model))
	for _, e := range modelCosts {
		if strings.Contains(model, e.fragment) {
			return (float64(in)*e.cost.InputPer1M + float64(out)*e.cost.OutputPer1M) / 1e6 * 100
		}
	}
	return 0
}

// EstimateTokens approximates token counts from raw text when the provider
// doesn't report usage (~4 chars per token for English/code). Conservative
// on purpose: over-counting protects margin, under-counting leaks it.
func EstimateTokens(text string) int {
	return EstimateTokensFromLen(len(text))
}

// EstimateTokensFromLen is EstimateTokens for call sites that only tracked
// character counts.
func EstimateTokensFromLen(n int) int {
	n /= 4
	if n < 1 {
		return 1
	}
	return n
}

// CostOf is a tiny helper for tests and call sites holding a Usage.
func CostOf(model string, u Usage) float64 {
	return EstimateCents(model, u.InputTokens, u.OutputTokens)
}
