# DevDeck — Estrategia de testing

> **Estado actual:** 0 tests. **Target Ola 4.5:** red de seguridad suficiente para refactorear con confianza.
>
> Este doc define qué testear, cómo, y con qué herramientas. Es input para las tareas de Ola 4.5.

---

## Filosofía

- **No test coverage teatro.** No perseguimos 90% de cobertura. Perseguimos **confianza al refactorear**.
- **Pocos tests, que cubran mucho.** Preferimos integration tests end-to-end de cada handler contra Postgres real a decenas de unit tests mockeados.
- **Fast feedback loop.** El suite completo debe correr en < 60s local y < 3 min en CI.
- **CI bloqueante.** Si los tests fallan, el merge está bloqueado. Sin excepciones.

---

## Pirámide (invertida levemente)

```
       ┌─────────────────┐
       │   E2E (5-10)    │  Playwright, flows críticos cross-stack
       ├─────────────────┤
       │  Integration    │  httptest + testcontainers-go, todos los handlers
       │   (30-50)       │
       ├─────────────────┤
       │   Unit (20-30)  │  lógica pura: enricher, authservice, parsers
       └─────────────────┘
```

---

## Backend — Go

### Stack
- `testing` (stdlib)
- `net/http/httptest` para server
- `github.com/testcontainers/testcontainers-go` + `postgres` module para DB real
- `github.com/stretchr/testify/require` para asserts
- `github.com/jackc/pgx/v5` ya está en prod, se reusa

### Setup
```go
// internal/testutil/postgres.go
func SetupPostgres(t *testing.T) (*pgxpool.Pool, func()) {
    ctx := context.Background()
    pgContainer, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("pgvector/pgvector:pg16"),
        postgres.WithDatabase("devdeck_test"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).WithStartupTimeout(30*time.Second)),
    )
    require.NoError(t, err)
    // run migrations
    // return pool + cleanup
}
```

Se comparte un contenedor por package (via `TestMain`) con truncate de tablas entre tests para velocidad.

### Qué testear (prioridad)

**P0 — handlers críticos (hoy mismo)**
- `repos`: Create, Get, List, Update, Delete, Refresh, MarkSeen, Readme.
- `commands`: CRUD, BatchCreate, Reorder.
- `cheatsheets`: CRUD de cheatsheets + entries + links.
- `search`: global search cross-entity, fuzzy matching.
- `auth`: GitHub OAuth callback (stub del token exchange), Refresh, Logout, Me.
- `stats` y `discovery/next`: casos happy path.

**P1 — store**
- Transacciones de `Reorder` commands (position auto-calc).
- Idempotencia de `BatchCreate`.
- Search con `pg_trgm`.
- Seed loader de cheatsheets (ejecutar dos veces, verificar no-duplicates).

**P2 — enricher**
- `github.go` con `httptest.Server` mockeando GitHub API.
- `generic.go` con HTML de ejemplo para Open Graph.
- `package_scripts.go` con package.json de ejemplo.
- **Tests de SSRF:** verificar que URLs a IPs privadas son rechazadas.

**P3 — authservice**
- Generación y validación de JWT.
- Expiración.
- Refresh token hashing + verificación.

### Target de cobertura
- `internal/http/handlers/`: **75%**
- `internal/store/`: **70%**
- `internal/enricher/`: **60%** (los tests de red mock son frágiles)
- `internal/authservice/`: **80%**

### Convenciones
- Archivo `*_test.go` al lado del código.
- Tests de tabla (`table-driven`) cuando aplica.
- `t.Parallel()` donde sea seguro.
- Nombres descriptivos: `TestCreateRepo_DuplicateURL_Returns409`.

---

## Frontend — Electron (React)

### Stack
- **Unit/component:** Vitest + `@testing-library/react`.
- **E2E:** Playwright con `electron.launch()`.

### Unit
- Components con estado: `AddRepoModal`, `CommandCard`, `NotesEditor`, `SwipeCard`.
- Hooks custom: `useRepos`, `useReadme`, `usePackageScripts`.
- Librerías internas: `api-client`, `toast`, `confirm`, `auth`.

Target: **50%** en `src/renderer/src/components/` y **70%** en `src/renderer/src/lib/`.

### E2E (Playwright)
Contra el binario buildeado + backend dockerizado con seeds.

**Flows críticos (P0):**
1. Launch → login (mock OAuth) → home con repos.
2. Cmd+N → agregar repo → aparece en grid.
3. Click repo → detail → editar notas → guardar → refresh → persistió.
4. Cmd+K → buscar "docker" → navegar al resultado.
5. Home → `D` → Discovery → swipe left → archivado.
6. Settings → toggle mascot → persistió.

---

## Frontend — Monorepo (post Wave 4.5 §16.13)

> **Cambio importante:** desde la migración a monorepo, los tests del frontend viven en los **packages compartidos**, no en las apps. Esto significa que los tests de `RepoCard`, `ItemCard`, `TagChip`, hooks de TanStack Query, fetch wrapper, etc. corren una sola vez y cubren tanto desktop como web.

### Distribución actual de tests (67 total)

| Package | Count | Tests |
|---------|-------|-------|
| `@devdeck/api-client` | 39 | `auth/auth.test.ts` (6), `format.test.ts` (3), `preferences.test.ts` (4), `features/capture/detect.test.ts` (26) |
| `@devdeck/ui` | 5 | `TagChip.test.tsx` |
| `@devdeck/features` | 18 | `RepoCard.test.tsx` (8), `ItemCard.test.tsx` (10) |
| `apps/desktop` | 5 | `PasteInterceptor.test.tsx` (Electron-only component) |
| **Total** | **67** | |

### Stack
- **Unit/component:** Vitest + `@testing-library/react` + `@testing-library/user-event`.
- **E2E (desktop):** Playwright contra Electron build, backend live + Postgres efímero en CI.
- **E2E (web):** todavía no existe una suite dedicada; hoy la cobertura del cliente web viene de `@devdeck/features`, `@devdeck/api-client`, `@devdeck/ui` y del build verificado en CI.

### Cómo correr tests

```bash
pnpm test                         # todos los packages (pnpm -r test)
pnpm -F @devdeck/api-client test  # solo api-client
pnpm -F @devdeck/ui test          # solo ui
pnpm -F @devdeck/features test    # solo features
pnpm -F @devdeck/desktop test     # solo desktop (PasteInterceptor)
pnpm -F @devdeck/desktop test:e2e # Playwright flows
```

### Dónde escribir tests nuevos

- **Hook TanStack Query / fetch wrapper / util puro / detector** → `packages/api-client/src/**/*.test.ts`
- **Primitivo del design system (Button, TagChip, EmptyState, etc.)** → `packages/ui/src/**/*.test.tsx`
- **Page o componente de dominio (RepoCard, ItemCard, CaptureModal, Topbar, Sidebar, Mascot, etc.)** → `packages/features/src/**/*.test.tsx`
- **Componente Electron-only (PasteInterceptor)** → `apps/desktop/src/renderer/src/**/*.test.tsx`

### Vitest setup

Cada package con tests tiene su propio `vitest.config.ts` + `vitest.setup.ts` (donde aplique). El setup de `apps/desktop/vitest.setup.ts` llama a `configureApiClient()` + `setTokenStorage(localStorageAdapter)` antes de cada test para que los hooks que usan `getConfig()` tengan valores válidos (ver ADR 0003).

### Target de cobertura

- `packages/api-client` → **≥ 75%** (es la capa de dominio crítica)
- `packages/features` → **≥ 60%** en componentes con lógica
- `packages/ui` → smoke tests de cada primitive, no coverage quota
- `apps/desktop` → 100% de los flows E2E + smoke de componentes Electron-only

---

## Matriz de tests E2E compartidos

| Flow | Electron (Playwright) | Web dedicado | Backend solo |
|------|-----------------------|--------------|--------------|
| Login OAuth/token | ✓ | — | ✓ |
| Add repo (URL) | ✓ | — | ✓ |
| Repo detail + notas | ✓ | — | – |
| Global search | ✓ | — | ✓ |
| Discovery swipe | ✓ | — | – |
| Commands CRUD + reorder | ✓ | — | ✓ |
| Cheatsheets | ✓ | — | ✓ |
| Batch import scripts | ✓ | — | ✓ |

**Estado real hoy:** no hay suite E2E web separada. Antes de agregarla conviene cerrar el gap del CLI P0 y las próximas features de producto para evitar duplicar mantenimiento de flujos todavía inestables.

---

## CI — GitHub Actions

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  backend:
    # backend/go vet/go test -race ./...
  cli:
    # cli/go test ./... + build ./cmd/devdeck + smoke --help
  monorepo:
    # pnpm install --frozen-lockfile
    # pnpm typecheck
    # pnpm test
    # pnpm build:web
    # pnpm build:desktop
  extension:
    # manifest validation + node --check + npm test
  e2e:
    # postgres service + backend live + Playwright contra apps/desktop
```

**Branch protection en `main`:**
- Requerir status checks: `backend`, `cli`, `monorepo`, `extension`, `e2e`.
- Requerir PR review de al menos 1 maintainer.
- No permitir force push.
- No permitir delete.

---

## Plan de ataque — Sprint de testing (10 días hábiles)

**Día 1–2:** Setup `testutil/postgres.go` + primer test de smoke en `handlers/repos_test.go` verde. Commit: "test: repos create/get/delete smoke".

**Día 3–4:** Todos los handlers de `repos` + `commands`. Cobertura ~60% en handlers.

**Día 5–6:** `cheatsheets` + `search` + `auth`. Cobertura 75% en handlers.

**Día 7:** Tests de `store` que quedan huérfanos. `enricher` con mocks.

**Día 8:** Setup Vitest en desktop y web. Primeros 10 component tests.

**Día 9:** Setup Playwright. Primeros 3 flows E2E (login, add, search).

**Día 10:** CI verde en GitHub Actions, branch protection aplicada, merge.

Al terminar: red de seguridad suficiente para atacar Ola 5 sin miedo.

---

## Qué NO testear

- CSS/estilos (visual regression es otra bestia; si importa, se agrega Percy o Chromatic en Ola 6+).
- Librerías de terceros.
- Código de infra (Dockerfile, Caddyfile) — se testea con un deploy manual periódico.
- Animations (framer-motion, transitions).
- Mascota Snarkel — es decorativa, los tests son frágiles y poco valiosos.
