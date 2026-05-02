# Technical Roadmap: AI & Offline Strategy

This document provides a deep dive into the technical implementation of **Wave 5 (AI)** and **Wave 6 (Offline-first)**.

[Leer en español](TECHNICAL_ROADMAP_AI_OFFLINE.es.md)

---

## 1. AI Integration Architecture

### 1.1 Semantic Brain
We move from keyword search to vector-based search.
- **Provider:** OpenAI (`text-embedding-3-small`) or Ollama (`mxbai-embed-large`).
- **Database:** `pgvector` extension for Postgres.
- **Pipeline:** When an item is saved, a background job fetches the content -> generates summary -> generates embedding -> stores in `embeddings` table.

### 1.2 "Ask DevDeck" (RAG)
Implementation of a Retrieval-Augmented Generation system over the user's vault.
1. User asks a question.
2. System generates an embedding for the question.
3. System finds top 5 relevant items via cosine similarity.
4. System prompts the LLM with the question + context from those 5 items.

---

## 2. Offline-first & Sync Strategy

### 2.1 Local Storage
- **Desktop (Electron):** SQLite via `better-sqlite3`.
- **Web (PWA):** `sql.js` with Origin Private File System (OPFS) persistence.

### 2.2 Synchronization Engine
We use an **Optimistic UI + Sync Queue** approach.
1. All CRUD operations are applied to the local DB immediately.
2. The operation is added to a `sync_queue` table.
3. A background loop tries to drain the queue to the backend.
4. Conflict resolution: Last-write-wins (LWW) based on `updated_at`.

### 2.3 Multi-Device Handling
- Each device has a unique `client_id`.
- Backend tracks the `version` (incrementing integer) of the user's state.
- Devices perform "Pull Sync" to get changes since their last known version.

---

## 3. Implementation Plan

### Sprint 1: Extended Model & Quick Capture (Wave 4.5 - Complete)
- Polymorphic items table.
- Multi-channel capture foundation (CLI/Extension).

### Sprint 2: Auto-Tagging & Auto-Summary (Wave 5 - In Progress)
- AI Worker implementation.
- LLM prompt engineering for categorization.

### Sprint 3: Semantic Search (Wave 5)
- pgvector setup.
- Hybrid search (BM25 + Vector) integration.

### Sprint 4: SQLite & Sync Foundation (Wave 6)
- Local DB schema definition.
- Sync queue implementation.

---

## 4. Privacy & Cost Considerations
- **Privacy:** Users can opt-in to local AI (Ollama) to keep their data off third-party servers.
- **Cost:** `gpt-4o-mini` is used for summarization due to its high efficiency and low cost.
