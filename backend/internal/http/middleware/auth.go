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

// TokenAuth validates a Bearer token or static API token.
func TokenAuth(cfg config.Config, authService *authservice.Service, st *store.Store) func(http.Handler) http.Handler {
	expected := []byte(cfg.APIToken)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			const prefix = "Bearer "

			if cfg.AuthMode == "jwt" && authService != nil {
				userID, role, plan, ok := validateJWT(authService, w, r)
				if !ok {
					return
				}
				ctx := authctx.WithUserID(r.Context(), userID)
				ctx = authctx.WithUserRole(ctx, role)
				ctx = authctx.WithUserPlan(ctx, plan)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Static token mode
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
			testUserID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
			ctx := authctx.WithUserID(r.Context(), testUserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalTokenAuth extracts the user ID if a valid token is present, but continues
// without error if the token is missing or invalid. Useful for public routes that
// can optionally show private content to the owner.
func OptionalTokenAuth(cfg config.Config, authService *authservice.Service, st *store.Store) func(http.Handler) http.Handler {
	expected := []byte(cfg.APIToken)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			const prefix = "Bearer "

			if cfg.AuthMode == "jwt" && authService != nil {
				if strings.HasPrefix(h, prefix) {
					// Try JWT first
					if userID, role, plan, ok := validateJWT(authService, nil, r); ok {
						ctx := authctx.WithUserID(r.Context(), userID)
						ctx = authctx.WithUserRole(ctx, role)
						ctx = authctx.WithUserPlan(ctx, plan)
						next.ServeHTTP(w, r.WithContext(ctx))
						return
					}

					// Try API Key
					tokenStr := strings.TrimPrefix(h, prefix)
					if st != nil && strings.HasPrefix(tokenStr, "devdeck_") {
						if userID, err := st.ValidateAPIKey(r.Context(), tokenStr); err == nil {
							if user, err := st.GetUserByID(r.Context(), userID); err == nil {
								ctx := authctx.WithUserID(r.Context(), userID)
								ctx = authctx.WithUserRole(ctx, user.Role)
								ctx = authctx.WithUserPlan(ctx, user.Plan)
								next.ServeHTTP(w, r.WithContext(ctx))
								return
							}
						}
					}
				}
			} else {
				// Static token mode
				if strings.HasPrefix(h, prefix) {
					got := []byte(strings.TrimPrefix(h, prefix))
					if subtle.ConstantTimeCompare(got, expected) == 1 {
						testUserID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
						ctx := authctx.WithUserID(r.Context(), testUserID)
						next.ServeHTTP(w, r.WithContext(ctx))
						return
					}
				}
			}

			// If we got here, no valid auth found, but we continue anyway.
			next.ServeHTTP(w, r)
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
		if w != nil {
			unauthorized(w)
		}
		return uuid.Nil, "", "", false
	}
	tokenStr := strings.TrimPrefix(h, prefix)
	userID, role, plan, err := authService.ValidateAccessToken(tokenStr)
	if err != nil {
		if w != nil {
			unauthorized(w)
		}
		return uuid.Nil, "", "", false
	}
	return userID, role, plan, true
}

func unauthorized(w http.ResponseWriter) {
	if w == nil {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":{"code":"UNAUTHORIZED","message":"missing or invalid bearer token"}}`))
}

// SCIMAuth validates a SCIM bearer token for an organization.
func SCIMAuth(st *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			const prefix = "Bearer "
			if !strings.HasPrefix(h, prefix) {
				unauthorized(w)
				return
			}
			tokenStr := strings.TrimPrefix(h, prefix)

			orgID, err := st.ValidateSCIMToken(r.Context(), tokenStr)
			if err != nil {
				unauthorized(w)
				return
			}

			ctx := authctx.WithOrgID(r.Context(), orgID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
