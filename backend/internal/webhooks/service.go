package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type WebhookStore interface {
	FindWebhooksForEvent(ctx context.Context, orgID, userID uuid.UUID, event string) ([]WebhookData, error)
}

type WebhookData struct {
	ID     uuid.UUID
	URL    string
	Secret string
}

type Payload struct {
	ID         uuid.UUID      `json:"id"`
	Event      string         `json:"event"`
	EntityType string         `json:"entity_type"`
	EntityID   uuid.UUID      `json:"entity_id"`
	Metadata   map[string]any `json:"metadata"`
	Timestamp  time.Time      `json:"timestamp"`
}

type Service struct {
	store WebhookStore
	httpc *http.Client
}

func New(st WebhookStore) *Service {
	return &Service{
		store: st,
		httpc: &http.Client{Timeout: 5 * time.Second},
	}
}

func (s *Service) Dispatch(ctx context.Context, orgID, userID uuid.UUID, action, entityType string, entityID uuid.UUID, metadata map[string]any) {
	// 1. Find matching webhooks
	hooks, err := s.store.FindWebhooksForEvent(ctx, orgID, userID, action)
	if err != nil {
		slog.Error("webhooks: failed to find hooks", "err", err)
		return
	}

	if len(hooks) == 0 {
		return
	}

	// 2. Build payload
	payload := Payload{
		ID:         uuid.New(),
		Event:      action,
		EntityType: entityType,
		EntityID:   entityID,
		Metadata:   metadata,
		Timestamp:  time.Now(),
	}
	body, _ := json.Marshal(payload)

	// 3. Dispatch to each hook in parallel (goroutines)
	for _, h := range hooks {
		go s.send(h, body)
	}
}

func (s *Service) send(hook WebhookData, body []byte) {
	// Calculate signature
	sig := s.calculateSignature(body, hook.Secret)

	req, err := http.NewRequest(http.MethodPost, hook.URL, bytes.NewReader(body))
	if err != nil {
		slog.Error("webhooks: failed to create request", "hook_id", hook.ID, "err", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-DevDeck-Signature", sig)
	req.Header.Set("X-DevDeck-Event-ID", uuid.New().String())

	resp, err := s.httpc.Do(req)
	if err != nil {
		slog.Warn("webhooks: delivery failed", "hook_id", hook.ID, "url", hook.URL, "err", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		slog.Warn("webhooks: target returned error", "hook_id", hook.ID, "status", resp.StatusCode)
	}
}

func (s *Service) calculateSignature(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return hex.EncodeToString(h.Sum(nil))
}
