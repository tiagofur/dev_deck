# DevDeck — Product Requirements Document

> Versión: 0.3 · Owner: tfurt · Última actualización: 2026-04-08

---

## 0. Nombre y dominio

**DevDeck** es el nombre definitivo. Dominio confirmado: **devdeck.ai**.

El `.ai` no es decorativo. DevDeck usa IA para clasificar, resumir, recuperar por intención y sugerir items relacionados — haciendo que todo lo que guardás sea **encontrable cuando lo necesitás**.

Arquitectura de subdominios:
| Subdominio | Propósito |
|------------|-----------|
| `devdeck.ai` | Landing page + marketing + descargas |
| `app.devdeck.ai` | Web app (Vue) |
| `api.devdeck.ai` | Backend REST + sync |
| `docs.devdeck.ai` | Documentación |
## 0. Naming

**DevDeck** se queda. "Deck" sugiere baraja de herramientas — organizado, extensible, personal — y encaja perfecto con la visión expandida.

**Dominio:** [devdeck.ai](https://devdeck.ai)
- `devdeck.ai` — landing + web app
- `app.devdeck.ai` — cliente web
- `api.devdeck.ai` — backend sync / API
- `docs.devdeck.ai` — documentación

El `.ai` se justifica con features de IA reales: auto-summary, auto-tagging, búsqueda semántica e items relacionados. No es decorativo.

---

## 1. Visión

**DevDeck es tu memoria externa asistida por IA para el trabajo de desarrollo.**

Una app **offline-first, multi-usuario y multiplataforma** donde guardar, organizar y redescubrir todo lo útil que un dev encuentra: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agentes, prompts y workflows. Con IA que clasifica, resume y recupera por intención — no por tag exacto.

> "Guarda, organiza y redescubrí herramientas, repos, comandos y workflows para devs."

No es un bookmark manager. No es Notion. Es un **knowledge OS para developers** — diseñado para que lo que guardás hoy sea encontrable en 6 meses, aunque no recuerdes cómo lo llamaste.

**Pilares del producto:**
1. **Items** — cualquier asset de dev: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agentes/prompts, notas, workflows
2. **Comandos por repo** — los `npm run X`, `make Y`, `docker Z` que siempre olvidás
3. **Cheatsheets globales** — comandos universales por categoría (git, docker, OS, lenguajes…)
4. **IA real** — auto-tagging, auto-summary, búsqueda semántica, sugerencias de items relacionados
5. **Offline-first + sync** — funciona sin conexión; sincroniza con el VPS cuando hay red
6. **Multi-usuario** — cada usuario tiene su propio vault; sync y auth en devdeck.ai
7. **Multiplataforma** — desktop (Electron: Mac, Win, Linux) + web (Vue/PWA)
> **DevDeck es tu memoria externa para desarrollo, asistida por IA.**

Más concretamente:

> Una app personal para **coleccionar, organizar, recuperar y accionar** conocimiento útil para developers — repos, CLIs, plugins, atajos, workflows, notas, prompts y más — con IA que clasifica, resume y hace recuperable todo lo que guardás.

### Lo que DevDeck NO es
- No es un bookmark manager genérico (Raindrop/Pocket)
- No es un gestor de notas (Notion/Obsidian)
- No es solo un directorio de repos (GitHub Stars)
- No es un launcher genérico (Raycast/Alfred)

### Lo que DevDeck SÍ es
- Tu **colección personal** de assets útiles para desarrollar
- Tu **memoria externa** para tools que descubrís pero olvidás
- Tu **launchpad** de comandos, shortcuts y workflows
- Tu **knowledge base curada** con IA que la organiza

**Pilares del producto:**
1. **Items** — repos, CLIs, plugins, atajos, workflows, notas, prompts, agentes, cheatsheets, snippets
2. **Contexto** — para qué sirve, cuándo usarlo, por qué lo guardaste, comandos clave
3. **IA** — auto-summary, auto-tagging, búsqueda semántica, items relacionados
4. **Acceso** — offline-first, multiplatforma (desktop + web), multi-device sync

---

## 2. Problema

### El dolor real
1. Descubrís repos útiles, CLIs, plugins, shortcuts y agentes en grupos de chat, Twitter, HN, Reddit.
2. Si no los guardás en el momento, los perdés para siempre.
3. Cuando aparece el problema que esa herramienta resolvía, ya no recordás ni cómo se llamaba.
4. Terminás reinventando la rueda o perdiendo horas buscando algo que ya habías encontrado.
5. Cambias de máquina (o colegas): no hay forma de compartir o sincronizar tu colección.

### El problema de fondo
No es solo "guardar repos". Es:
- **Descubrir** cosas útiles
- **Volver a encontrar** cosas útiles cuando las necesitás
- **Recordar el contexto**: "¿para qué servía este repo / CLI / plugin / atajo?"
- **Tener a mano** comandos / shortcuts / workflows por stack
- **Curar y accionar** conocimiento disperso: repos, gists, cheatsheets, docs, notas, scripts, links
1. Descubrís herramientas útiles (repos, CLIs, plugins, atajos) mientras trabajás o hablando con colegas.
2. No tenés un lugar específico para devs donde guardarlas con contexto.
3. Semanas después, cuando aparece el problema que esa tool resolvía, no la encontrás.
4. Si la encontrás, no recordás para qué servía ni cómo se usaba.
5. Terminás redescubriendo lo mismo una y otra vez.

### El problema ampliado
No son solo repos. Son:
- CLIs que alguien mencionó en Twitter/X y nunca probaste
- Plugins de IDE que instalaste y olvidaste por qué
- Atajos de macOS / VS Code que nunca internalizaste
- Prompts para AI coding que funcionaron una vez
- Workflows de terminal que construiste y perdiste
- Comandos de setup que siempre buscás en Google

### Por qué lo existente no alcanza

| Solución | Por qué falla |
|----------|---------------|
| Bookmarks del browser | Sin contexto, sin preview rico, sin tags propios, sin búsqueda semántica |
| GitHub Stars | Solo repos de GitHub, sin CLIs / plugins / shortcuts / snippets; sin notas personales |
| Notion / Notes | Trabajo manual total: copy/paste, sin metadata automática, sin IA, sin sync inteligente |
| Raindrop / Pocket | Genéricos, sin foco en devs, sin IA para recuperación, sin comandos ni cheatsheets |
| ChatGPT | No recuerda lo que guardaste; no es tu colección personal |

---

## 3. Usuarios objetivo

### Usuario primario
Desarrollador individual que descubre muchas herramientas, no recuerda dónde las guarda y pierde tiempo buscando cosas que ya vio. Usa la app a diario como "primera parada" cuando necesita recordar algo útil.

### Usuario secundario (post multi-user)
Equipos de desarrollo que quieren compartir una colección curada de herramientas, comandos y cheatsheets.

### No-objetivos
Usuarios no técnicos. Project managers. Gestión de proyectos. CRMs. (No somos Notion.)

**Perfil:** Developer activo (el owner + otros devs). Guarda y redescubre herramientas continuamente. Trabaja en múltiples stacks. Quiere una app que se vuelva más valiosa a medida que agrega items.

**Evolución:**
- **MVP (Olas 1–4):** Single-user, personal, local-first con sync a VPS propio
- **v2 (Olas 5–6):** Multi-device, offline-first, AI real
- **v3 (Ola 7+):** Multi-user real, sync cloud, decks compartibles

---

## 4. Tipos de items

La entidad central deja de ser `Repo` y pasa a ser `Item`. Los repos siguen siendo un tipo de item.

| Tipo | `item_type` | Descripción | Ejemplo |
|------|------------|-------------|---------|
| **Repo** | `repo` | GitHub/GitLab/cualquier repo | `tiangolo/fastapi` |
| **CLI** | `cli` | Herramienta de línea de comandos | `jq`, `fzf`, `lazygit`, `gh` |
| **Plugin** | `plugin` | Plugin de IDE, editor o app | GitHub Copilot, Neovim `telescope` |
| **Skill / Prompt** | `prompt` | Prompt de AI coding, MCP skill, custom instruction | "Actúa como senior Go dev..." |
| **Agente** | `agent` | Agente autónomo, workflow de LLM | Coding agent, research agent |
| **Cheatsheet** | `cheatsheet` | Referencia rápida de comandos por tema | Git, Docker, kubectl |
| **Shortcut** | `shortcut` | Atajo de teclado o gesture | macOS Mission Control, VS Code multi-cursor |
| **Workflow** | `workflow` | Secuencia de pasos o comandos para una tarea | Deploy flow, debug session |
| **Snippet** | `snippet` | Fragmento de código reutilizable | One-liner de bash, función de JS |
| **Nota** | `note` | Nota de decisión, gotcha, contexto | "Por qué elegimos sqlc sobre gorm" |
| **Tool** | `tool` | App de escritorio / web dev tool | Postico, TablePlus, Insomnia |
| **Article** | `article` | Link a doc, post, o recurso externo | Blog post, RFC, tutorial |

El producto crece en **6 olas**, cada una con valor independiente.

### 🌊 Ola 1 — MVP (Repos + Personalidad) ✅ Completa

#### 4.1.A Core repos

| # | Feature | Descripción |
|---|---------|-------------|
| F1 | **Add repo** | Pegar URL → backend resuelve metadata automáticamente → guarda |
| F2 | **Lista / grid** | Ver todos los repos como cards visuales |
| F3 | **Preview rico** | Avatar del owner, nombre, descripción, stars, lenguaje (con color), topics, og:image |
| F4 | **Buscar** | Búsqueda fuzzy por nombre, descripción y tags (Postgres pg_trgm) |
| F5 | **Filtrar** | Por lenguaje, por tag, por archivado/activo |
| F6 | **Tags personales** | El usuario etiqueta libremente (`cli`, `learning`, `frontend`, etc.) |
| F7 | **Notas markdown** | Nota corta personal por repo ("para cuando necesite parser X") |
| F8 | **Acciones** | Abrir en browser, copiar URL, copiar `git clone`, compartir, archivar, borrar |
| F9 | **Refresh metadata** | Manual on-demand + cron 7d para mantener stars/desc actualizadas |

#### 4.1.B Personalidad
---

## 5. Scope por fases

El producto crece en **olas**. Las olas 1–4 están completas.

---

### 🌊 Olas 1–4 (completadas) — MVP + Web + Auth

Ver [ROADMAP.md](../ROADMAP.md) para detalle completo. Resumen:

---

### 🌊 Ola 2 — Repo Detail + Comandos por repo ✅ Completa

#### 4.2.A Repo Detail Page

| # | Feature | Descripción |
|---|---------|-------------|
| F10 | **Vista de detalle completa** | Click en card → pantalla full con toda la info: README rendereado, stats (stars, forks, issues abiertos, último commit, contributors top), topics, languages bar, license |
| F11 | **README inline** | Backend trae el README.md vía GitHub API; cliente lo renderiza con syntax highlighting |
| F12 | **Quick links GitHub** | Atajos a: Issues, PRs, Releases, Wiki, Discussions, Actions |

#### 4.2.B Comandos por repo

| # | Feature | Descripción |
|---|---------|-------------|
| C1 | **Crear comando custom** | Por cada repo: `label`, `command`, `description`, `category` (`install`, `dev`, `test`, `deploy`, etc.) |
| C2 | **Ejecutar/copiar con un click** | Click → copia al clipboard + toast confirmando |
| C3 | **Reordenar** | Drag & drop para ordenar los comandos |
| C4 | **Importar desde `package.json`** | Sugerir importar `scripts` de repos Node automáticamente |
| C5 | **Linkear cheatsheets relevantes** | Desde el detail, linkear a cheatsheets globales relacionados |
- **Ola 1:** Electron app + repos con preview rico + mascota + discovery mode
- **Ola 2:** Repo detail + commands per repo + import from package.json
- **Ola 3:** Cheatsheets globales + global search
- **Ola 4:** Vue web client + GitHub OAuth + JWT auth + multi-device base

---

### 🌊 Ola 5 — Item types expandidos

#### 5.1 Modelo de items genérico

| # | Feature | Descripción |
|---|---------|-------------|
| IT1 | **Item type field** | Cada item tiene `item_type` (repo/cli/plugin/prompt/agent/shortcut/workflow/snippet/note/tool/article) |
| IT2 | **Quick capture** | Pegar URL o escribir nombre → guardar en < 3 segundos; la IA completa el contexto después |
| IT3 | **"Why saved this?"** | Campo destacado: "por qué lo guardé / cuándo usarlo" |
| IT4 | **Use case field** | Campo: cuándo usarlo (debugging, deploy, onboarding, productivity...) |
| IT5 | **Stack field** | Go, Node, Python, macOS, Docker, AI, etc. |
| IT6 | **Commands per item** | No solo repos — cualquier item puede tener comandos asociados |
| IT7 | **Runbooks** | Checklists de pasos por item/stack: "Cómo levantar local", "Deploy", "Debug" |
| IT8 | **Setup notes** | Notas de instalación/configuración por item |

#### 5.2 Vistas de redescubrimiento

| # | Feature | Descripción |
|---|---------|-------------|
| V1 | **Vistas por tipo** | Filtrar por: Repos / CLIs / Plugins / Shortcuts / Prompts / etc. |
| V2 | **Vistas por stack** | Ver todo lo guardado para Go, React, Docker, macOS... |
| V3 | **Vistas por use case** | "Cosas de debugging", "cosas de deploy", "productividad terminal" |
| V4 | **"Forgotten gems"** | Items no abiertos en > 30 días — descubrimiento activo |
| V5 | **"Recently saved"** | Timeline de lo último guardado |
| V6 | **Cross-linking** | Desde un item, ver items relacionados guardados por el usuario |

**Privacidad:** toda llamada a IA es opt-in y explícita en la UI. Se puede configurar usar modelo local (Ollama) o cloud (OpenAI/Anthropic). Lo que se envía al modelo se muestra claramente al usuario.

### 🌊 Ola 6 — IA real que justifica `.ai`

### 🌊 Ola 3 — Cheatsheets globales ✅ Completa

| # | Feature | Descripción |
|---|---------|-------------|
| CH1 | **Pestaña Cheatsheets** | Nueva sección top-level: lista con `title`, `slug`, `category`, `icon`, `color` |
| CH2 | **Entries dentro del cheatsheet** | Colección de comandos: `label`, `command`, `description`, `tags` |
| CH3 | **Búsqueda global de comandos** | Search bar global cross-entity (repos + cheatsheets + entries) |
| CH4 | **Cheatsheets curados pre-cargados** | Seed: git, docker, npm, pnpm, vim, tmux, ssh, find, grep, kubectl, gh CLI |
| CH5 | **Crear/editar/borrar propios** | El usuario puede agregar sus propios cheatsheets y entries |
| CH6 | **Compartir cheatsheet** | Exportar a JSON/markdown |

---

### 🌊 Ola 4 — Web + Auth real ✅ Completa

| # | Feature | Descripción |
|---|---------|-------------|
| W1 | **Cliente web Vue 3** | Vue 3 + Vite + TypeScript + Pinia + Vue Router; mismo backend Go |
| W2 | **GitHub OAuth login** | "Sign in with GitHub" → JWT de 30 días; allowlist de usernames |
| W3 | **Migración Electron a JWT** | Electron también usa JWT; OAuth via deeplink callback |
| W4 | **Refresh tokens** | Refresh token de 90 días, rotación automática |
| W5 | **Logout / sesión** | Invalidación de sesión; multi-sesión por usuario |

---

### 🌊 Ola 5 — Items generales + IA real

Esta ola convierte DevDeck de "directorio de repos" a **knowledge OS para developers**.

#### 4.5.A Modelo de items extendido

| # | Feature | Descripción |
|---|---------|-------------|
| I1 | **Tipos de item** | Nuevo campo `item_type`: `repo`, `cli`, `plugin`, `shortcut`, `snippet`, `agent`, `prompt`, `article`, `tool`, `workflow`, `note`. Los repos siguen siendo el tipo principal pero ya no el único |
| I2 | **Guardar item genérico** | Pegar URL o texto → se detecta el tipo automáticamente → se enriquece según tipo |
| I3 | **Campo "por qué lo guardé"** | Campo `why_saved` visible y editable: "para cuando necesite X", "alternativa a Y" |
| I4 | **Campo "cuándo usarlo"** | Campo `when_to_use` opcional: contexto de uso |
| I5 | **Quick capture** | Agregar item en < 5 segundos: pegar URL → save → IA completa metadata en background |

#### 4.5.B IA real (justifica devdeck.ai)

La IA en DevDeck cumple 4 funciones concretas. Sin estas funciones, el `.ai` sería engaño. Con ellas, es diferenciación real.

| # | Feature | Por qué es útil | Implementación |
|---|---------|----------------|---------------|
| AI1 | **Auto-tagging y categorización** | Elimina el trabajo manual de etiquetar; detecta stack, tipo, propósito y nivel automáticamente | Llamada al LLM con contexto del item (URL, título, descripción, README snippet); devuelve tags + tipo sugerido |
| AI2 | **Auto-summary** | Resuelve "¿por qué guardé esto?": genera un resumen de qué es, para qué sirve, cuándo usarlo y qué stack toca | LLM con README + descripción → resumen corto (150 palabras máx) |
| AI3 | **Búsqueda semántica** | Recuperar por intención ("tools para agents en terminal") en vez de tag exacto | Embeddings de título + descripción + summary + notas; búsqueda vectorial (pgvector o similar); fallback a búsqueda fuzzy existente |
| AI4 | **Items relacionados** | Al ver un item, sugerir repos similares, comandos relacionados, cheatsheets relevantes | Similitud de embeddings; mostrar en sidebar del detail |

**Principios de diseño para la IA:**
- La IA siempre propone, el usuario siempre aprueba (auto-tags son sugerencias editables)
- Opt-in para enviar contenido a servicios externos (LLM cloud vs local)
- Las funciones IA mejoran con más items guardados (flywheel de valor)
- Sin IA decorativa: cada feature de IA reduce fricción real

#### 4.5.C "Ask DevDeck" (RAG sobre tu vault)

| # | Feature | Descripción |
|---|---------|-------------|
| AQ1 | **Consultas en lenguaje natural** | "¿Qué tools tengo guardadas para agentes?" / "¿Qué comandos uso para levantar proyectos Go?" — responde sobre TU dataset, no sobre el mundo |
| AQ2 | **Vistas por intención** | Filtros predefinidos: "AI tools", "Terminal stuff", "Mac shortcuts", "Go setup", "Forgotten gems (sin abrir en 3 meses)" |

---

### 🌊 Ola 6 — Offline-first + Sync + Multi-usuario

Esta ola convierte DevDeck en un producto multi-device y potencialmente colaborativo.

#### 4.6.A Offline-first

| # | Feature | Descripción |
|---|---------|-------------|
| OF1 | **SQLite local** | Base de datos local en el cliente (Electron: archivo en `userData`; Web: IndexedDB o SQLite WASM) |
| OF2 | **Cola de cambios local** | Toda operación CRUD se escribe local primero; se encola para sync con el backend |
| OF3 | **Funcionamiento offline completo** | La app funciona sin red: agregar, editar, buscar, copiar comandos — todo offline |
| OF4 | **Indicador de estado de sync** | UI muestra: "Sincronizado" / "X cambios pendientes" / "Sin conexión" |
| OF5 | **Cache de metadata** | Metadata de repos/items se cachea localmente; se refresca cuando hay red |

#### 4.6.B Sync engine

| # | Feature | Descripción |
|---|---------|-------------|
| SY1 | **Sync on reconnect** | Al recuperar red, el cliente envía la cola de cambios al backend; procesa en orden |
| SY2 | **Resolución de conflictos simple** | Last-write-wins por campo (con `updated_at`); en colisión, notifica al usuario |
| SY3 | **Multi-device** | El mismo usuario puede usar Electron en Mac, Electron en Win y Web simultáneamente |
| SY4 | **Sync selectivo** | El usuario puede marcar items como "solo local" (no se sincronizan con el servidor) |

#### 4.6.C Multi-usuario

| # | Feature | Descripción |
|---|---------|-------------|
| MU1 | **Vault por usuario** | Cada usuario tiene su propio vault aislado en el backend |
| MU2 | **Decks compartibles** | Colección curada de items que se puede compartir via link público (devdeck.ai/deck/slug) |
| MU3 | **Importar decks de otros** | Ver deck de alguien → importar items que te interesan a tu vault |
| MU4 | **Open Graph de decks** | Links de decks tienen preview rico (título, descripción, primeros 3 items) |
| MU5 | **Perfil público** | Página pública `devdeck.ai/@username` con decks públicos del usuario |

---

### 4.X Out of scope (futuro)

- Stats dashboard / achievements / streaks visibles
- Importar masivo desde GitHub stars / CSV / OPML
- Backup/export JSON manual
- Mobile app nativa
- Billing / planes pagos (todo esto es v3+)
- Integraciones IDE (extensión VS Code, plugin JetBrains)
#### Regla de diseño: la IA hace cosas útiles concretas
La IA en DevDeck tiene un trabajo específico: **memoria, organización y recuperación**. No es un chatbot genérico.

| # | Feature | Descripción |
|---|---------|-------------|
| AI1 | **Auto-summary** | Al guardar un item, genera: qué es, para qué sirve, cuándo usarlo, stack que toca |
| AI2 | **Auto-tagging** | Propone: tipo de item, stack, propósito, nivel (beginner/advanced), categorías |
| AI3 | **Búsqueda semántica** | Buscar por intención ("herramientas para agents en terminal") no solo título exacto |
| AI4 | **Related items** | Al ver un item, sugiere items relacionados guardados (y globales curados) |
| AI5 | **Content → Knowledge** | Pegar URL/README/tweet/doc → genera resumen, tags, comandos detectados, prerrequisitos |
| AI6 | **Ask DevDeck** | Preguntás sobre tu base de conocimiento: "¿qué tools tengo para agents?", "¿qué guardé para debugging en Go?" |
| AI7 | **Runbook sugerido** | Para repos GitHub: detecta secciones del README y propone convertirlas en pasos de runbook |
| AI8 | **Cheatsheet sugerido** | Al guardar un CLI/tool, sugiere crear o linkear cheatsheet relevante |

#### Stack técnico IA sugerido
- **Embeddings:** OpenAI `text-embedding-3-small` o modelo local (Ollama)
- **Vector store:** `pgvector` extension en Postgres (misma DB, mínima complejidad)
- **Búsqueda híbrida:** `pg_trgm` (fuzzy text) + pgvector (semántica), fusionados por RRF
- **Generación:** OpenAI GPT-4o-mini (resúmenes, tags) — opt-in con API key del usuario
- **Privacidad:** opt-in explícito; qué se envía a la API es visible; opción local-only con Ollama

---

### 🌊 Ola 7 — Multiusuario + Sync + Offline-first

| # | Feature | Descripción |
|---|---------|-------------|
| MU1 | **Offline-first** | SQLite local con cola de cambios; funciona sin conexión; sync eventual |
| MU2 | **Multi-device sync** | Desktop + web acceden a la misma base de datos vía API |
| MU3 | **Multi-user real** | GitHub OAuth para cualquier usuario (allowlist expandida o pública) |
| MU4 | **Conflict resolution** | Last-write-wins inicialmente; luego merge por campos |
| MU5 | **Decks compartibles** | Armar colección curada y compartir link público con preview |
| MU6 | **Import deck** | Importar deck de otro usuario |
| MU7 | **Embed / Open Graph** | Links compartibles con preview rico (og:image generado) |

#### Arquitectura multiusuario
```
Desktop (Electron)     Web (browser)
SQLite local   ←───→  API server   ←───→  Postgres (VPS)
cola de sync           api.devdeck.ai       pgvector + pg_trgm
```

**Modelo de sync:**
- Local-first: todas las operaciones van a SQLite local primero
- Background sync: cola de cambios se envía al server en background
- Resolución simple: last-write-wins con `updated_at`
- Cache completa local para offline-first garantizado

---

## 6. Features de utilidad práctica

### Runbooks por item
Cada item puede tener un **runbook**: checklists + comandos + notas + links.
- "Cómo levantar local", "Deploy", "Debug", "Reset DB", "Seed data"
- Plantillas por stack: Node, Go, Rails, Python, Docker
- Import automático: si hay README, detectar secciones "Getting started" / "Installation" y proponer convertirlas en pasos

### Command Palette global (tipo Raycast pero para tus items)
- `Cmd/Ctrl+K` global: buscar item → ejecutar acción
- Acciones: copiar clone, abrir en browser, abrir en IDE, correr comando guardado, ver cheatsheet
- Acciones contextuales por stack (si detecta Node, sugiere `pnpm dev`, etc.)

### One-click setup (Electron)
Aprovechando que es Electron:
- Detectar si el repo está clonado localmente (vincular path)
- **Open in IDE** (VS Code / JetBrains) + **Open Terminal here**
- **Copy env template** (`.env.example → .env`) + checklist de prerrequisitos
- Si hay `docker-compose.yml`: ofrecer comandos típicos

### Rediscovery activo
- Nudges de la mascota: "Tenés 12 items sin ver hace meses"
- Vista "Forgotten gems" — items con `last_seen_at > 30d`
- Discovery mode tipo Tinder expandido a todos los tipos de items

### Cross-linking
- Desde un repo: ver CLIs, plugins y cheatsheets relacionados guardados
- Desde un CLI: ver repos que lo usan, cheatsheets del mismo stack
- Auto-sugerencia de links basada en IA y tags compartidos

---

## 7. User stories

### Ola 1 — MVP ✅
### Olas 1–4 (completadas)
```
US-01  Pegar URL de GitHub y que resuelva metadata sola.
US-02  Ver mis repos como cards con preview rico.
US-03  Búsqueda fuzzy por nombre, descripción y tags.
US-04  Tags personales por repo.
US-05  Notas markdown personales por repo.
US-06  Open in browser, copy clone, share, archive, delete.
US-07  Modo descubrimiento para reencontrar repos olvidados.
US-08  Mascota con personalidad que reacciona a mi uso.
US-09  Vista detalle completa con README, stats y quick links.
US-10  Comandos por repo con drag & drop y categorías.
US-11  Importar scripts de package.json automáticamente.
US-12  Cheatsheets globales con entries y búsqueda cross-entity.
US-13  Web client con GitHub OAuth y JWT.
```

### Ola 2 — Repo Detail + Comandos ✅
### Ola 5 — Item types expandidos
```
US-14  Guardar un CLI (ej: "fzf") con descripción y comandos propios.
US-15  Guardar un prompt de AI coding con notas de cuándo usarlo.
US-16  Guardar un atajo de macOS con descripción de qué hace.
US-17  Guardar un workflow de deploy con pasos ordenados.
US-18  Ver todos mis items de tipo "CLI" filtrados.
US-19  Ver todos mis items del stack "Go".
US-20  Quick capture: pegar URL, presionar Enter, guardar en < 3s.
US-21  Ver items no abiertos hace más de 30 días (forgotten gems).
```

### Ola 3 — Cheatsheets ✅
### Ola 6 — IA
```
US-22  Guardar un repo y que DevDeck proponga automáticamente un resumen.
US-23  Guardar un item y que DevDeck sugiera tags y tipo automáticamente.
US-24  Buscar "herramientas para agents en terminal" y encontrar items relevantes.
US-25  Ver un repo y que DevDeck muestre "items relacionados" que guardé.
US-26  Pegar un README y que DevDeck genere resumen + comandos detectados.
US-27  Preguntarle a DevDeck: "¿qué tools tengo para debugging en Go?".
US-28  Guardar un repo de Go y que DevDeck sugiera linkear mi cheatsheet de Go.
```

### Ola 4 — Web + Auth ✅
### Ola 7 — Multiusuario + Sync
```
US-29  Usar DevDeck en desktop y en browser con los mismos datos.
US-30  Agregar un item offline y que se sincronice cuando vuelva la conexión.
US-31  Armar un deck curado y compartir el link con un colega.
US-32  Importar un deck de otro dev y tener sus items en mi colección.
```

### Ola 5 — Items generales + IA
```
US-22  Pegar la URL de un CLI/plugin/artículo y que DevDeck
       detecte automáticamente el tipo y lo categorice.
US-23  La IA me propone tags y un resumen de por qué es útil
       el item que acabo de guardar.
US-24  Buscar "tools para agents en terminal" y encontrar items
       relevantes aunque no haya usado esa frase exacta en los tags.
US-25  Al ver un repo, ver sugerencias de items relacionados
       (cheatsheets, otros repos, CLIs del mismo stack).
US-26  Preguntarle a DevDeck "¿qué tools tengo para Go?"
       y recibir una respuesta basada en MI vault.
US-27  Guardar un shortcut de macOS como item, con descripción
       de cuándo usarlo.
US-28  Agregar el campo "por qué lo guardé" al crear cualquier item.
```

### Ola 6 — Offline-first + Sync + Multi-usuario
```
US-29  Agregar un repo sin conexión a internet; que se sincronice
       solo cuando vuelva la red.
US-30  Ver toda mi colección offline: buscar, copiar comandos,
       leer notas — todo sin necesitar conexión.
US-31  Usar DevDeck en mi Mac y en mi PC con la misma cuenta;
       cambios de un lado aparecen en el otro.
US-32  Crear un "deck" curado de herramientas y compartir el link
       con un colega.
US-33  Recibir el link de un deck, verlo y agregar los items que
       me interesan a mi vault.
US-34  Ver qué cambios están pendientes de sincronizar.
```

---

## 8. Métricas de éxito

| Métrica | Target MVP | Target Ola 5-6 |
|---------|------------|----------------|
| Items guardados primer mes | ≥ 30 | ≥ 100 (repos + CLIs + shortcuts) |
| Días que abro la app por semana | ≥ 4 | ≥ 5 |
| Tiempo desde "abro la app" a "agrego un item" | < 10s | < 5s (quick capture) |
| Items viejos redescubiertos vía discovery mode | ≥ 5 / semana | ≥ 10 / semana |
| Búsquedas que terminan en "encontré lo que buscaba" | — | ≥ 80% |
| Veces que pierdo un item por NO usar la app | 0 | 0 |
| Items con auto-summary aceptado sin editar | — | ≥ 70% |
| Métrica | Target |
|---------|--------|
| Items guardados primer mes | ≥ 50 (repos + CLIs + shortcuts + prompts) |
| Tipos de items distintos guardados | ≥ 5 tipos en uso |
| Días que abro la app por semana | ≥ 4 |
| Tiempo desde "abro la app" a "agrego un item" | < 10s (quick capture) |
| Items redescubiertos vía discovery / forgotten gems | ≥ 5 / semana |
| Búsquedas semánticas que encuentran el item correcto | ≥ 80% precisión subjetiva |
| Veces que pierdo algo por NO usar la app | 0 |

---

## 9. Constraints

- **Plataformas:** Electron (Mac, Win, Linux) + Web (Vue/PWA). Mobile en roadmap futuro.
- **Offline-first:** la app funciona sin red. Sync es eventual, no bloqueante.
- **Idioma UI:** Español (rioplatense, casual) — toggle inglés en v2
- **Performance:** lista con 500 items debe renderizar en < 200ms; búsqueda < 100ms; búsqueda semántica < 500ms
- **Privacidad IA:** opt-in para enviar contenido a LLMs externos; opción de LLM local (Ollama) para usuarios que lo prefieran
- **Datos locales:** el usuario siempre puede exportar su vault completo en JSON

---

## 8. Decisiones de producto explícitas

1. **MVP (Ola 1): token estático.** Solo Electron. Auth real llega con Ola 4. ✅
2. **Web (Ola 4): GitHub OAuth + allowlist.** JWT de 30 días. Cero passwords. ✅
3. **La mascota NO es opcional en MVP.** Toggle off llega en v1.1 si molesta. ✅
4. **Discovery mode es feature de primera clase.** ✅
5. **Notas y descripciones son markdown**, no rich text. ✅
6. **Sin categorías jerárquicas** — solo tags planos. ✅
7. **Sin favoritos** — si está acá, ya es favorito. ✅
8. **Comandos por repo y cheatsheets son entidades SEPARADAS pero VINCULABLES.** ✅
9. **Vue para web (no React).** Decisión deliberada: explorar otro framework. ✅
10. **Mismo backend Go para Electron y Web.** Mismo contrato REST. ✅
11. **Offline-first con SQLite local.** Toda operación CRUD se escribe localmente primero; sync es eventual. El usuario nunca espera la red para operar.
12. **IA como utilidad, no como chatbot.** Cuatro funciones concretas: auto-tagging, auto-summary, búsqueda semántica, items relacionados. Sin asistente decorativo.
13. **Items, no solo repos.** El modelo de datos se extiende para soportar CLIs, plugins, shortcuts, snippets, agentes, prompts, artículos, notas y workflows. Los repos siguen siendo el tipo principal.
14. **Multi-usuario con vaults aislados.** Cada usuario tiene su propio vault. Sharing es por decks explícitos, no por vault completo.
15. **Opt-in para IA cloud.** Por default, solo se envían título + descripción al LLM. El usuario puede ampliar el contexto (README, notas). Opción de LLM local (Ollama) documentada.
- **Plataformas:** Electron (Windows/macOS/Linux) + Web (Vue 3) — misma API
- **Offline-first:** funciona sin conexión; sync en background
- **Idioma UI:** Español (rioplatense) — opción inglés en v2
- **Performance:** lista con 1000 items en < 200ms; búsqueda semántica en < 500ms
- **IA opt-in:** ninguna llamada a APIs externas sin consentimiento explícito del usuario
- **Privacy:** el usuario elige qué API key usar; opción de IA local con Ollama

---

## 10. Decisiones de producto explícitas

1. **El modelo central pasa de `Repo` a `Item`** con `item_type`. Los repos son un tipo especial con enrichment GitHub.
2. **La IA justifica el `.ai`** solo si hace cosas útiles concretas: clasificar, resumir, recuperar, sugerir.
3. **Sin chatbot genérico.** "Ask DevDeck" habla sobre TU base de conocimiento, no sobre el mundo en general.
4. **Offline-first es no negociable.** La app funciona sin conexión; sync es bonus.
5. **Multi-device antes que multi-user.** El mismo usuario en múltiples dispositivos es más urgente.
6. **Quick capture es prioridad.** Guardar en < 3s; la IA completa después.
7. **La mascota NO es opcional en MVP.** Toggle disponible en settings.
8. **Discovery mode se expande** a todos los tipos de items, no solo repos.
9. **Vue para web (no React).** Decisión deliberada del owner — mismo backend.
10. **pgvector antes que servicio externo.** Misma Postgres, menor complejidad operacional.
11. **Embeddings opt-in.** Sin API key configurada, la búsqueda es fuzzy clásica. Con API key, activa semántica.
12. **Decks compartibles son Ola 7**, no antes. Requieren multi-user y auth sólida.

---

## 11. Riesgos de producto

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Mascota se siente gimmick y molesta | Alto | Iterar diseño hasta que sea sutil; toggle off temprano si hace falta |
| Discovery mode se usa 1 vez y nunca más | Medio | Notificación gentil: "tenés 12 items sin ver hace meses" |
| El usuario olvida que existe la app | Crítico | Atajo global en v1.1; system tray; recordatorio de Snarkel |
| Preview pobre en URLs no-GitHub | Bajo | Permitir editar título/descripción manualmente |
| **Cheatsheets se vuelven un cementerio** sin curaduría | Alto en Ola 3 | Seed inicial sólido + UI que muestra "los más usados últimamente" arriba |
| **Comandos por repo se duplican** con cheatsheets globales | Medio | UI clarísima de la diferencia: "comandos de ESTE repo" vs "linkeado: cheatsheet docker" |
| **Auth migración rompe Electron existente** | Alto en Ola 4 | Mantener token estático como fallback durante 1 release; flag `AUTH_MODE=token\|jwt` |
| **OAuth callback en Electron es complejo** | Medio en Ola 4 | Usar `electron-deeplinks` con `devdeck://callback`; documentar bien |
| **Bundle Vue se duplica con Electron** | Bajo | Aceptado: son apps distintas, no comparten código UI (solo design tokens) |
| **Conflictos de sync en multi-device** | Alto en Ola 6 | Last-write-wins por campo al inicio; notificar conflictos; merge manual como fallback |
| **IA genera tags incorrectos o irrelevantes** | Medio en Ola 5 | Tags son siempre sugerencias editables; el usuario acepta/descarta; el rechazo mejora el modelo |
| **Costo de embeddings a escala** | Medio en Ola 5 | Embeber solo al guardar/editar (no en tiempo real); cachear embeddings en DB; evaluar pgvector vs Qdrant |
| **Privacidad: datos sensibles enviados a LLM** | Alto | Opt-in explícito; solo título + descripción por default; docs claros sobre qué se envía |
| IA se siente "mágica pero inútil" | Alto | Cada feature IA resuelve un dolor concreto; nada decorativo |
| Quick capture lenta o con fricción | Alto | Benchmark < 3s; pegar URL = guardar = listo |
| Discovery mode se usa 1 vez y nunca más | Medio | Nudges de mascota; "forgotten gems" prominente |
| La app se siente "demasiado" al expandir tipos | Medio | Filtros claros; onboarding guiado; tipo `repo` sigue siendo el default |
| Sync crea conflictos confusos | Alto en Ola 7 | Last-write-wins al inicio; evitar edición simultánea |
| Embeddings costosos o lentos | Medio | Modelo small por default; cache agresiva; opción local |
| "Ask DevDeck" decepciona si la base está vacía | Medio | Empty state honesto; se activa cuando hay ≥ 20 items |
| Scope creep con tantos tipos de items | Alto | UI con tipos desactivables; tipos avanzados hidden hasta toggle |
