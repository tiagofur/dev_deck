package middleware

import (
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// OrgRole represents the role a user has in an organization.
type OrgRole string

const (
	RoleOwner  OrgRole = "owner"
	RoleAdmin  OrgRole = "admin"
	RoleEditor OrgRole = "editor"
	RoleViewer OrgRole = "viewer"
)

// Permission matrix
var rolePermissions = map[OrgRole][]string{
	RoleViewer: {"org:read"},
	RoleEditor: {"org:read", "item:write", "runbook:write"},
	RoleAdmin:  {"org:read", "item:write", "runbook:write", "org:admin", "scim:write"},
	RoleOwner:  {"org:read", "item:write", "runbook:write", "org:admin", "scim:write", "org:delete"},
}

func hasPermission(role string, permission string) bool {
	perms, ok := rolePermissions[OrgRole(role)]
	if !ok {
		return false
	}
	for _, p := range perms {
		if p == permission {
			return true
		}
	}
	return false
}

// RequireOrgPermission ensures the user has the required permission within
// the active organization (X-Org-ID header).
//
// Deprecated: the header is caller-controlled, so this must not guard routes
// that carry the org id in their path — use RequireOrgPermissionFromPath.
func RequireOrgPermission(st *store.Store, permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := authctx.UserID(r.Context())
			if !ok {
				unauthorized(w)
				return
			}

			orgID, ok := authctx.OrgID(r.Context())
			if !ok {
				// If no active org, we assume it's personal vault.
				// For now, if a route requires an org permission, it MUST have an active org.
				forbidden(w, "organization context required")
				return
			}

			// Check membership and role in DB
			role, ok := st.IsOrgMember(r.Context(), userID, orgID)
			if !ok {
				forbidden(w, "not a member of this organization")
				return
			}

			if !hasPermission(role, permission) {
				forbidden(w, "insufficient permissions in this organization")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireOrgPermissionFromPath ensures the user holds the required permission
// in the organization named by the URL path parameter. Org-scoped routes must
// use this instead of RequireOrgPermission, which trusts the X-Org-ID header
// and would let an admin of their own org act on someone else's org id.
func RequireOrgPermissionFromPath(st *store.Store, param, permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := authctx.UserID(r.Context())
			if !ok {
				unauthorized(w)
				return
			}

			orgID, err := uuid.Parse(chi.URLParam(r, param))
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":{"code":"INVALID_ID","message":"organization id must be a uuid"}}`))
				return
			}

			role, ok := st.IsOrgMember(r.Context(), userID, orgID)
			if !ok {
				forbidden(w, "not a member of this organization")
				return
			}

			if !hasPermission(role, permission) {
				forbidden(w, "insufficient permissions in this organization")
				return
			}

			next.ServeHTTP(w, r.WithContext(authctx.WithOrgID(r.Context(), orgID)))
		})
	}
}

func forbidden(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	// We'll use a raw string for simplicity or writeJSON if we had it here
	// But handlers/response.go has writeJSON, middleware usually doesn't import handlers to avoid cycle.
	// I'll use raw string.
	body := `{"error":{"code":"FORBIDDEN","message":"` + message + `"}}`
	_, _ = w.Write([]byte(body))
}
