package items

import (
	"net/url"
	"regexp"
	"strings"
)

// DetectionResult is the outcome of running a CaptureInput through the
// heuristic classifier. Title is set to the best-guess title when the
// detector can cheaply derive one (e.g. owner/repo for github), so the
// handler doesn't have to repeat that logic.
type DetectionResult struct {
	Type  Type
	Title string
}

// DetectType implements the 9-step decision tree from docs/CAPTURE.md
// §Endpoint unificado. The order matters: earlier rules win.
//
// Rule summary:
//  1. type_hint → use it.
//  2. url matches github.com/<owner>/<repo> → repo.
//  3. url matches a known plugin marketplace → plugin.
//  4. url matches a known article domain → article.
//  5. text starts with a shell prefix ($ /  > / brew / npm install -g / etc) → cli.
//  6. text contains ``` or ≥ 3 lines of code → snippet.
//  7. text matches a keyboard shortcut pattern → shortcut.
//  8. url present but no rule matched → tool.
//  9. text only, no url → note.
func DetectType(in CaptureInput) DetectionResult {
	// Rule 1 — explicit hint wins.
	if in.TypeHint != "" && IsValid(in.TypeHint) {
		return DetectionResult{Type: Type(in.TypeHint), Title: deriveTitle(in, Type(in.TypeHint))}
	}

	rawURL := strings.TrimSpace(in.URL)
	rawText := strings.TrimSpace(in.Text)

	if rawURL != "" {
		u, err := url.Parse(rawURL)
		if err == nil && u.Host != "" {
			host := strings.ToLower(u.Host)
			host = strings.TrimPrefix(host, "www.")

			// Rule 2 — github repo.
			if host == "github.com" {
				if owner, repo, ok := githubOwnerRepo(u.Path); ok {
					return DetectionResult{
						Type:  TypeRepo,
						Title: owner + "/" + repo,
					}
				}
			}

			// Rule 3 — plugin marketplaces.
			if isPluginHost(host) {
				return DetectionResult{Type: TypePlugin, Title: deriveTitleFromURL(u)}
			}

			// Rule 4 — known article domains.
			if isArticleHost(host) {
				return DetectionResult{Type: TypeArticle, Title: deriveTitleFromURL(u)}
			}
		}
	}

	if rawText != "" {
		// Rule 5 — shell command patterns.
		if isCommandText(rawText) {
			return DetectionResult{Type: TypeCLI, Title: firstLine(rawText)}
		}
		// Rule 6 — snippet (multi-line code or triple backtick).
		if isSnippetText(rawText) {
			return DetectionResult{Type: TypeSnippet, Title: firstLine(rawText)}
		}
		// Rule 7 — keyboard shortcut.
		if isShortcutText(rawText) {
			return DetectionResult{Type: TypeShortcut, Title: rawText}
		}
	}

	// Rule 8 — url with nothing more specific → generic tool.
	if rawURL != "" {
		if u, err := url.Parse(rawURL); err == nil && u.Host != "" {
			return DetectionResult{Type: TypeTool, Title: deriveTitleFromURL(u)}
		}
	}

	// Rule 9 — fallback: plain note.
	title := in.TitleHint
	if title == "" {
		title = firstLine(rawText)
	}
	return DetectionResult{Type: TypeNote, Title: title}
}

// githubOwnerRepo extracts owner/repo from a github.com path, or
// returns ok=false if the path isn't a repo URL (e.g. /explore, /settings).
func githubOwnerRepo(path string) (owner, repo string, ok bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	// Filter out reserved first segments like /search, /settings, /marketplace.
	reservedFirst := map[string]bool{
		"search": true, "settings": true, "marketplace": true,
		"explore": true, "trending": true, "notifications": true,
		"pulls": true, "issues": true, "topics": true, "about": true,
		"login": true, "join": true, "organizations": true,
	}
	if reservedFirst[strings.ToLower(parts[0])] {
		return "", "", false
	}
	repo = strings.TrimSuffix(parts[1], ".git")
	return parts[0], repo, true
}

// pluginHosts is the whitelist of marketplace domains that look like
// "extension for an editor/IDE" — matches get classified as plugin.
var pluginHosts = map[string]bool{
	"marketplace.visualstudio.com": true,
	"plugins.jetbrains.com":        true,
	"addons.mozilla.org":           true,
	"chromewebstore.google.com":    true,
	"chrome.google.com":            true, // older webstore URL
}

func isPluginHost(host string) bool {
	return pluginHosts[host]
}

// articleHosts covers the top dev-blog platforms. Users can always
// override with type_hint if the classifier picks wrong.
var articleHosts = map[string]bool{
	"dev.to":            true,
	"medium.com":        true,
	"hashnode.com":      true,
	"hashnode.dev":      true,
	"substack.com":      true,
	"blog.logrocket.com": true,
	"css-tricks.com":    true,
	"smashingmagazine.com": true,
	"freecodecamp.org":  true,
}

func isArticleHost(host string) bool {
	if articleHosts[host] {
		return true
	}
	// Subdomains on substack/medium/hashnode (e.g. foo.substack.com).
	for base := range articleHosts {
		if strings.HasSuffix(host, "."+base) {
			return true
		}
	}
	return false
}

// commandPrefixes are the tokens we treat as "this is a CLI install line".
// Case-insensitive match on the first non-space run of text.
var commandPrefixes = []string{
	"$ ", "> ",
	"brew install", "brew tap",
	"apt install", "apt-get install",
	"npm install -g", "npm i -g",
	"pnpm add -g", "yarn global add",
	"cargo install",
	"go install",
	"pip install", "pipx install",
	"gem install",
	"curl ",
	"wget ",
	"docker run", "docker pull",
	"kubectl ",
}

func isCommandText(text string) bool {
	lower := strings.ToLower(text)
	for _, p := range commandPrefixes {
		if strings.HasPrefix(lower, p) {
			return true
		}
	}
	return false
}

// isSnippetText returns true if the text looks like a code block:
// triple backticks, or ≥ 3 non-empty lines with code-ish indentation
// or punctuation.
func isSnippetText(text string) bool {
	if strings.Contains(text, "```") {
		return true
	}
	lines := strings.Split(text, "\n")
	if len(lines) < 3 {
		return false
	}
	codeish := 0
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if trimmed == "" {
			continue
		}
		// Heuristics: starts with whitespace, ends in ; { } , or contains
		// common code tokens.
		if strings.HasPrefix(l, "  ") || strings.HasPrefix(l, "\t") {
			codeish++
			continue
		}
		if strings.HasSuffix(trimmed, "{") || strings.HasSuffix(trimmed, "}") ||
			strings.HasSuffix(trimmed, ";") || strings.HasSuffix(trimmed, ",") {
			codeish++
			continue
		}
		if strings.Contains(trimmed, "function ") || strings.Contains(trimmed, "def ") ||
			strings.Contains(trimmed, "=>") || strings.Contains(trimmed, "const ") ||
			strings.Contains(trimmed, "let ") || strings.Contains(trimmed, "var ") {
			codeish++
		}
	}
	return codeish >= 2
}

// shortcutRE recognises a keyboard shortcut like "Cmd+Shift+P",
// "Ctrl+Alt+T", "Shift+F10". We accept Cmd/Ctrl/Alt/Option/Shift/Meta/Win
// joined by + or -, terminated by a single key or F-key.
var shortcutRE = regexp.MustCompile(`(?i)^(cmd|ctrl|alt|opt|option|shift|meta|win)([+\- ](cmd|ctrl|alt|opt|option|shift|meta|win))*[+\- ]([a-z0-9]|f\d{1,2}|esc|tab|enter|space|up|down|left|right)$`)

func isShortcutText(text string) bool {
	return shortcutRE.MatchString(strings.TrimSpace(text))
}

// deriveTitle picks a reasonable title for the captured item based on
// the type and what the input provides.
func deriveTitle(in CaptureInput, t Type) string {
	if in.TitleHint != "" {
		return in.TitleHint
	}
	rawURL := strings.TrimSpace(in.URL)
	if rawURL != "" {
		if u, err := url.Parse(rawURL); err == nil && u.Host != "" {
			if t == TypeRepo {
				if owner, repo, ok := githubOwnerRepo(u.Path); ok {
					return owner + "/" + repo
				}
			}
			return deriveTitleFromURL(u)
		}
	}
	return firstLine(in.Text)
}

func deriveTitleFromURL(u *url.URL) string {
	// Prefer the last non-empty path segment, fall back to the host.
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	for i := len(parts) - 1; i >= 0; i-- {
		if s := strings.TrimSpace(parts[i]); s != "" {
			return s
		}
	}
	return strings.TrimPrefix(u.Host, "www.")
}

func firstLine(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if idx := strings.IndexByte(s, '\n'); idx != -1 {
		return strings.TrimSpace(s[:idx])
	}
	return s
}
