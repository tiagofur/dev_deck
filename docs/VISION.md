# DevDeck — Visión de producto y posicionamiento

> Versión: 1.0 · Última actualización: 2026-04-08

---

## La visión en una línea

> **DevDeck es tu memoria externa para desarrollo, asistida por IA.**

O más específico:

> Una app personal para **coleccionar, organizar, recuperar y accionar** conocimiento útil para developers — repos, CLIs, plugins, atajos, workflows, notas, prompts y más — con IA que clasifica, resume y hace recuperable todo lo que guardás.

---

## El problema que resolvemos

Los developers descubren herramientas, recursos y técnicas constantemente. El problema no es la falta de buenas herramientas — es que **no se pueden encontrar cuando se las necesita**.

El ciclo doloroso:
1. Alguien recomienda un CLI, repo, plugin o atajo
2. Lo guardás en un chat, un archivo, o lo dejás en una tab del browser
3. Semanas después, cuando el problema relevante aparece, no lo encontrás
4. Si lo encontrás, no recordás para qué servía
5. Terminás googleando de cero algo que ya habías resuelto

DevDeck rompe ese ciclo con **captura rápida, contexto automático y recuperación inteligente**.

---

## Qué es DevDeck (y qué no es)

### Es:
- Tu **colección personal** de assets útiles para desarrollar
- Tu **memoria externa** para tools que descubrís pero olvidás
- Tu **launchpad** de comandos, shortcuts y workflows
- Tu **knowledge base curada** con IA que la organiza

### No es:
- Un **bookmark manager genérico** (como Raindrop o Pocket)
- Un **gestor de notas** (como Notion u Obsidian)
- Un **directorio solo de repos** (como GitHub Stars)
- Un **launcher del sistema** (como Raycast o Alfred)
- Un **chatbot** que responde preguntas generales

---

## Landscape competitivo

### Competidores directos

#### GitHub Stars
**Lo que hace:** marca repos como favoritos en GitHub.

| A favor | En contra |
|---------|-----------|
| Integrado con GitHub | Solo repos de GitHub |
| Zero setup | Sin notas propias, sin tags personalizados |
| | Sin búsqueda útil (solo nombre exacto) |
| | Sin contexto ("¿para qué lo guardé?") |
| | No incluye CLIs, plugins, atajos, prompts |
| | Sin modo discovery |

**Posicionamiento vs DevDeck:** GitHub Stars es el punto de partida que DevDeck reemplaza. DevDeck cubre GitHub repos + todo lo demás, con contexto real.

---

#### Raindrop.io
**Lo que hace:** bookmark manager visual multiplataforma.

| A favor | En contra |
|---------|-----------|
| UI hermosa | Genérico (no foco dev) |
| Colecciones, tags | Sin commands per item |
| Colaborativo | Sin runbooks |
| Web + mobile + desktop | Sin búsqueda semántica real |
| | Sin enrichment automático dev-specific |
| | Sin mascota 😉 |

**Posicionamiento vs DevDeck:** Raindrop es excelente para bookmarks generales. DevDeck es Raindrop especializado para developers, con commands, runbooks, cheatsheets integrados y metadata dev-specific auto-generada.

---

#### Pocket / Instapaper
**Lo que hace:** "read later" para artículos.

| A favor | En contra |
|---------|-----------|
| Simple, rápido | Solo artículos/texto |
| Offline reading | Sin features dev |
| | Sin metadata de repos/tools |
| | Sin commands/shortcuts |

**Posicionamiento vs DevDeck:** Pocket resuelve "leer después". DevDeck resuelve "usar después". Complementarios, no excluyentes.

---

#### Notion
**Lo que hace:** workspace all-in-one (docs, bases de datos, wikis).

| A favor | En contra |
|---------|-----------|
| Extremadamente flexible | Requiere trabajo manual enorme |
| Colaborativo | Sin metadata automática |
| Múltiples vistas | No está pensado para dev tools |
| | Sin commands/runbooks nativos |
| | Sin búsqueda semántica sobre assets dev |
| | Pesado para captura rápida |

**Posicionamiento vs DevDeck:** Notion es el "hago todo manualmente en una base de datos". DevDeck es "guardo en 3 segundos y la IA completa el contexto". Para developers que quieren captura rápida con metadata auto-generada.

---

#### Obsidian
**Lo que hace:** PKM (Personal Knowledge Management) con notas en Markdown.

| A favor | En contra |
|---------|-----------|
| Local-first | Sin foco dev-specific |
| Muy extensible | Sin commands/runbooks nativos |
| Excelente para notas largas | Captura lenta (requiere crear archivo) |
| Graph view | Sin metadata de repos/CLIs auto-generada |
| | Sin discovery mode |

**Posicionamiento vs DevDeck:** Obsidian es para "escribir y conectar conocimiento en profundidad". DevDeck es para "capturar y recuperar herramientas y recursos dev rápidamente". Se complementan: podés linkear desde Obsidian a DevDeck items.

---

#### Raycast
**Lo que hace:** launcher de macOS con extensiones.

| A favor | En contra |
|---------|-----------|
| Velocidad brutal | macOS only |
| Extensiones poderosas | No persiste contexto largo plazo |
| Quick actions | Sin knowledge base personal |
| AI integrada | No guarda "por qué guardé esto" |

**Posicionamiento vs DevDeck:** Raycast es el launcher que ejecuta. DevDeck es la knowledge base que recuerda. Integración posible: extensión de Raycast que abre DevDeck items.

---

#### Linear / Jira (backlog personal)
**Lo que hace:** gestión de proyectos.

**Posicionamiento vs DevDeck:** No compiten. Linear/Jira son para tareas y proyectos. DevDeck es para conocimiento y herramientas.

---

### Herramientas adyacentes (no competidores directos)

| Tool | Relación con DevDeck |
|------|---------------------|
| **VS Code / JetBrains** | DevDeck puede lanzarlos ("abrir en IDE") |
| **Terminal (iTerm/Warp)** | DevDeck guarda comandos que se copian al terminal |
| **Warp** | Warp tiene AI en terminal; DevDeck tiene AI para knowledge; complementarios |
| **Pieces.app** | Guardar snippets con IA; similar pero más enfocado en código inline |
| **Fig / Warp AI** | Autocompletado en terminal; DevDeck guarda el conocimiento que los alimenta |

---

### Análisis de Pieces.app (el más similar)

[Pieces.app](https://pieces.dev) es quizás el competidor más directo emergente.

**Qué hace Pieces:**
- Guarda snippets de código con IA
- Contexto automático (de dónde viene el snippet)
- Búsqueda semántica de snippets
- Integración con IDEs
- AI assistant local/cloud

**Diferencias clave con DevDeck:**

| Aspecto | Pieces | DevDeck |
|---------|--------|---------|
| Foco | Snippets de código | Todo el conocimiento dev (repos, CLIs, tools, shortcuts, workflows) |
| Captura | Desde el IDE | Desde cualquier lado (URL, texto, quick capture) |
| Runbooks | No | Sí (planeado Ola 5) |
| Discovery | No | Sí (modo Tinder, forgotten gems) |
| Personalidad | Corporativa | Neo-brutalist + mascota |
| Precio | Freemium → pago | Open-source / self-hosted |
| Multi-tipo | Solo snippets | 12 tipos de items |

**Conclusión:** Pieces y DevDeck se solapan en búsqueda semántica y contexto IA, pero DevDeck es mucho más amplio en tipos de items y tiene features únicas (discovery mode, runbooks, mascota, self-hosted).

---

## Posicionamiento recomendado

### Tagline principal
> **Tu memoria externa para desarrollo, asistida por IA.**

### Subtítulo
> Guarda repos, CLIs, plugins, atajos y workflows. La IA los organiza. Vos los encontrás cuando los necesitás.

### Para diferentes audiencias

**Para el dev individual:**
> Dejá de perder herramientas útiles. DevDeck recuerda por vos.

**Para devs con muchos stacks:**
> Todo lo que usás en Go, Node, Python, Docker y macOS — en un solo lugar, organizado por IA.

**Para devs de AI/LLM:**
> Guardá tus mejores prompts, skills, agentes y herramientas de AI. Encontralos cuando los necesitás.

---

## Por qué DevDeck gana

### Diferenciadores genuinos

1. **Foco developer-first** — No es un bookmark manager genérico adaptado. Está diseñado específicamente para el flujo de trabajo de un developer.

2. **Multi-tipo de items** — Repos, CLIs, plugins, prompts, atajos, workflows — todo en un lugar con el mismo paradigma de captura/recuperación.

3. **IA para memoria, no para chat** — La IA en DevDeck clasifica, resume y recupera. No es un chatbot decorativo.

4. **Discovery mode** — La app trabaja activamente para que redescubrás lo que guardaste. No es solo un storage pasivo.

5. **Runbooks por item** — El conocimiento operacional (cómo se usa una tool) vive junto al item, no separado.

6. **Self-hosted + open-source** — Para devs que no quieren depender de servicios cloud de terceros para su knowledge base personal.

7. **Offline-first** — Funciona sin internet. Sync es bonus, no requisito.

8. **Personalidad** — Neo-brutalist colorido + mascota Snarkel. Una app que querés usar, no que tolerás usar.

---

## Roadmap de posicionamiento

| Fase | Posicionamiento | Feature clave |
|------|----------------|---------------|
| **Olas 1–4 (actual)** | "Directorio visual de repos con cheatsheets" | Preview rico, commands, cheatsheets, web client |
| **Ola 5** | "Knowledge OS para devs" | Multi-tipo items, runbooks, quick capture |
| **Ola 6** | "Tu memoria dev asistida por IA" | Auto-summary, semantic search, Ask DevDeck |
| **Ola 7** | "Tu knowledge base dev, en todos tus dispositivos" | Offline-first, multi-device, decks compartibles |

---

## Preguntas frecuentes de posicionamiento

**P: ¿Por qué `.ai` en el dominio?**
R: Porque la IA hace trabajo real y útil: auto-clasifica tus items, genera resúmenes de para qué sirven, te permite buscar por intención (no solo por título), y sugiere items relacionados. No es IA decorativa.

**P: ¿Es open-source?**
R: El repositorio es público. El plan es mantenerlo open-source, con opción de self-hosting (como hacemos nosotros con VPS + Docker Compose + Caddy).

**P: ¿Compite con Notion?**
R: No directamente. Si usás Notion para knowledge management general, DevDeck se complementa: es la "pestaña dev" de tu sistema de conocimiento, con captura rápida y metadata automática.

**P: ¿Necesito usar su IA o puedo usar la mía?**
R: La IA es opt-in. Podés configurar tu propia OpenAI API key o usar Ollama localmente. Sin API key configurada, la app funciona en modo fuzzy clásico (comportamiento de Olas 1–4).

**P: ¿Es para equipos o individual?**
R: Hoy es para uso individual o muy pequeño (allowlist de GitHub). El plan es expandir a multi-usuario en Ola 7, con decks compartibles como puente social.
