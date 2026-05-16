package store

import (
	"context"
	"encoding/json"

	"devdeck/internal/domain/items"

	"github.com/google/uuid"
)

type FeedEvent struct {
	Item             *items.Item `json:"item"`
	CuratorName      string      `json:"curator_name"`
	CuratorAvatarURL string      `json:"curator_avatar_url"`
}

func (s *Store) FollowUser(ctx context.Context, followerID, followingID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO follows (follower_id, following_id)
		VALUES ($1, $2)
		ON CONFLICT (follower_id, following_id) DO NOTHING
	`, followerID, followingID)
	if err != nil {
		return err
	}

	// Award points to the followed user
	return s.AwardPoints(ctx, followingID, 10)
}

func (s *Store) UnfollowUser(ctx context.Context, followerID, followingID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		DELETE FROM follows
		WHERE follower_id = $1 AND following_id = $2
	`, followerID, followingID)
	return err
}

func (s *Store) IsFollowing(ctx context.Context, followerID, followingID uuid.UUID) (bool, error) {
	var exists bool
	err := s.Reader().QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
		)
	`, followerID, followingID).Scan(&exists)
	return exists, err
}

func (s *Store) GetFollowingFeed(ctx context.Context, followerID uuid.UUID, limit int) ([]FeedEvent, error) {
	if limit <= 0 {
		limit = 50
	}

	// itemColumns has 22 fields
	rows, err := s.Reader().Query(ctx, `
		SELECT 
			`+itemColumns+`,
			u.username, u.avatar_url
		FROM items i
		JOIN decks d ON d.id = (i.meta->>'deck_id')::uuid
		JOIN follows f ON f.following_id = i.user_id
		JOIN users u ON u.id = i.user_id
		WHERE f.follower_id = $1
		  AND d.is_public = true
		  AND i.archived = false
		ORDER BY i.created_at DESC
		LIMIT $2
	`, followerID, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []FeedEvent
	for rows.Next() {
		var fe FeedEvent
		it := &items.Item{}
		var rawMeta []byte
		var itemType, enrichStatus string

		err := rows.Scan(
			&it.ID, &it.UserID, &it.OrgID, &itemType, &it.Title, &it.URL, &it.URLNormalized,
			&it.Description, &it.Notes, &it.Tags, &it.WhySaved, &it.WhenToUse,
			&it.SourceChannel, &rawMeta, &it.AISummary, &it.AITags,
			&enrichStatus, &it.Archived, &it.IsFavorite, &it.CreatedAt, &it.UpdatedAt, &it.LastSeenAt,
			&fe.CuratorName, &fe.CuratorAvatarURL,
		)
		if err != nil {
			return nil, err
		}

		it.Type = items.Type(itemType)
		it.EnrichmentStatus = items.EnrichmentStatus(enrichStatus)
		if len(rawMeta) > 0 {
			_ = json.Unmarshal(rawMeta, &it.Meta)
		}
		fe.Item = it
		out = append(out, fe)
	}
	return out, rows.Err()
}
