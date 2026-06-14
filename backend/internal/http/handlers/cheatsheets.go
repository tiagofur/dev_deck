package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"devdeck/internal/ai"
	"devdeck/internal/authctx"
	"devdeck/internal/domain/cheatsheets"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CheatsheetsHandler struct {
	store      *store.Store
	embeddings *ai.EmbeddingsService
}

func NewCheatsheetsHandler(s *store.Store, emb *ai.EmbeddingsService) *CheatsheetsHandler {
	return &CheatsheetsHandler{store: s, embeddings: emb}
}

// GET /api/cheatsheets
func (h *CheatsheetsHandler) List(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	out, err := h.store.ListCheatsheets(r.Context(), category)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if out == nil {
		out = []*cheatsheets.Cheatsheet{}
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/cheatsheets
func (h *CheatsheetsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var in cheatsheets.CreateCheatsheetInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.Slug == "" || in.Title == "" || in.Category == "" {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_INPUT", "slug, title and category are required")
		return
	}
	c, err := h.store.CreateCheatsheet(r.Context(), in)
	if err != nil {
		if errors.Is(err, store.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "SLUG_EXISTS", "a cheatsheet with this slug already exists")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

// GET /api/cheatsheets/{id}
func (h *CheatsheetsHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	detail, err := h.store.GetCheatsheetDetail(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CHEATSHEET_NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

// PATCH /api/cheatsheets/{id}
func (h *CheatsheetsHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	var in cheatsheets.UpdateCheatsheetInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	c, err := h.store.UpdateCheatsheet(r.Context(), id, in)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CHEATSHEET_NOT_FOUND", "cheatsheet not found")
			return
		}
		if errors.Is(err, store.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "SLUG_EXISTS", "a cheatsheet with this slug already exists")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

// DELETE /api/cheatsheets/{id}
func (h *CheatsheetsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteCheatsheet(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CHEATSHEET_NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ───── Discovery & Social ─────

// GET /api/cheatsheets/explore
func (h *CheatsheetsHandler) Explore(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	officialOnly := r.URL.Query().Get("official") == "true"

	out, err := h.store.ExploreCheatsheets(r.Context(), category, officialOnly)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if out == nil {
		out = []*cheatsheets.Cheatsheet{}
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/cheatsheets/{id}/fork
func (h *CheatsheetsHandler) Fork(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	forked, err := h.store.ForkCheatsheet(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CHEATSHEET_NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, forked)
}

// POST /api/cheatsheets/{id}/star
func (h *CheatsheetsHandler) Star(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	if err := h.store.StarCheatsheet(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CHEATSHEET_NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ───── Entries ─────

// GET /api/cheatsheets/{id}/entries
func (h *CheatsheetsHandler) ListEntries(w http.ResponseWriter, r *http.Request) {
	cheatID, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	entries, err := h.store.ListEntriesByCheatsheet(r.Context(), cheatID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if entries == nil {
		entries = []cheatsheets.Entry{}
	}
	writeJSON(w, http.StatusOK, entries)
}

// POST /api/cheatsheets/{id}/entries
func (h *CheatsheetsHandler) CreateEntry(w http.ResponseWriter, r *http.Request) {
	cheatID, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	var in cheatsheets.CreateEntryInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.Label == "" || in.Command == "" {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_INPUT", "label and command are required")
		return
	}
	// Verify parent exists.
	if _, err := h.store.GetCheatsheet(r.Context(), cheatID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CHEATSHEET_NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}
	e, err := h.store.CreateEntry(r.Context(), cheatID, in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

// PATCH /api/cheatsheets/{id}/entries/{entryId}
func (h *CheatsheetsHandler) UpdateEntry(w http.ResponseWriter, r *http.Request) {
	entryID, ok := parseEntryID(w, r)
	if !ok {
		return
	}
	var in cheatsheets.UpdateEntryInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	e, err := h.store.UpdateEntry(r.Context(), entryID, in)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ENTRY_NOT_FOUND", "entry not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

// DELETE /api/cheatsheets/{id}/entries/{entryId}
func (h *CheatsheetsHandler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
	entryID, ok := parseEntryID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteEntry(r.Context(), entryID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ENTRY_NOT_FOUND", "entry not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ───── Search ─────

// GET /api/search?q=...&limit=...&mode=text|semantic|hybrid
func (h *CheatsheetsHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeError(w, http.StatusBadRequest, "MISSING_QUERY", "q parameter is required")
		return
	}
	limit := 20
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}

	mode := store.SearchMode(r.URL.Query().Get("mode"))
	if mode == "" {
		mode = store.SearchModeText
	}

	if _, ok := authctx.UserID(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var embedding []float32
	if (mode == store.SearchModeVector || mode == store.SearchModeHybrid) && h.embeddings != nil && h.embeddings.Enabled() {
		emb, err := h.embeddings.EmbedSearch(r.Context(), q)
		if err != nil {
			// Log error but fallback to text search if hybrid, or fail if semantic-only
			if mode == store.SearchModeVector {
				writeError(w, http.StatusInternalServerError, "EMBEDDING_ERROR", "failed to generate search embedding")
				return
			}
			mode = store.SearchModeText
		} else {
			embedding = emb
		}
	}

	results, err := h.store.Search(r.Context(), mode, q, embedding, limit)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if results == nil {
		results = []store.SearchResult{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"query":   q,
		"mode":    mode,
		"results": results,
	})
}

// GET /api/cheatsheets/{id}/export?format=json|md
func (h *CheatsheetsHandler) Export(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "md"
	}

	detail, err := h.store.GetCheatsheetDetail(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}

	if format == "json" {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.json\"", detail.Slug))
		_ = json.NewEncoder(w).Encode(detail)
		return
	}

	// Default to markdown
	var sb strings.Builder
	fmt.Fprintf(&sb, "# %s\n\n", detail.Title)
	if detail.Description != "" {
		sb.WriteString(detail.Description + "\n\n")
	}
	for _, e := range detail.Entries {
		fmt.Fprintf(&sb, "## %s\n", e.Label)
		if e.Description != "" {
			sb.WriteString(e.Description + "\n\n")
		}
		fmt.Fprintf(&sb, "```bash\n%s\n```\n\n", e.Command)
	}

	w.Header().Set("Content-Type", "text/markdown")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.md\"", detail.Slug))
	_, _ = w.Write([]byte(sb.String()))
}

// GET /api/cheatsheets/{id}/badge
func (h *CheatsheetsHandler) Badge(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	c, err := h.store.GetCheatsheet(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}

	label := url.QueryEscape("DevDeck Cheatsheet")
	title := url.QueryEscape(c.Title)
	color := "blue"
	if c.Color != nil && *c.Color != "" {
		color = strings.TrimPrefix(*c.Color, "#")
	}

	badgeURL := fmt.Sprintf("https://img.shields.io/badge/%s-%s-%s?logo=book", label, title, color)
	// #nosec G710 -- redirect target is a fixed img.shields.io URL; user data is URL-escaped into path components only.
	http.Redirect(w, r, badgeURL, http.StatusFound)
}

// GET /api/cheatsheets/{id}/card.svg
func (h *CheatsheetsHandler) Card(w http.ResponseWriter, r *http.Request) {
	id, ok := parseCheatsheetID(w, r)
	if !ok {
		return
	}
	detail, err := h.store.GetCheatsheetDetail(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}

	// Generate a simple SVG card
	svg := fmt.Sprintf(`
<svg width="600" height="315" viewBox="0 0 600 315" xmlns="http://www.w3.org/2000/svg">
	<rect width="600" height="315" fill="#F0F0F0" />
	<rect x="20" y="20" width="560" height="275" fill="white" stroke="#1A1A1A" stroke-width="3" />
	<rect x="30" y="30" width="560" height="275" fill="#1A1A1A" opacity="0.1" />
	
	<text x="50" y="80" font-family="sans-serif" font-size="32" font-weight="bold" fill="#1A1A1A">%s</text>
	<text x="50" y="120" font-family="monospace" font-size="16" fill="#666666">%s</text>
	
	<text x="50" y="250" font-family="sans-serif" font-size="18" fill="#1A1A1A">%d Commands</text>
	<text x="50" y="280" font-family="sans-serif" font-size="14" font-weight="bold" fill="#FFD700">DEVDECK VAULT</text>
</svg>
	`, html.EscapeString(detail.Title), html.EscapeString(detail.Category), len(detail.Entries))

	w.Header().Set("Content-Type", "image/svg+xml")
	// #nosec G705 -- all dynamic values are escaped via html.EscapeString before being embedded in the SVG.
	_, _ = w.Write([]byte(svg))
}

// ───── helpers ─────

func parseCheatsheetID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "id")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}

func parseEntryID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "entryId")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "entry id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}
