package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseKeybindings(t *testing.T) {
	content := `[
    {
        "key": "shift+cmd+c",
        "command": "workbench.action.terminal.openNativeConsole"
    },
    // some comment
    {
        "key": "alt+f12",
        "command": "editor.action.referenceSearch.trigger"
    }
]`
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "keybindings.json")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	kbs, err := parseKeybindings(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(kbs) != 2 {
		t.Fatalf("expected 2 keybindings, got %d", len(kbs))
	}

	if kbs[0].Key != "shift+cmd+c" {
		t.Errorf("expected shift+cmd+c, got %s", kbs[0].Key)
	}
}
