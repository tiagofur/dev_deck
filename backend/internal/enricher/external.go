package enricher

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"devdeck/internal/domain/repos"
)

type WebhookEnricher struct {
	name        string
	pattern     string
	endpointURL string
	authHeader  *string
	httpc       *http.Client
}

func NewWebhookEnricher(name, pattern, endpointURL string, authHeader *string) *WebhookEnricher {
	return &WebhookEnricher{
		name:        name,
		pattern:     pattern,
		endpointURL: endpointURL,
		authHeader:  authHeader,
		httpc:       &http.Client{Timeout: 10 * time.Second},
	}
}

func (w *WebhookEnricher) Name() string       { return w.name }
func (w *WebhookEnricher) URLPattern() string { return w.pattern }

func (w *WebhookEnricher) Fetch(ctx context.Context, rawURL string) (*repos.Metadata, error) {
	body, _ := json.Marshal(map[string]string{"url": rawURL})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.endpointURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if w.authHeader != nil {
		req.Header.Set("Authorization", *w.authHeader)
	}

	resp, err := w.httpc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("webhook enricher %s returned status %d", w.name, resp.StatusCode)
	}

	var md repos.Metadata
	if err := json.NewDecoder(resp.Body).Decode(&md); err != nil {
		return nil, fmt.Errorf("decode webhook response: %w", err)
	}

	return &md, nil
}
