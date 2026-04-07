// Package commands holds the per-repo "quick command" entity.
//
// A command is a label + a shell string the user wants to remember
// for a specific repo (e.g. {label: "Dev server", command: "pnpm dev"}).
package commands

import (
	"time"

	"github.com/google/uuid"
)

type Command struct {
	ID          uuid.UUID `json:"id"`
	RepoID      uuid.UUID `json:"repo_id"`
	Label       string    `json:"label"`
	Command     string    `json:"command"`
	Description string    `json:"description"`
	Category    *string   `json:"category"`
	Position    int       `json:"position"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateInput is the body of POST /api/repos/:id/commands.
type CreateInput struct {
	Label       string  `json:"label"`
	Command     string  `json:"command"`
	Description string  `json:"description"`
	Category    *string `json:"category"`
}

// UpdateInput is the body of PATCH /api/repos/:id/commands/:cmdId.
// All fields optional; nil = unchanged.
type UpdateInput struct {
	Label       *string `json:"label"`
	Command     *string `json:"command"`
	Description *string `json:"description"`
	Category    *string `json:"category"`
}
