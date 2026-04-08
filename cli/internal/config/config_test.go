package config

import (
	"os"
	"path/filepath"
	"testing"
)

// withTempHome points XDG_CONFIG_HOME + XDG_DATA_HOME at a fresh temp
// directory so tests can exercise the real file paths without touching
// the developer's actual config.
func withTempHome(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(dir, "config"))
	t.Setenv("XDG_DATA_HOME", filepath.Join(dir, "data"))
	return dir
}

func TestLoad_ReturnsDefaultsWhenFileMissing(t *testing.T) {
	withTempHome(t)
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.APIURL != Default().APIURL {
		t.Errorf("APIURL = %q, want %q", cfg.APIURL, Default().APIURL)
	}
	if cfg.DefaultSource != Default().DefaultSource {
		t.Errorf("DefaultSource = %q, want %q", cfg.DefaultSource, Default().DefaultSource)
	}
}

func TestSaveLoad_RoundTrip(t *testing.T) {
	withTempHome(t)
	in := Config{APIURL: "https://api.devdeck.ai", DefaultSource: "cli"}
	if err := Save(in); err != nil {
		t.Fatalf("Save: %v", err)
	}
	out, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if out.APIURL != in.APIURL {
		t.Errorf("APIURL = %q, want %q", out.APIURL, in.APIURL)
	}
	if out.DefaultSource != in.DefaultSource {
		t.Errorf("DefaultSource = %q, want %q", out.DefaultSource, in.DefaultSource)
	}
}

func TestSave_CreatesParentDirAndFilePermissions(t *testing.T) {
	dir := withTempHome(t)
	if err := Save(Default()); err != nil {
		t.Fatalf("Save: %v", err)
	}
	p := filepath.Join(dir, "config", "devdeck", "config.toml")
	info, err := os.Stat(p)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	// Unix-ish systems should honour 0600. On Windows perms map
	// differently so we only assert the file exists.
	if info.Mode().Perm() != 0o600 && !isWindows() {
		t.Errorf("expected 0600, got %v", info.Mode().Perm())
	}
}

func TestLoad_BackfillsBlankFields(t *testing.T) {
	withTempHome(t)
	p, err := Path()
	if err != nil {
		t.Fatal(err)
	}
	// Write a config that only sets one of the two fields.
	_ = os.WriteFile(p, []byte(`api_url = "https://example.com"`), 0o600)
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.APIURL != "https://example.com" {
		t.Errorf("APIURL not preserved")
	}
	if cfg.DefaultSource != Default().DefaultSource {
		t.Errorf("DefaultSource should fall back to default")
	}
}

func isWindows() bool {
	// The cli module doesn't use runtime.GOOS elsewhere; use an env
	// check instead to keep the test file dependency-free.
	return os.Getenv("OS") == "Windows_NT"
}
