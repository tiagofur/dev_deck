package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"devdeck/internal/authctx"
	"devdeck/internal/authservice"
	"devdeck/internal/config"

	"github.com/google/uuid"
)

// TokenAuth enforces authentication. In "token" mode it checks a static
// bearer token. In "jwt" mode it validates a JWT and injects the user ID
// into the request context.
func TokenAuth(cfg config.Config, authService *authservice.Service) func(http.Handler) http.Handler {
	expected := []byte(cfg.APIToken)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cfg.AuthMode == "jwt" && authService != nil {
				userID, ok := validateJWT(authService, w, r)
				if !ok {
					return
				}
				ctx := authctx.WithUserID(r.Context(), userID)
				next.ServeHTTP(w, r.WithContext(ctx))
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
			userID, ok := validateJWT(authService, w, r)
			if !ok {
				return
			}
			ctx := authctx.WithUserID(r.Context(), userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func validateJWT(authService *authservice.Service, w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		unauthorized(w)
		return uuid.Nil, false
	}
	tokenStr := strings.TrimPrefix(h, prefix)
	userID, err := authService.ValidateAccessToken(tokenStr)
	if err != nil {
		unauthorized(w)
		return uuid.Nil, false
	}
	return userID, true
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":{"code":"UNAUTHORIZED","message":"missing or invalid bearer token"}}`))
}
