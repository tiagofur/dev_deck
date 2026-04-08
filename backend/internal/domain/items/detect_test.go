package items

import "testing"

func TestDetectType_AllNineRules(t *testing.T) {
	cases := []struct {
		name  string
		in    CaptureInput
		want  Type
		title string // empty = don't check
	}{
		// Rule 1 — explicit type_hint wins over URL heuristics.
		{
			name: "rule1_type_hint_wins",
			in: CaptureInput{
				URL:      "https://github.com/charmbracelet/bubbletea",
				TypeHint: string(TypeTool),
			},
			want: TypeTool,
		},
		// Rule 2 — github.com/<owner>/<repo> → repo.
		{
			name:  "rule2_github_repo",
			in:    CaptureInput{URL: "https://github.com/charmbracelet/bubbletea"},
			want:  TypeRepo,
			title: "charmbracelet/bubbletea",
		},
		// Rule 2b — github.com/settings is NOT a repo.
		{
			name: "rule2_github_non_repo_path",
			in:   CaptureInput{URL: "https://github.com/settings/profile"},
			want: TypeTool,
		},
		// Rule 3 — plugin marketplace.
		{
			name: "rule3_plugin_vscode_marketplace",
			in:   CaptureInput{URL: "https://marketplace.visualstudio.com/items?itemName=foo.bar"},
			want: TypePlugin,
		},
		{
			name: "rule3_plugin_jetbrains",
			in:   CaptureInput{URL: "https://plugins.jetbrains.com/plugin/1234-my-plugin"},
			want: TypePlugin,
		},
		// Rule 4 — known article domains.
		{
			name: "rule4_article_devto",
			in:   CaptureInput{URL: "https://dev.to/foo/my-post-abc"},
			want: TypeArticle,
		},
		{
			name: "rule4_article_medium_subdomain",
			in:   CaptureInput{URL: "https://blog.medium.com/great-post"},
			want: TypeArticle,
		},
		// Rule 5 — shell command.
		{
			name: "rule5_cli_brew_install",
			in:   CaptureInput{Text: "brew install ripgrep"},
			want: TypeCLI,
		},
		{
			name: "rule5_cli_cargo_install",
			in:   CaptureInput{Text: "cargo install ripgrep"},
			want: TypeCLI,
		},
		{
			name: "rule5_cli_dollar_prompt",
			in:   CaptureInput{Text: "$ kubectl get pods"},
			want: TypeCLI,
		},
		// Rule 6 — snippet (triple backticks).
		{
			name: "rule6_snippet_triple_backticks",
			in:   CaptureInput{Text: "```go\nfunc main() {}\n```"},
			want: TypeSnippet,
		},
		// Rule 6b — snippet (indented multi-line code).
		{
			name: "rule6_snippet_indented",
			in: CaptureInput{Text: `function hello() {
  console.log("hi");
  return 42;
}`},
			want: TypeSnippet,
		},
		// Rule 7 — keyboard shortcut.
		{
			name: "rule7_shortcut_cmd_shift_p",
			in:   CaptureInput{Text: "Cmd+Shift+P"},
			want: TypeShortcut,
		},
		{
			name: "rule7_shortcut_ctrl_alt_t",
			in:   CaptureInput{Text: "Ctrl+Alt+T"},
			want: TypeShortcut,
		},
		// Rule 8 — URL present but no specific rule matched.
		{
			name: "rule8_tool_generic_url",
			in:   CaptureInput{URL: "https://ripgrep.dev/"},
			want: TypeTool,
		},
		// Rule 9 — text only, no URL.
		{
			name: "rule9_note_plain_text",
			in:   CaptureInput{Text: "remember to update dependencies before friday"},
			want: TypeNote,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := DetectType(tc.in)
			if got.Type != tc.want {
				t.Errorf("DetectType() = %q, want %q (input: %+v)", got.Type, tc.want, tc.in)
			}
			if tc.title != "" && got.Title != tc.title {
				t.Errorf("title = %q, want %q", got.Title, tc.title)
			}
		})
	}
}

func TestDetectType_TitleHintRespected(t *testing.T) {
	in := CaptureInput{URL: "https://example.com/x", TitleHint: "Custom title"}
	got := DetectType(in)
	if got.Type != TypeTool {
		t.Errorf("expected TypeTool, got %q", got.Type)
	}
}

func TestIsValid(t *testing.T) {
	if !IsValid("repo") {
		t.Error("'repo' should be valid")
	}
	if IsValid("not-a-type") {
		t.Error("'not-a-type' should NOT be valid")
	}
	if IsValid("") {
		t.Error("empty string should NOT be valid")
	}
}
