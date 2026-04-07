package http

import (
	"net/http"

	"devdeck/internal/authservice"
	"devdeck/internal/config"
	"devdeck/internal/enricher"
	"devdeck/internal/http/handlers"
	mw "devdeck/internal/http/middleware"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(cfg config.Config, st *store.Store, en *enricher.Service, as *authservice.Service) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(mw.Logger)
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

	// ─── Wave 4: Auth routes (public) ───
	var authH *handlers.AuthHandler
	if cfg.AuthMode == "jwt" && as != nil {
		authH = handlers.NewAuthHandler(st, as, handlers.AuthConfig{
			GitHubClientID:     cfg.GitHubClientID,
			GitHubClientSecret: cfg.GitHubClientSecret,
			RedirectURL:        cfg.OAuthRedirectURL,
			AllowedLogins:      cfg.AllowedLoginsMap(),
		})
		r.Route("/api/auth", func(ar chi.Router) {
			ar.Get("/github/login", authH.GitHubLogin)
			ar.Get("/github/callback", authH.GitHubCallback)
			ar.Post("/refresh", authH.Refresh)
			ar.Post("/logout", authH.Logout)
			// /me requires JWT
			ar.Group(func(ar chi.Router) {
				ar.Use(mw.JWTAuth(as))
				ar.Get("/me", authH.Me)
			})
		})
	}

	// Authenticated /api
	reposH := handlers.NewReposHandler(st, en)
	statsH := handlers.NewStatsHandler(st)
	discoveryH := handlers.NewDiscoveryHandler(st)
	commandsH := handlers.NewCommandsHandler(st)
	cheatsH := handlers.NewCheatsheetsHandler(st)

	r.Route("/api", func(api chi.Router) {
		api.Use(mw.TokenAuth(cfg, as))

		api.Route("/repos", func(rr chi.Router) {
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
		api.Route("/cheatsheets", func(cr chi.Router) {
			cr.Get("/", cheatsH.List)
			cr.Post("/", cheatsH.Create)
			cr.Get("/{id}", cheatsH.Get)
			cr.Patch("/{id}", cheatsH.Update)
			cr.Delete("/{id}", cheatsH.Delete)

			// Entries
			cr.Get("/{id}/entries", cheatsH.ListEntries)
			cr.Post("/{id}/entries", cheatsH.CreateEntry)
			cr.Patch("/{id}/entries/{entryId}", cheatsH.UpdateEntry)
			cr.Delete("/{id}/entries/{entryId}", cheatsH.DeleteEntry)
		})

		// 🌊3 — global search
		api.Get("/search", cheatsH.Search)

		api.Get("/stats", statsH.Get)
		api.Get("/discovery/next", discoveryH.Next)
	})

	return r
}
