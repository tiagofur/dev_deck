package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"devdeck/internal/domain/items"

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
	rows, err := s.Reader().Query(ctx,
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
	row := s.Reader().QueryRow(ctx, `
		INSERT INTO decks (user_id, org_id, slug, title, description, is_public)
		VALUES ($1, $2, generate_deck_slug($3, $1), $3, $4, $5)
		RETURNING `+deckColumns,
		userID, currentOrgIDPtr(ctx), in.Title, in.Description, in.IsPublic,
	)
	d, err := scanDeck(row)
	if err != nil {
		return nil, err
	}

	// Record activity
	if orgIDPtr := currentOrgIDPtr(ctx); orgIDPtr != nil {
		_ = s.RecordActivity(ctx, *orgIDPtr, d.UserID, "deck.created", "deck", d.ID, map[string]any{
			"title": d.Title,
		})
	}

	return d, nil
}

func (s *Store) GetDeck(ctx context.Context, id uuid.UUID) (*Deck, error) {
	scopeSQL, scopeArgs := ownerClause(ctx, "user_id", 2)
	args := append([]any{id}, scopeArgs...)
	row := s.Reader().QueryRow(ctx,
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
	b := &sqlBuilder{}
	sets := []string{}

	if in.Title != nil {
		sets = append(sets, fmt.Sprintf("title = %s", b.arg(*in.Title)))
	}
	if in.Description != nil {
		sets = append(sets, fmt.Sprintf("description = %s", b.arg(*in.Description)))
	}
	if in.IsPublic != nil {
		sets = append(sets, fmt.Sprintf("is_public = %s", b.arg(*in.IsPublic)))
	}

	if len(sets) == 0 {
		return s.GetDeck(ctx, id)
	}

	sets = append(sets, "updated_at = NOW()")
	idP := b.arg(id)
	scopeSQL := b.ownerClause(ctx, "user_id")

	q := fmt.Sprintf(
		"UPDATE decks SET %s WHERE id = %s AND %s RETURNING %s",
		joinComma(sets), idP, scopeSQL, deckColumns,
	)

	d, err := scanDeck(s.Reader().QueryRow(ctx, q, b.args...))
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
	res, err := s.Writer().Exec(ctx, `DELETE FROM decks WHERE id = $1 AND `+scopeSQL, args...)
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
	err := s.Reader().QueryRow(ctx,
		`SELECT COALESCE(MAX(position), -1) FROM deck_items WHERE deck_id = $1`,
		deckID,
	).Scan(&maxPos)
	if err != nil {
		return err
	}

	for i, itemID := range itemIDs {
		_, err := s.Writer().Exec(ctx, `
			INSERT INTO deck_items (deck_id, item_id, position)
			VALUES ($1, $2, $3)
			ON CONFLICT (deck_id, item_id) DO NOTHING
		`, deckID, itemID, maxPos+i+1)
		if err != nil {
			return err
		}
	}

	_, err = s.Writer().Exec(ctx, `UPDATE decks SET updated_at = NOW() WHERE id = $1`, deckID)
	return err
}

func (s *Store) RemoveItemFromDeck(ctx context.Context, deckID uuid.UUID, itemID uuid.UUID) error {
	scopeSQL, scopeArgs := ownerClause(ctx, "d.user_id", 3)
	args := append([]any{deckID, itemID}, scopeArgs...)
	res, err := s.Writer().Exec(ctx, `
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

	rows, err := s.Reader().Query(ctx,
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

func (s *Store) GetPublicDeckBySlug(ctx context.Context, slug string) (*Deck, error) {
	row := s.Reader().QueryRow(ctx,
		`SELECT `+deckColumns+` FROM decks WHERE slug = $1`,
		slug,
	)
	d, err := scanDeck(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDeckNotFound
		}
		return nil, err
	}

	if !d.IsPublic {
		userID, ok := currentUserID(ctx)
		if !ok || userID != d.UserID {
			return nil, ErrDeckNotFound
		}
	}

	return d, nil
}

func (s *Store) GetPublicDeckItems(ctx context.Context, deckID uuid.UUID) ([]*items.Item, error) {
	rows, err := s.Reader().Query(ctx,
		`SELECT `+itemColumnsPrefixed+`
		 FROM items i
		 JOIN deck_items di ON di.item_id = i.id
		 WHERE di.deck_id = $1
		 ORDER BY di.position ASC, di.added_at ASC`,
		deckID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*items.Item{}
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (s *Store) ImportDeckItems(ctx context.Context, userID, sourceDeckID uuid.UUID) (int, error) {
	items, err := s.GetPublicDeckItems(ctx, sourceDeckID)
	if err != nil {
		return 0, err
	}

	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	count := 0
	for _, it := range items {
		_, err := tx.Exec(ctx, `
			INSERT INTO items (user_id, item_type, title, url, url_normalized, description, notes, tags, why_saved, when_to_use, source_channel, meta)
			SELECT $1, item_type, title, url, url_normalized, description, notes, tags, why_saved, when_to_use, 'import', meta
			FROM items WHERE id = $2
		`, userID, it.ID)
		if err != nil {
			return 0, err
		}
		count++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return count, nil
}

func (s *Store) ReorderDeckItems(ctx context.Context, deckID uuid.UUID, itemIDs []uuid.UUID) error {
	if _, err := s.GetDeck(ctx, deckID); err != nil {
		return err
	}
	for i, itemID := range itemIDs {
		_, err := s.Writer().Exec(ctx,
			`UPDATE deck_items SET position = $1 WHERE deck_id = $2 AND item_id = $3`,
			i, deckID, itemID,
		)
		if err != nil {
			return err
		}
	}
	_, err := s.Writer().Exec(ctx, `UPDATE decks SET updated_at = NOW() WHERE id = $1`, deckID)
	return err
}

func (s *Store) StarDeck(ctx context.Context, userID, deckID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO deck_stars (user_id, deck_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, deck_id) DO NOTHING
	`, userID, deckID)
	return err
}

func (s *Store) UnstarDeck(ctx context.Context, userID, deckID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		DELETE FROM deck_stars WHERE user_id = $1 AND deck_id = $2
	`, userID, deckID)
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
