package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"devdeck-cli/internal/apiclient"
	"devdeck-cli/internal/config"
	"devdeck-cli/internal/keyring"

	"github.com/spf13/cobra"
)

// Wave 4.5 Ocean 10 — login stores the API token in the OS keychain.
//
// We deliberately skip the full OAuth dance for this first release:
// self-hosters use token-mode auth (API_TOKEN env var in the backend)
// and most test installations don't have GitHub OAuth wired up yet.
// When JWT mode becomes the default, this command will be replaced
// with a browser-flow helper that launches the OAuth loop.
//
// For now `devdeck login --token <value>` and `devdeck login` (prompt)
// both accept the raw token and stash it in the keychain under the
// current api_url as key, so a user pointing at multiple backends
// keeps them isolated.

var loginFlags struct {
	token    string
	apiURL   string
	noVerify bool
}

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Save your API token in the OS keychain",
	Long: `Stores a bearer token for the configured backend.

The token goes to the OS keychain (Keychain on macOS, Secret Service
on Linux, Credential Manager on Windows) and never touches disk in
plaintext. On headless Linux where no keyring daemon is running the
CLI falls back to a 0600 file under ~/.local/share/devdeck.

If --api-url is passed we update the config at the same time, so
switching between self-hosted and cloud backends is one command.`,
	Example: `  devdeck login --token sk_live_xxx
  devdeck login --token sk_live_xxx --api-url https://api.devdeck.ai
  devdeck login  # interactive prompt`,
	RunE: runLogin,
}

func init() {
	loginCmd.Flags().StringVarP(&loginFlags.token, "token", "t", "", "API token (read from stdin if omitted)")
	loginCmd.Flags().StringVar(&loginFlags.apiURL, "api-url", "", "override the configured backend URL")
	loginCmd.Flags().BoolVar(&loginFlags.noVerify, "no-verify", false, "skip the health check after storing the token")
}

func runLogin(cmd *cobra.Command, _ []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	if loginFlags.apiURL != "" {
		cfg.APIURL = strings.TrimRight(loginFlags.apiURL, "/")
		if err := config.Save(cfg); err != nil {
			return fmt.Errorf("save config: %w", err)
		}
	}

	token := loginFlags.token
	if token == "" {
		fmt.Fprintf(cmd.OutOrStdout(), "Paste token for %s: ", cfg.APIURL)
		scanner := bufio.NewScanner(os.Stdin)
		if !scanner.Scan() {
			return errors.New("no token provided")
		}
		token = strings.TrimSpace(scanner.Text())
	}
	if token == "" {
		return errors.New("token is empty")
	}

	if err := keyring.Store(cfg.APIURL, token); err != nil {
		return fmt.Errorf("store token: %w", err)
	}

	if !loginFlags.noVerify {
		ctx, cancel := withTimeout(cmd.Context(), 5*time.Second)
		defer cancel()
		client := apiclient.New(cfg.APIURL, token)
		if err := client.Health(ctx); err != nil {
			fmt.Fprintf(cmd.OutOrStderr(),
				"⚠️  Token stored but backend health check failed: %v\n", err)
			return nil
		}
	}
	fmt.Fprintf(cmd.OutOrStdout(), "✓ logged in to %s\n", cfg.APIURL)
	return nil
}

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Remove the stored API token from the keychain",
	RunE: func(cmd *cobra.Command, _ []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}
		if err := keyring.Delete(cfg.APIURL); err != nil {
			return fmt.Errorf("delete token: %w", err)
		}
		fmt.Fprintf(cmd.OutOrStdout(), "✓ logged out of %s\n", cfg.APIURL)
		return nil
	},
}
