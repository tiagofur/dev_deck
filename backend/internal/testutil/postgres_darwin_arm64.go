//go:build darwin && arm64

package testutil

import (
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupPostgres is stubbed on macOS arm64 because testcontainers-go pulls in
// github.com/shoenig/go-m1cpu during init, which currently crashes locally with
// a SIGSEGV before tests can even decide to skip. CI/Linux still runs the real
// integration helper from postgres.go.
func SetupPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	t.Skip("skipping DB-backed test on darwin/arm64: testcontainers-go crashes in go-m1cpu during init")
	return nil
}
