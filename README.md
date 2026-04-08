# DevDeck.ai

> Tu knowledge OS para developers. Guarda todo lo útil. Encuéntralo cuando lo necesitás. Con IA que organiza, no que charla.

Una app **multiusuario, offline-first y multiplataforma** donde los developers guardan y redescubren todo lo que encuentran útil: repos recomendados, CLIs, plugins de IDE, atajos de macOS, comandos por proyecto, cheatsheets de stack, workflows y más. La IA clasifica, resume y hace todo buscable por intención.

Disponible como app de escritorio (Electron, Win/Mac/Linux) y web app en [`app.devdeck.ai`](https://app.devdeck.ai).

---

## Stack

- **Desktop:** Electron + React 18 + TypeScript + Tailwind + Framer Motion
- **Web:** Vue 3 + Vite + Pinia + Vue Router + TypeScript
- **Backend:** Go + Chi + pgx + sqlc
- **DB:** Postgres 16 (con `pg_trgm` para fuzzy search)
- **Deploy:** VPS propio · Docker Compose · Caddy (TLS automático)

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/PRD.md](docs/PRD.md) | Visión del producto, features, user stories, scope por olas |
| [docs/LANDING_COPY.md](docs/LANDING_COPY.md) | Copy de landing page para devdeck.ai (en español) |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, paleta, tipografía, componentes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama, stack, decisiones, schema DB |
| [docs/API.md](docs/API.md) | OpenAPI spec |

---

## Estado

🚀 **Olas 1–4 completas.** Desktop + web + auth + cheatsheets + comandos por repo.

Próximo: **Ola 5** — evolución a modelo `Item` (repos, CLIs, plugins, atajos, agentes…) + features de IA (auto-tagging, auto-summary, búsqueda semántica, items relacionados) + offline-first real + multiusuario abierto.

Roadmap completo en [ROADMAP.md](ROADMAP.md).
