# DevDeck — Product Requirements Document

> Version: 1.1 · Owner: tfurt · Last updated: May 2026
>
> Status: evolving open-source product.

[Leer en español](PRD.es.md)

---

## 1. Vision

> **DevDeck is your AI-assisted external memory for development work.**

DevDeck helps developers save, organize, retrieve, and reuse useful development knowledge: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agents, prompts, requests, runbooks, and workflows.

The **Developer Workbench** shipped this direction (see phase status in [DEV_WORKBENCH.md](DEV_WORKBENCH.md)):

> Save useful knowledge, find it when it matters, and turn it into reusable actions.

The current product step is launch readiness: first-run experience, honest docs, and Circles as community memory (see the [ROADMAP](../ROADMAP.md)).

---

## 2. Problem

Useful developer knowledge is easy to lose and hard to recover.

Typical cases:

- A starred repo whose name you forgot.
- A command that worked once and disappeared into shell history.
- A snippet copied from a tutorial but never turned into reusable code.
- An API request tested manually and lost the next day.
- A prompt or agent that worked well but stayed buried in a chat.

The problem is not a lack of tools. The problem is rebuilding context again and again.

---

## 3. Solution

DevDeck combines three layers:

1. **Polymorphic vault:** dev-specific item types.
2. **Intelligent retrieval:** text, fuzzy, and semantic search.
3. **Reusable actions:** commands, snippets, requests, runbooks, and local utilities connected to the vault.

Product boundary:

- DevDeck does not replace IDEs, launchers, API clients, or secret managers.
- DevDeck stores the context that makes actions reusable.
- If an integrated utility does not become more valuable by connecting to the vault, it probably does not belong in core.

---

## 4. Pillars

| Pillar | Description |
|--------|-------------|
| **Developer-first** | Types, metadata, and workflows designed for development. |
| **Low-friction capture** | Saving from web, desktop, CLI, extension, or paste should take seconds. |
| **AI-assisted memory** | AI classifies, summarizes, and retrieves; it is not decorative. |
| **Local-first trust** | Useful offline behavior and clear control over sensitive data. |
| **Reusable actions** | Commands, requests, snippets, and runbooks should be easy to reuse. |
| **Pragmatic open source** | Easy to try, self-host, and contribute to in small pieces. |

---

## 5. Scope

### Core base

- Polymorphic items.
- Cheatsheets and commands.
- Capture from CLI/extension/app.
- Automatic enrichment.
- Text and semantic search.
- Desktop, web, and CLI.
- Self-hosting.

### Next scope: Developer Workbench

- Local utilities: JSON, JWT, Base64, URL encode, UUID, timestamps, hashes.
- Save outputs as snippets/notes.
- In-app palette for search, tools, command copy, and quick item creation.
- Lightweight API tester with savable requests.
- Project context from Desktop/CLI.

### Out of scope for now

- Replacing Postman/Insomnia.
- Replacing Raycast/Alfred as a system launcher.
- Building a custom secret manager.
- Global clipboard history by default.
- OCR/visual AI as an initial core feature.

---

## 6. Success Metrics

- **Capture:** save a useful item in under 3 seconds.
- **Reuse:** find and copy/open/run a saved action in under 10 seconds.
- **Retention:** users capture and reuse items every week.
- **Search success:** searches that end in a concrete action.
- **Trust:** local utilities used without network access.
- **Contribution:** small issues resolved by external contributors.

---

## 7. Related Docs

- [VISION.md](VISION.md)
- [DEV_WORKBENCH.md](DEV_WORKBENCH.md)
- [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md)
- [TECHNICAL_ROADMAP_AI_OFFLINE.md](TECHNICAL_ROADMAP_AI_OFFLINE.md)
