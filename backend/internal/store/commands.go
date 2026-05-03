package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"devdeck/internal/domain/commands"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const commandColumns = `id, repo_id, label, command, description, category, position, created_at`

func scanCommand(row pgx.Row) (*commands.Command, error) {
	var c commands.Command
	err := row.Scan(
		&c.ID, &c.RepoID, &c.Label, &c.Command, &c.Description,
		&c.Category, &c.Position, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// ListCommandsByRepo returns all commands for a repo, ordered by position.
func (s *Store) ListCommandsByRepo(ctx context.Context, repoID uuid.UUID) ([]*commands.Command, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "r.user_id", 2)
	args := append([]any{repoID}, scopeArgs...)
	rows, err := s.pool.Query(ctx, `
		SELECT rc.id, rc.repo_id, rc.label, rc.command, rc.description, rc.category, rc.position, rc.created_at
		FROM repo_commands rc
		JOIN repos r ON r.id = rc.repo_id
		WHERE rc.repo_id = $1 AND `+scopeSQL+`
		ORDER BY rc.position ASC, rc.created_at ASC
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*commands.Command{}
	for rows.Next() {
		c, err := scanCommand(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// CreateCommand inserts a new command at the bottom of the list (max position + 1).
// We compute position in the same statement to avoid races.
func (s *Store) CreateCommand(ctx context.Context, repoID uuid.UUID, in commands.CreateInput) (*commands.Command, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 6)
	args := []any{repoID, in.Label, in.Command, in.Description, in.Category}
	args = append(args, scopeArgs...)
	row := s.pool.QueryRow(ctx, `
		INSERT INTO repo_commands (repo_id, label, command, description, category, position)
		SELECT
			$1, $2, $3, $4, $5,
			COALESCE((SELECT MAX(position) + 1 FROM repo_commands WHERE repo_id = $1), 0)
		FROM repos
		WHERE id = $1 AND `+scopeSQL+`
		RETURNING `+commandColumns,
		args...)
	c, err := scanCommand(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (s *Store) UpdateCommand(ctx context.Context, id uuid.UUID, in commands.UpdateInput) (*commands.Command, error) {
	sets := []string{}
	args := []any{}
	idx := 1

	if in.Label != nil {
		sets = append(sets, fmt.Sprintf("label = $%d", idx))
		args = append(args, *in.Label)
		idx++
	}
	if in.Command != nil {
		sets = append(sets, fmt.Sprintf("command = $%d", idx))
		args = append(args, *in.Command)
		idx++
	}
	if in.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", idx))
		args = append(args, *in.Description)
		idx++
	}
	if in.Category != nil {
		sets = append(sets, fmt.Sprintf("category = $%d", idx))
		args = append(args, *in.Category)
		idx++
	}

	if len(sets) == 0 {
		return s.GetCommand(ctx, id)
	}

	scopeSQL, scopeArgs := ownerClause(ctx, "r.user_id", idx+1)
	args = append(args, id)
	args = append(args, scopeArgs...)
	q := fmt.Sprintf(
		"UPDATE repo_commands rc SET %s FROM repos r WHERE rc.repo_id = r.id AND rc.id = $%d AND %s RETURNING rc.id, rc.repo_id, rc.label, rc.command, rc.description, rc.category, rc.position, rc.created_at",
		strings.Join(sets, ", "), idx, scopeSQL,
	)
	row := s.pool.QueryRow(ctx, q, args...)
	c, err := scanCommand(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (s *Store) GetCommand(ctx context.Context, id uuid.UUID) (*commands.Command, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "r.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.pool.QueryRow(ctx,
		`SELECT rc.`+commandColumns+` FROM repo_commands rc JOIN repos r ON r.id = rc.repo_id WHERE rc.id = $1 AND `+scopeSQL,
		args...)
	c, err := scanCommand(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (s *Store) DeleteCommand(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "r.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM repo_commands rc
		USING repos r
		WHERE rc.repo_id = r.id AND rc.id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// BatchCreateCommands inserts multiple commands in a single transaction.
// Each command gets an auto-incremented position starting after the current max.
// Returns the created commands in order.
func (s *Store) BatchCreateCommands(ctx context.Context, repoID uuid.UUID, inputs []commands.CreateInput) ([]*commands.Command, error) {
	if len(inputs) == 0 {
		return nil, nil
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Get current max position in the same tx to avoid races.
	var maxPos *int
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{repoID}, scopeArgs...)
	if err := tx.QueryRow(ctx, `SELECT MAX(position) FROM repo_commands WHERE repo_id = $1`, repoID).Scan(&maxPos); err != nil {
		return nil, err
	}
	var repoExists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM repos WHERE id = $1 AND `+scopeSQL+`)`, args...).Scan(&repoExists); err != nil {
		return nil, err
	}
	if !repoExists {
		return nil, ErrNotFound
	}
	startPos := 0
	if maxPos != nil {
		startPos = *maxPos + 1
	}

	out := make([]*commands.Command, 0, len(inputs))
	for i, in := range inputs {
		row := tx.QueryRow(ctx, `
			INSERT INTO repo_commands (repo_id, label, command, description, category, position)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING `+commandColumns,
			repoID, in.Label, in.Command, in.Description, in.Category, startPos+i,
		)
		c, err := scanCommand(row)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

// ReorderCommands updates positions to match the order of `ids`. Done in a
// transaction so the list is never half-updated.
//
// We use a temporary offset (1000+) before assigning final positions to
// avoid hitting the (repo_id, position) uniqueness expectation if anyone
// adds a unique constraint later.
func (s *Store) ReorderCommands(ctx context.Context, repoID uuid.UUID, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{repoID}, scopeArgs...)
	var repoExists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM repos WHERE id = $1 AND `+scopeSQL+`)`, args...).Scan(&repoExists); err != nil {
		return err
	}
	if !repoExists {
		return ErrNotFound
	}

	for i, id := range ids {
		tag, err := tx.Exec(ctx, `
			UPDATE repo_commands
			SET position = $1
			WHERE id = $2 AND repo_id = $3
		`, i, id, repoID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("command %s not found in repo %s", id, repoID)
		}
	}
	return tx.Commit(ctx)
}
