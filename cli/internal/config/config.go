// Package config loads and persists the CLI's settings from
// ~/.config/devdeck/config.toml. The config holds everything that's
// not a secret — the token lives in the OS keychain via internal/keyring.
package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

// Config mirrors the TOML file layout. Missing keys fall back to defaults
// so a brand-new install just works after `devdeck login`.
type Config struct {
	// APIURL is the DevDeck backend root, e.g. "http://localhost:8080"
	// for self-hosters or "https://api.devdeck.ai" for the hosted flavour.
	APIURL string `toml:"api_url"`
	// DefaultSource is the `source` label the CLI reports in
	// /api/items/capture calls. Lets us slice metrics by entry point.
	DefaultSource string `toml:"default_source"`
}

// Default returns the out-of-the-box config for a fresh install.
func Default() Config {
	return Config{
		APIURL:        "http://localhost:8080",
		DefaultSource: "cli",
	}
}

// Path returns the absolute path to config.toml, creating the parent
// directory if needed so the caller can just Write().
func Path() (string, error) {
	dir, err := dir()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("mkdir config dir: %w", err)
	}
	return filepath.Join(dir, "config.toml"), nil
}

// dir resolves the base config directory. We respect XDG_CONFIG_HOME
// for Linux power users and fall back to ~/.config/devdeck otherwise.
func dir() (string, error) {
	if xdg := os.Getenv("XDG_CONFIG_HOME"); xdg != "" {
		return filepath.Join(xdg, "devdeck"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "devdeck"), nil
}

// Load reads config.toml. If the file doesn't exist we return Default()
// and no error — "no config yet" is a valid state for a first run.
func Load() (Config, error) {
	p, err := Path()
	if err != nil {
		return Config{}, err
	}
	cfg := Default()
	data, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return cfg, nil
		}
		return Config{}, fmt.Errorf("read config: %w", err)
	}
	if err := toml.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config: %w", err)
	}
	// Backfill defaults for any fields left blank.
	if cfg.APIURL == "" {
		cfg.APIURL = Default().APIURL
	}
	if cfg.DefaultSource == "" {
		cfg.DefaultSource = Default().DefaultSource
	}
	return cfg, nil
}

// Save writes cfg to config.toml atomically (write-temp + rename) so a
// crash mid-write never leaves a half-baked file on disk.
func Save(cfg Config) error {
	p, err := Path()
	if err != nil {
		return err
	}
	tmp := p + ".tmp"
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return fmt.Errorf("open temp config: %w", err)
	}
	if err := toml.NewEncoder(f).Encode(cfg); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return fmt.Errorf("encode config: %w", err)
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("close config: %w", err)
	}
	if err := os.Rename(tmp, p); err != nil {
		return fmt.Errorf("rename config: %w", err)
	}
	return nil
}
