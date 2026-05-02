# Product Requirements Document (PRD)

**Project:** DevDeck.ai  
**Version:** 1.0 (Wave 5)  
**Status:** Active  
**Owner:** tfurt  
**Last Updated:** May 2026

[Leer en español](PRD.es.md)

---

## 0. Name and Domain

**DevDeck** is the definitive name. "Deck" evokes a personal deck of tools: organized, extensible, and curated by the developer.

**Domain:** [devdeck.ai](https://devdeck.ai)

| Subdomain | Purpose |
|------------|-----------|
| `devdeck.ai` | Landing page + marketing + downloads |
| `app.devdeck.ai` | Web app (React 18 — shared pages with desktop via monorepo) |
| `api.devdeck.ai` | REST Backend + sync engine |
| `docs.devdeck.ai` | Documentation |
| `download.devdeck.ai` | Desktop app downloads |

The `.ai` domain is **not decorative**. DevDeck uses AI to classify, summarize, retrieve by intent, and suggest related items — making everything you save **findable when you need it**. Without these features, the domain wouldn't be justified.

---

## 1. Vision

> **DevDeck is your AI-assisted external memory for development work.**

An **offline-first, multi-user, and multi-platform** app to save, organize, and rediscover everything useful a developer finds: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agents, prompts, and workflows. Powered by AI that classifies, summarizes, and retrieves by intent — not just exact tags.

### What DevDeck IS
- Your **personal collection** of useful development assets.
- Your **external memory** for tools you discover but forget.
- Your **launchpad** for commands, shortcuts, and workflows.
- Your **curated knowledge base** organized by AI.

### What DevDeck IS NOT
- A generic bookmark manager (Raindrop / Pocket).
- A note-taking app (Notion / Obsidian).
- A directory just for repos (GitHub Stars).
- A generic system launcher (Raycast / Alfred).
- A general AI chatbot (ChatGPT / Claude).

---

## 2. The Problem

### The Real Pain
Developers constantly discover tools, resources, and techniques. The problem isn't a lack of good tools — it's **the inability to find them when they are needed**.

The painful cycle:
1. Someone recommends a CLI, repo, plugin, or shortcut.
2. You save it in a chat, a file, or leave a browser tab open.
3. Weeks later, when the relevant problem appears, you can't find it.
4. If you find it, you don't remember what it was for or how to use it.
5. You end up Googling from scratch something you had already solved.

### Why Current Alternatives Fail
- **Browser Bookmarks:** No context, no rich previews, no custom tags, no semantic search.
- **GitHub Stars:** Only for GitHub repos; no CLIs, plugins, shortcuts, or personal notes.
- **Notion / Notes:** Total manual work (copy/paste), no automatic metadata, no AI, no smart sync.
- **ChatGPT:** Doesn't remember what you saved; it's not your personal collection.

---

## 3. Target Audience

### Primary
Active developers who discover many tools, work in multiple stacks, and want an app that becomes more valuable as they add items.

### Secondary (Post-Wave 7)
Development teams wanting to share a curated collection of tools, commands, and cheatsheets.

---

## 4. Item Types

The central entity is the `Item`. Repos are one type of item, but no longer the only one.

| Type | `item_type` | Description |
|------|------------|-------------|
| **Repo** | `repo` | GitHub/GitLab/any repo |
| **CLI** | `cli` | Command-line tools (jq, fzf, lazygit) |
| **Plugin** | `plugin` | IDE, editor, or app plugins |
| **Prompt** | `prompt` | AI coding prompts, custom instructions |
| **Agent** | `agent` | Autonomous agents, LLM workflows |
| **Cheatsheet** | `cheatsheet` | Quick command references by topic |
| **Shortcut** | `shortcut` | Keyboard shortcuts or gestures |
| **Workflow** | `workflow` | Sequence of steps for a task |
| **Snippet** | `snippet` | Reusable code fragments |
| **Note** | `note` | Decision notes, gotchas, context |

---

## 5. Features by Wave

### 🌊 Waves 1–4 — MVP + Web + Auth (Complete)

- **Wave 1:** Core Go API, Auth (GitHub), and basic Items CRUD.
- **Wave 2:** Enrichment engine (README rendering, metadata, screenshots).
- **Wave 3:** Cheatsheets (global search, seed data for git/docker/vim).
- **Wave 4:** Web client (React 18) and real Auth (JWT + Refresh Tokens).

### 🌊 Wave 5 — General Items + Utility Features (Current)

#### 5.1 Extended Items Model
- **Item Types:** Support for all types listed in section 4.
- **Quick Capture:** Save an item in < 5 seconds (Paste -> Enter -> Done).
- **"Why I saved it":** Dedicated field to capture the initial intent/context.

#### 5.2 Commands and Runbooks
- **Commands per Item:** Not just for repos — any item can have associated commands.
- **Runbooks:** Checklists for setup, deploy, or debugging.
- **Import from README:** Automatically detect "Getting Started" sections and convert them to steps.

#### 5.3 Rediscovery Views
- **Forgotten Gems:** Highlight items not seen in over 30 days.
- **Discovery Mode:** Tinder-like swipe interface for all item types.

---

## 6. AI Features (Wave 6)

AI in DevDeck is focused on **memory, organization, and retrieval**.

- **Auto-summary:** LLM-generated summaries (Why I saved this, what it's for).
- **Auto-tagging:** AI suggests tags, types, and stacks automatically.
- **Semantic Search:** Find items by intent: *"That tool for resizing images"* instead of exact tags.
- **Ask DevDeck:** RAG-based chat that queries **your own** knowledge base.

---

## 7. Non-Functional Requirements

- **Offline-first:** Core functionality (search/view) must work without internet (Desktop app).
- **Performance:** Instant search results (< 100ms).
- **Privacy:** Data is stored in a private database; explicit opt-in for AI features.
- **Monorepo:** Shared logic via `@devdeck/features` to ensure parity between apps.

---

## 8. Success Metrics

- **Retention:** Number of users who save at least 5 items per week.
- **Discovery:** At least 10 items rediscovered via "Forgotten Gems" per week.
- **Efficiency:** Saving an item in < 3 seconds (Quick Capture).

---

*Last updated: May 2026 (Wave 5)*
