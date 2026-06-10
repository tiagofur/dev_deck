# DevDeck — Documentación

> Índice de documentación del proyecto. Todos los docs están en esta carpeta (`docs/`).

---

## Documentación de producto

| Archivo | Descripción |
|---------|-------------|
| [PRD.md](PRD.md) | **Product Requirements Document.** Visión, problema, solución en capas (vault polimórfico + recuperación inteligente + acciones reutilizables), pilares, alcance (core + Workbench + fuera de scope) y métricas de éxito. Punto de entrada principal para entender el producto. |
| [VISION.md](VISION.md) | **Visión y posicionamiento.** Qué es DevDeck (y qué no es), diferenciadores genuinos, taglines por audiencia, roadmap de posicionamiento y preguntas frecuentes de posicionamiento. |
| [DEV_WORKBENCH.md](DEV_WORKBENCH.md) · [DEV_WORKBENCH.es.md](DEV_WORKBENCH.es.md) | **Developer Workbench.** Evolución de memoria a acción contextual: utilities locales, paleta, requests reutilizables, límites de producto y roadmap recomendado. |
| [CIRCLES_COMMUNITY.md](CIRCLES_COMMUNITY.md) · [CIRCLES_COMMUNITY.es.md](CIRCLES_COMMUNITY.es.md) | **Circles y contribución comunitaria.** Modelo de producto para convertir hallazgos individuales en memoria reutilizable para grupos/comunidades de developers. |
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
| [ARCHITECTURE.es.md](ARCHITECTURE.es.md) | **Arquitectura del sistema.** Diagrama de alto nivel, stack técnico (Go + Chi + Postgres + pgvector, monorepo pnpm workspaces con Electron + React desktop y React web que comparten `@devdeck/ui` / `@devdeck/api-client` / `@devdeck/features`), decisiones de arquitectura y schema de la base de datos. |
| [VERSIONING.es.md](VERSIONING.es.md) | **Versionado y release.** Sistema de versionado SemVer, estrategia de release, Conventional Commits, changelog (Keep a Changelog), scripts de release, GitHub Actions para auto-release. |
| [adr/0001-items-polymorphism.es.md](adr/0001-items-polymorphism.es.md) | **ADR 0001.** Modelo polimórfico de `items` (single-table + JSONB + generated columns). |
| [adr/0002-sync-strategy.es.md](adr/0002-sync-strategy.es.md) | **ADR 0002.** Estrategia de sync offline-first. |
| [adr/0003-monorepo-pnpm-workspaces.es.md](adr/0003-monorepo-pnpm-workspaces.es.md) | **ADR 0003.** Monorepo pnpm workspaces + migración del web client de Vue 3 a React 18 (Wave 4.5 §16.13). |
| [TECHNICAL_ROADMAP_AI_OFFLINE.es.md](TECHNICAL_ROADMAP_AI_OFFLINE.es.md) | **Roadmap técnico detallado.** Plan de implementación de las Olas 5–7: offline-first con SQLite local + sync engine, embeddings + búsqueda vectorial, multi-usuario. |
| [API.es.md](API.es.md) | **Referencia de API REST.** Especificación OpenAPI de todos los endpoints (`/api/repos`, `/api/cheatsheets`, `/api/search`, `/api/auth`, etc.). |
| [DESIGN_SYSTEM.es.md](DESIGN_SYSTEM.es.md) | **Design system.** Tokens CSS, paleta de colores neo-brutalist, tipografía, componentes, estados de la mascota Snarkel y principios de diseño de la UI. |
| [CAPTURE.md](CAPTURE.md) · [CAPTURE.es.md](CAPTURE.es.md) | **Captura multi-canal.** Cómo funciona la captura desde CLI, extensión, paste interceptor y endpoint `/api/items/capture`. |
| [SELF_HOSTING.md](SELF_HOSTING.md) · [SELF_HOSTING.es.md](SELF_HOSTING.es.md) | **Guía de self-hosting.** Despliegue con Docker Compose + Caddy, variables de entorno, migraciones y verificación. |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) · [TESTING_STRATEGY.es.md](TESTING_STRATEGY.es.md) | **Estrategia de testing y CI.** Tests de backend, unitarios de frontend, E2E y pipeline de GitHub Actions. |

---

## Comunidad y lanzamiento

| Archivo | Descripción |
|---------|-------------|
| [FIRST_CONTRIBUTION.md](FIRST_CONTRIBUTION.md) | **Primera contribución.** Camino corto para un primer PR respaldado por un issue. |
| [DISCUSSIONS.md](DISCUSSIONS.md) | **Guía de GitHub Discussions.** Categorías y cómo participar. |
| [SUPPORT.md](SUPPORT.md) | **Soporte y sustentabilidad.** Qué financia el apoyo al proyecto y caminos futuros de sostenibilidad. |
| [LAUNCH_KIT.md](LAUNCH_KIT.md) | **Kit de lanzamiento.** Copy por canal, checklist de launch y plan de follow-up. |

---

## Reviews y auditorías (históricos)

> Snapshots con fecha. Para el estado actual del producto, ver siempre [ROADMAP.md](../ROADMAP.md).

| Archivo | Descripción |
|---------|-------------|
| [REVIEW_2026_04.md](REVIEW_2026_04.md) | **Review técnica (abril 2026).** Hardening, captura y deuda de testing — origen de la Ola 4.5. |
| [APP_AUDIT_2026_05.md](APP_AUDIT_2026_05.md) | **Auditoría de app (mayo 2026).** Inventario completo de features, clasificación por impacto de usuario y plan P0–P2 de progressive disclosure. |
| [APP_AUDIT_REVIEW_2026_05.md](APP_AUDIT_REVIEW_2026_05.md) | **Verificación de la auditoría (mayo 2026).** Evidencia del trabajo P0/P1 y plan de comunidad alrededor de Circles. |
| [FEATURE_REVIEW_2026_06.md](FEATURE_REVIEW_2026_06.md) | **Revisión de producto y docs (junio 2026).** Menú de decisiones Sí/No sobre mejoras de app y documentación; origen de los issues #113–#130. |

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
4. **[DEV_WORKBENCH.md](DEV_WORKBENCH.md)** — hacia dónde evoluciona memoria + acción
5. **[CIRCLES_COMMUNITY.md](CIRCLES_COMMUNITY.md)** — cómo DevDeck convierte hallazgos en memoria comunitaria
6. **[ARCHITECTURE.md](ARCHITECTURE.md)** — cómo está construido
7. **[ROADMAP.md](../ROADMAP.md)** — qué está hecho y qué viene

Para contribuir o extender el producto:
- Agregá items al PRD antes de implementar
- Actualizá ROADMAP.md cuando completes una fase
- Mantené ARCHITECTURE.md sincronizado con los cambios de infra/schema

---

> **Idioma de la documentación:** español rioplatense (casual) — la misma voz de la app.
> Excepción: [LANDING_COPY.md](LANDING_COPY.md) está en inglés porque es la versión pública para audiencia global.
