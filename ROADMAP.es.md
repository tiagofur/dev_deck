# DevDeck — Roadmap

> 🌐 [devdeck.ai](https://devdeck.ai) — Tu memoria externa para desarrollo, asistida por IA.
>
> 📝 **Actualizado 2026-04-08:** Ola 4.5 cerrada. Ola 5 arrancó — Fase 17 completa. Próximo: Fase 18 (Auto-tagging + Auto-summary IA).

## Estado actual: Ola 5 en curso — Fase 17 completa

### Ola 4.5 — cerrada
- ✅ §16.5 Higiene de repo (housekeeping, ADRs, docs, roadmap dedup)
- ✅ §16.6 Red de seguridad (tests + CI)
- ✅ §16.7 Observability (slog + /metrics)
- ✅ §16.8 SSRF guard + rate limiting
- ✅ §16.9 `POST /api/items/capture` con detección, dedupe y enrich async
- ⏳ §16.10 CLI `devdeck` (comandos P0 implementados; falta release 0.1.0)
- ⏳ §16.11 Extensión Chrome/Firefox (P0 listo; falta publicar)
- ✅ §16.12 Paste inteligente + CaptureModal en desktop
- ✅ §16.13 Monorepo pnpm workspaces + Web Vue → React (ver ADR 0003)

### Ola 5 — en curso
- ✅ Fase 17 — Modelo de items extendido + CRUD + ItemsPage
- ⏳ Fase 18 — Auto-tagging + Auto-summary (IA)
- 🔲 Fase 19 — Búsqueda semántica (pgvector)
- 🔲 Fase 20 — Items relacionados + "Ask DevDeck"

### Próximo: Fase 18 — Auto-tagging + Auto-summary (IA)
### Siguiente: Ola 6 — Offline-first + Sync + Multi-usuario

---

## 🌊 Ola 4.5 — Hardening & Capture (NUEVO)

> **Por qué existe esta ola:** la review de abril 2026 (ver `docs/REVIEW_2026_04.md`) identificó dos riesgos bloqueantes para Ola 5: (1) cero tests, (2) captura con fricción. Esta ola atiende ambos en ~4 semanas y deja la base lista para iterar rápido.

### Fase 16.5 — Higiene de repo ✅
- Remover `backend/api.exe` y agregar `*.exe`, `api`, `api.bin` a `.gitignore`. ✅
- Reconciliar duplicación de Ola 5/6 en este mismo ROADMAP (secciones `[DEPRECATED]` removidas). ✅
- Screenshots del README → **pendiente** (requiere capturas manuales, no bloquea CI).
- Crear `CONTRIBUTING.md`, `SECURITY.md`, `docs/SELF_HOSTING.md`. ✅
- Crear `docs/TESTING_STRATEGY.md` y `docs/CAPTURE.md`. ✅
- ADRs `0001-items-polymorphism.md` y `0002-sync-strategy.md` marcadas como **Aceptadas**. ✅

### Fase 16.6 — Red de seguridad (tests + CI) ✅
- Backend: `internal/testutil/postgres.go` con `testcontainers-go` + tests de handlers (repos/commands/cheatsheets/auth/search/stats) + authservice JWT. ✅
- Enricher: tests con `httptest.Server` mockeando GitHub + SSRF guard tests rechazando IPs privadas. ✅
- Desktop: Vitest + `@testing-library/react` con 57 tests unitarios (format, preferences, auth, RepoCard, TagChip, PasteInterceptor, detector). Playwright config + skeleton con los 5 flows. ✅
- Web Vue: intencionalmente sin tocar en Wave 4.5 inicial; **reemplazada por React 18 en §16.13** (ver abajo). Post-migración los 57 tests se redistribuyeron en los nuevos packages: 39 en `@devdeck/api-client`, 5 en `@devdeck/ui`, 18 en `@devdeck/features`, 5 en `apps/desktop` = **67 tests totales**. ✅
- GitHub Actions: workflow `ci.yml` con jobs `backend`, `cli`, `monorepo`, `extension` y `e2e`; el job `monorepo` valida `pnpm typecheck`, `pnpm test`, `pnpm build:web` y `pnpm build:desktop`. ✅
- Ver `docs/TESTING_STRATEGY.md` para el plan sprint-by-sprint.

### Fase 16.7 — Observability mínima ✅
- `slog` estructurado stdlib en backend (reemplaza zerolog en main, middleware, handlers, cron, seed). ✅
- Endpoint `/metrics` Prometheus con histogram de latencia por handler/método/status + contadores de errores 5xx + `devdeck_enrich_jobs_total` + `devdeck_capture_items_total`. ✅
- Tracing OTel — pospuesto (noop por default, se enchufa cuando haya collector).
- Logging específico de IA — Ola 6.

### Fase 16.8 — SSRF guard + rate limiting ✅
- `internal/enricher/ssrf.go`: blocklist RFC1918/RFC6598/RFC3927/loopback/link-local/multicast + IPv6 + AWS metadata. `validateScrapeURL` DNS lookup pre-fetch + `ssrfSafeTransport` valida en `DialContext` para cubrir DNS rebinding. ✅
- `internal/enricher/github.go`: regex `^[A-Za-z0-9._-]{1,100}$` valida owner/repo antes de cada llamada. ✅
- Middleware `httprate` global en `/api` (default 120 req/min por IP, `RATE_LIMIT_PER_MINUTE` + `RATE_LIMIT_DISABLED` overrides). ✅
- Rate limits por user autenticado → pospuesto, se agrega cuando JWT sea el default.

### Fase 16.9 — Endpoint unificado de captura ✅
- `POST /api/items/capture` con detección automática de tipo (9-rule matrix de `docs/CAPTURE.md`). ✅
- Migración `0005_items.sql` con tabla polimórfica `items` (ADR 0001) + `url_normalized` también en `repos` para dedupe cross-table. ✅
- Detección de duplicados por URL normalizada (strip tracking params, promote http→https, strip `www`/`.git`, sort query params, drop fragment). ✅
- Enriquecimiento encolado en `internal/jobs/` — worker en background con métricas de outcome. ✅
- Response incluye `duplicate_of` cuando aplica y `enrichment_status`. ✅
- Tests end-to-end con los 9 tipos de input + dedupe intra-tabla + dedupe cross-table contra `repos` legacy. ✅

### Fase 16.10 — CLI `devdeck` (P0) ⏳
- Nuevo subproyecto `cli/` en el repo (Go, `cobra`, binario único).
- Implementado hoy: `login`, `logout`, `config`, `add <url|text>`, `search <q>`, `list`, `open <id>`, `status`, `import github-stars`.
- `open <id>` en P0 abre la URL fuente del repo/item; no intenta deducir rutas internas del web app desde `api_url`.
- Token en OS keychain via `zalando/go-keyring`.
- Config en `~/.config/devdeck/config.toml`.
- SQLite local en `~/.local/share/devdeck/` para queue offline y cache. **Pendiente / no implementado todavía.**
- Distribución: `go install`, Homebrew tap, Scoop manifest. **Pendiente como parte del release 0.1.0.**
- Ver `docs/CAPTURE.md §Canal 2` para spec completa.

### Fase 16.11 — Extensión de browser (P0) ⏳
- Nuevo subproyecto `extension/` (manifest v3, Chrome + Firefox).
- P0: atajo `Cmd/Ctrl+Shift+D` captura tab activa → `POST /api/items/capture`.
- Popup React con preview, `why_saved` textarea, tags sugeridos, Save button.
- OAuth flow con redirect al popup, token en `chrome.storage.local`.
- Offline queue con reintentos.
- Configurable backend URL para self-hosters.
- Ver `docs/CAPTURE.md §Canal 1`.

### Fase 16.12 — Paste inteligente + importador GitHub Stars ✅
- Electron: `PasteInterceptor` global que escucha `paste` fuera de editable targets → toast flotante con preview + Save/Expand + 5s auto-dismiss. ✅
- Detección de tipo heurística client-side (`features/capture/detect.ts`) alineada con la del backend — matriz de tests gemela. ✅
- `CaptureModal` neo-brutalist con URL/text + type picker override + why_saved + tags. ✅
- Atajo `Cmd/Ctrl+Shift+V` abre el modal con clipboard prefill. ✅
- Web: cubierto en §16.13 con la migración a React (el `CaptureModal` ahora vive en `@devdeck/features` y lo consume tanto desktop como web sin duplicación).
- CLI: `devdeck import github-stars` — se hace junto con §16.10.

### Fase 16.13 — Monorepo pnpm workspaces + Web React ✅

> **Por qué existe:** con Ola 5 arrancando, cada feature de IA (auto-tagging, semantic search, capture IA) tenía que implementarse dos veces — una en desktop React y otra en web Vue. La deriva era insostenible. Esta fase unifica ambas apps en un monorepo pnpm workspaces donde las pages y componentes viven exactamente una vez.

- Estructura del repo: `apps/{desktop,web}` + `packages/{ui,api-client,features}`. ✅
- Web client **migrado de Vue 3 a React 18** reutilizando 100% de pages y componentes del desktop. ✅
- Tres packages compartidos:
  - `@devdeck/ui` — design system (Button, TagChip, EmptyState, PageTransition, Toaster, ConfirmHost, toast/confirm singletons, `tailwind-preset.cjs`, `globals.css`). ✅
  - `@devdeck/api-client` — fetch wrapper + TanStack Query hooks + auth con `TokenStorage` pluggable (`localStorageAdapter` para web, `electronSafeStorageAdapter` para desktop) + config runtime (`configureApiClient`). ✅
  - `@devdeck/features` — las 7 pages + todos los componentes de dominio (Topbar, Sidebar, RepoCard, ItemCard, Commands, Discovery, Mascot, modales). ✅
- Dependency graph estricto y acíclico: `apps → features → ui → api-client`. ✅
- Tailwind preset compartido; Vite aliases en ambas apps; tsconfig paths en `tsconfig.base.json`. ✅
- Refactors clave:
  - `api-client` ya no lee `import.meta.env.*` — usa `getConfig()` inyectado por cada app en `main.tsx` (bundler-agnóstico). ✅
  - `auth.ts` ya no hace branching `isElectron` runtime — inyección de `TokenStorage` vía `setTokenStorage()`. ✅
  - Pinia stores de Vue reemplazados por los hooks TanStack Query ya existentes en el desktop. ✅
- Pages web nuevas (Electron no las tiene): `LoginPage` (OAuth GitHub + token fallback), `AuthCallbackPage` (acepta `?token=&refresh_token=` o URL fragment), `NotFoundPage`, `AuthGuard`. ✅
- Desktop mantiene `HashRouter` + `PasteInterceptor` (Electron-only); web usa `BrowserRouter` + `AuthGuard`. ✅
- **Side effect:** se removieron 3.444 archivos de `web/node_modules/` erróneamente trackeados en HEAD.
- **Verificación:** `pnpm typecheck` ✅ · `pnpm test` 67 tests ✅ · `pnpm -F @devdeck/desktop build` ✅ · `pnpm -F @devdeck/web build` ✅
- Ver [docs/adr/0003-monorepo-pnpm-workspaces.md](docs/adr/0003-monorepo-pnpm-workspaces.md) para la decisión completa y [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §2.0/2.1/2.2 para la arquitectura actualizada.
- Commit: `698b432 feat(monorepo): pnpm workspaces + Vue→React web migration` en branch `claude/setup-react-web-app-LVWhi`.

### Criterio de salida de Ola 4.5
- [x] CI verde en cada push, bloqueante para merge (GitHub Actions `ci.yml` con `backend`, `cli`, `monorepo`, `extension` y `e2e`).
- [x] ≥ 60% cobertura en `backend/internal/http/handlers` y `backend/internal/store` (handler matrix + store tests con testcontainers).
- [x] ≥ 5 flows E2E pasando en Electron (Playwright skeleton con los 5 flows).
- [x] Endpoint `/api/items/capture` en producción con tests.
- [x] Web client migrado a React y compartiendo código con desktop (§16.13).
- [ ] CLI `devdeck` en release 0.1.0 con distribución mínima (`go install` + docs claras; Homebrew/Scoop opcionales si no entran en el primer corte).
- [ ] Extensión Chrome en Chrome Web Store (o sideload con instructions claras).
- [ ] README con screenshots (no bloquea CI, agendado para antes del release público).
- [x] `api.exe` fuera del repo.
- [x] ADRs 0001, 0002 y 0003 con decisión final ("Aceptadas").

**Solo después de cumplir estos criterios, arrancar Ola 5.**

---

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

## 🌊 Ola 4 — Web client (Vue, luego React) + Auth real

> **Nota histórica:** las fases 14 y 15 describen el skeleton Vue 3 original del web client. En Wave 4.5 §16.13 ese cliente fue **migrado completo a React 18** y restructurado a monorepo pnpm workspaces. La paridad de features se mantuvo via `@devdeck/features` (un solo codebase compartido con desktop). Ver `docs/adr/0003-monorepo-pnpm-workspaces.md`.

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

## 🌊 Ola 5 — Items generales + IA real

> **⚠️ NOTA DE RECONCILIACIÓN (2026-04-08):** existían dos versiones de Ola 5 y Ola 6 en este documento. La versión canónica es la que sigue ("Items generales + IA real" + "Offline-first + Sync"). La segunda descripción más abajo (marcada como `[DEPRECATED]`) se conserva temporalmente solo como referencia histórica — será removida cuando Ola 5 arranque.
>
> **Decisiones formalizadas antes de arrancar Ola 5:**
> - Modelo polimórfico de `items`: **Opción A (single-table + JSONB + generated columns)**. Ver `docs/adr/0001-items-polymorphism.md`.
> - Quick capture: endpoint `POST /api/items/capture` ya existe desde Ola 4.5. Ola 5 solo expande tipos soportados.
> - IA: Ollama como default, OpenAI opt-in. Rate limits obligatorios desde el primer endpoint (ver Fase 18).
> - Búsqueda híbrida: RRF (Reciprocal Rank Fusion), no ponderación lineal. Ver `docs/REVIEW_2026_04.md §3.2`.

> **Objetivo:** convertir DevDeck de directorio de repos a knowledge OS para developers. Justificar el `.ai` con features de IA que resuelven fricción real, no decorativas.

### Fase 17 — Modelo de items extendido ✅

- `migrations/0005_items.sql`: tabla polimórfica `items` con `item_type` (`repo`, `cli`, `plugin`, `shortcut`, `snippet`, `agent`, `prompt`, `article`, `tool`, `workflow`, `note`) + `url_normalized` en `repos` para dedupe cross-table. ✅
- `internal/domain/items/item.go`: domain types completos — `Item`, `Type`, `AllTypes`, `EnrichmentStatus`, `CaptureInput`, `CaptureResponse`, `ListParams`, `ListResult`, `UpdateInput`. ✅
- `internal/store/items.go`: `CreateItem`, `ListItems`, `GetItem`, `UpdateItem`, `DeleteItem`, `MarkItemSeen` con soporte completo de filtros (`type`, `tag`, `q`, `archived`, `sort`, `limit`, `offset`). ✅
- Campos: `why_saved`, `when_to_use`, `ai_summary`, `ai_tags` — todos presentes. `embedding` (vector) queda para Fase 19. ✅
- `POST /api/items/capture` — hereda de §16.9; detecta tipo automáticamente. ✅
- `GET /api/items`, `GET /api/items/:id`, `PATCH /api/items/:id`, `DELETE /api/items/:id`, `POST /api/items/:id/seen`. ✅
- Frontend (`@devdeck/features`): `ItemsPage` con grid por tipo + filtros de tipo + search + empty state; `ItemCard` adaptada por tipo; `CaptureModal` con `why_saved` + type override. Funciona en desktop y web sin duplicación. ✅

### Fase 18 — Auto-tagging + Auto-summary (IA) 🚧

**Estado actual (MVP implementado):**
- `internal/ai/`: módulo de IA con interfaces `Classifier` + `Summarizer` + providers `heuristic` y `disabled`. ✅
- `internal/config/config.go`: `AI_PROVIDER` soporta `heuristic`/`local` y `disabled`. ✅
- Pipeline de enriquecimiento: al guardar un item, la queue existente procesa metadata + auto-tags + summary en background sin bloquear capture/save. ✅
- Persistencia: `ai_summary` + `ai_tags` ya se guardan en `items`; `GET /api/items` también los aprovecha en búsqueda textual. ✅
- Frontend mínimo: `ItemCard` muestra estado `Analizando…`, prioriza `ai_summary` sobre `description` y usa `ai_tags` cuando no hay tags manuales. ✅

**Pendiente para cerrar la fase como "IA real":**
- `internal/ai/openai.go`: implementación con OpenAI (GPT-4o-mini). ⏳
- `internal/ai/ollama.go`: implementación con Ollama local. ⏳
- Endpoints `POST /api/items/:id/ai-enrich` y `PATCH /api/items/:id/ai-tags` para refresh/review manual. ⏳
- UI de review de tags sugeridos (aceptar/editar/descartar) y surface de detalle para items no-repo. ⏳

### Fase 19 — Búsqueda semántica

- `migrations/0006_embeddings.sql`: columna `embedding vector(1536)` en `items`; extensión `pgvector`
- `internal/ai/embeddings.go`: generación de embeddings (OpenAI text-embedding-3-small o Ollama nomic-embed-text)
- `internal/store/search.go`: búsqueda vectorial con `<=>` (cosine distance) + fallback a pg_trgm existente
- Búsqueda híbrida: combina score vectorial + score textual; rank final ponderado
- Endpoint `GET /api/search?q=...&mode=semantic|text|hybrid` — query param para elegir modo
- Frontend: búsqueda semántica activada en `GlobalSearchModal` con toggle; resultados muestran score de relevancia

### Fase 20 — Items relacionados + "Ask DevDeck"

- `internal/ai/related.go`: dado un item, buscar los K más similares por embedding (K=5 por default)
- Endpoint `GET /api/items/:id/related` — devuelve items relacionados con score
- Frontend: sidebar "También te puede interesar" en `ItemDetailPage` con cards mini
- `internal/ai/ask.go`: RAG simple — búsqueda semántica sobre vault del usuario + respuesta con contexto
- Endpoint `POST /api/ask` — body `{question: string}` → `{answer: string, sources: Item[]}`
- Frontend: panel "Ask DevDeck" en sidebar; contexto claro: "Basado en tu vault, encontré…"
- Vistas por intención en `HomePage`: "AI Tools", "Terminal stuff", "Mac shortcuts", "Go setup", "Olvidados (sin abrir en 3 meses)"

---

## 🌊 Ola 6 — Offline-first + Sync + Multi-usuario

> **Objetivo:** hacer que DevDeck funcione sin red y se sincronice entre devices; habilitar sharing y multi-usuario real.

### Fase 21 — Offline-first con SQLite local

- **Electron:** SQLite local via `better-sqlite3` o `sql.js`; DB en `userData/devdeck.db`
- **Web (PWA):** `sql.js` con persistencia en Origin Private File System (OPFS)
- `src/local-db/schema.sql`: schema local (subset del schema backend)
- `src/local-db/migrations.ts`: migraciones locales versionadas
- `src/sync/queue.ts`: cola de cambios locales con `operation` (`create`|`update`|`delete`), `entity`, `payload`, `created_at`, `synced_at`
- Toda operación CRUD escribe local primero, luego encola para sync
- `src/sync/engine.ts`: loop de sync — al conectar, drena la cola → POST `/api/sync/batch`; al reconectar, re-intenta fallidos
- Backend: `POST /api/sync/batch` — acepta array de operaciones; procesa idempotentemente (con `client_id` + `operation_id`)
- UI: indicador de estado en topbar: `🟢 Sincronizado` / `🟡 X cambios pendientes` / `🔴 Sin conexión`

### Fase 22 — Multi-device + Resolución de conflictos

- Schema: `items.updated_at` (timestamp), `items.version` (integer auto-increment en server)
- Sync pull: `GET /api/sync/delta?since=<timestamp>` — devuelve cambios del servidor desde timestamp
- Resolución de conflictos: last-write-wins por campo usando `updated_at`; en colisión real (mismo campo, mismo timestamp), notifica al usuario con UI de merge simple
- `migrations/0007_sync.sql`: tabla `sync_log` para auditoría de operaciones sync
- Multi-device: cada cliente tiene un `client_id` (UUID) generado al instalar; el backend trackea qué cliente generó cada operación
- Backend: `GET /api/me/devices` — lista dispositivos activos del usuario
- Frontend: Settings > Dispositivos — lista con "último sync", botón "desconectar dispositivo"

### Fase 23 — Decks compartibles

- `migrations/0008_decks.sql`: tabla `decks` (`id`, `user_id`, `slug`, `title`, `description`, `is_public`, `created_at`)
- Tabla `deck_items` (`deck_id`, `item_id`, `position`, `added_at`)
- CRUD endpoints: `GET|POST /api/decks`, `GET|PATCH|DELETE /api/decks/:id`
- Endpoint `GET /api/decks/:slug/public` — público, sin auth; devuelve deck + items (metadata pública solamente)
- Endpoint `POST /api/decks/:id/import` — importa items de un deck público al vault del usuario autenticado
- Open Graph: `GET /deck/:slug` en landing (devdeck.ai) con meta tags `og:title`, `og:description`, `og:image` (preview del deck)
- Frontend app: UI de "Crear deck", selector de items, toggle público/privado, copy link button
- Frontend landing (devdeck.ai): página `devdeck.ai/deck/:slug` — preview del deck con lista de items + CTA "Importar a mi DevDeck"

### Fase 24 — Perfil público + Multi-usuario completo

- `GET /api/users/:username/public` — perfil público: nombre, bio, decks públicos
- Landing: `devdeck.ai/@username` — página de perfil con decks públicos del usuario
- Auth: ampliar allowlist de usuarios (pasar de 1 username a N usernames en `ALLOWED_GITHUB_LOGINS`)
- Admin: `GET /api/admin/users` — listar usuarios (solo para el owner); gestión de permisos
- Rate limiting por usuario para endpoints de IA (proteger contra abuso de costos)
- Billing foundation: campo `plan` en `users` (`free`|`pro`); límites por plan (ej: items guardados, embeddings/mes)

## Ola 7 — Colaboración y Extensiones Avanzadas

### Fase 25 — Runbooks y Contexto Operacional

- `migrations/0023_runbooks.sql`: tablas `runbooks` y `runbook_steps` asociados a items
- Checklist state: soporte para `is_completed` persistente y sincronizado
- UI: sistema de pestañas en `ItemDetailPage` para alternar entre Notas y Runbooks
- Sync: integración de nuevas entidades en el Sync Engine offline-first

### Fase 26 — Consolidación de Base de Datos

- `migrations/0024_consolidate_repos_to_items.sql`: migración de la tabla legacy `repos` a la tabla polimórfica `items`
- Unificación de relaciones: `repo_commands` -> `item_commands`, `repo_cheatsheet_links` -> `item_cheatsheet_links`
- Refactor del Store: eliminación de lógica duplicada y uso extensivo de JSONB para metadata específica

### Fase 27 — Sistema de Invitaciones y Waitlist

- `migrations/0025_invites.sql`: tablas `invites` y `waitlist`
- Registro controlado: soporte para `REQUIRE_INVITE=true` en registro local y OAuth
- Admin: endpoints para generación de códigos beta y visualización de lista de espera

### Fase 28 — Extensión de Navegador v2

- Migración de `extension/` (Vanilla JS) a `apps/extension` (React + Vite + TS)
- Reuso de `@devdeck/api-client` y `@devdeck/ui` para paridad funcional total
- Persistencia local: integración de `sqlocal` (SQLite/OPFS) en el worker de la extensión

### Fase 29 — Landing Page v2 y Publicación

- Página de inicio renovada en `apps/web`: Hero brutalista, feature grid y CTAs claros
- Documentación técnica finalizada para el lanzamiento de Ola 7
- Preparación de assets para publicación en tiendas (Chrome Web Store, Microsoft Store)

## Ola 8 — Excelencia Operacional y Ejecución

### Fase 30 — Dashboard de Administración y Ejecución

- UI: Panel de administración para gestión de usuarios, waitlist e invitaciones
- Desktop: Puente IPC en Electron para ejecución de comandos locales desde Runbooks
- Seguridad: Auditoría de comandos ejecutados y visualización previa obligatoria
- Analytics: Panel básico de métricas de uso (items guardados, búsquedas, IA)

### Fase 31 — Sugerencias de Copiloto (IA Proactiva)

- Extension: Inyección de widget (Shadow DOM) para detectar items ya guardados al navegar
- UX: Notificaciones instantáneas en el browser ("Ya tenés este repo en tu vault")
- Backend: Endpoint `/api/items/check` optimizado para verificaciones rápidas por URL

### Fase 32 — Notificaciones y Digest Semanal

- UI: Centro de notificaciones in-app (campanita) con estados de lectura
- Backend: Job de Cron semanal para generar resúmenes de actividad con IA
- Engagement: Notificaciones de sistema para hitos de enriquecimiento y aprobación de waitlist

## Ola 9 — Colaboración en Equipos (Teams)

### Fase 33 — Soporte para Equipos y Roles Avanzados

- Database: Soporte para organizaciones (`orgs`) y pertenencia de miembros
- Sharing: Vaults compartidos entre miembros del mismo equipo
- Permisos: Roles granulares (Viewer, Editor, Owner) y control de acceso a decks privados
- Admin: Gestión de facturación por equipo (Pro for Teams)

### Fase 34 — Edición Colaborativa en Tiempo Real (CRDTs)

- Realtime: Integración de Yjs para edición concurrente de notas y runbooks
- Backend: Implementación de servidor WebSocket en Go para sincronización de estados compartidos
- UX: Indicadores de presencia ("X está editando...") y cursores remotos

### Fase 35 — Actividad de Equipo y Feed en Tiempo Real

- Team Feed: Registro de cambios recientes en el vault del equipo
- Notifications: Notificaciones push para menciones (@username) en notas compartidas
- Audit Log: Historial de cambios por miembro para administradores de equipo

## Ola 10 — Automatización y Plugins de Terceros

### Fase 38 — Plugin Marketplace e Integraciones

- UI: Galería de descubrimiento de integraciones con "One-click install"
- Backend: Catálogo estático de templates curados (NPM, YouTube, Slack)
- DX: Soporte para instalación simplificada de enriquecedores custom

## Ola 11 — Soporte Offline Nativo y Mobile Bridge

### Fase 39 — PWA Avanzada y Mobile Discovery

- PWA: Configuración completa de Service Workers para acceso 100% offline a la Web App
- Mobile: Implementación de "Share Target" en Android/iOS para capturar links desde otras apps
- UX: Adaptación brutalista para pantallas móviles (Responsive design 2.0)

### Fase 40 — Mobile Bridge (React Native / Capacitor)

- Bridge: Wrapper nativo para acceder a archivos locales y base de datos persistente en el celular
- Sync: Optimización de la cola de sincronización para conexiones móviles inestables
- Push: Integración nativa de notificaciones para el centro de alertas

## Ola 12 — Colaboración Social y Curación Pública

### Fase 41 — Conexión entre Usuarios (Following)

- Social: Implementación de sistema de "Seguir" (Follow/Following) entre perfiles públicos
- Feed: Muro de actividad global con los items más recientes guardados por los curadores que seguís
- Notificaciones: Alertas cuando alguien que seguís publica un nuevo Deck

### Fase 42 — Descubrimiento Comunitario y Rankings

- Discover: Feed global con los items más guardados de la semana (Trending)
- Gamification: Sistema de puntos por contribución y medallas de "Experto en X" (ej: Rust Master)
- Leaderboard: Ranking de curadores más seguidos y Decks más starreados

## Ola 13 — Despliegue Global y Escalabilidad (Edge Computing)

### Fase 43 — Réplicas de Lectura y Caching en el Edge

- Infra: Configuración de réplicas de lectura de PostgreSQL para reducir latencia global
- Cache: Implementación de capa de caching distribuida (Redis/Dragonfly) para perfiles públicos y trending feeds
- Edge: Despliegue de funciones Edge para el renderizado inicial de Decks públicos (SEO dinámico)

### Fase 44 — Autenticación Multi-región y Sincronización Global

- Auth: Migración a sistema de identidad multi-región para sesiones ultra-rápidas
- Sync: Sincronización de bases de datos distribuidas (Postgres Bidireccional) para equipos globales
- Monitoring: Panel de observabilidad global (métricas por región, latencia p99)

---

## Stack actualizado

| Capa | Tecnología |
|------|-----------|
| Monorepo | pnpm workspaces (`apps/{desktop,web}` + `packages/{ui,api-client,features}`) desde Wave 4.5 §16.13 |
| Desktop | Electron 32 + React 18 + TypeScript + electron-vite + HashRouter |
| Web | Vite + React 18 + TypeScript + react-router-dom (BrowserRouter) + AuthGuard (§16.13 — reemplaza el Vue 3 + Pinia original) |
| Estilos | Tailwind CSS + CSS variables (neo-brutalist) — preset compartido en `@devdeck/ui/tailwind-preset.cjs` |
| State/cache | TanStack Query v5 (hooks en `@devdeck/api-client`) |
| IA actual | Heurística local async (`AI_PROVIDER=heuristic`) sobre la queue de enrichment existente |
| Animaciones | framer-motion |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Markdown | react-markdown + remark-gfm + rehype-highlight + rehype-raw |
| Iconos | Lucide React |
| Backend | Go + Chi + pgx v5 |
| Base de datos | Postgres 16 + pg_trgm + pgvector (Ola 6) |
| Deploy | Docker Compose + Caddy (TLS automático) |
| IA (Ola 6) | OpenAI embeddings / Ollama (opt-in) + pgvector |

<!-- Las olas canónicas son las definidas arriba (Ola 5 "Items generales +
     IA real" y Ola 6 "Offline-first + Sync + Multi-usuario"). Las
     secciones duplicadas de una edición anterior se removieron en Wave
     4.5 §16.5. Ver git history si necesitás ver la versión histórica. -->
