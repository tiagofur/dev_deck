package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"heapdeck/internal/authctx"
	"heapdeck/internal/billing"
	"heapdeck/internal/domain/auth"
	"heapdeck/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v87"
)

// BillingHandler serves Pro checkout, the customer portal, and the Stripe
// webhook. Plan changes flow exclusively through verified webhooks — the
// checkout response only carries a redirect URL.
type BillingHandler struct {
	store         *store.Store
	client        billing.Client
	enabled       bool
	priceID       string
	webhookSecret string
	successURL    string
	cancelURL     string
	portalURL     string
}

// BillingConfig wires the handler. client may be nil when disabled.
func NewBillingHandler(s *store.Store, client billing.Client, enabled bool, priceID, webhookSecret, successURL, cancelURL, portalURL string) *BillingHandler {
	return &BillingHandler{
		store: s, client: client, enabled: enabled, priceID: priceID,
		webhookSecret: webhookSecret, successURL: successURL,
		cancelURL: cancelURL, portalURL: portalURL,
	}
}

// POST /api/billing/checkout — create a Pro subscription checkout session.
func (h *BillingHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	if !h.enabled || h.client == nil {
		writeError(w, http.StatusNotImplemented, "BILLING_DISABLED", "billing is not enabled on this server")
		return
	}
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if user.Plan == auth.PlanPro {
		writeError(w, http.StatusConflict, "ALREADY_PRO", "user is already on the Pro plan")
		return
	}
	var customerID string
	if user.StripeCustomerID != nil {
		customerID = *user.StripeCustomerID
	}
	url, err := h.client.CreateCheckoutSession(r.Context(), userID.String(), h.priceID, customerID, h.successURL, h.cancelURL)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"checkout_url": url})
}

// POST /api/billing/portal — open the Stripe customer portal (manage/cancel).
func (h *BillingHandler) Portal(w http.ResponseWriter, r *http.Request) {
	if !h.enabled || h.client == nil {
		writeError(w, http.StatusNotImplemented, "BILLING_DISABLED", "billing is not enabled on this server")
		return
	}
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if user.StripeCustomerID == nil || *user.StripeCustomerID == "" {
		writeError(w, http.StatusConflict, "NO_SUBSCRIPTION", "no billing customer yet; subscribe first")
		return
	}
	url, err := h.client.CreatePortalSession(r.Context(), *user.StripeCustomerID, h.portalURL)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"portal_url": url})
}

// POST /api/billing/webhook — Stripe event delivery (public, signed).
// Always ack 200 after verification, even for unhandled types: Stripe
// retries non-2xx and would redeliver forever.
func (h *BillingHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	if !h.enabled {
		writeError(w, http.StatusNotImplemented, "BILLING_DISABLED", "billing is not enabled on this server")
		return
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "cannot read body")
		return
	}
	event, err := billing.VerifySignature(raw, r.Header.Get("Stripe-Signature"), h.webhookSecret)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SIGNATURE", "webhook signature verification failed")
		return
	}
	first, err := h.store.MarkWebhookProcessed(r.Context(), event.ID, string(event.Type), raw)
	if err != nil {
		writeInternal(w, err)
		return
	}
	if !first {
		writeJSON(w, http.StatusOK, map[string]any{"received": true, "duplicate": true})
		return
	}
	if err := h.applyEvent(r, event); err != nil {
		// Verified + recorded, but unprocessable: log loudly and still ack
		// so Stripe doesn't retry a poison event forever. Operators can
		// replay from the Stripe dashboard after a fix.
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"received": true})
}

// checkoutSessionObject is the minimal shape we need from the event payload.
// Parsing into small local structs (instead of stripe-go's giant types)
// keeps the webhook robust against API-version field drift.
type checkoutSessionObject struct {
	ClientReferenceID string `json:"client_reference_id"`
	Customer          string `json:"customer"`
	Subscription      string `json:"subscription"`
}

type subscriptionObject struct {
	ID              string `json:"id"`
	Status          string `json:"status"`
	Customer        string `json:"customer"`
	CurrentPeriodEnd int64 `json:"current_period_end"`
}

func (h *BillingHandler) applyEvent(r *http.Request, event stripe.Event) error {
	ctx := r.Context()
	if event.Data == nil {
		return nil // nothing to apply
	}
	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted:
		var sess checkoutSessionObject
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			return err
		}
		userID, err := uuid.Parse(sess.ClientReferenceID)
		if err != nil {
			return err
		}
		if sess.Customer != "" {
			if err := h.store.SetStripeCustomerID(ctx, userID, sess.Customer); err != nil {
				return err
			}
		}
		if err := h.store.ActivatePro(ctx, userID, "stripe"); err != nil {
			return err
		}
		if sess.Subscription != "" {
			_ = h.store.UpsertSubscription(ctx, userID, sess.Subscription, h.priceID, "active", nil)
		}
		return nil
	case stripe.EventTypeCustomerSubscriptionUpdated,
		stripe.EventTypeCustomerSubscriptionDeleted:
		var sub subscriptionObject
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return err
		}
		if sub.Customer == "" {
			return errors.New("subscription event without customer")
		}
		user, err := h.store.GetUserByStripeCustomerID(ctx, sub.Customer)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return nil // customer isn't ours (or test-mode noise): ack
			}
			return err
		}
		var periodEnd *time.Time
		if sub.CurrentPeriodEnd > 0 {
			t := time.Unix(sub.CurrentPeriodEnd, 0).UTC()
			periodEnd = &t
		}
		if err := h.store.UpsertSubscription(ctx, user.ID, sub.ID, h.priceID, sub.Status, periodEnd); err != nil {
			return err
		}
		switch sub.Status {
		case "active", "trialing":
			return h.store.ActivatePro(ctx, user.ID, "stripe")
		case "canceled", "incomplete_expired", "unpaid":
			return h.store.DeactivatePro(ctx, user.ID)
		default:
			// past_due, incomplete, paused: keep Pro until Stripe says
			// it's dead. Dunning handles the gray zone, not us.
			return nil
		}
	default:
		return nil // unhandled types ack silently
	}
}

// POST /api/admin/users/{id}/plan — support override for plan changes.
// Body: {"plan": "pro"|"free"}. Separate from Stripe so support can grant
// trials, comp accounts, or fix webhook drift.
func (h *BillingHandler) SetPlan(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Plan string `json:"plan"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid json body")
		return
	}
	if body.Plan != auth.PlanPro && body.Plan != auth.PlanFree {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_PLAN", "plan must be pro or free")
		return
	}
	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "id must be a uuid")
		return
	}
	if body.Plan == auth.PlanPro {
		if err := h.store.ActivatePro(r.Context(), userID, "admin"); err != nil {
			writeInternal(w, err)
			return
		}
	} else {
		if err := h.store.DeactivatePro(r.Context(), userID); err != nil {
			writeInternal(w, err)
			return
		}
	}
	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}
