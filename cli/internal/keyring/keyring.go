// Package keyring wraps zalando/go-keyring with a file-based fallback so
// the CLI still works on Linux minimal containers (CI, SSH boxes) where
// there's no Secret Service daemon running.
//
// Secrets are stored under the "devdeck-cli" service name; individual
// keys are namespaced with the API URL so a user can point at multiple
// backends without clobbering each other's tokens.
package keyring

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	zk "github.com/zalando/go-keyring"
)

const service = "devdeck-cli"

// ErrNotFound is returned when no token is stored for the given key.
var ErrNotFound = errors.New("keyring: token not found")

// Store persists a token for the given key (typically the API URL so
// multiple backends can coexist).
func Store(key, token string) error {
	if err := zk.Set(service, key, token); err != nil {
		// Fall back to a 0600 file under $XDG_DATA_HOME/devdeck if the OS
		// keyring isn't available (headless Linux, WSL without gnome-keyring).
		return storeFile(key, token)
	}
	return nil
}

// Get fetches the token for key. Returns ErrNotFound if none stored.
func Get(key string) (string, error) {
	token, err := zk.Get(service, key)
	if err == nil {
		return token, nil
	}
	if errors.Is(err, zk.ErrNotFound) {
		// Try the file fallback before giving up — we may have stored
		// there originally when the OS keyring wasn't available.
		if t, ferr := getFile(key); ferr == nil {
			return t, nil
		}
		return "", ErrNotFound
	}
	// Unknown keyring error → try file fallback, then surface the original.
	if t, ferr := getFile(key); ferr == nil {
		return t, nil
	}
	return "", fmt.Errorf("keyring get: %w", err)
}

// Delete removes the token for key from both the OS keyring and the
// file fallback.
func Delete(key string) error {
	// Best-effort: try both so a partially-stored secret doesn't linger.
	_ = zk.Delete(service, key)
	return deleteFile(key)
}

// ─── File fallback ───
//
// The fallback stores a flat map[string]string as JSON under 0600 in
// ~/.local/share/devdeck/keyring.json. It's not encrypted — we rely on
// filesystem perms. This is explicitly a fallback for headless boxes;
// the real keyring is always tried first.

type fileStore struct {
	Tokens map[string]string `json:"tokens"`
}

func fallbackPath() (string, error) {
	if xdg := os.Getenv("XDG_DATA_HOME"); xdg != "" {
		return filepath.Join(xdg, "devdeck", "keyring.json"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".local", "share", "devdeck", "keyring.json"), nil
}

func loadFile() (*fileStore, error) {
	p, err := fallbackPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &fileStore{Tokens: map[string]string{}}, nil
		}
		return nil, err
	}
	var fs fileStore
	if err := json.Unmarshal(data, &fs); err != nil {
		return nil, err
	}
	if fs.Tokens == nil {
		fs.Tokens = map[string]string{}
	}
	return &fs, nil
}

func writeFile(fs *fileStore) error {
	p, err := fallbackPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o700); err != nil {
		return err
	}
	data, err := json.Marshal(fs)
	if err != nil {
		return err
	}
	tmp := p + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, p)
}

func storeFile(key, token string) error {
	fs, err := loadFile()
	if err != nil {
		return err
	}
	fs.Tokens[key] = token
	return writeFile(fs)
}

func getFile(key string) (string, error) {
	fs, err := loadFile()
	if err != nil {
		return "", err
	}
	t, ok := fs.Tokens[key]
	if !ok {
		return "", ErrNotFound
	}
	return t, nil
}

func deleteFile(key string) error {
	fs, err := loadFile()
	if err != nil {
		return err
	}
	delete(fs.Tokens, key)
	return writeFile(fs)
}
