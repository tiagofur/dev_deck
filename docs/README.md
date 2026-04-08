# DevDeck — Documentación

> Índice de documentación del proyecto. Todos los docs están en esta carpeta (`docs/`).

---

## Documentación de producto

| Archivo | Descripción |
|---------|-------------|
| [PRD.md](PRD.md) | **Product Requirements Document.** Visión, tipos de items, funcionalidades por ola (1–7), user stories, métricas, constraints, decisiones y riesgos. Punto de entrada principal para entender el producto. |
| [VISION.md](VISION.md) | **Visión y posicionamiento.** Qué es DevDeck (y qué no es), diferenciadores genuinos, taglines por audiencia, roadmap de posicionamiento y preguntas frecuentes de posicionamiento. |
| [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) | **Análisis competitivo.** Comparación detallada con GitHub Stars, Raindrop, Pocket, Notion, Obsidian, Raycast y Pieces.app. Incluye tablas de pros/contras y posicionamiento relativo. |

---

## Documentación de landing page

| Archivo | Descripción |
|---------|-------------|
| [LANDING_COPY.md](LANDING_COPY.md) | **Copy de landing en inglés.** Copy completo para `devdeck.ai` en inglés (audiencia global de developers). Incluye hero, features, AI section, plataformas, pricing, CTA, SEO tags y notas de implementación. |
| [LANDING.md](LANDING.md) | **Copy de landing en español.** Misma estructura en español rioplatense (audiencia hispanohablante / versión ES del sitio). Incluye también micro-copy adicional para la UI de la app. |

---

## Documentación técnica

| Archivo | Descripción |
|---------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Arquitectura del sistema.** Diagrama de alto nivel, stack técnico (Go + Chi + Postgres + pgvector, Electron + React, Vue 3), decisiones de arquitectura y schema de la base de datos. |
| [TECHNICAL_ROADMAP_AI_OFFLINE.md](TECHNICAL_ROADMAP_AI_OFFLINE.md) | **Roadmap técnico detallado.** Plan de implementación de las Olas 5–7: offline-first con SQLite local + sync engine, embeddings + búsqueda vectorial, multi-usuario. |
| [API.md](API.md) | **Referencia de API REST.** Especificación OpenAPI de todos los endpoints (`/api/repos`, `/api/cheatsheets`, `/api/search`, `/api/auth`, etc.). |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | **Design system.** Tokens CSS, paleta de colores neo-brutalist, tipografía, componentes, estados de la mascota Snarkel y principios de diseño de la UI. |

---

## Otros documentos en el root

| Archivo | Descripción |
|---------|-------------|
| [../README.md](../README.md) | README principal del repositorio: descripción del producto, stack, tabla de docs, estado actual. |
| [../ROADMAP.md](../ROADMAP.md) | Roadmap de implementación técnica: todas las fases completadas (Olas 1–4) y pendientes (Ola 5+), con detalle de commits y decisiones por fase. |

---

## Cómo leer esta documentación

Si llegás sin contexto, el orden recomendado es:

1. **[README.md](../README.md)** — qué es DevDeck en 2 minutos
2. **[VISION.md](VISION.md)** — por qué existe y para quién
3. **[PRD.md](PRD.md)** — qué hace, cómo crece, qué se decidió
4. **[ARCHITECTURE.md](ARCHITECTURE.md)** — cómo está construido
5. **[ROADMAP.md](../ROADMAP.md)** — qué está hecho y qué viene

Para contribuir o extender el producto:
- Agregá items al PRD antes de implementar
- Actualizá ROADMAP.md cuando completes una fase
- Mantené ARCHITECTURE.md sincronizado con los cambios de infra/schema

---

> **Idioma de la documentación:** español rioplatense (casual) — la misma voz de la app.
> Excepción: [LANDING_COPY.md](LANDING_COPY.md) está en inglés porque es la versión pública para audiencia global.
