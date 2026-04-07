package repos

import (
	"time"

	"github.com/google/uuid"
)

// Repo is the domain entity. JSON tags drive the API contract.
type Repo struct {
	ID            uuid.UUID  `json:"id"`
	URL           string     `json:"url"`
	Source        string     `json:"source"`
	Owner         *string    `json:"owner"`
	Name          string     `json:"name"`
	Description   *string    `json:"description"`
	Language      *string    `json:"language"`
	LanguageColor *string    `json:"language_color"`
	Stars         int        `json:"stars"`
	Forks         int        `json:"forks"`
	AvatarURL     *string    `json:"avatar_url"`
	OGImageURL    *string    `json:"og_image_url"`
	Homepage      *string    `json:"homepage"`
	Topics        []string   `json:"topics"`
	Notes         string     `json:"notes"`
	Tags          []string   `json:"tags"`
	Archived      bool       `json:"archived"`
	AddedAt       time.Time  `json:"added_at"`
	LastFetchedAt *time.Time `json:"last_fetched_at"`
	LastSeenAt    *time.Time `json:"last_seen_at"`
}

// CreateInput is the body of POST /api/repos.
// In Wave 1, the enricher is not implemented yet, so the store derives
// `name` and `owner` from the URL itself.
type CreateInput struct {
	URL   string   `json:"url"`
	Tags  []string `json:"tags"`
	Notes string   `json:"notes"`
}

// UpdateInput is the body of PATCH /api/repos/:id.
// All fields are optional; nil = unchanged.
type UpdateInput struct {
	Notes    *string  `json:"notes"`
	Tags     []string `json:"tags"`
	Archived *bool    `json:"archived"`
}

// ListParams drives GET /api/repos query.
type ListParams struct {
	Q        string
	Lang     string
	Tag      string
	Archived *bool
	Sort     string
	Limit    int
	Offset   int
}

// ListResult is the paginated response.
type ListResult struct {
	Total int     `json:"total"`
	Items []*Repo `json:"items"`
}

// Metadata is what the enricher returns and what UpdateMetadata persists.
// It lives in the domain package so both `enricher` and `store` can import
// it without creating an import cycle.
type Metadata struct {
	Description   *string
	Language      *string
	LanguageColor *string
	Stars         int
	Forks         int
	AvatarURL     *string
	OGImageURL    *string
	Homepage      *string
	Topics        []string
}
