package handlers

import (
	"errors"
	"net/http"
	"time"

	"devdeck/internal/cache"
	"devdeck/internal/store"
)

type DiscoveryHandler struct {
	store *store.Store
	cache *cache.Cache
}

func NewDiscoveryHandler(s *store.Store, c *cache.Cache) *DiscoveryHandler {
	return &DiscoveryHandler{store: s, cache: c}
}

// GET /api/discovery/next
//
// Returns the next repo to surface in the swipe deck. Returns 204
// when there are no more eligible repos so the frontend can show a
// "all done!" empty state.
func (h *DiscoveryHandler) Next(w http.ResponseWriter, r *http.Request) {
	repo, err := h.store.GetDiscoveryNext(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, repo)
}

// GET /api/discovery/trending
func (h *DiscoveryHandler) Trending(w http.ResponseWriter, r *http.Request) {
	limit := parseLimitFromQuery(r.URL.Query().Get("limit"), 10, 50)
	cacheKey := "trending:list"

	var items []store.TrendingItem
	found, _ := h.cache.Get(r.Context(), cacheKey, &items)
	if found {
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "cached": true})
		return
	}

	items, err := h.store.GetTrendingItems(r.Context(), limit)
	if err != nil {
		writeInternal(w, err)
		return
	}

	_ = h.cache.Set(r.Context(), cacheKey, items, 1*time.Hour)
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GET /api/discovery/leaderboard
func (h *DiscoveryHandler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	limit := parseLimitFromQuery(r.URL.Query().Get("limit"), 10, 50)
	cacheKey := "leaderboard:top"

	var rankings []store.CuratorRanking
	found, _ := h.cache.Get(r.Context(), cacheKey, &rankings)
	if found {
		writeJSON(w, http.StatusOK, map[string]any{"rankings": rankings, "cached": true})
		return
	}

	rankings, err := h.store.GetCuratorLeaderboard(r.Context(), limit)
	if err != nil {
		writeInternal(w, err)
		return
	}

	_ = h.cache.Set(r.Context(), cacheKey, rankings, 30*time.Minute)
	writeJSON(w, http.StatusOK, map[string]any{"rankings": rankings})
}
