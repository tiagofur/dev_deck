package seed

import (
	"devdeck/internal/domain/items"
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
			ID:          "devdeck-demo",
			Name:        "DevDeck Launch Demo",
			Description: "A realistic first vault showing repos, CLIs, prompts, snippets, and workflow context.",
			Icon:        "https://devdeck.ai/favicon.ico",
			Items: []SeedItem{
				{
					Title:       "TanStack Query offline mutation patterns",
					URL:         "https://github.com/TanStack/query",
					Type:        items.TypeRepo,
					Description: "Practical patterns for resilient data fetching, retries, and mutation queues.",
					Tags:        []string{"react", "offline-first", "team-review"},
					WhySaved:    "Useful when frontend state needs to survive flaky networks.",
					WhenToUse:   "Review before implementing sync-heavy React features.",
					Meta:        map[string]any{"language": "TypeScript", "topics": []string{"react-query", "cache"}},
				},
				{
					Title:       "gh pr review workflow aliases",
					URL:         "https://cli.github.com/manual/gh_pr",
					Type:        items.TypeCLI,
					Description: "Short commands for checking review threads, CI state, and ready-to-merge status.",
					Notes:       "gh pr view --json statusCheckRollup,reviewDecision\n\ngh pr checks --watch",
					Tags:        []string{"github", "cli", "reviews"},
					WhySaved:    "Keeps small PRs moving without losing issue-first discipline.",
					WhenToUse:   "Use during launch-readiness review loops.",
					Meta:        map[string]any{"language": "Shell", "topics": []string{"github", "pull-requests"}},
				},
				{
					Title:       "Launch PR risk review prompt",
					Type:        items.TypePrompt,
					Description: "A compact checklist for test coverage, rollback risk, issue scope, and user-facing copy.",
					Notes:       "Review this PR for launch risk. Check issue scope, user-facing copy, tests, rollback path, and whether the diff should be split.",
					Tags:        []string{"prompt", "code-review", "quality"},
					WhySaved:    "Prevents large unreviewable PRs from sneaking into launch work.",
					WhenToUse:   "Run before marking a draft PR ready.",
					Meta:        map[string]any{"language": "Markdown", "topics": []string{"review", "launch"}},
				},
				{
					Title:       "Caddy reverse proxy block for self-hosting",
					Type:        items.TypeSnippet,
					Description: "Minimal Caddyfile pattern for routing the web app and API behind TLS.",
					Notes:       "devdeck.example.com {\n  reverse_proxy web:5173\n}\n\napi.devdeck.example.com {\n  reverse_proxy api:8080\n}",
					Tags:        []string{"self-hosting", "caddy", "vps"},
					WhySaved:    "Good starting point for validating the public beta self-hosting guide.",
					WhenToUse:   "Use when testing DevDeck on a small VPS.",
					Meta:        map[string]any{"language": "Caddyfile", "topics": []string{"deploy", "tls"}},
				},
				{
					Title:       "Community finding workflow",
					Type:        items.TypeWorkflow,
					Description: "A reusable flow for turning a useful discovery into shared Circle memory.",
					Notes:       "1. Capture the repo, CLI, prompt, or snippet.\n2. Add why it matters and when to use it.\n3. Tag the stack and source.\n4. Share it to a Circle with one concrete gotcha.",
					Tags:        []string{"circles", "community", "workflow"},
					WhySaved:    "Makes shared knowledge useful instead of another chat link dump.",
					WhenToUse:   "Use when someone posts a useful tool in Discord, Slack, Reddit, or a forum.",
					Meta:        map[string]any{"topics": []string{"circles", "curation"}},
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
