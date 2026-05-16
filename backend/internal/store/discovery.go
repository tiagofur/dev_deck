package store

import (
	"context"

	"github.com/google/uuid"
)

type TrendingItem struct {
	URLNormalized string `json:"url_normalized"`
	Title         string `json:"title"`
	SaveCount     int    `json:"save_count"`
}

// GetTrendingItems returns the most saved URLs in the last 7 days globally.
func (s *Store) GetTrendingItems(ctx context.Context, limit int) ([]TrendingItem, error) {
	if limit <= 0 {
		limit = 10
	}

	rows, err := s.pool.Query(ctx, `
		SELECT url_normalized, MAX(title), COUNT(*) as save_count
		FROM items
		WHERE created_at > NOW() - INTERVAL '7 days'
		  AND url_normalized IS NOT NULL
		  AND archived = false
		GROUP BY url_normalized
		ORDER BY save_count DESC
		LIMIT $1
	`, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []TrendingItem
	for rows.Next() {
		var ti TrendingItem
		if err := rows.Scan(&ti.URLNormalized, &ti.Title, &ti.SaveCount); err != nil {
			return nil, err
		}
		out = append(out, ti)
	}
	return out, rows.Err()
}

type CuratorRanking struct {
	ID               uuid.UUID `json:"id"`
	Username         string    `json:"username"`
	DisplayName      string    `json:"display_name"`
	AvatarURL        string    `json:"avatar_url"`
	ReputationPoints int       `json:"reputation_points"`
	FollowersCount   int       `json:"followers_count"`
}

// GetCuratorLeaderboard returns users with the highest reputation.
func (s *Store) GetCuratorLeaderboard(ctx context.Context, limit int) ([]CuratorRanking, error) {
	if limit <= 0 {
		limit = 10
	}

	rows, err := s.pool.Query(ctx, `
		SELECT 
			u.id, u.username, u.display_name, u.avatar_url, u.reputation_points,
			(SELECT count(*) FROM follows WHERE following_id = u.id) as followers_count
		FROM users u
		WHERE u.username IS NOT NULL
		ORDER BY u.reputation_points DESC, followers_count DESC
		LIMIT $1
	`, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []CuratorRanking
	for rows.Next() {
		var cr CuratorRanking
		if err := rows.Scan(&cr.ID, &cr.Username, &cr.DisplayName, &cr.AvatarURL, &cr.ReputationPoints, &cr.FollowersCount); err != nil {
			return nil, err
		}
		out = append(out, cr)
	}
	return out, rows.Err()
}
