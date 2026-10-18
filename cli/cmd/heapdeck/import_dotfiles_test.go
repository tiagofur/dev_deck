package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseShellFile(t *testing.T) {
	content := `
# Some comment
alias gs='git status'
alias gcp="git cherry-pick"
alias k=kubectl

# Function with name() syntax
hello() {
    echo "hello world"
}

# Function with function keyword
function build {
    pnpm build
    echo "done"
}

# Nested braces function
complex() {
    if true; {
        echo "nested"
    }
}
`
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, ".zshrc")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	items, err := parseShellFile(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := []struct {
		name string
		typ  string
	}{
		{"gs", "alias"},
		{"gcp", "alias"},
		{"k", "alias"},
		{"hello", "function"},
		{"build", "function"},
		{"complex", "function"},
	}

	if len(items) != len(expected) {
		t.Fatalf("expected %d items, got %d", len(expected), len(items))
	}

	for i, exp := range expected {
		if items[i].Name != exp.name {
			t.Errorf("item %d: expected name %q, got %q", i, exp.name, items[i].Name)
		}
		if items[i].Type != exp.typ {
			t.Errorf("item %d: expected type %q, got %q", i, exp.typ, items[i].Type)
		}
	}

	// Verify alias content
	if items[0].Content != "git status" {
		t.Errorf("expected 'git status', got %q", items[0].Content)
	}
}
