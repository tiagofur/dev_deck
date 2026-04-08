# ADR 0001 — Modelo polimórfico de `items`

- **Estado:** Aceptada · 2026-04-08
- **Implementada en:** Wave 4.5 §16.9 — `backend/migrations/0005_items.sql` + `internal/domain/items/` + `internal/store/items.go`
- **Contexto de ola:** desbloquea Ola 5 (items + IA)

---

## Contexto

DevDeck nació como "directorio visual de repos". A partir de Ola 5, el modelo central evoluciona de `Repo` a `Item`, donde `Item` puede ser cualquiera de: `repo`, `cli`, `plugin`, `shortcut`, `snippet`, `agent`, `prompt`, `article`, `tool`, `workflow`, `note`.

Necesitamos decidir **cómo modelar esa polimorfia en Postgres** sin cargar deuda técnica pesada para las olas siguientes (sync, búsqueda semántica, runbooks, decks compartibles).

## Requerimientos

1. **Campos comunes** a todos los tipos: `id`, `title`, `url`, `description`, `notes`, `tags`, `created_at`, `updated_at`, `last_seen_at`, `why_saved`, `when_to_use`, `ai_summary`, `ai_tags`, `embedding vector(1536)`.
2. **Campos específicos por tipo:** un `repo` tiene `stars`, `language`, `avatar_url`, `topics`; un `cli` tiene `install_command`, `homepage`; un `shortcut` tiene `os`, `keys`; un `snippet` tiene `language`, `code`; un `prompt` tiene `model`, `role`, `body`; etc.
3. **Backwards compatibility:** los repos existentes deben migrar sin pérdida de datos ni IDs.
4. **Query performance:** filtrar por tipo y por stack debe ser rápido (≤ 50 ms en vault de 10k items).
5. **Búsqueda semántica** (Ola 6) va a correr sobre todos los items indistintamente.
6. **Sync offline-first** (Ola 7) debe poder serializar/deserializar items sin código tipo-específico en el cliente.

---

## Opciones consideradas

### Opción A — Single table + `item_type` + JSONB `meta`
Una tabla `items` con todos los campos comunes como columnas reales, y un `meta JSONB` para los campos específicos de cada tipo.

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('repo','cli','plugin',...)),
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  notes TEXT,
  tags TEXT[],
  why_saved TEXT,
  when_to_use TEXT,
  ai_summary TEXT,
  ai_tags TEXT[],
  embedding VECTOR(1536),
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ
);
CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_user_type ON items(user_id, item_type);
CREATE INDEX idx_items_meta_gin ON items USING gin(meta jsonb_path_ops);
CREATE INDEX idx_items_embedding ON items USING ivfflat(embedding vector_cosine_ops);
```

**Pros**
- Migración fácil desde `repos` (`ALTER TABLE repos RENAME TO items` + agregar columnas).
- Una sola tabla para búsqueda semántica, sync y decks — el código es uniforme.
- Cualquier tipo nuevo es "agregar un valor al enum", sin DDL.
- Serialización trivial en el cliente: `Item { common fields..., meta: Record<string, any> }`.

**Contras**
- Pérdida de tipado en Go para los campos específicos: hay que hacer `json.Unmarshal(meta, &RepoMeta{})` con un switch por tipo.
- Queries que filtran por campos JSONB son más lentas y más frágiles que columnas (aunque con índices GIN son aceptables).
- Riesgo de "schema drift" en `meta`: sin validación, cada versión del cliente puede escribir cosas distintas.
- Constraints (unique, foreign keys) sobre campos específicos no son posibles.

### Opción B — Base + satélites (tabla por tipo)
Una tabla `items` con los campos comunes, y tablas satélite `item_repos`, `item_clis`, etc. con FK 1:1 al item base.

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  notes TEXT,
  tags TEXT[],
  why_saved TEXT,
  ai_summary TEXT,
  ai_tags TEXT[],
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE item_repos (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  stars INT,
  language TEXT,
  avatar_url TEXT,
  topics TEXT[],
  github_id BIGINT UNIQUE
);

CREATE TABLE item_clis (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  install_command TEXT,
  homepage TEXT,
  package_manager TEXT
);
-- etc.
```

**Pros**
- Tipado fuerte en Go: `type ItemRepo struct { ... }`, `type ItemCLI struct { ... }`.
- Constraints reales: `UNIQUE(github_id)`, `NOT NULL`, FKs.
- Queries específicas por tipo son tan rápidas como si fueran single-type tables.
- Schema evolution explícita (migration por tipo nuevo).

**Contras**
- **10+ tablas satélite** al final del camino. Más SQL para escribir y mantener.
- Leer un item requiere un `JOIN` por tipo o un `LEFT JOIN` a todas las satélites (o un `CASE` en el query).
- Agregar un tipo nuevo es una migration completa.
- Código genérico más incómodo: listar "todos los items del user" requiere decidir qué satélite traer.

### Opción C — Single-table inheritance con columnas nulleables
Todos los campos (comunes + específicos) como columnas en `items`, nullables cuando no aplican.

```sql
CREATE TABLE items (
  id, item_type, title, url, ...,
  stars INT,              -- solo para repo
  language TEXT,          -- solo para repo/snippet
  install_command TEXT,   -- solo para cli
  keys TEXT,              -- solo para shortcut
  ...
);
```

**Pros**
- Tipado fuerte sin JSONB.
- Queries simples, sin joins.

**Contras**
- Tabla con 50+ columnas, la mayoría NULL la mayoría del tiempo. Huele mal.
- Agregar tipo nuevo = migration que mutan schema compartido.
- No escala — descartada.

---

## Decisión propuesta

**Opción A (single-table + JSONB) con 3 refinamientos:**

1. **Validación de `meta` por tipo en el backend.** Cada `item_type` tiene un struct Go que describe su `meta`. El handler valida con `json.Unmarshal` + `go-playground/validator` antes de persistir. Rechazo con 400 si no cumple.

2. **Generated columns para campos "hot" de repos.** Postgres 12+ permite `GENERATED ALWAYS AS ((meta->>'stars')::int) STORED` y `GENERATED ALWAYS AS ((meta->>'language')::text) STORED`. Esto nos da índices rápidos sobre `stars` y `language` sin mover los datos fuera de `meta`.

   ```sql
   stars INT GENERATED ALWAYS AS ((meta->>'stars')::int) STORED,
   language TEXT GENERATED ALWAYS AS (meta->>'language') STORED;
   CREATE INDEX idx_items_stars ON items(stars) WHERE item_type = 'repo';
   CREATE INDEX idx_items_language ON items(language) WHERE language IS NOT NULL;
   ```

3. **Índices parciales por `item_type`** para filtrar eficientemente.
   ```sql
   CREATE INDEX idx_items_repos ON items(user_id, updated_at DESC) WHERE item_type = 'repo';
   CREATE INDEX idx_items_clis ON items(user_id, updated_at DESC) WHERE item_type = 'cli';
   ```

### Por qué A y no B
- DevDeck es un proyecto indie con superficie de features en crecimiento. El costo de B (DDL por tipo nuevo, joins, boilerplate de store por tipo) es alto y persistente.
- Los refinamientos (validación, generated columns, partial indexes) **mitigan los contras reales** de A: pérdida de tipado y queries lentas sobre JSONB.
- Sync y búsqueda semántica son más simples con una sola tabla.

### Cuándo reconsiderar
Si en Ola 7+ aparece un tipo con **reglas de integridad fuertes** (ej: un `subscription` con relaciones a tablas externas, expiración, foreign keys), ese tipo puede "salir" a su propia tabla sin tocar los demás. La Opción A admite mezcla.

---

## Plan de migración

```
migrations/0005_items.sql
  1. ALTER TABLE repos RENAME TO items;
  2. ALTER TABLE items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'repo';
  3. ALTER TABLE items ADD COLUMN meta JSONB NOT NULL DEFAULT '{}';
  4. UPDATE items SET meta = jsonb_build_object(
       'stars', stars,
       'language', language,
       'avatar_url', avatar_url,
       'topics', topics,
       'github_id', github_id
     );
  5. ALTER TABLE items DROP COLUMN stars, language, avatar_url, topics, github_id;
  6. ALTER TABLE items
       ADD COLUMN stars INT GENERATED ALWAYS AS ((meta->>'stars')::int) STORED,
       ADD COLUMN language TEXT GENERATED ALWAYS AS (meta->>'language') STORED;
  7. Recrear índices con partial predicates.
  8. ALTER TABLE repo_commands RENAME TO item_commands;
  9. ALTER TABLE item_commands RENAME COLUMN repo_id TO item_id;
  10. Actualizar todas las FKs.
```

Rollback: backup previo + migration inversa preparada.

## Consecuencias

- El package `internal/domain/repos` se reemplaza por `internal/domain/items` con sub-packages por tipo que definen los structs de `meta` y la validación.
- El store `internal/store/items.go` expone métodos genéricos (`List`, `Get`, `Create`, `Update`, `Delete`) + helpers tipo-específicos cuando conviene (`ListRepos`, `ListCLIs`, etc.) que son wrappers con filtro.
- El endpoint `/api/repos` queda como **alias deprecado** de `/api/items?type=repo` durante 2 olas, después se remueve.
- Los clientes tienen un `type Item = { ...common, meta: Record<string, unknown> }` y un discriminador por `item_type` para renderizar cards específicas.

## Referencias
- Postgres generated columns: https://www.postgresql.org/docs/current/ddl-generated-columns.html
- JSONB indexing: https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING
- Discussion thread: _(pendiente — abrir en GitHub Discussions cuando esté público)_
