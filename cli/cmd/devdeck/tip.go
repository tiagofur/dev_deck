package main

import (
	"fmt"
	"math/rand/v2"
	"strings"
	"time"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

// `devdeck tip [query/category]` — Wave 4 §16.14 terminal widget.
// Fetches a random entry from a matching cheatsheet (or all if none specified)
// and prints it with a high-contrast, retro-brutalist border.
var tipCmd = &cobra.Command{
	Use:   "tip [query/category]",
	Short: "Show a random productivity tip or command",
	RunE:  runTip,
}

func runTip(cmd *cobra.Command, args []string) error {
	client, _, err := loadClient()
	if err != nil {
		return err
	}

	ctx, cancel := withTimeout(cmd.Context(), 5*time.Second)
	defer cancel()

	var tip apiclient.Entry
	var sourceName string

	query := ""
	if len(args) > 0 {
		query = strings.Join(args, " ")
	}

	// 1. Fetch all cheatsheets to match by category/slug or pick random
	cheatsheets, err := client.ListCheatsheets(ctx, "")
	if err != nil {
		return fmt.Errorf("list cheatsheets: %w", err)
	}

	var targetCheatsheet *apiclient.Cheatsheet

	if query != "" {
		// Try exact match on slug or category
		for i := range cheatsheets {
			if strings.EqualFold(cheatsheets[i].Slug, query) || strings.EqualFold(cheatsheets[i].Category, query) {
				targetCheatsheet = &cheatsheets[i]
				break
			}
		}
	}

	if targetCheatsheet != nil {
		// Pick a random entry from the matched cheatsheet
		entries, err := client.ListCheatsheetEntries(ctx, targetCheatsheet.ID)
		if err != nil {
			return fmt.Errorf("list entries: %w", err)
		}
		if len(entries) == 0 {
			return fmt.Errorf("no entries found in cheatsheet %q", targetCheatsheet.Title)
		}
		tip = entries[rand.IntN(len(entries))]
		sourceName = targetCheatsheet.Title
	} else if query != "" {
		// 2. No direct cheatsheet match, try general search
		results, err := client.Search(ctx, query, 20, "text")
		if err != nil {
			return fmt.Errorf("search: %w", err)
		}
		// Filter for entry types
		var entryResults []apiclient.SearchResult
		for _, r := range results {
			if r.Type == "entry" {
				entryResults = append(entryResults, r)
			}
		}
		if len(entryResults) == 0 {
			return fmt.Errorf("no tips found matching %q", query)
		}
		// Pick random search result
		selected := entryResults[rand.IntN(len(entryResults))]
		tip = apiclient.Entry{
			Label:       selected.Title,
			Command:     selected.Subtitle,
			Description: selected.Extra,
		}
		sourceName = "Search: " + query
	} else {
		// 3. No query, pick a random cheatsheet then a random entry
		if len(cheatsheets) == 0 {
			return fmt.Errorf("no cheatsheets found in your vault")
		}
		c := cheatsheets[rand.IntN(len(cheatsheets))]
		entries, err := client.ListCheatsheetEntries(ctx, c.ID)
		if err != nil {
			return fmt.Errorf("list entries: %w", err)
		}
		if len(entries) == 0 {
			return fmt.Errorf("cheatsheet %q is empty", c.Title)
		}
		tip = entries[rand.IntN(len(entries))]
		sourceName = c.Title
	}

	printTip(tip, sourceName)
	return nil
}

func printTip(tip apiclient.Entry, source string) {
	// ANSI codes
	boldYellow := "\033[1;33m"
	green := "\033[0;32m"
	gray := "\033[0;90m"
	reset := "\033[0m"

	width := 60
	border := strings.Repeat("─", width-2)

	fmt.Printf("\n┌%s┐\n", border)
	fmt.Printf("│ %s%-*s%s │\n", boldYellow, width-4, "DEVDECK TIP: "+strings.ToUpper(source), reset)
	fmt.Printf("├%s┤\n", border)
	fmt.Printf("│ %-*s │\n", width-4, tip.Label)
	if tip.Description != "" {
		descLines := wrap(tip.Description, width-4)
		for _, line := range descLines {
			fmt.Printf("│ %s%-*s%s │\n", gray, width-4, line, reset)
		}
	}
	fmt.Printf("│ %-*s │\n", width-4, "")
	fmt.Printf("│ %s$ %-*s%s │\n", green, width-6, tip.Command, reset)
	fmt.Printf("└%s┘\n\n", border)
}

func wrap(s string, width int) []string {
	words := strings.Fields(s)
	if len(words) == 0 {
		return nil
	}
	var lines []string
	current := words[0]
	for _, w := range words[1:] {
		if len(current)+1+len(w) <= width {
			current += " " + w
		} else {
			lines = append(lines, current)
			current = w
		}
	}
	lines = append(lines, current)
	return lines
}
