package middleware

import (
	"net/http"

	"devdeck/internal/authctx"

	"github.com/google/uuid"
)

// ContextOrg reads the X-Org-ID header and injects it into the context if valid.
func ContextOrg(next http.Handler) http.Handler {
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

		// Inject into context
		ctx := authctx.WithOrgID(r.Context(), orgID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
