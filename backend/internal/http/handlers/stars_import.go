package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/items"
	"devdeck/internal/domain/repos"
	"devdeck/internal/enricher"
	"devdeck/internal/store"
)

// StarsImportHandler imports a user's public GitHub stars into the vault.
// It uses the server-side GitHub token (same as the enricher), so no user
// OAuth token is ever stored. Public stars only.
type StarsImportHandler struct {
	store    *store.Store
	enricher *enricher.Service
}

func NewStarsImportHandler(s *store.Store, en *enricher.Service) *StarsImportHandler {
	return &StarsImportHandler{store: s, enricher: en}
}

const (
	starsImportDefaultMax = 300
	starsImportHardMax    = 1000
)

// POST /api/import/github-stars
func (h *StarsImportHandler) Import(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req struct {
		Username string `json:"username"`
		Max      int    `json:"max"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	username := strings.TrimSpace(req.Username)
	if username == "" {
		// Default to the GitHub login of the current user (OAuth sign-ins).
		user, err := h.store.GetUserByID(r.Context(), userID)
		if err == nil && user != nil {
			username = user.Login
		}
	}
	if username == "" {
		writeError(w, http.StatusUnprocessableEntity, "MISSING_USERNAME",
			"no GitHub username on this account; pass one explicitly")
		return
	}

	max := req.Max
	if max <= 0 {
		max = starsImportDefaultMax
	}
	if max > starsImportHardMax {
		max = starsImportHardMax
	}

	stars, err := h.enricher.ListStarred(r.Context(), username, max)
	if err != nil {
		writeError(w, http.StatusBadGateway, "GITHUB_ERROR", err.Error())
		return
	}

	imported, skipped := 0, 0
	for _, star := range stars {
		if star.HTMLURL == "" {
			skipped++
			continue
		}
		norm := items.NormalizeURL(star.HTMLURL)
		if norm != "" {
			if _, err := h.store.GetItemByNormalizedURL(r.Context(), userID, norm); err == nil {
				skipped++
				continue
			}
		}

		starURL := star.HTMLURL
		input := store.CreateItemInput{
			Type:          items.TypeRepo,
			Title:         star.FullName,
			URL:           &starURL,
			Description:   star.Description,
			Tags:          []string{"github-stars"},
			WhySaved:      "Imported from GitHub Stars",
			SourceChannel: "import",
			Meta:          captureMetaHints(nil, starURL, items.TypeRepo),
		}
		if norm != "" {
			input.URLNormalized = &norm
		}

		item, err := h.store.CreateItem(r.Context(), input)
		if err != nil {
			skipped++
			continue
		}

		// The starred response already carries the metadata the enricher
		// would fetch, so fill it directly instead of enqueueing hundreds
		// of per-repo enrichment calls.
		md := &repos.Metadata{
			Description: star.Description,
			Language:    star.Language,
			Stars:       star.Stars,
			Forks:       star.Forks,
			Topics:      star.Topics,
		}
		if star.Owner.AvatarURL != "" {
			avatar := star.Owner.AvatarURL
			md.AvatarURL = &avatar
		}
		_ = h.store.UpdateItemMetadata(r.Context(), item.ID, md)

		imported++
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"username": username,
		"total":    len(stars),
		"imported": imported,
		"skipped":  skipped,
	})
}
