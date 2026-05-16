package store

import (
	"context"

	"github.com/google/uuid"
)

// AwardPoints increases the reputation of a user.
func (s *Store) AwardPoints(ctx context.Context, userID uuid.UUID, points int) error {
	if userID == uuid.Nil {
		return nil
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE users SET reputation_points = reputation_points + $1
		WHERE id = $2
	`, points, userID)
	return err
}

// AwardPointsIfPublicItem checks if the item is in a public deck and awards points if so.
func (s *Store) AwardPointsIfPublicItem(ctx context.Context, userID uuid.UUID, itemMeta map[string]any) error {
	deckIDStr, ok := itemMeta["deck_id"].(string)
	if !ok || deckIDStr == "" {
		return nil
	}

	deckID, err := uuid.Parse(deckIDStr)
	if err != nil {
		return nil
	}

	var isPublic bool
	err = s.pool.QueryRow(ctx, `SELECT is_public FROM decks WHERE id = $1`, deckID).Scan(&isPublic)
	if err != nil || !isPublic {
		return nil
	}

	return s.AwardPoints(ctx, userID, 5) // +5 points for public curation
}
