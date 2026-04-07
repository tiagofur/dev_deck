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
	"path/filepath"
	"sort"

	"devdeck/internal/domain/cheatsheets"
	"devdeck/internal/store"

	"github.com/rs/zerolog/log"
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
			log.Warn().Err(err).Str("file", e.Name()).Msg("seed: read failed")
			continue
		}
		var sc cheatsheets.SeedCheatsheet
		if err := json.Unmarshal(raw, &sc); err != nil {
			log.Warn().Err(err).Str("file", e.Name()).Msg("seed: parse failed")
			continue
		}
		if sc.Slug == "" {
			log.Warn().Str("file", e.Name()).Msg("seed: missing slug, skipping")
			continue
		}

		before, _ := st.GetCheatsheetBySlug(ctx, sc.Slug)
		if err := st.SeedCheatsheet(ctx, sc); err != nil {
			log.Warn().Err(err).Str("slug", sc.Slug).Msg("seed: insert failed")
			continue
		}
		if before == nil {
			loaded++
			log.Info().Str("slug", sc.Slug).Int("entries", len(sc.Entries)).Msg("seed: loaded")
		} else {
			skipped++
		}
	}

	log.Info().Int("loaded", loaded).Int("skipped", skipped).Msg("seed: cheatsheets done")
	return nil
}
