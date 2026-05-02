package http

import (
	"net/http"
	"time"

	"devdeck/internal/authservice"
	"devdeck/internal/config"
	"devdeck/internal/enricher"
	"devdeck/internal/email"
	"devdeck/internal/http/handlers"
	mw "devdeck/internal/http/middleware"
	"devdeck/internal/jobs"
	"devdeck/internal/metrics"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Deps bundles the services a router needs. Using a struct instead of a
// long positional list so 16.9's capture handler can plug in an enrich
// queue without breaking every test call site.
type Deps struct {
	Store       *store.Store
	Enricher    *enricher.Service
	AuthService *authservice.Service
	EnrichQueue *jobs.EnrichQueue
	EmailSender email.Sender
}

// NewRouter is the legacy entry point kept for backwards compatibility
// with existing handler tests. New code should construct a Deps struct
// and call NewRouterWithDeps directly.
func NewRouter(cfg config.Config, st *store.Store, en *enricher.Service, as *authservice.Service) http.Handler {
	return NewRouterWithDeps(cfg, Deps{
		Store:       st,
		Enricher:    en,
		AuthService: as,
		EmailSender: &email.NoopSender{},
	})
}

func NewRouterWithDeps(cfg config.Config, deps Deps) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(mw.Logger)
	r.Use(metrics.Instrument)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOriginList(),
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Public
	r.Get("/healthz", handlers.Health)
	r.Handle("/metrics", promhttp.Handler())

	st := deps.Store
	en := deps.Enricher
	as := deps.AuthService

	// ─── Wave 4: Auth routes (public) ───
	var authH *handlers.AuthHandler
	var authLocalH *handlers.AuthLocalHandler
	if cfg.AuthMode == "jwt" && as != nil {
		authH = handlers.NewAuthHandler(st, as, handlers.AuthConfig{
			GitHubClientID:          cfg.GitHubClientID,
			GitHubClientSecret:      cfg.GitHubClientSecret,
			GitHubOAuthCallbackURL:  cfg.GitHubOAuthCallbackURL,
			GoogleClientID:          cfg.GoogleClientID,
			GoogleClientSecret:      cfg.GoogleClientSecret,
			GoogleOAuthCallbackURL:  cfg.GoogleOAuthCallbackURL,
			AppleClientID:           cfg.AppleClientID,
			AppleTeamID:             cfg.AppleTeamID,
			AppleKeyID:              cfg.AppleKeyID,
			ApplePrivateKey:         cfg.ApplePrivateKey,
			AppleOAuthCallbackURL:   cfg.AppleOAuthCallbackURL,
			WebOAuthRedirectURL:     cfg.WebOAuthRedirectURL,
			DesktopOAuthRedirectURL: cfg.DesktopOAuthRedirectURL,
		})

		if cfg.LocalAuthEnabled {
			authLocalH = handlers.NewAuthLocalHandler(st, as, deps.EmailSender, cfg.FrontendURL)
		}
	}

	// ─── Shared handlers ───
	reposH := handlers.NewReposHandler(st, en)
	statsH := handlers.NewStatsHandler(st)
	discoveryH := handlers.NewDiscoveryHandler(st)
	commandsH := handlers.NewCommandsHandler(st)
	cheatsH := handlers.NewCheatsheetsHandler(st)
	suggestionsH := handlers.NewSuggestionsHandler(st)
	captureH := handlers.NewCaptureHandler(st, deps.EnrichQueue)
	itemsH := handlers.NewItemsHandler(st, deps.EnrichQueue)

	r.Route("/api", func(r chi.Router) {
		r.Get("/suggestions/commands", suggestionsH.Commands)

		// Public Auth
		if authH != nil || authLocalH != nil {
			r.Route("/auth", func(r chi.Router) {
				if authH != nil {
					r.Get("/providers", authH.Providers)
					r.Get("/{provider}/login", authH.Login)
					r.Get("/{provider}/callback", authH.Callback)
					r.Post("/{provider}/callback", authH.Callback)
					r.Post("/refresh", authH.Refresh)
					r.Post("/logout", authH.Logout)
				}

				if authLocalH != nil {
					r.Post("/register", authLocalH.Register)
					r.Post("/login", authLocalH.LoginLocal)
					r.Get("/verify-email", authLocalH.VerifyEmail)
					r.Post("/forgot-password", authLocalH.ForgotPassword)
					r.Post("/reset-password", authLocalH.ResetPassword)
				}

				// /me requires JWT
				r.Group(func(r chi.Router) {
					r.Use(mw.JWTAuth(as))
					r.Get("/me", authH.Me)

					if authLocalH != nil {
						r.Post("/change-password", authLocalH.ChangePassword)
					}
				})
			})
		}

		// Authenticated Routes
		r.Group(func(r chi.Router) {
			r.Use(mw.TokenAuth(cfg, as))

			// Wave 4.5 §16.8 — global rate limit. Tests or self-hosted
			// instances can disable it entirely with RATE_LIMIT_DISABLED=1.
			if !cfg.RateLimitDisabled {
				r.Use(httprate.Limit(
					cfg.RateLimitPerMinute,
					1*time.Minute,
					httprate.WithKeyFuncs(httprate.KeyByIP),
					httprate.WithLimitHandler(func(w http.ResponseWriter, _ *http.Request) {
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(http.StatusTooManyRequests)
						_, _ = w.Write([]byte(`{"error":{"code":"RATE_LIMITED","message":"too many requests, slow down"}}`))
					}),
				))
			}

			r.Route("/repos", func(rr chi.Router) {
				rr.Get("/", reposH.List)
				rr.Post("/", reposH.Create)
				rr.Get("/{id}", reposH.Get)
				rr.Patch("/{id}", reposH.Update)
				rr.Delete("/{id}", reposH.Delete)
				rr.Post("/{id}/refresh", reposH.Refresh)
				rr.Post("/{id}/seen", reposH.MarkSeen)
				rr.Get("/{id}/readme", reposH.Readme)
				rr.Get("/{id}/package-scripts", reposH.PackageScripts)

				// 🌊2 — commands per repo
				rr.Get("/{id}/commands", commandsH.List)
				rr.Post("/{id}/commands", commandsH.Create)
				rr.Post("/{id}/commands/batch", commandsH.BatchCreate)
				rr.Post("/{id}/commands/reorder", commandsH.Reorder)
				rr.Patch("/{id}/commands/{cmdId}", commandsH.Update)
				rr.Delete("/{id}/commands/{cmdId}", commandsH.Delete)

				// 🌊3 — repo ↔ cheatsheet links
				rr.Get("/{id}/cheatsheets", reposH.ListLinkedCheatsheets)
				rr.Post("/{id}/cheatsheets/{cheatsheetId}", reposH.LinkCheatsheet)
				rr.Delete("/{id}/cheatsheets/{cheatsheetId}", reposH.UnlinkCheatsheet)
			})

			// 🌊3 — cheatsheets CRUD
			r.Route("/cheatsheets", func(cr chi.Router) {
				cr.Get("/", cheatsH.List)
				cr.Post("/", cheatsH.Create)
				cr.Get("/explore", cheatsH.Explore)
				cr.Get("/{id}", cheatsH.Get)
				cr.Patch("/{id}", cheatsH.Update)
				cr.Delete("/{id}", cheatsH.Delete)
				cr.Post("/{id}/fork", cheatsH.Fork)
				cr.Post("/{id}/star", cheatsH.Star)

				// Entries
				cr.Get("/{id}/entries", cheatsH.ListEntries)
				cr.Post("/{id}/entries", cheatsH.CreateEntry)
				cr.Patch("/{id}/entries/{entryId}", cheatsH.UpdateEntry)
				cr.Delete("/{id}/entries/{entryId}", cheatsH.DeleteEntry)
			})

			// 🌊3 — global search
			r.Get("/search", cheatsH.Search)

			r.Get("/stats", statsH.Get)
			r.Get("/discovery/next", discoveryH.Next)

			// 🌊4.5 §16.9 — unified capture endpoint
			// 🌊5   §17   — items CRUD on top of the polymorphic `items` table
			r.Route("/items", func(ir chi.Router) {
				ir.Post("/capture", captureH.Capture)
				ir.Get("/", itemsH.List)
				ir.Get("/{id}", itemsH.Get)
				ir.Patch("/{id}", itemsH.Update)
				ir.Delete("/{id}", itemsH.Delete)
				ir.Post("/{id}/ai-enrich", itemsH.AIEnrich)
				ir.Patch("/{id}/ai-tags", itemsH.ReviewAITags)
				ir.Post("/{id}/seen", itemsH.MarkSeen)
			})
		})
	})

	return r
}
