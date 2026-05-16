package testutil

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	migrationsSQL  []string
	migrationsOnce sync.Once
	migrationsErr  error
)

func waitReady(ctx context.Context, pool *pgxpool.Pool) error {
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		err := pool.Ping(pingCtx)
		cancel()
		if err == nil {
			return nil
		}
		time.Sleep(200 * time.Millisecond)
	}
	return errors.New("postgres pool never became ready")
}

func applyMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	migrationsOnce.Do(func() {
		// Nuclear option for persistent test DBs: wipe the schema first.
		if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`); err != nil {
			migrationsErr = fmt.Errorf("failed to wipe public schema: %w", err)
			return
		}

		if len(migrationsSQL) == 0 {
			dir, err := migrationsDir()
			if err != nil {
				migrationsErr = err
				return
			}
			entries, err := os.ReadDir(dir)
			if err != nil {
				migrationsErr = err
				return
			}
			var files []string
			for _, e := range entries {
				if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
					files = append(files, filepath.Join(dir, e.Name()))
				}
			}
			sort.Strings(files)
			for _, f := range files {
				data, err := os.ReadFile(f)
				if err != nil {
					migrationsErr = err
					return
				}
				migrationsSQL = append(migrationsSQL, string(data))
			}
		}
		for _, sql := range migrationsSQL {
			up := stripGooseDown(sql)
			for _, stmt := range splitSQLStatements(up) {
				if _, err := pool.Exec(ctx, stmt); err != nil {
					migrationsErr = fmt.Errorf("migration failed: %v\nSQL: %s", err, stmt)
					return
				}
			}
		}
	})
	return migrationsErr
}

func truncateAll(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `
		TRUNCATE TABLE
			deck_stars,
			deck_items,
			decks,
			items,
			refresh_sessions,
			repo_cheatsheet_links,
			cheatsheet_entries,
			cheatsheets,
			repo_commands,
			repos,
			users,
			app_state
		RESTART IDENTITY CASCADE
	`); err != nil {
		return err
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO users (id, github_id, login, display_name)
		VALUES ('00000000-0000-0000-0000-000000000001', -1, 'devdeck-test', 'Test User')
		ON CONFLICT DO NOTHING
	`)
	return err
}
