# DevDeck — Estrategia de captura sin fricción

> **Tesis:** si agregar algo a DevDeck toma más de 3 segundos, el usuario no lo va a usar. La calidad de la captura define el éxito del producto.
>
> Este doc especifica los 4 canales de captura prioritarios y cómo se integran con el backend existente.

---

## Principios

1. **3 segundos o menos** desde que el user decide "esto lo quiero guardar" hasta que está guardado.
2. **Enriquecimiento asíncrono:** el save devuelve 200 inmediatamente con metadata mínima; la IA completa en background.
3. **Multi-canal simétrico:** los 4 canales (app, extensión, CLI, share target) golpean el mismo endpoint unificado.
4. **Fail-safe:** si falla el backend, la captura queda en cola local y se reintenta. Nunca se pierde un save.
5. **Zero-config:** cualquier URL o bloque de texto debería ser capturable sin que el user elija el tipo.

---

## Endpoint unificado

### `POST /api/items/capture`
Entrada polimórfica, detección de tipo automática en el servidor.

**Request**
```json
{
  "source": "browser-extension" | "cli" | "web-paste" | "share-target" | "manual",
  "client_id": "uuid",
  "operation_id": "uuid",
  "url": "https://github.com/...",          // opcional
  "text": "brew install ripgrep",            // opcional
  "selection": "texto seleccionado por el user en la página",  // opcional
  "title_hint": "GitHub - foo/bar",          // opcional, de window.title o meta OG
  "type_hint": "cli",                         // opcional, fuerza el tipo si el user lo sabe
  "tags": ["terminal", "productivity"],      // opcional
  "why_saved": "para búsqueda rápida en ripgrep",  // opcional
  "meta_hints": {                             // opcional, datos que el canal ya tiene
    "og_image": "https://...",
    "github_stars": 42000
  }
}
```

**Response**
```json
{
  "item": { "id": "...", "item_type": "cli", "title": "ripgrep", ... },
  "enrichment_status": "queued",
  "duplicate_of": null
}
```

**Detección de tipo (server-side, en orden):**
1. Si `type_hint` → usar ese.
2. Si `url` matchea `github.com/<owner>/<repo>` → `repo`.
3. Si `url` matchea `marketplace.visualstudio.com` / `plugins.jetbrains.com` → `plugin`.
4. Si `url` matchea un dominio de articles conocidos (dev.to, medium, hashnode, substack) → `article`.
5. Si `text` empieza con `$ `, `> `, `brew `, `apt `, `npm install -g`, `cargo install`, `go install` → `cli`.
6. Si `text` contiene triple backtick o más de 3 líneas de código → `snippet`.
7. Si `text` matchea patrón de atajo (`Cmd+...`, `Ctrl+...`, `Shift+...`) → `shortcut`.
8. Si `url` presente pero ninguna regla anterior → `tool`.
9. Si solo `text` sin URL → `note`.

**Detección de duplicados:**
- Exact match por `url` normalizado.
- Si match, no crear — devolver `duplicate_of` + opción de "actualizar notas existentes" en el cliente.

**Enriquecimiento asíncrono:**
- Encolar job en background worker.
- Para `repo`: llamar GitHub API como ya hace `enricher/github.go`.
- Para `tool`/`article`: scraping Open Graph (con SSRF guard, ver REVIEW §3.4).
- Para todos: auto-tagging + summary local/heurístico si `AI_PROVIDER=heuristic` (o `local`).
- Si `AI_PROVIDER=disabled`, solo corre el enrichment clásico de metadata cuando aplique.
- Hoy NO hay SSE/WebSocket para refresco automático de items; el cliente ve el resultado al refetchear la lista/detalle.

---

## Canal 1 — Extensión de browser (Chrome + Firefox)

### Spec
- **Manifest v3**, compatible Chrome 100+ y Firefox 109+.
- Icono en toolbar con contador de "items capturados hoy".
- Atajo por defecto: `Cmd/Ctrl + Shift + D` → captura tab activa.
- Right-click en selección: "Guardar en DevDeck como snippet".
- Right-click en link: "Guardar link en DevDeck".
- Popup con:
  - Preview de lo que se va a capturar (título, URL, favicon, tipo detectado).
  - Textarea `why_saved` (autofocus).
  - Chips de tags sugeridos (vienen del vault del user via `/api/tags/suggest`).
  - Botón `Save` (Enter).
- Autenticación hoy: token/JWT manual configurado en Options y guardado en `chrome.storage.local`. Futuro: login vía `/api/auth/github/login` con redirect al popup.
- Backend URL configurable (para self-hosters).
- **Offline queue:** si el POST falla, guardar en `chrome.storage.local` y reintentar cada 60s o cuando vuelva la red.
- Context menu: guardar link y guardar selección como snippet sin abrir el popup.
- Los canales de extensión pueden adjuntar `meta_hints` con contexto de página (`page_url`, `page_title`, `capture_context`) para mejorar trazabilidad y enriquecimiento posterior.

### Estructura
```
extension/
  manifest.json
  src/
    background.ts         # service worker, maneja la queue
    popup/
      Popup.tsx           # React (vite-plugin-web-extension)
      Popup.css
    content/
      content.ts          # opcional: lee meta tags OG, detecta tipo de contenido
    lib/
      api.ts              # cliente del POST /api/items/capture
      queue.ts            # offline queue
      types.ts
  icons/
```

### Primer milestone (P0)
Estado actual: Chrome/Chromium con captura de tab activa por shortcut o popup, cola offline, badge de pendientes, context menu para links/selección y configuración manual de backend + token/JWT. Cuando esto quede sólido, expandir a Firefox/OAuth/tags sugeridos.

---

## Canal 2 — CLI `devdeck`

### Spec
Binario Go único. El estado actual del repo soporta `go install`/`go build`; Homebrew y Scoop siguen como objetivo de release, no como distribución ya cerrada.

```bash
devdeck login --token <api-token>          # guarda token en OS keychain
devdeck config set api-url https://api.devdeck.ai
devdeck config set api-url http://localhost:8080   # self-hosters

devdeck add https://github.com/foo/bar     # repo
devdeck add https://rg.dev --type=cli      # forzar tipo
devdeck add "Cmd+Shift+P" --type=shortcut --tags=vscode,productivity
echo 'rg --glob "*.go" "TODO"' | devdeck add --type=snippet --lang=bash

devdeck search "debugging go"              # devuelve top 10
devdeck open <id>                           # abre la URL fuente del repo/item en el browser
# devdeck run <alias>                      # futuro, no implementado
# devdeck run deploy --env=staging         # futuro, no implementado

devdeck list --type=cli
devdeck import github-stars                # importa GitHub Stars del user
# devdeck import pocket ~/exports/pocket.html  # futuro, no implementado

# devdeck sync                             # futuro, no implementado
devdeck status                             # config, token y health del backend
```

### Implementación
- `cobra` para CLI. Bubbletea/TUI sigue como opción futura (`devdeck ui`), no implementada.
- Token guardado en OS keychain via `zalando/go-keyring`.
- Config en `~/.config/devdeck/config.toml`.
- Hoy no hay SQLite local ni cola offline en el CLI; eso queda para una etapa posterior si el canal terminal demuestra suficiente uso.
- Hoy el CLI opera online contra la API: una request por comando, sin sync local.

### `devdeck run <alias>` — ejecutor de comandos
- Busca el comando por alias/título en el vault.
- Substituye variables: `{{env}}`, `{{branch}}`, etc.
- **Dry-run por default**: muestra el comando y pide confirmación con `y/N`.
- Flag `--yes` para skip confirmación (para scripting).
- Flag `--shell` para elegir shell (default: `$SHELL`).
- **Whitelist opcional** en config: comandos que requieren sudo se bloquean a menos que `allow_sudo: true`.

### Estructura
```
cli/
  cmd/
    devdeck/
      main.go
  internal/
    commands/
      add.go
      search.go
      run.go
      import/
        github_stars.go
        pocket.go
        raindrop.go
    api/
      client.go
    config/
    queue/
    auth/
  go.mod
```

### Primer milestone (P0)
Implementado hoy: `login`, `logout`, `config`, `add <url|text>`, `search`, `list`, `open <id>`, `status`, `import github-stars`.

**Nota de alcance:** el `open <id>` actual abre la **URL fuente** del repo/item cuando existe. No intenta deducir rutas internas de la app (`app.devdeck...`) desde `api_url`; si el recurso no tiene `url`, falla con error claro.

---

## Canal 3 — Paste inteligente en la app

### Spec
En `PasteInterceptor` (mounted globally en `apps/desktop/src/renderer/src/App.tsx`), escuchar `paste` global (no dentro de inputs). Este componente es **Electron-only por diseño** — el web client no monta `PasteInterceptor` porque el comportamiento global-paste no encaja bien en browser. El `CaptureModal` en sí vive en `@devdeck/features` y sí se usa en ambas apps (web lo dispara desde un botón en Topbar / `ItemsPage`).

- Si clipboard es URL → abrir `AddItemModal` con URL pre-rellenada y tipo detectado.
- Si clipboard es texto que parece comando → modal con `type=cli` y el comando en el body.
- Si clipboard es bloque de código (heurística: contiene `{`, `}`, `function`, `def`, indentación ≥ 2 líneas) → modal con `type=snippet` y language detection.
- Si clipboard es texto plano corto → modal con `type=note`.
- Si clipboard es JSON válido con estructura de prompt (`role`, `content`) → modal con `type=prompt`.

**UX:** en lugar de modal bloqueante, mostrar un toast-card flotante en la esquina:

> 📎 Pegaste una URL. ¿Guardar `github.com/foo/bar`?
> [Guardar] [Descartar] · Enter / Esc

Si el user no hace nada en 5 segundos, desaparece. Esto respeta el flujo sin ser intrusivo.

### Shortcut dedicado
`Cmd/Ctrl + Shift + V` → "Pegar y guardar en DevDeck", siempre abre modal con el contenido del clipboard.

---

## Canal 4 — Share target (PWA React)

### Spec
Cuando el web client sea PWA (post-Ola 6), registrar share target en el `manifest.webmanifest`:

```json
{
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

En móvil, aparece "DevDeck" en el menú nativo de Share. La ruta `/share` del React web app recibe los params y llama a `/api/items/capture` (vía `useCapture()` de `@devdeck/api-client`).

Esto evita tener que construir una app nativa iOS/Android para el caso más común (compartir link desde browser móvil).

---

## Sugerencias de `why_saved` asistidas por IA

Al capturar un item (desde cualquier canal), el backend puede devolver 3 sugerencias de `why_saved` basadas en el contenido + vault del user:

```json
{
  "item": { ... },
  "why_saved_suggestions": [
    "Para búsqueda rápida en codebases grandes",
    "Alternativa a grep en terminal",
    "Stack Go / productividad"
  ]
}
```

El cliente muestra las 3 como chips clickeables + opción "otro". Un click y el campo está lleno. Esto convierte un campo opcional en default rellenado, que es lo que hace que DevDeck sea encontrable meses después.

---

## Importadores (día 1 en Ola 4.5)

### GitHub Stars
`GET https://api.github.com/users/{user}/starred` paginado, POST `/api/items/capture` en lote. Tipo fijo `repo`, tags automáticos desde topics.

### Raindrop.io
Export JSON (`raindrop.json`), parse y post.

### Pocket
Export HTML (Netscape bookmarks format), parse con `golang.org/x/net/html`.

### Browser bookmarks
Chrome/Firefox exportan HTML bookmarks. Mismo parser que Pocket.

### Shell history
`history | grep -E "brew install|apt install|npm install -g|cargo install|go install|pipx install"` — proponer items `cli` con dedupe.

---

## Métricas de éxito del sistema de captura

- **P50 de tiempo captura-a-save** < 2s desde cualquier canal.
- **% de items con `why_saved` no vacío** > 70% (sin sugerencias IA: baseline ~20%).
- **% de saves que vienen de canales no-app** (extensión + CLI + share) > 50% en usuarios activos.
- **Duplicados detectados / total saves** — se debe trackear para tunear la heurística.
- **Enrichment success rate** (jobs IA completados sin error) > 95%.

---

## Prioridad de implementación (Ola 4.5 parte 2)

1. **Backend:** endpoint `POST /api/items/capture` con detección de tipo (sin IA todavía, solo heurísticas) y detección de duplicados. **Bloqueante** para todo lo demás.
2. **CLI P0:** `login`, `add <url>`, `search`, `list`. Distribuir por `go install`.
3. **Paste inteligente** en Electron (toast flotante).
4. **Extensión Chrome P0:** tab activa → save.
5. **Importador GitHub Stars** en el CLI.
6. **Extensión Firefox** + selección + right-click.
7. **Botón "Capturar" en web** (React — el `CaptureModal` ya vive en `@devdeck/features`, solo hay que disparar desde Topbar / ItemsPage; no se implementa `PasteInterceptor` en web por decisión de alcance — ver nota en Canal 3).
8. **PWA share target.**
9. **Sugerencias de `why_saved` con IA** (requiere Ola 6 en pie).

Los pasos 1–5 se pueden hacer en 2 semanas si hay foco. Son lo que convierte a DevDeck de "la abrís a veces" a "es parte del flujo".
