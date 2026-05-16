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

const commandColumns = `id, item_id, label, command, description, category, position, created_at`

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

// ListCommandsByRepo returns all commands for an item, ordered by position.
func (s *Store) ListCommandsByRepo(ctx context.Context, itemID uuid.UUID) ([]*commands.Command, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "i.user_id", 2)
	args := append([]any{itemID}, scopeArgs...)
	rows, err := s.pool.Query(ctx, `
		SELECT ic.id, ic.item_id, ic.label, ic.command, ic.description, ic.category, ic.position, ic.created_at
		FROM item_commands ic
		JOIN items i ON i.id = ic.item_id
		WHERE ic.item_id = $1 AND `+scopeSQL+`
		ORDER BY ic.position ASC, ic.created_at ASC
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
func (s *Store) CreateCommand(ctx context.Context, itemID uuid.UUID, in commands.CreateInput) (*commands.Command, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 6)
	args := []any{itemID, in.Label, in.Command, in.Description, in.Category}
	args = append(args, scopeArgs...)
	row := s.pool.QueryRow(ctx, `
		INSERT INTO item_commands (item_id, label, command, description, category, position)
		SELECT
			$1, $2, $3, $4, $5,
			COALESCE((SELECT MAX(position) + 1 FROM item_commands WHERE item_id = $1), 0)
		FROM items
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

	scopeSQL, scopeArgs := ownerClause(ctx, "i.user_id", idx+1)
	args = append(args, id)
	args = append(args, scopeArgs...)
	q := fmt.Sprintf(
		"UPDATE item_commands ic SET %s FROM items i WHERE ic.item_id = i.id AND ic.id = $%d AND %s RETURNING ic.id, ic.item_id, ic.label, ic.command, ic.description, ic.category, ic.position, ic.created_at",
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
	scopeSQL, scopeArgs := ownerClause(ctx, "i.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.pool.QueryRow(ctx,
		`SELECT ic.`+commandColumns+` FROM item_commands ic JOIN items i ON i.id = ic.item_id WHERE ic.id = $1 AND `+scopeSQL,
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
	scopeSQL, scopeArgs := ownerClause(ctx, "i.user_id", 2)
	args := append([]any{id}, scopeArgs...)
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM item_commands ic
		USING items i
		WHERE ic.item_id = i.id AND ic.id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// BatchCreateCommands inserts multiple commands in a single transaction.
func (s *Store) BatchCreateCommands(ctx context.Context, itemID uuid.UUID, inputs []commands.CreateInput) ([]*commands.Command, error) {
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
	args := append([]any{itemID}, scopeArgs...)
	if err := tx.QueryRow(ctx, `SELECT MAX(position) FROM item_commands WHERE item_id = $1`, itemID).Scan(&maxPos); err != nil {
		return nil, err
	}
	var itemExists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM items WHERE id = $1 AND `+scopeSQL+`)`, args...).Scan(&itemExists); err != nil {
		return nil, err
	}
	if !itemExists {
		return nil, ErrNotFound
	}
	startPos := 0
	if maxPos != nil {
		startPos = *maxPos + 1
	}

	out := make([]*commands.Command, 0, len(inputs))
	for i, in := range inputs {
		row := tx.QueryRow(ctx, `
			INSERT INTO item_commands (item_id, label, command, description, category, position)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING `+commandColumns,
			itemID, in.Label, in.Command, in.Description, in.Category, startPos+i,
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

// ReorderCommands updates positions to match the order of `ids`.
func (s *Store) ReorderCommands(ctx context.Context, itemID uuid.UUID, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{itemID}, scopeArgs...)
	var itemExists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM items WHERE id = $1 AND `+scopeSQL+`)`, args...).Scan(&itemExists); err != nil {
		return err
	}
	if !itemExists {
		return ErrNotFound
	}

	for i, id := range ids {
		tag, err := tx.Exec(ctx, `
			UPDATE item_commands
			SET position = $1
			WHERE id = $2 AND item_id = $3
		`, i, id, itemID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("command %s not found in item %s", id, itemID)
		}
	}
	return tx.Commit(ctx)
}
