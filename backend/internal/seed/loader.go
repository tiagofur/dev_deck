// Package seed loads cheatsheet JSON files from disk into the database.
//
// Enabled via SEED_CHEATSHEETS=true. Idempotent — skips already-seeded
// cheatsheets (matched by slug). Safe to run on every boot.
package seed

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"log/slog"
	"path/filepath"
	"sort"

	"devdeck/internal/domain/cheatsheets"
	"devdeck/internal/store"
)

// LoadCheatsheets reads all .json files from the embedded seeds directory
// and upserts them into the database.
func LoadCheatsheets(ctx context.Context, st *store.Store, seedsFS fs.FS) error {
	entries, err := fs.ReadDir(seedsFS, "cheatsheets")
	if err != nil {
		return fmt.Errorf("read seeds dir: %w", err)
	}

	// Sort for deterministic order in logs.
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	loaded := 0
	skipped := 0
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		raw, err := fs.ReadFile(seedsFS, "cheatsheets/"+e.Name())
		if err != nil {
			slog.Warn("seed: read failed", "err", err, "file", e.Name())
			continue
		}
		var sc cheatsheets.SeedCheatsheet
		if err := json.Unmarshal(raw, &sc); err != nil {
			slog.Warn("seed: parse failed", "err", err, "file", e.Name())
			continue
		}
		if sc.Slug == "" {
			slog.Warn("seed: missing slug, skipping", "file", e.Name())
			continue
		}

		before, _ := st.GetCheatsheetBySlug(ctx, sc.Slug)
		if err := st.SeedCheatsheet(ctx, sc); err != nil {
			slog.Warn("seed: insert failed", "err", err, "slug", sc.Slug)
			continue
		}
		if before == nil {
			loaded++
			slog.Info("seed: loaded", "slug", sc.Slug, "entries", len(sc.Entries))
		} else {
			skipped++
		}
	}

	slog.Info("seed: cheatsheets done", "loaded", loaded, "skipped", skipped)
	return nil
}
