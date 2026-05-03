package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"devdeck/internal/domain/cheatsheets"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CheatsheetsHandler struct {
	store *store.Store
}

func NewCheatsheetsHandler(s *store.Store) *CheatsheetsHandler {
	return &CheatsheetsHandler{store: s}
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

// GET /api/search?q=...&limit=...
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
	results, err := h.store.Search(r.Context(), q, limit)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if results == nil {
		results = []store.SearchResult{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"query":   q,
		"results": results,
	})
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
