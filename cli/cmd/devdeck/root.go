package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"devdeck-cli/internal/apiclient"
	"devdeck-cli/internal/config"
	"devdeck-cli/internal/keyring"

	"github.com/spf13/cobra"
)

// rootCmd is the `devdeck` entrypoint. Subcommands live in the other
// files in this package.
var rootCmd = &cobra.Command{
	Use:     "devdeck",
	Short:   "DevDeck — capture and search your dev knowledge from the terminal",
	Version: "0.1.0",
	Long: `devdeck is a thin CLI companion to the DevDeck desktop/web clients.

It talks to your backend via the /api/items/capture endpoint and the
existing /api/repos + /api/search endpoints. Configuration lives at
~/.config/devdeck/config.toml, secrets at the OS keychain (Secret
Service, Keychain, or Credential Manager depending on your OS).`,
	SilenceUsage: true,
}

func init() {
	rootCmd.AddCommand(
		loginCmd,
		logoutCmd,
		configCmd,
		addCmd,
		openCmd,
		searchCmd,
		listCmd,
		statusCmd,
	)
}

// withTimeout wraps the parent context with a sensible default so no
// command hangs forever if the backend is unreachable.
func withTimeout(parent context.Context, d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, d)
}

// signalCtx returns a context that cancels on SIGINT/SIGTERM so long
// operations can be aborted with Ctrl+C cleanly.
func signalCtx() (context.Context, context.CancelFunc) {
	return signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
}

// loadClient is the one-liner every command uses to get a fully-wired
// API client. It handles: config load, token lookup, and error
// formatting that points the user to `devdeck login` when the token
// is missing.
func loadClient() (*apiclient.Client, config.Config, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, config.Config{}, fmt.Errorf("load config: %w", err)
	}
	token, err := keyring.Get(cfg.APIURL)
	if err != nil {
		if errors.Is(err, keyring.ErrNotFound) {
			return nil, cfg, fmt.Errorf(
				"no token stored for %s — run `devdeck login` first",
				cfg.APIURL,
			)
		}
		return nil, cfg, fmt.Errorf("read keychain: %w", err)
	}
	return apiclient.New(cfg.APIURL, token), cfg, nil
}
