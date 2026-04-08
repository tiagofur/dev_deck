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
into a actually useful collection.

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
