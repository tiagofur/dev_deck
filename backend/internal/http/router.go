package http

import (
	"net/http"
	"time"

	"devdeck/internal/ai"
	"devdeck/internal/authservice"
	"devdeck/internal/cache"
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
	Embeddings  *ai.EmbeddingsService
	Cache       *cache.Cache
}

func NewRouter(cfg config.Config, st *store.Store, en *enricher.Service, as *authservice.Service, aiSvc *ai.Service, embSvc *ai.EmbeddingsService, c *cache.Cache) http.Handler {
	return NewRouterWithDeps(cfg, Deps{
		Store:       st,
		Enricher:    en,
		AuthService: as,
		EmailSender: &email.NoopSender{},
		AI:          aiSvc,
		Embeddings:  embSvc,
		Cache:       c,
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

	st := deps.Store
	healthH := handlers.NewHealthHandler(st)

	r.Get("/healthz", healthH.Health)
	r.Handle("/metrics", promhttp.Handler())
	en := deps.Enricher
	as := deps.AuthService
	embSvc := deps.Embeddings

	authH := handlers.NewAuthHandler(st, as, handlers.AuthConfig{
		GitHubClientID:          cfg.GitHubClientID,
		GitHubClientSecret:      cfg.GitHubClientSecret,
		GitHubOAuthCallbackURL:  cfg.GitHubOAuthCallbackURL,
		WebOAuthRedirectURL:     cfg.WebOAuthRedirectURL,
		DesktopOAuthRedirectURL: cfg.DesktopOAuthRedirectURL,
		RequireInvite:           cfg.RequireInvite,
	})

	reposH := handlers.NewReposHandler(st, en)
	statsH := handlers.NewStatsHandler(st)
	discoveryH := handlers.NewDiscoveryHandler(st, deps.Cache)
	commandsH := handlers.NewCommandsHandler(st)
	cheatsH := handlers.NewCheatsheetsHandler(st, embSvc)
	suggestionsH := handlers.NewSuggestionsHandler(st)
	captureH := handlers.NewCaptureHandler(st, deps.EnrichQueue)
	itemsH := handlers.NewItemsHandler(st, deps.EnrichQueue)
	previewH := handlers.NewPreviewHandler(deps.Enricher)
	askH := handlers.NewAskHandler(st, embSvc)
	relatedH := handlers.NewItemRelatedHandler(st)
	syncH := handlers.NewSyncHandler(st)
	devicesH := handlers.NewDevicesHandler(st)
	deckH := handlers.NewDeckHandler(st)
	publicDeckH := handlers.NewPublicDeckHandler(st)
	importH := handlers.NewImportHandler(st)
	profileH := handlers.NewProfileHandler(st, deps.Cache)
	circlesH := handlers.NewCirclesHandler(st)
	adminH := handlers.NewAdminHandler(st)
	runbooksH := handlers.NewRunbooksHandler(st)
	invitesH := handlers.NewInvitesHandler(st)
	notificationsH := handlers.NewNotificationsHandler(st)
	orgsH := handlers.NewOrgsHandler(st)
	realtimeH := handlers.NewRealtimeHandler()
	keysH := handlers.NewKeysHandler(st)
	enrichersH := handlers.NewEnrichersHandler(st)
	webhooksH := handlers.NewWebhooksHandler(st)
	pluginsH := handlers.NewPluginsHandler()
	socialH := handlers.NewSocialHandler(st)
	agentH := handlers.NewAgentHandler(st, deps.AI)
	onboardingH := handlers.NewOnboardingHandler(st)
	samlH := handlers.NewSAMLHandler(st, as, handlers.SAMLHandlerConfig{
		EntityID:    "devdeck-sp",
		BaseURL:     cfg.FrontendURL, // Best effort base
		FrontendURL: cfg.FrontendURL,
	})
	scimH := handlers.NewSCIMHandler(st)

	r.Route("/api", func(r chi.Router) {
		// Optional auth for all public API routes
		r.Use(mw.OptionalTokenAuth(cfg, as, st))

		r.Get("/suggestions/commands", suggestionsH.Commands)
		r.Get("/plugins/featured", pluginsH.ListFeatured)
		r.Post("/waitlist", invitesH.JoinWaitlist)

		// Cheatsheet management (Consolidated to avoid Chi router panics)
		r.Route("/cheatsheets", func(cr chi.Router) {
			cr.Get("/explore", cheatsH.Explore)
			cr.Get("/{id}", cheatsH.Get)
			cr.Get("/{id}/entries", cheatsH.ListEntries)
			cr.Get("/{id}/export", cheatsH.Export)
			cr.Get("/{id}/badge", cheatsH.Badge)
			cr.Get("/{id}/card.svg", cheatsH.Card)

			// Enforced auth for management operations
			cr.Group(func(cr chi.Router) {
				cr.Use(mw.TokenAuth(cfg, as, st))
				cr.Get("/", cheatsH.List)
				cr.Post("/", cheatsH.Create)
				cr.Patch("/{id}", cheatsH.Update)
				cr.Delete("/{id}", cheatsH.Delete)
				cr.Post("/{id}/fork", cheatsH.Fork)
				cr.Post("/{id}/star", cheatsH.Star)
				cr.Post("/{id}/entries", cheatsH.CreateEntry)
				cr.Patch("/{id}/entries/{entryId}", cheatsH.UpdateEntry)
				cr.Delete("/{id}/entries/{entryId}", cheatsH.DeleteEntry)
			})
		})

		r.Route("/auth", func(r chi.Router) {
			// Profile endpoints (available in both token and jwt modes)
			r.Group(func(r chi.Router) {
				r.Use(mw.TokenAuth(cfg, as, st))
				r.Get("/me", authH.Me)
				r.Patch("/me", authH.UpdateMe)
				r.Patch("/me/onboarding/complete", authH.CompleteOnboarding)
			})

			// OAuth/JWT only endpoints
			if cfg.AuthMode == "jwt" {
				r.Get("/providers", authH.Providers)
				r.Post("/register", authH.Register)
				r.Post("/login", authH.LoginLocal)
				r.Post("/login-step1", samlH.LoginStep1)
				r.Get("/github/login", authH.Login)
				r.Get("/github/callback", authH.Callback)

				r.Route("/saml", func(r chi.Router) {
					r.Get("/metadata", samlH.Metadata)
					r.Get("/login", samlH.Login)
					r.Post("/acs", samlH.ACS)
				})

				r.Post("/refresh", authH.Refresh)
				r.Post("/logout", authH.Logout)
			}
		})

		r.Group(func(r chi.Router) {
			r.Use(mw.TokenAuth(cfg, as, st))
			r.Use(mw.ContextOrg)

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

			r.Get("/search", cheatsH.Search)
			r.Route("/stats", func(sr chi.Router) {
				sr.Get("/", statsH.Get)
				sr.Get("/global", statsH.GetGlobal)
			})
			r.Route("/discovery", func(dr chi.Router) {
				dr.Get("/next", discoveryH.Next)
				dr.Get("/trending", discoveryH.Trending)
				dr.Get("/leaderboard", discoveryH.Leaderboard)
			})

			r.Route("/feed", func(fr chi.Router) {
				fr.Get("/following", socialH.GetFollowingFeed)
			})

			r.Route("/orgs", func(or chi.Router) {
				or.Post("/", orgsH.Create)
				or.Get("/", orgsH.List)
				or.Get("/{id}/feed", orgsH.GetFeed)
				or.Post("/{id}/members", orgsH.AddMember)

				or.Route("/{id}/discovery", func(dr chi.Router) {
					dr.Get("/trending", orgsH.GetDiscoveryTrending)
					dr.Get("/recommendations", orgsH.GetRecommendations)
				})

				or.Group(func(or chi.Router) {
					or.Use(mw.RequireOrgPermission(st, "org:admin"))
					or.Get("/{id}/insights", orgsH.GetInsights)
					or.Post("/{id}/scim/token", orgsH.GenerateSCIMToken)
				})
			})

			r.Route("/onboarding", func(onr chi.Router) {
				onr.Get("/kits", onboardingH.ListKits)
				onr.Post("/install", onboardingH.InstallKit)
			})

			r.Route("/items", func(ir chi.Router) {
				ir.Post("/capture", captureH.Capture)
				ir.Post("/preview", previewH.Preview)
				ir.Post("/check", itemsH.Check)
				ir.Get("/", itemsH.List)
				ir.Get("/tags", itemsH.ListTags)
				ir.Get("/{id}", itemsH.Get)
				ir.Patch("/{id}", itemsH.Update)
				ir.Delete("/{id}", itemsH.Delete)

				ir.Group(func(ir chi.Router) {
					ir.Use(mw.IARateLimit(100, 10))
					ir.Post("/{id}/ai-enrich", itemsH.AIEnrich)
				})

				ir.Patch("/{id}/ai-tags", itemsH.ReviewAITags)
				ir.Post("/{id}/seen", itemsH.MarkSeen)
				ir.Get("/{id}/related", relatedH.Related)

				// Runbooks (contextual to item)
				ir.Get("/{id}/runbooks", runbooksH.List)
				ir.Post("/{id}/runbooks", runbooksH.Create)
			})

			r.Group(func(ir chi.Router) {
				ir.Use(mw.IARateLimit(100, 10))
				ir.Post("/ask", askH.Ask)
			})

			r.Route("/runbooks/{id}", func(r chi.Router) {
				r.Patch("/", runbooksH.Update)
				r.Delete("/", runbooksH.Delete)
				r.Post("/steps", runbooksH.CreateStep)
				r.Post("/steps/reorder", runbooksH.ReorderSteps)
			})

			r.Route("/runbook-steps/{id}", func(r chi.Router) {
				r.Patch("/", runbooksH.UpdateStep)
				r.Delete("/", runbooksH.DeleteStep)
			})

			r.Post("/sync/batch", syncH.BatchSync)
			r.Get("/sync/delta", syncH.Delta)

			r.Get("/me/devices", devicesH.List)
			r.Post("/me/devices/register", devicesH.Register)
			r.Delete("/me/devices/{clientId}", devicesH.Delete)

			r.Route("/me/notifications", func(nr chi.Router) {
				nr.Get("/", notificationsH.List)
				nr.Get("/count", notificationsH.Count)
				nr.Post("/read-all", notificationsH.MarkAllRead)
				nr.Patch("/{id}/read", notificationsH.MarkRead)
			})

			r.Route("/me/keys", func(kr chi.Router) {
				kr.Get("/", keysH.List)
				kr.Post("/", keysH.Create)
				kr.Delete("/{id}", keysH.Delete)
			})

			r.Route("/me/enrichers", func(er chi.Router) {
				er.Get("/", enrichersH.List)
				er.Post("/", enrichersH.Create)
				er.Delete("/{id}", enrichersH.Delete)
			})

			r.Post("/agent/chat", agentH.Chat)

			r.Route("/me/webhooks", func(wr chi.Router) {
				wr.Get("/", webhooksH.List)
				wr.Post("/", webhooksH.Create)
				wr.Delete("/{id}", webhooksH.Delete)
			})

			// Decks (auth required)
			r.Get("/decks", deckH.List)
			r.Post("/decks", deckH.Create)
			r.Get("/decks/{id}", deckH.Get)
			r.Patch("/decks/{id}", deckH.Update)
			r.Delete("/decks/{id}", deckH.Delete)
			r.Post("/decks/{id}/items", deckH.AddItems)
			r.Delete("/decks/{id}/items/{itemId}", deckH.RemoveItem)
			r.Post("/decks/{id}/star", deckH.Star)
			r.Delete("/decks/{id}/star", deckH.Unstar)

			// Circles (auth required)
			r.Route("/circles", func(cr chi.Router) {
				cr.Post("/", circlesH.Create)
				cr.Get("/", circlesH.List)
				cr.Post("/join", circlesH.Join)
				cr.Get("/{id}", circlesH.Get)
				cr.Get("/{id}/items", circlesH.ListItems)
				cr.Post("/{id}/share", circlesH.ShareItem)
				cr.Get("/{id}/members", circlesH.ListMembers)
				cr.Delete("/{id}/members", circlesH.Leave)
			})

			// Deck import (auth required)
			r.Post("/decks/{id}/import", importH.Import)

			r.Route("/admin", func(ar chi.Router) {
				ar.Use(mw.RequireAdmin)
				ar.Get("/users", adminH.ListUsers)
				ar.Get("/waitlist", invitesH.ListWaitlist)
				ar.Get("/invites", invitesH.ListInvites)
				ar.Post("/invites", invitesH.CreateInvite)
			})
		})

		// Public deck (no auth)
		r.Get("/decks/{slug}/public", publicDeckH.Get)
		r.Get("/realtime/{roomID}", realtimeH.Connect)

		// Public profile (no auth)
		r.Get("/users/{username}/public", profileH.GetPublic)
		r.Get("/users/{username}/public/decks", profileH.GetPublicDecks)

		// Social (auth required)
		r.Group(func(r chi.Router) {
			r.Use(mw.TokenAuth(cfg, as, st))
			r.Post("/users/{username}/follow", socialH.Follow)
			r.Delete("/users/{username}/follow", socialH.Unfollow)
		})
	})

	// ─── SCIM 2.0 ───
	r.Route("/scim/v2", func(sr chi.Router) {
		sr.Use(mw.SCIMAuth(st))
		sr.Route("/Users", func(ur chi.Router) {
			ur.Get("/", scimH.ListUsers)
			ur.Post("/", scimH.CreateUser)
			ur.Delete("/{id}", scimH.DeleteUser)
		})
	})

	return r
}
