package testutil

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSplitSQLStatements(t *testing.T) {
	tests := []struct {
		name string
		sql  string
		want []string
	}{
		{
			name: "simple statements",
			sql:  "CREATE TABLE a (id int); INSERT INTO a VALUES (1);",
			want: []string{
				"CREATE TABLE a (id int)",
				"INSERT INTO a VALUES (1)",
			},
		},
		{
			name: "function body with semicolons",
			sql: strings.TrimSpace(`
CREATE FUNCTION demo() RETURNS void AS $$
BEGIN
    PERFORM 1;
    PERFORM 2;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE demo_log (id int);
`),
			want: []string{
				strings.TrimSpace(`
CREATE FUNCTION demo() RETURNS void AS $$
BEGIN
    PERFORM 1;
    PERFORM 2;
END;
$$ LANGUAGE plpgsql`),
				"CREATE TABLE demo_log (id int)",
			},
		},
		{
			name: "strings and comments with semicolons",
			sql: strings.TrimSpace(`
-- comment ; ignored
INSERT INTO demo VALUES ('semi;colon');
/* block; comment */
INSERT INTO demo VALUES ('another');
`),
			want: []string{
				strings.TrimSpace(`
-- comment ; ignored
INSERT INTO demo VALUES ('semi;colon')`),
				strings.TrimSpace(`
/* block; comment */
INSERT INTO demo VALUES ('another')`),
			},
		},
		{
			name: "named dollar tag",
			sql: strings.TrimSpace(`
DO $mig$
BEGIN
    RAISE NOTICE 'hello';
END;
$mig$;
SELECT 1;
`),
			want: []string{
				strings.TrimSpace(`
DO $mig$
BEGIN
    RAISE NOTICE 'hello';
END;
$mig$`),
				"SELECT 1",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := splitSQLStatements(tt.sql)
			if len(got) != len(tt.want) {
				t.Fatalf("got %d statements, want %d: %#v", len(got), len(tt.want), got)
			}
			for i := range tt.want {
				if got[i] != tt.want[i] {
					t.Fatalf("statement %d mismatch\nwant:\n%s\n\ngot:\n%s", i, tt.want[i], got[i])
				}
			}
		})
	}
}

func TestStripGooseDown(t *testing.T) {
	sql := "-- +goose Up\nSELECT 1;\n-- +goose Down\nSELECT 2;"
	got := stripGooseDown(sql)
	want := "-- +goose Up\nSELECT 1;\n"
	if got != want {
		t.Fatalf("stripGooseDown mismatch\nwant:\n%s\n\ngot:\n%s", want, got)
	}
}

func TestSplitRealProblemMigrations(t *testing.T) {
	dir, err := migrationsDir()
	if err != nil {
		t.Fatalf("migrationsDir: %v", err)
	}

	tests := []struct {
		file         string
		minStatements int
		mustContain  []string
	}{
		{
			file:         "0012_semantic_search.sql",
			minStatements: 5,
			mustContain: []string{
				"CREATE OR REPLACE FUNCTION compute_query_embedding",
				"CREATE OR REPLACE FUNCTION hybrid_search",
			},
		},
		{
			file:         "0013_offline_sync.sql",
			minStatements: 10,
			mustContain: []string{
				"CREATE TYPE operation_type AS ENUM",
				"CREATE TYPE entity_type AS ENUM",
				"CREATE TABLE IF NOT EXISTS sync_log",
				"CREATE OR REPLACE FUNCTION process_sync_batch",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.file, func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join(dir, tt.file))
			if err != nil {
				t.Fatalf("read migration: %v", err)
			}

			statements := splitSQLStatements(stripGooseDown(string(data)))
			if len(statements) < tt.minStatements {
				t.Fatalf("got %d statements, want at least %d", len(statements), tt.minStatements)
			}

			joined := strings.Join(statements, "\n---\n")
			for _, needle := range tt.mustContain {
				if !strings.Contains(joined, needle) {
					t.Fatalf("expected split output to contain %q", needle)
				}
			}
		})
	}
}
