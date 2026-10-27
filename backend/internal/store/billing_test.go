package store_test

import (
	"testing"
	"time"

	"heapdeck/internal/domain/auth"
	"heapdeck/internal/store"
)

func TestStore_Billing_SubscriptionLifecycle(t *testing.T) {
	st, ctx := newStore(t)

	u, err := st.CreateUserLocal(ctx, "billing-store@example.test", "not-a-real-hash")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	if err := st.SetStripeCustomerID(ctx, u.ID, "cus_store_1"); err != nil {
		t.Fatalf("SetStripeCustomerID: %v", err)
	}
	got, err := st.GetUserByStripeCustomerID(ctx, "cus_store_1")
	if err != nil {
		t.Fatalf("GetUserByStripeCustomerID: %v", err)
	}
	if got.ID != u.ID {
		t.Fatalf("resolved %s, want %s", got.ID, u.ID)
	}
	if _, err := st.GetUserByStripeCustomerID(ctx, "cus_missing"); err != store.ErrNotFound {
		t.Fatalf("unknown customer err = %v, want ErrNotFound", err)
	}

	if err := st.ActivatePro(ctx, u.ID, "stripe"); err != nil {
		t.Fatalf("ActivatePro: %v", err)
	}
	pro, err := st.GetUserByID(ctx, u.ID)
	if err != nil {
		t.Fatalf("GetUserByID: %v", err)
	}
	if pro.Plan != auth.PlanPro {
		t.Fatalf("plan = %q, want pro", pro.Plan)
	}

	periodEnd := time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC)
	if err := st.UpsertSubscription(ctx, u.ID, "sub_store_1", "price_x", "active", &periodEnd); err != nil {
		t.Fatalf("UpsertSubscription: %v", err)
	}
	// Idempotent re-delivery with a status change.
	if err := st.UpsertSubscription(ctx, u.ID, "sub_store_1", "price_x", "past_due", &periodEnd); err != nil {
		t.Fatalf("UpsertSubscription update: %v", err)
	}

	first, err := st.MarkWebhookProcessed(ctx, "evt_store_1", "checkout.session.completed", []byte(`{}`))
	if err != nil || !first {
		t.Fatalf("first delivery = %v, %v; want true, nil", first, err)
	}
	second, err := st.MarkWebhookProcessed(ctx, "evt_store_1", "checkout.session.completed", []byte(`{}`))
	if err != nil || second {
		t.Fatalf("duplicate delivery = %v, %v; want false, nil", second, err)
	}

	if err := st.DeactivatePro(ctx, u.ID); err != nil {
		t.Fatalf("DeactivatePro: %v", err)
	}
	free, err := st.GetUserByID(ctx, u.ID)
	if err != nil {
		t.Fatalf("GetUserByID: %v", err)
	}
	if free.Plan != auth.PlanFree {
		t.Fatalf("plan = %q, want free", free.Plan)
	}
}
