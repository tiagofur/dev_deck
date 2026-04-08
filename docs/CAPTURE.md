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
- Para todos: auto-tagging + summary con IA (si habilitada, ver Ola 6).
- Al terminar, emitir evento a través de SSE/WebSocket: `item.enriched { id }` para que el cliente refresque.

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
- Autenticación: login inicial vía `/api/auth/github/login` con redirect al popup; token guardado en `chrome.storage.local` + sync.
- Backend URL configurable (para self-hosters).
- **Offline queue:** si el POST falla, guardar en `chrome.storage.local` y reintentar cada 60s o cuando vuelva la red.

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
Solo Chrome, solo captura de tab activa, solo `repo`/`article`/`tool`, sin detección avanzada. Cuando funciona, expandir a selección, shortcuts, Firefox.

---

## Canal 2 — CLI `devdeck`

### Spec
Binario Go único, distribuido via Homebrew (`brew install devdeck`), Scoop (Windows), y `go install github.com/user/devdeck/cli@latest`.

```bash
devdeck login                              # OAuth flow, abre browser
devdeck config set api-url https://api.devdeck.ai
devdeck config set api-url http://localhost:8080   # self-hosters

devdeck add https://github.com/foo/bar     # repo
devdeck add https://rg.dev --type=cli      # forzar tipo
devdeck add "Cmd+Shift+P" --type=shortcut --tags=vscode,productivity
echo 'rg --glob "*.go" "TODO"' | devdeck add --type=snippet --lang=bash

devdeck search "debugging go"              # devuelve top 10, abrir con número
devdeck open <id>                          # abre en browser / en la app
devdeck run <alias>                        # ejecuta un comando guardado
devdeck run deploy --env=staging           # con variables

devdeck list --type=cli
devdeck import github-stars                # importa GitHub Stars del user
devdeck import pocket ~/exports/pocket.html

devdeck sync                               # fuerza sync manual (normalmente automático)
devdeck status                             # qué tiene en cola, última sync
```

### Implementación
- `cobra` para CLI, `charmbracelet/bubbletea` para TUI opcional (`devdeck ui`).
- Token guardado en OS keychain via `zalando/go-keyring`.
- Config en `~/.config/devdeck/config.toml`.
- SQLite local en `~/.local/share/devdeck/devdeck.db` para queue offline y cache read.
- Todas las operaciones locales primero, sync al servidor después.

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
`login`, `add <url>`, `search`, `list`. El resto (import, run, TUI) viene después.

---

## Canal 3 — Paste inteligente en la app

### Spec
En `HomePage` de Electron y Vue, escuchar `paste` global (no dentro de inputs).

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

## Canal 4 — Share target (PWA Vue)

### Spec
Cuando el web client sea PWA, registrar share target en el `manifest.webmanifest`:

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

En móvil, aparece "DevDeck" en el menú nativo de Share. La ruta `/share` del Vue app recibe los params y llama a `/api/items/capture`.

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
7. **Paste inteligente** en Vue.
8. **PWA share target.**
9. **Sugerencias de `why_saved` con IA** (requiere Ola 6 en pie).

Los pasos 1–5 se pueden hacer en 2 semanas si hay foco. Son lo que convierte a DevDeck de "la abrís a veces" a "es parte del flujo".
