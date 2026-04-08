# DevDeck — Product Requirements Document

> Versión: 1.0 · Owner: tfurt · Última actualización: 2026-04-08

---

## 0. Reposicionamiento del producto

**DevDeck.ai** deja de ser un directorio personal de repos y se convierte en la **memoria externa asistida por IA para desarrolladores**: un lugar donde guardar, organizar y redescubrir cualquier cosa útil para el trabajo diario — repos, CLIs, plugins, atajos, comandos, cheatsheets, workflows, agentes y más — disponible en cualquier dispositivo, incluso sin conexión.

> **"Tu knowledge OS para developers. Guarda todo lo útil. Encuéntralo cuando lo necesitás."**

El dominio `.ai` se justifica porque la inteligencia artificial cumple una función real: clasifica automáticamente, resume el propósito de cada item, permite búsqueda por intención y sugiere contenido relacionado. No hay chat decorativo; la IA trabaja en silencio para que vos no tengas que organizar nada a mano.

---

## 1. Visión

Una app **multiusuario, offline-first y multiplataforma** donde los developers guardan y redescubren todo lo que encuentran útil: repositorios recomendados por amigos, CLIs que descubriste en un hilo de Twitter, plugins para tu IDE, atajos de macOS que nunca recordás, comandos por proyecto, cheatsheets de stack y workflows de equipos.

La IA actúa como curador silencioso: etiqueta, resume, conecta y recupera — para que cuando lo necesites, lo encuentres.

**Pilares del producto:**

1. **Assets de conocimiento** — cualquier tipo de item útil para un dev: repos, CLIs, plugins, atajos, snippets, notas, workflows, agentes/prompts, artículos
2. **IA útil de verdad** — auto-tagging, auto-summary, búsqueda semántica, items relacionados
3. **Offline-first con sync** — todo funciona sin conexión; se sincroniza con el VPS cuando hay red
4. **Multiusuario** — cada developer tiene su propia colección; en el futuro, decks compartibles
5. **Multiplataforma** — desktop (Electron: Win/Mac/Linux) + web app (`app.devdeck.ai`)

---

## 2. Problema

### El dolor real

1. Descubrís herramientas útiles (repos, CLIs, plugins, shortcuts) pero las perdés en el ruido de Slack/Twitter/grupos de chat.
2. Cuando el problema aparece, no recordás que tenías la solución guardada en algún lado.
3. Los comandos de cada proyecto, los atajos de macOS, las funciones de terminal por lenguaje — los buscás de cero cada vez.
4. No hay un lugar que centralice **todo** el conocimiento práctico de un developer.

### Por qué lo existente no alcanza

| Solución | Por qué falla |
|----------|---------------|
| Bookmarks del browser | Sin contexto, sin preview, sin búsqueda semántica, sin tags útiles |
| GitHub Stars | Solo repos de GitHub, sin notas personales, sin comandos, sin acceso offline |
| Notion / Notes | Trabajo manual: copy/paste, sin metadata automática, sin IA, sin offline real |
| Raindrop / Pocket | Genéricos, sin foco en devs, sin cheatsheets, sin comandos, sin IA de developer |
| ChatGPT | Responde sobre el mundo, no sobre **tu** colección personal |

---

## 3. Usuarios objetivo

### Usuario primario: Developer individual
- Guarda repos recomendados, tools, CLIs, plugins, atajos, snippets y cheatsheets.
- Usa la app como "primera parada" cuando recuerda haber visto algo útil.
- Necesita que funcione offline (avión, café sin wifi, VPN lenta).
- Plataformas: macOS, Windows, Linux + navegador web.

### Usuario secundario (v2+): Equipos pequeños / comunidades
- Comparten "decks" curados de herramientas por stack o proyecto.
- Importan los decks de otros; mantienen uno actualizado para el equipo.

---

## 4. Modelo de datos — de `Repo` a `Item`

El concepto central deja de ser un `Repo` y pasa a ser un `Item` (también llamado "asset"):

| Tipo | Ejemplos |
|------|---------|
| `repo` | github.com/supabase/supabase, github.com/pocketbase/pocketbase |
| `cli` | ripgrep, fzf, bat, gh, atuin, zoxide |
| `plugin` | Copilot Chat, Cursor, Continue.dev, vim-surround |
| `cheatsheet` | git, docker, tmux, kubectl, zsh |
| `shortcut` | Atajos de macOS, VS Code, Raycast, terminal |
| `snippet` | Funciones de terminal por lenguaje/framework |
| `workflow` | Setup local de proyecto, deploy, debug, reset DB |
| `agent` | Prompts/skills para Copilot, Claude, Cursor agents |
| `article` | Posts, docs, guías cortas con contexto personal |
| `note` | Notas libres: "por qué elegimos X", "gotchas de Y" |

Todos comparten un modelo base: `título`, `url` (opcional), `descripción`, `tags`, `tipo`, `stack`, `notas personales`, `fecha de guardado`, `última vista`.

---

## 5. Features de IA — lo que justifica el `.ai`

La IA no es un chatbot. Hace 4 cosas concretas que atacan el dolor real:

### AI-1 — Auto-tagging y auto-categorización

Al guardar un item (URL, texto, repo), la IA propone:
- **tipo**: repo / cli / plugin / shortcut / cheatsheet / agent / …
- **stack**: Go / React / Next / Python / Rust / macOS / terminal / AI tooling / …
- **propósito**: testing / deploy / auth / productivity / agents / editor / …
- **nivel**: beginner / advanced
- **contexto de uso**: local dev / infra / debugging / AI coding / …

El usuario confirma o ajusta con un click. Nunca empieza desde cero.

### AI-2 — Auto-summary: "¿para qué sirve esto?"

Cada item recibe un resumen generado automáticamente:
- Qué es y para qué sirve
- Cuándo usarlo (caso de uso concreto)
- Por qué podría interesarte dado tu stack habitual
- Herramientas relacionadas o alternativas

Ataca directamente el dolor: *"guardé esto pero ya no recuerdo por qué era útil"*.

### AI-3 — Búsqueda semántica / por intención

En vez de buscar por título exacto o tag, el dev puede buscar con lenguaje natural:
- *"herramientas para agentes en terminal"*
- *"atajos de mac para moverme más rápido"*
- *"cosas útiles para debugging en Go"*
- *"plugins de IDE con IA que vi hace meses"*
- *"comandos que uso en proyectos React"*

Requiere embeddings sobre los items guardados (título + descripción + notas + tags). Se puede implementar con búsqueda vectorial server-side o local (sqlite-vec).

### AI-4 — "Items relacionados"

Al ver un item, DevDeck sugiere automáticamente:
- Items del mismo stack o propósito
- Cheatsheets o comandos que complementan este repo
- Shortcuts relevantes si el item es un editor o CLI
- Herramientas alternativas o complementarias

Ejemplo: ves un repo de `sqlc` → DevDeck sugiere cheatsheet de Postgres, repo de `pgx`, comandos de migraciones y atajos de terminal útiles para trabajo con DB.

### AI-5 — Quick capture con enriquecimiento automático

Pegar una URL, un texto o un nombre de CLI → la IA completa:
- Título y descripción
- Tags y categoría
- Resumen de propósito
- Comandos detectados (si hay README/docs)

El usuario guarda en 3 segundos; la IA organiza en segundo plano.

---

## 6. Scope por fases (actualizado)

### 🌊 Ola 1–4 — Completado ✅

Ver ROADMAP.md. Las olas 1–4 están completas: MVP repos, comandos, cheatsheets, web Vue y auth GitHub OAuth.

---

### 🌊 Ola 5 — Evolución a "Item" + IA básica

#### Objetivo
Transformar DevDeck de directorio de repos en knowledge OS para developers, con IA que organiza y resume de forma transparente.

#### 5.A — Modelo `Item` (must)

| # | Feature | Descripción |
|---|---------|-------------|
| I1 | **Tipos de item** | Extender el modelo de `Repo` a `Item` con campo `type`: repo, cli, plugin, shortcut, snippet, workflow, agent, article, note |
| I2 | **Campo "por qué lo guardé"** | Campo `why_saved` visible y fácil de completar en el momento de guardar |
| I3 | **Quick capture mejorado** | Pegar URL → IA completa tipo, descripción, tags y resumen. El usuario solo confirma |
| I4 | **Vistas por intención** | Además de lista: "AI tools", "Terminal", "Shortcuts", "By stack", "Forgotten gems" |

#### 5.B — IA (must)

| # | Feature | Descripción |
|---|---------|-------------|
| AI1 | **Auto-tagging** | Al guardar, propone tipo + stack + propósito + nivel. Opt-in configurable |
| AI2 | **Auto-summary** | Genera resumen de 2–3 líneas: qué es, para qué sirve, cuándo usarlo |
| AI3 | **Búsqueda semántica** | Búsqueda por intención natural sobre la colección del usuario |
| AI4 | **Items relacionados** | Al ver un item, sugiere items del mismo stack/propósito |

**Privacidad:** toda llamada a IA es opt-in y explícita en la UI. Se puede configurar usar modelo local (Ollama) o cloud (OpenAI/Anthropic). Lo que se envía al modelo se muestra claramente al usuario.

#### 5.C — Offline-first real (must)

| # | Feature | Descripción |
|---|---------|-------------|
| O1 | **SQLite local** | Base de datos local completa en Electron y PWA (OPFS) |
| O2 | **Cola de cambios** | Operaciones offline se encolan y sincronizan cuando vuelve la red |
| O3 | **Conflictos simples** | Last-write-wins por campo al inicio; merge manual explícito si se detecta conflicto real |
| O4 | **Indicador de sync** | UI clara: "Sincronizado", "Cambios pendientes (3)", "Sin conexión — modo local" |

#### 5.D — Multiusuario (must)

| # | Feature | Descripción |
|---|---------|-------------|
| M1 | **Colecciones por usuario** | Cada cuenta GitHub tiene su propia colección aislada en el backend |
| M2 | **Allowlist → registro abierto** | Migrar de allowlist única a registro abierto con rate limiting y plan gratuito |
| M3 | **Plan gratuito / pro** | Free: hasta 500 items + sync 1 device. Pro: ilimitado + sync multi-device + IA |

---

### 🌊 Ola 6 — Decks compartibles + comunidad

| # | Feature | Descripción |
|---|---------|-------------|
| D1 | **Decks públicos** | Colección curada con URL pública en `devdeck.ai/deck/...` |
| D2 | **Importar deck** | Ver un deck de otro dev y agregar items a tu colección |
| D3 | **Open Graph** | Preview rico de decks al compartir en Twitter/Slack/Discord |
| D4 | **Embed de item** | Card embed para blogs y docs |

---

### 🌊 Ola 7 — Plataforma

| # | Feature | Descripción |
|---|---------|-------------|
| PL1 | **PWA completa** | Web app instalable con soporte offline (OPFS + service worker) |
| PL2 | **Mobile (iOS/Android)** | React Native o Capacitor reutilizando lógica del cliente web |
| PL3 | **CLI de DevDeck** | `deck add <url>`, `deck search <query>`, `deck open <item>` desde terminal |
| PL4 | **Extensión de browser** | Guardar cualquier página/repo/tool con 1 click desde el browser |
| PL5 | **Raycast extension** | Buscar y capturar items desde Raycast |

---

## 7. User stories (actualizadas)

### Ola 5 — Items + IA

```
US-22  Guardar una URL de un CLI y que DevDeck detecte automáticamente
       que es un CLI, su stack y para qué sirve.
US-23  Al ver un item guardado hace 3 meses, entender en 5 segundos
       por qué lo guardé y cuándo usarlo.
US-24  Buscar "herramientas para agentes en terminal" y encontrar
       los items relevantes de mi colección sin recordar cómo los etiqueté.
US-25  Ver un repo y que DevDeck me sugiera cheatsheets y comandos
       relacionados de mi propia colección.
US-26  Agregar un item en 3 segundos (pegar URL → confirmar → listo).
US-27  Usar la app sin conexión y que mis cambios se sincronicen
       automáticamente cuando vuelve la red.
US-28  Hacer login con mi cuenta y encontrar mi colección igual
       desde la app de escritorio y desde el browser.
```

### Ola 6 — Decks compartibles

```
US-29  Crear un deck "AI coding tools" con mis items favoritos
       y compartir el link con mi equipo.
US-30  Recibir un link de deck de un colega e importar
       los items que me interesan a mi propia colección.
```

---

## 8. Métricas de éxito (v2)

| Métrica | Target |
|---------|--------|
| Items guardados por usuario en el primer mes | ≥ 50 |
| Días de uso por semana | ≥ 4 |
| Tiempo de captura de un nuevo item | < 10 segundos |
| Items redescubiertos vía discovery o búsqueda semántica | ≥ 5 / semana |
| % de items con auto-summary aprobado sin edición | ≥ 70% |
| % de búsquedas semánticas con resultado relevante en top-3 | ≥ 80% |
| Usuarios activos mensuales al lanzar Ola 5 | ≥ 50 |

---

## 9. Constraints (actualizados)

- **Plataformas:** Windows, macOS, Linux (Electron) + web app (`app.devdeck.ai`)
- **Offline-first:** toda la funcionalidad core disponible sin conexión
- **Privacidad IA:** opt-in explícito; el usuario controla qué se envía y a qué modelo
- **Idioma UI:** Español (rioplatense, casual) como default; toggle inglés en configuración
- **Performance:** lista con 2000 items en < 200ms; búsqueda local < 100ms; búsqueda semántica < 1s
- **Stack IA:** configurable — modelo local (Ollama) o cloud (OpenAI / Anthropic) via API key del usuario

---

## 10. Decisiones de producto actualizadas

1. **La entidad central pasa de `Repo` a `Item`.** Los repos siguen siendo el tipo más común, pero ya no son el único.
2. **IA es opt-in y transparente.** Siempre se muestra qué datos se envían al modelo. El usuario puede usar modelo local.
3. **Offline-first es no-negociable.** Si no funciona sin internet, no se lanza la ola.
4. **Multiusuario con plan freemium.** Registro abierto con GitHub OAuth. Plan free generoso; plan pro para sync multi-device e IA ilimitada.
5. **La mascota Snarkel sigue siendo feature de primera clase.** Se adapta al nuevo contexto ("tenés 5 items sin ver hace meses", "encontré 3 cosas relacionadas a lo que buscás").
6. **Búsqueda semántica server-side en primera instancia.** Con posibilidad de mover embeddings al cliente (sqlite-vec) cuando la privacidad lo requiera.
7. **Vue para web (no React).** Se mantiene la decisión de Ola 4.
8. **Mismo backend Go para todos los clientes.** El contrato REST/JSON no cambia; se extiende.
9. **Decks compartibles en Ola 6, no antes.** Primero IA individual; después social.
10. **CLI y extensión de browser en Ola 7.** El core del producto va primero.

---

## 11. Riesgos de producto (actualizados)

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| IA se percibe como "humo" si el auto-summary es malo | Alto | Lanzar solo cuando accuracy ≥ 70% en muestra propia; mostrar siempre cómo editarlo |
| Búsqueda semántica lenta o irrelevante | Alto | Fallback a búsqueda fuzzy siempre activo; semántica como "mejora" progresiva |
| Usuarios no entienden la diferencia con Notion/Raindrop | Alto | Copy y onboarding muy claros: "no es para todo, es para devs" |
| Migración de `Repo` a `Item` rompe datos existentes | Medio | Migración aditiva: `type = 'repo'` por defecto en items existentes |
| Sync offline genera conflictos difíciles | Medio | Iniciar con last-write-wins; documentar limitaciones; merge manual explícito |
| Modelo freemium desmotiva el uso | Medio | Plan free suficientemente generoso (500 items, sync 1 device) para el usuario promedio |
| Privacidad: usuarios preocupados por enviar código/URLs a OpenAI | Medio | Soporte de Ollama local desde día 1 de las features IA |
| Churn si la IA es opt-in y nadie la activa | Bajo | Onboarding que muestra el valor con 3 ejemplos concretos antes de pedir activación |
