package handlers

import (
	"net/http"

	"devdeck/internal/authctx"

	"github.com/google/uuid"
)

// SyncRequest represents a single sync operation from the client.
type SyncRequest struct {
	ClientID    uuid.UUID      `json:"client_id"`
	Operations []SyncOperation `json:"operations"`
}

// SyncOperation represents one CRUD operation to sync.
type SyncOperation struct {
	OperationID uuid.UUID     `json:"operation_id"`
	Operation  string       `json:"operation"` // create, update, delete
	EntityType string       `json:"entity_type"`
	EntityID  uuid.UUID    `json:"entity_id"`
	Payload   interface{} `json:"payload,omitempty"`
}

// SyncResponse is the response for sync operations.
type SyncResponse struct {
	Operations []SyncOperationResult `json:"operations"`
	Delta      []SyncDeltaResult      `json:"delta,omitempty"`
}

// SyncOperationResult describes the result of a single operation.
type SyncOperationResult struct {
	OperationID    uuid.UUID `json:"operation_id"`
	Status       string   `json:"status"` // success, error, already_synced
	Error        string   `json:"error,omitempty"`
	ServerVersion int      `json:"server_version,omitempty"`
}

// SyncDeltaResult describes a delta change from the server.
type SyncDeltaResult struct {
	OperationID uuid.UUID     `json:"operation_id"`
	Operation  string       `json:"operation"`
	EntityType string       `json:"entity_type"`
	EntityID  uuid.UUID    `json:"entity_id"`
	Payload   interface{} `json:"payload,omitempty"`
	CreatedAt string       `json:"created_at"`
}

// SyncHandler handles offline sync operations.
// Full implementation pending - returns stub for now.
type SyncHandler struct{}

func NewSyncHandler() *SyncHandler {
	return &SyncHandler{}
}

// POST /api/sync/batch
// Body: {"client_id": "uuid", "operations": [...]}
func (h *SyncHandler) BatchSync(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	// TODO: Full sync implementation
	// - Insert operations into sync_log
	// - Process each idempotently
	// - Return results with server_version

	writeJSON(w, http.StatusOK, map[string]any{
		"operations": []SyncOperationResult{},
		"delta":      []SyncDeltaResult{},
	})
}

// GET /api/sync/delta?since=...&client_id=...
func (h *SyncHandler) Delta(w http.ResponseWriter, r *http.Request) {
	_, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	// TODO: Query sync_log for changes since timestamp

	writeJSON(w, http.StatusOK, map[string]any{
		"delta": []SyncDeltaResult{},
	})
}

// SyncQueue is a simple in-memory sync queue.
// Full implementation would use sql.js or better-sqlite3.
type SyncQueue struct {
	pending  []PendingOperation
	clientID uuid.UUID
}

type PendingOperation struct {
	OperationID uuid.UUID
	Operation  string
	EntityType string
	EntityID  uuid.UUID
	Payload   map[string]any
	CreatedAt  int64
	Retries   int
}

// NewSyncQueue creates a new sync queue.
func NewSyncQueue(clientID uuid.UUID) *SyncQueue {
	return &SyncQueue{
		pending:  []PendingOperation{},
		clientID: clientID,
	}
}

// Add adds an operation to the pending queue.
func (q *SyncQueue) Add(op PendingOperation) {
	q.pending = append(q.pending, op)
}

// GetPending returns pending operations.
func (q *SyncQueue) GetPending(limit int) []PendingOperation {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if len(q.pending) <= limit {
		return q.pending
	}
	return q.pending[:limit]
}

// Remove removes a synced operation.
func (q *SyncQueue) Remove(opID uuid.UUID) {
	for i, op := range q.pending {
		if op.OperationID == opID {
			q.pending = append(q.pending[:i], q.pending[i+1:]...)
			return
		}
	}
}

// Count returns pending count.
func (q *SyncQueue) Count() int {
	return len(q.pending)
}

// SyncStatus represents sync state.
type SyncStatus string

const (
	SyncStatusSynced   SyncStatus = "synced"
	SyncStatusPending  SyncStatus = "pending"
	SyncStatusOffline SyncStatus = "offline"
	SyncStatusError  SyncStatus = "error"
)

// NewSyncStatus returns initial sync status.
func NewSyncStatus() SyncStatus {
	return SyncStatusSynced
}