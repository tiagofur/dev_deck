package seed

import (
	"devdeck/internal/domain/items"
)

type StarterKit struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"`
	Items       []SeedItem `json:"items"`
}

type SeedItem struct {
	Title string `json:"title"`
	URL   string `json:"url"`
	Type  items.Type `json:"type"`
	Tags  []string `json:"tags"`
}

func GetStarterKits() []StarterKit {
	return []StarterKit{
		{
			ID:          "go-starter",
			Name:        "Go Backend Starter",
			Description: "Herramientas esenciales para el desarrollo backend con Go.",
			Icon:        "https://go.dev/blog/go-brand/Go-Logo/PNG/Go-Logo_Blue.png",
			Items: []SeedItem{
				{Title: "Standard Library Docs", URL: "https://pkg.go.dev/std", Type: items.TypeArticle, Tags: []string{"go", "docs"}},
				{Title: "Go by Example", URL: "https://gobyexample.com/", Type: items.TypeArticle, Tags: []string{"go", "tutorial"}},
				{Title: "sqlc", URL: "https://github.com/sqlc-dev/sqlc", Type: items.TypeRepo, Tags: []string{"go", "db", "sql"}},
				{Title: "golang-migrate", URL: "https://github.com/golang-migrate/migrate", Type: items.TypeRepo, Tags: []string{"go", "db", "migrations"}},
				{Title: "chi", URL: "https://github.com/go-chi/chi", Type: items.TypeRepo, Tags: []string{"go", "http", "router"}},
			},
		},
		{
			ID:          "node-starter",
			Name:        "Node.js Fullstack Starter",
			Description: "Todo lo necesario para arrancar con TypeScript, React y Node.",
			Icon:        "https://nodejs.org/static/images/logo.svg",
			Items: []SeedItem{
				{Title: "TypeScript Handbook", URL: "https://www.typescriptlang.org/docs/handbook/intro.html", Type: items.TypeArticle, Tags: []string{"ts", "docs"}},
				{Title: "TanStack Query", URL: "https://github.com/TanStack/query", Type: items.TypeRepo, Tags: []string{"react", "async"}},
				{Title: "Zustand", URL: "https://github.com/pmndrs/zustand", Type: items.TypeRepo, Tags: []string{"react", "state"}},
				{Title: "Vite", URL: "https://github.com/vitejs/vite", Type: items.TypeRepo, Tags: []string{"frontend", "build"}},
				{Title: "Prisma", URL: "https://github.com/prisma/prisma", Type: items.TypeRepo, Tags: []string{"orm", "db"}},
			},
		},
		{
			ID:          "ai-starter",
			Name:        "AI & LLM Dev Kit",
			Description: "Recursos para construir aplicaciones impulsadas por modelos de lenguaje.",
			Icon:        "https://openai.com/favicon.ico",
			Items: []SeedItem{
				{Title: "LangChain", URL: "https://github.com/langchain-ai/langchain", Type: items.TypeRepo, Tags: []string{"ai", "llm", "framework"}},
				{Title: "Ollama", URL: "https://github.com/ollama/ollama", Type: items.TypeRepo, Tags: []string{"ai", "local", "llm"}},
				{Title: "OpenAI Cookbook", URL: "https://github.com/openai/openai-cookbook", Type: items.TypeRepo, Tags: []string{"ai", "tutorial", "openai"}},
				{Title: "pgvector", URL: "https://github.com/pgvector/pgvector", Type: items.TypeRepo, Tags: []string{"ai", "db", "postgres"}},
			},
		},
	}
}
