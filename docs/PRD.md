# DevDeck — Product Requirements Document

> Versión: 0.3 · Owner: tfurt · Última actualización: 2026-04-08

---

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
| Bookmarks del browser | Sin contexto dev, sin metadata, sin búsqueda semántica |
| GitHub Stars | Solo repos de GitHub, sin notas propias, sin tags, sin commands |
| Notion / Notes | Trabajo manual puro, sin auto-metadata, no está hecho para devs |
| Raindrop / Pocket | Genérico, sin foco dev, sin commands, sin runbooks |
| Raycast | Launcher, no knowledge base; no guarda contexto largo plazo |
| Obsidian | Excelente para notas, pero no tiene el foco ni features dev-specific |

---

## 3. Usuario objetivo

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

---

## 5. Scope por fases

El producto crece en **olas**. Las olas 1–4 están completas.

---

### 🌊 Olas 1–4 (completadas) — MVP + Web + Auth

Ver [ROADMAP.md](../ROADMAP.md) para detalle completo. Resumen:

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

---

### 🌊 Ola 6 — IA real que justifica `.ai`

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

### Ola 7 — Multiusuario + Sync
```
US-29  Usar DevDeck en desktop y en browser con los mismos datos.
US-30  Agregar un item offline y que se sincronice cuando vuelva la conexión.
US-31  Armar un deck curado y compartir el link con un colega.
US-32  Importar un deck de otro dev y tener sus items en mi colección.
```

---

## 8. Métricas de éxito

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
| IA se siente "mágica pero inútil" | Alto | Cada feature IA resuelve un dolor concreto; nada decorativo |
| Quick capture lenta o con fricción | Alto | Benchmark < 3s; pegar URL = guardar = listo |
| Discovery mode se usa 1 vez y nunca más | Medio | Nudges de mascota; "forgotten gems" prominente |
| La app se siente "demasiado" al expandir tipos | Medio | Filtros claros; onboarding guiado; tipo `repo` sigue siendo el default |
| Sync crea conflictos confusos | Alto en Ola 7 | Last-write-wins al inicio; evitar edición simultánea |
| Embeddings costosos o lentos | Medio | Modelo small por default; cache agresiva; opción local |
| "Ask DevDeck" decepciona si la base está vacía | Medio | Empty state honesto; se activa cuando hay ≥ 20 items |
| Scope creep con tantos tipos de items | Alto | UI con tipos desactivables; tipos avanzados hidden hasta toggle |
