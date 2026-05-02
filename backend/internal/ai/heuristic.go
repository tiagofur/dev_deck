package ai

import (
	"context"
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strings"

	"devdeck/internal/domain/items"
)

type heuristicProvider struct{}

func (heuristicProvider) Enabled() bool { return true }

func (heuristicProvider) Summarize(_ context.Context, in Input) (string, error) {
	desc := cleanSentence(in.Description)
	title := strings.TrimSpace(in.Title)
	host := hostTag(in.URL)

	if desc != "" {
		return truncate(desc, 160), nil
	}

	switch in.Type {
	case items.TypeRepo:
		if title == "" {
			return "GitHub repository saved for later.", nil
		}
		return truncate(fmt.Sprintf("GitHub repository saved for later: %s.", title), 160), nil
	case items.TypeArticle:
		if host != "" && title != "" {
			return truncate(fmt.Sprintf("Article saved from %s: %s.", host, title), 160), nil
		}
		return truncate(fmt.Sprintf("Article saved for later: %s.", fallbackTitle(title, "untitled article")), 160), nil
	case items.TypeCLI:
		return truncate(fmt.Sprintf("CLI command or install snippet: %s.", fallbackTitle(title, "command")), 160), nil
	case items.TypeSnippet:
		return truncate(fmt.Sprintf("Code snippet saved for reuse: %s.", fallbackTitle(title, "snippet")), 160), nil
	case items.TypeShortcut:
		return truncate(fmt.Sprintf("Keyboard shortcut saved for quick recall: %s.", fallbackTitle(title, "shortcut")), 160), nil
	case items.TypePlugin:
		return truncate(fmt.Sprintf("Plugin saved for evaluation: %s.", fallbackTitle(title, "plugin")), 160), nil
	case items.TypeWorkflow:
		return truncate(fmt.Sprintf("Workflow reference saved for later: %s.", fallbackTitle(title, "workflow")), 160), nil
	case items.TypeAgent:
		return truncate(fmt.Sprintf("Agent/tooling reference saved for later: %s.", fallbackTitle(title, "agent")), 160), nil
	case items.TypePrompt:
		return truncate(fmt.Sprintf("Prompt saved for reuse: %s.", fallbackTitle(title, "prompt")), 160), nil
	case items.TypeTool:
		if host != "" && title != "" {
			return truncate(fmt.Sprintf("Tool saved from %s: %s.", host, title), 160), nil
		}
		return truncate(fmt.Sprintf("Tool saved for later: %s.", fallbackTitle(title, "tool")), 160), nil
	default:
		return truncate(fmt.Sprintf("Reference saved for later: %s.", fallbackTitle(title, "note")), 160), nil
	}
}

func (heuristicProvider) SuggestTags(_ context.Context, in Input) ([]string, error) {
	var tags []string

	if lang := normalizeTag(stringMeta(in.Meta, "language")); lang != "" {
		tags = append(tags, lang)
	}
	for _, topic := range sliceMeta(in.Meta, "topics") {
		if tag := normalizeTag(topic); tag != "" {
			tags = append(tags, tag)
		}
	}
	if host := hostTag(in.URL); host != "" {
		tags = append(tags, host)
	}

	switch in.Type {
	case items.TypeRepo:
		tags = append(tags, "repository")
		if repoName := repoNameTag(in.Title); repoName != "" {
			tags = append(tags, repoName)
		}
	case items.TypeArticle:
		tags = append(tags, "reading")
	case items.TypeCLI:
		tags = append(tags, "cli")
		if cmd := commandTag(in.Title); cmd != "" {
			tags = append(tags, cmd)
		}
	case items.TypeSnippet:
		tags = append(tags, "code")
		if fenced := fencedLanguageTag(in.Title); fenced != "" {
			tags = append(tags, fenced)
		}
	case items.TypeShortcut:
		tags = append(tags, "shortcut")
		if platform := shortcutPlatformTag(in.Title); platform != "" {
			tags = append(tags, platform)
		}
	case items.TypePlugin:
		tags = append(tags, "plugin")
	case items.TypeWorkflow:
		tags = append(tags, "workflow")
	case items.TypePrompt:
		tags = append(tags, "prompt")
	case items.TypeAgent:
		tags = append(tags, "agent")
	case items.TypeTool:
		tags = append(tags, "tool")
	}

	for _, word := range keywordTags(in.Type, in.Title) {
		tags = append(tags, word)
	}

	return uniqueTags(tags), nil
}

func fallbackTitle(s, fallback string) string {
	if strings.TrimSpace(s) == "" {
		return fallback
	}
	return strings.TrimSpace(s)
}

func cleanSentence(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	s = strings.Join(strings.Fields(s), " ")
	if strings.HasSuffix(s, ".") || strings.HasSuffix(s, "!") || strings.HasSuffix(s, "?") {
		return s
	}
	return s + "."
}

func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	if n <= 1 {
		return string(runes[:n])
	}
	return strings.TrimSpace(string(runes[:n-1])) + "…"
}

func hostTag(raw *string) string {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return ""
	}
	u, err := url.Parse(*raw)
	if err != nil || u.Host == "" {
		return ""
	}
	host := strings.ToLower(strings.TrimPrefix(u.Hostname(), "www."))
	switch host {
	case "github.com":
		return "github"
	case "dev.to":
		return "devto"
	case "medium.com":
		return "medium"
	case "plugins.jetbrains.com":
		return "jetbrains"
	case "marketplace.visualstudio.com":
		return "vscode"
	case "chromewebstore.google.com", "chrome.google.com":
		return "chrome"
	case "addons.mozilla.org":
		return "firefox"
	default:
		parts := strings.Split(host, ".")
		if len(parts) >= 2 {
			return normalizeTag(parts[len(parts)-2])
		}
		return normalizeTag(host)
	}
}

func repoNameTag(title string) string {
	parts := strings.Split(strings.TrimSpace(title), "/")
	if len(parts) >= 2 {
		return normalizeTag(parts[1])
	}
	return ""
}

func commandTag(title string) string {
	fields := strings.Fields(strings.ToLower(title))
	stop := map[string]bool{
		"$": true, ">": true, "brew": true, "install": true, "tap": true,
		"apt": true, "apt-get": true, "npm": true, "pnpm": true, "yarn": true,
		"global": true, "add": true, "-g": true, "cargo": true, "go": true,
		"pip": true, "pipx": true, "gem": true, "docker": true, "run": true,
		"pull": true, "kubectl": true, "curl": true, "wget": true,
	}
	for _, f := range fields {
		f = strings.Trim(f, "`'\".,;:()[]{}")
		if f == "" || stop[f] {
			continue
		}
		return normalizeTag(f)
	}
	return ""
}

func fencedLanguageTag(title string) string {
	line := strings.TrimSpace(strings.Split(title, "\n")[0])
	if !strings.HasPrefix(line, "```") {
		return ""
	}
	return normalizeTag(strings.TrimPrefix(line, "```"))
}

func shortcutPlatformTag(title string) string {
	lower := strings.ToLower(title)
	switch {
	case strings.Contains(lower, "cmd"), strings.Contains(lower, "option"):
		return "mac"
	case strings.Contains(lower, "ctrl"), strings.Contains(lower, "win"):
		return "windows"
	default:
		return ""
	}
}

var nonTagRE = regexp.MustCompile(`[^a-z0-9.+#-]+`)

func normalizeTag(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return ""
	}
	s = strings.ReplaceAll(s, "_", "-")
	s = strings.ReplaceAll(s, " ", "-")
	s = nonTagRE.ReplaceAllString(s, "")
	s = strings.Trim(s, "-.")
	return s
}

func keywordTags(itemType items.Type, title string) []string {
	if itemType == items.TypeRepo {
		return nil
	}
	words := strings.FieldsFunc(strings.ToLower(title), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	})
	stop := map[string]bool{
		"the": true, "and": true, "for": true, "with": true, "from": true,
		"your": true, "this": true, "that": true, "into": true, "using": true,
		"save": true, "saved": true, "later": true,
	}
	seen := map[string]bool{}
	out := make([]string, 0, 2)
	for _, w := range words {
		if len(w) < 3 || stop[w] || seen[w] {
			continue
		}
		seen[w] = true
		out = append(out, normalizeTag(w))
		if len(out) == 2 {
			break
		}
	}
	return out
}

func stringMeta(meta map[string]any, key string) string {
	if meta == nil {
		return ""
	}
	v, _ := meta[key].(string)
	return v
}

func sliceMeta(meta map[string]any, key string) []string {
	if meta == nil {
		return nil
	}
	switch v := meta[key].(type) {
	case []string:
		return v
	case []any:
		out := make([]string, 0, len(v))
		for _, raw := range v {
			if s, ok := raw.(string); ok {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func uniqueTags(tags []string) []string {
	if len(tags) == 0 {
		return []string{}
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(tags))
	for _, tag := range tags {
		norm := normalizeTag(tag)
		if norm == "" || seen[norm] {
			continue
		}
		seen[norm] = true
		out = append(out, norm)
	}
	sort.Strings(out)
	if len(out) > 6 {
		out = out[:6]
	}
	return out
}
