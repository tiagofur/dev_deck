package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Sender defines the interface for sending transactional emails.
type Sender interface {
	Send(ctx context.Context, to, subject, htmlBody string) error
}

// ResendSender implements Sender using the Resend HTTP API.
type ResendSender struct {
	apiKey string
	client *http.Client
}

func NewResendSender(apiKey string) *ResendSender {
	return &ResendSender{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func (s *ResendSender) Send(ctx context.Context, to, subject, htmlBody string) error {
	if s.apiKey == "" {
		return fmt.Errorf("resend API key is not configured")
	}

	reqBody := resendRequest{
		From:    "DevDeck <noreply@devdeck.app>", // Should probably be configurable
		To:      []string{to},
		Subject: subject,
		HTML:    htmlBody,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal email request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("resend API returned status %d", resp.StatusCode)
	}

	return nil
}

// NoopSender is used when local auth is disabled or for testing.
// In development, it logs the email to stdout so links can be recovered.
type NoopSender struct{}

func (s *NoopSender) Send(ctx context.Context, to, subject, htmlBody string) error {
	fmt.Printf("\n--- [DEV EMAIL] ---\nTo: %s\nSubject: %s\nBody: %s\n-------------------\n\n", to, subject, htmlBody)
	return nil
}
