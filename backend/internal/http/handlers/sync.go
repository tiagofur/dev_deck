package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"devdeck/internal/authctx"
	"devdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// SyncRequest represents a single sync operation from the client.
type SyncRequest struct {
	ClientID   uuid.UUID             `json:"client_id"`
	Operations []store.SyncOperation `json:"operations"`
}

// SyncResponse is the response for sync operations.
type SyncResponse struct {
	Operations []store.SyncOperationResult `json:"operations"`
	Delta      []SyncDeltaResult           `json:"delta,omitempty"`
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
type SyncHandler struct {
	store *store.Store
}

func NewSyncHandler(s *store.Store) *SyncHandler {
	return &SyncHandler{store: s}
}

// POST /api/sync/batch
// Body: {"client_id": "uuid", "operations": [...]}
func (h *SyncHandler) BatchSync(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if req.ClientID == uuid.Nil {
		writeError(w, http.StatusBadRequest, "INVALID_CLIENT", "client_id is required")
		return
	}

	results, err := h.store.ProcessSyncBatch(r.Context(), userID, req.ClientID, req.Operations)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, SyncResponse{
		Operations: results,
	})
}

// GET /api/sync/delta?since=...&client_id=...
func (h *SyncHandler) Delta(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	sinceStr := r.URL.Query().Get("since")
	var since time.Time
	if sinceStr != "" {
		var err error
		since, err = time.Parse(time.RFC3339, sinceStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_TIMESTAMP", "since must be RFC3339")
			return
		}
	}

	clientIDRaw := r.URL.Query().Get("client_id")
	clientID, err := uuid.Parse(clientIDRaw)
	if err != nil && clientIDRaw != "" {
		writeError(w, http.StatusBadRequest, "INVALID_CLIENT", "client_id must be a valid UUID")
		return
	}

	ops, err := h.store.GetSyncDelta(r.Context(), userID, clientID, since)
	if err != nil {
		writeInternal(w, err)
		return
	}

	// Update device last seen/sync when they pull
	if clientID != uuid.Nil {
		_ = h.store.UpdateDeviceSync(r.Context(), clientID)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"operations": ops,
		"now":        time.Now().Format(time.RFC3339),
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

// ───── Device Management ─────

// Device represents a user's registered device.
type Device struct {
	ID         uuid.UUID `json:"id"`
	ClientID   uuid.UUID `json:"client_id"`
	Name      string   `json:"name,omitempty"`
	DeviceType string   `json:"device_type"`
	LastSync  string   `json:"last_sync_at,omitempty"`
	LastSeen  string   `json:"last_seen_at"`
	CreatedAt string   `json:"created_at"`
	IsActive  bool     `json:"is_active"`
}

// DevicesHandler manages user devices.
type DevicesHandler struct {
	store *store.Store
}

func NewDevicesHandler(s *store.Store) *DevicesHandler {
	return &DevicesHandler{store: s}
}

// GET /api/me/devices
func (h *DevicesHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	devices, err := h.store.ListDevices(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"devices": devices,
	})
}

// DELETE /api/me/devices/:clientId
func (h *DevicesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	clientID, err := uuid.Parse(chi.URLParam(r, "clientId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_CLIENT", "client_id must be a valid UUID")
		return
	}

	if err := h.store.DeleteDevice(r.Context(), userID, clientID); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"deleted": true,
	})
}

// POST /api/me/devices/register
// Body: {"client_id": "uuid", "name": "My Laptop", "device_type": "desktop"}
func (h *DevicesHandler) Register(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req struct {
		ClientID   uuid.UUID `json:"client_id"`
		Name       string    `json:"name,omitempty"`
		DeviceType string    `json:"device_type,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}

	if req.ClientID == uuid.Nil {
		writeError(w, http.StatusBadRequest, "INVALID_CLIENT", "client_id is required")
		return
	}

	if err := h.store.RegisterDevice(r.Context(), userID, req.ClientID, req.Name, req.DeviceType); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"registered": true,
	})
}

// FormatTime formats a time for JSON response.
func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.RFC3339)
}