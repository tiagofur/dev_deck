package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"devdeck/internal/authctx"
	"devdeck/internal/domain/cheatsheets"
	"devdeck/internal/domain/commands"
	"devdeck/internal/domain/items"
	"devdeck/internal/store"
)

// VaultExportHandler produces a full export of the user's vault.
// Local-first trust: the vault must always have an exit door.
type VaultExportHandler struct {
	store *store.Store
}

func NewVaultExportHandler(s *store.Store) *VaultExportHandler {
	return &VaultExportHandler{store: s}
}

type exportItem struct {
	*items.Item
	Commands []*commands.Command `json:"commands,omitempty"`
}

type exportCheatsheet struct {
	*cheatsheets.Cheatsheet
	Entries []cheatsheets.Entry `json:"entries"`
}

type vaultExport struct {
	ExportedAt  time.Time               `json:"exported_at"`
	Version     string                  `json:"version"`
	Items       []exportItem            `json:"items"`
	Runbooks    []store.RunbookWithItem `json:"runbooks"`
	Cheatsheets []exportCheatsheet      `json:"cheatsheets"`
}

const exportPageSize = 500

// GET /api/export/vault?format=json|markdown
func (h *VaultExportHandler) Export(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "json"
	}
	if format != "json" && format != "markdown" {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_FORMAT", "format must be json or markdown")
		return
	}

	export := vaultExport{
		ExportedAt: time.Now().UTC(),
		Version:    "1",
	}

	// Items: active first, then archived, in stable insertion order.
	archived := true
	for _, archFilter := range []*bool{nil, &archived} {
		offset := 0
		for {
			page, err := h.store.ListItems(r.Context(), items.ListParams{
				Limit:    exportPageSize,
				Offset:   offset,
				Sort:     "added_asc",
				Archived: archFilter,
			})
			if err != nil {
				writeInternal(w, err)
				return
			}
			for _, it := range page.Items {
				exp := exportItem{Item: it}
				if it.Type == items.TypeRepo {
					if cmds, err := h.store.ListCommandsByRepo(r.Context(), it.ID); err == nil && len(cmds) > 0 {
						exp.Commands = cmds
					}
				}
				export.Items = append(export.Items, exp)
			}
			if len(page.Items) < exportPageSize {
				break
			}
			offset += exportPageSize
		}
	}

	runbooks, err := h.store.ListRunbooksByUser(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	export.Runbooks = runbooks

	sheets, err := h.store.ListCheatsheets(r.Context(), "")
	if err != nil {
		writeInternal(w, err)
		return
	}
	for _, cs := range sheets {
		entries, err := h.store.ListEntriesByCheatsheet(r.Context(), cs.ID)
		if err != nil {
			writeInternal(w, err)
			return
		}
		if entries == nil {
			entries = []cheatsheets.Entry{}
		}
		export.Cheatsheets = append(export.Cheatsheets, exportCheatsheet{Cheatsheet: cs, Entries: entries})
	}

	date := export.ExportedAt.Format("2006-01-02")
	if format == "json" {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="devdeck-vault-%s.json"`, date))
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		_ = enc.Encode(export)
		return
	}

	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="devdeck-vault-%s.md"`, date))
	_, _ = w.Write([]byte(renderVaultMarkdown(export)))
}

// renderVaultMarkdown produces a human-readable single-document export.
// The JSON format is the full-fidelity one; this is for reading and grepping.
func renderVaultMarkdown(export vaultExport) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# DevDeck vault export — %s\n\n", export.ExportedAt.Format("2006-01-02"))

	fmt.Fprintf(&b, "## Items (%d)\n\n", len(export.Items))
	for _, it := range export.Items {
		title := it.Title
		if title == "" {
			title = "(untitled)"
		}
		fmt.Fprintf(&b, "### %s `%s`\n\n", title, it.Type)
		if it.URL != nil && *it.URL != "" {
			fmt.Fprintf(&b, "- URL: %s\n", *it.URL)
		}
		if it.Description != nil && *it.Description != "" {
			fmt.Fprintf(&b, "- Description: %s\n", *it.Description)
		}
		if len(it.Tags) > 0 {
			fmt.Fprintf(&b, "- Tags: %s\n", strings.Join(it.Tags, ", "))
		}
		if it.WhySaved != "" {
			fmt.Fprintf(&b, "- Why saved: %s\n", it.WhySaved)
		}
		if it.Archived {
			b.WriteString("- Archived: yes\n")
		}
		if it.Notes != "" {
			fmt.Fprintf(&b, "\n%s\n", it.Notes)
		}
		if len(it.Commands) > 0 {
			b.WriteString("\nCommands:\n\n```sh\n")
			for _, cmd := range it.Commands {
				if cmd.Label != "" {
					fmt.Fprintf(&b, "# %s\n", cmd.Label)
				}
				fmt.Fprintf(&b, "%s\n", cmd.Command)
			}
			b.WriteString("```\n")
		}
		b.WriteString("\n")
	}

	fmt.Fprintf(&b, "## Runbooks (%d)\n\n", len(export.Runbooks))
	for _, rb := range export.Runbooks {
		fmt.Fprintf(&b, "### %s (item: %s)\n\n", rb.Title, rb.ItemTitle)
		if rb.Description != nil && *rb.Description != "" {
			fmt.Fprintf(&b, "%s\n\n", *rb.Description)
		}
		for i, step := range rb.Steps {
			fmt.Fprintf(&b, "%d. %s", i+1, step.Label)
			if step.Command != nil && *step.Command != "" {
				fmt.Fprintf(&b, " — `%s`", *step.Command)
			}
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	fmt.Fprintf(&b, "## Cheatsheets (%d)\n\n", len(export.Cheatsheets))
	for _, cs := range export.Cheatsheets {
		fmt.Fprintf(&b, "### %s `%s`\n\n", cs.Title, cs.Category)
		for _, entry := range cs.Entries {
			fmt.Fprintf(&b, "- **%s**", entry.Label)
			if entry.Command != "" {
				fmt.Fprintf(&b, ": `%s`", entry.Command)
			}
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	return b.String()
}
