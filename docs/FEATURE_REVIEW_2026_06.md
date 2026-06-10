# DevDeck — Revisión de producto y documentación (Junio 2026)

> **Fecha:** 2026-06-10
> **Objetivo:** proponer mejoras en la app y en la documentación, manteniendo el principio rector: *una app útil para la mayoría de los usuarios, sin abrumar*. Cada propuesta es una decisión Sí/No para el owner.
> **Método:** lectura completa de `docs/` (PRD, VISION, DEV_WORKBENCH, CIRCLES, auditorías de abril/mayo, ROADMAP, análisis competitivo) + verificación puntual contra el código.

---

## Principio rector

La auditoría de mayo (`APP_AUDIT_2026_05.md`) ya diagnosticó el problema correcto: **no sobran features, sobra superficie visible**. El loop core (capturar → enriquecer → buscar → usar en Workbench → compartir en Circle) es sólido y diferenciador. La estrategia no es agregar, es:

1. **Terminar** lo que quedó a medias.
2. **Pulir** la primera experiencia (donde se gana o pierde al 90% de usuarios).
3. **Agregar solo 2 cosas** de alto valor que no crean superficie permanente.
4. **Ocultar/archivar** lo prematuro.
5. **Sincerar** la documentación con la realidad del código.

---

## Parte A — Mejoras en la app

### A1. Terminar pendientes de la auditoría de mayo (recomendado: SÍ)

Son deudas conocidas, ya decididas, baratas de cerrar:

| # | Propuesta | Detalle | Decisión |
|---|-----------|---------|----------|
| A1.1 | Entrada de Runbooks en la navegación | Backend completo pero vive escondido como tab en ItemDetail (P2.8 del audit). | ☐ Sí ☐ No |
| A1.2 | Auditoría de navegación post-overhaul | Verificar que todas las secciones son alcanzables y que el drawer mobile funciona (P2.9). | ☐ Sí ☐ No |
| A1.3 | Verificar notificaciones end-to-end | El cron de digest **sí existe** (`backend/internal/cron/digest.go`, cableado en `main.go`), pero requiere AI provider para el summary. Validar que el 90% sin provider también reciba algo (digest sin AI, fallback a lista simple), o la campanita queda vacía (P2.10). | ☐ Sí ☐ No |
| A1.4 | Terminar simplificación de ProfilePage | Quedó "mostly done" según el review de mayo (P1.7): sacar cálculo de achievements/reputation del componente. | ☐ Sí ☐ No |

### A2. Primera experiencia — la inversión más importante (recomendado: SÍ)

Para "la app a medida perfecta" lo crítico no es qué features tiene, sino qué ve un usuario nuevo en los primeros 10 minutos. Todo esto ya está en el ROADMAP 0.5.x sin completar:

| # | Propuesta | Detalle | Decisión |
|---|-----------|---------|----------|
| A2.1 | Demo/seed data realista | Vault de primer arranque con 15–20 items reales (repos, comandos, cheatsheets) para que la búsqueda y el Workbench demuestren valor antes de que el usuario capture nada. | ☐ Sí ☐ No |
| A2.2 | Onboarding guiado al loop core | Wizard de 3 pasos: capturá algo → buscalo por intención → usalo/copialo. Nada de explicar 15 features; solo el loop. | ☐ Sí ☐ No |
| A2.3 | Estados vacíos/carga/error consistentes | Cada pantalla vacía debe decir qué hacer a continuación, no mostrar una lista muerta. | ☐ Sí ☐ No |
| A2.4 | Ejemplos en Workbench | Cada tool con un ejemplo precargado de un clic (un JWT de muestra, un JSON desordenado, un curl). | ☐ Sí ☐ No |

### A3. Nuevas funciones — solo dos, ambas sin superficie permanente

Pasan el test del DEV_WORKBENCH ("¿vale más por estar conectada al vault?") y no agregan navegación nueva:

| # | Propuesta | Detalle | Decisión |
|---|-----------|---------|----------|
| A3.1 | **Importador de GitHub Stars** (y opcionalmente bookmarks del navegador) | No existe hoy (verificado en backend). Es la respuesta directa al problema fundacional de VISION.md ("1000+ stars insearchables"). Llena el vault el día 1 con datos del propio usuario y el enricher ya existente hace el resto. Vive como acción en Settings/onboarding: cero superficie nueva. Probablemente la feature con mejor ratio valor/costo de todo el backlog. | ☐ Sí ☐ No |
| A3.2 | **Export/backup completo del vault** (JSON + Markdown) | Hoy solo cheatsheets/decks tienen export. "Local-first trust" es pilar del PRD; sin export, el vault es un lock-in. Un botón en Settings. Genera confianza para adopción y es trivial comparado con sync. | ☐ Sí ☐ No |

Candidatas evaluadas y **descartadas por ahora** (para no abrumar): PWA/share target mobile (Ola 11, pospuesto), clipboard history global (fuera de scope del PRD), ejecución de comandos de runbooks (Ola 8, requiere modelo de seguridad serio), OCR/screenshot-to-snippet.

### A4. Reducir y ocultar — la parte "no abrumar" (recomendado: SÍ con matices)

El overhaul de navegación + progressive disclosure ya hizo lo grueso. Quedan estos sobrantes:

| # | Propuesta | Detalle | Decisión |
|---|-----------|---------|----------|
| A4.1 | Marcar como experimental / flag-off por defecto: Reputation, Explore/Trending/Leaderboard, Team Review, realtime-client | Sin base de usuarios son pantallas vacías que diluyen la propuesta de valor. El código queda; la UI se esconde detrás de un feature flag hasta que haya comunidad. | ☐ Sí ☐ No |
| A4.2 | Decidir Discovery mode | El audit lo marcó como "engagement cuestionable". Opciones: (a) moverlo dentro de Explore como sub-vista, (b) flag-off, (c) dejarlo. Recomendación: (a) o (b) — es la única entrada de "Tools" que no es Workbench y confunde el menú. | ☐ a ☐ b ☐ c |
| A4.3 | Landing embebida → sitio estático externo | `LandingPage` (22KB) dentro de la app no aporta al usuario logueado y pesa en el bundle. El copy ya existe en `LANDING_COPY.md`. | ☐ Sí ☐ No |
| A4.4 | Plugin Gallery → sección simple en Settings si el catálogo tiene <5 plugins | Una "galería" de 4 entradas comunica producto inflado. | ☐ Sí ☐ No |
| A4.5 | SAML/SCIM/Orgs: mantener backend, confirmar que nada enterprise sea visible sin org | Ya está parcialmente hecho (P0.3); solo cerrar los gaps de empty states que notó el review de mayo. | ☐ Sí ☐ No |

### A5. Decisión estratégica: offline-first

Es el pilar más caro de la visión y hoy está honestamente desactivado ("Cloud Mode"). Dos caminos:

| Opción | Implicación |
|--------|-------------|
| **(a) Invertir ahora** | SQLite/OPFS local real + LWW por campo (Olas 6). Meses de trabajo de un solo dev; congela todo lo demás. |
| **(b) Posponer hasta post-1.0 (recomendada)** | Mantener "Cloud Mode" honesto, entregar la promesa "local-first trust" por otra vía más barata: Workbench 100% local sin red (ya cumple) + export/backup (A3.2) + ajustar docs/marketing para no prometer offline (ver B1.1). Revisitar después de validar tracción con capture/search/Circles. |

Decisión: ☐ a ☐ b

---

## Parte B — Mejoras en la documentación

### B1. Sincerar docs con la realidad (recomendado: SÍ — es barato y la credibilidad es estrategia declarada del roadmap)

| # | Propuesta | Detalle | Decisión |
|---|-----------|---------|----------|
| B1.1 | Corregir `COMPETITIVE_ANALYSIS.md` | La matriz declara "Offline-First ✅ (Desktop)" — es falso hoy (sync deshabilitado globalmente). También "AI Summary ✅ (Built-in)" merece la nota "con provider configurado; heurística por defecto". El mismo estándar de honestidad que se aplicó a la UI (P0.2) debe aplicarse a los docs públicos. | ☐ Sí ☐ No |
| B1.2 | Actualizar checkboxes obsoletos de `ROADMAP.md` | "Add screenshots and/or a short demo GIF" sigue sin marcar, pero el README ya los tiene. Revisar todos los checkboxes 0.5.x contra la realidad. | ☐ Sí ☐ No |
| B1.3 | Actualizar `VISION.md` §6 y `PRD.md` §1 | Ambos dicen que el Workbench es "el próximo paso", pero las Fases 1–4 del Workbench están mayormente implementadas. El próximo paso real según el roadmap es pulido + Circles. | ☐ Sí ☐ No |
| B1.4 | Actualizar el índice `docs/README.es.md` | Describe el PRD como "funcionalidades por ola (1–7)" — el PRD v1.1 ya no tiene olas. Además faltan en el índice: CAPTURE, DISCUSSIONS, LAUNCH_KIT, SUPPORT, FIRST_CONTRIBUTION, TESTING_STRATEGY y las auditorías. | ☐ Sí ☐ No |

### B2. Docs faltantes (recomendado: SÍ — dos ya son ítems del roadmap)

| # | Propuesta | Detalle | Decisión |
|---|-----------|---------|----------|
| B2.1 | `docs/LIMITATIONS.md` (limitaciones conocidas) | Ítem 0.5.x del roadmap sin hacer. Lista honesta: sin offline real, AI requiere provider, social requiere comunidad, CORS en API tester web, etc. Refuerza el posicionamiento "honest public beta". | ☐ Sí ☐ No |
| B2.2 | Mapa de arquitectura corto para contribuidores | Ítem del roadmap. Una página: request → router → handler → store → Postgres; y app → features → api-client → backend. Complementa (no reemplaza) ARCHITECTURE.md. | ☐ Sí ☐ No |
| B2.3 | `docs/README.md` (índice en inglés) | El índice de docs solo existe en español; toda la documentación pública apunta a una audiencia global. | ☐ Sí ☐ No |

### B3. Estructura y mantenimiento (recomendado: SÍ a B3.1; B3.2 a decidir)

| # | Propuesta | Detalle | Decisión |
|---|-----------|---------|----------|
| B3.1 | Archivar docs históricos en `docs/archive/` | `REVIEW_2026_04`, `APP_AUDIT_2026_05`, `APP_AUDIT_REVIEW_2026_05` (y este doc, cuando se ejecute) son snapshots, no docs vivos. Con banner "histórico — ver ROADMAP.md para estado actual". Reduce el ruido de `docs/` de ~25 a ~15 archivos vivos. | ☐ Sí ☐ No |
| B3.2 | Política explícita de bilingüismo | Hoy hay pares en/es con drift inevitable (el roadmap es ya tiene la Ola 12 detallada y el en no la tenía). Definir: inglés canónico, español como traducción best-effort con nota, y un checkbox en el PR template ("¿actualizaste la contraparte de idioma?"). Alternativa más radical: mantener solo inglés + README.es. | ☐ Sí ☐ No |

---

## Resumen ejecutivo de recomendaciones

**Hacer sí o sí (alto valor, bajo costo):** A1 (cerrar pendientes), A2 (primera experiencia), A3.1 (import GitHub Stars), A3.2 (export vault), B1 (sincerar docs), B2.1 (limitaciones).

**A decidir por el owner:** A4.2 (Discovery), A5 (offline-first ahora vs. post-1.0 — recomiendo posponer), B3.2 (política de idiomas).

**No hacer por ahora (proteger el foco):** PWA mobile, clipboard global, ejecución de comandos, OCR, gamificación visible, cualquier feature social nueva antes de que el feed de Circles (0.7.x) demuestre uso real.

La app a medida perfecta para el 90% es: **capturar en 3 segundos, encontrar en 10, reusar sin reconstruir contexto** — con un vault que se llena solo el primer día (import de stars) y del que se puede salir cuando se quiera (export). Todo lo demás es opcional y debe parecer opcional.
