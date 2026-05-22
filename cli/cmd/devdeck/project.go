package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

var projectFlags struct {
	limit int
	mode  string
	path  string
}

var projectCmd = &cobra.Command{
	Use:   "project",
	Short: "Show DevDeck context for the current project",
	Long: `Detect the current folder/repo and search DevDeck for related items.

This is intentionally read-only: it does not scan your files, read .env values,
or upload project contents. It uses folder name and git remote metadata as
search hints.`,
	Example: `  devdeck project
  devdeck project --path ~/dev/my-api
  devdeck project --mode hybrid`,
	RunE: runProject,
}

func init() {
	projectCmd.Flags().IntVarP(&projectFlags.limit, "limit", "n", 12, "max results")
	projectCmd.Flags().StringVarP(&projectFlags.mode, "mode", "m", "text", "search mode: text, semantic, hybrid")
	projectCmd.Flags().StringVar(&projectFlags.path, "path", "", "project path to inspect (defaults to current directory)")
}

func runProject(cmd *cobra.Command, args []string) error {
	client, _, err := loadClient()
	if err != nil {
		return err
	}

	ctxPath := projectFlags.path
	if ctxPath == "" {
		ctxPath, err = os.Getwd()
		if err != nil {
			return fmt.Errorf("get cwd: %w", err)
		}
	}
	absPath, err := filepath.Abs(ctxPath)
	if err != nil {
		return fmt.Errorf("resolve path: %w", err)
	}

	info := detectProject(absPath)
	query := projectSearchQuery(info)
	if query == "" {
		return fmt.Errorf("could not infer a search query for %s", absPath)
	}

	ctx, cancel := withTimeout(cmd.Context(), 10*time.Second)
	defer cancel()
	results, err := client.Search(ctx, query, projectFlags.limit, projectFlags.mode)
	if err != nil {
		return err
	}

	out := cmd.OutOrStdout()
	fmt.Fprintf(out, "Project: %s\n", info.Name)
	fmt.Fprintf(out, "Path:    %s\n", info.Path)
	if info.GitRemote != "" {
		fmt.Fprintf(out, "Remote:  %s\n", info.GitRemote)
	}
	fmt.Fprintf(out, "Query:   %s\n\n", query)

	if len(results) == 0 {
		fmt.Fprintln(out, "No related DevDeck items found yet.")
		fmt.Fprintln(out, "Tip: save a command, runbook, request, or note with this project name/tag.")
		return nil
	}

	printProjectResults(out, results)
	return nil
}

type projectInfo struct {
	Name      string
	Path      string
	GitRemote string
	GitSlug   string
}

func detectProject(path string) projectInfo {
	info := projectInfo{
		Name: filepath.Base(path),
		Path: path,
	}

	remote := gitRemote(path)
	info.GitRemote = remote
	info.GitSlug = gitSlug(remote)
	if info.GitSlug != "" {
		info.Name = filepath.Base(info.GitSlug)
	}
	return info
}

func gitRemote(path string) string {
	gitCmd := exec.Command("git", "-C", path, "config", "--get", "remote.origin.url")
	out, err := gitCmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func gitSlug(remote string) string {
	remote = strings.TrimSpace(remote)
	if remote == "" {
		return ""
	}
	remote = strings.TrimSuffix(remote, ".git")
	if strings.HasPrefix(remote, "git@") {
		parts := strings.SplitN(remote, ":", 2)
		if len(parts) == 2 {
			return strings.Trim(parts[1], "/")
		}
	}
	if idx := strings.Index(remote, "://"); idx >= 0 {
		parts := strings.Split(remote[idx+3:], "/")
		if len(parts) >= 3 {
			return strings.Join(parts[1:], "/")
		}
	}
	return filepath.Base(remote)
}

func projectSearchQuery(info projectInfo) string {
	parts := []string{info.Name}
	if info.GitSlug != "" && info.GitSlug != info.Name {
		parts = append(parts, info.GitSlug)
	}
	return strings.Join(parts, " ")
}

func printProjectResults(out interface{ Write([]byte) (int, error) }, results []apiclient.SearchResult) {
	for _, r := range results {
		fmt.Fprintf(out, "[%s] %s\n", strings.ToUpper(r.Type), r.Title)
		if r.Subtitle != "" {
			fmt.Fprintf(out, "  %s\n", r.Subtitle)
		}
		if r.Extra != "" {
			fmt.Fprintf(out, "  %s\n", r.Extra)
		}
		fmt.Fprintln(out)
	}
}

