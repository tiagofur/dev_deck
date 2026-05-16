package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type SyncOperation struct {
	OperationID     uuid.UUID `json:"operation_id"`
	Operation       string    `json:"operation"` // create, update, delete
	EntityType      string    `json:"entity_type"`
	EntityID        uuid.UUID `json:"entity_id"`
	Payload         any       `json:"payload,omitempty"`
	ClientUpdatedAt time.Time `json:"client_updated_at"`
}

type SyncOperationResult struct {
	OperationID uuid.UUID `json:"operation_id"`
	Status      string    `json:"status"` // success, error, already_synced
	Error       string    `json:"error,omitempty"`
}

// ProcessSyncBatch applies a batch of operations from a client idempotently.
func (s *Store) ProcessSyncBatch(ctx context.Context, userID, clientID uuid.UUID, ops []SyncOperation) ([]SyncOperationResult, error) {
	results := make([]SyncOperationResult, 0, len(ops))

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	for _, op := range ops {
		res := SyncOperationResult{OperationID: op.OperationID, Status: "success"}

		// 1. Check idempotency
		var exists bool
		err := tx.QueryRow(ctx, `
			SELECT EXISTS(SELECT 1 FROM sync_operations WHERE client_id = $1 AND operation_id = $2)
		`, clientID, op.OperationID).Scan(&exists)
		if err != nil {
			return nil, err
		}

		if exists {
			res.Status = "already_synced"
			results = append(results, res)
			continue
		}

		// 2. Process based on entity type (simplified for Phase 21)
		payloadJSON, err := json.Marshal(op.Payload)
		if err != nil {
			res.Status = "error"
			res.Error = fmt.Sprintf("marshal payload: %v", err)
			results = append(results, res)
			continue
		}

		// 3. Record operation
		_, err = tx.Exec(ctx, `
			INSERT INTO sync_operations (client_id, operation_id, user_id, entity, entity_id, op, payload, client_updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, clientID, op.OperationID, userID, op.EntityType, op.EntityID, op.Operation, payloadJSON, op.ClientUpdatedAt)
		if err != nil {
			return nil, err
		}

		// 4. Apply to entity (LWW)
		if op.EntityType == "item" {
			if op.Operation == "create" {
				// Simplified create from payload
				itRaw, _ := json.Marshal(op.Payload)
				var it struct {
					ItemType    string   `json:"item_type"`
					Title       string   `json:"title"`
					URL         *string  `json:"url"`
					Description *string  `json:"description"`
					Tags        []string `json:"tags"`
					WhySaved    string   `json:"why_saved"`
					WhenToUse   string   `json:"when_to_use"`
				}
				_ = json.Unmarshal(itRaw, &it)

				_, err = tx.Exec(ctx, `
					INSERT INTO items (id, user_id, item_type, title, url, description, tags, why_saved, when_to_use, created_at, updated_at)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
					ON CONFLICT (id) DO NOTHING
				`, op.EntityID, userID, it.ItemType, it.Title, it.URL, it.Description, it.Tags, it.WhySaved, it.WhenToUse, op.ClientUpdatedAt)
				if err != nil {
					res.Status = "error"
					res.Error = fmt.Sprintf("create item: %v", err)
				}
			} else if op.Operation == "update" {
				// LWW: Update only if client_updated_at > current updated_at
				// We use a single query with a WHERE clause for atomic LWW
				_, err = tx.Exec(ctx, `
					UPDATE items SET
						title = COALESCE($3->>'title', title),
						description = COALESCE($3->>'description', description),
						notes = COALESCE($3->>'notes', notes),
						why_saved = COALESCE($3->>'why_saved', why_saved),
						when_to_use = COALESCE($3->>'when_to_use', when_to_use),
						is_favorite = COALESCE(($3->>'is_favorite')::boolean, is_favorite),
						archived = COALESCE(($3->>'archived')::boolean, archived),
						updated_at = $4,
						version = version + 1
					WHERE id = $1 AND user_id = $2 AND updated_at < $4
				`, op.EntityID, userID, payloadJSON, op.ClientUpdatedAt)
				if err != nil {
					res.Status = "error"
					res.Error = fmt.Sprintf("update item: %v", err)
				}
			} else if op.Operation == "delete" {
				_, err = tx.Exec(ctx, `
					UPDATE items SET archived = true, updated_at = $3 WHERE id = $1 AND user_id = $2 AND updated_at < $3
				`, op.EntityID, userID, op.ClientUpdatedAt)
				if err != nil {
					res.Status = "error"
					res.Error = fmt.Sprintf("delete item: %v", err)
				}
			}
		}

		results = append(results, res)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return results, nil
}

// ───── Device Management ─────

type Device struct {
	ID         uuid.UUID  `json:"id"`
	ClientID   uuid.UUID  `json:"client_id"`
	Name       string     `json:"name"`
	DeviceType string     `json:"device_type"`
	LastSyncAt *time.Time `json:"last_sync_at,omitempty"`
	LastSeenAt time.Time  `json:"last_seen_at"`
	CreatedAt  time.Time  `json:"created_at"`
	IsActive   bool       `json:"is_active"`
}

func (s *Store) RegisterDevice(ctx context.Context, userID, clientID uuid.UUID, name, deviceType string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO devices (user_id, client_id, name, device_type)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (client_id) DO UPDATE SET
			name = EXCLUDED.name,
			device_type = EXCLUDED.device_type,
			last_seen_at = NOW(),
			is_active = TRUE
	`, userID, clientID, name, deviceType)
	return err
}

func (s *Store) ListDevices(ctx context.Context, userID uuid.UUID) ([]Device, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, client_id, COALESCE(name, 'Unknown Device'), device_type, last_sync_at, last_seen_at, created_at, is_active
		FROM devices
		WHERE user_id = $1
		ORDER BY last_seen_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Device
	for rows.Next() {
		var d Device
		if err := rows.Scan(&d.ID, &d.ClientID, &d.Name, &d.DeviceType, &d.LastSyncAt, &d.LastSeenAt, &d.CreatedAt, &d.IsActive); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) DeleteDevice(ctx context.Context, userID, clientID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM devices WHERE user_id = $1 AND client_id = $2
	`, userID, clientID)
	return err
}

func (s *Store) UpdateDeviceSync(ctx context.Context, clientID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE devices SET last_sync_at = NOW(), last_seen_at = NOW() WHERE client_id = $1
	`, clientID)
	return err
}

// GetSyncDelta returns operations applied on the server since the given timestamp,
// excluding those from the requesting client.
func (s *Store) GetSyncDelta(ctx context.Context, userID, excludeClientID uuid.UUID, since time.Time) ([]SyncOperation, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT operation_id, op, entity, entity_id, payload, server_applied_at
		FROM sync_operations
		WHERE user_id = $1 
		  AND client_id != $2
		  AND server_applied_at > $3
		ORDER BY server_applied_at ASC
		LIMIT 500
	`, userID, excludeClientID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SyncOperation
	for rows.Next() {
		var op SyncOperation
		var appliedAt time.Time
		var payloadJSON []byte
		if err := rows.Scan(&op.OperationID, &op.Operation, &op.EntityType, &op.EntityID, &payloadJSON, &appliedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(payloadJSON, &op.Payload); err != nil {
			return nil, err
		}
		op.ClientUpdatedAt = appliedAt // We use server time for deltas to ensure consistency
		out = append(out, op)
	}
	return out, rows.Err()
}

