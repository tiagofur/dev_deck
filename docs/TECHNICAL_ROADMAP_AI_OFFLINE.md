# DevDeck — Roadmap Técnico: Offline-first + Sync + Multi-usuario + IA

> Versión: 1.0 · Última actualización: 2026-04-08
>
> Este documento es el roadmap técnico detallado para las Olas 5 y 6 del producto.
> Para la visión de producto ver [PRD.md](PRD.md). Para el roadmap general ver [../ROADMAP.md](../ROADMAP.md).

---

## 0. Contexto y premisas

### Estado al entrar a Ola 5
- ✅ Backend Go + Chi + Postgres 16 + pgx v5
- ✅ Auth: token estático (Ola 1) + JWT + GitHub OAuth (Ola 4)
- ✅ Entidades: repos, commands, cheatsheets, users, sessions
- ✅ Clientes: Electron (React) + Web (Vue)
- ✅ Deploy: Docker Compose + Caddy en VPS

### Principios técnicos para las nuevas olas
1. **Offline-first no es opcional.** La app debe ser 100% funcional sin red. La sync es eventual y no bloquea ninguna operación.
2. **Backwards compatibility.** Los repos existentes no se rompen. La migración al modelo de items extendido es aditiva.
3. **IA como servicio opcional, no como dependencia core.** Si el proveedor de IA no responde, la app sigue funcionando.
4. **Multi-usuario con vaults aislados.** Ningún usuario puede ver datos de otro salvo decks explícitamente públicos.
5. **Datos del usuario siempre exportables.** JSON export completo en cualquier momento.

---

## 1. Ola 5 — Items generales + IA real

### 1.1 Modelo de datos extendido

#### Migración `0005_items_extended.sql`

```sql
-- Agregar item_type a repos (renombramos conceptualmente la tabla)
ALTER TABLE repos ADD COLUMN item_type TEXT NOT NULL DEFAULT 'repo'
  CHECK (item_type IN ('repo','cli','plugin','shortcut','snippet','agent','prompt','article','tool','workflow','note'));

ALTER TABLE repos ADD COLUMN why_saved TEXT;
ALTER TABLE repos ADD COLUMN when_to_use TEXT;
ALTER TABLE repos ADD COLUMN ai_summary TEXT;
ALTER TABLE repos ADD COLUMN ai_tags TEXT[];  -- sugerencias de IA (editables)
ALTER TABLE repos ADD COLUMN ai_enriched_at TIMESTAMPTZ;
```

#### Decisión de diseño
No renombramos la tabla `repos` a `items` en esta ola para evitar riesgo de migración. La tabla se llama `repos` internamente pero la capa de dominio la llama `Item`. En una ola futura (Ola 7) se puede hacer el rename con `ALTER TABLE repos RENAME TO items` + update de todos los índices y foreign keys.

#### Domain type actualizado (`internal/domain/items/item.go`)
```go
type ItemType string

const (
    ItemTypeRepo     ItemType = "repo"
    ItemTypeCLI      ItemType = "cli"
    ItemTypePlugin   ItemType = "plugin"
    ItemTypeShortcut ItemType = "shortcut"
    ItemTypeSnippet  ItemType = "snippet"
    ItemTypeAgent    ItemType = "agent"
    ItemTypePrompt   ItemType = "prompt"
    ItemTypeArticle  ItemType = "article"
    ItemTypeTool     ItemType = "tool"
    ItemTypeWorkflow ItemType = "workflow"
    ItemTypeNote     ItemType = "note"
)

type Item struct {
    ID          string    `json:"id"`
    UserID      string    `json:"user_id"`
    ItemType    ItemType  `json:"item_type"`
    URL         string    `json:"url,omitempty"`
    Title       string    `json:"title"`
    Description string    `json:"description,omitempty"`
    WhySaved    string    `json:"why_saved,omitempty"`
    WhenToUse   string    `json:"when_to_use,omitempty"`
    Notes       string    `json:"notes,omitempty"`
    Tags        []string  `json:"tags"`
    AITags      []string  `json:"ai_tags,omitempty"`
    AISummary   string    `json:"ai_summary,omitempty"`
    // ... campos existentes de repos (source, stars, lang, etc.) cuando aplica
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

---

### 1.2 Módulo de IA

#### Estructura de archivos
```
internal/
└── ai/
    ├── ai.go              # interfaces: Classifier, Summarizer, Embedder, RAG
    ├── openai.go          # implementación OpenAI (GPT-4o-mini + text-embedding-3-small)
    ├── ollama.go          # implementación Ollama (llama3.2 + nomic-embed-text)
    ├── disabled.go        # implementación noop (cuando AI_PROVIDER=disabled)
    ├── pipeline.go        # orquestación: enqueue → process → save
    └── prompts/
        ├── classify.txt   # prompt para auto-tagging y clasificación de tipo
        └── summarize.txt  # prompt para auto-summary
```

#### Interfaces
```go
// ai/ai.go
type Classifier interface {
    // Dado un item, devuelve tipo sugerido, tags sugeridos y categorías
    Classify(ctx context.Context, item ClassifyInput) (ClassifyResult, error)
}

type Summarizer interface {
    // Dado un item, devuelve un resumen corto (≤150 palabras)
    Summarize(ctx context.Context, item SummarizeInput) (string, error)
}

type Embedder interface {
    // Dado un texto, devuelve su vector de embeddings
    Embed(ctx context.Context, text string) ([]float32, error)
}

type RAG interface {
    // Dado una pregunta y contexto (items recuperados), genera respuesta
    Answer(ctx context.Context, question string, context []Item) (string, error)
}
```

#### Pipeline de enriquecimiento asíncrono
```
[Save item] → [Write to DB] → [HTTP 201 response] → [Enqueue AI job]
                                                              ↓
                                               [Worker: Classify + Summarize]
                                                              ↓
                                               [PATCH item: ai_tags + ai_summary]
                                                              ↓
                                               [WebSocket / SSE: notify client]
```

**Implementación:** worker pool simple con `goroutine` + canal buffered. No hace falta queue externa para el MVP de IA. Si escala, migrar a PgMQ o similar (ya tienen Postgres).

#### Variables de configuración (`config.go`)
```go
AI_PROVIDER        string  // "openai" | "ollama" | "disabled"
OPENAI_API_KEY     string  // requerido si AI_PROVIDER=openai
OPENAI_MODEL       string  // default: "gpt-4o-mini"
OPENAI_EMBED_MODEL string  // default: "text-embedding-3-small"
OLLAMA_BASE_URL    string  // default: "http://localhost:11434"
OLLAMA_MODEL       string  // default: "llama3.2"
OLLAMA_EMBED_MODEL string  // default: "nomic-embed-text"
AI_MAX_WORKERS     int     // default: 3
AI_OPT_IN_DEFAULT  bool    // default: false (usuarios deben activar explícitamente)
```

#### Prompt de clasificación (`prompts/classify.txt`)
```
You are a developer tool classifier. Given an item a developer saved,
return a JSON object with:
- item_type: one of [repo, cli, plugin, shortcut, snippet, agent, prompt, article, tool, workflow, note]
  (Note: this list must match the ItemType enum in internal/domain/items/item.go)
- tags: array of 3-7 lowercase tags (stack, purpose, platform, level)
- stack: primary technology stack (e.g. "Go", "React", "macOS", "terminal")
- purpose: primary use case (e.g. "testing", "productivity", "deploy", "debugging")

Input:
Title: {{.Title}}
Description: {{.Description}}
URL: {{.URL}}

Return only valid JSON. No explanation.
```

#### Prompt de summary (`prompts/summarize.txt`)
```
You are summarizing a developer resource. Write a concise summary (max 100 words) covering:
1. What it is
2. What problem it solves
3. When a developer would use it

Write in plain text, no markdown, no bullet points.
Be specific and useful, not generic.

Title: {{.Title}}
Description: {{.Description}}
{{if .ReadmeSnippet}}README (first 500 chars): {{.ReadmeSnippet}}{{end}}
```

---

### 1.3 Búsqueda semántica con pgvector

#### Migración `0006_embeddings.sql`
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Dimensión 1536 corresponde a OpenAI text-embedding-3-small.
-- Si se usa Ollama nomic-embed-text (dimensión 768), cambiar a vector(768).
-- La dimensión debe ser consistente: no se pueden mezclar embeddings de distinta dimensión
-- en la misma columna. Definir AI_EMBED_DIM en config y usarla en la migración.
ALTER TABLE repos ADD COLUMN embedding vector(1536);

-- Índice HNSW para búsqueda aproximada eficiente
CREATE INDEX idx_repos_embedding ON repos
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

#### Estrategia de búsqueda híbrida
```
Query del usuario
      ↓
  [Embed query]    [pg_trgm search]
      ↓                 ↓
  [Vector search]   [Text search]
      ↓                 ↓
  [score_v * 0.6 + score_t * 0.4]
      ↓
  [Resultados rankeados]
```

#### Query SQL de búsqueda híbrida
```sql
WITH vector_search AS (
  SELECT id, 1 - (embedding <=> $1::vector) AS score_v
  FROM repos
  WHERE user_id = $2
    AND embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector
  LIMIT 20
),
text_search AS (
  SELECT id,
    ts_rank(
      to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')),
      plainto_tsquery('english', $3)
    ) AS score_t
  FROM repos
  WHERE user_id = $2
    AND (title ILIKE '%' || $3 || '%'
      OR description ILIKE '%' || $3 || '%'
      OR $3 = ANY(tags))
  LIMIT 20
)
SELECT r.*,
  COALESCE(v.score_v, 0) * 0.6 + COALESCE(t.score_t, 0) * 0.4 AS relevance
FROM repos r
LEFT JOIN vector_search v ON r.id = v.id
LEFT JOIN text_search t ON r.id = t.id
WHERE r.user_id = $2
  AND (v.id IS NOT NULL OR t.id IS NOT NULL)
ORDER BY relevance DESC
LIMIT $4;
```

#### Endpoints de búsqueda
```
GET /api/search?q=<query>&mode=hybrid|semantic|text&limit=20
```

Respuesta:
```json
{
  "results": [
    {
      "id": "...",
      "type": "repo|cheatsheet|entry|item",
      "title": "...",
      "relevance": 0.87,
      "ai_summary": "...",
      "tags": ["go", "cli", "testing"]
    }
  ],
  "mode": "hybrid",
  "total": 12
}
```

---

### 1.4 Items relacionados

#### Endpoint
```
GET /api/items/:id/related?limit=5
```

#### Implementación
```go
// store/items.go
func (s *Store) GetRelatedItems(ctx context.Context, itemID string, userID string, limit int) ([]Item, error) {
    // 1. Obtener embedding del item
    // 2. Buscar K vecinos más cercanos del mismo usuario, excluyendo el item mismo
    // 3. Retornar con score de similitud
}
```

#### SQL
```sql
SELECT r.*, 1 - (r.embedding <=> target.embedding) AS similarity
FROM repos r,
  (SELECT embedding FROM repos WHERE id = $1 AND user_id = $2) AS target
WHERE r.user_id = $2
  AND r.id != $1
  AND r.embedding IS NOT NULL
ORDER BY r.embedding <=> target.embedding
LIMIT $3;
```

---

### 1.5 "Ask DevDeck" — RAG sobre el vault

#### Endpoint
```
POST /api/ask
Body: { "question": "¿Qué tools tengo para Go?" }
Response: { "answer": "...", "sources": [...items] }
```

#### Pipeline RAG
```
[question] → [embed question] → [vector search: top-K items] →
[build context] → [LLM: answer based ONLY on context] → [response]
```

#### Prompt RAG
```
You are DevDeck, a personal knowledge assistant for developers.
Answer the question based ONLY on the items below from the user's vault.
Do not use external knowledge. If the answer is not in the items, say so.

User's saved items:
{{range .Items}}
- [{{.ItemType}}] {{.Title}}: {{.AISummary}}
  Tags: {{join .Tags ", "}}
{{end}}

Question: {{.Question}}

Answer concisely (max 150 words). Mention specific item titles when relevant.
```

---

## 2. Ola 6 — Offline-first + Sync + Multi-usuario

### 2.1 Arquitectura offline-first

#### Principio fundamental
```
Usuario hace una acción
        ↓
┌─────────────────────┐
│  Write to local DB  │  ← Siempre primero, nunca falla
│  (SQLite / OPFS)    │
└─────────────────────┘
        ↓
┌─────────────────────┐
│  Enqueue operation  │  ← Encolar para sync
│  in sync_queue      │
└─────────────────────┘
        ↓
  [Respuesta inmediata al usuario]
        ↓ (background)
┌─────────────────────┐
│  Sync engine drains │  ← Cuando hay red
│  queue → backend    │
└─────────────────────┘
```

#### Schema local (SQLite)

```sql
-- sync_queue: cola de operaciones pendientes
CREATE TABLE sync_queue (
  id           TEXT PRIMARY KEY,  -- UUID generado localmente
  operation    TEXT NOT NULL CHECK (operation IN ('create','update','delete')),
  entity       TEXT NOT NULL,     -- 'item', 'command', 'cheatsheet', etc.
  entity_id    TEXT NOT NULL,
  payload      TEXT NOT NULL,     -- JSON de la operación
  created_at   TEXT NOT NULL,     -- ISO 8601
  synced_at    TEXT,              -- NULL si pendiente
  error        TEXT,              -- último error si falló
  retry_count  INTEGER DEFAULT 0
);

-- items: cache local de todos los items del usuario
CREATE TABLE items (
  id           TEXT PRIMARY KEY,
  item_type    TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  url          TEXT,
  why_saved    TEXT,
  tags         TEXT,    -- JSON array
  ai_summary   TEXT,
  notes        TEXT,
  archived     INTEGER DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  server_version INTEGER,  -- version del servidor al momento del último sync
  is_local_only  INTEGER DEFAULT 0  -- 1 = no sincronizar con server
);
```

#### Módulo de sync (`src/sync/`)

```typescript
// src/sync/engine.ts
export class SyncEngine {
  private queue: SyncQueue;
  private api: ApiClient;
  private db: LocalDB;

  async start(): Promise<void> {
    // 1. Registrar listener de conectividad
    window.addEventListener('online', () => this.sync());

    // 2. Sync periódico mientras hay conexión (cada 30s)
    setInterval(() => {
      if (navigator.onLine) this.sync();
    }, 30_000);

    // 3. Sync inicial al arrancar
    if (navigator.onLine) await this.sync();
  }

  async sync(): Promise<SyncResult> {
    // 1. Push: enviar operaciones pendientes al server
    const pending = await this.queue.getPending();
    if (pending.length > 0) {
      await this.push(pending);
    }

    // 2. Pull: traer cambios del server desde último sync
    const lastSync = await this.db.getLastSyncTimestamp();
    const delta = await this.api.getDelta(lastSync);
    if (delta.items.length > 0) {
      await this.applyDelta(delta);
    }

    return { pushed: pending.length, pulled: delta.items.length };
  }

  private async push(ops: SyncOperation[]): Promise<void> {
    const result = await this.api.syncBatch(ops);
    for (const op of result.succeeded) {
      await this.queue.markSynced(op.id);
    }
    for (const op of result.failed) {
      await this.queue.markFailed(op.id, op.error);
    }
  }

  private async applyDelta(delta: DeltaResponse): Promise<void> {
    for (const item of delta.items) {
      const local = await this.db.getItem(item.id);
      if (local && new Date(local.updated_at) > new Date(item.updated_at)) {
        // Local es más nuevo → mantener local, no sobreescribir
        // (el server ya tiene la versión local porque se la mandamos en el push)
        continue;
      }
      await this.db.upsertItem(item);
    }
    await this.db.setLastSyncTimestamp(delta.server_time);
  }
}
```

---

### 2.2 Backend: endpoints de sync

#### `POST /api/sync/batch`

Acepta un array de operaciones del cliente. Idempotente por `operation_id`.

```
Request:
POST /api/sync/batch
Authorization: Bearer <jwt>

{
  "client_id": "uuid-del-dispositivo",
  "operations": [
    {
      "operation_id": "uuid-único",
      "operation": "create",
      "entity": "item",
      "payload": { ...item fields... },
      "client_timestamp": "2026-04-08T10:00:00Z"
    },
    {
      "operation_id": "uuid-único-2",
      "operation": "update",
      "entity": "item",
      "entity_id": "item-id",
      "payload": { "notes": "updated notes" },
      "client_timestamp": "2026-04-08T10:01:00Z"
    }
  ]
}

Response:
{
  "succeeded": ["uuid-único", "uuid-único-2"],
  "failed": [],
  "server_time": "2026-04-08T10:00:05Z"
}
```

#### `GET /api/sync/delta`

Devuelve cambios del servidor desde un timestamp dado.

```
Request:
GET /api/sync/delta?since=2026-04-08T09:00:00Z
Authorization: Bearer <jwt>

Response:
{
  "items": [ ...items modificados desde 'since'... ],
  "deleted_ids": ["id1", "id2"],
  "server_time": "2026-04-08T10:00:05Z"
}
```

#### Tabla de sync log (`0007_sync.sql`)
```sql
CREATE TABLE sync_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  client_id    TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,  -- idempotency key
  operation    TEXT NOT NULL,
  entity       TEXT NOT NULL,
  entity_id    TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sync_log_operation_id ON sync_log(operation_id);
CREATE INDEX idx_sync_log_user_id ON sync_log(user_id);
```

---

### 2.3 Resolución de conflictos

#### Estrategia: Last-Write-Wins por campo

```go
// internal/sync/resolver.go
//
// Nota: la resolución de conflictos a nivel de campo requiere que el Item tenga
// timestamps por campo (FieldUpdatedAt map[string]time.Time). Esta estructura
// debe agregarse al schema de la tabla items como columnas JSONB o columnas
// individuales (e.g. title_updated_at, notes_updated_at, etc.).
// Migración sugerida: ALTER TABLE repos ADD COLUMN field_timestamps JSONB DEFAULT '{}';
func ResolveConflict(server Item, client Item) (Item, ConflictDetail) {
    resolved := server // base: versión del server

    var conflicts []FieldConflict

    // Para cada campo editable, comparar timestamps
    fields := []string{"title", "notes", "tags", "why_saved", "when_to_use"}
    for _, field := range fields {
        serverTime := server.FieldUpdatedAt[field]
        clientTime := client.FieldUpdatedAt[field]

        if clientTime.After(serverTime) {
            // El cliente tiene el valor más nuevo: usar el del cliente
            setField(&resolved, field, getField(client, field))
        } else if serverTime.Equal(clientTime) && getField(server, field) != getField(client, field) {
            // Mismo timestamp, diferente valor: conflicto real → notificar
            conflicts = append(conflicts, FieldConflict{
                Field:       field,
                ServerValue: getField(server, field),
                ClientValue: getField(client, field),
            })
        }
    }

    return resolved, ConflictDetail{Fields: conflicts}
}
```

**Casos de conflicto real** (mismo campo, mismo timestamp, diferente valor): se notifica al usuario con una UI de resolución simple ("¿Cuál versión querés conservar?"). Son extremadamente raros en práctica individual.

---

### 2.4 Multi-usuario y Decks compartibles

#### Schema (`0008_decks.sql`)
```sql
CREATE TABLE decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- slug único por usuario (no globalmente): permite que dos usuarios tengan "my-go-setup"
  -- La URL pública incluye el username: devdeck.ai/@username/deck/slug
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, slug)  -- único por usuario, no globalmente
);

CREATE TABLE deck_items (
  deck_id    UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  added_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (deck_id, item_id)
);

CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_slug ON decks(slug);
CREATE INDEX idx_deck_items_deck_id ON deck_items(deck_id, position);
```

#### Endpoints de decks
```
GET    /api/decks                    — lista decks del usuario autenticado
POST   /api/decks                    — crear deck
GET    /api/decks/:id                — obtener deck (auth requerida)
PATCH  /api/decks/:id                — editar deck
DELETE /api/decks/:id                — borrar deck

POST   /api/decks/:id/items          — agregar item al deck
DELETE /api/decks/:id/items/:itemId  — quitar item del deck
PUT    /api/decks/:id/items/reorder  — reordenar items

GET    /api/public/decks/:slug       — ver deck público (sin auth)
POST   /api/public/decks/:slug/import — importar items a vault propio (auth requerida)

GET    /api/public/users/:username   — perfil público de usuario
```

#### Generación de slug
```go
// internal/domain/decks/deck.go
func GenerateSlug(title string) string {
    // "My Go Development Setup" → "my-go-development-setup-a1b2c3"
    base := slug.Make(title)
    suffix := generateRandomSuffix(6)  // 6 chars hex
    return base + "-" + suffix
}
```

---

### 2.5 Rate limiting y seguridad para IA

#### Rate limits por usuario

```go
// internal/middleware/rate_limit.go
var aiLimits = map[string]rate.Limit{
    "free": rate.Every(10 * time.Second),   // 6 enriquecimientos/minuto
    "pro":  rate.Every(2 * time.Second),    // 30 enriquecimientos/minuto
}
```

#### Sanitización de input antes de enviar a IA
```go
// internal/ai/sanitize.go
func SanitizeForAI(item Item) ClassifyInput {
    return ClassifyInput{
        Title:       truncate(item.Title, 200),
        Description: truncate(item.Description, 500),
        URL:         item.URL,  // URL pública, no contiene datos privados
        // NUNCA incluir: notes, why_saved, when_to_use (son privados y no mejoran la clasificación)
    }
}
```

---

## 3. Plan de implementación sugerido

### Sprint 1 (Semanas 1-2): Modelo extendido + Quick capture
- Migración `0005_items_extended.sql`
- Actualizar endpoints existentes para aceptar `item_type` (backwards-compatible)
- Frontend: formulario de nuevo item con selector de tipo + campo "por qué lo guardé"
- Quick capture: modal simplificado (solo URL + enter; tipo y tags después)

### Sprint 2 (Semanas 3-4): Auto-tagging + Auto-summary
- Módulo `internal/ai/` con interfaces + implementación OpenAI
- Pipeline asíncrono de enriquecimiento
- Config: `AI_PROVIDER`, `AI_OPT_IN_DEFAULT`
- Frontend: indicador "analizando…" + UI de review de tags sugeridos

### Sprint 3 (Semanas 5-6): Búsqueda semántica
- Migración `0006_embeddings.sql` + pgvector
- Generación de embeddings en pipeline de IA
- Búsqueda híbrida en endpoint `/api/search`
- Frontend: toggle "búsqueda semántica" en `GlobalSearchModal`

### Sprint 4 (Semanas 7-8): Items relacionados + Ask DevDeck
- Endpoint `/api/items/:id/related`
- Sidebar "también te puede interesar" en detalle
- Endpoint `/api/ask` con RAG básico
- Frontend: panel "Ask DevDeck" en sidebar

### Sprint 5 (Semanas 9-10): SQLite local + offline básico
- Schema local SQLite
- `SyncQueue` y `LocalDB` en cliente Electron
- Sync engine básico: push cola al conectar
- Indicador de estado de sync en topbar

### Sprint 6 (Semanas 11-12): Sync bidireccional + multi-device
- Endpoint `/api/sync/batch` (idempotente)
- Endpoint `/api/sync/delta`
- Pull sync + resolución LWW
- UI: lista de dispositivos en Settings

### Sprint 7 (Semanas 13-14): Decks compartibles
- Migración `0008_decks.sql`
- CRUD endpoints de decks
- Endpoints públicos (sin auth)
- Frontend app: UI de crear/editar deck + copy link
- Landing (devdeck.ai): página `/deck/:slug`

### Sprint 8 (Semana 15): Multi-usuario + perfil público
- Ampliar allowlist a N usuarios
- Endpoints de perfil público
- Landing: página `/@username`
- Rate limiting para IA por plan

---

## 4. Consideraciones de seguridad

### Aislamiento de datos por usuario
- Todo query que accede a datos de usuario incluye `WHERE user_id = $userID` (nunca query sin filtro de usuario)
- Los endpoints de decks públicos solo exponen campos explícitamente marcados como públicos
- El `item_type = 'note'` nunca se incluye en decks públicos por default (requiere opt-in explícito)

### IA y privacidad
- Por default: solo `title` + `description` + `url` se envían al LLM
- Campos privados (`notes`, `why_saved`, `when_to_use`) nunca se envían sin opt-in explícito del usuario
- Logs de peticiones a IA no almacenan el contenido de los items, solo métricas de uso
- Opción de Ollama local documentada claramente en UI de settings

### Sync y autenticación
- Todas las operaciones de sync requieren JWT válido
- `client_id` es un UUID generado localmente, no ligado a identidad del usuario
- Operaciones de sync son idempotentes: el mismo `operation_id` procesado dos veces no genera duplicados

### Decks públicos
- Un deck público expone: `title`, `description`, `items[].title`, `items[].description`, `items[].url`, `items[].tags`
- Nunca expone: `notes`, `why_saved`, `when_to_use`, `ai_summary` (metadata personal)
- El owner del deck puede despublicarlo en cualquier momento; los links dejan de funcionar de inmediato

---

## 5. Estimación de costos de IA (referencia)

Con OpenAI (precios aproximados a Abril 2026):

| Operación | Modelo | Tokens aprox. | Costo por operación |
|-----------|--------|---------------|---------------------|
| Auto-classify | gpt-4o-mini | ~300 input + ~100 output | ~$0.00006 |
| Auto-summary | gpt-4o-mini | ~500 input + ~100 output | ~$0.00009 |
| Embed item | text-embedding-3-small | ~200 tokens | ~$0.000004 |
| Ask DevDeck | gpt-4o-mini | ~2000 input + ~200 output | ~$0.00033 |

**Ejemplo: usuario con 500 items**
- Enriquecimiento inicial (1 vez): 500 × ($0.00006 + $0.00009 + $0.000004) ≈ **$0.075**
- Ask DevDeck (10 preguntas/semana): $0.00033 × 10 × 52 ≈ **$0.17/año**

El costo de IA por usuario activo es marginal en la escala inicial.
