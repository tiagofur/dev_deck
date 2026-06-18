package store

import (
	"context"
	"encoding/json"
	"time"

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

	// itemColumnsPrefixed has 22 fields with i. prefix
	rows, err := s.Reader().Query(ctx, `
		SELECT 
			`+itemColumnsPrefixed+`,
			COALESCE(u.username, u.login), COALESCE(u.avatar_url, '')
		FROM items i
		JOIN follows f ON f.following_id = i.user_id
		JOIN users u ON u.id = i.user_id
		WHERE f.follower_id = $1
		  AND i.archived = false
		  AND EXISTS (
		      SELECT 1 FROM deck_items di
		      JOIN decks d ON d.id = di.deck_id
		      WHERE di.item_id = i.id AND d.is_public = true
		  )
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
		var itemType string
		var userID, orgID *uuid.UUID
		var lastSeenAt *time.Time
		var tags, aiTags []string
		var title, notes, whySaved, whenToUse, sourceChannel, aiSummary, enrichStatus *string

		err := rows.Scan(
			&it.ID, &userID, &orgID, &itemType, &title, &it.URL, &it.URLNormalized,
			&it.Description, &notes, &tags, &whySaved, &whenToUse,
			&sourceChannel, &rawMeta, &aiSummary, &aiTags,
			&enrichStatus, &it.Archived, &it.IsFavorite, &it.CreatedAt, &it.UpdatedAt, &lastSeenAt,
			&fe.CuratorName, &fe.CuratorAvatarURL,
		)
		if err != nil {
			return nil, err
		}

		if userID != nil {
			it.UserID = *userID
		}
		it.OrgID = orgID
		it.Type = items.Type(itemType)
		it.Tags = tags
		if it.Tags == nil {
			it.Tags = []string{}
		}
		it.AITags = aiTags
		if it.AITags == nil {
			it.AITags = []string{}
		}
		if title != nil {
			it.Title = *title
		}
		if notes != nil {
			it.Notes = *notes
		}
		if whySaved != nil {
			it.WhySaved = *whySaved
		}
		if whenToUse != nil {
			it.WhenToUse = *whenToUse
		}
		if sourceChannel != nil {
			it.SourceChannel = *sourceChannel
		}
		if aiSummary != nil {
			it.AISummary = *aiSummary
		}
		if enrichStatus != nil {
			it.EnrichmentStatus = items.EnrichmentStatus(*enrichStatus)
		}
		it.LastSeenAt = lastSeenAt

		if len(rawMeta) > 0 {
			_ = json.Unmarshal(rawMeta, &it.Meta)
		}
		if it.Meta == nil {
			it.Meta = map[string]any{}
		}

		fe.Item = it
		out = append(out, fe)
	}
	return out, rows.Err()
}
