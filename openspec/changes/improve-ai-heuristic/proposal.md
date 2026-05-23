# SDD Proposal: Improve Heuristic AI Tagger (P1.4)

**ID del Cambio:** `improve-ai-heuristic`  
**Estrategia:** `hybrid`  
**Fase:** Explore + Propose  

---

## 1. Contexto y Objetivos

Cuando la aplicación funciona en modo local/desconectado de AI (`AI_PROVIDER === disabled` o `heuristic`), el sistema depende de las reglas estáticas en `internal/ai/heuristic.go` para generar resúmenes y sugerir tags al capturar items. 

Actualmente, las reglas heurísticas son sumamente rígidas:
- Los tags se limitan al host de la URL, el lenguaje de GitHub (si es repositorio) y palabras clave hiper-genéricas del título.
- El resumen se reduce a frases robóticas prefijadas como `"CLI command or install snippet: [title]."` si no hay una descripción en el scraper.

### Objetivos:
1. **Detección inteligente por patrones de URLs:** Identificar ecosistemas de paquetes (`crates.io`, `npmjs.com`, `pypi.org`, `pkg.go.dev`) y nubes/infraestructura (`aws.amazon.com`, `kubernetes.io`) para inyectar tags hiper-precisos de forma automática.
2. **Diccionario de mapeo tecnológico:** Mapear palabras clave del título y descripción (ej. `react`, `vitest`, `k8s`, `fastapi`, `llm`) a tags limpios y unificados (`frontend`, `testing`, `devops`, `python`, `ai`).
3. **Resúmenes contextuales y fluidos:** Incorporar la intención de captura del usuario (`why_saved` e `item_type`) y el ecosistema detectado para redactar frases descriptivas más humanas.

---

## 2. Cambios Propuestos

### Backend Go (`backend/internal/ai/heuristic.go`):
- **Extensión de `hostTag`:** Analizar rutas específicas para detectar repositorios de paquetes e inyectar tags como `npm`, `rust`, `python`, `go-lang`, `docker`, `kubernetes`.
- **Nuevo método `keywordMappingTags`:** Escanear título y descripción contra un mapa optimizado de tecnologías para sugerir de forma inteligente tags relacionados (ej. de `fastapi` a `python`, `backend` y `api`).
- **Mejora en `Summarize`:** Incorporar `why_saved` y templates dinámicos basados en patrones detectados para lograr un resumen legible y natural en lugar de una plantilla estática.

### Tests de Backend (`backend/internal/ai/heuristic_test.go`):
- Agregar tests exhaustivos que verifiquen:
  - Capturas de npm, crates, pypi y kubernetes.
  - Generación de resúmenes enriquecidos usando `why_saved`.
  - Mapeo de keywords como `vitest`, `dockerfile` o `openai`.
