package seed

import (
	"devdeck/internal/domain/items"
)

// DemoKitID identifies the demo vault kit; DemoTag marks every item it
// installs so demo data can be bulk-removed (or kept by removing the tag).
const (
	DemoKitID = "devdeck-demo"
	DemoTag   = "demo"
)

type StarterKit struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Icon        string     `json:"icon"`
	Items       []SeedItem `json:"items"`
}

type SeedItem struct {
	Title       string         `json:"title"`
	URL         string         `json:"url"`
	Type        items.Type     `json:"type"`
	Description string         `json:"description,omitempty"`
	Notes       string         `json:"notes,omitempty"`
	Tags        []string       `json:"tags"`
	WhySaved    string         `json:"why_saved,omitempty"`
	WhenToUse   string         `json:"when_to_use,omitempty"`
	Meta        map[string]any `json:"meta,omitempty"`
}

func GetStarterKits() []StarterKit {
	return []StarterKit{
		{
			ID:          DemoKitID,
			Name:        "DevDeck Launch Demo",
			Description: "A realistic demo vault: repos, CLIs, shortcuts, prompts, snippets, notes, and workflow context. Every item is tagged 'demo' so it can be removed in one click.",
			Icon:        "https://devdeck.ai/favicon.ico",
			Items: []SeedItem{
				{
					Title:       "TanStack Query offline mutation patterns",
					URL:         "https://github.com/TanStack/query",
					Type:        items.TypeRepo,
					Description: "Practical patterns for resilient data fetching, retries, and mutation queues.",
					Tags:        []string{DemoTag, "react", "offline-first"},
					WhySaved:    "Useful when frontend state needs to survive flaky networks.",
					WhenToUse:   "Review before implementing sync-heavy React features.",
					Meta:        map[string]any{"language": "TypeScript", "topics": []string{"react-query", "cache"}},
				},
				{
					Title:       "ripgrep",
					URL:         "https://github.com/BurntSushi/ripgrep",
					Type:        items.TypeRepo,
					Description: "Recursively search directories with regex, respecting .gitignore. Much faster than grep.",
					Tags:        []string{DemoTag, "cli", "search", "rust"},
					WhySaved:    "The tool I reach for when I need to find anything in a codebase fast.",
					WhenToUse:   "Use instead of grep -r for any repo-wide text search.",
					Meta:        map[string]any{"language": "Rust", "topics": []string{"search", "cli"}},
				},
				{
					Title:       "fzf",
					URL:         "https://github.com/junegunn/fzf",
					Type:        items.TypeRepo,
					Description: "General-purpose command-line fuzzy finder for files, history, processes, and more.",
					Tags:        []string{DemoTag, "cli", "fuzzy-finder", "shell"},
					WhySaved:    "Turns any list into an interactive picker; pairs with everything.",
					WhenToUse:   "Wire into shell history (Ctrl+R) and git branch switching.",
					Meta:        map[string]any{"language": "Go", "topics": []string{"fuzzy", "terminal"}},
				},
				{
					Title:       "lazygit",
					URL:         "https://github.com/jesseduffield/lazygit",
					Type:        items.TypeRepo,
					Description: "Terminal UI for git: staging hunks, interactive rebase, and branch management without memorizing flags.",
					Tags:        []string{DemoTag, "git", "tui"},
					WhySaved:    "Makes interactive rebases and partial staging actually pleasant.",
					WhenToUse:   "Use when a rebase or hunk-level staging gets fiddly in plain git.",
					Meta:        map[string]any{"language": "Go", "topics": []string{"git", "terminal"}},
				},
				{
					Title:       "gh pr review workflow aliases",
					URL:         "https://cli.github.com/manual/gh_pr",
					Type:        items.TypeCLI,
					Description: "Short commands for checking review threads, CI state, and ready-to-merge status.",
					Notes:       "gh pr view --json statusCheckRollup,reviewDecision\n\ngh pr checks --watch",
					Tags:        []string{DemoTag, "github", "cli", "reviews"},
					WhySaved:    "Keeps small PRs moving without losing issue-first discipline.",
					WhenToUse:   "Use during launch-readiness review loops.",
					Meta:        map[string]any{"language": "Shell", "topics": []string{"github", "pull-requests"}},
				},
				{
					Title:       "Docker cleanup one-liners",
					Type:        items.TypeCLI,
					Description: "Reclaim disk space from dangling images, stopped containers, and unused volumes.",
					Notes:       "docker system df\n\ndocker system prune --volumes\n\ndocker image prune -a --filter \"until=168h\"",
					Tags:        []string{DemoTag, "docker", "cleanup"},
					WhySaved:    "Docker quietly ate 40GB of my disk once. Never again.",
					WhenToUse:   "Run when the dev machine disk fills up mysteriously.",
					Meta:        map[string]any{"language": "Shell", "topics": []string{"docker", "disk"}},
				},
				{
					Title:       "git bisect quickstart",
					Type:        items.TypeCLI,
					Description: "Binary-search the commit that introduced a bug instead of reading diffs for an hour.",
					Notes:       "git bisect start\ngit bisect bad\ngit bisect good v0.4.0\n# test, then: git bisect good|bad\ngit bisect reset",
					Tags:        []string{DemoTag, "git", "debugging"},
					WhySaved:    "Finds the breaking commit in log2(n) steps; I always forget the exact incantation.",
					WhenToUse:   "Use when a regression appeared somewhere in the last N commits.",
					Meta:        map[string]any{"language": "Shell", "topics": []string{"git", "bisect"}},
				},
				{
					Title:       "VS Code: command palette",
					Type:        items.TypeShortcut,
					Description: "Cmd+Shift+P (macOS) / Ctrl+Shift+P (Win/Linux) — every editor action, searchable.",
					Notes:       "Cmd+Shift+P",
					Tags:        []string{DemoTag, "vscode", "shortcut"},
					WhySaved:    "The one shortcut that makes every other shortcut discoverable.",
					WhenToUse:   "Use instead of hunting through menus.",
					Meta:        map[string]any{"topics": []string{"editor", "productivity"}},
				},
				{
					Title:       "tmux: detach and reattach",
					Type:        items.TypeShortcut,
					Description: "Ctrl+B D detaches; tmux attach -t 0 reattaches. Long-running jobs survive SSH drops.",
					Notes:       "Ctrl+B D\ntmux attach -t 0",
					Tags:        []string{DemoTag, "tmux", "shortcut", "ssh"},
					WhySaved:    "Saved a 3-hour migration when the hotel wifi died.",
					WhenToUse:   "Always run long remote jobs inside tmux.",
					Meta:        map[string]any{"topics": []string{"terminal", "remote"}},
				},
				{
					Title:       "Launch PR risk review prompt",
					Type:        items.TypePrompt,
					Description: "A compact checklist for test coverage, rollback risk, issue scope, and user-facing copy.",
					Notes:       "Review this PR for launch risk. Check issue scope, user-facing copy, tests, rollback path, and whether the diff should be split.",
					Tags:        []string{DemoTag, "prompt", "code-review", "quality"},
					WhySaved:    "Prevents large unreviewable PRs from sneaking into launch work.",
					WhenToUse:   "Run before marking a draft PR ready.",
					Meta:        map[string]any{"language": "Markdown", "topics": []string{"review", "launch"}},
				},
				{
					Title:       "Commit message generator prompt",
					Type:        items.TypePrompt,
					Description: "Produces a conventional-commit message from a diff, with scope and an honest body.",
					Notes:       "Write a conventional commit message for this diff. Format: type(scope): summary under 65 chars, then a body explaining what changed and why - not how. No fluff.",
					Tags:        []string{DemoTag, "prompt", "git"},
					WhySaved:    "Consistent commit history without bikeshedding every message.",
					WhenToUse:   "Use when the diff is clear but naming it is not.",
					Meta:        map[string]any{"language": "Markdown", "topics": []string{"git", "commits"}},
				},
				{
					Title:       "Caddy reverse proxy block for self-hosting",
					Type:        items.TypeSnippet,
					Description: "Minimal Caddyfile pattern for routing the web app and API behind TLS.",
					Notes:       "devdeck.example.com {\n  reverse_proxy web:5173\n}\n\napi.devdeck.example.com {\n  reverse_proxy api:8080\n}",
					Tags:        []string{DemoTag, "self-hosting", "caddy", "vps"},
					WhySaved:    "Good starting point for validating the public beta self-hosting guide.",
					WhenToUse:   "Use when testing DevDeck on a small VPS.",
					Meta:        map[string]any{"language": "Caddyfile", "topics": []string{"deploy", "tls"}},
				},
				{
					Title:       "Makefile self-documenting help target",
					Type:        items.TypeSnippet,
					Description: "make help that lists every target with its ## comment. Zero dependencies.",
					Notes:       "help: ## Show this help\n\t@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = \":.*?## \"}; {printf \"%-20s %s\\n\", $$1, $$2}'",
					Tags:        []string{DemoTag, "make", "snippet", "dx"},
					WhySaved:    "Every repo with a Makefile deserves a discoverable help target.",
					WhenToUse:   "Drop into any Makefile as the default target.",
					Meta:        map[string]any{"language": "Makefile", "topics": []string{"build", "dx"}},
				},
				{
					Title:       "Postgres: find missing indexes",
					Type:        items.TypeNote,
					Description: "Gotchas from debugging slow queries: seq scans on big tables, unused indexes, and EXPLAIN basics.",
					Notes:       "- EXPLAIN (ANALYZE, BUFFERS) before guessing.\n- pg_stat_user_tables.seq_scan high + n_live_tup big = missing index candidate.\n- Composite index column order matters: equality first, range last.\n- Partial indexes for soft-delete flags (WHERE archived = false).",
					Tags:        []string{DemoTag, "postgres", "performance", "note"},
					WhySaved:    "Hard-won debugging notes from a 40s query that became 80ms.",
					WhenToUse:   "Read before adding an index by gut feeling.",
					Meta:        map[string]any{"language": "SQL", "topics": []string{"postgres", "indexes"}},
				},
				{
					Title:       "HTTP caching, explained",
					URL:         "https://web.dev/articles/http-cache",
					Type:        items.TypeArticle,
					Description: "Cache-Control, ETag, and validation flows — the mental model behind browser caching.",
					Tags:        []string{DemoTag, "http", "caching", "article"},
					WhySaved:    "The reference I send to anyone confused about stale assets after a deploy.",
					WhenToUse:   "Read when designing cache headers for an API or static assets.",
					Meta:        map[string]any{"topics": []string{"http", "performance"}},
				},
				{
					Title:       "Community finding workflow",
					Type:        items.TypeWorkflow,
					Description: "A reusable flow for turning a useful discovery into shared Circle memory.",
					Notes:       "1. Capture the repo, CLI, prompt, or snippet.\n2. Add why it matters and when to use it.\n3. Tag the stack and source.\n4. Share it to a Circle with one concrete gotcha.",
					Tags:        []string{DemoTag, "circles", "community", "workflow"},
					WhySaved:    "Makes shared knowledge useful instead of another chat link dump.",
					WhenToUse:   "Use when someone posts a useful tool in Discord, Slack, Reddit, or a forum.",
					Meta:        map[string]any{"topics": []string{"circles", "curation"}},
				},
				{
					Title:       "jq cheats for API debugging",
					Type:        items.TypeCLI,
					Description: "The four jq filters that cover 90% of API response wrangling.",
					Notes:       "curl -s $URL | jq '.items[].title'\ncurl -s $URL | jq 'keys'\ncurl -s $URL | jq '.items | length'\ncurl -s $URL | jq '[.items[] | {id, title}]'",
					Tags:        []string{DemoTag, "jq", "cli", "api"},
					WhySaved:    "Stops me from piping JSON into Python for one-liners.",
					WhenToUse:   "Use when eyeballing any JSON API response in the terminal.",
					Meta:        map[string]any{"language": "Shell", "topics": []string{"json", "debugging"}},
				},
			},
		},
		{
			ID:          "go-starter",
			Name:        "Go Backend Starter",
			Description: "Essential tools for backend development with Go.",
			Icon:        "https://go.dev/blog/go-brand/Go-Logo/PNG/Go-Logo_Blue.png",
			Items: []SeedItem{
				{Title: "Standard Library Docs", URL: "https://pkg.go.dev/std", Type: items.TypeArticle, Description: "Canonical reference for Go packages, examples, and API docs.", Tags: []string{"go", "docs"}, WhySaved: "The fastest source of truth for standard package behavior.", WhenToUse: "Use before adding dependencies for behavior Go already ships."},
				{Title: "Go by Example", URL: "https://gobyexample.com/", Type: items.TypeArticle, Description: "Concise runnable examples for common Go language patterns.", Tags: []string{"go", "tutorial"}, WhySaved: "Great for quickly refreshing syntax and idioms.", WhenToUse: "Use when onboarding someone to a Go codebase."},
				{Title: "sqlc", URL: "https://github.com/sqlc-dev/sqlc", Type: items.TypeRepo, Description: "Generate type-safe Go code from SQL queries.", Tags: []string{"go", "db", "sql"}, WhySaved: "Keeps SQL explicit while preserving compile-time safety.", WhenToUse: "Use when the schema should stay close to the queries."},
				{Title: "golang-migrate", URL: "https://github.com/golang-migrate/migrate", Type: items.TypeRepo, Description: "Database migration CLI and Go library.", Tags: []string{"go", "db", "migrations"}, WhySaved: "Reliable migration baseline for Go services.", WhenToUse: "Use before introducing custom migration tooling."},
				{Title: "chi", URL: "https://github.com/go-chi/chi", Type: items.TypeRepo, Description: "Lightweight idiomatic HTTP router for Go services.", Tags: []string{"go", "http", "router"}, WhySaved: "Small router with middleware composition that fits Go APIs.", WhenToUse: "Use for backend APIs that do not need a heavy framework."},
			},
		},
		{
			ID:          "node-starter",
			Name:        "Node.js Fullstack Starter",
			Description: "A practical starter vault for TypeScript, React, and Node projects.",
			Icon:        "https://nodejs.org/static/images/logo.svg",
			Items: []SeedItem{
				{Title: "TypeScript Handbook", URL: "https://www.typescriptlang.org/docs/handbook/intro.html", Type: items.TypeArticle, Description: "Official reference for TypeScript language fundamentals and patterns.", Tags: []string{"typescript", "docs"}, WhySaved: "Useful when team discussions need canonical TypeScript behavior.", WhenToUse: "Use before relying on blog-post interpretations of the type system."},
				{Title: "TanStack Query", URL: "https://github.com/TanStack/query", Type: items.TypeRepo, Description: "Async server-state library for React and other frameworks.", Tags: []string{"react", "async", "cache"}, WhySaved: "Avoids hand-rolled loading, retry, and cache state.", WhenToUse: "Use for server data that needs background refresh or mutation state."},
				{Title: "Zustand", URL: "https://github.com/pmndrs/zustand", Type: items.TypeRepo, Description: "Small state-management library with a simple store API.", Tags: []string{"react", "state"}, WhySaved: "Good for local UI or app state without reducer boilerplate.", WhenToUse: "Use when state is shared across distant components but not server-owned."},
				{Title: "Vite", URL: "https://github.com/vitejs/vite", Type: items.TypeRepo, Description: "Fast frontend build tool and development server.", Tags: []string{"frontend", "build"}, WhySaved: "Default choice for fast React/TypeScript app iteration.", WhenToUse: "Use when bootstrapping a modern frontend workspace."},
				{Title: "Prisma", URL: "https://github.com/prisma/prisma", Type: items.TypeRepo, Description: "TypeScript ORM and migration toolkit.", Tags: []string{"orm", "db"}, WhySaved: "Good fit when schema modeling and generated client DX matter.", WhenToUse: "Use when a Node app needs structured database access quickly."},
			},
		},
		{
			ID:          "ai-starter",
			Name:        "AI & LLM Dev Kit",
			Description: "Resources for building language-model powered developer tools.",
			Icon:        "https://openai.com/favicon.ico",
			Items: []SeedItem{
				{Title: "LangChain", URL: "https://github.com/langchain-ai/langchain", Type: items.TypeRepo, Description: "Framework ecosystem for LLM app building and orchestration.", Tags: []string{"ai", "llm", "framework"}, WhySaved: "Useful reference for common agent and retrieval patterns.", WhenToUse: "Use when prototyping LLM workflow abstractions."},
				{Title: "Ollama", URL: "https://github.com/ollama/ollama", Type: items.TypeRepo, Description: "Run local language models with a simple developer UX.", Tags: []string{"ai", "local", "llm"}, WhySaved: "Good local-first option for private experiments.", WhenToUse: "Use when data should stay on the developer machine."},
				{Title: "OpenAI Cookbook", URL: "https://github.com/openai/openai-cookbook", Type: items.TypeRepo, Description: "Examples and implementation guides for OpenAI-powered apps.", Tags: []string{"ai", "tutorial", "openai"}, WhySaved: "Concrete examples beat vague AI architecture guesses.", WhenToUse: "Use when validating prompting, embeddings, or tool-calling patterns."},
				{Title: "pgvector", URL: "https://github.com/pgvector/pgvector", Type: items.TypeRepo, Description: "Postgres extension for vector similarity search.", Tags: []string{"ai", "db", "postgres"}, WhySaved: "Keeps semantic search close to relational data.", WhenToUse: "Use when vector search should live inside Postgres."},
			},
		},
	}
}
