package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

var importDotfilesFlags struct {
	file           string
	onlyAliases    bool
	onlyFunctions  bool
	dryRun         bool
	yes            bool
}

var importDotfilesCmd = &cobra.Command{
	Use:   "dotfiles",
	Short: "Import shell aliases and functions from dotfiles",
	Long: `Parses local shell configuration files (.zshrc, .bashrc, .aliases)
and captures them into your DevDeck vault.

It handles standard alias syntax and multi-line function declarations.
Imported items are tagged with 'dotfiles' and either 'alias' or 'function'.`,
	RunE: runImportDotfiles,
}

func init() {
	importDotfilesCmd.Flags().StringVarP(&importDotfilesFlags.file, "file", "f", "",
		"Target specific file (defaults to ~/.zshrc or ~/.bashrc)")
	importDotfilesCmd.Flags().BoolVar(&importDotfilesFlags.onlyAliases, "only-aliases", false,
		"Only import aliases")
	importDotfilesCmd.Flags().BoolVar(&importDotfilesFlags.onlyFunctions, "only-functions", false,
		"Only import functions")
	importDotfilesCmd.Flags().BoolVar(&importDotfilesFlags.dryRun, "dry-run", false,
		"Show what would be imported without calling the backend")
	importDotfilesCmd.Flags().BoolVarP(&importDotfilesFlags.yes, "yes", "y", false,
		"Skip confirmation prompt")
}

type shellItem struct {
	Name    string
	Content string
	Type    string // "alias" or "function"
}

func runImportDotfiles(cmd *cobra.Command, _ []string) error {
	client, _, err := loadClient()
	if err != nil {
		return err
	}

	targetFile := importDotfilesFlags.file
	if targetFile == "" {
		home, _ := os.UserHomeDir()
		// Try .zshrc then .bashrc
		zshrc := filepath.Join(home, ".zshrc")
		if _, err := os.Stat(zshrc); err == nil {
			targetFile = zshrc
		} else {
			bashrc := filepath.Join(home, ".bashrc")
			if _, err := os.Stat(bashrc); err == nil {
				targetFile = bashrc
			}
		}
	}

	if targetFile == "" {
		return fmt.Errorf("could not find default shell config file; use --file to specify one")
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Reading %s...\n", targetFile)
	items, err := parseShellFile(targetFile)
	if err != nil {
		return fmt.Errorf("parse file: %w", err)
	}

	// Filter
	var filtered []shellItem
	for _, it := range items {
		if importDotfilesFlags.onlyAliases && it.Type != "alias" {
			continue
		}
		if importDotfilesFlags.onlyFunctions && it.Type != "function" {
			continue
		}
		filtered = append(filtered, it)
	}

	if len(filtered) == 0 {
		fmt.Fprintln(cmd.OutOrStdout(), "No items found to import.")
		return nil
	}

	if importDotfilesFlags.dryRun {
		fmt.Fprintf(cmd.OutOrStdout(), "Dry run: found %d items\n", len(filtered))
		for _, it := range filtered {
			fmt.Fprintf(cmd.OutOrStdout(), "[%s] %s\n", strings.ToUpper(it.Type), it.Name)
		}
		return nil
	}

	if !importDotfilesFlags.yes {
		fmt.Fprintf(cmd.OutOrStdout(), "Import %d items into your vault? [y/N] ", len(filtered))
		var response string
		fmt.Scanln(&response)
		if strings.ToLower(response) != "y" {
			fmt.Fprintln(cmd.OutOrStdout(), "Aborted.")
			return nil
		}
	}

	ctx, cancel := signalCtx()
	defer cancel()

	success := 0
	failed := 0
	for _, it := range filtered {
		typeHint := "cli"
		if it.Type == "function" {
			typeHint = "snippet"
		}

		_, err := client.Capture(ctx, apiclient.CaptureInput{
			Source:    "cli",
			Text:      it.Content,
			TitleHint: it.Name,
			TypeHint:  typeHint,
			Tags:      []string{"dotfiles", it.Type},
			WhySaved:  fmt.Sprintf("imported from %s", filepath.Base(targetFile)),
		})
		if err != nil {
			fmt.Fprintf(cmd.OutOrStderr(), "✗ %s: %v\n", it.Name, err)
			failed++
			continue
		}
		success++
		fmt.Fprintf(cmd.OutOrStdout(), "✓ %s (%s)\n", it.Name, it.Type)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "\nDone! Success: %d, Failed: %d\n", success, failed)
	return nil
}

func parseShellFile(path string) ([]shellItem, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var items []shellItem
	scanner := bufio.NewScanner(file)

	// Regex for alias name='command' or alias name=command
	aliasRegex := regexp.MustCompile(`^alias\s+([a-zA-Z0-9_\-\.]+)=(['"]?)(.*)(['"]?)$`)
	
	// Regex for function name() { or function name {
	funcStartRegex := regexp.MustCompile(`^(function\s+)?([a-zA-Z0-9_\-\.]+)\s*(\(\))?\s*\{`)

	var inFunction bool
	var currentFunc shellItem
	var braceCount int

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		if !inFunction {
			// Check for alias
			if matches := aliasRegex.FindStringSubmatch(line); matches != nil {
				name := matches[1]
				content := matches[3]
				// Strip trailing quote if regex didn't handle it perfectly due to nested quotes
				if strings.HasSuffix(content, "'") || strings.HasSuffix(content, "\"") {
					content = content[:len(content)-1]
				}
				items = append(items, shellItem{
					Name:    name,
					Content: content,
					Type:    "alias",
				})
				continue
			}

			// Check for function start
			if matches := funcStartRegex.FindStringSubmatch(line); matches != nil {
				inFunction = true
				currentFunc = shellItem{
					Name:    matches[2],
					Content: line + "\n",
					Type:    "function",
				}
				braceCount = strings.Count(line, "{") - strings.Count(line, "}")
				if braceCount == 0 {
					items = append(items, currentFunc)
					inFunction = false
				}
				continue
			}
		} else {
			currentFunc.Content += scanner.Text() + "\n"
			braceCount += strings.Count(line, "{") - strings.Count(line, "}")
			if braceCount <= 0 {
				items = append(items, currentFunc)
				inFunction = false
			}
		}
	}

	return items, scanner.Err()
}
