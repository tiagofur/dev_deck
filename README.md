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
- **Web:** React 18 + Vite + React Router + TanStack Query (comparte 100% de pages y componentes con Desktop)
- **Backend:** Go + Chi + pgx + pgvector
- **DB:** Postgres 16 (con `pg_trgm` + `pgvector` para búsqueda fuzzy y semántica)
- **IA:** OpenAI API / Ollama (local)
- **Offline:** SQLite local (Electron) + sql.js/OPFS (Web)
- **Deploy:** VPS propio · Docker Compose · Caddy (TLS automático)
- **Dominio:** [devdeck.ai](https://devdeck.ai) · `app.devdeck.ai` · `api.devdeck.ai`

### Layout del repo (monorepo pnpm workspaces)

```
dev_deck/
├── apps/
│   ├── desktop/          # Electron app (React renderer)
│   └── web/              # Web app (React + BrowserRouter)
├── packages/
│   ├── ui/               # Design system: Button, TagChip, Toaster, tailwind-preset
│   ├── api-client/       # Fetch wrapper + TanStack Query hooks + auth adapters
│   └── features/         # Pages + componentes de dominio (compartidos entre apps)
├── backend/              # Go API
├── cli/                  # CLI `devdeck` (Go)
├── extension/            # Browser extension (Manifest v3)
├── deploy/               # Docker Compose + Caddy
└── docs/                 # Documentación
```

Ambas apps importan pages y componentes del package `@devdeck/features` — solo difieren en el shell (HashRouter + PasteInterceptor en desktop, BrowserRouter + AuthGuard en web). Ver [docs/adr/0003-monorepo-pnpm-workspaces.md](docs/adr/0003-monorepo-pnpm-workspaces.md).

---

## Screenshots

> 📸 _TODO: agregar GIFs/screenshots de Home, RepoDetail, Discovery y Cheatsheets. Parte de Fase 16.5._

---

## Documentación

### Producto y visión
| Doc | Contenido |
|-----|-----------|
| [docs/VISION.md](docs/VISION.md) | Visión, posicionamiento, diferenciadores |
| [docs/PRD.md](docs/PRD.md) | Producto, features, user stories, scope por olas |
| [docs/COMPETITIVE_ANALYSIS.md](docs/COMPETITIVE_ANALYSIS.md) | Análisis competitivo detallado |
| [docs/LANDING.md](docs/LANDING.md) · [docs/LANDING_COPY.md](docs/LANDING_COPY.md) | Copy de landing (ES / EN) |

### Arquitectura y decisiones
| Doc | Contenido |
|-----|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama, stack, schema DB |
| [docs/API.md](docs/API.md) | OpenAPI spec |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, paleta, tipografía |
| [docs/TECHNICAL_ROADMAP_AI_OFFLINE.md](docs/TECHNICAL_ROADMAP_AI_OFFLINE.md) | Roadmap técnico: offline, sync, IA |
| [docs/adr/0001-items-polymorphism.md](docs/adr/0001-items-polymorphism.md) | ADR: modelo polimórfico de items |
| [docs/adr/0002-sync-strategy.md](docs/adr/0002-sync-strategy.md) | ADR: estrategia de sync offline-first |
| [docs/adr/0003-monorepo-pnpm-workspaces.md](docs/adr/0003-monorepo-pnpm-workspaces.md) | ADR: monorepo pnpm workspaces + React en web |

### Operación y contribución
| Doc | Contenido |
|-----|-----------|
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Guía paso a paso para self-host |
| [docs/CAPTURE.md](docs/CAPTURE.md) | Spec de canales de captura (extensión, CLI, paste, share) |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Plan de tests y CI |
| [docs/REVIEW_2026_04.md](docs/REVIEW_2026_04.md) | **Review técnico de abril 2026** — motiva Ola 4.5 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Cómo contribuir |
| [SECURITY.md](SECURITY.md) | Política de seguridad |

---

## Estado

🚧 **Olas 1–4 completas.** **Ola 4.5 (Hardening & Capture) en curso** — red de seguridad (tests + CI) y canales de captura (CLI + extensión + paste). Ver [docs/REVIEW_2026_04.md](docs/REVIEW_2026_04.md) para el análisis que la motiva.

Próximo: Ola 5 (Items generales + IA) → Ola 6 (Offline-first + Sync + Multi-usuario).

Roadmap completo en [ROADMAP.md](ROADMAP.md).
