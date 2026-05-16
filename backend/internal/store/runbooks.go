package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Runbook struct {
	ID          uuid.UUID      `json:"id"`
	UserID      uuid.UUID      `json:"user_id"`
	ItemID      uuid.UUID      `json:"item_id"`
	Title       string         `json:"title"`
	Description *string        `json:"description,omitempty"`
	Steps       []RunbookStep  `json:"steps,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type RunbookStep struct {
	ID          uuid.UUID `json:"id"`
	RunbookID   uuid.UUID `json:"runbook_id"`
	Label       string    `json:"label"`
	Command     *string   `json:"command,omitempty"`
	Description *string   `json:"description,omitempty"`
	Position    int       `json:"position"`
	IsCompleted bool      `json:"is_completed"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (s *Store) ListRunbooksByItem(ctx context.Context, itemID uuid.UUID) ([]Runbook, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT id, user_id, item_id, title, description, created_at, updated_at
		FROM runbooks
		WHERE item_id = $1
		ORDER BY created_at ASC
	`, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runbooks []Runbook
	for rows.Next() {
		var rb Runbook
		if err := rows.Scan(&rb.ID, &rb.UserID, &rb.ItemID, &rb.Title, &rb.Description, &rb.CreatedAt, &rb.UpdatedAt); err != nil {
			return nil, err
		}
		
		// Load steps for each runbook
		steps, err := s.listRunbookSteps(ctx, rb.ID)
		if err != nil {
			return nil, err
		}
		rb.Steps = steps
		
		runbooks = append(runbooks, rb)
	}
	return runbooks, rows.Err()
}

func (s *Store) listRunbookSteps(ctx context.Context, runbookID uuid.UUID) ([]RunbookStep, error) {
	rows, err := s.Reader().Query(ctx, `
		SELECT id, runbook_id, label, command, description, position, is_completed, created_at, updated_at
		FROM runbook_steps
		WHERE runbook_id = $1
		ORDER BY position ASC
	`, runbookID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var steps []RunbookStep
	for rows.Next() {
		var st RunbookStep
		if err := rows.Scan(&st.ID, &st.RunbookID, &st.Label, &st.Command, &st.Description, &st.Position, &st.IsCompleted, &st.CreatedAt, &st.UpdatedAt); err != nil {
			return nil, err
		}
		steps = append(steps, st)
	}
	return steps, rows.Err()
}

func (s *Store) CreateRunbook(ctx context.Context, userID, itemID uuid.UUID, title string, desc *string) (*Runbook, error) {
	var rb Runbook
	err := s.Reader().QueryRow(ctx, `
		INSERT INTO runbooks (user_id, org_id, item_id, title, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, item_id, title, description, created_at, updated_at
	`, userID, currentOrgIDPtr(ctx), itemID, title, desc).Scan(&rb.ID, &rb.UserID, &rb.ItemID, &rb.Title, &rb.Description, &rb.CreatedAt, &rb.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Record activity
	if orgIDPtr := currentOrgIDPtr(ctx); orgIDPtr != nil {
		_ = s.RecordActivity(ctx, *orgIDPtr, rb.UserID, "runbook.created", "runbook", rb.ID, map[string]any{
			"title": rb.Title,
		})
	}

	rb.Steps = []RunbookStep{}
	return &rb, nil
}

func (s *Store) UpdateRunbook(ctx context.Context, id, userID uuid.UUID, title *string, desc *string) (*Runbook, error) {
	var rb Runbook
	err := s.Reader().QueryRow(ctx, `
		UPDATE runbooks SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			updated_at = NOW()
		WHERE id = $3 AND user_id = $4
		RETURNING id, user_id, item_id, title, description, created_at, updated_at
	`, title, desc, id, userID).Scan(&rb.ID, &rb.UserID, &rb.ItemID, &rb.Title, &rb.Description, &rb.CreatedAt, &rb.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &rb, nil
}

func (s *Store) DeleteRunbook(ctx context.Context, id, userID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, "DELETE FROM runbooks WHERE id = $1 AND user_id = $2", id, userID)
	return err
}

func (s *Store) CreateRunbookStep(ctx context.Context, runbookID uuid.UUID, label string, cmd, desc *string) (*RunbookStep, error) {
	var maxPos int
	err := s.Reader().QueryRow(ctx, "SELECT COALESCE(MAX(position), -1) FROM runbook_steps WHERE runbook_id = $1", runbookID).Scan(&maxPos)
	if err != nil {
		return nil, err
	}

	var st RunbookStep
	err = s.Reader().QueryRow(ctx, `
		INSERT INTO runbook_steps (runbook_id, label, command, description, position)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, runbook_id, label, command, description, position, is_completed, created_at, updated_at
	`, runbookID, label, cmd, desc, maxPos+1).Scan(&st.ID, &st.RunbookID, &st.Label, &st.Command, &st.Description, &st.Position, &st.IsCompleted, &st.CreatedAt, &st.UpdatedAt)
	return &st, err
}

func (s *Store) UpdateRunbookStep(ctx context.Context, id uuid.UUID, label, cmd, desc *string, isCompleted *bool) (*RunbookStep, error) {
	var st RunbookStep
	err := s.Reader().QueryRow(ctx, `
		UPDATE runbook_steps SET
			label = COALESCE($1, label),
			command = COALESCE($2, command),
			description = COALESCE($3, description),
			is_completed = COALESCE($4, is_completed),
			updated_at = NOW()
		WHERE id = $5
		RETURNING id, runbook_id, label, command, description, position, is_completed, created_at, updated_at
	`, label, cmd, desc, isCompleted, id).Scan(&st.ID, &st.RunbookID, &st.Label, &st.Command, &st.Description, &st.Position, &st.IsCompleted, &st.CreatedAt, &st.UpdatedAt)
	return &st, err
}

func (s *Store) DeleteRunbookStep(ctx context.Context, id uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, "DELETE FROM runbook_steps WHERE id = $1", id)
	return err
}

func (s *Store) ReorderRunbookSteps(ctx context.Context, runbookID uuid.UUID, stepIDs []uuid.UUID) error {
	tx, err := s.Writer().Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, id := range stepIDs {
		_, err := tx.Exec(ctx, "UPDATE runbook_steps SET position = $1 WHERE id = $2 AND runbook_id = $3", i, id, runbookID)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
