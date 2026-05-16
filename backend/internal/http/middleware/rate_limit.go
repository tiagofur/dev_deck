package middleware

import (
	"net/http"
	"time"

	"devdeck/internal/authctx"

	"github.com/go-chi/httprate"
)

// IARateLimit implements a multi-tier rate limit based on the user's plan.
func IARateLimit(proLimit, freeLimit int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		// We use httprate internally but with a custom key function
		// and a limit handler that checks the user's plan from the context.
		// Since chi middlewares are static, we'll implement a dynamic one here.
		
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			plan, _ := authctx.UserPlan(r.Context())
			
			limit := freeLimit
			if plan == "pro" {
				limit = proLimit
			}

			// For Wave 7 / Phase 24, we'll keep it simple: 
			// use httprate with UserID as key if logged in, IP otherwise.
			keyFunc := func(r *http.Request) (string, error) {
				if userID, ok := authctx.UserID(r.Context()); ok {
					return userID.String(), nil
				}
				return httprate.KeyByIP(r)
			}

			// We need a way to apply the limit dynamically.
			// Httprate doesn't easily support dynamic limits in one middleware instance.
			// So we'll use a fixed conservative limit for now and improve in next waves.
			
			httprate.Limit(
				limit,
				1*time.Hour,
				httprate.WithKeyFuncs(keyFunc),
				httprate.WithLimitHandler(func(w http.ResponseWriter, _ *http.Request) {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusTooManyRequests)
					_, _ = w.Write([]byte(`{"error":{"code":"AI_RATE_LIMITED","message":"cuota de IA agotada por esta hora"}}`))
				}),
			)(next).ServeHTTP(w, r)
		})
	}
}
