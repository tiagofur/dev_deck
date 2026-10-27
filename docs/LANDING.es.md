# HeapDeck — Copy para landing heapdeck.com (versión en español)

> Versión: 1.0 · Última actualización: 2026-04-08
>
> Este documento contiene el copy completo **en español** para la landing page de [heapdeck.com](https://heapdeck.com).
> Incluye: hero, secciones de features, social proof, pricing y CTA.
>
> **Nota (Oct 2026):** este doc es copy legacy de Abril 2026. El plan de dominios cambió: la web app corre en el apex `heapdeck.com` (viva en producción), la API en `api.heapdeck.com`. `app.heapdeck.com` y `docs.heapdeck.com` nunca se crearon — donde este doc los menciona, leé `heapdeck.com`.
>
> **Idioma:** español rioplatense (para audiencia hispanohablante / versión ES del sitio).
> Para la versión en inglés (audiencia global), ver [LANDING_COPY.md](LANDING_COPY.md).

---

## Metadata / SEO

```
title:       HeapDeck.com — Tu memoria externa para desarrollo, asistida por IA
description: Guarda repos, CLIs, plugins, atajos y workflows. La IA los organiza.
             Vos los encontrás cuando los necesitás.
og:title:    HeapDeck.com — Knowledge OS para developers
og:image:    /og-image.png (neo-brutalist card con logo + tagline)
```

---

## Hero

### Headline principal
```
Tu memoria externa para desarrollo, asistida por IA.
```

### Subheadline
```
Guarda repos, CLIs, plugins, atajos, prompts y workflows.
La IA los organiza. Vos los encontrás cuando los necesitás.
```

### Copy de apoyo (debajo del subheadline)
```
Dejá de perder herramientas útiles. HeapDeck recuerda por vos —
con contexto real de para qué sirve cada cosa y búsqueda por intención.
```

### CTAs
```
[Descargar para Mac / Windows / Linux]     → /download
[Probar en el browser]                     → heapdeck.com/register
```

### Social proof debajo del CTA
```
Open-source · Self-hosteable · Offline-first
```

---

## Problema (sección "El dolor")

### Título de sección
```
¿Cuántas veces pasó esto?
```

### Lista de dolores (en cards o bullets visuales)
```
🔍  Alguien te recomendó un CLI excelente. Lo guardaste "para después".
    Tres semanas después, no lo encontrás.

🔌  Instalaste un plugin de VS Code que te cambió la vida.
    No recordás cuál era ni por qué lo instalaste.

⌨️  Encontraste el atajo de macOS perfecto para algo que hacés 20 veces al día.
    Nunca lo internalizaste.

🤖  Generaste un prompt de AI coding que funcionó perfecto.
    No lo anotaste en ningún lado.

💻  Tenés el setup de tu stack preferido en algún README o Notion.
    Cada vez que lo necesitás, tardás 15 minutos en encontrarlo.
```

### Resolución
```
HeapDeck es el lugar donde esas cosas dejan de perderse.
```

---

## Features principales (sección "Qué podés guardar")

### Título de sección
```
No solo repos. Todo lo útil para desarrollar.
```

### Grid de tipos de items (12 cards)
```
📦  Repos          GitHub repos de tools, libs, boilerplates
⚡  CLIs           gh, jq, fzf, ripgrep, lazygit, cualquier CLI
🔌  Plugins        Extensiones de VS Code, JetBrains, Neovim
🤖  Prompts/Agentes Skills de AI coding, MCP agents, custom instructions
📋  Cheatsheets    Git, Docker, kubectl, vim, tmux — siempre a mano
⌨️  Shortcuts      Atajos de macOS, VS Code, iTerm, terminal
🔄  Workflows      Secuencias de comandos por stack o por tarea
📝  Notas          Decision logs, gotchas, "por qué elegimos X"
✂️  Snippets       Scripts reutilizables, one-liners, funciones
🛠️  Tools          Postico, TablePlus, Insomnia, Warp — tus apps dev
📰  Artículos      Docs, posts, RFCs, tutoriales que querés volver a leer
💡  Cualquier cosa Si es útil para desarrollar, cabe acá
```

---

## Features de IA (sección ".ai")

### Título de sección
```
IA que justifica el .ai
```

### Subtítulo
```
No es un chatbot genérico. Es IA para tu memoria de desarrollo.
```

### Feature cards (6 cards)

#### Auto-summary
```
🧠  Auto-summary

Guardás un repo o una herramienta.
HeapDeck genera automáticamente:
"qué es, para qué sirve, cuándo usarlo, qué stack toca".

Sin que escribas nada.
```

#### Auto-tagging
```
🏷️  Auto-tagging

La IA propone tipo, stack, propósito y nivel
automáticamente. Vos confirmás o editás.

Menos trabajo manual. Más contexto útil.
```

#### Búsqueda semántica
```
🔍  Búsqueda semántica

Buscá por intención, no por título exacto.

"herramientas para agents en terminal"
"atajos de mac para moverme más rápido"
"debugging en Go"

Encontrá lo que guardaste aunque no recuerdes el nombre exacto.
```

#### Related items
```
🔗  Related items

Cuando ves un item, HeapDeck sugiere:
repos similares, cheatsheets relacionadas,
comandos del mismo stack, shortcuts complementarios.

Tu base de conocimiento se interconecta sola.
```

#### Content → Knowledge
```
✨  Content → Knowledge

Pegá una URL, un README o un texto.
HeapDeck genera: resumen, tags, comandos detectados, prerrequisitos.
Guardalo como cheatsheet, item o runbook con un click.

Contenido bruto → conocimiento accionable.
```

#### Ask HeapDeck
```
💬  Ask HeapDeck

Preguntale a tu propia base de conocimiento.

"¿Qué tools tengo para agents?"
"¿Qué guardé para debugging en Go?"
"¿Tenía algo de Docker + pnpm?"

Responde sobre LO QUE VOS GUARDASTE.
No sobre el mundo en general.
```

### Nota de privacidad (debajo de la sección IA)
```
🔒  La IA es opt-in.
Usá tu propia API key de OpenAI, o Ollama para procesamiento 100% local.
Sin API key configurada, la app funciona en modo clásico (fuzzy search).
Siempre sabés qué se envía.
```

---

## Features de utilidad (sección "Más que guardar links")

### Título de sección
```
Guardás. Organizás. Accionás.
```

### Feature list (3 columnas)

#### Runbooks
```
📋  Runbooks por item

Cada herramienta tiene su "cómo se usa":
checklists de pasos, comandos, notas, links.

"Cómo levantar local", "Deploy", "Debug", "Reset DB".
Plantillas por stack. Import desde README.
```

#### Commands per item
```
⚡  Commands per item

Los comandos que siempre olvidás de cada herramienta,
guardados en el lugar correcto.

Click → copiado al clipboard.
Drag & drop para reordenar.
```

#### Discovery mode
```
🃏  Discovery mode

Modo pantalla completa tipo Tinder
para redescubrir lo que guardaste hace meses.

Porque no alcanza con guardarlo —
hay que poder volver a encontrarlo cuando importa.
```

#### Forgotten gems
```
💎  Forgotten gems

Items no abiertos en más de 30 días.
La mascota te avisa. Vos los redescubrís.

Tu knowledge base trabaja para vos,
no al revés.
```

#### Global search
```
🔎  Búsqueda global

Ctrl+K — busca en repos, cheatsheets,
comandos, notas y todos tus items.

Resultados agrupados por tipo.
Navegación por teclado.
```

#### Quick capture
```
⚡  Quick capture

Guardá en menos de 3 segundos.
Pegás la URL → presionás Enter → listo.

La IA completa el contexto en background.
Sin fricción.
```

---

## Plataformas (sección "Disponible en")

### Título de sección
```
Donde vos trabajás.
```

### Plataformas
```
🖥️  Desktop                     🌐  Web
Electron para macOS,            React 18 en cualquier browser.
Windows y Linux.                heapdeck.com
Atajos globales de sistema.     GitHub OAuth. Mismos datos.
Offline-first.                  Mismo UI que desktop — un solo codebase.
```

### Sync
```
Un solo backend. Tus datos siempre actualizados en todos tus dispositivos.
Offline-first: funciona sin conexión. Sync en background cuando vuelve internet.
```

---

## Diseño (sección visual)

```
Neo-brutalist colorido.
Diseñado para que quieras volver a entrar.

Snarkel — tu mascota axolotl — te juzga gentilmente
cuando no abrís la app hace días. Y celebra cuando
redescubrís esa herramienta que te cambió el juego.
```

---

## Open-source / Self-hosted

### Título de sección
```
Tuyo, de verdad.
```

### Copy
```
HeapDeck es open-source y self-hosteable.

Corrés tu propio backend en tu VPS con Docker Compose + Caddy.
Tus datos no pasan por servidores de terceros.
TLS automático. Control total.

O usás la versión hosteada en heapdeck.com — tu elección.
```

### Links
```
[Ver en GitHub]    → github.com/tiagofur/heapdeck
[Docs de deploy]   → docs en el repo (docs/SELF_HOSTING.md; docs.heapdeck.com a futuro)
```

---

## Pricing

### Para self-hosted
```
Self-hosted                     Gratis para siempre

Descargás, desplegás, usás.
Sin límites. Sin suscripciones.
Requiere tu VPS y algo de setup.

[Ver docs de deploy →]
```

### Para cloud (futuro)
```
Cloud (próximamente)            En construcción

Versión hosteada sin setup.
Sync automático. Backups incluidos.

[Notificame cuando esté →]     → waitlist email
```

---

## CTA final

### Headline
```
Dejá de perder herramientas útiles.
```

### Subheadline
```
HeapDeck recuerda por vos.
```

### CTAs
```
[Descargar desktop →]          → /download
[Abrir en el browser →]        → heapdeck.com/register
[Ver en GitHub →]              → github.com/tiagofur/heapdeck
```

---

## Footer

```
HeapDeck.com — Tu memoria externa para desarrollo, asistida por IA.

[GitHub]  [Docs]  [Changelog]  [Twitter/X]

Open-source · Self-hosteable · Offline-first · Hecho con ☕ por @tiagofur
```

---

## Notas de implementación de la landing

### Stack recomendado para heapdeck.com landing
- **Framework:** Astro (estático, fast, SEO) o Next.js (si quieren SSR)
- **Estilos:** Mismo design system neo-brutalist — tokens desde `packages/ui/styles/globals.css` + `packages/ui/tailwind-preset.cjs` del monorepo principal
- **Deploy:** Vercel / Netlify / Cloudflare Pages — gratis para sitios estáticos
- **Dominio (plan original, superseded):** `heapdeck.com` → landing, `app.heapdeck.com` → React web app (`apps/web`), `api.heapdeck.com` → backend Go. **Lo que se hizo en producción:** web app en el apex `heapdeck.com`, API en `api.heapdeck.com`, sin `app.` ni `docs.`.

### DNS setup recomendado (histórico — ver nota arriba)
```
heapdeck.com          A     → VPS (React web app, lo que corre hoy)
api.heapdeck.com      A     → VPS (Go API via proxy)
www.heapdeck.com      CNAME → heapdeck.com (a futuro)
docs.heapdeck.com     —     → no creado; docs en el repo por ahora
```

### Animaciones recomendadas
- Hero: fade-in + slide-up con CSS o Framer Motion
- Feature cards: stagger animation al entrar en viewport
- Mascota Snarkel: SVG animado en hero (estado "celebrating")
- Demo: GIF o video loop de la app en uso (grabado en Electron o browser)
