---
tags:
  - devdeck
  - ai
  - strategy
  - embedding
status: active
date: 2026-04-29
---

# 🤖 DevDeck — AI Strategy

> Cómo la IA agrega valor real a DevDeck. No es decorativa. Es útil.

---

## 🎯 Tesis central

> **La IA en DevDeck no chatotea. Clasifica, resume, busca y descubre.**

### Por qué la IA importa
1. **Costo cognitivo**: Un dev encuentra 100 tools en su carrera. Sin IA, organizar es trabajo manual.
2. **Encontrabilidad**: Sin búsqueda semántica, los items se "pierden" aunque estén guardados.
3. **Contexto**: La IA entiende que "CLI para tareas paralales" y "task runner" son cosas relacionadas.
4. **Redescubrimiento**: La IA puede "recordarte" que existe X cuando estás resolviendo problema Y.

### Por qué NO es decorativa
- Tagging automático: ahorra 30 segundos por item × 100 items = 50 min ahorrados
- Semantic search: encuentras lo correcto al primero, no al 5to resultado
- Related items: encuentras tools que no sabías que tenías

---

## 🔄 Workflows que usan IA

### 1. Auto-tagging (Ola 2)

**Input**: URL + title + description  
**Output**: 3-5 tags relevantes + confidence score

#### Prompt
```
You are a developer classification system. Analyze the following URL, title, and description.
Classify it with 3-5 relevant technical tags from this list:

Categories: cli, library, framework, plugin, snippet, workflow, template, tutorial, 
            database, cloud, container, build-tool, testing, monitoring, security,
            documentation, ai-ml, blockchain, devops, performance, automation

Stack tags: go, node, python, rust, java, javascript, typescript, react, vue, 
            docker, kubernetes, aws, gcp, azure, postgresql, mongodb

Example tags: [cli, go, performance]

URL: {url}
Title: {title}  
Description: {description}

Tags (as JSON array with confidence):
[
  {"tag": "cli", "confidence": 0.95},
  {"tag": "go", "confidence": 0.90},
  {"tag": "performance", "confidence": 0.75}
]
```

#### Accuracy target
- >= 80% of auto-tags match manual review
- User can remove incorrect tags
- Feedback loop: bad tags improve model over time

#### Implementation
```typescript
// Backend: Go
func AutoTagItem(ctx context.Context, item Item, aiClient *openai.Client) ([]Tag, error) {
  prompt := buildTagPrompt(item)
  response := aiClient.CreateCompletion(ctx, openai.CompletionRequest{
    Prompt: prompt,
    Model: "gpt-4-turbo", // or use ollama for cost
  })
  return parseTagsFromResponse(response)
}

// Frontend: React
const autotag = async (item) => {
  const response = await fetch('/api/v1/items/{id}/tags/auto', { method: 'POST' });
  setItem({ ...item, tags: response.tags });
};
```

### 2. Semantic Search (Ola 2)

**Input**: Natural language query  
**Output**: Ranked list of items (by relevance)

#### How it works
1. User query → OpenAI embedding (or local via Ollama)
2. Embedding stored in vector DB
3. Search compares query embedding to item embeddings
4. Return top N results sorted by cosine similarity

#### Embeddings
```
"CLI for parallel tasks"
  ↓ [OpenAI text-embedding-3-small]
  ↓ 1536-dimensional vector
  [0.023, -0.156, 0.089, ...]
  
Store in: Pinecone / Weaviate / pgvector

Item embeddings (batch):
- cobra (Go CLI)  → [0.021, -0.158, 0.091, ...]
- urfave/cli      → [0.020, -0.157, 0.090, ...]
- click (Python)  → [0.019, -0.159, 0.088, ...]

Cosine similarity search finds similar vectors
```

#### Example queries → results
```
"CLI for parallel tasks"
  ↓ Results:
  1. cobra (Go) — 0.94 similarity
  2. urfave/cli (Go) — 0.92
  3. click (Python) — 0.88
  4. goreleaser — 0.82

"Node testing framework"
  ↓ Results:
  1. Jest — 0.96
  2. Vitest — 0.95
  3. Mocha — 0.93
  4. Cypress — 0.85

"Performance optimization tips"
  ↓ Results:
  1. [Go performance tips item] — 0.94
  2. [V8 optimization article] — 0.91
  3. [pprof tutorial] — 0.89
```

#### Accuracy target
- Top 3 results relevant for 90% of queries
- Relevance: User clicks within first 3 results

#### Implementation
```typescript
// Backend: Go + Vector DB
func SemanticSearch(ctx context.Context, query string, limit int) ([]Item, error) {
  // 1. Embed query
  queryEmbedding := openai.CreateEmbedding(query)
  
  // 2. Search vector DB
  results := vectorDB.Search(queryEmbedding, limit)
  
  // 3. Return ranked items
  return hydrateItems(results)
}

// Frontend: React
const handleSemanticSearch = async (query) => {
  const response = await fetch('/api/v1/search/semantic', {
    method: 'POST',
    body: JSON.stringify({ q: query, limit: 10 })
  });
  const results = await response.json();
  setSearchResults(results);
};
```

### 3. Auto-Summary (Ola 2)

**Input**: Item URL (fetch content)  
**Output**: 1-2 line summary

#### Prompt
```
Summarize what this tool does in 1-2 sentences for a developer.
Be concise, technical, actionable.

URL: {url}
Content: {fetched_content}

Summary:
```

#### Example
```
Input: https://github.com/spf13/cobra
Output: "Go CLI framework with automatic command/flag handling. Perfect for building complex CLIs with subcommands and arguments."
```

#### Accuracy
- Summary is accurate and helpful (manual review sample)
- Improves UX: user understands item in 5 seconds

### 4. Stack Detection (Ola 2)

**Input**: Item title + description  
**Output**: Technologies used (Go, Node, Docker, etc)

#### Prompt
```
What programming languages / technologies are mentioned or implied?
Return array of: go, node, python, rust, java, javascript, typescript, 
                docker, kubernetes, aws, postgresql, etc

Title: {title}
Description: {description}

Technologies:
```

#### Example
```
Input: cobra (Go CLI framework)
Output: ["go", "cli", "command-line"]

Input: goreleaser (Build & release Go binaries
Output: ["go", "devops", "release"]
```

#### Usage
- Filter by stack: "Show me my Go tools"
- Suggestions: "You have 12 Go items, 3 Node items"

### 5. Related Items (Ola 2)

**How it works**: Semantic similarity between items

```
User viewing: cobra (Go CLI framework)

Get cobra embedding
Search vector DB for nearest neighbors (excluding cobra)

Related items:
1. urfave/cli (Go CLI framework) — 0.92 similarity
2. spf13/viper (Config by same author) — 0.88
3. Hyperledger Fabric CLI (Complex CLI UX) — 0.84
```

#### Impact
- User discovers items they didn't know they had
- 15-20% click-through on related items

### 6. Duplicate Detection (Ola 2)

**When**: User captures new item

```
New item: github.com/spf13/cobra
↓ Embed URL/title
↓ Search for similar items in vector DB
↓ If similarity > 0.95, prompt user:
  "You already have this? [View] [Add anyway]"
```

---

## 🧠 AI Models & Costs

### Option 1: OpenAI API (Paid, easiest)

```
Model: gpt-4-turbo / gpt-3.5-turbo
Embedding: text-embedding-3-small

Costs:
- 1M input tokens: $0.50
- 1M embedding tokens: $0.02
- For 1000 items: ~$1

Per user per month (estimate):
- Capture 10 items → tagging → $0.10
- 20 queries semantic search → $0.20
- Total: ~$0.30/user/month (for 10k items)
```

### Option 2: Ollama (Free, local)

```
Models: Mistral 7B, Llama2 7B, Neural Chat 7B
Size: 7B model ≈ 14GB disk (compresses to ~4GB with quantization)

Setup: User installs Ollama locally, runs `ollama pull mistral`

Performance:
- Tagging: ~2-3s per item (GPU-accelerated)
- Search: Vector search local, < 200ms

Cost: $0 (user runs locally)
Privacy: 100% (no data sent to cloud)
Downside: Slower than OpenAI, requires ~4GB disk + GPU
```

### Option 3: Hybrid (Recommended)

```
Default: Try Ollama locally
Fallback: If not installed, offer OpenAI API key config
User choice: Settings → "Use local AI" (toggle)

This gives:
- Privacy + cost: Devs who care about privacy use Ollama
- Convenience: Users who want fast can use OpenAI
- No vendor lock-in: Works either way
```

---

## 📊 AI features rollout timeline

### Ola 2a: Auto-tagging + Summaries (Q3 2026, 4 weeks)
- Backend: OpenAI integration
- Feature: Auto-tag on capture, auto-summary
- Vector DB: Setup + initial embeddings

### Ola 2b: Semantic search (Q3 2026, 4 weeks)
- Frontend: Improve search UX
- Backend: Semantic search endpoint
- DB: Optimize embeddings queries

### Ola 2c: Related items + Duplicate detection (Q4 2026, 2 weeks)
- Frontend: Related items sidebar
- Backend: Duplicate detection logic

### Ola 4: Local Ollama integration (Q4 2026, 4 weeks)
- Frontend: "Use local AI" toggle
- Backend: Ollama HTTP client
- UX: Download + setup instructions

### Ola 5: Ask DevDeck assistant (Q1 2027, 4 weeks)
- Backend: Chat endpoint (uses semantic search + LLM)
- Frontend: Chat sidebar
- UX: Context-aware responses

---

## 🔒 Privacy & Data

### What data is sent to OpenAI?
```
If using OpenAI:
- Item titles
- Item descriptions  
- User queries (for search)

NOT sent:
- User account info
- Deck names (processed locally)
- Personal notes (kept local)
```

### GDPR compliance
- Users can delete data (deletes embeddings too)
- No data retention after deletion
- Data processing agreement with OpenAI/Ollama

### Privacy mode
- Setting: "Use local AI only"
- Forces Ollama usage (no OpenAI API calls)
- Semantic search uses local embeddings

---

## 📈 Success metrics

### Ola 2 (AI Intelligence)
- Auto-tag accuracy >= 80%
- Semantic search top-3 relevance >= 90%
- 60% of searches use semantic (vs fuzzy)
- Related items click-through >= 15%
- Manual review: Random 100 items → tags good?

### Ola 4 (Local AI)
- 80% of power users enable local AI
- Ollama latency < 200ms (target)
- Zero data leakage to cloud

### Ola 5 (Ask DevDeck)
- Chat modal used by 40% of daily users
- Satisfaction score >= 7/10
- Code generation saves 5+ min/day per user

---

## 🚀 Implementation checklist

- [ ] **Ola 2a**
  - [ ] OpenAI API client setup
  - [ ] Auto-tagging endpoint `/items/{id}/tags/auto`
  - [ ] Auto-summary endpoint `/items/{id}/summary/auto`
  - [ ] Vector DB setup (Pinecone/Weaviate/pgvector)
  - [ ] Batch embedding job (existing items)

- [ ] **Ola 2b**
  - [ ] Embedding search endpoint `/search/semantic`
  - [ ] Web UI: Semantic search in search bar
  - [ ] Results ranking by similarity

- [ ] **Ola 2c**
  - [ ] Related items endpoint
  - [ ] Duplicate detection logic
  - [ ] Web UI: Related items sidebar

- [ ] **Ola 4**
  - [ ] Ollama client integration
  - [ ] Settings: "Use local AI"
  - [ ] Download + setup flow

- [ ] **Ola 5**
  - [ ] Chat endpoint (semantic search + context)
  - [ ] Chat UI component
  - [ ] Code generation prompts

---

## 🔗 Related documents

- [STRATEGIC_ROADMAP.md](STRATEGIC_ROADMAP.md)
- [ROADMAP_WEB.md](ROADMAP_WEB.md)
- [ROADMAP_DESKTOP.md](ROADMAP_DESKTOP.md)
- [../API.md](../API.md) — API endpoints for AI features

---

**Owner**: tfurt  
**Última actualización**: 2026-04-29  
**Estado**: 🟢 Activo — Guía para implementación Ola 2
