package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"heapdeck/internal/ai"
	"heapdeck/internal/authservice"
	"heapdeck/internal/billing"
	"heapdeck/internal/config"
	"heapdeck/internal/domain/auth"
	"heapdeck/internal/email"
	httpapi "heapdeck/internal/http"
	"heapdeck/internal/store"
	"heapdeck/internal/testutil"

	"github.com/stripe/stripe-go/v87"
	"golang.org/x/crypto/bcrypt"
)

const billingTestSecret = "whsec_test_secret"

// stubBillingClient avoids network in handler tests.
type stubBillingClient struct {
	checkoutURL string
	portalURL   string
	checkoutErr error
}

func (s *stubBillingClient) CreateCheckoutSession(_ context.Context, _, _, _, _, _ string) (string, error) {
	if s.checkoutErr != nil {
		return "", s.checkoutErr
	}
	return s.checkoutURL, nil
}

func (s *stubBillingClient) CreatePortalSession(_ context.Context, _, _ string) (string, error) {
	return s.portalURL, nil
}

var _ billing.Client = (*stubBillingClient)(nil)

type billingTestServer struct {
	router http.Handler
	store  *store.Store
	stub   *stubBillingClient
}

func newBillingTestServer(t *testing.T, enabled bool) *billingTestServer {
	t.Helper()

	pool := testutil.SetupPostgres(t)
	st := store.New(pool)
	as := authservice.New("test-jwt-secret", 15*time.Minute, 24*time.Hour)

	cfg := config.Config{
		Port:                 "0",
		AuthMode:             "jwt",
		JWTSecret:            "test-jwt-secret",
		LocalAuthEnabled:     true,
		RateLimitDisabled:    true,
		BillingEnabled:       enabled,
		StripeSecretKey:      "sk_test_x",
		StripeWebhookSecret:  billingTestSecret,
		StripeProPriceID:     "price_test_pro",
		AIMonthlyBudgetCents: 300,
	}

	stub := &stubBillingClient{
		checkoutURL: "https://checkout.stripe.test/session_123",
		portalURL:   "https://billing.stripe.test/portal_123",
	}
	router := httpapi.NewRouterWithDeps(cfg, httpapi.Deps{
		Store:       st,
		AuthService: as,
		AI:          ai.NewHeuristic(),
		Embeddings:  ai.NewEmbeddingsService(nil),
		EmailSender: &email.NoopSender{},
		Billing:     stub,
	})
	return &billingTestServer{router: router, store: st, stub: stub}
}

func (ts *billingTestServer) createLocalUser(t *testing.T, login string) *auth.User {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(cookieTestPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	u, err := ts.store.CreateUserLocal(context.Background(), login, string(hash))
	if err != nil {
		t.Fatalf("create local user: %v", err)
	}
	return u
}

func (ts *billingTestServer) loginAs(t *testing.T, login string) string {
	t.Helper()
	rec := ts.do(t, http.MethodPost, "/api/auth/login", map[string]string{
		"email":    login,
		"password": cookieTestPassword,
	}, "", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("login: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	return decodePair(t, rec).AccessToken
}

func (ts *billingTestServer) do(t *testing.T, method, path string, body any, token string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		rdr = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, rdr)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	return rec
}

func bytesReader(b []byte) io.Reader { return bytes.NewReader(b) }

// signedWebhook builds a Stripe-Signature header for the raw payload.
func signedWebhook(payload []byte) string {
	signed := stripe.GenerateTestSignedPayload(&stripe.UnsignedPayload{
		Payload: payload,
		Secret:  billingTestSecret,
	})
	return signed.Header
}

func TestBilling_CheckoutCreatesSession(t *testing.T) {
	ts := newBillingTestServer(t, true)
	ts.createLocalUser(t, "buyer@example.test")
	token := ts.loginAs(t, "buyer@example.test")

	rec := ts.do(t, http.MethodPost, "/api/billing/checkout", map[string]any{}, token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("checkout: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	type checkoutResp struct {
		CheckoutURL string `json:"checkout_url"`
	}
	out := decodeJSON[checkoutResp](t, rec)
	if out.CheckoutURL != ts.stub.checkoutURL {
		t.Fatalf("checkout_url = %q", out.CheckoutURL)
	}
}

func TestBilling_CheckoutRejectsProAndDisabled(t *testing.T) {
	ts := newBillingTestServer(t, true)
	u := ts.createLocalUser(t, "already-pro@example.test")
	if err := ts.store.ActivatePro(context.Background(), u.ID, "admin"); err != nil {
		t.Fatalf("ActivatePro: %v", err)
	}
	token := ts.loginAs(t, "already-pro@example.test")

	rec := ts.do(t, http.MethodPost, "/api/billing/checkout", map[string]any{}, token, nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("pro checkout: expected 409, got %d, body: %s", rec.Code, rec.Body.String())
	}

	off := newBillingTestServer(t, false)
	off.createLocalUser(t, "no-billing@example.test")
	offToken := off.loginAs(t, "no-billing@example.test")
	rec = off.do(t, http.MethodPost, "/api/billing/checkout", map[string]any{}, offToken, nil)
	if rec.Code != http.StatusNotImplemented {
		t.Fatalf("disabled checkout: expected 501, got %d, body: %s", rec.Code, rec.Body.String())
	}
	rec = off.do(t, http.MethodPost, "/api/billing/portal", map[string]any{}, offToken, nil)
	if rec.Code != http.StatusNotImplemented {
		t.Fatalf("disabled portal: expected 501, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestBilling_PortalRequiresCustomer(t *testing.T) {
	ts := newBillingTestServer(t, true)
	ts.createLocalUser(t, "no-customer@example.test")
	token := ts.loginAs(t, "no-customer@example.test")

	rec := ts.do(t, http.MethodPost, "/api/billing/portal", map[string]any{}, token, nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("portal without customer: expected 409, got %d, body: %s", rec.Code, rec.Body.String())
	}

	user, _, err := ts.store.GetUserByLogin(context.Background(), "no-customer@example.test")
	if err != nil {
		t.Fatalf("GetUserByLogin: %v", err)
	}
	if err := ts.store.SetStripeCustomerID(context.Background(), user.ID, "cus_test_1"); err != nil {
		t.Fatalf("SetStripeCustomerID: %v", err)
	}
	rec = ts.do(t, http.MethodPost, "/api/billing/portal", map[string]any{}, token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("portal: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestBilling_WebhookCheckoutActivatesPro(t *testing.T) {
	ts := newBillingTestServer(t, true)
	u := ts.createLocalUser(t, "webhook-buyer@example.test")

	payload := []byte(fmt.Sprintf(`{
		"id": "evt_test_checkout_1",
		"object": "event",
		"api_version": "2026-09-30.endive",
		"type": "checkout.session.completed",
		"data": {"object": {
			"client_reference_id": %q,
			"customer": "cus_test_webhook",
			"subscription": "sub_test_webhook"
		}}
	}`, u.ID.String()))

	// Raw body must reach the handler untouched (signature covers it).
	req := httptest.NewRequest(http.MethodPost, "/api/billing/webhook", bytesReader(payload))
	req.Header.Set("Stripe-Signature", signedWebhook(payload))
	rec2 := httptest.NewRecorder()
	ts.router.ServeHTTP(rec2, req)
	if rec2.Code != http.StatusOK {
		t.Fatalf("webhook: expected 200, got %d, body: %s", rec2.Code, rec2.Body.String())
	}

	got, err := ts.store.GetUserByID(context.Background(), u.ID)
	if err != nil {
		t.Fatalf("GetUserByID: %v", err)
	}
	if got.Plan != auth.PlanPro {
		t.Fatalf("plan = %q, want pro", got.Plan)
	}
	if got.StripeCustomerID == nil || *got.StripeCustomerID != "cus_test_webhook" {
		t.Fatalf("customer not linked: %+v", got.StripeCustomerID)
	}

	// Duplicate delivery: acked, not double-processed.
	rec3 := httptest.NewRecorder()
	req3 := httptest.NewRequest(http.MethodPost, "/api/billing/webhook", bytesReader(payload))
	req3.Header.Set("Stripe-Signature", signedWebhook(payload))
	ts.router.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusOK {
		t.Fatalf("duplicate webhook: expected 200, got %d", rec3.Code)
	}
}

func TestBilling_WebhookRejectsBadSignature(t *testing.T) {
	ts := newBillingTestServer(t, true)
	payload := []byte(`{"id":"evt_bad","object":"event","api_version":"2026-09-30.endive","type":"checkout.session.completed","data":{"object":{}}}`)

	req := httptest.NewRequest(http.MethodPost, "/api/billing/webhook", bytesReader(payload))
	req.Header.Set("Stripe-Signature", "t=123,v1=deadbeef")
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad signature: expected 400, got %d, body: %s", rec.Code, rec.Body.String())
	}

	// Disabled server: 501 even before signature check.
	off := newBillingTestServer(t, false)
	req = httptest.NewRequest(http.MethodPost, "/api/billing/webhook", bytesReader(payload))
	req.Header.Set("Stripe-Signature", signedWebhook(payload))
	rec = httptest.NewRecorder()
	off.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotImplemented {
		t.Fatalf("disabled webhook: expected 501, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestBilling_WebhookSubscriptionLifecycle(t *testing.T) {
	ts := newBillingTestServer(t, true)
	u := ts.createLocalUser(t, "lifecycle@example.test")
	ctx := context.Background()
	if err := ts.store.SetStripeCustomerID(ctx, u.ID, "cus_test_lifecycle"); err != nil {
		t.Fatalf("SetStripeCustomerID: %v", err)
	}
	if err := ts.store.ActivatePro(ctx, u.ID, "stripe"); err != nil {
		t.Fatalf("ActivatePro: %v", err)
	}

	fire := func(id, typ, status string) *httptest.ResponseRecorder {
		payload := []byte(fmt.Sprintf(`{
			"id": %q, "object": "event", "api_version": "2026-09-30.endive", "type": %q,
			"data": {"object": {
				"id": "sub_test_lifecycle", "status": %q,
				"customer": "cus_test_lifecycle", "current_period_end": 1893456000
			}}
		}`, id, typ, status))
		req := httptest.NewRequest(http.MethodPost, "/api/billing/webhook", bytesReader(payload))
		req.Header.Set("Stripe-Signature", signedWebhook(payload))
		rec := httptest.NewRecorder()
		ts.router.ServeHTTP(rec, req)
		return rec
	}

	// past_due keeps Pro (dunning gray zone).
	if rec := fire("evt_test_past_due", "customer.subscription.updated", "past_due"); rec.Code != http.StatusOK {
		t.Fatalf("past_due: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	if got, _ := ts.store.GetUserByID(ctx, u.ID); got.Plan != auth.PlanPro {
		t.Fatalf("past_due must keep pro, got %q", got.Plan)
	}

	// canceled drops to free.
	if rec := fire("evt_test_canceled", "customer.subscription.deleted", "canceled"); rec.Code != http.StatusOK {
		t.Fatalf("canceled: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	if got, _ := ts.store.GetUserByID(ctx, u.ID); got.Plan != auth.PlanFree {
		t.Fatalf("canceled must drop to free, got %q", got.Plan)
	}

	// Unknown customer acks silently.
	payload := []byte(`{"id":"evt_test_ghost","object":"event","api_version":"2026-09-30.endive","type":"customer.subscription.updated",
		"data":{"object":{"id":"sub_ghost","status":"active","customer":"cus_ghost"}}}`)
	req := httptest.NewRequest(http.MethodPost, "/api/billing/webhook", bytesReader(payload))
	req.Header.Set("Stripe-Signature", signedWebhook(payload))
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("ghost customer: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
}

func TestBilling_AdminSetPlanOverride(t *testing.T) {
	ts := newBillingTestServer(t, true)
	admin := ts.createLocalUser(t, "support-admin@example.test")
	target := ts.createLocalUser(t, "override-target@example.test")
	ctx := context.Background()

	// Promote via SQL (no public role API by design).
	if _, err := ts.store.Pool().Exec(ctx, `UPDATE users SET role = 'admin' WHERE id = $1`, admin.ID); err != nil {
		t.Fatalf("promote admin: %v", err)
	}
	adminToken := ts.loginAs(t, "support-admin@example.test")
	userToken := ts.loginAs(t, "override-target@example.test")

	// Non-admin is forbidden.
	rec := ts.do(t, http.MethodPost, "/api/admin/users/"+target.ID.String()+"/plan", map[string]string{"plan": "pro"}, userToken, nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("non-admin override: expected 403, got %d, body: %s", rec.Code, rec.Body.String())
	}

	// Admin grants pro.
	rec = ts.do(t, http.MethodPost, "/api/admin/users/"+target.ID.String()+"/plan", map[string]string{"plan": "pro"}, adminToken, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin grant: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	if got, _ := ts.store.GetUserByID(ctx, target.ID); got.Plan != auth.PlanPro {
		t.Fatalf("plan = %q, want pro", got.Plan)
	}

	// Admin revokes to free.
	rec = ts.do(t, http.MethodPost, "/api/admin/users/"+target.ID.String()+"/plan", map[string]string{"plan": "free"}, adminToken, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin revoke: expected 200, got %d, body: %s", rec.Code, rec.Body.String())
	}
	if got, _ := ts.store.GetUserByID(ctx, target.ID); got.Plan != auth.PlanFree {
		t.Fatalf("plan = %q, want free", got.Plan)
	}

	// Invalid plan rejected.
	rec = ts.do(t, http.MethodPost, "/api/admin/users/"+target.ID.String()+"/plan", map[string]string{"plan": "enterprise"}, adminToken, nil)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("bad plan: expected 422, got %d, body: %s", rec.Code, rec.Body.String())
	}
}
