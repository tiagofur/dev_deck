# DevDeck.ai — Tu cinturón de utilidades Batman para programar mejor 🦇

> **Tu memoria externa asistida por IA para el trabajo de desarrollo.**
>
> Una app offline-first, multiplataforma donde guardar, organizar y redescubrir todo lo útil: repos, CLIs, plugins, tips, comandos, snippets, workflows, prompts. Con IA que clasifica automáticamente, resume, y te permite buscar por intención — no por nombre exacto que no recordás.

**Dominio**: [devdeck.ai](https://devdeck.ai)

---

## 🎯 El problema real

Todos los días encontrás herramientas útiles:
- Un CLI que te pasó un colega en Slack
- Un plugin de VS Code que te salvó la vida
- Un atajo de macOS que nunca terminaste de aprender
- Un repo que resolvía exactamente lo que estás haciendo ahora
- Un prompt de AI que funcionó brillantemente

**6 meses después**: Necesitás algo parecido. ¿Dónde estaba? ¿Cómo se llamaba? ¿En qué carpeta lo guardé? Googleás de cero algo que ya habías resuelto.

### Eso es lo que mata la productividad.

---

## 🦇 Cómo DevDeck te ayuda

### Captura en 2 segundos
```
cmd+K → Pegás la URL → DevDeck extrae metadata automáticamente
→ Le asignás a un deck ("Go tools", "DevOps", etc)
→ La IA agrega tags automáticamente
→ Listo. Tu item quedó indexado y organizado.
```

### Búsqueda inteligente
```
No acordás el nombre exacto?
"CLI para correr tasks en paralelo"
↓
DevDeck busca por INTENCIÓN, no por keywords
↓
Resulta: cobra, urfave/cli, goreleaser (los que realmente necesitás)
```

### Descubre lo que ya guardaste
```
Estás debuggeando goroutines
↓
DevDeck sugiere: "Tenés un tip sobre memory leaks aquí"
↓
Lo que olvidaste que guardaste aparece justo cuando lo necesitás
```

### Siempre disponible
```
Sin internet?
→ Desktop funciona 100% offline con SQLite local
→ Búsqueda local en < 100ms
→ Cambios se sincronizan cuando vuelve internet
```

---

## ✨ Que lo hace diferente

| DevDeck | GitHub Stars | Notion | Raindrop | Raycast |
|---------|--------------|--------|---------|---------|
| Captura TODO tipo de asset dev | Solo repos | Todo (no optimizado) | Genérico | Launcher |
| Auto-tagging con IA | ❌ | ❌ | ❌ | ❌ |
| Búsqueda semántica | ✅ | ❌ | ❌ | ❌ |
| Commands ejecutables | ✅ | ❌ | ❌ | ✅ |
| Offline completo | ✅ | ❌ | ❌ | ✅ |
| Tips por stack | ✅ | ❌ | ❌ | ❌ |
| Compartición social | ✅ | ❌ | ❌ | ❌ |
| Redescubrimiento activo | ✅ | ❌ | ❌ | ❌ |

---

## 🚀 Casos de uso reales

### Dev full-stack que cambia de stack cada 3 meses
```
Guardás todo en DevDeck: Go tools, Node tools, Docker tips, AWS patterns
→ Cuando pasás a un nuevo proyecto, tenés TODO listo en un deck
→ Busca semántica: "patrón de testing para Node" → encuentra exactamente
→ No pierdes tiempo googleando lo que ya sabés
```

### Developer de IA/LLMs que acumula prompts
```
Guardás tus mejores prompts, skills, agentes en DevDeck
→ Cada uno con comandos: "cómo ejecutarlo", "qué parametrizar"
→ Búsqueda inteligente: "dame un prompt para análisis de código"
→ Descubrís tus propios prompts que olvidaste que guardaste
→ Compartes decks con tu equipo de IA
```

### Platform engineer con stack complejo
```
Kubernetes, Docker, AWS, Terraform, Prometheus, etc
→ Guardás tips, troubleshooting, runbooks por tecnología
→ cmd+K mientras debuggeás Kubernetes → capture modal
→ Capturás el comando que solucionó el problema
→ La próxima vez que pase, está en tu deck
```

### Tech lead que cura conocimiento del equipo
```
Tenés decks públicos: "Onboarding Go", "Testing patterns", "DevOps essentials"
→ Compartes con el equipo
→ El equipo agrega comentarios, mejoras
→ DevDeck es el single source of truth para tu equipo
→ Trending sections muestran "lo que todos necesitamos saber"
```

---

## 🏗️ Stack técnico

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

### 🗺️ Roadmaps estratégicos (START HERE!)
| Doc | Contenido |
|-----|-----------|
| [docs/STRATEGIC_ROADMAP.md](docs/STRATEGIC_ROADMAP.md) | 5 Olas (Foundation → AI Assistant), métricas de éxito |
| [docs/ROADMAP_WEB.md](docs/ROADMAP_WEB.md) | Web (React): captura rápida → IA → compartición |
| [docs/ROADMAP_DESKTOP.md](docs/ROADMAP_DESKTOP.md) | Desktop (Tauri): MVP → hotkeys/launcher → offline |
| [docs/FEATURE_INVENTORY.md](docs/FEATURE_INVENTORY.md) | Catálogo de 50+ features planeadas por Ola |

### 🎯 Estrategia y diseño
| Doc | Contenido |
|-----|-----------|
| [docs/AI_STRATEGY.md](docs/AI_STRATEGY.md) | Cómo IA genera valor: auto-tagging, semantic search, discovery |
| [docs/UX_PATTERNS.md](docs/UX_PATTERNS.md) | Diseño consistente: componentes, flujos, accessibility |
| [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md) | Schema completo: Item, Deck, Tag, Command, Tip, Relation |

### 💡 Producto y visión
| Doc | Contenido |
|-----|-----------|
| [docs/VISION.md](docs/VISION.md) | Visión, posicionamiento, diferenciadores |
| [docs/PRD.md](docs/PRD.md) | Producto, features, user stories |
| [docs/COMPETITIVE_ANALYSIS.md](docs/COMPETITIVE_ANALYSIS.md) | Análisis competitivo |

### 🏛️ Arquitectura y decisiones
| Doc | Contenido |
|-----|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama, stack, schema DB |
| [docs/API.md](docs/API.md) | OpenAPI spec |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, paleta, tipografía |
| [docs/adr/](docs/adr/) | Architecture Decision Records |

### 🚀 Operación
| Doc | Contenido |
|-----|-----------|
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Guía self-host (Docker Compose) |
| [docs/CAPTURE.md](docs/CAPTURE.md) | Canales de captura (CLI, extensión, paste) |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Plan de tests y CI |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Cómo contribuir |
| [SECURITY.md](SECURITY.md) | Política de seguridad |

---

### Roadmap

Para entender a dónde vamos, ver:
- [docs/STRATEGIC_ROADMAP.md](docs/STRATEGIC_ROADMAP.md) — 5 Olas de desarrollo (Foundation → Intelligence → Collaboration → Offline → AI Assistant)
- [docs/ROADMAP_WEB.md](docs/ROADMAP_WEB.md) — Evolución del web client (React 18)
- [docs/ROADMAP_DESKTOP.md](docs/ROADMAP_DESKTOP.md) — Evolución del desktop (Tauri)
- [docs/FEATURE_INVENTORY.md](docs/FEATURE_INVENTORY.md) — Catálogo de 50+ features planeadas
