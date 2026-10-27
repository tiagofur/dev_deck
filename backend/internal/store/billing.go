package store

import (
	"context"
	"time"

	"heapdeck/internal/domain/auth"

	"github.com/google/uuid"
)

// SetStripeCustomerID links a user to their Stripe customer. Called from the
// checkout.completed webhook; idempotent on repeat deliveries.
func (s *Store) SetStripeCustomerID(ctx context.Context, userID uuid.UUID, customerID string) error {
	_, err := s.Writer().Exec(ctx, `
		UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1
	`, userID, customerID)
	return err
}

// GetUserByStripeCustomerID resolves the webhook's customer to a user.
func (s *Store) GetUserByStripeCustomerID(ctx context.Context, customerID string) (*auth.User, error) {
	row := s.Reader().QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE stripe_customer_id = $1`, customerID)
	return scanUser(row)
}

// ActivatePro flips a user to Pro from a verified billing event. pro_since
// stamps the first activation only; plan_source records the channel.
func (s *Store) ActivatePro(ctx context.Context, userID uuid.UUID, source string) error {
	_, err := s.Writer().Exec(ctx, `
		UPDATE users
		SET plan = 'pro',
		    pro_since = COALESCE(pro_since, NOW()),
		    plan_source = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, userID, source)
	return err
}

// DeactivatePro returns a user to Free (cancelled/expired subscription).
// AI artifacts already generated stay; only future AI spend stops.
func (s *Store) DeactivatePro(ctx context.Context, userID uuid.UUID) error {
	_, err := s.Writer().Exec(ctx, `
		UPDATE users
		SET plan = 'free',
		    plan_source = 'stripe',
		    updated_at = NOW()
		WHERE id = $1
	`, userID)
	return err
}

// UpsertSubscription records the Stripe subscription state. Webhook
// deliveries are at-least-once, so this must be idempotent.
func (s *Store) UpsertSubscription(ctx context.Context, userID uuid.UUID, subscriptionID, priceID, status string, periodEnd *time.Time) error {
	_, err := s.Writer().Exec(ctx, `
		INSERT INTO billing_subscriptions (user_id, stripe_subscription_id, stripe_price_id, status, current_period_end)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (stripe_subscription_id) DO UPDATE SET
			stripe_price_id = EXCLUDED.stripe_price_id,
			status = EXCLUDED.status,
			current_period_end = EXCLUDED.current_period_end,
			updated_at = NOW()
	`, userID, subscriptionID, priceID, status, periodEnd)
	return err
}

// MarkWebhookProcessed inserts the event id, returning false when it was
// already seen (duplicate delivery — skip processing, still ack 200).
func (s *Store) MarkWebhookProcessed(ctx context.Context, eventID, eventType string, payload []byte) (bool, error) {
	tag, err := s.Writer().Exec(ctx, `
		INSERT INTO stripe_webhook_events (stripe_event_id, type, payload)
		VALUES ($1, $2, $3)
		ON CONFLICT (stripe_event_id) DO NOTHING
	`, eventID, eventType, payload)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}
