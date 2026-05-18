package store

import (
	"context"

	"github.com/google/uuid"
)

type HotTopic struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

// GetOrgTrendingTags returns the most used tags in an organization within the last 30 days.
func (s *Store) GetOrgTrendingTags(ctx context.Context, orgID uuid.UUID, limit int) ([]HotTopic, error) {
	if limit <= 0 {
		limit = 10
	}

	rows, err := s.Reader().Query(ctx, `
		SELECT tag, COUNT(*) as c
		FROM (
			SELECT unnest(array_cat(tags, ai_tags)) as tag
			FROM items
			WHERE org_id = $1
			  AND updated_at > NOW() - INTERVAL '30 days'
			  AND archived = false
		) t
		WHERE tag <> ''
		GROUP BY tag
		ORDER BY c DESC
		LIMIT $2
	`, orgID, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []HotTopic
	for rows.Next() {
		var ht HotTopic
		if err := rows.Scan(&ht.Tag, &ht.Count); err != nil {
			return nil, err
		}
		out = append(out, ht)
	}
	return out, rows.Err()
}

type Recommendation struct {
	URLNormalized string `json:"url_normalized"`
	Title         string `json:"title"`
	SaveCount     int    `json:"save_count"`
	EntityType    string `json:"item_type"`
}

// GetOrgRecommendations returns items popular in the organization that the current user hasn't saved.
func (s *Store) GetOrgRecommendations(ctx context.Context, orgID, userID uuid.UUID, limit int) ([]Recommendation, error) {
	if limit <= 0 {
		limit = 5
	}

	rows, err := s.Reader().Query(ctx, `
		SELECT url_normalized, MAX(title), COUNT(*) as c, MAX(item_type)
		FROM items
		WHERE org_id = $1
		  AND archived = false
		  AND url_normalized NOT IN (
			  SELECT url_normalized FROM items WHERE user_id = $2 AND archived = false AND url_normalized IS NOT NULL
		  )
		GROUP BY url_normalized
		ORDER BY c DESC
		LIMIT $3
	`, orgID, userID, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Recommendation
	for rows.Next() {
		var rec Recommendation
		if err := rows.Scan(&rec.URLNormalized, &rec.Title, &rec.SaveCount, &rec.EntityType); err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}
