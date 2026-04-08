package store_test

import (
	"context"
	"errors"
	"testing"

	"devdeck/internal/domain/commands"
	"devdeck/internal/domain/repos"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

func seedRepoCtx(t *testing.T, st *store.Store, ctx context.Context) *repos.Repo {
	t.Helper()
	r, err := st.CreateRepo(ctx, repos.CreateInput{URL: "https://github.com/u/r"})
	if err != nil {
		t.Fatalf("seed repo: %v", err)
	}
	return r
}

func TestStore_CreateCommand_AssignsIncreasingPositions(t *testing.T) {
	st, ctx := newStore(t)
	r := seedRepoCtx(t, st, ctx)

	for i, label := range []string{"first", "second", "third"} {
		c, err := st.CreateCommand(ctx, r.ID, commands.CreateInput{
			Label: label, Command: "echo " + label,
		})
		if err != nil {
			t.Fatalf("create cmd %d: %v", i, err)
		}
		if c.Position != i {
			t.Errorf("expected position=%d for %q, got %d", i, label, c.Position)
		}
	}

	list, err := st.ListCommandsByRepo(ctx, r.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("expected 3 commands, got %d", len(list))
	}
	if list[0].Label != "first" || list[2].Label != "third" {
		t.Errorf("unexpected order: %+v", list)
	}
}

func TestStore_BatchCreateCommands_TransactionalAndOrdered(t *testing.T) {
	st, ctx := newStore(t)
	r := seedRepoCtx(t, st, ctx)

	in := []commands.CreateInput{
		{Label: "dev", Command: "pnpm dev"},
		{Label: "test", Command: "pnpm test"},
		{Label: "build", Command: "pnpm build"},
	}
	out, err := st.BatchCreateCommands(ctx, r.ID, in)
	if err != nil {
		t.Fatalf("batch create: %v", err)
	}
	if len(out) != 3 {
		t.Fatalf("expected 3 created, got %d", len(out))
	}
	for i, c := range out {
		if c.Position != i {
			t.Errorf("expected position=%d for %q, got %d", i, c.Label, c.Position)
		}
	}
}

func TestStore_ReorderCommands_PersistsNewOrder(t *testing.T) {
	st, ctx := newStore(t)
	r := seedRepoCtx(t, st, ctx)

	a, _ := st.CreateCommand(ctx, r.ID, commands.CreateInput{Label: "a", Command: "echo a"})
	b, _ := st.CreateCommand(ctx, r.ID, commands.CreateInput{Label: "b", Command: "echo b"})
	c, _ := st.CreateCommand(ctx, r.ID, commands.CreateInput{Label: "c", Command: "echo c"})

	// Reverse order: c, b, a
	if err := st.ReorderCommands(ctx, r.ID, []uuid.UUID{c.ID, b.ID, a.ID}); err != nil {
		t.Fatalf("reorder: %v", err)
	}
	list, err := st.ListCommandsByRepo(ctx, r.ID)
	if err != nil {
		t.Fatalf("list after reorder: %v", err)
	}
	if list[0].ID != c.ID || list[1].ID != b.ID || list[2].ID != a.ID {
		t.Errorf("reorder didn't persist: %+v", list)
	}
}

func TestStore_UpdateCommand_PartialUpdate(t *testing.T) {
	st, ctx := newStore(t)
	r := seedRepoCtx(t, st, ctx)

	c, _ := st.CreateCommand(ctx, r.ID, commands.CreateInput{
		Label:   "old",
		Command: "echo old",
	})

	newLabel := "new"
	updated, err := st.UpdateCommand(ctx, c.ID, commands.UpdateInput{Label: &newLabel})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Label != "new" {
		t.Errorf("label not updated: %q", updated.Label)
	}
	if updated.Command != "echo old" {
		t.Errorf("command should be unchanged: %q", updated.Command)
	}
}

func TestStore_DeleteCommand(t *testing.T) {
	st, ctx := newStore(t)
	r := seedRepoCtx(t, st, ctx)

	c, _ := st.CreateCommand(ctx, r.ID, commands.CreateInput{
		Label: "x", Command: "echo x",
	})

	if err := st.DeleteCommand(ctx, c.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := st.DeleteCommand(ctx, c.ID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("expected ErrNotFound on second delete, got %v", err)
	}
}
