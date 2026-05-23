# SDD Tasks: Improve Heuristic AI Tagger (P1.4)

**ID del Cambio:** `improve-ai-heuristic`  
**Estrategia:** `hybrid`  
**Fase:** Tasks  

---

## Plan de Ejecución

- [x] **Fase 1: Preparación de Datos (`Input` & `Sanitize`)**
  - [x] Modificar `backend/internal/ai/service.go` para agregar `WhySaved string` a `Input`.
  - [x] Modificar `backend/internal/ai/sanitize.go` para mapear `item.WhySaved` a `Input.WhySaved` in `SanitizeForAI`.
- [x] **Fase 2: Implementación de la Heurística Inteligente**
  - [x] Implementar `hostAndEcosystemTags` para parsear ecosistemas de desarrollo a partir de URLs en `backend/internal/ai/heuristic.go`.
  - [x] Implementar `techKeywordTags` para mapear palabras clave de tecnologías a tags unificados en `backend/internal/ai/heuristic.go`.
  - [x] Modificar la función `SuggestTags` para combinar y retornar los tags mapeados, heurísticos e históricos.
  - [x] Rediseñar la función `Summarize` para priorizar `WhySaved`, ecosistemas y oraciones con formato natural y legible.
- [x] **Fase 3: Cobertura de Tests**
  - [x] Modificar `backend/internal/ai/heuristic_test.go` para agregar casos de prueba detallados (paquetes npm, crates, python, kubernetes, shortcuts, resúmenes con intent).
- [x] **Fase 4: Verificación**
  - [x] Correr `go build ./...` en `backend/` para asegurar que compila perfectamente.
  - [x] Correr `go test -v ./internal/ai/...` en `backend/` para comprobar que pasen todas las pruebas en verde.
