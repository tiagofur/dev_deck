# DevDeck — Product Requirements Document

> Versión: 0.2 · Owner: tfurt · Última actualización: 2026-04-07

---

## 0. Naming (a decidir)

El nombre `DevDeck` se queda chico. Esto ya no es solo un cofre de repos — es un **multi-tool de programación**: repos, comandos por repo, cheatsheets globales, eventualmente web. Propuestas:

| Nombre | Vibe | Por qué |
|--------|------|---------|
| **DevDeck** ⭐ | Multi-tool, organizado, divertido | "Deck" sugiere baraja de herramientas + es corto, .com probablemente caro pero el subdominio importa más |
| **Toolbelt** | Práctico, directo | Honesto sobre lo que es; familiar para devs |
| **Stash** | Personal, secreto, git-aware | Referencia a `git stash`, suena a "mi colección personal" |
| **Forge** | Constructivo, fuerte | Donde forjás tu setup; quizás demasiado serio |
| **Quiver** | Tu arsenal de flechas (herramientas) | Distintivo, memorable, encaja con la mascota |

**Recomendado:** **DevDeck** o **Quiver**. Decisión final del owner — mientras tanto el código sigue como `repos_directory` / `repovault` hasta el rename oficial.

---

## 1. Visión

Una app personal donde guardar, organizar y redescubrir las herramientas que un dev usa todos los días: **repositorios** que un amigo te recomendó, **comandos rápidos** para cada uno, y **cheatsheets** universales (git, docker, vim, npm…) que siempre olvidás.

> "Tu multi-tool de programación. Hermoso, divertido, siempre a mano."

No es un bookmark manager. No es Notion. Es un **museo personal de herramientas + un cinturón de utilidades** — diseñado para que **quieras volver a entrar**.

**Pilares del producto:**
1. **Repos** — guardar, preview rico, búsqueda, tags, redescubrimiento
2. **Comandos por repo** — los `npm run X`, `make Y`, `docker Z` que siempre olvidás de cada herramienta
3. **Cheatsheets globales** — comandos universales por categoría (git, docker, OS, lenguajes…)
4. **Acceso desde cualquier lado** — desktop primero, web después

---

## 2. Problema

### El dolor real
1. Conocidos comparten repos útiles en grupos de chat.
2. Si no me los reenvío a mí mismo, los pierdo.
3. Cuando aparece el problema que ese repo solucionaba, ya no me acuerdo de él.
4. Termino sufriendo en cosas que tenían solución hace meses.

### Por qué lo existente no alcanza
| Solución | Por qué falla |
|----------|---------------|
| Bookmarks del browser | No tienen contexto, ni preview rico, ni tags propios, ni búsqueda decente |
| GitHub Stars | Solo sirve para repos de GitHub que tengas que loggear, sin tags personales ni notas |
| Notion / Notes | Trabajo manual: copy/paste, sin metadata automática, feo |
| Raindrop / Pocket | Genéricos, sin foco en repos, sin personalidad |

---

## 3. Usuario objetivo

**Perfil:** Desarrollador (yo). Single-user. Win11. Usa la app a diario, idealmente como "primera parada" cuando recuerda haber visto algo útil.

**No-objetivos:** Multi-tenant. Equipos. Compartir colecciones públicas. Versión web pública. (Todo eso queda para v2+.)

---

## 4. Scope por fases

El producto crece en **3 olas**, cada una con valor independiente.

### 🌊 Ola 1 — MVP (Repos + Personalidad)

#### 4.1.A Core repos (must)

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

#### 4.1.B Personalidad (must)

| # | Feature | Descripción |
|---|---------|-------------|
| P1 | **Mascota animada** | Personaje en esquina con 4–5 estados (idle, happy, sleeping, judging, celebrating) |
| P2 | **Modo descubrimiento** | Vista fullscreen tipo Tinder para revisitar repos olvidados |

**Plataforma Ola 1:** Electron solo. Auth: token estático.

---

### 🌊 Ola 2 — Repo Detail + Comandos por repo

#### 4.2.A Repo Detail Page (must)

| # | Feature | Descripción |
|---|---------|-------------|
| F10 | **Vista de detalle completa** | Click en card → pantalla full con toda la info: README rendereado, stats (stars, forks, issues abiertos, último commit, contributors top), topics, languages bar (% por lenguaje), license, link al issue tracker |
| F11 | **README inline** | Backend trae el README.md vía GitHub API; cliente lo renderiza con `react-markdown` + syntax highlighting |
| F12 | **Quick links GitHub** | Atajos a: Issues, PRs, Releases, Wiki, Discussions, Actions — solo si el repo los tiene |

#### 4.2.B Comandos por repo (must)

| # | Feature | Descripción |
|---|---------|-------------|
| C1 | **Crear comando custom** | Por cada repo, agregar 'cards' de comandos: `label`, `command` (string para copiar), `description` opcional, `category` opcional (`install`, `dev`, `test`, `deploy`, etc.) |
| C2 | **Ejecutar/copiar con un click** | Click → copia al clipboard + toast confirmando. Visualmente: cada comando es un card mini neo-brutalist con botón copy |
| C3 | **Reordenar** | Drag & drop para ordenar los comandos |
| C4 | **Importar desde `package.json`** | Si es repo Node y hay README/package.json detectable, sugerir importar `scripts` automáticamente. (Nice-to-have de la ola.) |
| C5 | **Linkear cheatsheets relevantes** | Desde el detail del repo, "linkear" a cheatsheets globales: "este repo usa pnpm + docker → ver cheatsheets pnpm, docker" |

---

### 🌊 Ola 3 — Cheatsheets globales

| # | Feature | Descripción |
|---|---------|-------------|
| CH1 | **Pestaña Cheatsheets** | Nueva sección top-level: lista de cheatsheets. Cada uno tiene: `title`, `slug`, `category` (`vcs`, `os`, `language`, `framework`, `tool`, `package-manager`, `editor`, etc.), `icon`, `color` |
| CH2 | **Entries dentro del cheatsheet** | Cada cheatsheet es una colección de comandos: `label`, `command`, `description`, `tags`. Markdown soportado en description |
| CH3 | **Búsqueda global de comandos** | Search bar global: tipear "rebase" busca en cheatsheets + comandos por repo |
| CH4 | **Cheatsheets curados pre-cargados** | Seed inicial: git, docker, npm, pnpm, vim, tmux, ssh, find, grep, kubectl, gh CLI… (~10 al instalar) |
| CH5 | **Crear/editar/borrar propios** | El usuario puede agregar sus propios cheatsheets y entries. Markdown editor inline |
| CH6 | **Compartir cheatsheet** | Exportar a JSON/markdown para compartir con colegas (post-MVP de la ola) |

---

### 🌊 Ola 4 — Web + Auth real

| # | Feature | Descripción |
|---|---------|-------------|
| W1 | **Cliente web Vue 3** | Vue 3 + Vite + TypeScript + Pinia + Vue Router. Comparte el backend Go. Mismo design system (tokens CSS) |
| W2 | **GitHub OAuth login** | "Sign in with GitHub" → backend valida que el username esté en allowlist (vos) → emite JWT de 30 días |
| W3 | **Migración Electron a JWT** | Electron ahora también usa JWT en vez de token estático: en primer arranque, abre browser para OAuth (electron deeplink callback) |
| W4 | **Refresh tokens** | Refresh token de 90 días, rotación automática |
| W5 | **Logout / sesión** | Endpoint para invalidar; UI para ver sesiones activas (post-MVP de la ola) |

**Por qué Vue y no React (otra vez):** explorar otro framework, evitar code reuse fácil entre clientes (mejor disciplina API), y porque el owner quiere experimentar.

---

### 4.X Out of scope (post Ola 4)

- Stats dashboard / achievements / streaks visibles
- Importar masivo desde GitHub stars / CSV / OPML
- Backup/export JSON manual
- Atajos globales del SO (Cmd+Shift+R desde cualquier app)
- Compartir colecciones públicas
- Mobile app
- Multi-user real (más de 1 username en allowlist)
- AI: "explicame este comando", sugerencia de cheatsheets, etc.

---

## 5. User stories

### Ola 1 — MVP
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

### Ola 2 — Repo Detail + Comandos
```
US-09  Click en una card abre vista detalle con TODO: README,
       stats, contributors, links a issues/PRs/releases.
US-10  En el detalle, agregar mis propios comandos
       (`pnpm dev`, `make migrate`, etc.) con label y descripción.
US-11  Click en un comando lo copia al clipboard al instante.
US-12  Reordenar mis comandos por drag & drop.
US-13  Linkear un repo a cheatsheets globales relevantes.
```

### Ola 3 — Cheatsheets
```
US-14  Pestaña 'Cheatsheets' con colecciones por tema.
US-15  Buscar 'rebase' y encontrar el comando aunque no
       recuerde si está en mi cheatsheet de git o en algún repo.
US-16  Cheatsheets pre-cargados al instalar (git, docker, npm…).
US-17  Crear cheatsheets propios con markdown.
```

### Ola 4 — Web + Auth
```
US-18  Acceder a mi vault desde cualquier browser.
US-19  Login con GitHub, sin passwords.
US-20  Mi sesión persiste 30 días, refresh automático.
US-21  Si alguien que NO soy yo intenta loguear, queda fuera.
```

---

## 6. Métricas de éxito

| Métrica | Target MVP |
|---------|------------|
| Repos guardados primer mes | ≥ 30 |
| Días que abro la app por semana | ≥ 4 |
| Tiempo desde "abro la app" a "agrego un repo" | < 10s |
| Cantidad de repos viejos redescubiertos vía discovery mode | ≥ 5 / semana |
| Veces que pierdo un repo por NO usar la app | 0 |

---

## 7. Constraints

- **Plataforma primaria:** Windows 11 (instalador `.exe` vía electron-builder)
- **Idioma UI:** Español (rioplatense, casual) — opción de toggle inglés en v2
- **Conexión:** requerida (backend en VPS). Manejar offline con mensaje claro y cache local de la última lista vista
- **Performance:** lista con 500 repos debe renderizar en < 200ms; búsqueda < 100ms

---

## 8. Decisiones de producto explícitas

1. **MVP (Ola 1): token estático.** Solo Electron. Auth real llega con Ola 4.
2. **Web (Ola 4): GitHub OAuth + allowlist.** Único username permitido = el owner. Backend valida y emite JWT. Cero passwords.
3. **La mascota NO es opcional en MVP.** Toggle off llega en v1.1 si molesta.
4. **Discovery mode es feature de primera clase.**
5. **Notas y descripciones son markdown**, no rich text.
6. **Sin categorías jerárquicas** — solo tags planos.
7. **Sin favoritos** — si está acá, ya es favorito.
8. **Comandos por repo y cheatsheets son entidades SEPARADAS pero VINCULABLES.** Un repo puede linkear a 0..N cheatsheets globales. Esto evita la mezcla conceptual y permite reuse.
9. **Vue para web (no React).** Decisión deliberada: explorar otro framework, mejor disciplina de API.
10. **Mismo backend Go para Electron y Web.** El cliente no importa: mismo contrato REST.

---

## 9. Riesgos de producto

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Mascota se siente gimmick y molesta | Alto (rompe la propuesta) | Iterar diseño hasta que sea sutil; toggle off temprano si hace falta |
| Discovery mode se usa 1 vez y nunca más | Medio | Notificación gentil de la mascota: "tenés 12 repos sin ver hace meses" |
| El usuario olvida que existe la app | Crítico | Atajo global en v1.1; recordatorio sutil en system tray |
| Preview pobre en sitios no-GitHub | Bajo | Permitir editar título/descripción manualmente |
| **Cheatsheets se vuelven un cementerio** sin curaduría | Alto en Ola 3 | Seed inicial sólido + UI que muestra "los más usados últimamente" arriba |
| **Comandos por repo se duplican** con cheatsheets globales | Medio | UI clarísima de la diferencia: "comandos de ESTE repo" vs "linkeado: cheatsheet docker" |
| **Auth migración rompe Electron existente** | Alto en Ola 4 | Mantener token estático como fallback durante 1 release; flag `AUTH_MODE=token\|jwt` en backend |
| **OAuth callback en Electron es complejo** | Medio en Ola 4 | Usar `electron-deeplinks` con `repovault://callback`; documentar bien |
| **Bundle Vue se duplica con Electron** | Bajo | Aceptado: son apps distintas, no comparten código UI (solo design tokens) |
