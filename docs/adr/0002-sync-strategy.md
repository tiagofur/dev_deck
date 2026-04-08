# ADR 0002 — Estrategia de sync offline-first

- **Estado:** Aceptada · 2026-04-08
- **Contexto de ola:** bloqueante para Ola 6 (Offline-first + Sync + Multi-usuario)
- **Nota:** la implementación concreta (SQLite local + cola + sync engine) aterriza en Ola 6 Fases 21–22. Este ADR solo fija el approach; cualquier ajuste menor durante la implementación se documenta aquí como addendum.

## Contexto

DevDeck tiene que funcionar sin red. Los clientes (Electron, Web PWA) escriben local primero, y sincronizan cuando hay conexión. Pueden haber múltiples devices del mismo usuario editando en paralelo.

El roadmap actual (Fase 22) propone "last-write-wins por campo usando `updated_at`". Este ADR formaliza la decisión y cubre los casos que LWW ingenuo no resuelve.

## Problemas del LWW ingenuo

1. **Clock skew.** Si el cliente usa su reloj local, dos operaciones pueden tener timestamps en orden incorrecto (o idénticos).
2. **Pérdida silenciosa en texto libre.** El campo `notes` (markdown editable) es el caso peor: dos devices editan distintas partes del mismo documento, el último pisa al primero, trabajo real perdido.
3. **Borrados vs updates.** Un device borra, otro edita — ¿gana el borrado o el update? Sin tombstones explícitos, el update re-crea el registro.
4. **Colisiones reales.** Mismo campo, mismo timestamp, valores distintos — hay que desempatar determinísticamente.

## Decisión propuesta

### 1. Timestamps del servidor, no del cliente
Cada operación que llega al backend recibe un `server_updated_at TIMESTAMPTZ DEFAULT now()`. El cliente envía su `client_updated_at` como *hint*, pero el orden canónico se establece con el server timestamp. Esto elimina el problema de clock skew.

### 2. Idempotencia con `client_id + operation_id`
Cada cliente genera un UUID al instalarse (`client_id`). Cada operación local genera un `operation_id` UUID. El endpoint `POST /api/sync/batch` es idempotente por `(client_id, operation_id)`: si llega dos veces, se ignora la segunda.

```sql
CREATE TABLE sync_operations (
  client_id UUID NOT NULL,
  operation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  op TEXT NOT NULL CHECK (op IN ('create','update','delete')),
  payload JSONB NOT NULL,
  client_updated_at TIMESTAMPTZ NOT NULL,
  server_applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, operation_id)
);
```

### 3. LWW por campo (field-level), no por row
Cada campo escribible guarda su propio `updated_at`. En el payload de sync el cliente envía `{ field: { value, updated_at } }`. El backend aplica cada campo individualmente: si el `updated_at` entrante es `>` al del server, aplica; sino descarta.

Esto evita que una edición de tags pise una edición concurrente de notas.

### 4. Tombstones para borrados
`items.deleted_at TIMESTAMPTZ` en lugar de `DELETE`. Los borrados son "soft" durante 30 días, después GC en un cron. Los clientes sincronizan tombstones como cualquier otra operación.

### 5. Texto libre (`notes`) con CRDT
El campo `notes` es el único donde LWW pierde trabajo real. Decisión: usar **Yjs** (document per `item_id`) almacenado como `bytea` en Postgres.

- Cliente: `yjs` + `y-indexeddb` para persistencia local + un provider custom que syncea via WebSocket o long-poll.
- Backend: endpoint `GET/POST /api/items/:id/notes-doc` que lee/escribe el blob Yjs y merge-ea.
- Fallback: si Yjs pesa demasiado para el tamaño de la base, restringirlo solo a notes de items abiertos recientemente.

Para el resto de los campos (`title`, `tags`, `why_saved`, `when_to_use`, `url`) LWW por campo es suficiente — son edits puntuales, no colaborativos.

### 6. Pull delta
```
GET /api/sync/delta?since=<server_timestamp>&limit=500
  → { operations: [...], next: <server_timestamp>, has_more: bool }
```
El cliente guarda el último `server_timestamp` aplicado. Al reconectar, hace pull paginado hasta alcanzar el presente.

### 7. UI de estado
En la topbar:
- `🟢 Sincronizado` (cola vacía, último pull < 60s).
- `🟡 3 cambios pendientes` (cola con ops sin mandar).
- `🔴 Sin conexión` (fetch falló > 3 veces).
- `⚠️ Conflicto en "Mi repo"` — rarísimo con field-level LWW + Yjs, pero si sucede, modal de resolución manual.

## Alternativas consideradas

- **LWW row-level puro:** descartado por pérdida de trabajo en texto libre.
- **Automerge en lugar de Yjs:** equivalente en garantías, pero Yjs es más eficiente en memoria y tiene ecosistema más maduro en JS. Yjs gana.
- **CRDTs para todo:** overkill — la mayoría de los campos no son colaborativos.

## Consecuencias

- Dependencia nueva: `yjs` en frontends, `github.com/ipfs/go-yjs` (o binding equivalente) en backend. Si no hay binding estable en Go, el backend solo almacena el blob y no merge-ea — el merge ocurre en el cliente al hacer pull. Esto es aceptable porque un item con 2 devices editando simultáneamente es un caso raro.
- El endpoint `/api/sync/batch` es el hot path — requiere tests exhaustivos de idempotencia y reintentos.
- Debt explícita: la UI de resolución de conflictos es MVP (modal "quedate con A / quedate con B / merge manual"); mejorable en Ola 8.

## Referencias
- Yjs: https://docs.yjs.dev/
- Figma's multiplayer: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
- CRDTs explained: https://crdt.tech/
