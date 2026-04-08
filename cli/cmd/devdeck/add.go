package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

// `devdeck add` is the CLI's one-shot wrapper over POST /api/items/capture.
//
// Usage shapes:
//   devdeck add https://github.com/foo/bar
//   devdeck add "brew install ripgrep" --type cli
//   devdeck add --why "para grep turbo" https://ripgrep.dev
//   echo 'func main() {}' | devdeck add --type snippet
//
// When stdin is piped and no positional arg is given, the CLI reads
// the piped payload as `text`. This lets you integrate captures into
// shell pipelines (`history | rg brew | devdeck add`).

var addFlags struct {
	typeHint string
	why      string
	tags     []string
	title    string
}

var addCmd = &cobra.Command{
	Use:   "add [url or text]",
	Short: "Capture a URL, command, snippet, or note",
	Long: `Sends a single item to POST /api/items/capture.

The server auto-detects the type from the URL or text, so you rarely
need --type. Override it with --type when the heuristic picks wrong
(e.g. a gist URL you want saved as a snippet, not a repo).

If you pipe data to stdin the CLI reads it as the text payload; the
positional argument takes precedence when both are present.`,
	Example: `  devdeck add https://github.com/charmbracelet/bubbletea
  devdeck add "brew install ripgrep" --type cli --tags terminal
  history | rg brew | devdeck add --type cli --why "instalaciones que quiero recordar"`,
	Args: cobra.MaximumNArgs(1),
	RunE: runAdd,
}

func init() {
	addCmd.Flags().StringVar(&addFlags.typeHint, "type", "",
		"force the item type (repo|cli|plugin|shortcut|snippet|agent|prompt|article|tool|workflow|note)")
	addCmd.Flags().StringVar(&addFlags.why, "why", "", "why you're saving this item")
	addCmd.Flags().StringSliceVar(&addFlags.tags, "tags", nil, "comma-separated tags")
	addCmd.Flags().StringVar(&addFlags.title, "title", "", "override the auto-derived title")
}

func runAdd(cmd *cobra.Command, args []string) error {
	client, cfg, err := loadClient()
	if err != nil {
		return err
	}

	input := apiclient.CaptureInput{
		Source:    cfg.DefaultSource,
		TypeHint:  addFlags.typeHint,
		WhySaved:  addFlags.why,
		Tags:      addFlags.tags,
		TitleHint: addFlags.title,
	}

	// Positional arg wins. If it looks like a URL we fill URL,
	// otherwise it becomes the text payload.
	if len(args) == 1 {
		arg := strings.TrimSpace(args[0])
		if looksLikeURL(arg) {
			input.URL = arg
		} else {
			input.Text = arg
		}
	} else if hasPipedStdin() {
		piped, err := io.ReadAll(os.Stdin)
		if err != nil {
			return fmt.Errorf("read stdin: %w", err)
		}
		input.Text = strings.TrimSpace(string(piped))
	}

	if input.URL == "" && input.Text == "" {
		return errors.New("nothing to capture — pass a url/text arg or pipe stdin")
	}

	ctx, cancel := withTimeout(cmd.Context(), 10*time.Second)
	defer cancel()
	res, err := client.Capture(ctx, input)
	if err != nil {
		return err
	}

	if res.DuplicateOf != "" {
		fmt.Fprintf(cmd.OutOrStdout(),
			"✓ already in your vault (duplicate_of=%s)\n", res.DuplicateOf)
		return nil
	}
	if res.Item == nil {
		fmt.Fprintln(cmd.OutOrStdout(), "✓ captured")
		return nil
	}
	fmt.Fprintf(cmd.OutOrStdout(),
		"✓ captured %s as %s (id=%s, enrichment=%s)\n",
		res.Item.Title, res.Item.Type, res.Item.ID, res.EnrichmentStatus,
	)
	return nil
}

func looksLikeURL(s string) bool {
	return strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://")
}

// hasPipedStdin returns true when stdin is a pipe or regular file —
// i.e. the user ran `foo | devdeck add` rather than pressing a TTY.
func hasPipedStdin() bool {
	stat, err := os.Stdin.Stat()
	if err != nil {
		return false
	}
	return (stat.Mode() & os.ModeCharDevice) == 0
}
