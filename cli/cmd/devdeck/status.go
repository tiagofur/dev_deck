package main

import (
	"errors"
	"fmt"
	"time"

	"devdeck-cli/internal/apiclient"
	"devdeck-cli/internal/config"
	"devdeck-cli/internal/keyring"

	"github.com/spf13/cobra"
)

// `devdeck status` is the "is my setup sane?" command. It prints:
//   - config path and contents,
//   - whether a token is present in the keychain,
//   - whether the backend is reachable.
//
// It's the first thing to run when something feels off, and the first
// thing any bug report should include.
var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Print config + auth + backend health",
	RunE: func(cmd *cobra.Command, _ []string) error {
		out := cmd.OutOrStdout()
		cfgPath, _ := config.Path()
		fmt.Fprintf(out, "config:  %s\n", cfgPath)

		cfg, err := config.Load()
		if err != nil {
			fmt.Fprintf(out, "         ✗ %v\n", err)
			return nil
		}
		fmt.Fprintf(out, "api_url: %s\n", cfg.APIURL)
		fmt.Fprintf(out, "source:  %s\n", cfg.DefaultSource)

		token, err := keyring.Get(cfg.APIURL)
		switch {
		case errors.Is(err, keyring.ErrNotFound):
			fmt.Fprintln(out, "token:   ✗ not stored (run `devdeck login`)")
		case err != nil:
			fmt.Fprintf(out, "token:   ✗ keychain error: %v\n", err)
		default:
			fmt.Fprintf(out, "token:   ✓ stored (%s)\n", maskToken(token))
		}

		ctx, cancel := withTimeout(cmd.Context(), 3*time.Second)
		defer cancel()
		client := apiclient.New(cfg.APIURL, token)
		if err := client.Health(ctx); err != nil {
			fmt.Fprintf(out, "backend: ✗ unreachable: %v\n", err)
			return nil
		}
		fmt.Fprintln(out, "backend: ✓ healthy")
		return nil
	},
}

// maskToken shows the first 4 and last 4 chars so `status` is useful
// for debugging without leaking the token in screenshots.
func maskToken(t string) string {
	if len(t) <= 8 {
		return "****"
	}
	return t[:4] + "…" + t[len(t)-4:]
}
