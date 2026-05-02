//go:build !(darwin && arm64)

// Package testutil provides shared test infrastructure.
//
// The Postgres helper boots a real Postgres container via testcontainers-go,
// applies all SQL migrations under backend/migrations, and returns a ready-to-use
// pgxpool.Pool. Tests that don't have access to a Docker daemon are skipped
// instead of failing — this lets `go test ./...` stay green on environments
// without Docker, while CI runs the full suite.
package testutil

import (
	"context"
	"errors"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	defaultPGImage = "postgres:16-alpine"
	defaultPGUser  = "devdeck_test"
	defaultPGPass  = "devdeck_test"
	defaultPGDB    = "devdeck_test"
)

// container holds a single shared Postgres container reused across tests
// in the same `go test` invocation, plus the migrations SQL.
var (
	sharedMu        sync.Mutex
	sharedContainer *tcpostgres.PostgresContainer
	sharedDSN       string
	migrationsSQL   []string
	migrationsOnce  sync.Once
	migrationsErr   error
)

// SetupPostgres returns a pgxpool.Pool connected to a Postgres instance with
// all DevDeck migrations applied. Each call returns a fresh pool against a
// truncated DB so tests don't see each other's rows.
//
// If Docker isn't reachable (no daemon, no permission, etc.), the test is
// skipped — it's a "best-effort" integration setup. Set DEVDECK_REQUIRE_DB=1
// to fail instead of skip (used by CI to enforce coverage).
func SetupPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()

	if testing.Short() {
		t.Skip("skipping DB-backed test in -short mode")
	}

	pool, err := acquirePool(t)
	if err != nil {
		if os.Getenv("DEVDECK_REQUIRE_DB") == "1" {
			t.Fatalf("DEVDECK_REQUIRE_DB=1 but DB setup failed: %v", err)
		}
		t.Skipf("skipping: postgres testcontainer unavailable: %v", err)
	}

	// Truncate all data so each test starts from a clean slate. Migrations
	// are only applied once per process via sync.Once inside acquirePool.
	if err := truncateAll(context.Background(), pool); err != nil {
		t.Fatalf("truncate all tables: %v", err)
	}

	t.Cleanup(func() {
		pool.Close()
	})
	return pool
}

func acquirePool(t *testing.T) (*pgxpool.Pool, error) {
	sharedMu.Lock()
	defer sharedMu.Unlock()

	ctx := context.Background()
	if sharedContainer == nil {
		if err := preflightDocker(ctx); err != nil {
			return nil, err
		}
		c, err := tcpostgres.Run(ctx,
			defaultPGImage,
			tcpostgres.WithDatabase(defaultPGDB),
			tcpostgres.WithUsername(defaultPGUser),
			tcpostgres.WithPassword(defaultPGPass),
			testcontainers.WithWaitStrategy(
				wait.ForLog("database system is ready to accept connections").
					WithOccurrence(2).
					WithStartupTimeout(60*time.Second),
			),
		)
		if err != nil {
			return nil, err
		}
		dsn, err := c.ConnectionString(ctx, "sslmode=disable")
		if err != nil {
			_ = c.Terminate(ctx)
			return nil, err
		}
		sharedContainer = c
		sharedDSN = dsn
	}

	pool, err := pgxpool.New(ctx, sharedDSN)
	if err != nil {
		return nil, err
	}
	if err := waitReady(ctx, pool); err != nil {
		pool.Close()
		return nil, err
	}
	if err := applyMigrations(ctx, pool); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

// preflightDocker fails fast on environments where the Docker socket is
// missing, so testcontainers-go doesn't waste 30s scanning for daemons.
func preflightDocker(_ context.Context) error {
	// Honor explicit DOCKER_HOST first.
	if host := os.Getenv("DOCKER_HOST"); host != "" {
		return nil
	}
	candidates := []string{"/var/run/docker.sock"}
	if runtime.GOOS == "darwin" {
		if home := os.Getenv("HOME"); home != "" {
			candidates = append(candidates, filepath.Join(home, ".docker", "run", "docker.sock"))
		}
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			// Try a quick connect to make sure the daemon is actually up.
			conn, derr := net.DialTimeout("unix", p, 2*time.Second)
			if derr == nil {
				_ = conn.Close()
				return nil
			}
		}
	}
	return errors.New("no docker daemon reachable (set DOCKER_HOST or start docker)")
}

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

// applyMigrations runs every backend/migrations/*.sql file once per process.
// SQL files are loaded relative to this source file so callers don't need to
// know the working directory.
func applyMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	migrationsOnce.Do(func() {
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
			// goose markers (-- +goose Up / Down) are harmless to plain Postgres
			// only when we strip the Down section. Keep just the Up half.
			up := stripGooseDown(sql)
			if _, err := pool.Exec(ctx, up); err != nil {
				migrationsErr = err
				return
			}
		}
	})
	return migrationsErr
}

func stripGooseDown(sql string) string {
	idx := strings.Index(sql, "-- +goose Down")
	if idx == -1 {
		return sql
	}
	return sql[:idx]
}

func migrationsDir() (string, error) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("runtime.Caller failed")
	}
	// internal/testutil/postgres.go → backend/migrations
	dir := filepath.Join(filepath.Dir(file), "..", "..", "migrations")
	abs, err := filepath.Abs(dir)
	if err != nil {
		return "", err
	}
	return abs, nil
}

// truncateAll wipes user data between tests. We use TRUNCATE … RESTART IDENTITY
// CASCADE so refresh sessions, links, etc. all get cleared atomically.
func truncateAll(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `
		TRUNCATE TABLE
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

	// Re-seed the Test User used by handlers_test.go / middleware
	_, err := pool.Exec(ctx, `
		INSERT INTO users (id, github_id, login, display_name)
		VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'devdeck-test', 'Test User')
		ON CONFLICT DO NOTHING
	`)
	return err
}
