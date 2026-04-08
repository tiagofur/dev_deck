package main

import (
	"fmt"
	"time"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

var listFlags struct {
	query string
	tag   string
	lang  string
	limit int
}

// `devdeck list` prints the user's repos. We call /api/repos rather
// than /api/items because the items list endpoint only lands in Ola 5.
var listCmd = &cobra.Command{
	Use:     "list",
	Short:   "List repos in your vault",
	Example: `  devdeck list --lang Go --limit 10`,
	RunE: func(cmd *cobra.Command, _ []string) error {
		client, _, err := loadClient()
		if err != nil {
			return err
		}

		ctx, cancel := withTimeout(cmd.Context(), 10*time.Second)
		defer cancel()
		repos, total, err := client.ListRepos(ctx, apiclient.ListReposParams{
			Query: listFlags.query,
			Tag:   listFlags.tag,
			Lang:  listFlags.lang,
			Limit: listFlags.limit,
		})
		if err != nil {
			return err
		}
		if len(repos) == 0 {
			fmt.Fprintln(cmd.OutOrStdout(), "no repos match those filters")
			return nil
		}

		fmt.Fprintf(cmd.OutOrStdout(), "%d of %d\n\n", len(repos), total)
		for _, r := range repos {
			owner := ""
			if r.Owner != nil {
				owner = *r.Owner + "/"
			}
			lang := ""
			if r.Language != nil {
				lang = *r.Language
			}
			fmt.Fprintf(cmd.OutOrStdout(), "  %-30s  %-12s  %6d★  %s\n",
				truncate(owner+r.Name, 30),
				truncate(lang, 12),
				r.Stars,
				r.URL,
			)
		}
		return nil
	},
}

func init() {
	listCmd.Flags().StringVarP(&listFlags.query, "query", "q", "", "fuzzy filter")
	listCmd.Flags().StringVar(&listFlags.tag, "tag", "", "filter by tag")
	listCmd.Flags().StringVar(&listFlags.lang, "lang", "", "filter by language")
	listCmd.Flags().IntVarP(&listFlags.limit, "limit", "n", 50, "max rows")
}
