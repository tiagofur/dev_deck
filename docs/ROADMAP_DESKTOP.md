---
tags:
  - devdeck
  - roadmap
  - desktop
  - tauri
status: active
date: 2026-04-29
---

# 🖥️ DevDeck — Desktop Roadmap (Tauri)

> Evolución específica de la app desktop. Desde espejo de web → poder nativo → offline 100% → IA local.

---

## 📍 Estado actual (2026-04)

### Lo que existe ✅
- Estructura Tauri base
- Conexión con backend
- SQLite local para items
- Sincronización básica

### Lo que falta 🚧
- Hotkeys globales (cmd+K, cmd+shift+S)
- Launcher mode (search + execute commands)
- Offline-first completo (funciona sin internet)
- Local indexing (búsqueda instantánea local)
- Ollama integration (IA local)
- UI pulida (consistente con web)

---

## 🌊 Fases de desarrollo

### **Fase 1: MVP Desktop** (Q2 2026 — 3-4 semanas)

**Objetivo**: Desktop es espejo funcional de web, con sincronización

#### Features
- [ ] **Layout base** — Mismo diseño que web (sidebar + deck view + item list)
- [ ] **Sync automático** — Cambios web → desktop en < 1 segundo
- [ ] **SQLite local** — Todos los items en BD local
- [ ] **Offline read** — Puedo leer items sin internet (no escribir)
- [ ] **Tray icon** — App en tray (minimize/restore)

#### Architecture
- **Frontend**: React components compartidas con web (monorepo)
- **Backend local**: Tauri commands que hablan con SQLite
- **Database**: SQLite (schema idéntico a PostgreSQL del server)
- **Sync**: Listener de cambios en backend → fetch nuevos items

#### Desktop-specific UX
- [ ] Minimize to tray (no cierra, minimiza)
- [ ] Restore on tray click
- [ ] System notifications (nuevo item compartido, sync done)

#### Done when
- ✅ Desktop abre en < 2 segundos
- ✅ Items sincronizados en < 1 segundo
- ✅ Puedo buscar/filtrar items sin internet
- ✅ Cambios en web aparecen en desktop inmediatamente

---

### **Fase 2: Hotkeys & Launcher** (Q3 2026 — 3-4 semanas)

**Objetivo**: Desktop tiene superpoderes de captura y búsqueda global

#### Features
- [ ] **Global hotkey (cmd+K)** — Anywhere en el sistema, cmd+K = capture modal
- [ ] **Screenshot hotkey (cmd+shift+S)** — Captura screenshot, annota, save
- [ ] **Search hotkey (cmd+alt+K)** — Anywhere, busca en tu deck
- [ ] **Launcher mode** — Search items → ejecutar commands
- [ ] **Quick capture** — Clipboard detection (si copiaste URL, sugiere capturar)

#### Hotkey implementation
```
cmd+K        → Capture modal (URL, text, archivo)
cmd+shift+S  → Screenshot + annotation
cmd+alt+K    → Search in Deck (no capture, solo search)
cmd+alt+C    → Copy last used command
```

#### Launcher example
```
User: cmd+K → tipos "install package"
DevDeck muestra:
  1. npm install package
  2. pnpm add package
  3. yarn add package
User selecciona → copia al clipboard (y lo pega donde quiere)
```

#### Backend support
- [ ] Endpoint `/commands/search?q=install` (busca en tu library de commands)
- [ ] Endpoint `/items/{id}/command/execute` (registra que ejecutaste un command)

#### Desktop SDK
- Tauri's `hotkey` module para global shortcuts
- Screenshot lib (screenshot-rs o similar)
- Clipboard monitoring

#### Done when
- ✅ cmd+K funciona desde cualquier app
- ✅ Screenshot + annotate workflow < 5 segundos
- ✅ Launcher mode shows relevant commands
- ✅ 50% of captures via hotkeys

---

### **Fase 3: Local Intelligence** (Q4 2026 — 4-5 semanas)

**Objetivo**: Desktop funciona 100% offline con IA local

#### Features
- [ ] **Ollama integration** — Usar LLMs locales (Mistral 7B, Llama2)
- [ ] **Local embeddings** — Generar embeddings sin OpenAI
- [ ] **Local semantic search** — Search offline, < 200ms response
- [ ] **Auto-tag offline** — Auto-tagging sin conectar a OpenAI
- [ ] **Smart sync** — Detecta cambios, sincroniza cuando hay conexión
- [ ] **Conflict resolution** — Si cambias same item en web y desktop, auto-merge

#### Ollama setup
- User puede instalar Ollama (https://ollama.ai)
- DevDeck detects Ollama running on localhost:11434
- Option en Settings: "Use local AI" (true/false)
- Si activa, descargar modelo (~7GB):
  - `ollama pull mistral` (fast, good)
  - O `ollama pull neural-chat` (optimizado para chats)

#### Local indexing
- Generate embeddings para todos los items (one-time)
- Store embeddings en SQLite (vector extension)
- Semantic search usa SQLite FTS

#### Sync strategy
```
Desktop:
  - Offline mode: cambios se guardan localmente, queue de sync
  - Online mode: auto-sync (pull from server, push local changes)
  - Conflict: "last write wins" o mostrar dialog para elegir
```

#### Done when
- ✅ Ollama integrado y funcionando
- ✅ Local semantic search < 200ms
- ✅ Desktop funciona 100% offline
- ✅ Sync resolves conflicts automáticamente
- ✅ First time setup instructions en docs

---

### **Fase 4: Power Features** (Q1 2027+)

**Objetivo**: Desktop tiene funciones que web no tiene

#### Features (planeadas)
- [ ] **Batch operations** — Select multiple items, bulk tag/move/delete
- [ ] **Automation** — Rules: "Si item tiene tag 'Go', asignarlo a deck 'Go tools'"
- [ ] **System integration** — Finder/Explorer integration (share to DevDeck)
- [ ] **Update checker** — Auto-updates or notify
- [ ] **Analytics** — Local analytics (no cloud) - qué buscas, con qué frecuencia

#### Integration examples
- macOS: Cmd+K in Finder → "Send to DevDeck"
- Windows: Right-click file → "Add to DevDeck"

---

## 🛠️ Tech stack Desktop

### Framework
- **Tauri** (confirmed)
  - Rust backend
  - React frontend (shared with web)
  - Small bundle (~100MB)
  - Native performance

### Storage
- **SQLite** (local database)
  - sqlite3 Rust driver
  - Schema mirrored from PostgreSQL backend
  - FTS (Full Text Search) for local search

### AI/Embeddings
- **Ollama** (optional, user-installed)
  - HTTP API at localhost:11434
  - Models: Mistral 7B, Llama2
  - Embeddings generation

### Plugins/libraries
- `tauri-plugin-window` — window management
- `tauri-plugin-globalshortcut` — hotkeys
- `sqlite3` — local DB
- `screenshot-rs` — screenshots
- `pdf-extract` — if user captures PDF

### Signing & Distribution
- Code signing (macOS)
- Notarization (macOS app store)
- Auto-update (Tauri updater plugin)

---

## 📊 Desktop vs Web comparison

| Feature | Web | Desktop |
|---------|-----|---------|
| Hotkeys | cmd+K in web | Global hotkeys |
| Screenshot | Via browser | Native (cmd+shift+S) |
| Offline | Limited (Service Worker) | Full (SQLite + Ollama) |
| Speed | 200-500ms search | < 100ms search |
| IA local | No (OpenAI only) | Yes (Ollama) |
| Sync | Automatic | Automatic + smart conflict resolution |
| System integration | Browser only | Files + clipboard |

---

## 🎯 Success metrics

### Fase 1
- Desktop opens < 2s
- 100% item sync completed < 1s
- Offline read works for 100% of items

### Fase 2
- 70% of captures via hotkeys
- Launcher mode used in 50% of daily users
- Global hotkey works from any app (100%)

### Fase 3
- Ollama integration used by 80% of power users
- Local semantic search < 200ms
- 95% of conflicts auto-resolved
- Desktop preferred over web for 60% of use cases

### Fase 4
- Automation rules save devs 5+ min/day
- System integration used by 40% of power users

---

## 🚀 Próximos pasos

1. **Esta semana**: Confirm Tauri version + dependencies
2. **Próxima semana**: Migrate React components to shared monorepo
3. **Semana 3**: Tauri window setup + SQLite schema
4. **Semana 4**: Sync mechanism implementation

---

## 🔗 Relacionado

- [STRATEGIC_ROADMAP.md](STRATEGIC_ROADMAP.md) — Visión integrada
- [ROADMAP_WEB.md](ROADMAP_WEB.md) — Roadmap web (companion)
- [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md) — Catálogo de features
- [../Architecture/Arquitectura General.md](../Architecture/Arquitectura%20General.md) — Arch general
- [../TECHNICAL_ROADMAP_AI_OFFLINE.md](../TECHNICAL_ROADMAP_AI_OFFLINE.md) — Original roadmap

---

**Owner**: tfurt  
**Última actualización**: 2026-04-29  
**Estado**: 🟢 Activo — Fase 1 MVP setup en progreso
