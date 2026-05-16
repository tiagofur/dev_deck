package authctx

import (
	"context"

	"github.com/google/uuid"
)

type userIDKey struct{}
type userRoleKey struct{}
type userPlanKey struct{}
type orgIDKey struct{}
type userRegionKey struct{}

// WithUserID stores the authenticated user ID in the request context.
func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey{}, userID)
}

// UserID returns the authenticated user ID when present.
func UserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(userIDKey{}).(uuid.UUID)
	return userID, ok
}

// WithUserRole stores the authenticated user role in the request context.
func WithUserRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, userRoleKey{}, role)
}

// UserRole returns the authenticated user role when present.
func UserRole(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(userRoleKey{}).(string)
	return role, ok
}

// WithUserPlan stores the authenticated user plan in the request context.
func WithUserPlan(ctx context.Context, plan string) context.Context {
	return context.WithValue(ctx, userPlanKey{}, plan)
}

// UserPlan returns the authenticated user plan when present.
func UserPlan(ctx context.Context) (string, bool) {
	plan, ok := ctx.Value(userPlanKey{}).(string)
	return plan, ok
}

// WithOrgID stores the active organization ID in the request context.
func WithOrgID(ctx context.Context, orgID uuid.UUID) context.Context {
	return context.WithValue(ctx, orgIDKey{}, orgID)
}

// OrgID returns the active organization ID when present.
func OrgID(ctx context.Context) (uuid.UUID, bool) {
	orgID, ok := ctx.Value(orgIDKey{}).(uuid.UUID)
	return orgID, ok
}

// WithUserRegion stores the user's home region in the request context.
func WithUserRegion(ctx context.Context, region string) context.Context {
	return context.WithValue(ctx, userRegionKey{}, region)
}

// UserRegion returns the user's home region when present.
func UserRegion(ctx context.Context) (string, bool) {
	region, ok := ctx.Value(userRegionKey{}).(string)
	return region, ok
}
