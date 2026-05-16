package auth

import (
	"time"

	"github.com/google/uuid"
)

type Organization struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type OrgMember struct {
	OrgID     uuid.UUID `json:"org_id"`
	UserID    uuid.UUID `json:"user_id"`
	Role      string    `json:"role"` // owner, admin, editor, viewer
	CreatedAt time.Time `json:"created_at"`
}
