# DevDeck

> 🌐 [devdeck.ai](https://devdeck.ai) — Tu memoria externa para desarrollo, asistida por IA.

> **Tu knowledge OS para developers.** Guarda, organiza y redescubre herramientas, repos, comandos, cheatsheets, atajos, workflows y notas — con IA que te ayuda a recordar por qué las guardaste.

Una app multiplataforma (Electron + Vue web) con backend Go + Postgres, en estilo **neo-brutalist colorido**, con búsqueda semántica, auto-tagging por IA, modo descubrimiento tipo Tinder, y una mascota animada que te juzga gentilmente.

---

## ¿Qué problema resuelve?

- **Descubrir** repos, CLIs, plugins, atajos y herramientas útiles para devs
- **Volver a encontrarlos** cuando los necesitás (semanas o meses después)
- **Recordar el contexto**: "¿para qué servía este repo / CLI / atajo?"
- **Tener a mano** comandos, shortcuts y workflows por stack
- **Curar conocimiento disperso**: repos, cheatsheets, snippets, notas, prompts, agentes

> "Lo que guardás no se pierde. Lo que no recordabas que guardaste, DevDeck te lo recuerda."

---

## Items que podés guardar

| Tipo | Ejemplos |
|------|---------|
| **Repo** | GitHub repos de tools, libraries, boilerplates |
| **CLI** | `gh`, `jq`, `fzf`, `ripgrep`, `lazygit` |
| **Plugin / Extensión** | Plugins de VS Code, JetBrains, Neovim |
| **Skill / Prompt / Agente** | Prompts de AI coding, agents, MCP skills |
| **Cheatsheet** | Git, Docker, vim, tmux, kubectl… |
| **Shortcut** | Atajos de macOS, VS Code, iTerm |
| **Workflow** | Secuencias de comandos por stack o tarea |
| **Nota** | "Por qué elegimos X", gotchas, decision logs |
| **Snippet** | Scripts reutilizables, one-liners |
| **Tool / App** | Apps de productividad, dev tools de escritorio |

---

## Features de IA (`devdeck.ai`)

| Feature | Qué hace |
|---------|---------|
| **Auto-summary** | Genera automáticamente "qué es y para qué sirve" |
| **Auto-tagging** | Propone tipo, stack, propósito y nivel automáticamente |
| **Búsqueda semántica** | Encontrá items por intención, no solo por título exacto |
| **Related items** | Sugiere repos, comandos y cheatsheets relacionados |
| **Content → Knowledge** | Pegar URL/README → genera resumen, tags y comandos detectados |
| **Ask DevDeck** | Preguntale a tu propia base de conocimiento |

---

## Stack

- **Desktop:** Electron + React 18 + TypeScript + Tailwind + Framer Motion
- **Web:** Vue 3 + Vite + Pinia + Vue Router + TanStack Query
- **Backend:** Go + Chi + pgx + sqlc
- **DB:** Postgres 16 (con `pg_trgm` para fuzzy search + pgvector para búsqueda semántica)
- **Deploy:** VPS propio · Docker Compose · Caddy (TLS automático)
- **Dominio:** [devdeck.ai](https://devdeck.ai) · `app.devdeck.ai` · `api.devdeck.ai`

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/PRD.md](docs/PRD.md) | Producto, features, user stories, scope por olas |
| [docs/VISION.md](docs/VISION.md) | Visión de producto, posicionamiento, landscape competitivo |
| [docs/LANDING.md](docs/LANDING.md) | Copy para devdeck.ai (hero, features, CTAs) |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, paleta, tipografía, componentes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama, stack, decisiones, schema DB |
| [docs/API.md](docs/API.md) | OpenAPI spec |

---

## Estado

🚧 **Olas 1–4 completas.** Web client Vue + Auth GitHub OAuth operativo.

Próximo: **Ola 5** — tipos de items expandidos (CLI, Plugin, Shortcut, Workflow, Note, Prompt) + **Ola 6** — IA real (auto-summary, auto-tags, búsqueda semántica).

Roadmap completo → [ROADMAP.md](ROADMAP.md)
