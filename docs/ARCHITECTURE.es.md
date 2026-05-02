# DevDeck — Architecture

> Versión: 0.3 · Última actualización: 2026-04-08
>
> **Importante:** este doc cubre las 4 olas del producto. Las secciones marcadas
> con 🌊2/🌊3/🌊4 indican a qué ola corresponden. Ola 1 (MVP) excluye todo lo
> marcado con 🌊2+.
>
> **Cambio en 0.3 (Wave 4.5 §16.13):** el repo es ahora un **monorepo pnpm workspaces**
> con `apps/desktop`, `apps/web` y tres packages compartidos (`@devdeck/ui`,
> `@devdeck/api-client`, `@devdeck/features`). El web client pasó de Vue 3 a
> React 18 para compartir pages y componentes con el desktop. Ver
> [adr/0003-monorepo-pnpm-workspaces.md](adr/0003-monorepo-pnpm-workspaces.md).

---

## 1. Vista de alto nivel

```
┌─────────────────────────────┐
│   Electron Desktop Client   │ ───┐
│   (React 18 + TS)           │    │
│   HashRouter +              │    │
│   PasteInterceptor          │    │
└─────────────────────────────┘    │
         │ both import:            │
         │  @devdeck/features      │  HTTPS
         │  @devdeck/ui            │  Auth: Bearer token (Ola 1)
         │  @devdeck/api-client    │        JWT (Ola 4+)
┌─────────────────────────────┐    │
│   Web Client  🌊4           │ ───┤
│   (React 18 + BrowserRouter │    │
│    + AuthGuard)             │    │
│   browser                   │    │
└─────────────────────────────┘    │
                                   ▼
                          ┌────────────────────┐
                          │   Go API Server    │
                          │   (Chi router)     │
                          │                    │
                          │  ┌──────────────┐  │
                          │  │ Handlers     │  │
                          │  │ Middleware   │  │
                          │  │ Auth         │  │
                          │  │ - token (1)  │  │
                          │  │ - JWT (4)    │  │
                          │  │ - GH OAuth(4)│  │
                          │  └──────┬───────┘  │
                          │         │          │
                          │  ┌──────▼───────┐  │
                          │  │ Domain       │  │
                          │  │ - repos      │  │
                          │  │ - enricher   │  │
                          │  │ - discovery  │  │
                          │  │ - commands🌊2│  │
                          │  │ - cheats  🌊3│  │
                          │  │ - auth    🌊4│  │
                          │  └──────┬───────┘  │
                          │         │          │
                          │  ┌──────▼───────┐  │
                          │  │ Store (sqlc) │  │
                          │  └──────┬───────┘  │
                          └─────────┼──────────┘
                                    │
                           ┌────────▼─────────┐
                           │  Postgres 16     │
                           │  + pg_trgm       │
                           └──────────────────┘

                  VPS (Hetzner / DO)
          Docker Compose: api + db + caddy
```

---

## 2. Componentes

### 2.0 Monorepo — pnpm workspaces  🌊4.5

Desde Wave 4.5 §16.13 el repo es un monorepo con la siguiente estructura:

```
dev_deck/
├── apps/
│   ├── desktop/              # Electron (React renderer)
│   └── web/                  # Vite + React
├── packages/
│   ├── ui/                   # Design system primitives + toast/confirm + tailwind-preset
│   ├── api-client/           # Fetch wrapper + TanStack Query hooks + auth adapters
│   └── features/             # Pages + componentes de dominio compartidos
├── backend/                  # Go API (no toca el monorepo JS)
├── cli/ extension/ deploy/
├── pnpm-workspace.yaml
├── tsconfig.base.json        # paths @devdeck/ui, @devdeck/api-client, @devdeck/features
└── package.json              # scripts dev:desktop, dev:web, typecheck, test
```

**Dependency graph (estricto, acíclico):**

```
apps/desktop ─┐
              ├──► @devdeck/features ──► @devdeck/ui ──► @devdeck/api-client
apps/web ─────┘
```

**Qué vive en cada package:**

- **`@devdeck/ui`** — primitivos del design system: `Button`, `TagChip`, `EmptyState`, `PageTransition`, `Toaster`, `ConfirmHost`. Incluye los singletons `toast` y `confirm` (pub-sub stores puros, sin fetch) y el `tailwind-preset.cjs` + `styles/globals.css`. **Zero imports a api-client o features.**

- **`@devdeck/api-client`** — fetch wrapper, TanStack Query hooks (`useRepos`, `useItems`, `useCommands`, `useCheatsheets`, `useCapture`, `useStats`), auth helpers (`getAccessToken`, `setTokens`, `parseTokensFromQuery`), utilidades (`formatCount`, `usePreferences`), adapters de storage (`TokenStorage` interface + `localStorageAdapter` + `electronSafeStorageAdapter`), y config runtime (`configureApiClient`). **No depende de React UI internos; solo `react` + `@tanstack/react-query` como peer.**

- **`@devdeck/features`** — las 7 pages (`HomePage`, `ItemsPage`, `RepoDetailPage`, `DiscoveryPage`, `SettingsPage`, `CheatsheetsListPage`, `CheatsheetDetailPage`) + componentes de dominio: `Topbar`, `Sidebar`, `RepoCard`, `RepoGrid`, `ItemCard`, `AddRepoModal`, `CaptureModal`, `GlobalSearchModal`, `ShortcutsModal`, `NotesEditor`, `TagsEditor`, `ReadmeViewer`, `ActionsBar`, `Commands/*`, `Discovery/SwipeCard`, `Mascot/*`. Importa de `@devdeck/ui` y `@devdeck/api-client`.

**Resolución de aliases:**

- TypeScript: `tsconfig.base.json` → `paths: { "@devdeck/ui": ["packages/ui/src/index.ts"], ... }`
- Vite/electron-vite: alias explícito en cada `{app}/vite.config.ts` apuntando a `packages/*/src/index.ts`
- Tailwind: cada app extiende `packages/ui/tailwind-preset.cjs` y declara `content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}', '../../packages/features/src/**/*.{ts,tsx}']`

**Zero build step** para los packages internos. Vite resuelve los aliases directo al source TypeScript.

---

### 2.1 Web Client (`apps/web`)  🌊4

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| Framework | React 18 + TypeScript | UI |
| Build | Vite | Dev server (`:5173`), build prod |
| Routing | `react-router-dom` v6 (`BrowserRouter`) | SPA navigation con deep links |
| HTTP / Estado servidor | `@tanstack/react-query` v5 (via `@devdeck/api-client`) | Cache, mutations, retries |
| Estado UI local | `useState` / `useReducer` | Modales, filtros, toggles |
| Estilos | Tailwind + `@devdeck/ui/styles/globals.css` | Design system compartido |
| Animaciones | `framer-motion` | PageTransition, SwipeCard, Mascot |
| Markdown | `react-markdown` + `rehype-highlight` + `rehype-raw` + `remark-gfm` | Via `ReadmeViewer` de `@devdeck/features` |
| Iconos | `lucide-react` | Mismos iconos que desktop |
| Auth storage | `localStorageAdapter` (inyectado via `setTokenStorage()`) | JWT en localStorage |
| Auth guard | `AuthGuard` wrapper — `isLoggedIn() ? children : <Navigate to="/login">` | Protección de rutas |

**Estructura `apps/web/`:**
```
src/
  main.tsx                 # configureApiClient + setTokenStorage + mount App
  App.tsx                  # BrowserRouter + AnimatedRoutes + AuthGuard
  pages/
    LoginPage.tsx          # brutalist card + "Sign in with GitHub"
    AuthCallbackPage.tsx   # parseTokensFromQuery/Fragment → navigate /
    NotFoundPage.tsx       # 404
  env.d.ts
index.html
vite.config.ts             # plugin react + aliases @devdeck/* + proxy /api → :8080
tailwind.config.ts         # extends @devdeck/ui preset
package.json               # name: @devdeck/web
```

**Rutas:**
- `/login` (público) — LoginPage
- `/auth/callback` (público) — AuthCallbackPage
- `/`, `/items`, `/repo/:id`, `/discovery`, `/settings`, `/cheatsheets`, `/cheatsheets/:id` (protegidas via `<AuthGuard>`) — las 7 pages de `@devdeck/features`
- `*` — NotFoundPage

**Nota importante:** todas las pages protegidas se importan de `@devdeck/features` — no hay versiones web de esas pages. La diferencia entre web y desktop es únicamente el shell (router type + guard + ausencia de PasteInterceptor).

---

### 2.2 Desktop Client (Electron + React, `apps/desktop`)

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| Main | Electron 32 | Window, IPC, deeplinks `devdeck://`, secure token storage (`safeStorage`), OS global shortcuts |
| Preload | Electron contextBridge | Expone `window.electronAPI.store.*` al renderer |
| Renderer | React 18 + TS | UI completa, routing via HashRouter, animaciones |
| Build | electron-vite + Vite | Dev server rápido, HMR, build de producción, Rollup output para main/preload/renderer |

**Librerías clave** (peers consumidos desde los packages):
- `@tanstack/react-query` v5 — fetching, cache, mutations (via `@devdeck/api-client`)
- `react-router-dom` v6 con `HashRouter` — obligatorio por `file://` en producción
- `framer-motion` — animaciones de cards, swipes, mascota, PageTransition
- `@dnd-kit/*` — drag & drop para reordenar comandos
- `react-markdown` + `rehype-highlight` + `rehype-raw` + `remark-gfm` — notas y READMEs
- `lucide-react` — iconos

**Estructura `apps/desktop/`:**
```
electron.vite.config.ts        # aliases @devdeck/*, plugin react, 3 build targets
electron-builder.yml           # packaging multi-plataforma (Win/Mac/Linux)
playwright.config.ts           # E2E flows
tailwind.config.ts             # extends @devdeck/ui preset
vitest.config.ts               # unit tests con aliases @devdeck/*
vitest.setup.ts                # configureApiClient + setTokenStorage(localStorageAdapter)
src/
  main/index.ts                # Electron main process (window, IPC, safeStorage, global shortcuts)
  preload/index.ts             # contextBridge exponiendo window.electronAPI.store.*
  renderer/
    index.html
    src/
      main.tsx                 # configureApiClient + setTokenStorage(electronSafeStorageAdapter) + mount App
      App.tsx                  # HashRouter + AnimatedRoutes + PasteInterceptor
      components/
        PasteInterceptor.tsx   # ⚠️ desktop-only: global paste listener + Cmd+Shift+V
        PasteInterceptor.test.tsx
      types/
        electron.d.ts          # window.electronAPI type
tests/
  e2e/                         # Playwright flows
```

**Qué es desktop-only** (vive en `apps/desktop`, NO en `@devdeck/features`):
- `PasteInterceptor.tsx` — usa listener global de `paste` + shortcut OS-level `Cmd/Ctrl+Shift+V`. Por diseño, este comportamiento no se expone en web.
- Main process + preload + electron-builder + Playwright.
- `main.tsx` adicionalmente registra el `electronSafeStorageAdapter` (via `window.electronAPI`) vs. `localStorageAdapter` en web.

**Todo lo demás** (las 7 pages, topbar, sidebar, modales, mascot, cards, etc.) vive en `@devdeck/features` y se importa en `App.tsx` directamente.

### 2.2 Backend (Go API)

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| HTTP | `go-chi/chi` v5 | Routing, middleware |
| Auth | middleware propio | Token estático (Ola 1) → JWT + GitHub OAuth (Ola 4) |
| Domain | paquetes propios | repos, enricher, discovery, commands 🌊2, cheatsheets 🌊3, auth 🌊4 |
| Store | `pgx` v5 + `sqlc` | Queries type-safe contra Postgres |
| Migrations | `pressly/goose` | Versionado de schema |
| Config | `caarlos0/env` | Env vars tipadas |
| Logging | `rs/zerolog` | Logs JSON estructurados |
| Cron | `robfig/cron` v3 | Refresh metadata diario |
| HTTP client | stdlib + retry | GitHub API + OG scraping |
| JWT 🌊4 | `golang-jwt/jwt` v5 | Access (30d) + refresh (90d) tokens |
| OAuth 🌊4 | `golang.org/x/oauth2` | GitHub OAuth flow |

**Estructura `backend/`:**
```
cmd/api/main.go
internal/
  config/         # env loading
  http/
    router.go
    middleware/
    handlers/
  domain/
    repos/        # entidad + service
    enricher/     # github + og strategies
    discovery/    # selección de "next card"
    commands/     # 🌊2 comandos por repo
    cheatsheets/  # 🌊3 cheatsheets globales
    auth/         # 🌊4 GitHub OAuth + JWT
  store/
    queries/      # .sql files de sqlc
    db.go         # generated
  pkg/
    httpx/        # retryable http client
migrations/
  0001_init.sql
  0002_commands.sql           # 🌊2
  0003_cheatsheets.sql        # 🌊3
  0004_auth_users_sessions.sql # 🌊4
seeds/
  cheatsheets/                # 🌊3 git.json, docker.json, npm.json...
sqlc.yaml
go.mod
Dockerfile
```

### 2.3 Database (Postgres 16)

Ver schema completo en sección 5 abajo.

**Extensiones:**
- `pg_trgm` — fuzzy search en nombre/descripción/tags
- `pgcrypto` — `gen_random_uuid()`

---

## 3. Flujo de datos: agregar un repo

```
User pega URL en AddRepoModal
        │
        ▼
[Renderer] useMutation(addRepo)
        │  POST /api/repos {url}
        ▼
[Go] AuthMiddleware verifica Bearer
        │
        ▼
[Go] handlers.CreateRepo
        │
        ▼
[Go] repos.Service.Create(url)
        │
        ├──► enricher.Resolve(url)
        │       │
        │       ├─ es github.com? ──► GitHub REST API
        │       │                     /repos/{owner}/{repo}
        │       │
        │       └─ otro? ──────────► fetch HTML + parse <meta og:*>
        │
        ▼
[Go] store.InsertRepo(enriched)
        │
        ▼
[PG] INSERT INTO repos ... RETURNING *
        │
        ▼
[Go] respond 201 + RepoDTO
        │
        ▼
[Renderer] React Query invalida cache "repos"
        │
        ▼
[UI] Card aparece en grid + Mascot → "celebrating"
```

---

## 4. Decisiones técnicas y tradeoffs

| Decisión | Por qué | Tradeoff aceptado |
|----------|---------|-------------------|
| **Backend cloud + cliente Electron** (no offline-first) | Arquitectura simple, abre puerta a multi-device sin reescribir | Requiere conexión; mitigamos con cache local de última lista |
| **Single-user con token estático** | Es MI app, no SaaS. Auth real es complejidad innecesaria | No multi-user; trivial agregar OAuth en v2 |
| **Postgres + sqlc** (no ORM) | Type-safety sin magia, queries explícitas, fácil de optimizar | Más boilerplate inicial vs Gorm |
| **Chi** sobre Gin/Echo | Idiomático, ligero, middleware claro estilo `net/http` | Menos batteries-included |
| **VPS propio + Caddy** | Control, costo fijo bajo, TLS automático | Yo opero la infra; aceptable |
| **Electron** sobre Tauri | Familiaridad React; ecosistema maduro | Bundle pesado (~80MB); aceptable porque es app personal |
| **GitHub API + OG scraping** (no headless browser) | Rápido, liviano, suficiente para 95% de casos | Sitios JS-only dan preview pobre; permitir editar manual |
| **pg_trgm** para search (no Elastic/Meili) | Una sola DB, suficiente para miles de repos | No ranking sofisticado; basta para volumen personal |
| **Mascota Lottie/Rive** | Animaciones complejas con poco código | Asset extra; vale la pena por personalidad |

---

## 5. Schema de base de datos

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE repos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT NOT NULL UNIQUE,
  source          TEXT NOT NULL CHECK (source IN ('github','generic')),
  owner           TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  language        TEXT,
  language_color  TEXT,
  stars           INT  DEFAULT 0,
  forks           INT  DEFAULT 0,
  avatar_url      TEXT,
  og_image_url    TEXT,
  homepage        TEXT,
  topics          TEXT[] DEFAULT '{}',
  notes           TEXT  DEFAULT '',
  tags            TEXT[] DEFAULT '{}',
  archived        BOOLEAN DEFAULT FALSE,
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ
);

CREATE INDEX idx_repos_search ON repos USING gin (
  (name || ' ' || COALESCE(description,'') || ' ' || COALESCE(array_to_string(tags,' '),''))
  gin_trgm_ops
);
CREATE INDEX idx_repos_lang     ON repos(language);
CREATE INDEX idx_repos_tags     ON repos USING gin(tags);
CREATE INDEX idx_repos_archived ON repos(archived);

CREATE TABLE app_state (
  k TEXT PRIMARY KEY,
  v JSONB NOT NULL
);
-- ej: ('last_open_at', '"2026-04-07T10:00:00Z"')
--     ('streak_count', '5')
--     ('mascot_mood',  '"happy"')
```

### 5.2 Schema 🌊2 — Comandos por repo

```sql
CREATE TABLE repo_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id     UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,           -- "Dev server"
  command     TEXT NOT NULL,           -- "pnpm dev"
  description TEXT DEFAULT '',
  category    TEXT,                    -- 'install'|'dev'|'test'|'build'|'deploy'|null
  position    INT  NOT NULL DEFAULT 0, -- para drag-and-drop sort
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_repo_commands_repo ON repo_commands(repo_id, position);
```

### 5.3 Schema 🌊3 — Cheatsheets globales

```sql
CREATE TABLE cheatsheets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,    -- 'git', 'docker', 'pnpm'
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,           -- 'vcs'|'os'|'language'|'framework'|'tool'|'package-manager'|'editor'
  icon        TEXT,                    -- nombre lucide o emoji
  color       TEXT,                    -- token del design system
  description TEXT DEFAULT '',
  is_seed     BOOLEAN DEFAULT FALSE,   -- true = pre-cargado por nosotros
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cheatsheet_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheatsheet_id  UUID NOT NULL REFERENCES cheatsheets(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,        -- "Rebase interactivo"
  command        TEXT NOT NULL,        -- "git rebase -i HEAD~N"
  description    TEXT DEFAULT '',      -- markdown
  tags           TEXT[] DEFAULT '{}',
  position       INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_entries_cheat ON cheatsheet_entries(cheatsheet_id, position);
CREATE INDEX idx_entries_search ON cheatsheet_entries USING gin (
  (label || ' ' || command || ' ' || COALESCE(description,'') || ' ' || COALESCE(array_to_string(tags,' '),''))
  gin_trgm_ops
);

-- Vínculo many-to-many: un repo puede linkear cheatsheets relevantes
CREATE TABLE repo_cheatsheet_links (
  repo_id        UUID REFERENCES repos(id)        ON DELETE CASCADE,
  cheatsheet_id  UUID REFERENCES cheatsheets(id)  ON DELETE CASCADE,
  PRIMARY KEY (repo_id, cheatsheet_id)
);
```

### 5.4 Schema 🌊4 — Auth (users + sessions)

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id       BIGINT NOT NULL UNIQUE,
  github_login    TEXT NOT NULL UNIQUE,
  avatar_url      TEXT,
  email           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

CREATE TABLE sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,         -- argon2id del refresh token
  user_agent         TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- En esta etapa, todos los `repos`, `cheatsheets`, etc. siguen siendo
-- single-tenant. NO agregamos `user_id` FK porque la allowlist garantiza
-- que solo hay 1 usuario. Si en el futuro abrimos a multi-user, hay
-- que migrar agregando user_id a las tablas.
```

### 5.5 Auth flow 🌊4 — GitHub OAuth

```
[Web/Electron]                  [Go API]                 [GitHub]
     │                             │                         │
     │  GET /api/auth/github/login │                         │
     ├────────────────────────────►│                         │
     │  302 → github.com/login...  │                         │
     │◄────────────────────────────┤                         │
     │                             │                         │
     │  user authoriza             │                         │
     ├──────────────────────────────────────────────────────►│
     │                             │                         │
     │  302 → /auth/github/callback?code=XYZ                 │
     │◄──────────────────────────────────────────────────────┤
     ├────────────────────────────►│                         │
     │                             │  POST /token (code)     │
     │                             ├────────────────────────►│
     │                             │  access_token           │
     │                             │◄────────────────────────┤
     │                             │  GET /user (token)      │
     │                             ├────────────────────────►│
     │                             │  user data              │
     │                             │◄────────────────────────┤
     │                             │                         │
     │                             │ check ALLOWLIST         │
     │                             │ ├ in → upsert user      │
     │                             │ │     emit JWT pair     │
     │                             │ └ out → 403             │
     │                             │                         │
     │  302 → app con tokens       │                         │
     │  (cookie httpOnly o frag)   │                         │
     │◄────────────────────────────┤                         │
```

**Electron specifics:** el callback usa el deeplink `devdeck://auth/callback?...` registrado en el OS. Electron Main captura, extrae los tokens, los guarda con `safeStorage` y notifica al renderer.

---

## 6. Configuración (env vars)

| Var | Descripción | Default |
|-----|-------------|---------|
| `PORT` | Puerto del API | `8080` |
| `DB_URL` | Conn string Postgres | required |
| `AUTH_MODE` | `token` (Ola 1) o `jwt` (Ola 4) | `token` |
| `API_TOKEN` | Bearer token único (modo `token`) | required en modo token |
| `GITHUB_TOKEN` | PAT para rate limit del enricher | optional |
| `LOG_LEVEL` | debug/info/warn/error | `info` |
| `CORS_ORIGINS` | CSV de origins permitidos | `app://.` |
| `REFRESH_INTERVAL_HOURS` | Cron metadata refresh | `168` (7d) |
| `OAUTH_GITHUB_CLIENT_ID` 🌊4 | OAuth App client ID | required en modo jwt |
| `OAUTH_GITHUB_CLIENT_SECRET` 🌊4 | OAuth App secret | required en modo jwt |
| `OAUTH_REDIRECT_URL` 🌊4 | Callback URL público | required en modo jwt |
| `JWT_SECRET` 🌊4 | HMAC secret para firmar JWT | required en modo jwt |
| `JWT_ACCESS_TTL` 🌊4 | TTL access token | `30d` |
| `JWT_REFRESH_TTL` 🌊4 | TTL refresh token | `90d` |
| `ALLOWED_GITHUB_LOGINS` 🌊4 | CSV de usernames permitidos | required en modo jwt |

Cliente Electron lee `API_BASE_URL` y `API_TOKEN` de un config encriptado con `safeStorage`.

---

## 7. Deploy (VPS)

`deploy/docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${PG_PASS}
      POSTGRES_DB: devdeck
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped

  api:
    image: ghcr.io/tfurt/devdeck-api:latest
    environment:
      DB_URL: postgres://postgres:${PG_PASS}@db:5432/devdeck?sslmode=disable
      API_TOKEN: ${API_TOKEN}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
    depends_on: [db]
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80","443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [api]
    restart: unless-stopped

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

`deploy/Caddyfile`:
```
api.devdeck.tu-dominio.com {
  reverse_proxy api:8080
  encode gzip
}
```

CI/CD: GitHub Action que en push a `main` → builda binario Go → push imagen a GHCR → SSH al VPS → `docker compose pull && docker compose up -d`.

---

## 8. Observabilidad mínima

- Logs JSON a stdout (capturados por Docker)
- Endpoint `/healthz` (simple OK)
- Endpoint `/metrics` (post-MVP, Prometheus)

---

## 9. Seguridad

- HTTPS obligatorio (Caddy + Let's Encrypt)
- Bearer token único, rotable cambiando env var
- Token en cliente guardado vía `electron.safeStorage` (DPAPI en Windows)
- Sin secrets en el repo: `.env.example` documenta las vars
- CORS restrictivo (`app://.` para Electron prod)
- Rate limit básico middleware (post-MVP si hace falta)

---

## 10. Roadmap técnico

Ver `cuddly-marinating-willow.md` (plan original) para roadmap incremental por fases.
