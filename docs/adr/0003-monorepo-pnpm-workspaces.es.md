# ADR 0003 — Monorepo pnpm workspaces + web en React

- **Estado:** Aceptada · 2026-04-08
- **Implementada en:** commit `698b432 feat(monorepo): pnpm workspaces + Vue→React web migration` (branch `claude/setup-react-web-app-LVWhi`)
- **Contexto de ola:** Wave 4.5 §16.6 (exit criterion "Web Vue pospuesto hasta migración a React") + desbloquea Ola 5 en ambos clientes

---

## Contexto

El repo original tenía dos apps disjuntas:

- `/desktop` — Electron + React 18 + TanStack Query, feature-complete para Wave 4.5 con 57 tests unitarios.
- `/web` — Vue 3 + Pinia + Vue Router, fork visual estancado del desktop con deriva creciente.

El ROADMAP.md explícitamente marcaba "Web Vue: pospuesto hasta migración a React" en §16.6, §16.12 y en los exit criteria de Ola 4.5. La razón: cada feature de Ola 5 (IA, semantic search, capture modal, items view) requería re-implementación manual en Vue, duplicando el trabajo de diseño, testing y revisión. Con Ola 5 arrancando, esa deuda se hacía crítica.

Además, el `tokens.css` del design system estaba duplicado entre los dos clientes, con riesgo de drift silencioso, y cada app traía su propio `pnpm-lock.yaml` — lo que hacía imposible compartir dependencias sin hacks.

## Requerimientos

1. **Reuso máximo entre desktop y web.** Pages, componentes, hooks de TanStack Query, fetch wrapper, auth helpers, design system, todo debe existir exactamente una vez en el repo.
2. **Desktop no puede romperse.** Los 57 tests unitarios y el build de electron-vite / electron-builder tienen que seguir verdes al terminar la migración.
3. **Web debe arrancar rápido.** Framework familiar (React), routing estándar (react-router-dom), state server via TanStack Query (el mismo que desktop).
4. **Diferencias real-time-only deben ser explícitas.** Desktop necesita `HashRouter` (por `file://`), `PasteInterceptor` global y safeStorage via IPC. Web necesita `BrowserRouter`, `AuthGuard` y OAuth callback. Todo lo demás es idéntico.
5. **Cero build step para packages internos.** No queremos un pipeline `tsup` o `rollup` para cada package interno — agrega latencia al dev loop y complica debugging.
6. **Backwards-compatible con el stack actual.** No introducir nuevos state managers ni UI libraries. La única dependencia nueva es pnpm workspaces.

---

## Opciones consideradas

### Opción A — Mantener dos apps disjuntas, portar Vue a React in-place

`/web` se reescribe desde cero a React, pero sigue siendo un proyecto independiente que copia componentes del desktop según se necesiten. Sin monorepo.

- ✅ Cambio mínimo estructural (no toca `/desktop`).
- ❌ El problema de fondo no se resuelve: cada feature nueva en desktop requiere una copia manual en web.
- ❌ El `tokens.css` sigue duplicado.
- ❌ Tests del design system viven solo en desktop.

### Opción B — Monorepo pnpm workspaces con `apps/` + `packages/`

Reestructurar a `apps/desktop`, `apps/web`, `packages/ui`, `packages/api-client`, `packages/features`. Los packages son **TypeScript source**, consumidos via alias (`@devdeck/ui` → `packages/ui/src/index.ts`). Ambas apps importan las mismas pages de `packages/features`.

- ✅ 100% reuso de código shared.
- ✅ Design system en un solo lugar (incluyendo `tailwind-preset.cjs` + `globals.css`).
- ✅ Dependencias hoisteadas via pnpm — un solo `pnpm-lock.yaml`.
- ✅ No hay build step: Vite resuelve los aliases direct a source.
- ⚠️ Requiere mover archivos (git rename diff grande) + rewriting imports.
- ⚠️ Desktop tests tienen que seguir verdes durante la migración.

### Opción C — Turborepo o Nx

Como Opción B pero con una capa adicional de orquestación (task caching, remote caching, dependency graph viz).

- ✅ Task caching (útil en CI).
- ❌ Una herramienta más que aprender y mantener.
- ❌ Nuestros packages no tienen build step — el principal beneficio de Turbo/Nx (cachear builds) no aplica.
- ❌ pnpm workspaces ya hace todo lo que necesitamos hoy.

---

## Decisión

**Opción B** — pnpm workspaces con `apps/desktop`, `apps/web` y tres packages internos. Sin Turbo/Nx (se puede agregar después si CI lo necesita).

### Estructura final

```
dev_deck/
├── apps/
│   ├── desktop/              # Electron + React (renderer)
│   └── web/                  # Vite + React + BrowserRouter
├── packages/
│   ├── ui/                   # Design system puro (sin fetch, sin hooks de dominio)
│   ├── api-client/           # Fetch wrapper + TanStack hooks + auth adapters
│   └── features/             # Pages + componentes de dominio
├── backend/                  # Go API (no se toca)
├── cli/ extension/ deploy/ docs/
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json              # scripts dev:desktop / dev:web / typecheck / test
```

### Dependency graph (estricto, acíclico)

```
apps/desktop ─┐
              ├──► @devdeck/features ──► @devdeck/ui ──► @devdeck/api-client
apps/web ─────┘
```

- `@devdeck/api-client` es la hoja. No depende de React UI. Solo `react` + `@tanstack/react-query` como peer deps.
- `@devdeck/ui` no depende de `@devdeck/features`.
- `@devdeck/features` depende de ambos y es lo que apps consumen para tener las 7 pages y los componentes de dominio.
- Apps solo agregan: shell de routing, AuthGuard (web), PasteInterceptor (desktop) y main.tsx con la configuración del api-client.

### Storage adapter pattern para auth

El desktop original tenía `lib/auth.ts` con un check runtime `if (isElectron) ... else ...`. Eso se reemplaza por:

```ts
// packages/api-client/src/auth/storage/types.ts
interface TokenStorage {
  getAccess(): string | null
  getRefresh(): string | null
  setTokens(access: string, refresh: string): void
  clear(): void
}

let current: TokenStorage = noopThrow
export function setTokenStorage(s: TokenStorage) { current = s }
```

Dos implementaciones: `localStorageAdapter` (web + tests) y `electronSafeStorageAdapter` (desktop via `window.electronAPI.store.*`). Cada app registra el adapter en `main.tsx` antes de montar React. Zero branching runtime.

### Config del api-client

Similar: en vez de leer `import.meta.env.VITE_API_URL` desde el fetch wrapper (lo cual acopla el package al bundler de cada app), se usa `configureApiClient({ baseUrl, authMode, staticToken })` llamado desde cada `main.tsx`. El package queda bundler-agnóstico.

```ts
// apps/desktop/src/renderer/src/main.tsx
configureApiClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  authMode: import.meta.env.VITE_AUTH_MODE || 'token',
  staticToken: import.meta.env.VITE_API_TOKEN,
})

// apps/web/src/main.tsx
configureApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',  // '' → Vite proxy
  authMode: 'jwt',
})
```

### Routing por app

Desktop (`apps/desktop/src/renderer/src/App.tsx`):
- `HashRouter` (obligatorio para `file://`)
- `<PasteInterceptor/>` montado globalmente
- Sin `AuthGuard` (desktop asume que está autenticado via `VITE_API_TOKEN` o safeStorage)

Web (`apps/web/src/App.tsx`):
- `BrowserRouter`
- `<AuthGuard>` envolviendo las rutas protegidas (`isLoggedIn() ? children : <Navigate to="/login">`)
- `/login`, `/auth/callback`, `/*` son rutas públicas nuevas específicas del web (LoginPage, AuthCallbackPage, NotFoundPage)
- Sin `PasteInterceptor` (es Electron-only por diseño)

Ambos shells duplican el pattern `AnimatedRoutes` + `<PageTransition>` porque son 12 líneas y la abstracción costaría más que el duplicado.

### Tailwind + globals.css compartidos

`packages/ui/tailwind-preset.cjs` exporta el `theme.extend` con la paleta neo-brutalist. Ambas apps lo consumen:

```ts
import preset from '@devdeck/ui/tailwind-preset'
export default {
  presets: [preset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/features/src/**/*.{ts,tsx}',
  ],
  plugins: [],
}
```

`packages/ui/styles/globals.css` es el único stylesheet. Cada app lo importa desde `main.tsx`:

```ts
import '@devdeck/ui/styles/globals.css'
```

---

## Consecuencias

### Positivas

- **100% reuso de pages y componentes.** Las 7 pages (`HomePage`, `ItemsPage`, `RepoDetailPage`, `DiscoveryPage`, `SettingsPage`, `CheatsheetsListPage`, `CheatsheetDetailPage`) viven una sola vez.
- **Ola 5 se implementa una sola vez.** Auto-tagging, semantic search, capture modal con IA — todas van a `@devdeck/api-client` y `@devdeck/features` y aparecen automáticamente en ambas apps.
- **67 tests pasando** post-migración (39 api-client + 5 ui + 18 features + 5 desktop), distribuidos en los packages correspondientes. La suite original de 57 tests desktop sobrevive intacta.
- **Side effect positivo:** se removieron 3.444 archivos de `web/node_modules/` que estaban erróneamente trackeados en HEAD.
- **Design system validado:** Tailwind content globs ahora cubren packages, así que no hay drift entre componentes "compilados" en desktop vs web — usan exactamente las mismas classes.
- **Dev loop rápido:** sin build step para packages, Vite HMR funciona directo sobre el source de `@devdeck/features`.

### Neutrales

- Rename diff enorme (~200 archivos movidos). Mitigado con `git mv` — `git log --follow` funciona.
- Cada app `package.json` debe declarar los peerDeps de los packages (react, framer-motion, etc.) porque pnpm resuelve peers desde el consumidor.

### Negativas / riesgos

- **Barrera de entrada más alta** para contributors que no conocen pnpm workspaces. Mitigado documentando en `CONTRIBUTING.md` las 3 reglas básicas (ui/api-client/features) y con scripts atajo `pnpm dev:desktop` y `pnpm dev:web`.
- **Tailwind `content` globs más largos** — si alguien olvida incluir `../../packages/features/src/**/*.{ts,tsx}`, algunas classes desaparecen del build. Mitigado usando el mismo pattern en ambas configs.
- **Pages con comportamiento desktop-only tienen que ser type-safe sin declarar tipo global.** `HomePage` usa `window.electronAPI` vía cast `(window as unknown as { electronAPI?: ... }).electronAPI` en vez de `electron.d.ts` global, para que `packages/features` no dependa de tipos Electron.
- **`SettingsPage` ya no puede leer `import.meta.env` directo.** Usa `getConfig()` del api-client, que es la única fuente de verdad para baseUrl/staticToken en ambas apps.

---

## Validación post-migración

```bash
pnpm typecheck        # ✓ 5 packages (api-client, ui, features, desktop, web)
pnpm test             # ✓ 67 tests (39 api-client + 5 ui + 18 features + 5 desktop)
pnpm -F @devdeck/desktop build   # ✓ electron-vite build (main + preload + renderer)
pnpm -F @devdeck/web build       # ✓ vite build (~991 kB ungzipped)
```

Manual smoke test:
- `pnpm -F @devdeck/desktop dev` → Electron window abre, 7 rutas funcionan, Cmd+K global search, paste interceptor.
- `pnpm -F @devdeck/web dev` → `http://localhost:5173/login` renderiza la brutalist card. OAuth flow llega a `/auth/callback` y redirige a `/`.

---

## Qué NO decidimos acá

- **OpenAPI codegen:** los tipos de dominio siguen siendo hand-written en `packages/api-client/src/features/*/types.ts`. Si backend empieza a churnear más rápido, se puede evaluar `openapi-typescript` en una ADR futura.
- **Turborepo / Nx:** no hay caching de tasks hoy. Si CI empieza a ser lento se puede agregar Turbo sin romper la estructura.
- **Publishing de packages:** son `private: true` y consumidos via workspace — no se publican a npm. Si eventualmente sale un SDK público, se puede extraer `@devdeck/api-client` a su propio repo.
- **Compartir componentes entre web y mobile nativo:** fuera de alcance. Si llega React Native, la estrategia es duplicar (react-native no comparte DOM components con web).

---

## Notas de implementación

- La migración entera se hizo en un solo commit (`698b432`) vs. la recomendación original de splittear por step. El razonamiento: cada step intermedio dejaba el repo en un estado inconsistente (tests rotos hasta terminar la cadena de codemods). Un único commit con `git log --follow` preserva historia por archivo y es fácil de revertir si algo rompe en producción.
- La branch de desarrollo es `claude/setup-react-web-app-LVWhi`. La intención es abrir PR hacia `main` cuando el usuario confirme.
- El test de `PasteInterceptor` requirió actualizar `apps/desktop/vitest.setup.ts` para llamar `configureApiClient()` + `setTokenStorage(localStorageAdapter)` antes de cada test (antes, el desktop leía `import.meta.env` en el top-level y los stubs del setup alcanzaban).
