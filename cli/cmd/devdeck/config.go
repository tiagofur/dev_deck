package main

import (
	"fmt"
	"strings"

	"devdeck-cli/internal/config"

	"github.com/spf13/cobra"
)

// `devdeck config` is a split personality:
//
//   devdeck config                # print all settings
//   devdeck config get <key>      # print one setting
//   devdeck config set <key> <v>  # update one setting and save

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "View or edit CLI configuration",
	Long: `Inspect and edit ~/.config/devdeck/config.toml.

Supported keys:
  api_url         the DevDeck backend root
  default_source  source label sent with captures`,
	RunE: func(cmd *cobra.Command, _ []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}
		fmt.Fprintf(cmd.OutOrStdout(), "api_url         = %s\n", cfg.APIURL)
		fmt.Fprintf(cmd.OutOrStdout(), "default_source  = %s\n", cfg.DefaultSource)
		return nil
	},
}

var configGetCmd = &cobra.Command{
	Use:   "get <key>",
	Short: "Print a single configuration value",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}
		val, err := readKey(cfg, args[0])
		if err != nil {
			return err
		}
		fmt.Fprintln(cmd.OutOrStdout(), val)
		return nil
	},
}

var configSetCmd = &cobra.Command{
	Use:   "set <key> <value>",
	Short: "Update a configuration value and save",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}
		if err := writeKey(&cfg, args[0], args[1]); err != nil {
			return err
		}
		if err := config.Save(cfg); err != nil {
			return fmt.Errorf("save config: %w", err)
		}
		fmt.Fprintf(cmd.OutOrStdout(), "✓ %s = %s\n", args[0], args[1])
		return nil
	},
}

func init() {
	configCmd.AddCommand(configGetCmd, configSetCmd)
}

func readKey(cfg config.Config, key string) (string, error) {
	switch key {
	case "api_url":
		return cfg.APIURL, nil
	case "default_source":
		return cfg.DefaultSource, nil
	}
	return "", fmt.Errorf("unknown config key %q", key)
}

func writeKey(cfg *config.Config, key, value string) error {
	switch key {
	case "api_url":
		cfg.APIURL = strings.TrimRight(value, "/")
		return nil
	case "default_source":
		cfg.DefaultSource = value
		return nil
	}
	return fmt.Errorf("unknown config key %q", key)
}
