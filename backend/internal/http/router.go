package http

import (
	"net/http"
	"time"

	"devdeck/internal/ai"
	"devdeck/internal/authservice"
	"devdeck/internal/config"
	"devdeck/internal/email"
	"devdeck/internal/enricher"
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

type Deps struct {
	Store       *store.Store
	Enricher    *enricher.Service
	AuthService *authservice.Service
	EnrichQueue *jobs.EnrichQueue
	EmailSender email.Sender
	AI          *ai.Service
}

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
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/healthz", handlers.Health)
	r.Handle("/metrics", promhttp.Handler())

	st := deps.Store
	en := deps.Enricher
	as := deps.AuthService

	// Initialize AI embeddings service if AI is enabled
	var embSvc *ai.EmbeddingsService
	if deps.AI != nil && deps.AI.Enabled() {
		// Create appropriate embedder based on config
		// This would use same provider as AI summary/tags
		// For now, we'll create based on config defaults
		embSvc = ai.NewEmbeddingsService(nil) // placeholder until config integration
	}

	var authH *handlers.AuthHandler
	if cfg.AuthMode == "jwt" && as != nil {
		authH = handlers.NewAuthHandler(st, as, handlers.AuthConfig{
			GitHubClientID:          cfg.GitHubClientID,
			GitHubClientSecret:      cfg.GitHubClientSecret,
			GitHubOAuthCallbackURL:  cfg.GitHubOAuthCallbackURL,
			WebOAuthRedirectURL:     cfg.WebOAuthRedirectURL,
			DesktopOAuthRedirectURL: cfg.DesktopOAuthRedirectURL,
		})
	}

	reposH := handlers.NewReposHandler(st, en)
	statsH := handlers.NewStatsHandler(st)
	discoveryH := handlers.NewDiscoveryHandler(st)
	commandsH := handlers.NewCommandsHandler(st)
	cheatsH := handlers.NewCheatsheetsHandler(st, embSvc)
	suggestionsH := handlers.NewSuggestionsHandler(st)
	captureH := handlers.NewCaptureHandler(st, deps.EnrichQueue)
	itemsH := handlers.NewItemsHandler(st, deps.EnrichQueue)
	previewH := handlers.NewPreviewHandler(deps.Enricher)
	askH := handlers.NewAskHandler(st, embSvc)
	relatedH := handlers.NewItemRelatedHandler(st)
	syncH := handlers.NewSyncHandler()

	r.Route("/api", func(r chi.Router) {
		r.Get("/suggestions/commands", suggestionsH.Commands)

		if authH != nil {
			r.Route("/auth", func(r chi.Router) {
				r.Get("/providers", authH.Providers)
				r.Get("/github/login", authH.Login)
				r.Get("/github/callback", authH.Callback)
				r.Post("/refresh", authH.Refresh)
				r.Post("/logout", authH.Logout)

				r.Group(func(r chi.Router) {
					r.Use(mw.JWTAuth(as))
					r.Get("/me", authH.Me)
				})
			})
		}

		r.Group(func(r chi.Router) {
			r.Use(mw.TokenAuth(cfg, as))

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
				rr.Get("/{id}/commands", commandsH.List)
				rr.Post("/{id}/commands", commandsH.Create)
				rr.Post("/{id}/commands/batch", commandsH.BatchCreate)
				rr.Post("/{id}/commands/reorder", commandsH.Reorder)
				rr.Patch("/{id}/commands/{cmdId}", commandsH.Update)
				rr.Delete("/{id}/commands/{cmdId}", commandsH.Delete)
				rr.Get("/{id}/cheatsheets", reposH.ListLinkedCheatsheets)
				rr.Post("/{id}/cheatsheets/{cheatsheetId}", reposH.LinkCheatsheet)
				rr.Delete("/{id}/cheatsheets/{cheatsheetId}", reposH.UnlinkCheatsheet)
			})

			r.Route("/cheatsheets", func(cr chi.Router) {
				cr.Get("/", cheatsH.List)
				cr.Post("/", cheatsH.Create)
				cr.Get("/explore", cheatsH.Explore)
				cr.Get("/{id}", cheatsH.Get)
				cr.Patch("/{id}", cheatsH.Update)
				cr.Delete("/{id}", cheatsH.Delete)
				cr.Post("/{id}/fork", cheatsH.Fork)
				cr.Post("/{id}/star", cheatsH.Star)
				cr.Get("/{id}/entries", cheatsH.ListEntries)
				cr.Post("/{id}/entries", cheatsH.CreateEntry)
				cr.Patch("/{id}/entries/{entryId}", cheatsH.UpdateEntry)
				cr.Delete("/{id}/entries/{entryId}", cheatsH.DeleteEntry)
			})

			r.Get("/search", cheatsH.Search)
			r.Get("/stats", statsH.Get)
			r.Get("/discovery/next", discoveryH.Next)

r.Route("/items", func(ir chi.Router) {
			ir.Post("/capture", captureH.Capture)
			ir.Post("/preview", previewH.Preview)
			ir.Get("/", itemsH.List)
			ir.Get("/tags", itemsH.ListTags)
			ir.Get("/{id}", itemsH.Get)
			ir.Patch("/{id}", itemsH.Update)
			ir.Delete("/{id}", itemsH.Delete)
			ir.Post("/{id}/ai-enrich", itemsH.AIEnrich)
			ir.Patch("/{id}/ai-tags", itemsH.ReviewAITags)
			ir.Post("/{id}/seen", itemsH.MarkSeen)
			ir.Get("/{id}/related", relatedH.Related)
		})

			r.Post("/ask", askH.Ask)

			r.Post("/sync/batch", syncH.BatchSync)
			r.Get("/sync/delta", syncH.Delta)
		})
	})

	return r
}
