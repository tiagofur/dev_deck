package store_test

import (
	"testing"

	"heapdeck/internal/store"
)

func TestStore_AIUsage_RecordAndMonthly(t *testing.T) {
	st, ctx := newStore(t)

	u, err := st.CreateUserLocal(ctx, "usage-user@example.test", "not-a-real-hash")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	empty, err := st.GetMonthlyUsage(ctx, u.ID)
	if err != nil {
		t.Fatalf("GetMonthlyUsage: %v", err)
	}
	if empty.UsedCents != 0 || len(empty.ByAction) != 0 {
		t.Fatalf("fresh user usage = %+v, want zeros", empty)
	}
	if empty.ResetsAt.IsZero() {
		t.Fatal("ResetsAt must be set")
	}

	events := []store.AIUsageEvent{
		{Action: store.AIActionEnrich, Provider: "openai", Model: "gpt-4o-mini", InputTokens: 1000, OutputTokens: 100, EstimatedCents: 0.021},
		{Action: store.AIActionEnrich, Provider: "openai", Model: "gpt-4o-mini", InputTokens: 500, OutputTokens: 50, EstimatedCents: 0.0105},
		{Action: store.AIActionEmbedSearch, Provider: "openai", Model: "text-embedding-3-small", InputTokens: 50, EstimatedCents: 0.0001},
	}
	for _, ev := range events {
		if err := st.RecordAIUsage(ctx, u.ID, ev); err != nil {
			t.Fatalf("RecordAIUsage: %v", err)
		}
	}

	got, err := st.GetMonthlyUsage(ctx, u.ID)
	if err != nil {
		t.Fatalf("GetMonthlyUsage: %v", err)
	}
	want := 0.021 + 0.0105 + 0.0001
	if diff := got.UsedCents - want; diff > 0.0001 || diff < -0.0001 {
		t.Fatalf("UsedCents = %v, want %v", got.UsedCents, want)
	}
	if len(got.ByAction) != 2 {
		t.Fatalf("ByAction has %d entries, want 2 (enrich + embed_search)", len(got.ByAction))
	}
	for _, a := range got.ByAction {
		switch a.Action {
		case store.AIActionEnrich:
			if a.Events != 2 {
				t.Errorf("enrich events = %d, want 2", a.Events)
			}
		case store.AIActionEmbedSearch:
			if a.Events != 1 {
				t.Errorf("embed_search events = %d, want 1", a.Events)
			}
		default:
			t.Errorf("unexpected action %q", a.Action)
		}
	}

	spent, err := st.MonthlySpendCents(ctx, u.ID)
	if err != nil {
		t.Fatalf("MonthlySpendCents: %v", err)
	}
	if diff := spent - want; diff > 0.0001 || diff < -0.0001 {
		t.Fatalf("MonthlySpendCents = %v, want %v", spent, want)
	}
}
