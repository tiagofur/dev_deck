package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const deckColumns = `id, user_id, slug, title, description, is_public, created_at, updated_at`

type Deck struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	IsPublic    bool      `json:"is_public"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type DeckItem struct {
	DeckID   uuid.UUID `json:"deck_id"`
	ItemID   uuid.UUID `json:"item_id"`
	Position int       `json:"position"`
	AddedAt  time.Time `json:"added_at"`
}

type CreateDeckInput struct {
	Title       string
	Description *string
	IsPublic    bool
}

type UpdateDeckInput struct {
	Title       *string
	Description *string
	IsPublic    *bool
}

var ErrDeckNotFound = errors.New("deck not found")
var ErrDeckItemNotFound = errors.New("deck item not found")

func scanDeck(row pgx.Row) (*Deck, error) {
	var d Deck
	err := row.Scan(
		&d.ID, &d.UserID, &d.Slug, &d.Title,
		&d.Description, &d.IsPublic, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *Store) ListDecks(ctx context.Context) ([]*Deck, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 1)
	rows, err := s.pool.Query(ctx,
		`SELECT `+deckColumns+` FROM decks WHERE `+scopeSQL+` ORDER BY updated_at DESC, created_at DESC`,
		scopeArgs...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*Deck{}
	for rows.Next() {
		d, err := scanDeck(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) CreateDeck(ctx context.Context, userID uuid.UUID, in CreateDeckInput) (*Deck, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO decks (user_id, slug, title, description, is_public)
		VALUES ($1, generate_deck_slug($2, $1), $2, $3, $4)
		RETURNING `+deckColumns,
		userID, in.Title, in.Description, in.IsPublic,
	)
	return scanDeck(row)
}

func (s *Store) GetDeck(ctx context.Context, id uuid.UUID) (*Deck, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.pool.QueryRow(ctx,
		`SELECT `+deckColumns+` FROM decks WHERE id = $1 AND `+scopeSQL,
		args...,
	)
	d, err := scanDeck(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDeckNotFound
		}
		return nil, err
	}
	return d, nil
}

func (s *Store) UpdateDeck(ctx context.Context, id uuid.UUID, in UpdateDeckInput) (*Deck, error) {
	sets := []string{}
	args := []any{}
	idx := 1

	if in.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", idx))
		args = append(args, *in.Title)
		idx++
	}
	if in.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", idx))
		args = append(args, *in.Description)
		idx++
	}
	if in.IsPublic != nil {
		sets = append(sets, fmt.Sprintf("is_public = $%d", idx))
		args = append(args, *in.IsPublic)
		idx++
	}

	if len(sets) == 0 {
		return s.GetDeck(ctx, id)
	}

	sets = append(sets, "updated_at = NOW()")
	idxID := idx
	args = append(args, id)
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", idxID+1)
	args = append(args, scopeArgs...)

	q := fmt.Sprintf(
		"UPDATE decks SET %s WHERE id = $%d AND %s RETURNING %s",
		joinComma(sets), idxID, scopeSQL, deckColumns,
	)

	d, err := scanDeck(s.pool.QueryRow(ctx, q, args...))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDeckNotFound
		}
		return nil, err
	}
	return d, nil
}

func (s *Store) DeleteDeck(ctx context.Context, id uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	res, err := s.pool.Exec(ctx, `DELETE FROM decks WHERE id = $1 AND `+scopeSQL, args...)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrDeckNotFound
	}
	return nil
}

func (s *Store) AddItemsToDeck(ctx context.Context, deckID uuid.UUID, itemIDs []uuid.UUID) error {
	if len(itemIDs) == 0 {
		return nil
	}
	if _, err := s.GetDeck(ctx, deckID); err != nil {
		return err
	}

	var maxPos int
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(MAX(position), -1) FROM deck_items WHERE deck_id = $1`,
		deckID,
	).Scan(&maxPos)
	if err != nil {
		return err
	}

	for i, itemID := range itemIDs {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO deck_items (deck_id, item_id, position)
			VALUES ($1, $2, $3)
			ON CONFLICT (deck_id, item_id) DO NOTHING
		`, deckID, itemID, maxPos+i+1)
		if err != nil {
			return err
		}
	}

	_, err = s.pool.Exec(ctx, `UPDATE decks SET updated_at = NOW() WHERE id = $1`, deckID)
	return err
}

func (s *Store) RemoveItemFromDeck(ctx context.Context, deckID uuid.UUID, itemID uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "d.user_id", 3)
	args := append([]any{deckID, itemID}, scopeArgs...)
	res, err := s.pool.Exec(ctx, `
		DELETE FROM deck_items di
		USING decks d
		WHERE di.deck_id = d.id
		  AND di.deck_id = $1
		  AND di.item_id = $2
		  AND `+scopeSQL,
		args...,
	)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrDeckItemNotFound
	}
	return nil
}

func (s *Store) GetDeckItems(ctx context.Context, deckID uuid.UUID) ([]uuid.UUID, error) {
	if _, err := s.GetDeck(ctx, deckID); err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx,
		`SELECT item_id FROM deck_items WHERE deck_id = $1 ORDER BY position ASC, added_at ASC`,
		deckID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []uuid.UUID{}
	for rows.Next() {
		var itemID uuid.UUID
		if err := rows.Scan(&itemID); err != nil {
			return nil, err
		}
		out = append(out, itemID)
	}
	return out, rows.Err()
}

func (s *Store) ReorderDeckItems(ctx context.Context, deckID uuid.UUID, itemIDs []uuid.UUID) error {
	if _, err := s.GetDeck(ctx, deckID); err != nil {
		return err
	}
	for i, itemID := range itemIDs {
		_, err := s.pool.Exec(ctx,
			`UPDATE deck_items SET position = $1 WHERE deck_id = $2 AND item_id = $3`,
			i, deckID, itemID,
		)
		if err != nil {
			return err
		}
	}
	_, err := s.pool.Exec(ctx, `UPDATE decks SET updated_at = NOW() WHERE id = $1`, deckID)
	return err
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}
