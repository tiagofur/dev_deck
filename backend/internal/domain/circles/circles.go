package circles

import (
	"time"

	"github.com/google/uuid"
)

type Circle struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	InviteCode  string    `json:"invite_code"`
	CreatedBy   uuid.UUID `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CircleMember struct {
	CircleID  uuid.UUID `json:"circle_id"`
	UserID    uuid.UUID `json:"user_id"`
	Role      string    `json:"role"` // owner, admin, member
	CreatedAt time.Time `json:"created_at"`
}

type CircleMemberDetail struct {
	UserID      uuid.UUID `json:"user_id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   string    `json:"avatar_url"`
	Role        string    `json:"role"`
}
