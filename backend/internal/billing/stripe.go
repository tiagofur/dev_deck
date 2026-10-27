// Package billing wraps the Stripe API for the $5/mo Pro plan.
//
// The Client interface keeps handlers testable without network: production
// uses stripeClient (stripe-go v87), tests stub the two calls. Webhook
// signature verification always uses stripe-go — hand-rolled HMAC here
// would be a security liability.
package billing

import (
	"context"

	"github.com/stripe/stripe-go/v87"
)

// Client creates checkout and portal sessions. Small surface on purpose:
// plan changes flow exclusively through verified webhooks, never through
// these calls' responses.
type Client interface {
	CreateCheckoutSession(ctx context.Context, userID, priceID, customerID, successURL, cancelURL string) (url string, err error)
	CreatePortalSession(ctx context.Context, customerID, returnURL string) (url string, err error)
}

// stripeClient is the production Stripe API wrapper.
type stripeClient struct {
	sc *stripe.Client
}

// NewClient builds the production client. Empty key yields a client whose
// calls fail fast — handlers check BillingEnabled first anyway.
func NewClient(secretKey string) Client {
	return &stripeClient{sc: stripe.NewClient(secretKey)}
}

func (c *stripeClient) CreateCheckoutSession(ctx context.Context, userID, priceID, customerID, successURL, cancelURL string) (string, error) {
	params := &stripe.CheckoutSessionCreateParams{
		Mode:              stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		ClientReferenceID: stripe.String(userID),
		SuccessURL:        stripe.String(successURL + "?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:         stripe.String(cancelURL),
		LineItems: []*stripe.CheckoutSessionCreateLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
	}
	if customerID != "" {
		params.Customer = stripe.String(customerID)
	}
	sess, err := c.sc.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return "", err
	}
	return sess.URL, nil
}

func (c *stripeClient) CreatePortalSession(ctx context.Context, customerID, returnURL string) (string, error) {
	sess, err := c.sc.V1BillingPortalSessions.Create(ctx, &stripe.BillingPortalSessionCreateParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	})
	if err != nil {
		return "", err
	}
	return sess.URL, nil
}

// VerifySignature validates the Stripe-Signature header and parses the
// event. The raw body must be passed untouched — any re-encoding breaks
// the HMAC.
func VerifySignature(payload []byte, header, secret string) (stripe.Event, error) {
	return stripe.ConstructEvent(payload, header, secret)
}
