# DevDeck.ai

> **Tu memoria externa asistida por IA para el trabajo de desarrollo.**

Una app **offline-first, multi-usuario y multiplataforma** donde guardar, organizar y redescubrir todo lo útil que un dev encuentra: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agentes, prompts y workflows. Con IA que clasifica, resume y recupera por intención — no por tag exacto.

Dominio: **[devdeck.ai](https://devdeck.ai)**

---

## ¿Por qué DevDeck?

El problema real no es "guardar repos". Es no poder volver a encontrar lo que ya descubriste: una CLI útil que te pasaron en un chat, un plugin de IDE que no recordás cómo se llamaba, un atajo de macOS que tardaste horas en aprender, un repo que resolvía exactamente tu problema actual.

DevDeck es tu **colección curada de conocimiento dev** — con IA que hace que todo lo que guardás sea encontrable semanas después, aunque no recuerdes cómo lo llamaste.

---

## Stack

- **Desktop:** Electron + React 18 + TypeScript + Tailwind + Framer Motion
- **Web:** Vue 3 + Vite + Pinia + Vue Router
- **Backend:** Go + Chi + pgx + pgvector
- **DB:** Postgres 16 (con `pg_trgm` + `pgvector` para búsqueda fuzzy y semántica)
- **IA:** OpenAI API / Ollama (local)
- **Offline:** SQLite local (Electron) + sql.js/OPFS (Web)
- **Deploy:** VPS propio · Docker Compose · Caddy (TLS automático)
- **Dominio:** [devdeck.ai](https://devdeck.ai) · `app.devdeck.ai` · `api.devdeck.ai`

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/PRD.md](docs/PRD.md) | Producto, features, user stories, scope por olas, constraints y decisiones |
| [docs/VISION.md](docs/VISION.md) | Visión de producto, posicionamiento, diferenciadores y roadmap de posicionamiento |
| [docs/COMPETITIVE_ANALYSIS.md](docs/COMPETITIVE_ANALYSIS.md) | Análisis competitivo detallado (GitHub Stars, Raindrop, Notion, Pieces, etc.) |
| [docs/LANDING_COPY.md](docs/LANDING_COPY.md) | Copy de landing page **en inglés** (audiencia global) |
| [docs/LANDING.md](docs/LANDING.md) | Copy de landing page **en español** (audiencia hispanohablante) |
| [docs/TECHNICAL_ROADMAP_AI_OFFLINE.md](docs/TECHNICAL_ROADMAP_AI_OFFLINE.md) | Roadmap técnico detallado: offline-first, sync, multi-usuario, IA |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, paleta, tipografía, componentes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama, stack, decisiones, schema DB |
| [docs/API.md](docs/API.md) | OpenAPI spec |

---

## Estado

🚧 **Olas 1–4 completas.** Próximo: Ola 5 (Items generales + IA) y Ola 6 (Offline-first + Sync + Multi-usuario).

Roadmap completo en [ROADMAP.md](ROADMAP.md).
