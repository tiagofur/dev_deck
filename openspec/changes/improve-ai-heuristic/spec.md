# SDD Specification: Improve Heuristic AI Tagger (P1.4)

**ID del Cambio:** `improve-ai-heuristic`  
**Estrategia:** `hybrid`  
**Fase:** Specs  

---

## 1. Mapeo de Archivos a Modificar

Modificaremos los siguientes archivos en el backend de Go:

| Estado | Archivo | Responsabilidad |
|--------|---------|-----------------|
| **[MODIFY]** | `backend/internal/ai/service.go` | Agregar el campo `WhySaved string` a la estructura `Input` que se envía a todos los motores de IA. |
| **[MODIFY]** | `backend/internal/ai/sanitize.go` | Pasar `item.WhySaved` en la sanitización hacia `Input.WhySaved`. |
| **[MODIFY]** | `backend/internal/ai/heuristic.go` | Implementar las reglas heurísticas avanzadas por patrones de URL, mapeo dinámico de palabras clave del título y descripción, y generación contextual de resúmenes. |
| **[MODIFY]** | `backend/internal/ai/heuristic_test.go` | Agregar aserciones robustas de test cubriendo ecosistemas específicos de desarrollo y resúmenes utilizando `why_saved`. |

---

## 2. Especificación Detallada de Cambios

### 2.1. Estructura `Input` en `backend/internal/ai/service.go`
```go
type Input struct {
	Type        items.Type
	Title       string
	Description string
	URL         *string
	Meta        map[string]any
	WhySaved    string // <-- NUEVO CAMPO CONTEXTUAL
}
```

### 2.2. Mapeo en `backend/internal/ai/sanitize.go`
```go
func SanitizeForAI(item *items.Item) Input {
	if item == nil {
		return Input{}
	}
	return Input{
		Type:        item.Type,
		Title:       truncateRunes(strings.TrimSpace(item.Title), 200),
		Description: truncateRunes(strings.TrimSpace(deref(item.Description)), 500),
		URL:         item.URL,
		Meta:        sanitizeMeta(item.Meta),
		WhySaved:    strings.TrimSpace(item.WhySaved), // <-- PASAR CAMPO
	}
}
```

### 2.3. Nuevas Reglas en `backend/internal/ai/heuristic.go`
- **Generación de Resumen (`Summarize`):**
  - Si `in.WhySaved != ""` -> Usar la estructura: `fmt.Sprintf("Saved because: %s. %s.", in.WhySaved, title/description)`
  - Si es del ecosistema `NPM` -> `fmt.Sprintf("NPM package %s saved for node/javascript projects.", title)`
  - Si es de `Cargo` -> `fmt.Sprintf("Rust crate %s saved for systems development.", title)`
  - Si es de `PyPI` -> `fmt.Sprintf("Python package %s saved for python development.", title)`
  - Si es de `Go Dev` -> `fmt.Sprintf("Go module %s saved for backend development.", title)`
  - Si es un CLI -> `fmt.Sprintf("CLI command or terminal utility: %s.", title)`
  - Si tiene descripción y no hay `why_saved`, usar descripción directamente (con un límite de 160 caracteres).

- **Sugerencia de Tags (`SuggestTags`):**
  - Analizar el host y rutas de la URL (`hostTag`):
    - `npmjs.com`, `yarnpkg.com` -> `npm`, `node`, `javascript`
    - `crates.io` -> `rust`, `cargo`
    - `pypi.org`, `pypi.python.org` -> `python`, `pip`
    - `pkg.go.dev` -> `go`, `golang`
    - `hub.docker.com` -> `docker`, `containers`
    - `aws.amazon.com` -> `aws`, `cloud`
    - `cloud.google.com` -> `gcp`, `cloud`
    - `kubernetes.io` -> `kubernetes`, `k8s`
  - Diccionario de palabras clave extendido y mapeo:
    - Escanear el título y descripción de forma insensible a mayúsculas para inyectar tags de temas relacionados.
    - Evitar palabras vacías o tags repetidos.
