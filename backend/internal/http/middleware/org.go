package middleware

import (
	"net/http"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

// ContextOrg reads the X-Org-ID header and injects it into the context only
// when the authenticated user is a member of that organization. Every data
// route scopes its queries to this org, so an unvalidated header would let
// any caller read and write another org's vault.
func ContextOrg(st *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgIDStr := r.Header.Get("X-Org-ID")
			if orgIDStr == "" {
				next.ServeHTTP(w, r)
				return
			}

			orgID, err := uuid.Parse(orgIDStr)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			userID, ok := authctx.UserID(r.Context())
			if !ok {
				unauthorized(w)
				return
			}

			if _, isMember := st.IsOrgMember(r.Context(), userID, orgID); !isMember {
				forbidden(w, "not a member of this organization")
				return
			}

			ctx := authctx.WithOrgID(r.Context(), orgID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
