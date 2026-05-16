package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"devdeck/internal/authctx"
	"devdeck/internal/authservice"
	"devdeck/internal/config"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

// TokenAuth enforces authentication. In "token" mode it checks a static
// bearer token. In "jwt" mode it validates a JWT OR a Personal Access Token (PAT).
func TokenAuth(cfg config.Config, authService *authservice.Service, st *store.Store) func(http.Handler) http.Handler {
	expected := []byte(cfg.APIToken)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cfg.AuthMode == "jwt" && authService != nil {
				// 1. Try JWT
				userID, role, plan, ok := validateJWT(authService, w, r)
				if ok {
					ctx := authctx.WithUserID(r.Context(), userID)
					ctx = authctx.WithUserRole(ctx, role)
					ctx = authctx.WithUserPlan(ctx, plan)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}

				// 2. Fallback to API Keys (PATs)
				if st != nil {
					h := r.Header.Get("Authorization")
					const prefix = "Bearer "
					if strings.HasPrefix(h, prefix) {
						tokenStr := strings.TrimPrefix(h, prefix)
						if strings.HasPrefix(tokenStr, "devdeck_") {
							userID, err := st.ValidateAPIKey(r.Context(), tokenStr)
							if err == nil {
								// PATs always have "user" role and "pro" plan for now (to encourage API use)
								// or we could fetch user from DB to get real plan.
								// Let's fetch real user for consistency.
								user, err := st.GetUserByID(r.Context(), userID)
								if err == nil {
									ctx := authctx.WithUserID(r.Context(), userID)
									ctx = authctx.WithUserRole(ctx, user.Role)
									ctx = authctx.WithUserPlan(ctx, user.Plan)
									next.ServeHTTP(w, r.WithContext(ctx))
									return
								}
							}
						}
					}
				}
				
				// Both failed
				unauthorized(w)
				return
			}

			// Static token mode (Wave 1)
			h := r.Header.Get("Authorization")
			const prefix = "Bearer "
			if !strings.HasPrefix(h, prefix) {
				unauthorized(w)
				return
			}
			got := []byte(strings.TrimPrefix(h, prefix))
			if subtle.ConstantTimeCompare(got, expected) != 1 {
				unauthorized(w)
				return
			}

			// For E2E/Dev convenience, inject a well-known Test User ID
			// 00000000-0000-0000-0000-000000000001
			testUserID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
			ctx := authctx.WithUserID(r.Context(), testUserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// JWTAuth is a simpler middleware for JWT-only routes.
func JWTAuth(authService *authservice.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, role, plan, ok := validateJWT(authService, w, r)
			if !ok {
				return
			}
			ctx := authctx.WithUserID(r.Context(), userID)
			ctx = authctx.WithUserRole(ctx, role)
			ctx = authctx.WithUserPlan(ctx, plan)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func validateJWT(authService *authservice.Service, w http.ResponseWriter, r *http.Request) (uuid.UUID, string, string, bool) {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		unauthorized(w)
		return uuid.Nil, "", "", false
	}
	tokenStr := strings.TrimPrefix(h, prefix)
	userID, role, plan, err := authService.ValidateAccessToken(tokenStr)
	if err != nil {
		unauthorized(w)
		return uuid.Nil, "", "", false
	}
	return userID, role, plan, true
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":{"code":"UNAUTHORIZED","message":"missing or invalid bearer token"}}`))
}
