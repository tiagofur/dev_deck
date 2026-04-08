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

---

## 4. Scope por fases

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

| # | Feature | Descripción |
|---|---------|-------------|
| P1 | **Mascota animada** | Personaje en esquina con 4–5 estados (idle, happy, sleeping, judging, celebrating) |
| P2 | **Modo descubrimiento** | Vista fullscreen tipo Tinder para revisitar repos olvidados |

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

---

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

---

## 5. User stories

### Ola 1 — MVP ✅
```
US-01  Pegar URL de GitHub y que resuelva metadata sola.
US-02  Ver mis repos como cards con preview rico.
US-03  Búsqueda fuzzy por nombre, descripción y tags.
US-04  Tags personales por repo.
US-05  Notas markdown personales por repo.
US-06  Open in browser, copy clone, share, archive, delete.
US-07  Modo descubrimiento para reencontrar repos olvidados.
US-08  Mascota con personalidad que reacciona a mi uso.
```

### Ola 2 — Repo Detail + Comandos ✅
```
US-09  Click en una card abre vista detalle con TODO: README,
       stats, contributors, links a issues/PRs/releases.
US-10  En el detalle, agregar mis propios comandos
       (`pnpm dev`, `make migrate`, etc.) con label y descripción.
US-11  Click en un comando lo copia al clipboard al instante.
US-12  Reordenar mis comandos por drag & drop.
US-13  Linkear un repo a cheatsheets globales relevantes.
```

### Ola 3 — Cheatsheets ✅
```
US-14  Pestaña 'Cheatsheets' con colecciones por tema.
US-15  Buscar 'rebase' y encontrar el comando aunque no
       recuerde si está en mi cheatsheet de git o en algún repo.
US-16  Cheatsheets pre-cargados al instalar (git, docker, npm…).
US-17  Crear cheatsheets propios con markdown.
```

### Ola 4 — Web + Auth ✅
```
US-18  Acceder a mi vault desde cualquier browser.
US-19  Login con GitHub, sin passwords.
US-20  Mi sesión persiste 30 días, refresh automático.
US-21  Si alguien que NO soy yo intenta loguear, queda fuera.
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

## 6. Métricas de éxito

| Métrica | Target MVP | Target Ola 5-6 |
|---------|------------|----------------|
| Items guardados primer mes | ≥ 30 | ≥ 100 (repos + CLIs + shortcuts) |
| Días que abro la app por semana | ≥ 4 | ≥ 5 |
| Tiempo desde "abro la app" a "agrego un item" | < 10s | < 5s (quick capture) |
| Items viejos redescubiertos vía discovery mode | ≥ 5 / semana | ≥ 10 / semana |
| Búsquedas que terminan en "encontré lo que buscaba" | — | ≥ 80% |
| Veces que pierdo un item por NO usar la app | 0 | 0 |
| Items con auto-summary aceptado sin editar | — | ≥ 70% |

---

## 7. Constraints

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

---

## 9. Riesgos de producto

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
