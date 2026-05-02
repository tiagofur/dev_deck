# Contributing to DevDeck.ai

First of all, thank you for being here! **DevDeck.ai** is an open-source project born from the need to organize development knowledge in a way that actually works. If you want to help build the ultimate external memory for developers, you are in the right place.

[Leer en español](CONTRIBUTING.es.md)

---

## Our Mission
To build a tool that makes everything you find (repos, CLIs, snippets, prompts) findable weeks later through AI-powered semantic search and high-quality organization.

## Code of Conduct
We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md). Be respectful, professional, and helpful.

## Tech Stack
We are a **pnpm workspaces monorepo**:
- **Frontend:** React 18 + TypeScript + Tailwind CSS + TanStack Query + Framer Motion.
- **Desktop:** Electron (wrapping the React app).
- **Backend:** Go + Chi + pgx + pgvector.
- **Database:** Postgres 16 (vector search).

---

## How to Contribute

### 1. Find or Open an Issue
Before writing code, please check the [Issues](https://github.com/tiagofur/dev_deck/issues) to see if what you want to do is already being discussed. If not, open a new issue describing the problem or feature.

### 2. Fork and Branch
- Fork the repository.
- Create a branch for your change: `git checkout -b feature/awesome-thing` or `bugfix/fix-that-bug`.

### 3. Development Setup

#### Prerequisites
- **Node.js** v20+.
- **pnpm** v9+.
- **Go** 1.22+.
- **Docker** & **Docker Compose** (for Postgres/pgvector).

#### Initial Setup
```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres)
pnpm run infra:up

# Start Backend (in /backend)
go run cmd/api/main.go

# Start Frontend (Web)
pnpm run web:dev

# Start Desktop (Electron)
pnpm run desktop:dev
```

### 4. Style Guide
- **Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add search filter`, `fix: handle null pointers`).
- **TypeScript:** Strict mode is on. Prefer functional components and hooks.
- **Go:** Follow standard `gofmt` and idiomatic Go patterns (Clean Architecture).
- **Architecture:** We follow a domain-driven approach. Logic lives in `packages/features` to be shared between Web and Desktop.

### 5. Pull Requests
- Keep PRs focused. One feature/fix per PR.
- Ensure all tests pass.
- Update documentation if necessary.
- Wait for a maintainer review.

---

## Need Help?
If you have questions about the architecture or how to get started, feel free to open a Discussion or ping us on the issue.

Let's build something amazing together!
