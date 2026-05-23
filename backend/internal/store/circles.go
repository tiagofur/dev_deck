package store

import (
	"context"
	"errors"

	"devdeck/internal/domain/circles"
	"devdeck/internal/domain/items"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Store) CreateCircle(ctx context.Context, userID uuid.UUID, name, description string) (*circles.Circle, error) {
	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var c circles.Circle
	err = tx.QueryRow(ctx, `
		INSERT INTO circles (name, description, created_by)
		VALUES ($1, $2, $3)
		RETURNING id, name, description, invite_code, created_by, created_at, updated_at
	`, name, description, userID).Scan(&c.ID, &c.Name, &c.Description, &c.InviteCode, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO circle_members (circle_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, c.ID, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Store) GetCircleByID(ctx context.Context, circleID uuid.UUID) (*circles.Circle, error) {
	var c circles.Circle
	err := s.Reader().QueryRow(ctx, `
		SELECT id, name, description, invite_code, created_by, created_at, updated_at
		FROM circles
		WHERE id = $1
	`, circleID).Scan(&c.ID, &c.Name, &c.Description, &c.InviteCode, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (s *Store) ListUserCircles(ctx context.Context, userID uuid.UUID) ([]circles.Circle, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT c.id, c.name, c.description, c.invite_code, c.created_by, c.created_at, c.updated_at
		FROM circles c
		JOIN circle_members cm ON cm.circle_id = c.id
		WHERE cm.user_id = $1
		ORDER BY c.name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []circles.Circle
	for rows.Next() {
		var c circles.Circle
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.InviteCode, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	if list == nil {
		list = []circles.Circle{}
	}
	return list, rows.Err()
}

func (s *Store) GetCircleByInviteCode(ctx context.Context, inviteCode string) (*circles.Circle, error) {
	var c circles.Circle
	err := s.Reader().QueryRow(ctx, `
		SELECT id, name, description, invite_code, created_by, created_at, updated_at
		FROM circles
		WHERE invite_code = $1
	`, inviteCode).Scan(&c.ID, &c.Name, &c.Description, &c.InviteCode, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (s *Store) JoinCircleByInviteCode(ctx context.Context, userID uuid.UUID, inviteCode string) (*circles.Circle, error) {
	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var c circles.Circle
	err = tx.QueryRow(ctx, `
		SELECT id, name, description, invite_code, created_by, created_at, updated_at
		FROM circles
		WHERE invite_code = $1
	`, inviteCode).Scan(&c.ID, &c.Name, &c.Description, &c.InviteCode, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO circle_members (circle_id, user_id, role)
		VALUES ($1, $2, 'member')
		ON CONFLICT (circle_id, user_id) DO NOTHING
	`, c.ID, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Store) AddCircleMember(ctx context.Context, circleID, userID uuid.UUID, role string) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO circle_members (circle_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (circle_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, circleID, userID, role)
	return err
}

func (s *Store) LeaveCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		DELETE FROM circle_members
		WHERE circle_id = $1 AND user_id = $2
	`, circleID, userID)
	return err
}

func (s *Store) IsCircleMember(ctx context.Context, userID, circleID uuid.UUID) (string, bool) {
	var role string
	err := s.Reader().QueryRow(ctx, `
		SELECT role FROM circle_members
		WHERE user_id = $1 AND circle_id = $2
	`, userID, circleID).Scan(&role)
	if err != nil {
		return "", false
	}
	return role, true
}

func (s *Store) ShareItemToCircle(ctx context.Context, circleID, itemID, userID uuid.UUID, shareContext string) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO circle_items (circle_id, item_id, shared_by, share_context)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (circle_id, item_id) DO UPDATE SET
			shared_by = EXCLUDED.shared_by,
			shared_at = now(),
			share_context = EXCLUDED.share_context
	`, circleID, itemID, userID, shareContext)
	return err
}

func (s *Store) ListCircleItems(ctx context.Context, circleID uuid.UUID) ([]*items.Item, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT `+itemColumnsPrefixed+`
		FROM items i
		JOIN circle_items ci ON ci.item_id = i.id
		WHERE ci.circle_id = $1 AND i.archived = false
		ORDER BY ci.shared_at DESC
	`, circleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*items.Item
	var itemIDs []uuid.UUID
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, it)
		itemIDs = append(itemIDs, it.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(itemIDs) > 0 {
		metaRows, err := s.Reader().Query(ctx, `
			SELECT item_id, share_context, shared_by::text, shared_at::text
			FROM circle_items
			WHERE circle_id = $1 AND item_id = ANY($2)
		`, circleID, itemIDs)
		if err != nil {
			return nil, err
		}
		defer metaRows.Close()

		type shareMeta struct {
			context  string
			sharedBy string
			sharedAt string
		}
		byItemID := map[uuid.UUID]shareMeta{}
		for metaRows.Next() {
			var itemID uuid.UUID
			var meta shareMeta
			if err := metaRows.Scan(&itemID, &meta.context, &meta.sharedBy, &meta.sharedAt); err != nil {
				return nil, err
			}
			byItemID[itemID] = meta
		}
		if err := metaRows.Err(); err != nil {
			return nil, err
		}
		for _, it := range list {
			meta, ok := byItemID[it.ID]
			if !ok {
				continue
			}
			it.Meta["circle_share_context"] = meta.context
			it.Meta["circle_shared_by"] = meta.sharedBy
			it.Meta["circle_shared_at"] = meta.sharedAt
		}
	}
	if list == nil {
		list = []*items.Item{}
	}
	return list, nil
}

func (s *Store) ListCircleMembers(ctx context.Context, circleID uuid.UUID) ([]circles.CircleMemberDetail, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT cm.user_id, COALESCE(u.username, u.login), u.display_name, u.avatar_url, cm.role
		FROM circle_members cm
		JOIN users u ON u.id = cm.user_id
		WHERE cm.circle_id = $1
		ORDER BY cm.created_at ASC
	`, circleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []circles.CircleMemberDetail
	for rows.Next() {
		var m circles.CircleMemberDetail
		if err := rows.Scan(&m.UserID, &m.Username, &m.DisplayName, &m.AvatarURL, &m.Role); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	if list == nil {
		list = []circles.CircleMemberDetail{}
	}
	return list, rows.Err()
}
