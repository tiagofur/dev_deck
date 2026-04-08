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
        testcontainers.WithImage("postgres:16-alpine"),
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

## Frontend — Web (Vue)

### Stack
- **Unit/component:** Vitest + `@vue/test-utils`.
- **E2E:** Playwright contra `pnpm dev` + backend dockerizado.

### Unit
- Components: `AddRepoModal.vue`, `CommandCard.vue`, `GlobalSearchModal.vue`, `ImportScriptsModal.vue`.
- Stores Pinia: `auth`, `repos`, `cheatsheets`.
- `lib/api.ts` con fetch mockeado (MSW).

Target: **50%** en `src/components/` y **70%** en `src/stores/` y `src/lib/`.

### E2E
Los mismos 6 flujos que Electron, adaptados a browser.

---

## Matriz de tests E2E compartidos

| Flow | Electron | Web Vue | Backend solo |
|------|----------|---------|--------------|
| Login OAuth | ✓ | ✓ | ✓ |
| Add repo (URL) | ✓ | ✓ | ✓ |
| Repo detail + notas | ✓ | ✓ | – |
| Global search | ✓ | ✓ | ✓ |
| Discovery swipe | ✓ | ✓ | – |
| Commands CRUD + reorder | ✓ | ✓ | ✓ |
| Cheatsheets | ✓ | ✓ | ✓ |
| Batch import scripts | ✓ | ✓ | ✓ |

---

## CI — GitHub Actions

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.23' }
      - run: cd backend && go mod download
      - run: cd backend && go vet ./...
      - run: cd backend && go test -race -cover ./...
  desktop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: desktop/pnpm-lock.yaml }
      - run: cd desktop && pnpm install --frozen-lockfile
      - run: cd desktop && pnpm typecheck
      - run: cd desktop && pnpm test --run
      - run: cd desktop && pnpm build
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: web/pnpm-lock.yaml }
      - run: cd web && pnpm install --frozen-lockfile
      - run: cd web && pnpm typecheck
      - run: cd web && pnpm test --run
      - run: cd web && pnpm build
  e2e:
    runs-on: ubuntu-latest
    needs: [backend, web]
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: devdeck_test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      # boot backend, run playwright, teardown
```

**Branch protection en `main`:**
- Requerir status checks: `backend`, `desktop`, `web`, `e2e`.
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
