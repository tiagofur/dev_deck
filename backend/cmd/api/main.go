package main

import (
	"context"
	"embed"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"devdeck/internal/ai"
	"devdeck/internal/authservice"
	"devdeck/internal/config"
	"devdeck/internal/cron"
	"devdeck/internal/email"
	"devdeck/internal/enricher"
	httpapi "devdeck/internal/http"
	"devdeck/internal/jobs"
	"devdeck/internal/seed"
	"devdeck/internal/store"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed seeds/cheatsheets/*.json
var seedsFS embed.FS

func main() {
	// Boot the logger as early as possible so we can log config errors.
	logger := newLogger(os.Getenv("LOG_LEVEL"), os.Getenv("LOG_FORMAT"))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		logger.Error("config load failed", "err", err)
		os.Exit(1)
	}

	// If the config specified a level (default "info"), apply it now.
	logger = newLogger(cfg.LogLevel, os.Getenv("LOG_FORMAT"))
	slog.SetDefault(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// DB pool
	pool, err := pgxpool.New(ctx, cfg.DBURL)
	if err != nil {
		logger.Error("db connect failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	pingCtx, pingCancel := context.WithTimeout(ctx, 5*time.Second)
	if err := pool.Ping(pingCtx); err != nil {
		pingCancel()
		logger.Error("db ping failed", "err", err)
		os.Exit(1)
	}
	pingCancel()
	logger.Info("connected to postgres")

	st := store.New(pool)
	en := enricher.New(cfg.GithubToken)
	aiSvc := ai.NewFromConfig(cfg)

	// Email sender (Local Auth)
	var emailSender email.Sender = &email.NoopSender{}
	if cfg.LocalAuthEnabled && cfg.ResendAPIKey != "" {
		emailSender = email.NewResendSender(cfg.ResendAPIKey)
		logger.Info("email sender (Resend) initialized")
	}

	// JWT auth service (Wave 4). Only active when AUTH_MODE=jwt.
	var authService *authservice.Service
	if cfg.AuthMode == "jwt" {
		if cfg.JWTSecret == "" {
			logger.Error("JWT_SECRET is required when AUTH_MODE=jwt")
			os.Exit(1)
		}
		authService = authservice.New(cfg.JWTSecret, 30*24*time.Hour, 90*24*time.Hour) // 30d access, 90d refresh
		logger.Info("JWT auth initialized")
	}

	// Seed cheatsheets if enabled (idempotent — safe on every boot).
	// fs.Sub strips the "seeds/" prefix so the loader sees "cheatsheets/<file>".
	if cfg.SeedCheatsheets {
		subFS, subErr := fs.Sub(seedsFS, "seeds")
		if subErr != nil {
			logger.Warn("seed fs.Sub failed (continuing)", "err", subErr)
		} else {
			if err := seed.LoadCheatsheets(ctx, st, subFS); err != nil {
				logger.Warn("seed cheatsheets failed (continuing)", "err", err)
			}
		}
	}

	// Background enrich queue (Wave 4.5 §16.9) — handlers that need
	// async metadata fetches (capture + create repo) push jobs here.
	enrichQueue := jobs.NewEnrichQueue(st, en, aiSvc, 128)
	enrichQueue.Start(ctx)

	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		Enricher:    en,
		AuthService: authService,
		EnrichQueue: enrichQueue,
		EmailSender: emailSender,
	})

	// Background refresher: re-enriches stale repos so stars/desc don't drift.
	staleAfter := time.Duration(cfg.RefreshIntervalHours) * time.Hour
	refresher := cron.NewRefresher(st, en, staleAfter)
	refresher.Start(ctx)
	logger.Info("enricher + refresher initialized",
		"stale_after", staleAfter,
		"github_token", cfg.GithubToken != "",
		"ai_provider", cfg.AIProvider,
	)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		logger.Info("server starting", "addr", srv.Addr, "auth_mode", cfg.AuthMode)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	logger.Info("shutdown signal received")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown error", "err", err)
	}
	logger.Info("bye")
}

// newLogger builds a slog.Logger. Format is controlled by LOG_FORMAT
// (either "json" or "text", default "text" in dev, "json" when stdout isn't
// a TTY). Level comes from LOG_LEVEL ("debug"|"info"|"warn"|"error").
func newLogger(level, format string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	opts := &slog.HandlerOptions{Level: lvl}
	var handler slog.Handler
	if strings.ToLower(format) == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}
	return slog.New(handler)
}
