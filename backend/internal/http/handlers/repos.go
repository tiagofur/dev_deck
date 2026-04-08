package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"devdeck/internal/domain/cheatsheets"
	"devdeck/internal/domain/repos"
	"devdeck/internal/enricher"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ReposHandler struct {
	store    *store.Store
	enricher *enricher.Service
}

func NewReposHandler(s *store.Store, e *enricher.Service) *ReposHandler {
	return &ReposHandler{store: s, enricher: e}
}

// POST /api/repos
//
// Wave 2: after the basic insert we synchronously call the enricher and
// merge the result with UpdateMetadata. Enrichment is best-effort — if it
// fails we still return the basic repo so the user never gets a 500 just
// because GitHub is having a bad day.
func (h *ReposHandler) Create(w http.ResponseWriter, r *http.Request) {
	var in repos.CreateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.URL == "" {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_URL", "url is required")
		return
	}

	repo, err := h.store.CreateRepo(r.Context(), in)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrAlreadyExists):
			writeError(w, http.StatusConflict, "REPO_ALREADY_EXISTS", "this URL is already in your vault")
		default:
			if err.Error() == "invalid url" || err.Error() == "could not derive name from url" {
				writeError(w, http.StatusUnprocessableEntity, "INVALID_URL", err.Error())
				return
			}
			writeInternal(w, err)
		}
		return
	}

	// Best-effort enrichment
	if h.enricher != nil {
		if md, err := h.enricher.Enrich(r.Context(), repo.URL); err != nil {
			slog.Warn("create: enrich failed (continuing)", "err", err, "url", repo.URL)
		} else if updated, err := h.store.UpdateMetadata(r.Context(), repo.ID, md); err != nil {
			slog.Warn("create: update metadata failed", "err", err, "url", repo.URL)
		} else {
			repo = updated
		}
	}

	writeJSON(w, http.StatusCreated, repo)
}

// GET /api/repos
func (h *ReposHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := repos.ListParams{
		Q:    q.Get("q"),
		Lang: q.Get("lang"),
		Tag:  q.Get("tag"),
		Sort: q.Get("sort"),
	}
	if v := q.Get("archived"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			p.Archived = &b
		}
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			p.Limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			p.Offset = n
		}
	}

	res, err := h.store.ListRepos(r.Context(), p)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// GET /api/repos/{id}
func (h *ReposHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	repo, err := h.store.GetRepo(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, repo)
}

// PATCH /api/repos/{id}
func (h *ReposHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var in repos.UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	repo, err := h.store.UpdateRepo(r.Context(), id, in)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, repo)
}

// DELETE /api/repos/{id}
func (h *ReposHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteRepo(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/repos/{id}/readme
//
// Returns the markdown source of the repo's README. Only available for
// github.com repos (other sources return 404).
func (h *ReposHandler) Readme(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if h.enricher == nil {
		writeError(w, http.StatusServiceUnavailable, "ENRICHER_DISABLED", "enricher not configured")
		return
	}
	repo, err := h.store.GetRepo(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	md, err := h.enricher.GetReadme(r.Context(), repo.URL)
	if err != nil {
		// Both "no readme" and "non-github source" map to 404 here.
		writeError(w, http.StatusNotFound, "README_NOT_FOUND", "no README available for this repo")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"format":  "markdown",
		"content": md,
	})
}

// GET /api/repos/{id}/package-scripts
//
// Fetches package.json from the repo's GitHub Contents API and returns the
// "scripts" entries as suggestions. Only available for github.com repos.
func (h *ReposHandler) PackageScripts(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if h.enricher == nil {
		writeError(w, http.StatusServiceUnavailable, "ENRICHER_DISABLED", "enricher not configured")
		return
	}
	repo, err := h.store.GetRepo(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	scripts, err := h.enricher.GetPackageScripts(r.Context(), repo.URL)
	if err != nil {
		// "no package.json" or "non-github source" → 404
		writeError(w, http.StatusNotFound, "PACKAGE_JSON_NOT_FOUND", "no package.json found for this repo")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"scripts": scripts,
	})
}

// POST /api/repos/{id}/seen
//
// Marks the repo as just seen by the user (sets last_seen_at = NOW()).
// Used by discovery mode after each swipe so we can rotate cards.
func (h *ReposHandler) MarkSeen(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := h.store.MarkSeen(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/repos/{id}/refresh
//
// Re-fetches metadata from the source and persists it. Unlike Create,
// here enrich failures DO surface as 422 — the user explicitly asked.
func (h *ReposHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if h.enricher == nil {
		writeError(w, http.StatusServiceUnavailable, "ENRICHER_DISABLED", "enricher not configured")
		return
	}
	repo, err := h.store.GetRepo(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	md, err := h.enricher.Enrich(r.Context(), repo.URL)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "ENRICH_FAILED", err.Error())
		return
	}
	updated, err := h.store.UpdateMetadata(r.Context(), id, md)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// ─── Wave 3: Repo ↔ Cheatsheet linking ───

// GET /api/repos/{id}/cheatsheets
func (h *ReposHandler) ListLinkedCheatsheets(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	out, err := h.store.ListCheatsheetsByRepo(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	if out == nil {
		out = []*cheatsheets.Cheatsheet{}
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/repos/{id}/cheatsheets/{cheatsheetId}
func (h *ReposHandler) LinkCheatsheet(w http.ResponseWriter, r *http.Request) {
	repoID, ok := parseID(w, r)
	if !ok {
		return
	}
	cheatID, ok := parseCheatsheetIDFromPath(w, r)
	if !ok {
		return
	}
	// Verify both exist.
	if _, err := h.store.GetRepo(r.Context(), repoID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	if _, err := h.store.GetCheatsheet(r.Context(), cheatID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "CHEATSHEET_NOT_FOUND", "cheatsheet not found")
			return
		}
		writeInternal(w, err)
		return
	}
	if err := h.store.LinkCheatsheet(r.Context(), repoID, cheatID); err != nil {
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/repos/{id}/cheatsheets/{cheatsheetId}
func (h *ReposHandler) UnlinkCheatsheet(w http.ResponseWriter, r *http.Request) {
	repoID, ok := parseID(w, r)
	if !ok {
		return
	}
	cheatID, ok := parseCheatsheetIDFromPath(w, r)
	if !ok {
		return
	}
	if err := h.store.UnlinkCheatsheet(r.Context(), repoID, cheatID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "LINK_NOT_FOUND", "link not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ───────── helpers ─────────

func parseID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "id")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}

func parseCheatsheetIDFromPath(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "cheatsheetId")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "cheatsheet id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}
