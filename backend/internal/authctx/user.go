package authctx

import (
	"context"

	"github.com/google/uuid"
)

type userIDKey struct{}

// WithUserID stores the authenticated user ID in the request context.
func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey{}, userID)
}

// UserID returns the authenticated user ID when present.
func UserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(userIDKey{}).(uuid.UUID)
	return userID, ok
}
