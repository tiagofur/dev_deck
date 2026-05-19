package store_test

import (
	"errors"
	"testing"

	"devdeck/internal/store"
)

func TestStore_GetSAMLConfigByDomain_NotFound(t *testing.T) {
	st, ctx := newStore(t)

	// Query for a non-existing domain
	_, err := st.GetSAMLConfigByDomain(ctx, "nonexistent-domain.com")
	if err == nil {
		t.Fatal("expected an error, got nil")
	}

	if !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected store.ErrNotFound, got %v", err)
	}
}
