# DevDeck — Roadmap

> 🌐 [devdeck.ai](https://devdeck.ai) — Tu memoria externa para desarrollo, asistida por IA.

## Estado actual: Ola 4 completa ✅ (Fase 12-15 ✅, Fase 16 pendiente)

### Próximo: Ola 5 — Item types expandidos + Runbooks
### Siguiente: Ola 6 — IA real (auto-summary, auto-tags, búsqueda semántica)
### Futuro: Ola 7 — Multiusuario + Sync offline-first + Decks compartibles

---

## 🌊 Ola 1 — MVP Core ✅

### Fase 1 — Backend mínimo viable ✅
- Boot Chi + Postgres + migrations (`0001_init.sql`)
- `POST/GET/DELETE /api/repos` sin enricher
- Auth middleware con Bearer token estático
- Modelo de dominio: `internal/domain/repos/`
- Store con pgx v5: `internal/store/repos.go`

### Fase 2 — Enricher ✅
- GitHub REST API: stars, lang, avatar, description, topics, language_color
- Open Graph scraper para URLs no-github (`golang.org/x/net/html`, límite 1MB)
- `internal/enricher/`: github.go, generic.go, colors.go
- Cron diario: refresca repos con `last_fetched_at > 7d` (`internal/cron/refresher.go`)
- Endpoint `POST /api/repos/:id/refresh`

### Fase 3 — Electron shell + Lista ✅
- Electron + electron-vite + React 18 + TypeScript
- Design system neo-brutalist: tokens Tailwind (ink, bg-primary, accent-*, shadow-hard)
- API client con Bearer token (`lib/api-client.ts`, `lib/toast.ts`, `lib/confirm.ts`)
- `<RepoCard>`, `<RepoGrid>`, `<AddRepoModal>`
- Topbar con búsqueda, Sidebar con filtros (lang/tag)

### Fase 4 — Detail + edición ✅
- `RepoDetailPage` con notas markdown editables (`<NotesEditor>`)
- Tags CRUD inline (`<TagsEditor>`)
- Acciones: open browser, copy URL, copy git clone, share, archive, delete (`<ActionsBar>`)
- Singleton confirm dialog (`lib/confirm.ts`)

### Fase 5 — Personalidad ✅
- Mascota Snarkel: inline SVG axolotl, 5 mood states (idle/happy/sleeping/judging/celebrating)
- Frases en rioplatense por estado (`Mascot/messages.ts`)
- Bubble con tail CSS, framer-motion para entrada/salida
- Endpoint `GET /api/stats` con lógica de mood (streak, lang top, last_open_at)
- Modo descubrimiento: `DiscoveryPage.tsx`, `SwipeCard.tsx` con framer-motion drag
- Swipe left = archivar, right = "todavía sirve", up = abrir en browser

### Fase 6 — Deploy ✅
- `Dockerfile` multi-stage (golang:1.23-alpine → distroless/static, ~5MB)
- `deploy/docker-compose.yml`: db + api + caddy, dos networks (internal/web)
- `deploy/Caddyfile`: TLS automático con `{$DOMAIN}`, gzip, reverse proxy
- `electron-builder.yml`: NSIS (Win), DMG (Mac), AppImage (Linux)

### Fase 7 — Pulido MVP ✅
- Atajos globales: Cmd+N (add), `/` (focus search), `D` (discovery), `?` (shortcuts modal)
- `<Toaster>`: singleton subscribe, slide-in animation, bottom-left fixed
- `<ConfirmHost>`: AnimatePresence modal, ESC=cancel, Enter=confirm
- `<ShortcutsModal>`: chips `<kbd>` con backdrop cyan
- `<PageTransition>`: opacity+y wrapper por ruta
- `<SettingsPage>`: mascot toggle, API URL/token display, about
- `<EmptyState>`: ilustrado con Snarkel durmiendo

---

## 🌊 Ola 2 — Repo Detail + Comandos ✅

### Fase 8 — Repo detail + Commands tab ✅
- `migrations/0002_commands.sql`: tabla `repo_commands` con `position` para orden
- `internal/domain/commands/command.go`: Command struct, 8 categorías (install/dev/test/build/deploy/lint/db/other)
- `internal/store/commands.go`: CRUD + Reorder (transaccional, position auto-calc en SQL)
- `internal/enricher/readme.go`: GitHub Contents API → base64 decode → markdown string
- `internal/http/handlers/commands.go`: List/Create/Update/Delete/Reorder
- Endpoint `GET /api/repos/:id/readme`
- Endpoints `GET|POST /api/repos/:id/commands`, `PATCH|DELETE /api/repos/:id/commands/:cmdId`, `PUT /api/repos/:id/commands/reorder`
- `features/commands/types.ts + api.ts` con optimistic update en reorder (TanStack Query onMutate/onError rollback)
- `features/repos/api.ts` + `useReadme`
- `<CommandCard>`: drag handle, category chip colorizada, code block negro, copy/edit/delete
- `<CommandsList>`: dnd-kit SortableContext + PointerSensor (distance:4) + KeyboardSensor
- `<AddCommandModal>`: create/edit form, category picker
- `<ReadmeViewer>`: react-markdown + rehype-highlight + remark-gfm, sólo para source==='github'
- `globals.css` + `.hljs-*` syntax highlighting palette brutalist (sin importar tema externo)
- `RepoDetailPage` completo: Hero siempre visible, 3 tabs (Overview/README/Commands), sidebar sticky de acciones

---

## 🌊 Ola 2 — Pendiente

### Fase 9 — Importar scripts de package.json ✅
- Backend: `internal/enricher/package_scripts.go` — fetch `package.json` via GitHub Contents API, parsea `scripts`
- Backend: `GET /api/repos/:id/package-scripts` — retorna scripts como sugerencias importables
- Backend: `POST /api/repos/:id/commands/batch` — crea múltiples comandos en una sola transacción
- Backend: `store.BatchCreateCommands` — insert batch con positions auto-calculadas
- Frontend: `ImportScriptsModal` — modal neo-brutalist con checkboxes, preview de comando, selección masiva, categorización automática por nombre
- Frontend: `usePackageScripts` + `useBatchCreateCommands` hooks en TanStack Query
- Botón "Importar scripts" solo visible para repos `source === 'github'` en la tab Commands
- Categorización inteligente: `dev/start/serve` → dev, `test/spec` → test, `build/compile` → build, etc.

---

## 🌊 Ola 3 — Cheatsheets globales

### Fase 10 — Cheatsheets backend ✅
- `migrations/0003_cheatsheets.sql`: tablas `cheatsheets`, `cheatsheet_entries`, `repo_cheatsheet_links`
- CRUD endpoints: `GET|POST /api/cheatsheets`, `GET|PATCH|DELETE /api/cheatsheets/:id`
- CRUD entries: `GET|POST /api/cheatsheets/:id/entries`, `PATCH|DELETE /api/cheatsheets/:id/entries/:entryId`
- Linking: `POST|DELETE /api/repos/:id/cheatsheets/:cheatsheetId`, `GET /api/repos/:id/cheatsheets`
- Endpoint `GET /api/search` — búsqueda global cross-entity (repos + cheatsheets + entries) con ILIKE + similarity
- Seed loader: lee `seeds/cheatsheets/*.json` embebidos al boot si `SEED_CHEATSHEETS=true` (idempotente por slug)
- 10 cheatsheets seed: `git`, `docker`, `npm`, `pnpm`, `vim`, `tmux`, `ssh`, `kubectl`, `gh`, `make`
- `internal/domain/cheatsheets/cheatsheet.go`: domain types + seed types
- `internal/store/cheatsheets.go`: full CRUD + search + link/unlink + seed helpers
- `internal/http/handlers/cheatsheets.go`: all handlers + global search
- `internal/seed/loader.go`: idempotent JSON seed loader
- Config: `SEED_CHEATSHEETS` env var

### Fase 11 — Cheatsheets UI ✅
- `features/cheatsheets/types.ts` — tipos TS para Cheatsheet, Entry, SearchResult, inputs
- `features/cheatsheets/api.ts` — hooks TanStack Query: CRUD cheatsheets + entries, repo links, búsqueda global
- `CheatsheetsListPage.tsx` — sidebar de categorías, grid de cards con color/icono, filtrado por categoría
- `CheatsheetDetailPage.tsx` — entries con copy button, filtro por tag + search, inline editor (crear/editar/borrar), modal neo-brutalist
- `GlobalSearchModal.tsx` — modal de búsqueda global (Ctrl+K), resultados agrupados por tipo (repo/cheatsheet/entry), navegación directa
- Topbar actualizado: botón "Cheats" + botón "Search" (global search modal)
- App.tsx: rutas `/cheatsheets` y `/cheatsheets/:id`
- HomePage: shortcut Ctrl+K para búsqueda global

---

## 🌊 Ola 4 — Web client (Vue) + Auth real

### Fase 12 — Auth backend ✅
- `migrations/0004_auth_users_sessions.sql`: tablas `users` + `refresh_sessions`
- `internal/domain/auth/auth.go`: User, TokenPair, GitHubUser types
- `internal/authservice/jwt.go`: JWT access token generation/validation, refresh token hashing (SHA-256)
- `internal/store/auth.go`: UpsertUser, GetUserByGitHubID, CreateRefreshSession, GetRefreshSession, DeleteAllRefreshSessions
- `internal/http/handlers/auth.go`: GitHub OAuth login/callback/refresh/logout/me endpoints
- `internal/http/middleware/auth.go`: Dual mode — static token (Wave 1) + JWT with context injection
- `internal/config/config.go`: JWT_SECRET, GITHUB_CLIENT_ID/SECRET, OAUTH_REDIRECT_URL, ALLOWED_GITHUB_LOGINS
- `internal/http/router.go`: Auth routes under /api/auth/*, public OAuth endpoints, JWT-protected /me
- `cmd/api/main.go`: AuthService wiring, JWT mode initialization

### Fase 13 — Electron → JWT ✅
- `desktop/src/renderer/src/lib/auth.ts`: Token storage (localStorage), fragment parsing, token management
- `desktop/src/renderer/src/lib/api-client.ts`: Auto-refresh on 401, JWT mode support, concurrent refresh lock
- VITE_AUTH_MODE env var to switch between static token and JWT modes

### Fase 14 — Web client Vue skeleton ✅
- Proyecto `web/` con Vite + Vue 3 + TS + Tailwind
- Shared `tokens.css` (symlink/copia)
- Routing: `/login`, `/`, `/repo/:id`, `/cheatsheets`, `/cheatsheets/:id`, `/discovery`, `/auth/callback`
- Pinia stores: `auth`, `repos`, `cheatsheets`
- Auth flow OAuth completo (`AuthCallbackPage.vue`)
- `NotFoundPage.vue` catch-all 404
- `api.ts`: auto-refresh JWT 401, `searchGlobal` export
- Bugfixes: doble prefijo `/api`, `repos.repos` vs `repos.items`, tipos `Entry`/`Command` alineados con backend

### Fase 15 — Vue feature parity ✅
- Lista repos + filtros por tag/lang + buscador local
- `AddRepoModal` neo-brutalist + botón "+ Agregar" en topbar
- `store.addRepo` en repos store
- Repo detail: notas editables + tags editables inline (PATCH `/api/repos/:id`)
- Repo detail: comandos (label/command/category) + README preview
- Cheatsheets list con sidebar de categorías + grid de cards
- Cheatsheet detail: entries con copy button + filtro por tag/search
- Discovery mode: skip/keep flow
- Mascota Snarkel — componente Vue con 5 moods, bubble con transición, click-to-interact
- Deploy a `app.devdeck.tu-dominio.com` via Caddy (pendiente config)

### Fase 16 — Pulido cross-platform ⏳
- Verificación paridad Electron ↔ Web
- Atajos teclado en ambos (Ctrl+K, Ctrl+N, /, D, ?)
- E2E tests básicos (Playwright)

#### Auditoría completa realizada — pendientes conocidos
**Electron P1 — COMPLETADO:**
- `safeStorage` implementado: tokens encriptados via OS keychain en `<userData>/tokens.enc`
- `preload/index.ts` con contextBridge: `window.electronAPI.store.*` (sync IPC) + `onShortcut`
- OS-level global shortcuts: `Ctrl/Cmd+K` → search, `Ctrl/Cmd+N` → add (fire en background)
- `auth.ts` detecta Electron y delega a `window.electronAPI`, fallback a localStorage
- `electron.d.ts` con tipos para `window.electronAPI`
- JWT mode no activado por defecto (`VITE_AUTH_MODE=token` → static)

**Web Vue P1 — COMPLETADO:**
- `GlobalSearchModal.vue` — Ctrl+K, búsqueda cross-entity, resultados agrupados
- `ImportScriptsModal.vue` — selección múltiple, categorización automática, batch create
- `CommandsList.vue` — drag & drop nativo HTML5, reorder optimista
- `CommandCard.vue` — category color chips, copy/edit/delete actions
- `AddCommandModal.vue` — create/edit con category picker
- `CheatsheetDetailPage.vue` — entry CRUD inline completo
- `HomePage.vue` — atajos Ctrl+K, Ctrl+N, /, D + empty state
- Stores actualizados: `updateRepo`, `refreshRepo`, `reorderCommands`, `batchCreateCommands`

**Cross-platform P2:**
- Paginación en endpoints de lista (backend soporta `limit`/`offset`, frontends no la usan)
- Error toasts no integrados en operaciones de mutación (Vue)
- Empty state en HomePage cuando `filteredRepos.length === 0`

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Desktop | Electron + React 18 + TypeScript + electron-vite |
| Estilos | Tailwind CSS + CSS variables (neo-brutalist) |
| State/cache | TanStack Query v5 |
| Animaciones | framer-motion |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| Iconos | Lucide React |
| Backend | Go + Chi + pgx v5 |
| Base de datos | Postgres 16 + pg_trgm + pgvector (Ola 6) |
| Deploy | Docker Compose + Caddy (TLS automático) |
| Web (Ola 4) | Vue 3 + Vite + Pinia + Vue Router |
| IA (Ola 6) | OpenAI embeddings / Ollama (opt-in) + pgvector |

---

## 🌊 Ola 5 — Item types expandidos + Runbooks

### Visión
DevDeck deja de ser "directorio de repos" y pasa a ser **knowledge OS para devs**.
El modelo central evoluciona de `Repo` a `Item` con `item_type`.

### Fase 17 — Modelo de items genérico (backend)
- `migrations/0005_items.sql`: tabla `items` polimórfica con `item_type` enum
  - Tipos: `repo` / `cli` / `plugin` / `prompt` / `agent` / `shortcut` / `workflow` / `snippet` / `note` / `tool` / `article`
  - Campos comunes: `title`, `url`, `description`, `notes`, `tags`, `item_type`, `stack`, `use_case`, `why_saved`
  - Campos específicos: JSONB `meta` para datos tipo-específicos (stars, language, etc. para repos)
- Migración backward-compatible: repos existentes se migran a `items` con `item_type='repo'`
- CRUD endpoints genéricos: `GET|POST /api/items`, `GET|PATCH|DELETE /api/items/:id`
- Filtros: `?type=cli`, `?stack=go`, `?use_case=debugging`, `?q=...`
- Endpoint de quick capture: `POST /api/items/capture` — URL/texto → item con metadata básica (enrich async)
- Enricher genérico por tipo: GitHub (repos), scraper OG (tools/articles), sin enrich (shortcuts/prompts)

### Fase 18 — Item types UI (Electron + Vue)
- Cards adaptadas por tipo: icono por `item_type`, color de categoría
- Filtros top-level por tipo: Repos / CLIs / Plugins / Prompts / Shortcuts / Workflows / Notas
- Filtros por stack: Go / Node / Python / macOS / Docker / AI / etc.
- Filtros por use case: debugging / deploy / productivity / onboarding
- Quick capture modal: pegar URL o texto → guardar → IA completa en background
- Campo "¿Por qué lo guardé?" prominente en add/edit
- Empty state por tipo con call-to-action contextual

### Fase 19 — Runbooks
- `migrations/0006_runbooks.sql`: tabla `runbooks` con `item_id`, pasos ordenados (checklist)
- Cada paso: `label`, `command` (opcional), `description`, `position`, `checked` (local state)
- CRUD endpoints: `GET|POST /api/items/:id/runbooks`, `PATCH|DELETE /api/items/:id/runbooks/:runbookId`
- Reorder de pasos con drag & drop
- Templates por stack: Node, Go, Rails, Python, Docker
- Import desde README: detectar secciones "Getting started" / "Installation" → proponer pasos
- UI: tab "Runbook" en item detail, con checklist interactivo y modo "run mode"

### Fase 20 — Vistas de redescubrimiento expandidas
- "Forgotten gems": items con `last_seen_at > 30d` — vista dedicada
- "Recently saved": timeline de últimos N items guardados
- Discovery mode extendido a todos los tipos (no solo repos)
- "Por stack": landing de Go / Node / Python / etc. con items, cheatsheets y runbooks del stack
- Cross-linking: desde un item, ver items relacionados por tags/stack
- Mascota: nudges por tipo ("tenés 5 CLIs sin abrir hace meses")

---

## 🌊 Ola 6 — IA real que justifica `.ai`

### Visión
IA para **memoria, organización y recuperación** — no chatbot genérico.
Cada feature resuelve un dolor concreto de los devs.

### Fase 21 — Auto-summary y auto-tagging
- `migrations/0007_ai_metadata.sql`: columnas `ai_summary`, `ai_tags`, `ai_type_suggestion`, `embedding` (vector) en `items`
- Background job: al guardar un item, encola enrich IA
- Prompt para summary: "qué es, para qué sirve, cuándo usarlo, qué stack toca, alternativas"
- Prompt para tagging: tipo sugerido, stack, propósito, nivel (beginner/advanced), categorías
- UI: badge "IA" en campos auto-generados, con opción de editar o aceptar
- Config: `OPENAI_API_KEY` en settings (opt-in); sin key → feature deshabilitada con aviso claro
- Alternativa local: Ollama compatible (mismo endpoint OpenAI-compatible)
- Privacy notice: qué se envía (título + descripción + primeros 500 chars de README)

### Fase 22 — Búsqueda semántica
- `pgvector` extension en Postgres
- Embeddings generados al guardar/actualizar items (async, background)
- Búsqueda híbrida: `pg_trgm` (fuzzy text) + pgvector cosine similarity + fusión RRF
- Sin API key: búsqueda fuzzy clásica (comportamiento actual)
- Con API key: búsqueda semántica activada automáticamente
- UI: sin cambios para el usuario — misma barra de búsqueda; resultados mejoran
- Ejemplos funcionales: "herramientas para agents en terminal", "atajos de mac para moverme rápido", "debugging en Go"

### Fase 23 — Related items
- Al ver un item: panel "Items relacionados" con ≤ 5 sugerencias
- Basado en: tags compartidos + stack compartido + similitud semántica (si hay embeddings)
- Fallback sin IA: basado solo en tags y stack
- UI: sección al final del item detail, cards mini con tipo + título + tag principal
- "También guardaste": cheatsheets y runbooks relacionados

### Fase 24 — Content → Knowledge + Ask DevDeck
- **Content → Knowledge:**
  - Input: URL o texto pegado en modal
  - Output: resumen, tags sugeridos, tipo detectado, comandos extraídos, prerrequisitos
  - "Guardar como cheatsheet" / "Guardar como item" / "Guardar como runbook"
- **Ask DevDeck:**
  - Input: pregunta en lenguaje natural sobre tu base de conocimiento
  - Backend: retrieval sobre embeddings propios → context → LLM → respuesta citando tus items
  - Ejemplos: "¿qué tools tengo para agents?", "¿qué guardé para debugging en Go?", "¿tenía algo de Docker + pnpm?"
  - UI: modal dedicado (Cmd+Shift+K o botón en sidebar)
  - Restricción: solo responde sobre TU base de conocimiento (no sobre el mundo)
  - Empty state: "Guardá ≥ 20 items para activar Ask DevDeck"

---

## 🌊 Ola 7 — Multiusuario + Sync + Offline-first

### Visión
El mismo usuario en múltiples dispositivos. Luego, múltiples usuarios.
Offline-first garantizado. Decks compartibles.

### Fase 25 — Offline-first local (SQLite)
- SQLite local en Electron (mejor-lite o similar)
- Cola de cambios: operaciones se guardan locales primero, sync en background
- Conflict resolution: last-write-wins con `updated_at`
- Status sync en UI: indicador "syncing..." / "offline" / "up to date"
- Funciona sin conexión: lectura y escritura local; sync cuando vuelve internet

### Fase 26 — Multi-device sync
- `migrations/0008_sync.sql`: tabla `sync_log` con `device_id`, `entity_type`, `entity_id`, `action`, `payload`, `synced_at`
- Sync engine Go: pull changes desde servidor, push local changes
- Resolución de conflictos campo por campo (no solo last-write-wins)
- API: `GET /api/sync?since=<timestamp>`, `POST /api/sync/push`
- Desktop: background sync cada 30s cuando hay conexión
- Web: sync en mount + on focus

### Fase 27 — Multi-user real
- Allowlist expandida o abierta (configuración del owner)
- Cada user tiene su propio namespace de items
- Permisos: privado (default) / público (compartible)
- UI: perfil, settings de privacidad

### Fase 28 — Decks compartibles
- `Deck`: colección curada de items con título, descripción, color
- URL compartible: `devdeck.ai/deck/<slug>`
- Preview rico con Open Graph: og:image generado con card del deck
- Import deck: "Agregar todos a mi colección" o item por item
- Embed: snippet de código para embedir en README/blog
- Landing pública del deck (sin login requerido para ver)
