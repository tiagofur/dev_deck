package testutil

import (
	"errors"
	"path/filepath"
	"runtime"
	"strings"
)

func stripGooseDown(sql string) string {
	idx := strings.Index(sql, "-- +goose Down")
	if idx == -1 {
		return sql
	}
	return sql[:idx]
}

// splitSQLStatements splits a migration into executable SQL statements while
// respecting single-quoted strings, dollar-quoted blocks, line comments, and
// block comments so semicolons inside function bodies don't terminate early.
func splitSQLStatements(sql string) []string {
	var statements []string
	var current strings.Builder

	inSingleQuote := false
	inLineComment := false
	inBlockComment := false
	dollarTag := ""

	flush := func() {
		stmt := strings.TrimSpace(current.String())
		if stmt != "" {
			statements = append(statements, stmt)
		}
		current.Reset()
	}

	for i := 0; i < len(sql); i++ {
		ch := sql[i]

		if inLineComment {
			current.WriteByte(ch)
			if ch == '\n' {
				inLineComment = false
			}
			continue
		}

		if inBlockComment {
			current.WriteByte(ch)
			if ch == '*' && i+1 < len(sql) && sql[i+1] == '/' {
				current.WriteByte(sql[i+1])
				i++
				inBlockComment = false
			}
			continue
		}

		if dollarTag != "" {
			if strings.HasPrefix(sql[i:], dollarTag) {
				current.WriteString(dollarTag)
				i += len(dollarTag) - 1
				dollarTag = ""
				continue
			}
			current.WriteByte(ch)
			continue
		}

		if inSingleQuote {
			current.WriteByte(ch)
			if ch == '\'' {
				if i+1 < len(sql) && sql[i+1] == '\'' {
					current.WriteByte(sql[i+1])
					i++
					continue
				}
				inSingleQuote = false
			}
			continue
		}

		if ch == '-' && i+1 < len(sql) && sql[i+1] == '-' {
			current.WriteByte(ch)
			current.WriteByte(sql[i+1])
			i++
			inLineComment = true
			continue
		}

		if ch == '/' && i+1 < len(sql) && sql[i+1] == '*' {
			current.WriteByte(ch)
			current.WriteByte(sql[i+1])
			i++
			inBlockComment = true
			continue
		}

		if ch == '\'' {
			current.WriteByte(ch)
			inSingleQuote = true
			continue
		}

		if ch == '$' {
			if tag := readDollarTag(sql[i:]); tag != "" {
				current.WriteString(tag)
				i += len(tag) - 1
				dollarTag = tag
				continue
			}
		}

		if ch == ';' {
			flush()
			continue
		}

		current.WriteByte(ch)
	}

	flush()
	return statements
}

func readDollarTag(s string) string {
	if len(s) < 2 || s[0] != '$' {
		return ""
	}
	for i := 1; i < len(s); i++ {
		ch := s[i]
		if ch == '$' {
			return s[:i+1]
		}
		if !(ch == '_' || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) {
			return ""
		}
	}
	return ""
}

func migrationsDir() (string, error) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("runtime.Caller failed")
	}
	// internal/testutil/sqlsplit.go → backend/migrations
	dir := filepath.Join(filepath.Dir(file), "..", "..", "migrations")
	abs, err := filepath.Abs(dir)
	if err != nil {
		return "", err
	}
	return abs, nil
}
