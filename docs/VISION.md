# DevDeck — Visión de producto y posicionamiento

> Versión: 1.1 · Última actualización: 2026-04-08

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

## Landscape competitivo (resumen)

El análisis competitivo completo (con tablas de pros/contras y diferenciación por tool) está en [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md).

**Competidores principales:**

| Tool | Por qué no es suficiente para devs | Relación con DevDeck |
|------|------------------------------------|----------------------|
| **GitHub Stars** | Solo repos de GitHub; sin contexto; sin búsqueda útil | DevDeck lo reemplaza y expande |
| **Raindrop / Pocket** | Genéricos; sin foco dev; sin commands ni runbooks | DevDeck es el Raindrop especializado para devs |
| **Notion / Obsidian** | Trabajo manual total; sin metadata automática; captura lenta | DevDeck complementa (captura rápida + IA) |
| **Raycast / Alfred** | Launchers; no persisten contexto largo plazo | DevDeck es la knowledge base; Raycast la ejecuta |
| **Pieces.app** | Solo snippets de código; sin repos, CLIs, shortcuts, workflows | DevDeck es más amplio en tipos de items |

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
