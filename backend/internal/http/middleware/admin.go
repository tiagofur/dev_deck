package middleware

import (
	"net/http"

	"devdeck/internal/authctx"
)

// RequireAdmin ensures the user has the "admin" role.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := authctx.UserRole(r.Context())
		if !ok {
			unauthorized(w)
			return
		}

		if role != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"error":{"code":"FORBIDDEN","message":"admin role required"}}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}
