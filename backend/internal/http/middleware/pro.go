package middleware

import (
	"net/http"

	"heapdeck/internal/authctx"
	"heapdeck/internal/config"
	"heapdeck/internal/domain/auth"
	"heapdeck/internal/store"
)

// ProGater resolves whether the request may use Pro-only AI surfaces.
// When billing is disabled (self-host default) or the API runs in static
// token mode, every authenticated user is treated as Pro: the operator
// pays for their own AI provider, so gating makes no sense there.
type ProGater struct {
	billingEnabled bool
	authMode       string
	store          *store.Store
}

// NewProGater builds the gate from config. It holds the same semantics as
// RequireAdmin's surroundings: TokenAuth runs first, so UserID is present
// whenever this middleware executes on a protected route.
func NewProGater(cfg config.Config, st *store.Store) *ProGater {
	return &ProGater{
		billingEnabled: cfg.BillingEnabled,
		authMode:       cfg.AuthMode,
		store:          st,
	}
}

// IsPro reports whether the request's user may use Pro surfaces. Fresh plan
// comes from the DB (never the JWT claim, which can lag up to the access
// token TTL after an upgrade/downgrade).
func (g *ProGater) IsPro(r *http.Request) bool {
	if g == nil || !g.billingEnabled || g.authMode == "token" {
		return true
	}
	userID, ok := authctx.UserID(r.Context())
	if !ok || g.store == nil {
		return false
	}
	return g.store.GetUserPlan(r.Context(), userID) == auth.PlanPro
}

// RequirePro rejects non-Pro users with 402 PRO_REQUIRED. Mount after
// TokenAuth on Pro-only routes (agent chat, ask, semantic search modes).
func (g *ProGater) RequirePro(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if g == nil || !g.billingEnabled || g.authMode == "token" {
			next.ServeHTTP(w, r)
			return
		}
		if _, ok := authctx.UserID(r.Context()); !ok {
			unauthorized(w)
			return
		}
		if !g.IsPro(r) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusPaymentRequired)
			_, _ = w.Write([]byte(`{"error":{"code":"PRO_REQUIRED","message":"this AI feature requires the Pro plan"}}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}
