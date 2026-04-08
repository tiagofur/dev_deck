// Package items holds the domain types for the polymorphic Item entity
// introduced in Wave 4.5 §16.9 via POST /api/items/capture. See
// docs/adr/0001-items-polymorphism.md for the full rationale.
//
// An Item is any piece of knowledge the user wants to remember: a repo,
// a CLI, a keyboard shortcut, an article, a snippet, a prompt, etc.
// Common fields live as first-class columns; type-specific metadata
// lives in the JSONB `Meta` map so adding a new type doesn't require a
// DDL migration.
package items

import (
	"time"

	"github.com/google/uuid"
)

// Type enumerates the supported item kinds. Mirrors the CHECK constraint
// in migrations/0005_items.sql.
type Type string

const (
	TypeRepo     Type = "repo"
	TypeCLI      Type = "cli"
	TypePlugin   Type = "plugin"
	TypeShortcut Type = "shortcut"
	TypeSnippet  Type = "snippet"
	TypeAgent    Type = "agent"
	TypePrompt   Type = "prompt"
	TypeArticle  Type = "article"
	TypeTool     Type = "tool"
	TypeWorkflow Type = "workflow"
	TypeNote     Type = "note"
)

// AllTypes is the canonical list of types for validation and tests.
var AllTypes = []Type{
	TypeRepo, TypeCLI, TypePlugin, TypeShortcut, TypeSnippet,
	TypeAgent, TypePrompt, TypeArticle, TypeTool, TypeWorkflow, TypeNote,
}

// IsValid returns true if s matches a known Type.
func IsValid(s string) bool {
	for _, t := range AllTypes {
		if string(t) == s {
			return true
		}
	}
	return false
}

// EnrichmentStatus tracks async enrichment progress for the capture flow.
type EnrichmentStatus string

const (
	EnrichmentPending EnrichmentStatus = "pending"
	EnrichmentQueued  EnrichmentStatus = "queued"
	EnrichmentOK      EnrichmentStatus = "ok"
	EnrichmentError   EnrichmentStatus = "error"
	EnrichmentSkipped EnrichmentStatus = "skipped"
)

// Item is the domain entity returned by /api/items/capture and the
// upcoming /api/items list endpoint in Ola 5. JSON tags drive the API
// contract and mirror what the desktop/web clients deserialize.
type Item struct {
	ID               uuid.UUID              `json:"id"`
	Type             Type                   `json:"item_type"`
	Title            string                 `json:"title"`
	URL              *string                `json:"url"`
	URLNormalized    *string                `json:"url_normalized"`
	Description      *string                `json:"description"`
	Notes            string                 `json:"notes"`
	Tags             []string               `json:"tags"`
	WhySaved         string                 `json:"why_saved"`
	WhenToUse        string                 `json:"when_to_use"`
	SourceChannel    string                 `json:"source_channel"`
	Meta             map[string]any         `json:"meta"`
	AISummary        string                 `json:"ai_summary"`
	AITags           []string               `json:"ai_tags"`
	EnrichmentStatus EnrichmentStatus       `json:"enrichment_status"`
	Archived         bool                   `json:"archived"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	LastSeenAt       *time.Time             `json:"last_seen_at"`
}

// UpdateInput is the PATCH /api/items/:id body. All fields are
// optional; nil / unset = unchanged. Mirrors the "edit the item you
// just saved" flow in the desktop detail view.
type UpdateInput struct {
	Title       *string  `json:"title"`
	Notes       *string  `json:"notes"`
	Tags        []string `json:"tags"`
	WhySaved    *string  `json:"why_saved"`
	WhenToUse   *string  `json:"when_to_use"`
	Archived    *bool    `json:"archived"`
	// ItemType lets the user reclassify an item (e.g. a snippet that
	// was mis-detected as a note). It's optional and validated against
	// IsValid before hitting the store.
	ItemType *string `json:"item_type"`
}

// ListParams drives GET /api/items. All filters are additive.
type ListParams struct {
	// Type narrows to a single item_type. Empty = all types.
	Type string
	// Tag narrows to items that contain the given tag.
	Tag string
	// Q is a fuzzy text filter over title + description + tags.
	Q string
	// Archived: nil = hide archived (default), true = archived only,
	// false = active only. Mirrors the repos list semantics.
	Archived *bool
	// Sort order. Accepts "added_desc" (default), "added_asc",
	// "updated_desc", "title_asc".
	Sort string
	// Limit caps the number of rows returned (1..500; default 100).
	Limit int
	// Offset for pagination.
	Offset int
}

// ListResult is the paginated response for GET /api/items.
type ListResult struct {
	Total int     `json:"total"`
	Items []*Item `json:"items"`
}

// CaptureInput is the POST /api/items/capture body. All fields are
// optional except that either url or text must be present — the
// handler enforces that and returns 422 otherwise.
type CaptureInput struct {
	Source      string         `json:"source"`
	ClientID    string         `json:"client_id"`
	OperationID string         `json:"operation_id"`
	URL         string         `json:"url"`
	Text        string         `json:"text"`
	Selection   string         `json:"selection"`
	TitleHint   string         `json:"title_hint"`
	TypeHint    string         `json:"type_hint"`
	Tags        []string       `json:"tags"`
	WhySaved    string         `json:"why_saved"`
	MetaHints   map[string]any `json:"meta_hints"`
}

// CaptureResponse is what the handler returns after a successful save
// or a deduped match. See docs/CAPTURE.md §Endpoint unificado.
type CaptureResponse struct {
	Item             *Item            `json:"item"`
	EnrichmentStatus EnrichmentStatus `json:"enrichment_status"`
	DuplicateOf      *uuid.UUID       `json:"duplicate_of"`
}
