package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"devdeck/internal/domain/commands"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CommandsHandler struct {
	store *store.Store
}

func NewCommandsHandler(s *store.Store) *CommandsHandler {
	return &CommandsHandler{store: s}
}

// GET /api/repos/{id}/commands
func (h *CommandsHandler) List(w http.ResponseWriter, r *http.Request) {
	repoID, ok := parseRepoID(w, r)
	if !ok {
		return
	}
	cmds, err := h.store.ListCommandsByRepo(r.Context(), repoID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cmds)
}

// POST /api/repos/{id}/commands
func (h *CommandsHandler) Create(w http.ResponseWriter, r *http.Request) {
	repoID, ok := parseRepoID(w, r)
	if !ok {
		return
	}
	var in commands.CreateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if in.Label == "" || in.Command == "" {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_INPUT", "label and command are required")
		return
	}
	// Make sure the parent repo exists — gives a nicer error than a FK violation.
	if _, err := h.store.GetRepo(r.Context(), repoID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	cmd, err := h.store.CreateCommand(r.Context(), repoID, in)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, cmd)
}

// PATCH /api/repos/{id}/commands/{cmdId}
func (h *CommandsHandler) Update(w http.ResponseWriter, r *http.Request) {
	cmdID, ok := parseCommandID(w, r)
	if !ok {
		return
	}
	var in commands.UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	cmd, err := h.store.UpdateCommand(r.Context(), cmdID, in)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "COMMAND_NOT_FOUND", "command not found")
			return
		}
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cmd)
}

// POST /api/repos/{id}/commands/batch
//
// Body: { "commands": [{ "label": "...", "command": "...", ... }, ...] }
// Creates multiple commands in a single transaction. Returns the created list.
func (h *CommandsHandler) BatchCreate(w http.ResponseWriter, r *http.Request) {
	repoID, ok := parseRepoID(w, r)
	if !ok {
		return
	}
	var body struct {
		Commands []commands.CreateInput `json:"commands"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if len(body.Commands) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_INPUT", "commands array must not be empty")
		return
	}
	for _, c := range body.Commands {
		if c.Label == "" || c.Command == "" {
			writeError(w, http.StatusUnprocessableEntity, "INVALID_INPUT", "each command must have label and command")
			return
		}
	}
	// Verify parent repo exists.
	if _, err := h.store.GetRepo(r.Context(), repoID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "REPO_NOT_FOUND", "repo not found")
			return
		}
		writeInternal(w, err)
		return
	}
	created, err := h.store.BatchCreateCommands(r.Context(), repoID, body.Commands)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

// DELETE /api/repos/{id}/commands/{cmdId}
func (h *CommandsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	cmdID, ok := parseCommandID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteCommand(r.Context(), cmdID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "COMMAND_NOT_FOUND", "command not found")
			return
		}
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/repos/{id}/commands/reorder
//
// Body: { "order": ["uuid1", "uuid2", ...] }
func (h *CommandsHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	repoID, ok := parseRepoID(w, r)
	if !ok {
		return
	}
	var body struct {
		Order []uuid.UUID `json:"order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if err := h.store.ReorderCommands(r.Context(), repoID, body.Order); err != nil {
		writeInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ───────── helpers ─────────

func parseRepoID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "id")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "repo id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}

func parseCommandID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	raw := chi.URLParam(r, "cmdId")
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "command id must be a uuid")
		return uuid.Nil, false
	}
	return id, true
}
