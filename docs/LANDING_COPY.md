# DevDeck — Copy y estructura de contenido para devdeck.ai

> Versión: 1.0 · Última actualización: 2026-04-08
>
> Este documento define el contenido, copy y estructura de secciones para la landing page de **devdeck.ai**.
> Está pensado para implementarse en Astro o Next.js, desplegado en Vercel o Cloudflare Pages.

---

## Principios de copy

- **Tono:** directo, honesto, técnico pero no denso. Sin buzzwords vacíos. Sin promesas de "AI-powered" que no se explican.
- **Idioma:** inglés para la landing pública (audiencia global de devs). El copy interno de la app es español rioplatense.
- **Voz:** habla de dev a dev. No de startup a usuario.
- **Anti-pattern:** no decir "revolutionary", "game-changing", "10x", "the future of". Decir qué hace y por qué importa.

---

## Arquitectura de páginas

```
devdeck.ai/
├── /                  (landing principal)
├── /deck/:slug        (deck público compartido)
├── /@:username        (perfil público de usuario)
├── /download          (descargas de la app desktop)
├── /changelog         (historial de cambios)
└── /docs              (documentación → redirige a docs.devdeck.ai)
```

---

## 1. Hero Section

### Headline principal (H1)
```
The dev knowledge vault that finds things for you.
```

### Subheadline
```
Save repos, CLIs, plugins, shortcuts and workflows.
Find them again — even when you forgot what you saved.
```

### Descripción de apoyo
```
DevDeck is an offline-first knowledge app for developers.
Add anything useful. Let AI organize it.
Search by intent, not by exact tag.
```

### CTAs
- **Primario:** `Download for Mac` (con dropdown: also available for Windows · Linux)
- **Secundario:** `Open web app →` (enlace a `app.devdeck.ai`)
- **Terciario (link):** `See a demo deck →`

### Visual del hero
Mockup de la app mostrando la vista principal: grid de cards con repos, CLIs y shortcuts. Mascota Snarkel en esquina inferior derecha. Sidebar con categorías. Barra de búsqueda en foco.

---

## 2. Problem Statement

### Encabezado de sección
```
You've found thousands of useful things.
You can't remember any of them.
```

### Pain points (lista visual, 3 items con icono)

**1. "Where was that repo?"**
```
Someone shared a useful CLI in Slack three months ago.
You needed it today. It's gone.
```

**2. "Why did I save this?"**
```
Your browser bookmarks have 847 items.
You open them once a year to feel bad about yourself.
```

**3. "I know this exists, I just can't find it"**
```
You've seen the perfect tool for this exact problem.
You just don't remember what it was called.
```

---

## 3. What DevDeck Does (Feature Strip)

> Sección visual con 4 cards horizontales o grid 2x2.

### Card 1 — Save anything
```
Title: Not just repos.
Body: Save GitHub repos, CLIs, VS Code extensions, macOS shortcuts,
      terminal commands, AI agents and personal notes.
      All in one place. No copy-paste chaos.
```

### Card 2 — AI that organizes, not chatbots
```
Title: AI that actually helps.
Body: DevDeck automatically tags and summarizes what you save.
      No manual work. No decorative chatbot.
      Just useful metadata when you come back in 6 months.
```

### Card 3 — Search by intent
```
Title: Find things by what you need, not what you named them.
Body: "tools for agents in terminal" → finds what you saved
      even if you never used those exact words as tags.
      Semantic search over your personal vault.
```

### Card 4 — Works offline, syncs everywhere
```
Title: Offline-first. Multi-device. Always yours.
Body: Your vault works without internet.
      Sync across Mac, Windows, Linux and browser.
      Your data is yours — export anytime.
```

---

## 4. Feature Deep Dive — AI (Justificación del .ai)

> Esta sección es crítica para justificar el dominio `.ai`. Debe ser honesta y específica.

### Encabezado de sección
```
AI features that solve real dev friction.
Not AI for the sake of AI.
```

### Sub-sección: Auto-tagging
```
Headline: You save. DevDeck labels.

Body:
When you add a repo or link, DevDeck reads the title, description
and README to suggest:
  - Type: CLI / plugin / shortcut / agent / article
  - Stack: Go / React / macOS / terminal / AI tooling
  - Purpose: testing / deploy / productivity / devtools
  - Level: beginner / advanced

You review and confirm. DevDeck learns from your edits.
```

### Sub-sección: Auto-summary
```
Headline: Remember why you saved it.

Body:
Every item gets a short AI-generated summary:
  - What it is
  - What it's useful for
  - When to use it
  - What stack it touches

So when you come back in 6 months, you don't have to
re-read the entire README to remember why you cared.
```

### Sub-sección: Semantic Search
```
Headline: Describe what you need. Find what you saved.

Examples:
  "tools for AI agents in terminal" →
  "macOS shortcuts for window management" →
  "repos for debugging Go applications" →
  "CLIs I saved for Docker workflows" →

DevDeck finds relevant items even when the keywords don't match exactly.
```

### Sub-sección: Related Items
```
Headline: One item leads to another.

Body:
When you open an item, DevDeck suggests:
  - Similar repos and tools
  - Related cheatsheets
  - Relevant commands from your saved workflows

Turns a single lookup into a useful session.
```

### Nota honesta al pie de la sección (importante para el trust)
```
A note on AI:
DevDeck sends item titles and descriptions to the AI model
to generate tags and summaries. We never send your private notes
without your explicit opt-in. You can also run a local model
with Ollama — your data never leaves your machine.
```

---

## 5. Feature Highlight — Cheatsheets

```
Headline: Your commands, organized.

Body:
DevDeck ships with curated cheatsheets for:
git · docker · npm · pnpm · vim · tmux · ssh · kubectl · gh CLI · make

Create your own. Link them to repos. Search across all of them
with one global search (Ctrl+K).
```

---

## 6. Feature Highlight — Discovery Mode

```
Headline: The things you saved but forgot.

Body:
Discovery mode shows you items you haven't opened in months.
Swipe to keep or archive. It's how you turn a growing vault
into an actually useful collection.

Snarkel, the DevDeck mascot, will nudge you when things go
unvisited for too long.
```

---

## 7. Feature Highlight — Shared Decks

```
Headline: Curate and share your best finds.

Body:
Create a deck: a curated list of your favorite repos, tools
and resources around a topic.

Share the link. Anyone can browse it.
Signed-in users can import any item directly to their vault.

Perfect for:
  - "My go-to AI coding tools"
  - "Essential Go development setup"
  - "macOS productivity shortcuts I use daily"
```

---

## 8. Platforms Section

```
Headline: Wherever you develop.

Platforms:
  🖥  Mac         — native Electron app (Apple Silicon + Intel)
  🪟  Windows     — native Electron app (.exe installer)
  🐧  Linux       — AppImage
  🌐  Web         — browser app at app.devdeck.ai
  📱  Mobile      — coming later

All connected to the same vault.
All working offline.
```

---

## 9. Social Proof / Testimonials placeholder

> Por ahora, usar una quote del fundador o una cita interna. Reemplazar con usuarios reales en cuanto haya.

```
"I built DevDeck because I kept losing track of useful repos
people shared in chats. Bookmarks didn't cut it.
Now I use it every day to find things I forgot I saved."

— Tiago, creator of DevDeck
```

---

## 10. CTA Final

### Encabezado
```
Stop losing useful things you find.
```

### Sub-copy
```
DevDeck is free to download.
Your vault is yours, offline-first, always exportable.
```

### CTAs
- **Primario:** `Download DevDeck — it's free`
- **Secundario:** `Open web app` (enlace a `app.devdeck.ai`)

### Nota de descarga
```
macOS · Windows · Linux · Web
No account required to get started.
```

---

## 11. Footer

### Columnas sugeridas

**Product**
- Download
- Web app
- Changelog
- Roadmap

**Resources**
- Documentation
- API Reference
- Privacy

**Community**
- GitHub
- Twitter / X
- Discord (futuro)

**Legal**
- Privacy Policy
- Terms of Service

### Footer copy
```
© 2026 DevDeck · Made by devs, for devs.
devdeck.ai
```

---

## Notas de implementación

### Meta tags para SEO/OG
```html
<title>DevDeck — The dev knowledge vault that finds things for you</title>
<meta name="description" content="Save repos, CLIs, plugins, shortcuts and workflows. Find them again — even when you forgot what you saved. Offline-first, AI-powered, free.">
<meta property="og:title" content="DevDeck — The dev knowledge vault">
<meta property="og:description" content="Offline-first knowledge app for developers. AI that organizes. Search by intent.">
<meta property="og:image" content="https://devdeck.ai/og-image.png">
<meta name="twitter:card" content="summary_large_image">
```

### Palabras clave objetivo
- developer knowledge base
- dev bookmarks app
- repo manager with AI
- offline developer tools
- cheatsheet manager for developers
- CLI bookmark manager

### Analytics a configurar desde el día 1
- Download button clicks (por plataforma)
- Deck share link follows
- Scroll depth por sección
- CTA conversion (landing → download)
# DevDeck.ai — Copy de landing page

> Documento de referencia para el sitio `devdeck.ai`.
> Idioma: Español (rioplatense, casual). Tono: directo, honesto, para devs.
> Versión: 1.0 · Última actualización: 2026-04-08

---

## Reposicionamiento del producto (1 línea)

> **DevDeck.ai es tu memoria externa para desarrollo. Guarda todo lo útil. Encuéntralo cuando lo necesitás. Con IA que organiza, no que charla.**

---

## Hero section

### Título principal (H1)

**Todo lo útil que encontrás como dev,**
**en un solo lugar que nunca lo pierde.**

> *Variante A (más aspiracional):*
> **Tu knowledge OS para developers.**

> *Variante B (más directa):*
> **Guardá repos, CLIs, atajos, comandos y workflows.
> Encontralos cuando los necesitás — incluso si no recordás cómo los etiquetaste.**

### Subtítulo (H2 / subhero)

DevDeck guarda cualquier cosa útil para un dev: repos recomendados por amigos, CLIs que encontraste en Twitter, plugins de IDE con IA, atajos de macOS, cheatsheets de stack, comandos por proyecto. La IA los organiza y los hace buscables por intención — sin que tengas que hacer nada a mano.

Funciona offline. Se sincroniza en todos tus dispositivos. Disponible en desktop (Win/Mac/Linux) y en el browser.

### CTA principal

**[Empezar gratis — Login con GitHub]**

> Subcopy del CTA: Sin tarjeta de crédito. Sin configuración. 30 segundos.

### Social proof / trust inicial

> *"Era uno de esos repos que un amigo te manda y perdés en el chat.
> Ahora lo busco en DevDeck cuando lo necesito."*
> — Dev de backend, Buenos Aires

*(Placeholder para testimonios reales en el lanzamiento)*

---

## Sección "El problema que resuelve"

### Título

**¿Cuántas veces te pasó esto?**

### Items (lista visual, honesta)

- 📱 Alguien te manda un CLI copado en un grupo de Slack. Lo mirás 3 segundos. Lo perdés para siempre.
- 🌀 Buscás en GitHub Stars y no encontrás nada porque no recordás cómo se llamaba.
- 🔁 Googleás los mismos comandos de Docker, Git o tmux una vez por semana.
- 🤯 Cada proyecto tiene sus comandos propios y nunca los anotaste en ningún lado.
- ✂️ Los atajos de macOS o VS Code que quisiste aprender están en un PDF que nunca abrís.

### Cierre de sección

DevDeck existe para que **nada útil se pierda y todo sea encontrable** — en el momento exacto que lo necesitás.

---

## Sección "Qué guardás en DevDeck"

### Título

**No solo repos. Todo lo que un dev necesita recordar.**

### Grid de tipos de item (2 columnas en mobile, 3 en desktop)

| Tipo | Ejemplo |
|------|---------|
| 📦 **Repositorios** | supabase, pocketbase, shadcn, langchain |
| ⚡ **CLIs** | ripgrep, fzf, atuin, zoxide, gh, lazygit |
| 🧩 **Plugins de IDE** | Copilot, Continue.dev, Cursor rules, vim-surround |
| ⌨️ **Atajos** | Macros de macOS, VS Code, Raycast, terminal |
| 📋 **Cheatsheets** | git, docker, kubectl, tmux, ssh, pnpm |
| 🤖 **Agentes / Prompts** | Skills de Copilot, prompts de Claude, MCP tools |
| 🛠️ **Comandos por proyecto** | `pnpm dev`, `make migrate`, `docker compose up` |
| 📝 **Notas y decisiones** | "Elegimos X porque Y", "Gotcha de Z en producción" |
| 📖 **Artículos y guías** | Posts, docs, tutoriales con contexto personal |
| 🔁 **Workflows** | Setup local de proyecto, deploy, debug, reset DB |

### Tagline de cierre

> Si alguna vez te sirvió, DevDeck lo guarda y te lo devuelve cuando lo necesitás.

---

## Sección "Cómo funciona"

### Título

**Guardar en 3 segundos. Encontrar cuando lo necesitás.**

### Pasos (flujo visual)

**1. Pegás la URL (o escribís el nombre)**
Repo de GitHub, link a un plugin, nombre de un CLI, URL de un artículo — lo que sea.

**2. La IA completa lo que falta**
Detecta qué tipo de cosa es, para qué stack sirve, cuándo usarlo y por qué podría interesarte. Vos solo confirmás (o editás si querés).

**3. Buscás cuando lo necesitás**
Escribís lo que recordás — aunque sea vago: *"herramientas para agentes en terminal"*. DevDeck busca por intención, no por título exacto.

**4. Siempre disponible**
Offline en desktop, en el browser, sincronizado entre tus dispositivos.

---

## Sección "IA honesta" (trust / diferenciación)

### Título

**IA que trabaja para vos, no que te distrae.**

### Copys de features IA (honesto, sin humo)

#### 🏷️ Auto-tagging inteligente
Cuando guardás algo, DevDeck detecta qué es, qué stack toca y para qué sirve. Te propone los tags; vos los confirmás. Nunca empezás desde cero.

#### 📝 Resumen automático: "¿para qué sirve esto?"
Cada item tiene un resumen corto generado por IA: qué es, cuándo usarlo, por qué podría interesarte. El antídoto para *"guardé esto hace 3 meses y ya no sé por qué"*.

#### 🔍 Búsqueda por intención (no por tag exacto)
Buscá en lenguaje natural sobre tu propia colección. No necesitás recordar cómo etiquetaste algo — describís lo que necesitás y DevDeck lo encuentra.

**Ejemplos reales:**
- *"herramientas para agents en terminal"*
- *"plugins de IDE con IA que vi hace meses"*
- *"atajos de mac para moverme más rápido entre ventanas"*
- *"comandos útiles para debugging en Go"*

#### 🔗 Items relacionados automáticos
Al ver un repo o tool, DevDeck sugiere cheatsheets, comandos y herramientas relacionadas de tu propia colección. Conecta lo que ya tenés.

### Bloque de honestidad (texto explícito)

> **¿Por qué el `.ai`?**
>
> Porque la IA hace trabajo real: clasifica, resume, conecta y recupera.
> No hay un chatbot decorativo. No generamos texto por moda.
> La IA actúa en silencio para que vos nunca tengas que organizar nada a mano.
>
> **Privacidad:** las features de IA son opt-in. Podés usar tu propia API key de OpenAI/Anthropic, o un modelo local con Ollama. Nunca enviamos nada sin que lo sepas.

---

## Sección "Offline-first + multiplataforma"

### Título

**Funciona donde vos trabajás. Sin conexión también.**

### Items

🖥️ **Desktop** — App Electron para Windows, macOS y Linux. Atajos globales, integración con el SO.

🌐 **Web** — `app.devdeck.ai` desde cualquier browser. Sin instalar nada.

📡 **Sync automático** — Tus items sincronizados entre desktop y web. Conflictos resueltos sin drama.

✈️ **Modo offline** — Todo funciona sin internet. Los cambios se sincronizan cuando vuelve la red.

---

## Sección de precios (Ola 5+)

### Título

**Empezá gratis. Escalá si lo necesitás.**

### Planes

#### Free — $0/mes
- Hasta 500 items
- Sync en 1 dispositivo
- Cheatsheets predefinidos (git, docker, kubectl, pnpm, tmux y más)
- Comandos por repo
- Búsqueda fuzzy

#### Pro — $X/mes *(precio a definir)*
- Items ilimitados
- Sync en dispositivos ilimitados
- IA: auto-tagging + auto-summary + búsqueda semántica + items relacionados
- Decks compartibles (cuando llegue Ola 6)
- Soporte prioritario

> **Durante el beta, todo es gratis.** Avisamos antes de cobrar.

---

## Sección "Para quién es"

### Título

**Hecho para developers que se cansan de perder cosas útiles.**

### Bullets

✅ Guardás repos que te recomienda la comunidad y nunca los encontrás después.
✅ Tenés comandos específicos por proyecto que nunca anotás en ningún lado.
✅ Querés aprender atajos de terminal o macOS pero no tenés dónde guardarlos organizados.
✅ Usás muchos stacks y no podés recordar los comandos de cada uno.
✅ Guardás cosas en Notion pero es demasiado trabajo mantenerlo.
✅ GitHub Stars no te alcanza porque no todo es un repo.

### No es para vos si...

❌ Buscás una wiki de equipo con permisos y flujos de aprobación.
❌ Necesitás gestión de proyectos o tareas.
❌ Querés un chatbot de IA general.

*(DevDeck es específico y opinionated. Eso es una feature, no un bug.)*

---

## CTAs secundarios

### CTA para el hero (principal)
**Empezar gratis — Login con GitHub →**

### CTA para sección de features
**Ver DevDeck en acción →** *(link a demo / video)*

### CTA para el final de la página
**¿Qué estás esperando? Todo lo que encontraste útil sigue perdiéndose.**
**[Empezar gratis — Login con GitHub]**

### CTA para la sección de precios
**[Empezar con el plan Free]** · **[Conocer el plan Pro]**

---

## Footer copy

**DevDeck.ai** — Tu knowledge OS para developers.

- `app.devdeck.ai` — Web app
- `docs.devdeck.ai` — Documentación
- `download.devdeck.ai` — Desktop (Win/Mac/Linux)

Hecho con ☕ y demasiados repositorios olvidados.

---

## Micro-copy adicional (UI strings)

Estos strings van en la interfaz de la app, no en la landing. Se incluyen aquí como referencia de tono.

| Contexto | Copy |
|----------|------|
| Estado vacío — sin items | "Todavía no guardaste nada. Pegá una URL o el nombre de un CLI para empezar." |
| Mascota cuando no abriste la app en 3 días | "Che, ¿te olvidaste de mí? Tenés 4 cosas sin abrir de la semana pasada." |
| Mascota cuando encontrás algo por búsqueda semántica | "¡Eso es lo que buscabas! Lo guardaste hace 2 meses." |
| Confirmación de auto-tagging | "La IA propone estos tags. ¿Los confirmás o los ajustás?" |
| Indicador de sync offline | "Sin conexión. Los cambios se van a sincronizar cuando vuelvas a tener red." |
| Primer item guardado | "¡Primer item guardado! La próxima vez que lo necesites, ya sabés dónde está." |
| Búsqueda semántica sin resultados | "No encontré nada con eso en tu colección. Probá con otras palabras o guardá algo nuevo." |
| Discovery mode — no hay más items | "¡Revisaste todo! O guardás más cosas, o abrís alguna de las que ya tenés." |
