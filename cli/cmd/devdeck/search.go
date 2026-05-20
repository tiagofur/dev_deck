package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

var searchFlags struct {
	limit int
	mode  string
}

// `devdeck search <query>` hits GET /api/search and prints a
// brutalist-ish table of the hits. We group by entity type so a user
// scanning results can tell a cheatsheet entry from a repo at a glance.
var searchCmd = &cobra.Command{
	Use:     "search <query>",
	Short:   "Search across repos, cheatsheets and entries",
	Args:    cobra.MinimumNArgs(1),
	Example: `  devdeck search ripgrep`,
	RunE: func(cmd *cobra.Command, args []string) error {
		client, _, err := loadClient()
		if err != nil {
			return err
		}
		query := strings.Join(args, " ")

		ctx, cancel := withTimeout(cmd.Context(), 10*time.Second)
		defer cancel()
		results, err := client.Search(ctx, query, searchFlags.limit, searchFlags.mode)
		if err != nil {
			return err
		}
		if len(results) == 0 {
			fmt.Fprintf(cmd.OutOrStdout(), "no results for %q\n", query)
			return nil
		}

		// Group by type so the console output is scannable.
		buckets := map[string][]string{}
		order := []string{"item", "repo", "cheatsheet", "entry"}
		
		// ANSI colors
		yellow := "\033[1;33m"
		green := "\033[0;32m"
		magenta := "\033[0;35m"
		cyan := "\033[0;36m"
		reset := "\033[0m"
		gray := "\033[0;90m"

		typeColors := map[string]string{
			"item":       yellow,
			"repo":       green,
			"cheatsheet": magenta,
			"entry":      cyan,
		}

		for _, r := range results {
			line := fmt.Sprintf("  %-30s  %s%s%s", truncate(r.Title, 30), gray, r.Subtitle, reset)
			buckets[r.Type] = append(buckets[r.Type], line)
		}

		for _, t := range order {
			if rows, ok := buckets[t]; ok {
				color := typeColors[t]
				fmt.Fprintf(cmd.OutOrStdout(), "\n%s[%s]%s (%d)\n", color, strings.ToUpper(t), reset, len(rows))
				for _, row := range rows {
					fmt.Fprintln(cmd.OutOrStdout(), row)
				}
			}
		}
		return nil
	},
}

func init() {
	searchCmd.Flags().IntVarP(&searchFlags.limit, "limit", "n", 20, "max results")
	searchCmd.Flags().StringVarP(&searchFlags.mode, "mode", "m", "text", "search mode: text, semantic, hybrid")
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	if n <= 1 {
		return "…"
	}
	return s[:n-1] + "…"
}
