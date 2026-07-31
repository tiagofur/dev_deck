package middleware

import (
	"net/http"
	"time"

	"devdeck/internal/authctx"

	"github.com/go-chi/httprate"
)

// IARateLimit implements a multi-tier per-hour rate limit based on the user's
// plan. The two underlying limiters are constructed ONCE (when the middleware
// is built) so their counters persist across requests; each request is then
// dispatched to the pro or free limiter based on the plan in the context.
// Keying is by user ID when authenticated, falling back to IP.
func IARateLimit(proLimit, freeLimit int) func(http.Handler) http.Handler {
	keyFunc := func(r *http.Request) (string, error) {
		if userID, ok := authctx.UserID(r.Context()); ok {
			return userID.String(), nil
		}
		// Use RemoteAddr directly (httprate.KeyByIP is deprecated in v0.16)
		return r.RemoteAddr, nil
	}

	limitHandler := httprate.WithLimitHandler(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"code":"AI_RATE_LIMITED","message":"cuota de IA agotada por esta hora"}}`))
	})

	proLimiter := httprate.LimitBy(proLimit, 1*time.Hour, keyFunc, limitHandler)
	freeLimiter := httprate.LimitBy(freeLimit, 1*time.Hour, keyFunc, limitHandler)

	return func(next http.Handler) http.Handler {
		proHandler := proLimiter(next)
		freeHandler := freeLimiter(next)

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if plan, _ := authctx.UserPlan(r.Context()); plan == "pro" {
				proHandler.ServeHTTP(w, r)
				return
			}
			freeHandler.ServeHTTP(w, r)
		})
	}
}
