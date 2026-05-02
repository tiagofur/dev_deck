package store

import (
	"context"
	"fmt"

	"devdeck/internal/authctx"

	"github.com/google/uuid"
)

func currentUserID(ctx context.Context) (uuid.UUID, bool) {
	return authctx.UserID(ctx)
}

func currentUserIDPtr(ctx context.Context) *uuid.UUID {
	userID, ok := currentUserID(ctx)
	if !ok {
		return nil
	}
	return &userID
}

func ownerClause(ctx context.Context, column string, startIndex int) (string, []any) {
	if userID, ok := currentUserID(ctx); ok {
		return fmt.Sprintf("%s = $%d", column, startIndex), []any{userID}
	}
	return fmt.Sprintf("%s IS NULL", column), nil
}
