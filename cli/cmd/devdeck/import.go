package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

// `devdeck import github-stars` — Wave 4.5 §16.12 importer. Pages
// through the signed-in user's starred repos (or a specific user's
// public stars when --user is passed) and pipes each through
// /api/items/capture, leaving the server to dedupe.
//
// The subcommand layout leaves room for future `devdeck import pocket`
// / `devdeck import raindrop` etc. without restructuring.

var importCmd = &cobra.Command{
	Use:   "import",
	Short: "Bulk-import items from other services",
}

var importStarsFlags struct {
	ghUser  string
	ghToken string
	limit   int
	dryRun  bool
}

var importStarsCmd = &cobra.Command{
	Use:   "github-stars",
	Short: "Import a GitHub user's starred repos into your vault",
	Long: `Fetches https://api.github.com/users/<user>/starred (paginated)
and pipes each repo through POST /api/items/capture with source=cli.

Without --user the command calls /user/starred, which requires a
GitHub token with read:user scope passed via --gh-token or the
GITHUB_TOKEN env var.

Duplicates are a no-op on the server side so re-running the import
is safe.`,
	Example: `  devdeck import github-stars --user charmbracelet --limit 50
  GITHUB_TOKEN=ghp_... devdeck import github-stars`,
	RunE: runImportStars,
}

func init() {
	importStarsCmd.Flags().StringVar(&importStarsFlags.ghUser, "user", "",
		"GitHub username to import public stars from (otherwise uses /user/starred)")
	importStarsCmd.Flags().StringVar(&importStarsFlags.ghToken, "gh-token", "",
		"GitHub token (defaults to GITHUB_TOKEN env var)")
	importStarsCmd.Flags().IntVarP(&importStarsFlags.limit, "limit", "n", 0,
		"stop after importing N repos (0 = unlimited)")
	importStarsCmd.Flags().BoolVar(&importStarsFlags.dryRun, "dry-run", false,
		"list the repos that would be imported without calling the backend")
	importCmd.AddCommand(importStarsCmd)
	rootCmd.AddCommand(importCmd)
}

type ghStarEntry struct {
	HTMLURL     string `json:"html_url"`
	FullName    string `json:"full_name"`
	Description string `json:"description"`
	Language    string `json:"language"`
	Topics      []string `json:"topics"`
}

func runImportStars(cmd *cobra.Command, _ []string) error {
	client, _, err := loadClient()
	if err != nil {
		return err
	}
	ghToken := importStarsFlags.ghToken
	if ghToken == "" {
		ghToken = os.Getenv("GITHUB_TOKEN")
	}
	if importStarsFlags.ghUser == "" && ghToken == "" {
		return errors.New("either --user or a GitHub token (--gh-token / GITHUB_TOKEN) is required")
	}

	ctx, cancel := signalCtx()
	defer cancel()

	page := 1
	imported := 0
	deduped := 0
	for {
		entries, err := fetchStarredPage(ctx, importStarsFlags.ghUser, ghToken, page)
		if err != nil {
			return err
		}
		if len(entries) == 0 {
			break
		}
		for _, e := range entries {
			if importStarsFlags.limit > 0 && imported+deduped >= importStarsFlags.limit {
				fmt.Fprintf(cmd.OutOrStdout(),
					"\n✓ imported %d, already existed %d (limit reached)\n",
					imported, deduped)
				return nil
			}
			if importStarsFlags.dryRun {
				fmt.Fprintf(cmd.OutOrStdout(), "• %s\n", e.FullName)
				imported++
				continue
			}
			tags := append([]string{}, e.Topics...)
			if e.Language != "" {
				tags = append(tags, strings.ToLower(e.Language))
			}
			res, err := client.Capture(ctx, apiclient.CaptureInput{
				Source:    "cli",
				URL:       e.HTMLURL,
				TypeHint:  "repo",
				TitleHint: e.FullName,
				Tags:      tags,
				WhySaved:  "imported from github stars",
			})
			if err != nil {
				fmt.Fprintf(cmd.OutOrStderr(), "✗ %s: %v\n", e.FullName, err)
				continue
			}
			if res.DuplicateOf != "" {
				deduped++
				fmt.Fprintf(cmd.OutOrStdout(), "· %s (already existed)\n", e.FullName)
			} else {
				imported++
				fmt.Fprintf(cmd.OutOrStdout(), "✓ %s\n", e.FullName)
			}
		}
		page++
	}
	fmt.Fprintf(cmd.OutOrStdout(),
		"\n✓ imported %d, already existed %d\n", imported, deduped)
	return nil
}

// fetchStarredPage hits GitHub's starred endpoint. Per-page size is
// pinned at 100 — the max GitHub allows — to minimise round trips.
func fetchStarredPage(ctx context.Context, user, token string, page int) ([]ghStarEntry, error) {
	var endpoint string
	if user != "" {
		endpoint = fmt.Sprintf("https://api.github.com/users/%s/starred?per_page=100&page=%d", user, page)
	} else {
		endpoint = fmt.Sprintf("https://api.github.com/user/starred?per_page=100&page=%d", page)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github.mercy-preview+json") // includes topics
	req.Header.Set("User-Agent", "devdeck-cli/0.1")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	httpClient := &http.Client{Timeout: 30 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("github api: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api: %s", resp.Status)
	}
	var entries []ghStarEntry
	if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return entries, nil
}

