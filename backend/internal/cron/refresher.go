// Package cron runs background workers. Currently just the refresher
// that re-enriches stale repos so stars/descriptions don't drift.
//
// We use plain time.Ticker rather than a full cron lib because we have
// exactly one job and "every N hours" is the only schedule we need.
package cron

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"devdeck/internal/enricher"
	"devdeck/internal/store"
)

type Refresher struct {
	store      *store.Store
	enricher   *enricher.Service
	tickEvery  time.Duration // how often the worker wakes up
	staleAfter time.Duration // how old last_fetched_at must be to count as stale
	batchSize  int
	throttle   time.Duration // delay between API calls to be polite
}

func NewRefresher(s *store.Store, e *enricher.Service, staleAfter time.Duration) *Refresher {
	return &Refresher{
		store:      s,
		enricher:   e,
		tickEvery:  1 * time.Hour,
		staleAfter: staleAfter,
		batchSize:  20,
		throttle:   500 * time.Millisecond,
	}
}

// Start launches the background loop. It returns immediately. The loop
// stops when ctx is canceled.
func (r *Refresher) Start(ctx context.Context) {
	go func() {
		// Small delay to let the server finish booting before the first run.
		time.Sleep(5 * time.Second)
		r.runOnce(ctx)

		t := time.NewTicker(r.tickEvery)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				slog.Info("refresher: shutting down")
				return
			case <-t.C:
				r.runOnce(ctx)
			}
		}
	}()
}

func (r *Refresher) runOnce(ctx context.Context) {
	before := time.Now().Add(-r.staleAfter)
	stale, err := r.store.ListStaleRepos(ctx, before, r.batchSize)
	if err != nil {
		slog.Error("refresher: list stale failed", "err", err)
		return
	}
	if len(stale) == 0 {
		slog.Debug("refresher: no stale repos")
		return
	}
	slog.Info("refresher: refreshing stale repos", "count", len(stale))

	ok, fail := 0, 0
	for _, repo := range stale {
		if ctx.Err() != nil {
			return
		}
		md, err := r.enricher.Enrich(ctx, repo.URL, nil)

		if err != nil {
			fail++
			level := slog.LevelWarn
			if errors.Is(err, enricher.ErrNotFound) {
				level = slog.LevelInfo
			}
			slog.Log(ctx, level, "refresher: enrich failed", "err", err, "url", repo.URL)
			continue
		}
		if _, err := r.store.UpdateMetadata(ctx, repo.ID, md); err != nil {
			fail++
			slog.Warn("refresher: update failed", "err", err, "url", repo.URL)
			continue
		}
		ok++
		// Be polite to upstream APIs
		select {
		case <-ctx.Done():
			return
		case <-time.After(r.throttle):
		}
	}
	slog.Info("refresher: batch done", "ok", ok, "fail", fail)
}
