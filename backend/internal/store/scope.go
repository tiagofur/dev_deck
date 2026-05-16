package store

import (
	"context"
	"fmt"
	"strings"

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

func currentOrgIDPtr(ctx context.Context) *uuid.UUID {
	orgID, ok := authctx.OrgID(ctx)
	if !ok {
		return nil
	}
	return &orgID
}

func ownerClause(ctx context.Context, column string, startIndex int) (string, []any) {
	// If the column name contains a prefix (e.g. "i.user_id"), we need it for org_id too.
	prefix := ""
	if idx := strings.LastIndex(column, "."); idx != -1 {
		prefix = column[:idx+1]
	}

	if orgID, ok := authctx.OrgID(ctx); ok {
		return fmt.Sprintf("%sorg_id = $%d", prefix, startIndex), []any{orgID}
	}

	if userID, ok := currentUserID(ctx); ok {
		return fmt.Sprintf("%s = $%d AND %sorg_id IS NULL", column, startIndex, prefix), []any{userID}
	}

	return fmt.Sprintf("%s IS NULL", column), nil
}
