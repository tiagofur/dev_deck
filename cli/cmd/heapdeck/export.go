package main

import (
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"
)

var exportFlags struct {
	format string
	output string
}

var exportCmd = &cobra.Command{
	Use:   "export <cheatsheet_id>",
	Short: "Export a cheatsheet as Markdown or JSON",
	Args:  cobra.ExactArgs(1),
	RunE:  runExport,
}

func init() {
	exportCmd.Flags().StringVarP(&exportFlags.format, "format", "f", "md", "Export format: md, json")
	exportCmd.Flags().StringVarP(&exportFlags.output, "output", "o", "", "Output file path (default: stdout)")
	rootCmd.AddCommand(exportCmd)
}

func runExport(cmd *cobra.Command, args []string) error {
	client, _, err := loadClient()
	if err != nil {
		return err
	}

	id := args[0]
	ctx, cancel := withTimeout(cmd.Context(), 10*time.Second)
	defer cancel()

	data, filename, err := client.ExportCheatsheet(ctx, id, exportFlags.format)
	if err != nil {
		return fmt.Errorf("export: %w", err)
	}

	if exportFlags.output != "" {
		if err := os.WriteFile(exportFlags.output, data, 0644); err != nil {
			return fmt.Errorf("write file: %w", err)
		}
		fmt.Fprintf(cmd.OutOrStdout(), "✓ Exported to %s\n", exportFlags.output)
		return nil
	}

	if filename != "" {
		fmt.Fprintf(cmd.OutOrStderr(), "--- %s ---\n", filename)
	}
	fmt.Fprintln(cmd.OutOrStdout(), string(data))
	return nil
}
