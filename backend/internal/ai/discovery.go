package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

// DiscoveryQuery is a GitHub search string derived from a natural-language
// need, e.g. "lightweight Go CLI to resize images" →
// "image resize in:name,description language:go stars:>100 pushed:>2024-01-01".
type DiscoveryQuery struct {
	// GitHubQuery is the qualifier-rich string sent to /search/repositories.
	GitHubQuery string
	// Language is the detected primary language ("" when unknown).
	Language string
	// Keywords are the salient terms, used for ranking overlap.
	Keywords []string
}

// DiscoveryBuilder turns needs into GitHub queries. The LLM path runs one
// short Flash-class call; the heuristic fallback costs $0 and still beats
// sending raw user text to GitHub.
type DiscoveryBuilder struct {
	apiKey string
	model  string
	httpc  *http.Client
}

// NewDiscoveryBuilder wires the LLM path. Empty key disables it (heuristic
// only) — callers check Enabled before spending.
func NewDiscoveryBuilder(apiKey, model string) *DiscoveryBuilder {
	model = strings.TrimSpace(model)
	if model == "" {
		model = "gemini-3.8-flash"
	}
	return &DiscoveryBuilder{
		apiKey: strings.TrimSpace(apiKey),
		model:  model,
		httpc:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (b *DiscoveryBuilder) Enabled() bool {
	return b != nil && b.apiKey != ""
}

// Build resolves a need to a GitHub query. kind is an optional language
// hint from the request ("go", "rust"...); it wins over detection.
func (b *DiscoveryBuilder) Build(ctx context.Context, need, kind string) (DiscoveryQuery, *Usage, error) {
	need = strings.TrimSpace(need)
	if need == "" {
		return DiscoveryQuery{}, nil, errors.New("empty need")
	}
	if b.Enabled() {
		if q, usage, err := b.buildWithLLM(ctx, need, kind); err == nil {
			return q, usage, nil
		}
		// LLM failure falls through to the heuristic: discovery must
		// work even when the model is down.
	}
	return buildHeuristicQuery(need, kind), nil, nil
}

func (b *DiscoveryBuilder) buildWithLLM(ctx context.Context, need, kind string) (DiscoveryQuery, *Usage, error) {
	user := "Need: " + need
	if kind != "" {
		user += "\nPreferred language: " + kind
	}
	body, err := json.Marshal(geminiRequest{
		SystemInstruction: &geminiContent{Parts: []geminiPart{{Text: `You turn a developer need into a GitHub repository search.
Return ONLY compact JSON: {"q":"<github search string>","language":"<primary language or empty>","keywords":["...up to 5 salient terms..."]}.
The q string must use GitHub qualifiers where they help: in:name,description, language:, stars:>N, pushed:>YYYY-MM-DD, topic:. Prefer maintained projects: add pushed:>2024-01-01 unless the need says otherwise. No prose.`}}},
		Contents:         []geminiContent{{Role: "user", Parts: []geminiPart{{Text: user}}}},
		GenerationConfig: geminiGenConfig{Temperature: 0.2, MaxOutputTokens: 256},
	})
	if err != nil {
		return DiscoveryQuery{}, nil, err
	}
	url := geminiBaseURL + "/models/" + b.model + ":generateContent?key=" + b.apiKey
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return DiscoveryQuery{}, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.httpc.Do(req)
	if err != nil {
		return DiscoveryQuery{}, nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return DiscoveryQuery{}, nil, err
	}
	var decoded geminiResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return DiscoveryQuery{}, nil, err
	}
	if decoded.Error != nil || resp.StatusCode >= 300 || len(decoded.Candidates) == 0 || len(decoded.Candidates[0].Content.Parts) == 0 {
		return DiscoveryQuery{}, nil, errors.New("gemini discovery call failed")
	}
	var parsed struct {
		Q        string   `json:"q"`
		Language string   `json:"language"`
		Keywords []string `json:"keywords"`
	}
	text := strings.TrimSpace(decoded.Candidates[0].Content.Parts[0].Text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(strings.TrimSpace(text), "```")
	if err := json.Unmarshal([]byte(text), &parsed); err != nil || strings.TrimSpace(parsed.Q) == "" {
		return DiscoveryQuery{}, nil, errors.New("gemini discovery returned unparsable JSON")
	}
	var usage *Usage
	if decoded.UsageMetadata != nil {
		usage = &Usage{InputTokens: decoded.UsageMetadata.PromptTokens, OutputTokens: decoded.UsageMetadata.CandidatesTokens}
	}
	return DiscoveryQuery{GitHubQuery: strings.TrimSpace(parsed.Q), Language: strings.ToLower(strings.TrimSpace(parsed.Language)), Keywords: parsed.Keywords}, usage, nil
}

// languageAliases maps common mentions to GitHub language qualifiers.
var languageAliases = map[string]string{
	"golang": "go", "go": "go",
	"rust": "rust", "rs": "rust",
	"python": "python", "py": "python",
	"typescript": "typescript", "ts": "typescript",
	"javascript": "javascript", "js": "javascript",
	"java": "java", "kotlin": "kotlin",
	"swift": "swift", "ruby": "ruby",
	"c++": "cpp", "cpp": "cpp", "c#": "csharp",
	"zig": "zig", "elixir": "elixir",
	"lua": "lua", "haskell": "haskell",
}

// buildHeuristicQuery extracts language + keywords with zero model cost.
func buildHeuristicQuery(need, kind string) DiscoveryQuery {
	lower := strings.ToLower(need)
	lang := strings.ToLower(strings.TrimSpace(kind))
	if lang == "" {
		for alias, gh := range languageAliases {
			if strings.Contains(lower, alias) {
				lang = gh
				break
			}
		}
	} else if gh, ok := languageAliases[lang]; ok {
		lang = gh
	}

	stop := map[string]bool{
		"a": true, "an": true, "the": true, "to": true, "for": true, "and": true,
		"or": true, "with": true, "that": true, "this": true, "need": true,
		"want": true, "find": true, "show": true, "give": true, "lightweight": true,
		"best": true, "good": true, "simple": true, "please": true, "tool": true,
		"tools": true, "library": true, "libraries": true, "app": true,
	}
	var keywords []string
	seen := map[string]bool{}
	for _, w := range strings.FieldsFunc(lower, func(r rune) bool {
		return (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '+' && r != '#'
	}) {
		if len(w) < 3 || stop[w] || seen[w] {
			continue
		}
		seen[w] = true
		keywords = append(keywords, w)
		if len(keywords) == 5 {
			break
		}
	}

	var q strings.Builder
	q.WriteString(strings.Join(keywords, " "))
	q.WriteString(" in:name,description")
	if lang != "" {
		q.WriteString(" language:" + lang)
	}
	q.WriteString(" stars:>50 pushed:>2024-01-01")
	return DiscoveryQuery{GitHubQuery: strings.TrimSpace(q.String()), Language: lang, Keywords: keywords}
}
