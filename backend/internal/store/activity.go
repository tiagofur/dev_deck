package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ActivityEntry struct {
	ID         uuid.UUID       `json:"id"`
	OrgID      uuid.UUID       `json:"org_id"`
	UserID     uuid.UUID       `json:"user_id"`
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   uuid.UUID       `json:"entity_id"`
	Metadata   map[string]any  `json:"metadata,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
	
	// JOINed data
	UserDisplayName string  `json:"user_display_name,omitempty"`
	UserAvatarURL   string  `json:"user_avatar_url,omitempty"`
}

// RecordActivity logs an event in the organization's audit log.
// It's a non-blocking best-effort recording (usually called within a tx).
func (s *Store) RecordActivity(ctx context.Context, orgID, userID uuid.UUID, action, entityType string, entityID uuid.UUID, metadata map[string]any) error {
	if orgID == uuid.Nil {
		return nil // Only log for organizations
	}

	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("marshal activity metadata: %w", err)
	}

	_, err = s.Writer().Exec(ctx, `
		INSERT INTO activity_log (org_id, user_id, action, entity_type, entity_id, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, orgID, userID, action, entityType, entityID, metaJSON)
	if err != nil {
		return err
	}

	if s.webhooks != nil {
		s.webhooks.Dispatch(ctx, orgID, userID, action, entityType, entityID, metadata)
	}

	return nil
}

// ListOrgActivity returns the recent activity for an organization.
func (s *Store) ListOrgActivity(ctx context.Context, orgID uuid.UUID, limit int) ([]ActivityEntry, error) {
	if limit <= 0 {
		limit = 50
	}

	rows, err := s.Reader().Query(ctx, `
		SELECT 
			a.id, a.org_id, a.user_id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
			u.display_name, u.avatar_url
		FROM activity_log a
		JOIN users u ON u.id = a.user_id
		WHERE a.org_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2
	`, orgID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ActivityEntry
	for rows.Next() {
		var e ActivityEntry
		var metaJSON []byte
		if err := rows.Scan(
			&e.ID, &e.OrgID, &e.UserID, &e.Action, &e.EntityType, &e.EntityID, &metaJSON, &e.CreatedAt,
			&e.UserDisplayName, &e.UserAvatarURL,
		); err != nil {
			return nil, err
		}
		if len(metaJSON) > 0 {
			_ = json.Unmarshal(metaJSON, &e.Metadata)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
