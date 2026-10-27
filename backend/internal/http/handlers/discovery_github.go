package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"math"
	"net/http"
	"strings"
	"time"

	"heapdeck/internal/ai"
	"heapdeck/internal/authctx"
	"heapdeck/internal/cache"
	"heapdeck/internal/enricher"
	"heapdeck/internal/metering"
	"heapdeck/internal/metrics"
	"heapdeck/internal/store"
)

// GitHubDiscoveryHandler serves need-based repository discovery. Pro-only:
// it spends one Flash-class call (query building) plus GitHub search quota.
type GitHubDiscoveryHandler struct {
	store   *store.Store
	enrich  *enricher.Service
	builder *ai.DiscoveryBuilder
	meter   *metering.Recorder
	cache   *cache.Cache
}

func NewGitHubDiscoveryHandler(s *store.Store, en *enricher.Service, builder *ai.DiscoveryBuilder, meter *metering.Recorder, c *cache.Cache) *GitHubDiscoveryHandler {
	return &GitHubDiscoveryHandler{store: s, enrich: en, builder: builder, meter: meter, cache: c}
}

type discoveryResult struct {
	FullName    string   `json:"full_name"`
	URL         string   `json:"url"`
	Description string   `json:"description"`
	Language    string   `json:"language"`
	Stars       int      `json:"stars"`
	Topics      []string `json:"topics"`
	PushedAt    string   `json:"pushed_at"`
	AvatarURL   string   `json:"avatar_url"`
	Score       float64  `json:"score"`
	MatchReason string   `json:"match_reason"`
}

// GET /api/discovery/github?q=<need>&language=&limit= — rank GitHub repos
// for a natural-language need. Save via POST /api/items/capture (1-click).
func (h *GitHubDiscoveryHandler) Search(w http.ResponseWriter, r *http.Request) {
	need := strings.TrimSpace(r.URL.Query().Get("q"))
	if need == "" {
		writeError(w, http.StatusBadRequest, "MISSING_QUERY", "q parameter is required")
		return
	}
	if len(need) > 300 {
		writeError(w, http.StatusUnprocessableEntity, "QUERY_TOO_LONG", "q must be 300 chars or less")
		return
	}
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	if h.meter != nil && !h.meter.Allowed(r.Context(), userID) {
		writeError(w, http.StatusTooManyRequests, "AI_QUOTA_EXCEEDED", "monthly AI budget spent; resets next month")
		return
	}
	limit := parseLimitFromQuery(r.URL.Query().Get("limit"), 10, 20)
	language := strings.TrimSpace(r.URL.Query().Get("language"))

	// Cache on the normalized need so repeat queries cost $0 and spare
	// GitHub's search quota (30/min authenticated).
	cacheKey := "github:search:" + cacheKeyOf(need, language, limit)
	if h.cache != nil {
		var cached map[string]any
		if found, _ := h.cache.Get(r.Context(), cacheKey, &cached); found {
			cached["cached"] = true
			writeJSON(w, http.StatusOK, cached)
			return
		}
	}

	query, usage, err := h.builder.Build(r.Context(), need, language)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if h.meter != nil && usage != nil {
		h.meter.RecordUsage(r.Context(), userID, store.AIActionDiscovery, "gemini-3.8-flash", metering.FromAI(usage))
	}

	hits, err := h.enrich.SearchGitHub(r.Context(), enricher.SearchOptions{Query: query.GitHubQuery, PerPage: limit})
	if err != nil {
		metrics.GitHubSearch.WithLabelValues("error").Inc()
		writeInternal(w, err)
		return
	}
	metrics.GitHubSearch.WithLabelValues("ok").Inc()

	results := rankHits(hits, query)
	payload := map[string]any{
		"query":        need,
		"github_query": query.GitHubQuery,
		"results":      results,
		"cached":       false,
	}
	if h.cache != nil {
		_ = h.cache.Set(r.Context(), cacheKey, payload, 1*time.Hour)
	}
	writeJSON(w, http.StatusOK, payload)
}

func cacheKeyOf(need, language string, limit int) string {
	sum := sha256.Sum256([]byte(strings.ToLower(need) + "|" + strings.ToLower(language) + "|" + string(rune(limit))))
	return hex.EncodeToString(sum[:])
}

// rankHits re-scores GitHub's star-sorted hits for the need: log-scaled
// stars plus recency, language match, and keyword/topic overlap. Pure
// function — table-tested without network or DB.
func rankHits(hits []enricher.SearchHit, query ai.DiscoveryQuery) []discoveryResult {
	out := make([]discoveryResult, 0, len(hits))
	for _, hit := range hits {
		score := 0.0
		var reasons []string

		if hit.Stars > 0 {
			stars := math.Log10(float64(hit.Stars) + 1)
			score += stars * 2
			if hit.Stars >= 1000 {
				reasons = append(reasons, "popular")
			}
		}
		if t, err := time.Parse(time.RFC3339, hit.PushedAt); err == nil {
			ageDays := time.Since(t).Hours() / 24
			switch {
			case ageDays < 30:
				score += 2
				reasons = append(reasons, "very active")
			case ageDays < 180:
				score += 1
				reasons = append(reasons, "maintained")
			case ageDays < 365:
				score += 0.5
			}
		}
		if query.Language != "" && strings.EqualFold(hit.Language, query.Language) {
			score += 1.5
			reasons = append(reasons, "matches "+query.Language)
		}
		overlap := keywordOverlap(hit, query.Keywords)
		score += overlap
		if overlap >= 1 {
			reasons = append(reasons, "matches your need")
		}
		if len(reasons) == 0 {
			reasons = append(reasons, "community pick")
		}

		out = append(out, discoveryResult{
			FullName:    hit.FullName,
			URL:         hit.HTMLURL,
			Description: hit.Description,
			Language:    hit.Language,
			Stars:       hit.Stars,
			Topics:      hit.Topics,
			PushedAt:    hit.PushedAt,
			AvatarURL:   hit.AvatarURL,
			Score:       math.Round(score*100) / 100,
			MatchReason: strings.Join(reasons, " · "),
		})
	}
	// Insertion sort keeps it dependency-free; n ≤ 20.
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j].Score > out[j-1].Score; j-- {
			out[j], out[j-1] = out[j-1], out[j]
		}
	}
	return out
}

// keywordOverlap scores description/topics against the need keywords.
func keywordOverlap(hit enricher.SearchHit, keywords []string) float64 {
	if len(keywords) == 0 {
		return 0
	}
	haystack := strings.ToLower(hit.Description + " " + strings.Join(hit.Topics, " ") + " " + hit.FullName)
	score := 0.0
	for _, kw := range keywords {
		if kw != "" && strings.Contains(haystack, strings.ToLower(kw)) {
			score += 0.5
		}
	}
	return score
}
