---
tags:
  - devdeck
  - schema
  - database
  - data-model
status: active
date: 2026-04-29
---

# 🗂️ DevDeck — Data Schema

> Definición completa del modelo de datos. Todas las entidades, relaciones, y campos. Fuente única de verdad para backend + frontend.

---

## 🎯 Principios

1. **Normalizado** — Evita duplicación de datos
2. **Extensible** — Fácil agregar nuevos tipos de items
3. **Queryable** — Índices para búsqueda rápida
4. **Versionado** — Schema evoluciona sin breaking changes
5. **Auditable** — created_at, updated_at, created_by en todo

---

## 📊 Modelo conceptual

```
User
├── Deck (carpetas temáticas)
│   ├── Item (repos, CLIs, snippets, etc)
│   │   ├── Tag (auto + manual)
│   │   ├── Command (cómo se usa)
│   │   └── Relation (items relacionados)
│   └── Setting (config per deck)
└── Share (items/decks compartidos)
    ├── Comment (comentarios en items públicos)
    └── Activity (feed de cambios)
```

---

## 🗄️ Entidades detalladas

### 1. **User**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  
  -- Preferences
  theme TEXT DEFAULT 'auto',      -- 'auto' | 'light' | 'dark'
  language TEXT DEFAULT 'es',     -- 'es' | 'en'
  timezone TEXT DEFAULT 'UTC',
  use_local_ai BOOLEAN DEFAULT false,  -- Usar Ollama vs OpenAI
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  deleted_at TIMESTAMP NULL,       -- Soft delete
  
  -- Relationships
  github_id TEXT UNIQUE,           -- For GitHub auth
  api_key TEXT UNIQUE              -- For API access
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id);
```

---

### 2. **Deck**

```sql
CREATE TABLE decks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Metadata
  name TEXT NOT NULL,              -- "Go tools", "DevOps", etc
  description TEXT,
  color TEXT DEFAULT '#FF6B00',    -- Hex color (Snarkel orange default)
  icon TEXT DEFAULT '📦',          -- Emoji icon
  is_public BOOLEAN DEFAULT false, -- Shareable?
  
  -- Organization
  parent_deck_id UUID REFERENCES decks(id),  -- For nested decks (future)
  sort_order INT DEFAULT 0,
  
  -- Stats (denormalized for perf)
  items_count INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,       -- Soft delete
  
  CONSTRAINT fk_deck_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, name)           -- Can't have duplicate deck names per user
);

-- Indexes
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_is_public ON decks(is_public);
```

---

### 3. **Item**

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES decks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Core data
  type TEXT NOT NULL,              -- 'repo', 'cli', 'plugin', 'snippet', 'tip', 'workflow', 'prompt'
  url TEXT,                        -- For repos/CLIs/resources
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,                    -- For snippets/tips: actual code/text
  
  -- Rich metadata
  image_url TEXT,                  -- GitHub og:image or user-uploaded
  summary TEXT,                    -- AI-generated summary (max 1 sentence)
  language TEXT,                   -- For snippets: 'go', 'python', 'javascript'
  stack TEXT[],                    -- Auto-detected: ['go', 'cli', 'performance']
  
  -- AI data
  embedding VECTOR(1536),          -- OpenAI text-embedding-3-small
  embedding_model TEXT DEFAULT 'text-embedding-3-small',  -- For tracking model version
  
  -- Personal context
  personal_notes TEXT,             -- Why I saved this, how I use it
  rating INT CHECK (rating >= 0 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT false,
  
  -- Source tracking
  source_url TEXT,                 -- Where did user find it (for analytics)
  source_type TEXT,                -- 'direct', 'github', 'twitter', 'recommendation', 'search'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  deleted_at TIMESTAMP NULL,       -- Soft delete
  
  CONSTRAINT fk_item_deck FOREIGN KEY (deck_id) REFERENCES decks(id),
  CONSTRAINT fk_item_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_items_deck_id ON items(deck_id);
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_is_favorite ON items(is_favorite);
CREATE INDEX idx_items_created_at ON items(created_at DESC);  -- Recent items
CREATE INDEX idx_items_embedding ON items USING ivfflat(embedding vector_cosine_ops);  -- Vector search
```

---

### 4. **Tag**

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Tag data
  name TEXT NOT NULL,              -- 'cli', 'go', 'performance', etc
  is_auto_generated BOOLEAN DEFAULT false,  -- AI-generated vs manual
  confidence FLOAT,                -- If auto-generated: 0.0-1.0 confidence
  category TEXT,                   -- 'tool-type' | 'stack' | 'skill' | 'custom'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,       -- Soft delete (user removed tag)
  
  CONSTRAINT fk_tag_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_tag_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (item_id, name)           -- Can't have duplicate tags on same item
);

-- Indexes
CREATE INDEX idx_tags_item_id ON tags(item_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);
```

---

### 5. **Command**

```sql
CREATE TABLE commands (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Command data
  command_text TEXT NOT NULL,      -- 'npm install', 'docker build -t', etc
  description TEXT,                -- What does this command do?
  flags TEXT[],                    -- Relevant flags (for auto-complete)
  example_args TEXT,               -- 'package_name' or '[options]'
  output_description TEXT,         -- What to expect
  
  -- Context
  platform TEXT,                   -- 'mac', 'linux', 'windows' (all if null)
  category TEXT,                   -- 'install', 'run', 'build', 'test', 'deploy'
  is_most_common BOOLEAN DEFAULT false,  -- Show at top?
  usage_count INT DEFAULT 0,       -- Track how often used (for recommendations)
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT fk_command_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_command_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_commands_item_id ON commands(item_id);
CREATE INDEX idx_commands_category ON commands(category);
CREATE INDEX idx_commands_most_common ON commands(is_most_common);
```

---

### 6. **Tip**

```sql
CREATE TABLE tips (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Tip data
  title TEXT NOT NULL,             -- "Go goroutine best practices"
  content TEXT NOT NULL,           -- Markdown content
  stack TEXT NOT NULL,             -- 'go', 'node', 'python', 'docker', etc
  category TEXT NOT NULL,          -- 'performance', 'debugging', 'setup', 'best-practices'
  difficulty TEXT,                 -- 'beginner', 'intermediate', 'advanced'
  
  -- Code example
  code_example TEXT,               -- Optional code snippet
  code_language TEXT,              -- 'go', 'javascript', etc
  
  -- Relationships
  related_item_id UUID REFERENCES items(id),  -- Link to repo/CLI if applicable
  
  -- Metadata
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT fk_tip_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_tip_item FOREIGN KEY (related_item_id) REFERENCES items(id)
);

-- Indexes
CREATE INDEX idx_tips_stack ON tips(stack);
CREATE INDEX idx_tips_category ON tips(stack, category);
CREATE INDEX idx_tips_is_public ON tips(is_public);
```

---

### 7. **Relation** (Graph of items)

```sql
CREATE TABLE relations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Relationships
  source_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  -- Type of relationship
  relation_type TEXT NOT NULL,     -- 'similar', 'depends_on', 'alternative', 'complements', 'inspired_by'
  confidence FLOAT,                -- 0.0-1.0 (higher = stronger relation)
  
  -- Metadata
  is_auto_detected BOOLEAN DEFAULT false,  -- AI-detected vs manual
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_relation_source FOREIGN KEY (source_item_id) REFERENCES items(id),
  CONSTRAINT fk_relation_target FOREIGN KEY (target_item_id) REFERENCES items(id),
  CONSTRAINT fk_relation_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (source_item_id, target_item_id, relation_type)  -- No duplicate relations
);

-- Indexes
CREATE INDEX idx_relations_source ON relations(source_item_id);
CREATE INDEX idx_relations_target ON relations(target_item_id);
CREATE INDEX idx_relations_type ON relations(relation_type);
```

---

### 8. **Share** (Sharing & Public access)

```sql
CREATE TABLE shares (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- What's being shared
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  
  -- Share settings
  share_token TEXT NOT NULL UNIQUE,  -- UUID or short slug
  share_type TEXT DEFAULT 'item',    -- 'item' | 'deck'
  allow_comments BOOLEAN DEFAULT true,
  allow_copy BOOLEAN DEFAULT true,
  allow_export BOOLEAN DEFAULT false,
  
  -- Expiration
  expires_at TIMESTAMP NULL,         -- NULL = never expires
  access_count INT DEFAULT 0,        -- How many times accessed
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT fk_share_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_share_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_share_deck FOREIGN KEY (deck_id) REFERENCES decks(id),
  CONSTRAINT check_share_type CHECK (
    (share_type = 'item' AND item_id IS NOT NULL) OR
    (share_type = 'deck' AND deck_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_shares_token ON shares(share_token);
CREATE INDEX idx_shares_user_id ON shares(user_id);
CREATE INDEX idx_shares_expires_at ON shares(expires_at);
```

---

### 9. **Comment** (Social/collaboration)

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Target
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  -- Comment data
  text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  
  -- Threading (for nested comments - future feature)
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_comment_item FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Indexes
CREATE INDEX idx_comments_item_id ON comments(item_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(item_id, created_at DESC);
```

---

### 10. **Activity** (Audit log + social feed)

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- What happened
  action TEXT NOT NULL,            -- 'create', 'update', 'delete', 'share', 'favorite'
  object_type TEXT NOT NULL,       -- 'item', 'deck', 'comment', 'tag'
  object_id UUID NOT NULL,         -- ID of created/modified object
  
  -- Changes (JSON, for auditing)
  changes JSONB,                   -- {'field': 'old_value', 'new_value'}
  
  -- Metadata
  ip_address TEXT,                 -- For security audit
  user_agent TEXT,                 -- For analytics
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_activities_user_id ON activities(user_id, created_at DESC);
CREATE INDEX idx_activities_object ON activities(object_type, object_id);
CREATE INDEX idx_activities_action ON activities(action);
```

---

## 🔗 Key relationships

```
User
  ├── 1:N Deck (user owns multiple decks)
  ├── 1:N Item (user can save multiple items)
  ├── 1:N Tag (user creates tags)
  ├── 1:N Command (user adds commands)
  ├── 1:N Tip (user creates tips)
  ├── 1:N Share (user shares items/decks)
  ├── 1:N Comment (user comments on items)
  └── 1:N Activity (audit log)

Deck
  └── 1:N Item (deck contains multiple items)
  
Item
  ├── 1:N Tag (item has multiple tags)
  ├── 1:N Command (item has multiple commands)
  ├── 1:N Comment (item can receive comments)
  ├── 1:N Relation (item can relate to other items)
  └── 1:1 Share (item can be shared)

Tag
  └── Many:Many Item (via junction table - implicit here)

Relation
  └── Item → Item (graph of relationships)

Share
  └── Can reference Item OR Deck
```

---

## 📋 JSON Examples

### Item (Repository)

```json
{
  "id": "uuid-1234",
  "deck_id": "uuid-go-tools",
  "user_id": "uuid-user",
  "type": "repo",
  "url": "https://github.com/spf13/cobra",
  "title": "cobra",
  "description": "A Commander for modern Go CLI apps",
  "image_url": "https://opengraph.b-cdn.net/...",
  "summary": "Go framework for building powerful CLIs with automatic command parsing and documentation generation.",
  "stack": ["go", "cli", "framework"],
  "embedding": [0.023, -0.156, 0.089, ...],
  "personal_notes": "Perfect for building our internal tools. Used in all our projects.",
  "rating": 5,
  "is_favorite": true,
  "source_type": "recommendation",
  "tags": [
    { "name": "cli", "is_auto_generated": true, "confidence": 0.95 },
    { "name": "go", "is_auto_generated": true, "confidence": 0.98 },
    { "name": "recommended", "is_auto_generated": false }
  ],
  "commands": [
    {
      "command_text": "cobra init <app>",
      "description": "Create a new CLI app",
      "category": "setup",
      "is_most_common": true
    },
    {
      "command_text": "cobra add <command>",
      "description": "Add a new command to app",
      "category": "setup",
      "is_most_common": true
    }
  ],
  "relations": [
    { "target_item_id": "uuid-urfave", "type": "alternative", "confidence": 0.92 },
    { "target_item_id": "uuid-viper", "type": "complements", "confidence": 0.88 }
  ],
  "created_at": "2026-04-29T10:00:00Z",
  "updated_at": "2026-04-29T10:00:00Z"
}
```

### Item (Tip)

```json
{
  "id": "uuid-tip-1",
  "deck_id": "uuid-tips",
  "user_id": "uuid-user",
  "type": "tip",
  "title": "Go goroutine memory leaks",
  "description": "Common patterns that cause goroutine leaks in Go",
  "content": "Markdown content here about goroutine management...",
  "code_example": "go func() {\n  // This goroutine leaks\n  for range time.Tick(1 * time.Second) { }\n}()",
  "stack": ["go", "performance", "debugging"],
  "tags": [
    { "name": "memory", "is_auto_generated": true },
    { "name": "concurrency", "is_auto_generated": true }
  ],
  "created_at": "2026-04-29T10:00:00Z"
}
```

---

## 🔄 API endpoints (matching schema)

```
Items:
POST   /api/v1/items              Create item
GET    /api/v1/items              List items (with filters)
GET    /api/v1/items/{id}         Get item detail
PUT    /api/v1/items/{id}         Update item
DELETE /api/v1/items/{id}         Delete item

Tags:
POST   /api/v1/items/{id}/tags    Add tag
DELETE /api/v1/items/{id}/tags/{tag_id}  Remove tag
POST   /api/v1/items/{id}/tags/auto      Auto-generate tags

Commands:
POST   /api/v1/items/{id}/commands       Add command
DELETE /api/v1/items/{id}/commands/{cmd_id}

Search:
GET    /api/v1/search?q=...             Fuzzy search
POST   /api/v1/search/semantic          Semantic search

Decks:
POST   /api/v1/decks              Create deck
GET    /api/v1/decks              List user's decks
PUT    /api/v1/decks/{id}         Update deck
DELETE /api/v1/decks/{id}         Delete deck

Sharing:
POST   /api/v1/items/{id}/share   Generate share link
GET    /api/v1/share/{token}      Access shared item

Relations:
POST   /api/v1/items/{id}/relations      Add relation
GET    /api/v1/items/{id}/related        Get related items
```

---

## 🚀 Migration strategy

### Phase 1: Current schema
- Backwards compatible with existing data
- Add new fields as nullable

### Phase 2: Ollama support
- Add `embedding` column (nullable initially)
- Add `embedding_model` tracking

### Phase 3: Extensions (future)
- `collections` (sub-folders in decks)
- `workflows` (multi-step procedures)
- `batch_operations` (multi-item actions)

---

## 🔒 Data access control

```
User can:
- Create/edit/delete own items
- Share items (generate share link)
- See public items from others
- Comment on public items

User CANNOT:
- Access other user's private items
- Delete other user's items
- Modify other user's tags

Share link:
- Can be view-only (default)
- Can allow comments (optional)
- Can allow copying to own deck (optional)
- Can expire after N days
```

---

## 📊 Performance notes

### Indexes created for speed:
- `users(email)` — Login lookups
- `decks(user_id)` — List user's decks
- `items(deck_id, created_at)` — Recent items in deck
- `items(embedding)` — Vector similarity search
- `tags(item_id, name)` — Tag lookups
- `relations(source_item_id)` — Related items
- `comments(item_id, created_at)` — Comments on item

### Denormalization (for query perf):
- `decks.items_count` — Avoids COUNT(*) on every deck list
- `embedding` — Stored directly on item (not separate table)

### Caching strategy:
- User's deck list (cache invalidated on deck change)
- Recent items in deck (cache invalidated on new item)
- Popular tags (refresh daily)

---

## 🔄 Versioning

Current schema version: **1.0.0** (2026-04-29)

Breaking changes will increment major version.

```
Schema version in database:
SELECT version FROM schema_info;
-- Returns: 1.0.0
```

---

**Owner**: tfurt  
**Última actualización**: 2026-04-29  
**Estado**: 🟢 Activo — Referencia para implementación backend
