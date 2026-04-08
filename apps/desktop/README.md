# DevDeck Desktop

Electron + React + TypeScript + Tailwind. Frontend de DevDeck en estilo neo-brutalist.

## Quick start

### 1. Asegurate de tener el backend corriendo

```bash
cd ../backend
make run
```

### 2. Configurar env

Creá `desktop/.env` (este archivo NO se commitea):

```env
VITE_API_URL=http://localhost:8080
VITE_API_TOKEN=el-mismo-API_TOKEN-del-backend
```

> ⚠️ El `VITE_API_TOKEN` tiene que ser **idéntico** al `API_TOKEN` que usaste en `backend/.env`. Wave 4 cambia esto a OAuth + JWT, pero por ahora es token estático.

### 3. Instalar dependencias

```bash
cd desktop
npm install
# o pnpm install — lo que prefieras
```

### 4. Correr en dev

```bash
npm run dev
```

Esto levanta:
- Vite dev server (renderer) en `http://localhost:5173`
- Electron main process apuntando al dev server
- DevTools abiertos en modo detached

### 5. Build de producción (cuando lo necesites)

```bash
npm run build
```

Output en `out/`. Más adelante (Fase 6) le agregamos `electron-builder` para empaquetar `.exe`.

## Estructura

```
desktop/
├── electron.vite.config.ts      # config unificada (main + renderer)
├── tailwind.config.ts            # design tokens neo-brutalist
├── postcss.config.js
├── tsconfig.json
├── src/
│   ├── main/
│   │   └── index.ts              # Electron main process
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx          # entry React
│           ├── App.tsx           # QueryClientProvider wrapper
│           ├── env.d.ts          # types de import.meta.env
│           ├── styles/
│           │   └── globals.css   # tailwind + tokens CSS + scrollbar
│           ├── lib/
│           │   ├── api-client.ts # fetch wrapper con bearer token
│           │   └── format.ts     # helpers (formatCount)
│           ├── features/repos/
│           │   ├── types.ts      # Repo, ListResult, inputs
│           │   └── api.ts        # hooks: useRepos, useAddRepo, etc.
│           ├── components/
│           │   ├── Button.tsx
│           │   ├── TagChip.tsx
│           │   ├── RepoCard.tsx
│           │   ├── RepoGrid.tsx
│           │   ├── AddRepoModal.tsx
│           │   ├── Topbar.tsx
│           │   ├── Sidebar.tsx
│           │   └── EmptyState.tsx
│           └── app/
│               └── HomePage.tsx  # composición principal
```

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl/Cmd + N` | Abrir modal "Agregar repo" |
| `Esc` | Cerrar modal |

## Notas de diseño

- **Tokens en `tailwind.config.ts`** — todos los colores, sombras y bordes del design system viven ahí. Si querés cambiar el palette, editás un solo archivo.
- **Border de 3px y `shadow-hard`** son la regla universal para componentes interactivos.
- **Hover** = lift `(-2px,-2px)` + `shadow-hard-lg`. **Active** = push `(2px,2px)` + `shadow-hard-sm`.
- **`<RepoCard>` rota -1° / 0° / +1°** según el id del repo. Determinístico, da personalidad sin que dos cards iguales se vean idénticas.
- **Fuentes via Google Fonts CDN** por simplicidad. Si querés offline, cambiamos a `@fontsource/*` después.

## Próximas fases

- **Fase 4:** repo detail page + edición de notas/tags + acciones (open browser, copy clone, share, archive)
- **Fase 5:** mascota animada + modo descubrimiento (Tinder de repos)
- **Fase 6:** electron-builder + deploy backend al VPS
