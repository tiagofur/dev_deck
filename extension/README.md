# DevDeck — Browser Extension

> Quick-capture en Chrome/Edge/Brave (y Firefox en cuanto se porte). Guardá la
> tab activa con `Cmd/Ctrl+Shift+D`.

Spec completa: [`docs/CAPTURE.md §Canal 1`](../docs/CAPTURE.md#canal-1--extensión-de-browser-chrome--firefox).

## Instalar (unpacked)

1. `chrome://extensions`
2. Activá **Modo de desarrollador** (arriba a la derecha).
3. **Cargar sin empaquetar** → seleccioná esta carpeta (`extension/`).
4. Abrí **Opciones** y configurá:
   - **Backend URL** — `http://localhost:8080` en dev, tu dominio en hosted.
   - **API Token** — el mismo `API_TOKEN` del backend (o JWT cuando esté activo).
5. Probá con `Cmd/Ctrl+Shift+D` en cualquier tab.

## Cómo funciona

```
┌─────────────┐        ┌──────────────┐        ┌───────────────┐
│  popup.js   │──msg──▶│ background.js│──fetch▶│  /api/items/  │
│ (short-live)│◀──res──│ (MV3 SW)     │        │    capture    │
└─────────────┘        └──────────────┘        └───────────────┘
                              │
                              ▼
                      chrome.storage.local
                    (apiUrl, token, queue)
```

- **Popup** (`src/popup.html` + `popup.js` + `popup.css`) — muestra título/URL de la
  tab activa, pide `why_saved` y tags opcionales, manda la captura al background
  service worker vía `chrome.runtime.sendMessage`. Enter guarda, Escape cierra.
- **Background** (`src/background.js`) — centraliza el fetch a `/api/items/capture`.
  Si el backend está caído (o no hay token), la captura va a una cola offline
  (`chrome.storage.local`) y se reintenta cada minuto via `chrome.alarms`. El
  badge del toolbar muestra el número de items pendientes en rojo.
- **Options** (`src/options.html` + `options.js`) — editor de `apiUrl` + `token`
  con un botón "Probar conexión" que hace un GET `/healthz`.
- **Atajo** — declarado en `manifest.json` como `capture-tab` con
  `Cmd/Ctrl+Shift+D`. Capturá sin abrir el popup.

## Permisos

| Permiso | Por qué |
|---|---|
| `activeTab` | Leer URL/título de la tab actual cuando el usuario invoca el popup o el shortcut. |
| `storage` | Persistir `apiUrl`, `token` y la cola offline en `chrome.storage.local`. |
| `alarms` | Reintentos del drain de cola cada minuto. |
| `host_permissions: <all_urls>` | `fetch` al backend self-hosted (cualquier dominio). Cuando publiquemos al Chrome Web Store esto se restringe al dominio hosted. |

## Estado

- ✅ P0 — capturar tab activa por shortcut o popup, token storage, offline queue.
- ⏳ Firefox — compatible manifest v3, pero falta validar shortcut y MV3 SW.
- ⏳ Right-click en selección ("Guardar en DevDeck como snippet").
- ⏳ OAuth flow con `/api/auth/github/login` en lugar de token manual (requiere JWT mode).
- ⏳ Tags sugeridos vía `GET /api/tags/suggest` (endpoint a crear en Ola 5).
- ⏳ Chrome Web Store / Firefox Add-ons.

## Dev

La extensión es zero-build — cargás la carpeta directo. Si movés el popup a
React en el futuro (`vite-plugin-web-extension`), el `src/lib/` queda igual.

Para probar la conectividad sin Chrome:

```bash
cd extension
node tests/storage.test.js   # stub de chrome.* + test de getSettings/setSettings
node tests/api.test.js       # fake backend con http.Server + capture()
```

(ver `tests/` para los stubs).
