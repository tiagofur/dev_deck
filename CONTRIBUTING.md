# Contribuir a DevDeck

Gracias por querer ayudar. DevDeck es un proyecto indie con visión fuerte, así que te pido que leas esto antes de abrir un PR.

## Antes de empezar

1. Leé `docs/VISION.md` y `docs/PRD.md`. Si tu propuesta no encaja, probablemente te digamos que no. Mejor ahorrarte el tiempo.
2. Para features nuevas: abrí un **issue de discusión** primero. No envíes PRs grandes sin ack previo.
3. Para bugs: abrí un issue con repro pasos, versión, OS, stack trace si aplica.

## Setup local

### Backend
```bash
cd backend
cp .env.example .env
# editar DATABASE_URL, GITHUB_* si vas a testear auth
docker compose -f ../deploy/docker-compose.dev.yml up -d db
go run ./cmd/api
```

### Desktop (Electron)
```bash
cd desktop
pnpm install
pnpm dev
```

### Web (Vue)
```bash
cd web
pnpm install
pnpm dev
```

## Estilo de código

### Go
- `gofmt` + `goimports`. El CI falla si el diff no está formateado.
- `go vet ./...` limpio.
- Packages por dominio, no por capa. Ya está así, seguí el patrón.
- Errors: `fmt.Errorf("contexto: %w", err)`. Nada de `errors.New` sin wrap cuando hay un error previo.
- Tests al lado del código (`foo_test.go`).

### TypeScript
- ESLint + Prettier (configs en cada app). `pnpm lint` limpio.
- `strict: true` en `tsconfig.json`.
- Components funcionales, hooks. Nada de class components nuevos.
- Imports absolutos via `@/` donde esté configurado.

### Vue
- Composition API + `<script setup>`. Nada de Options API nueva.
- Pinia para state. Nada de Vuex.

### CSS / Tailwind
- Tokens del design system (`tokens.css`) antes que classes custom.
- No agregues nuevos colores sin discutir en `docs/DESIGN_SYSTEM.md`.

## Tests

**Ningún PR se mergea sin tests cuando aplica.** Ver `docs/TESTING_STRATEGY.md`.

- Bug fix → test que reproduce el bug antes de arreglarlo.
- Feature nueva → tests de happy path + 1 edge case mínimo.
- Refactor → si los tests existentes siguen verdes, es suficiente. Si no hay tests, escribilos antes del refactor.

## Commits

- **Conventional commits:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`.
- Scope opcional: `feat(backend): agregar endpoint /api/items/capture`.
- Imperativo, presente: "agregar X", no "agregado X".
- Primera línea ≤ 72 chars. Body si hace falta explicar el "por qué".

Ejemplo:
```
feat(backend): detectar duplicados en POST /api/items/capture

Normaliza la URL entrante (lowercase scheme+host, sin trailing slash,
sin fragmentos) y busca match en items del user. Si existe, devuelve
200 con `duplicate_of` en lugar de crear uno nuevo.

Closes #123
```

## Pull Requests

- Branch desde `main`, nombre descriptivo: `feat/capture-endpoint`, `fix/reorder-race`.
- Un PR = una cosa. Si estás tocando backend + frontend para una misma feature, ok, pero no mezcles features distintas.
- Descripción del PR debe tener:
  - **Qué** cambia.
  - **Por qué** (link al issue).
  - **Cómo probarlo** (pasos manuales si aplica).
  - Screenshots si hay UI.
- CI verde antes de pedir review.
- Un approval de maintainer mínimo para mergear.
- Squash merge por default.

## Reviews

Si revisás un PR ajeno:
- Sé directo pero amable. Criticá el código, no a la persona.
- Sugerí alternativas concretas, no "esto está mal".
- Usá `nit:` para cosas menores.
- Un `LGTM` sin comentarios está ok si no ves nada que arreglar.

## Preguntas que nadie hace pero importan

**¿Puedo agregar una dependencia nueva?**
Sí, pero justificala en el PR. "Para hacer X necesitamos Y; evaluamos Z y W; elegimos Y porque...". Nada de `npm install algo-random` sin contexto.

**¿Puedo cambiar el design system?**
No sin discusión previa en un issue. El look & feel es parte de la identidad del producto.

**¿Puedo traducir la app a otro idioma?**
Aún no hay i18n setup. Si querés agregarla, es una feature grande — abrí issue primero.

**¿Puedo vender/fork-ear/usar comercialmente?**
Ver `LICENSE` (cuando exista). Hasta entonces, asumí que es "all rights reserved" y preguntá.

## Código de conducta

Sé respetuoso. Si tenés un problema con otro contributor, hablá con un maintainer en privado. No hacemos drama en public.
