//go:build darwin && arm64

package testutil

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupPostgres on darwin/arm64 normally skips due to testcontainers-go crashes
// during init (SIGSEGV in go-m1cpu). However, if DEVDECK_TEST_DB_URL is set,
// we bypass testcontainers and use the provided local instance.
func SetupPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("DEVDECK_TEST_DB_URL")
	if dsn == "" {
		t.Skip("skipping DB-backed test on darwin/arm64: testcontainers-go crashes in go-m1cpu during init. Set DEVDECK_TEST_DB_URL to run anyway.")
		return nil
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to connect to local test DB: %v", err)
	}

	if err := waitReady(ctx, pool); err != nil {
		t.Fatalf("local test DB never became ready: %v", err)
	}

	if err := applyMigrations(ctx, pool); err != nil {
		t.Fatalf("failed to apply migrations to local test DB: %v", err)
	}

	if err := truncateAll(ctx, pool); err != nil {
		t.Fatalf("truncate all tables: %v", err)
	}

	t.Cleanup(func() {
		pool.Close()
	})
	return pool
}
