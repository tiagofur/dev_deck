// Package cheatsheets holds the global cheatsheet entity.
//
// A cheatsheet is a themed collection of commands (e.g. "git", "docker",
// "npm") that the user can browse, search, and link to repos.
package cheatsheets

import (
	"time"

	"github.com/google/uuid"
)

// Category enumerates the allowed cheatsheet categories.
type Category string

const (
	CatVCS            Category = "vcs"
	CatOS             Category = "os"
	CatLanguage       Category = "language"
	CatFramework      Category = "framework"
	CatTool           Category = "tool"
	CatPackageManager Category = "package-manager"
	CatEditor         Category = "editor"
	CatShell          Category = "shell"
	CatCloud          Category = "cloud"
	CatOther          Category = "other"
)

// Cheatsheet is the top-level entity.
type Cheatsheet struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Category    string    `json:"category"`
	Icon        *string   `json:"icon"`
	Color       *string   `json:"color"`
	Description string    `json:"description"`
	IsSeed      bool      `json:"is_seed"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CheatsheetDetail is a cheatsheet with its entries loaded.
type CheatsheetDetail struct {
	Cheatsheet
	Entries []Entry `json:"entries"`
}

// Entry is a single command within a cheatsheet.
type Entry struct {
	ID           uuid.UUID `json:"id"`
	CheatsheetID uuid.UUID `json:"cheatsheet_id"`
	Label        string    `json:"label"`
	Command      string    `json:"command"`
	Description  string    `json:"description"`
	Tags         []string  `json:"tags"`
	Position     int       `json:"position"`
}

// CreateCheatsheetInput is the body of POST /api/cheatsheets.
type CreateCheatsheetInput struct {
	Slug        string  `json:"slug"`
	Title       string  `json:"title"`
	Category    string  `json:"category"`
	Icon        *string `json:"icon"`
	Color       *string `json:"color"`
	Description string  `json:"description"`
}

// UpdateCheatsheetInput is the body of PATCH /api/cheatsheets/:id.
// All fields optional; nil = unchanged.
type UpdateCheatsheetInput struct {
	Slug        *string `json:"slug"`
	Title       *string `json:"title"`
	Category    *string `json:"category"`
	Icon        *string `json:"icon"`
	Color       *string `json:"color"`
	Description *string `json:"description"`
}

// CreateEntryInput is the body of POST /api/cheatsheets/:id/entries.
type CreateEntryInput struct {
	Label       string   `json:"label"`
	Command     string   `json:"command"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
}

// UpdateEntryInput is the body of PATCH /api/cheatsheets/:id/entries/:entryId.
// All fields optional; nil/empty = unchanged.
type UpdateEntryInput struct {
	Label       *string  `json:"label"`
	Command     *string  `json:"command"`
	Description *string  `json:"description"`
	Tags        []string `json:"tags"`
}

// SeedCheatsheet is the JSON format for seed data files.
type SeedCheatsheet struct {
	Slug        string      `json:"slug"`
	Title       string      `json:"title"`
	Category    string      `json:"category"`
	Icon        string      `json:"icon"`
	Color       string      `json:"color"`
	Description string      `json:"description"`
	Entries     []SeedEntry `json:"entries"`
}

// SeedEntry is a single command entry within a seed file.
type SeedEntry struct {
	Label       string   `json:"label"`
	Command     string   `json:"command"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
}
