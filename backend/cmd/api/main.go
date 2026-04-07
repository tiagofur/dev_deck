package main

import (
	"context"
	"embed"
	"errors"
	"io/fs"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"devdeck/internal/authservice"
	"devdeck/internal/config"
	"devdeck/internal/cron"
	"devdeck/internal/enricher"
	httpapi "devdeck/internal/http"
	"devdeck/internal/seed"
	"devdeck/internal/store"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

//go:embed seeds/cheatsheets/*.json
var seedsFS embed.FS

func main() {
	// Pretty console logging in dev, JSON in prod (toggle via env later if needed)
	zerolog.TimeFieldFormat = time.RFC3339

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config load failed")
	}

	if lvl, err := zerolog.ParseLevel(cfg.LogLevel); err == nil {
		zerolog.SetGlobalLevel(lvl)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// DB pool
	pool, err := pgxpool.New(ctx, cfg.DBURL)
	if err != nil {
		log.Fatal().Err(err).Msg("db connect failed")
	}
	defer pool.Close()

	pingCtx, pingCancel := context.WithTimeout(ctx, 5*time.Second)
	if err := pool.Ping(pingCtx); err != nil {
		pingCancel()
		log.Fatal().Err(err).Msg("db ping failed")
	}
	pingCancel()
	log.Info().Msg("connected to postgres")

	st := store.New(pool)
	en := enricher.New(cfg.GithubToken)

	// JWT auth service (Wave 4). Only active when AUTH_MODE=jwt.
	var authService *authservice.Service
	if cfg.AuthMode == "jwt" {
		if cfg.JWTSecret == "" {
			log.Fatal().Msg("JWT_SECRET is required when AUTH_MODE=jwt")
		}
		authService = authservice.New(cfg.JWTSecret, 30*24*time.Hour, 90*24*time.Hour) // 30d access, 90d refresh
		log.Info().Msg("JWT auth initialized")
	}

	// Seed cheatsheets if enabled (idempotent — safe on every boot).
	// fs.Sub strips the "seeds/" prefix so the loader sees "cheatsheets/<file>".
	if cfg.SeedCheatsheets {
		subFS, subErr := fs.Sub(seedsFS, "seeds")
		if subErr != nil {
			log.Warn().Err(subErr).Msg("seed fs.Sub failed (continuing)")
		} else {
			if err := seed.LoadCheatsheets(ctx, st, subFS); err != nil {
				log.Warn().Err(err).Msg("seed cheatsheets failed (continuing)")
			}
		}
	}

	router := httpapi.NewRouter(cfg, st, en, authService)

	// Background refresher: re-enriches stale repos so stars/desc don't drift.
	staleAfter := time.Duration(cfg.RefreshIntervalHours) * time.Hour
	refresher := cron.NewRefresher(st, en, staleAfter)
	refresher.Start(ctx)
	log.Info().
		Dur("stale_after", staleAfter).
		Bool("github_token", cfg.GithubToken != "").
		Msg("enricher + refresher initialized")

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Info().Str("addr", srv.Addr).Str("auth_mode", cfg.AuthMode).Msg("server starting")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Info().Msg("shutdown signal received")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	log.Info().Msg("bye")
}
