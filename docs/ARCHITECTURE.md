# DevDeck — Architecture

> Versión: 0.2 · Última actualización: 2026-04-07
>
> **Importante:** este doc cubre las 4 olas del producto. Las secciones marcadas
> con 🌊2/🌊3/🌊4 indican a qué ola corresponden. Ola 1 (MVP) excluye todo lo
> marcado con 🌊2+.

---

## 1. Vista de alto nivel

```
┌─────────────────────────────┐
│   Electron Desktop Client   │ ───┐
│   (React + TS)              │    │
└─────────────────────────────┘    │
                                   │  HTTPS
┌─────────────────────────────┐    │  Auth: Bearer token (Ola 1)
│   Vue 3 Web Client   🌊4    │ ───┤        JWT (Ola 4+)
│   (browser)                 │    │
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

### 2.0 Web Client (Vue 3)  🌊4

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| Framework | Vue 3 (Composition API) + TypeScript | UI |
| Build | Vite | Dev server, build prod |
| Estado | Pinia | Stores reactivos |
| Routing | Vue Router 4 | SPA navigation |
| HTTP | `@tanstack/vue-query` | Cache, mutations, retries |
| Estilos | Tailwind + tokens CSS compartidos | Mismo design system |
| Animaciones | `@vueuse/motion` o `motion-v` | Equivalente a Framer Motion |
| Markdown | `markdown-it` + `shiki` | Notas y READMEs con highlight |
| Iconos | `lucide-vue-next` | Mismos iconos que Electron |
| Auth flow | `pinia-plugin-persistedstate` | JWT en localStorage cifrado |

**Estructura `web/`:**
```
src/
  views/                 # routed pages
  components/            # presentational
  composables/           # use* hooks
  stores/                # pinia
  router/
  api/                   # axios/fetch wrapper
  styles/
    tokens.css           # ⚠️ symlink/copia desde shared/
  main.ts
```

**Compartido entre Electron y Web:**
- `shared/tokens.css` — design tokens (single source of truth)
- `shared/openapi.yaml` — contrato API → genera tipos TS para ambos
- NO se comparten componentes (a propósito — cada framework tiene su idiomática)

---

### 2.1 Desktop Client (Electron + React)

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| Main | Electron | Window, IPC, deeplinks `devdeck://`, secure token storage (`safeStorage`) |
| Preload | Electron | Bridge seguro entre main y renderer |
| Renderer | React 18 + TS | UI completa, routing, animaciones |
| Build | electron-vite | Dev server rápido, HMR, build de producción |

**Librerías clave:**
- `@tanstack/react-query` — fetching, cache, mutations, optimistic updates
- `zustand` — estado UI local (filtros, modal abierto, modo discovery)
- `react-router-dom` — `/`, `/repo/:id`, `/discovery`, `/settings`
- `tailwindcss` + CSS variables — design tokens
- `framer-motion` — animaciones de cards, swipes, mascota
- `lottie-react` o `@rive-app/react-canvas` — mascota
- `react-markdown` + `remark-gfm` — notas
- `lucide-react` — iconos

**Estructura `desktop/src/`:**
```
electron/
  main.ts
  preload.ts
src/
  app/
    routes.tsx
    App.tsx
  components/
    Button.tsx
    RepoCard.tsx
    RepoGrid.tsx
    AddRepoModal.tsx
    TagChip.tsx
    Toast.tsx
    EmptyState.tsx
    Mascot/
      Mascot.tsx
      moods.ts
    Discovery/
      DiscoveryDeck.tsx
      SwipeCard.tsx
  features/
    repos/
      api.ts          # query/mutation hooks
      types.ts
    discovery/
    mascot/
    stats/
  lib/
    api-client.ts     # axios/fetch wrapper con bearer token
    queryClient.ts
  styles/
    tokens.css
    globals.css
```

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
