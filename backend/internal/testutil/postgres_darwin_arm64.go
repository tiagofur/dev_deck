//go:build darwin && arm64

package testutil

import (
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupPostgres is a darwin/arm64-specific stub.
//
// testcontainers-go currently pulls a native dependency chain that crashes
// during package initialization on some macOS Apple Silicon environments
// (`github.com/shoenig/go-m1cpu` via gopsutil). We avoid importing that stack
// entirely on this platform so local `go test` stays usable.
//
// CI runs on Linux and still exercises the real testcontainers-backed helper
// from postgres.go.
func SetupPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()

	msg := "DB-backed tests disabled on darwin/arm64: testcontainers-go pulls a native dependency that crashes during init (go-m1cpu via gopsutil). Run these tests in Linux CI or another non-Apple-Silicon environment."
	if os.Getenv("DEVDECK_REQUIRE_DB") == "1" {
		t.Fatalf(msg)
	}
	t.Skip(msg)
	return nil
}
