# DevDeck — Product Requirements Document

> Versión: 0.4 · Owner: tfurt · Última actualización: 2026-04-08

---

## 0. Nombre y dominio

**DevDeck** es el nombre definitivo. "Deck" evoca una baraja personal de herramientas: organizada, extensible y curada por el propio developer.

**Dominio:** [devdeck.ai](https://devdeck.ai)

| Subdominio | Propósito |
|------------|-----------|
| `devdeck.ai` | Landing page + marketing + descargas |
| `app.devdeck.ai` | Web app (Vue 3) |
| `api.devdeck.ai` | Backend REST + sync engine |
| `docs.devdeck.ai` | Documentación |
| `download.devdeck.ai` | Descargas de la app desktop |

El `.ai` **no es decorativo**. DevDeck usa IA para clasificar, resumir, recuperar por intención y sugerir items relacionados — haciendo que todo lo que guardás sea **encontrable cuando lo necesitás**. Sin esas funciones, el dominio no estaría justificado.

---

## 1. Visión

> **DevDeck es tu memoria externa asistida por IA para el trabajo de desarrollo.**

Una app **offline-first, multi-usuario y multiplataforma** donde guardar, organizar y redescubrir todo lo útil que un dev encuentra: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agentes, prompts y workflows. Con IA que clasifica, resume y recupera por intención — no por tag exacto.

### Lo que DevDeck ES
- Tu **colección personal** de assets útiles para desarrollar
- Tu **memoria externa** para tools que descubrís pero olvidás
- Tu **launchpad** de comandos, shortcuts y workflows
- Tu **knowledge base curada** con IA que la organiza

### Lo que DevDeck NO ES
- Un bookmark manager genérico (Raindrop / Pocket)
- Un gestor de notas (Notion / Obsidian)
- Un directorio solo de repos (GitHub Stars)
- Un launcher genérico del sistema (Raycast / Alfred)
- Un chatbot de IA general (ChatGPT / Claude)

### Pilares del producto
1. **Items** — cualquier asset de dev: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agentes, prompts, notas, workflows
2. **Contexto operacional** — comandos por item, runbooks, setup notes, notas personales, "por qué lo guardé"
3. **IA útil** — auto-tagging, auto-summary, búsqueda semántica, items relacionados, conversión de contenido a conocimiento
4. **Acceso siempre** — offline-first, multiplataforma (desktop + web), multi-device sync
5. **Redescubrimiento activo** — la app trabaja para que vuelvas a encontrar lo que ya guardaste

---

## 2. Problema

### El dolor real
Los developers descubren herramientas, recursos y técnicas constantemente. El problema no es la falta de buenas herramientas — es que **no se pueden encontrar cuando se las necesita**.

El ciclo doloroso:
1. Alguien recomienda un CLI, repo, plugin o atajo
2. Lo guardás en un chat, un archivo, o lo dejás en una tab del browser
3. Semanas después, cuando el problema relevante aparece, no lo encontrás
4. Si lo encontrás, no recordás para qué servía ni cómo se usaba
5. Terminás googleando de cero algo que ya habías resuelto

No son solo repos. Son:
- CLIs que alguien mencionó en Twitter/X y nunca probaste
- Plugins de IDE que instalaste y olvidaste por qué
- Atajos de macOS / VS Code que nunca internalizaste
- Prompts para AI coding que funcionaron una vez
- Workflows de terminal que construiste y perdiste
- Comandos de setup que siempre buscás en Google

### Por qué las alternativas actuales fallan

| Solución | Por qué falla |
|----------|---------------|
| Bookmarks del browser | Sin contexto, sin preview rico, sin tags propios, sin búsqueda semántica |
| GitHub Stars | Solo repos de GitHub, sin CLIs / plugins / shortcuts / snippets; sin notas personales |
| Notion / Apple Notes | Trabajo manual total: copy/paste, sin metadata automática, sin IA, sin sync inteligente |
| Raindrop / Pocket | Genéricos, sin foco en devs, sin comandos ni cheatsheets |
| ChatGPT | No recuerda lo que guardaste; no es tu colección personal |

### El problema de fondo
> **El conocimiento útil para developers se pierde demasiado fácil y se recupera demasiado mal.**

---

## 3. Usuarios objetivo

### Primario
Developer activo que descubre muchas herramientas, trabaja en múltiples stacks y quiere una app que se vuelva más valiosa a medida que agrega items.

Perfiles típicos:
- Devs full-stack que cambian de stack con frecuencia
- Devs de AI/LLM que acumulan prompts, skills y agentes
- Platform engineers con stacks de infraestructura complejos
- DevRel y tech leads que curan colecciones para su equipo
- Builders curiosos que experimentan con muchas tools

### Secundario (post Ola 7)
Equipos de desarrollo que quieren compartir una colección curada de herramientas, comandos y cheatsheets.

### No-objetivos
- Usuarios no técnicos
- Project managers (gestión de tareas o proyectos)
- Reemplazo de wikis de equipo con permisos complejos

---

## 4. Tipos de items

La entidad central es `Item`. Los repos son un tipo de item, pero ya no el único.

| Tipo | `item_type` | Descripción | Ejemplo |
|------|------------|-------------|---------|
| **Repo** | `repo` | GitHub/GitLab/cualquier repo | `tiangolo/fastapi`, `supabase/supabase` |
| **CLI** | `cli` | Herramienta de línea de comandos | `jq`, `fzf`, `lazygit`, `gh`, `zoxide` |
| **Plugin** | `plugin` | Plugin de IDE, editor o app | GitHub Copilot, Neovim `telescope`, `vim-surround` |
| **Prompt / Skill** | `prompt` | Prompt de AI coding, MCP skill, custom instruction | "Actúa como senior Go dev..." |
| **Agente** | `agent` | Agente autónomo, workflow de LLM, MCP tool | Coding agent, research agent |
| **Cheatsheet** | `cheatsheet` | Referencia rápida de comandos por tema | Git, Docker, kubectl |
| **Shortcut** | `shortcut` | Atajo de teclado o gesture | macOS Mission Control, VS Code multi-cursor |
| **Workflow** | `workflow` | Secuencia de pasos o comandos para una tarea | Deploy flow, debug session, setup local |
| **Snippet** | `snippet` | Fragmento de código reutilizable | One-liner de bash, función de JS |
| **Nota** | `note` | Nota de decisión, gotcha, contexto operacional | "Por qué elegimos sqlc sobre gorm" |
| **Tool** | `tool` | App de escritorio / web dev tool | Postico, TablePlus, Insomnia, Warp |
| **Article** | `article` | Link a doc, post, RFC o tutorial | Blog post, RFC, tutorial |

Cada tipo tiene metadata específica además de los campos comunes. Los repos siguen siendo el tipo con enriquecimiento más rico (GitHub API, README, stars, etc.).

---

## 5. Funcionalidades por ola

El producto crece en **olas**, cada una con valor independiente y entregable.

---

### 🌊 Olas 1–4 — MVP + Web + Auth ✅ Completas

Ver [ROADMAP.md](../ROADMAP.md) para el detalle técnico completo de implementación.

#### Ola 1 — MVP Core ✅
| Feature | Descripción |
|---------|-------------|
| Add repo | Pegar URL → backend resuelve metadata automáticamente |
| Lista / grid | Cards visuales con preview rico (avatar, stars, lenguaje, topics, og:image) |
| Búsqueda fuzzy | Búsqueda por nombre, descripción y tags (`pg_trgm`) |
| Filtros | Por lenguaje, tag, archivado/activo |
| Tags personales | Etiquetado libre por el usuario |
| Notas markdown | Nota personal por repo |
| Acciones | Abrir en browser, copiar URL, copiar `git clone`, compartir, archivar, borrar |
| Mascota Snarkel | Axolotl con 5 estados de ánimo, frases en rioplatense, discovery mode |
| Discovery mode | Pantalla swipe para redescubrir repos guardados |
| Deploy | Docker multi-stage, Caddy TLS automático |

#### Ola 2 — Repo Detail + Comandos ✅
| Feature | Descripción |
|---------|-------------|
| Vista de detalle | README rendereado, stats, topics, languages bar, quick links GitHub |
| Comandos por repo | Label, command, description, category; click = copiar al clipboard |
| Reordenar comandos | Drag & drop con dnd-kit |
| Importar desde `package.json` | Sugerir importar `scripts` de repos Node automáticamente |

#### Ola 3 — Cheatsheets globales ✅
| Feature | Descripción |
|---------|-------------|
| Pestaña Cheatsheets | Sección top-level: lista con título, categoría, icono y color |
| Entries | Colección de comandos: label, command, description, tags |
| Búsqueda global | Cross-entity (repos + cheatsheets + entries), `Ctrl+K` |
| Cheatsheets seed | git, docker, npm, pnpm, vim, tmux, ssh, find, grep, kubectl, gh CLI |
| CRUD propio | El usuario puede agregar y editar sus propios cheatsheets |

#### Ola 4 — Web + Auth real ✅
| Feature | Descripción |
|---------|-------------|
| Cliente web Vue 3 | Vue 3 + Vite + TypeScript + Pinia + Vue Router; mismo backend Go |
| GitHub OAuth | "Sign in with GitHub" → JWT de 30 días; allowlist de usernames |
| JWT en Electron | OAuth via deeplink callback; safeStorage para tokens |
| Refresh tokens | Refresh token de 90 días, rotación automática |
| Paridad de features | Repos, commands, cheatsheets, discovery mode y mascota en Vue |

---

### 🌊 Ola 5 — Items generales + Features de utilidad

Esta ola convierte DevDeck de "directorio de repos" a **knowledge OS para developers**.

#### 5.1 Modelo de items extendido

| # | Feature | Descripción |
|---|---------|-------------|
| I1 | **Tipos de item** | Campo `item_type`: `repo`, `cli`, `plugin`, `prompt`, `agent`, `shortcut`, `snippet`, `workflow`, `note`, `tool`, `article`. Repos siguen siendo el tipo con enriquecimiento más rico |
| I2 | **Guardar item genérico** | Pegar URL o texto → se detecta el tipo automáticamente → se enriquece según tipo |
| I3 | **Campo "por qué lo guardé"** | Campo `why_saved` visible y editable al guardar y en el detalle |
| I4 | **Campo "cuándo usarlo"** | Campo `when_to_use` opcional: contexto de uso (debugging, deploy, onboarding…) |
| I5 | **Quick capture** | Agregar item en < 5 segundos: pegar URL → save → IA completa metadata en background |
| I6 | **Stack field** | Campo `stack`: Go, Node, Python, macOS, Docker, AI, etc. — para filtrado y recuperación |

#### 5.2 Comandos y runbooks

| # | Feature | Descripción |
|---|---------|-------------|
| C1 | **Commands per item** | No solo repos — cualquier item puede tener comandos asociados. Click = copiar al clipboard |
| C2 | **Runbooks** | Checklists de pasos por item: "Cómo levantar local", "Deploy", "Debug", "Reset DB" |
| C3 | **Plantillas de runbook por stack** | Plantillas predefinidas: Node, Go, Rails, Python, Docker |
| C4 | **Setup notes** | Notas de instalación/configuración por item |
| C5 | **Troubleshooting tips** | Sección de problemas conocidos + soluciones por item |
| C6 | **Import desde README** | Detectar secciones "Getting started" / "Installation" del README y proponer convertirlas en pasos |

#### 5.3 Vistas de redescubrimiento

| # | Feature | Descripción |
|---|---------|-------------|
| V1 | **Vistas por tipo** | Filtrar por: Repos / CLIs / Plugins / Shortcuts / Prompts / Agentes / Workflows / etc. |
| V2 | **Vistas por stack** | Ver todo lo guardado para Go, React, Docker, macOS, AI tools... |
| V3 | **Vistas por use case** | "Debugging", "deploy", "productividad terminal", "AI coding" |
| V4 | **"Forgotten gems"** | Items con `last_seen_at > 30 días` — redescubrimiento activo; la mascota nudgea |
| V5 | **"Recently saved"** | Timeline de lo último guardado |
| V6 | **Discovery mode extendido** | Swipe/Tinder para todos los tipos de items, no solo repos |

#### 5.4 Cross-linking y contextualización

| # | Feature | Descripción |
|---|---------|-------------|
| CL1 | **Linking entre items** | Desde un repo: ver CLIs, plugins y cheatsheets relacionados guardados por el usuario |
| CL2 | **Cross-linking bidireccional** | Desde un CLI: ver repos que lo usan, cheatsheets del mismo stack |
| CL3 | **Command Palette global** | `Cmd/Ctrl+K`: buscar item → ejecutar acción (copiar clone, abrir en IDE, correr comando) |
| CL4 | **One-click setup (Electron)** | Detectar repo clonado localmente, "Open in IDE", "Open Terminal here", checklist de prerrequisitos |

---

### 🌊 Ola 6 — IA real que justifica `.ai`

La IA en DevDeck tiene un trabajo concreto: **memoria, organización y recuperación**. No es un chatbot genérico.

#### Regla de diseño
La IA **siempre propone, el usuario siempre aprueba**. Auto-tags son sugerencias editables. Opt-in para enviar contenido a LLMs externos. Opción de modelo local con Ollama.

#### Features de IA

| # | Feature | Por qué importa | Implementación |
|---|---------|----------------|---------------|
| AI1 | **Auto-summary** | Resuelve "¿por qué guardé esto?": qué es, para qué sirve, cuándo usarlo, stack que toca | LLM con README + descripción → resumen corto (150 palabras máx) |
| AI2 | **Auto-tagging y categorización** | Elimina trabajo manual: detecta tipo, stack, propósito y nivel automáticamente | LLM con contexto del item (URL, título, descripción, README snippet) → tags + tipo sugerido |
| AI3 | **Búsqueda semántica por intención** | Buscar "tools para agents en terminal" y encontrar items relevantes aunque no coincida el texto exacto | Embeddings de título + descripción + summary + notas; búsqueda vectorial (`pgvector`); fallback a búsqueda fuzzy existente |
| AI4 | **Items relacionados automáticos** | Al ver un item, sugerir repos similares, cheatsheets relevantes, comandos del mismo stack | Similitud de embeddings; mostrar en sidebar del detalle |
| AI5 | **Content → Knowledge** | Pegar URL / README / tweet / doc → genera resumen, tags, comandos detectados, prerrequisitos; "Guardar como cheatsheet / runbook / item" | Pipeline: fetch content → LLM extract → structured output → save draft |
| AI6 | **Ask DevDeck** | Consultas en lenguaje natural sobre TU vault: "¿Qué tools tengo para agentes?", "¿Qué guardé para Go?" | RAG sobre el vault del usuario; responde solo sobre los datos del usuario, no sobre el mundo en general |
| AI7 | **Runbook sugerido** | Para repos GitHub: detectar secciones del README y proponer convertirlas en pasos de runbook | LLM lee README, identifica secciones de setup/install/usage, genera checklist |
| AI8 | **Cheatsheet sugerido** | Al guardar un CLI/tool, sugerir crear o linkear cheatsheet relevante | Detección de tipo CLI/tool → prompt para crear/linkear cheatsheet |

#### Stack técnico IA

- **Embeddings:** OpenAI `text-embedding-3-small` o modelo local (Ollama)
- **Vector store:** extensión `pgvector` en Postgres (misma DB, mínima complejidad operacional)
- **Búsqueda híbrida:** `pg_trgm` (fuzzy text) + pgvector (semántica), fusionados por RRF
- **Generación:** OpenAI GPT-4o-mini (resúmenes, tags, runbooks) — opt-in con API key del usuario
- **Privacidad:** opt-in explícito; qué se envía a la API se muestra en UI; opción local-only con Ollama

#### Qué NO hace la IA en DevDeck
- ❌ Chat genérico "pregúntame lo que sea"
- ❌ Generación de contenido que el usuario no pidió
- ❌ Asistente mascotita hablando sin utilidad concreta
- ❌ Features de IA que no mejoran discoverability o recall

---

### 🌊 Ola 7 — Offline-first + Sync + Multi-usuario

Esta ola hace de DevDeck un producto multi-device y potencialmente colaborativo.

#### 7.1 Offline-first

| # | Feature | Descripción |
|---|---------|-------------|
| OF1 | **SQLite local** | Base de datos local en el cliente (Electron: archivo en `userData`; Web: IndexedDB o SQLite WASM) |
| OF2 | **Cola de cambios local** | Toda operación CRUD se escribe local primero; se encola para sync con el backend |
| OF3 | **Funcionamiento offline completo** | Agregar, editar, buscar, copiar comandos — todo offline |
| OF4 | **Indicador de estado de sync** | UI muestra: "Sincronizado" / "X cambios pendientes" / "Sin conexión" |
| OF5 | **Cache de metadata** | Metadata de repos/items se cachea localmente; se refresca cuando hay red |
| OF6 | **Sync selectivo** | El usuario puede marcar items como "solo local" (no se sincronizan con el servidor) |

#### 7.2 Sync engine

| # | Feature | Descripción |
|---|---------|-------------|
| SY1 | **Sync on reconnect** | Al recuperar red, el cliente envía la cola de cambios al backend en orden |
| SY2 | **Resolución de conflictos** | Last-write-wins por campo (con `updated_at`); en colisión, notifica al usuario |
| SY3 | **Multi-device** | El mismo usuario puede usar Electron en Mac, Electron en Win y Web simultáneamente |

#### 7.3 Multi-usuario

| # | Feature | Descripción |
|---|---------|-------------|
| MU1 | **Vault por usuario** | Cada usuario tiene su propio vault aislado en el backend |
| MU2 | **Decks compartibles** | Colección curada de items compartible via link público (`devdeck.ai/deck/slug`) |
| MU3 | **Importar decks** | Ver deck de alguien → importar items que te interesan a tu vault |
| MU4 | **Open Graph de decks** | Links de decks con preview rico (título, descripción, primeros 3 items) |
| MU5 | **Perfil público** | Página pública `devdeck.ai/@username` con decks públicos del usuario |

#### Arquitectura multi-device / multi-user

```
Desktop (Electron)        Web (browser)
SQLite local   ←───────→  api.devdeck.ai  ←───→  Postgres + pgvector (VPS)
cola de sync              Go + Chi                pg_trgm + embeddings cache
```

---

### 4.X Out of scope (futuro)

- Stats dashboard / achievements / streaks
- Importar masivo desde GitHub stars / CSV / OPML
- Backup/export JSON completo (v2)
- Mobile app nativa (iOS / Android)
- Billing / planes pagos (v3+)
- Integraciones IDE (extensión VS Code, plugin JetBrains)

---

## 6. Features de utilidad práctica

### Runbooks por item
Cada item puede tener un **runbook**: checklist de pasos + comandos + notas + links.
- Tipos predefinidos: "Levantar local", "Deploy", "Debug", "Reset DB", "Seed data"
- Plantillas por stack: Node, Go, Rails, Python, Docker
- Import automático desde README (secciones "Getting started" / "Installation")

### Command Palette global
- `Cmd/Ctrl+K`: buscar item → ejecutar acción
- Acciones disponibles: copiar clone, abrir en browser, abrir en IDE, correr comando guardado, ver cheatsheet
- Acciones contextuales por stack (si detecta Node, sugiere `pnpm dev`)

### One-click setup (Electron)
- Detectar si el repo está clonado localmente (vincular path)
- **Open in IDE** (VS Code / JetBrains) + **Open Terminal here**
- **Copy env template** (`.env.example → .env`) + checklist de prerrequisitos
- Si hay `docker-compose.yml`: ofrecer comandos típicos automáticamente

### Rediscovery activo
- Nudges de Snarkel: "Tenés 12 items sin ver hace más de un mes"
- Vista "Forgotten gems" — items con `last_seen_at > 30 días`
- Discovery mode expandido a todos los tipos de items

### Cross-linking semántico
- Desde un repo: ver CLIs, plugins y cheatsheets relacionados
- Desde un CLI: ver repos que lo usan, cheatsheets del mismo stack
- Auto-sugerencia de links basada en IA y tags compartidos

### Quick capture
- Guardar en < 3 segundos: pegar URL → presionar Enter → listo
- La IA completa el contexto en background, sin bloquear el flujo
- Quick capture funciona offline (se sincroniza cuando hay red)

---

## 7. User stories

### Olas 1–4 (completas)
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

### Ola 5 — Items generales + Utilidad
```
US-14  Guardar un CLI (ej: "fzf") con descripción y comandos propios.
US-15  Guardar un prompt de AI coding con notas de cuándo usarlo.
US-16  Guardar un atajo de macOS con descripción de qué hace.
US-17  Guardar un workflow de deploy con pasos ordenados.
US-18  Ver todos mis items de tipo "CLI" filtrados.
US-19  Ver todos mis items del stack "Go".
US-20  Quick capture: pegar URL, presionar Enter, guardar en < 3s.
US-21  Ver items no abiertos hace más de 30 días (forgotten gems).
US-22  Crear un runbook para un repo: "Levantar local", "Deploy", "Debug".
US-23  Ver comandos de un item con click-to-copy.
US-24  Linkear un cheatsheet de Docker desde un repo que usa Docker.
```

### Ola 6 — IA
```
US-25  Guardar un repo y que DevDeck proponga automáticamente un resumen de para qué sirve.
US-26  Guardar un item y que DevDeck sugiera tags, tipo y stack automáticamente.
US-27  Buscar "herramientas para agents en terminal" y encontrar items relevantes.
US-28  Ver un repo y que DevDeck muestre "items relacionados" de mi colección.
US-29  Pegar un README y que DevDeck genere resumen + comandos detectados + runbook sugerido.
US-30  Preguntarle a DevDeck: "¿qué tools tengo para debugging en Go?".
US-31  Guardar un repo de Go y que DevDeck sugiera linkear mi cheatsheet de Go.
US-32  Pegar una URL de documentación y que DevDeck la convierta en cheatsheet.
```

### Ola 7 — Offline-first + Multi-usuario
```
US-33  Usar DevDeck en desktop y en browser con los mismos datos.
US-34  Agregar un item offline y que se sincronice cuando vuelva la conexión.
US-35  Ver indicador de cuántos cambios están pendientes de sync.
US-36  Armar un deck curado y compartir el link con un colega.
US-37  Importar un deck de otro dev y tener sus items en mi colección.
US-38  Marcar un item como "solo local" para que no se sincronice.
```

---

## 8. Métricas de éxito

| Métrica | Target Olas 1–4 | Target Olas 5–7 |
|---------|----------------|----------------|
| Items guardados primer mes | ≥ 30 repos | ≥ 100 (repos + CLIs + shortcuts + prompts) |
| Tipos de items distintos en uso | — | ≥ 5 tipos diferentes |
| Días que abro la app por semana | ≥ 4 | ≥ 5 |
| Tiempo desde "abro la app" a "agrego un item" | < 10s | < 5s (quick capture) |
| Items redescubiertos vía discovery / forgotten gems | ≥ 5 / semana | ≥ 10 / semana |
| Búsquedas que terminan en "encontré lo que buscaba" | — | ≥ 80% |
| Items con auto-summary aceptado sin editar | — | ≥ 70% |
| Veces que pierdo algo por NO usar la app | 0 | 0 |

---

## 9. Constraints técnicos y de producto

- **Plataformas:** Electron (Mac, Win, Linux) + Web (Vue 3 / PWA). Mobile en roadmap futuro.
- **Offline-first:** la app funciona sin red. Sync es eventual, no bloqueante.
- **Idioma UI:** Español rioplatense (casual) — toggle inglés disponible en v2 desde settings.
- **Performance:** lista con 1.000 items en < 200ms; búsqueda fuzzy < 100ms; búsqueda semántica < 500ms.
- **IA opt-in:** ninguna llamada a APIs externas sin consentimiento explícito del usuario. Por default, solo se envían título + descripción al LLM.
- **Privacidad:** el usuario elige qué API key usar; opción de IA local con Ollama; siempre visible qué se envía.
- **Datos locales:** el usuario puede exportar su vault completo en JSON en cualquier momento.
- **Auth:** GitHub OAuth + JWT de 30 días + refresh token de 90 días. Sin passwords.

---

## 10. Decisiones de producto explícitas

1. **El modelo central pasa de `Repo` a `Item`** con `item_type`. Los repos son un tipo especial con enriquecimiento GitHub (README, stars, topics, etc.).
2. **La IA justifica el `.ai`** solo si hace cosas útiles concretas: clasificar, resumir, recuperar, sugerir. Sin chatbot decorativo.
3. **"Ask DevDeck" habla sobre TU base de conocimiento**, no sobre el mundo en general. Si responde sobre el mundo, pierde foco y compite con ChatGPT.
4. **Offline-first es no negociable.** La app funciona sin conexión. Sync es bonus, no requisito.
5. **Multi-device antes que multi-user.** El mismo usuario en múltiples dispositivos es más urgente que múltiples usuarios.
6. **Quick capture es prioridad UX.** Guardar en < 3s; la IA completa después. La fricción mínima = más items guardados = app más valiosa.
7. **La mascota NO es opcional en MVP.** Toggle disponible en settings. Snarkel es parte del diferencial de producto.
8. **Discovery mode se expande** a todos los tipos de items en Ola 5 (no solo repos).
9. **Vue para web (no React).** Decisión deliberada del owner — explora ecosistema Vue con el mismo backend Go.
10. **pgvector antes que servicio externo.** Misma Postgres, menor complejidad operacional. Evaluar Qdrant si escala lo requiere.
11. **Embeddings opt-in.** Sin API key configurada, la búsqueda es fuzzy clásica (`pg_trgm`). Con API key, activa búsqueda semántica.
12. **Decks compartibles son Ola 7**, no antes. Requieren multi-user y auth sólida primero.
13. **Comandos por repo y cheatsheets son entidades SEPARADAS pero VINCULABLES.** Los comandos son contextuales a un item; los cheatsheets son referencias globales reutilizables.
14. **Runbooks viven junto al item**, no separados. El conocimiento operacional (cómo se usa una tool) no debería estar en otro sistema.
15. **Tags son planos (no jerárquicos).** Sin categorías anidadas para mantener la captura simple.

---

## 11. Riesgos de producto

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| La mascota se siente gimmick | Alto | Iterar diseño hasta que sea sutil; toggle off temprano si hace falta; Snarkel es opt-out, no opt-in |
| Discovery mode se usa 1 vez y nunca más | Medio | Notificación gentil de Snarkel: "tenés 12 items sin ver hace meses"; forgotten gems como vista permanente |
| El usuario olvida que existe la app | Crítico | Atajo global (system tray en Electron); recordatorio de Snarkel; widget de "item del día" |
| Cheatsheets se vuelven un cementerio | Alto | Seed inicial sólido + UI que muestra "los más usados" arriba; discovery mode para cheatsheets |
| Comandos por repo se duplican con cheatsheets | Medio | UI clarísima: "comandos de ESTE item" vs "cheatsheet global linkeado desde acá" |
| Auth migración rompe Electron existente | Alto | Mantener token estático como fallback; flag `AUTH_MODE=token\|jwt` durante 1 release |
| La IA genera tags incorrectos | Medio | Tags son siempre sugerencias editables; rechazo mejora el modelo; nunca se aplican sin confirmación |
| Costo de embeddings a escala | Medio | Embeber solo al guardar/editar; cachear embeddings en DB; modelo small por default (`text-embedding-3-small`) |
| Datos sensibles enviados al LLM | Alto | Opt-in explícito; solo título + descripción por default; docs claros sobre qué se envía; opción Ollama local |
| La IA se siente "mágica pero inútil" | Alto | Cada feature IA resuelve un dolor concreto documentado; sin features decorativas |
| Quick capture lenta o con fricción | Alto | Benchmark < 3s obligatorio; pegar URL = guardar = listo; IA no bloquea el guardado |
| Discovery mode se usa 1 vez y nunca más | Medio | Nudges de mascota; forgotten gems prominente; notificaciones periódicas |
| La app se siente "demasiado" al expandir tipos | Medio | Filtros claros; onboarding guiado; tipo `repo` sigue siendo el default; tipos avanzados en toggle |
| Sync crea conflictos confusos en multi-device | Alto | Last-write-wins al inicio; evitar edición simultánea del mismo campo; UI de conflictos claro |
| "Ask DevDeck" decepciona si la base está vacía | Medio | Empty state honesto: se activa cuando hay ≥ 20 items; sugerencia de qué guardar primero |
| Scope creep con tantos tipos de items | Alto | UI con tipos desactivables; tipos avanzados hidden hasta toggle; roadmap claro de qué va en cada ola |

---

## 12. Roadmap de posicionamiento

| Fase | Posicionamiento | Feature clave |
|------|----------------|---------------|
| **Olas 1–4 (completas)** | "Directorio visual de repos con cheatsheets" | Preview rico, commands, cheatsheets, web client, GitHub OAuth |
| **Ola 5** | "Knowledge OS para devs" | Multi-tipo items, runbooks, quick capture, forgotten gems, cross-linking |
| **Ola 6** | "Tu memoria dev asistida por IA" | Auto-summary, auto-tags, semantic search, Ask DevDeck |
| **Ola 7** | "Tu knowledge base dev, en todos tus dispositivos" | Offline-first real, multi-device sync, decks compartibles |

---

*Para el roadmap técnico detallado de Olas 5–7, ver [TECHNICAL_ROADMAP_AI_OFFLINE.md](TECHNICAL_ROADMAP_AI_OFFLINE.md).*
*Para el análisis competitivo completo, ver [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md).*
*Para la visión de producto y posicionamiento, ver [VISION.md](VISION.md).*
*Para el copy de la landing page, ver [LANDING_COPY.md](LANDING_COPY.md) (español) y [LANDING.md](LANDING.md) (inglés).*
