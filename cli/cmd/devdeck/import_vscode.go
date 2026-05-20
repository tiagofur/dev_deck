package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

var importVSCodeFlags struct {
	extensions  bool
	keybindings bool
	settings    bool
	dryRun      bool
	yes         bool
}

var importVSCodeCmd = &cobra.Command{
	Use:   "vscode",
	Short: "Import VSCode extensions, keybindings, and settings",
	Long: `Captures your VSCode environment into DevDeck.

It can import:
- Installed extensions (via 'code --list-extensions' or file scan)
- Custom keybindings (parsed from keybindings.json)
- User settings (parsed from settings.json)

Items are automatically tagged and enriched.`,
	RunE: runImportVSCode,
}

func init() {
	importVSCodeCmd.Flags().BoolVar(&importVSCodeFlags.extensions, "extensions", false, "Import installed extensions")
	importVSCodeCmd.Flags().BoolVar(&importVSCodeFlags.keybindings, "keybindings", false, "Import custom keybindings")
	importVSCodeCmd.Flags().BoolVar(&importVSCodeFlags.settings, "settings", false, "Import user settings")
	importVSCodeCmd.Flags().BoolVar(&importVSCodeFlags.dryRun, "dry-run", false, "Show what would be imported")
	importVSCodeCmd.Flags().BoolVarP(&importVSCodeFlags.yes, "yes", "y", false, "Skip confirmation prompt")
}

func runImportVSCode(cmd *cobra.Command, _ []string) error {
	if !importVSCodeFlags.extensions && !importVSCodeFlags.keybindings && !importVSCodeFlags.settings {
		// Default to extensions and keybindings if nothing specified
		importVSCodeFlags.extensions = true
		importVSCodeFlags.keybindings = true
	}

	client, _, err := loadClient()
	if err != nil {
		return err
	}

	var toImport []apiclient.CaptureInput

	if importVSCodeFlags.extensions {
		exts := fetchExtensions()
		for _, id := range exts {
			toImport = append(toImport, apiclient.CaptureInput{
				Source:    "cli",
				URL:       fmt.Sprintf("https://marketplace.visualstudio.com/items?itemName=%s", id),
				TypeHint:  "plugin",
				TitleHint: id,
				Tags:      []string{"vscode", "extension"},
				WhySaved:  "imported from vscode",
			})
		}
	}

	if importVSCodeFlags.keybindings {
		kbPath := getVSCodeUserPath("keybindings.json")
		if kbPath != "" {
			kbs, err := parseKeybindings(kbPath)
			if err == nil {
				for _, kb := range kbs {
					toImport = append(toImport, apiclient.CaptureInput{
						Source:    "cli",
						Text:      kb.Command,
						TitleHint: fmt.Sprintf("%s: %s", kb.Key, kb.Command),
						TypeHint:  "shortcut",
						Tags:      []string{"vscode", "keybindings"},
						WhySaved:  "imported from vscode",
					})
				}
			}
		}
	}

	if importVSCodeFlags.settings {
		settingsPath := getVSCodeUserPath("settings.json")
		if settingsPath != "" {
			data, err := os.ReadFile(settingsPath)
			if err == nil {
				toImport = append(toImport, apiclient.CaptureInput{
					Source:    "cli",
					Text:      string(data),
					TitleHint: "VSCode Settings",
					TypeHint:  "snippet",
					Tags:      []string{"vscode", "settings"},
					WhySaved:  "imported from vscode",
				})
			}
		}
	}

	if len(toImport) == 0 {
		fmt.Fprintln(cmd.OutOrStdout(), "No items found to import.")
		return nil
	}

	if importVSCodeFlags.dryRun {
		fmt.Fprintf(cmd.OutOrStdout(), "Dry run: found %d items\n", len(toImport))
		for _, it := range toImport {
			fmt.Fprintf(cmd.OutOrStdout(), "[%s] %s\n", strings.ToUpper(it.TypeHint), it.TitleHint)
		}
		return nil
	}

	if !importVSCodeFlags.yes {
		fmt.Fprintf(cmd.OutOrStdout(), "Import %d items into your vault? [y/N] ", len(toImport))
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
	for _, it := range toImport {
		_, err := client.Capture(ctx, it)
		if err != nil {
			fmt.Fprintf(cmd.OutOrStderr(), "✗ %s: %v\n", it.TitleHint, err)
			failed++
			continue
		}
		success++
		fmt.Fprintf(cmd.OutOrStdout(), "✓ %s\n", it.TitleHint)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "\nDone! Success: %d, Failed: %d\n", success, failed)
	return nil
}

func fetchExtensions() []string {
	// Try 'code --list-extensions'
	out, err := exec.Command("code", "--list-extensions").Output()
	if err == nil {
		return strings.Split(strings.TrimSpace(string(out)), "\n")
	}

	// Fallback to directory scan
	home, _ := os.UserHomeDir()
	extDir := filepath.Join(home, ".vscode", "extensions")
	entries, err := os.ReadDir(extDir)
	if err != nil {
		return nil
	}

	var ids []string
	for _, e := range entries {
		if e.IsDir() {
			// Extension dirs usually look like publisher.name-version
			name := e.Name()
			if idx := strings.LastIndex(name, "-"); idx != -1 {
				ids = append(ids, name[:idx])
			}
		}
	}
	return ids
}

func getVSCodeUserPath(filename string) string {
	home, _ := os.UserHomeDir()
	var path string
	switch runtime.GOOS {
	case "darwin":
		path = filepath.Join(home, "Library", "Application Support", "Code", "User", filename)
	case "linux":
		path = filepath.Join(home, ".config", "Code", "User", filename)
	case "windows":
		path = filepath.Join(os.Getenv("APPDATA"), "Code", "User", filename)
	}

	if _, err := os.Stat(path); err == nil {
		return path
	}
	return ""
}

type vscodeKeybinding struct {
	Key     string `json:"key"`
	Command string `json:"command"`
}

func parseKeybindings(path string) ([]vscodeKeybinding, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Remove comments (very naive but handles common VSCode JSON)
	lines := strings.Split(string(data), "\n")
	var clean []string
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if !strings.HasPrefix(trimmed, "//") {
			clean = append(clean, l)
		}
	}

	var kbs []vscodeKeybinding
	if err := json.Unmarshal([]byte(strings.Join(clean, "\n")), &kbs); err != nil {
		return nil, err
	}
	return kbs, nil
}
