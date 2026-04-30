package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

var openFlags struct {
	itemType string
	print    bool
}

var openCmd = &cobra.Command{
	Use:   "open <id>",
	Short: "Open an item's source URL in the browser",
	Long: `Resolves a repo or item by ID, extracts its source URL, and opens it
in the system browser.

P0 behavior is intentionally narrow: if the resource has no source URL,
the command fails with a clear error instead of guessing an app route from
the API base URL. That keeps the CLI honest while the hosted/app URL model
is still evolving.`,
	Example: `  devdeck open 2f4d8f3d-7e8a-4f1b-aef7-2d4f4174a123
  devdeck open 2f4d8f3d-7e8a-4f1b-aef7-2d4f4174a123 --type item
  devdeck open 2f4d8f3d-7e8a-4f1b-aef7-2d4f4174a123 --print`,
	Args: cobra.ExactArgs(1),
	RunE: runOpen,
}

func init() {
	openCmd.Flags().StringVar(&openFlags.itemType, "type", "auto", "resource type to resolve (auto|repo|item)")
	openCmd.Flags().BoolVar(&openFlags.print, "print", false, "print the resolved URL instead of opening the browser")
}

func runOpen(cmd *cobra.Command, args []string) error {
	client, _, err := loadClient()
	if err != nil {
		return err
	}
	id := args[0]

	ctx, cancel := withTimeout(cmd.Context(), 10*time.Second)
	defer cancel()

	resolvedURL, err := resolveOpenURL(ctx, client, id, openFlags.itemType)
	if err != nil {
		return err
	}
	if openFlags.print {
		fmt.Fprintln(cmd.OutOrStdout(), resolvedURL)
		return nil
	}
	if err := openBrowser(resolvedURL); err != nil {
		return err
	}
	fmt.Fprintf(cmd.OutOrStdout(), "✓ opened %s\n", resolvedURL)
	return nil
}

func resolveOpenURL(ctx context.Context, client *apiclient.Client, id, kind string) (string, error) {
	switch kind {
	case "auto":
		if url, err := resolveRepoURL(ctx, client, id); err == nil {
			return url, nil
		} else if !isNotFound(err) {
			return "", err
		}
		return resolveItemURL(ctx, client, id)
	case "repo":
		return resolveRepoURL(ctx, client, id)
	case "item":
		return resolveItemURL(ctx, client, id)
	default:
		return "", fmt.Errorf("invalid --type %q (want auto|repo|item)", kind)
	}
}

func resolveRepoURL(ctx context.Context, client *apiclient.Client, id string) (string, error) {
	repo, err := client.GetRepo(ctx, id)
	if err != nil {
		return "", err
	}
	if repo.URL == "" {
		return "", errors.New("repo has no source URL")
	}
	return repo.URL, nil
}

func resolveItemURL(ctx context.Context, client *apiclient.Client, id string) (string, error) {
	item, err := client.GetItem(ctx, id)
	if err != nil {
		return "", err
	}
	if item.URL == nil || *item.URL == "" {
		return "", fmt.Errorf("item %s (%s) has no source URL to open", item.Title, item.Type)
	}
	return *item.URL, nil
}

func isNotFound(err error) bool {
	var apiErr *apiclient.APIError
	return errors.As(err, &apiErr) && apiErr.Status == http.StatusNotFound
}

func openBrowser(target string) error {
	var c *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		c = exec.Command("open", target)
	case "windows":
		c = exec.Command("rundll32", "url.dll,FileProtocolHandler", target)
	default:
		c = exec.Command("xdg-open", target)
	}
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	if err := c.Start(); err != nil {
		return fmt.Errorf("open browser: %w", err)
	}
	return nil
}
