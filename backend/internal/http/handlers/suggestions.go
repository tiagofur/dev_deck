package handlers

import (
	"context"
	"net/http"

	"devdeck/internal/store"
)

type SuggestionsHandler struct {
	store *store.Store
}

func NewSuggestionsHandler(s *store.Store) *SuggestionsHandler {
	return &SuggestionsHandler{store: s}
}

// GET /api/suggestions/commands?q=...
func (h *SuggestionsHandler) Commands(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusOK, []any{})
		return
	}

	results, err := h.getCommandSuggestions(r.Context(), q)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, results)
}

type CommandSuggestion struct {
	Label       string   `json:"label"`
	Command     string   `json:"command"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	UsageCount  int      `json:"usage_count"`
}

func (h *SuggestionsHandler) getCommandSuggestions(ctx context.Context, query string) ([]CommandSuggestion, error) {
	// This uses a global query across ALL cheatsheet entries to find common labels/descriptions for a command.
	// It's "collaborative" because it learns from what everyone else is writing.
	q := `
		SELECT label, command, description, tags, COUNT(*) as usage_count
		FROM cheatsheet_entries
		WHERE command ILIKE $1 OR label ILIKE $1
		GROUP BY label, command, description, tags
		ORDER BY usage_count DESC
		LIMIT 5
	`
	rows, err := h.store.Pool().Query(ctx, q, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []CommandSuggestion{}
	for rows.Next() {
		var s CommandSuggestion
		if err := rows.Scan(&s.Label, &s.Command, &s.Description, &s.Tags, &s.UsageCount); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}
