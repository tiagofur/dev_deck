# DevDeck — Known Limitations

> Honest limitations of the **0.5.0 Public Beta** · Last updated: June 2026
>
> Trust before hype: this page exists so nobody discovers a limitation the hard way. If you hit something not listed here, please [open an issue](https://github.com/tiagofur/dev_deck/issues).

---

## Sync and offline

- **There is no offline-first sync yet.** DevDeck runs in honest cloud mode: the app needs to reach the API to read and write your vault. Offline sync (local SQLite + conflict resolution) is intentionally deferred until after `1.0.0` (see [FEATURE_REVIEW_2026_06.md](archive/FEATURE_REVIEW_2026_06.md), decision A5).
- **Workbench utilities do run fully local.** JSON formatter, JWT decoder, Base64/URL tools, UUID/timestamp, hashes, regex tester, and the secret scanner work in-app without network access.
- **Full vault export is not available yet.** Today only cheatsheets and decks can be exported; a complete vault export/backup (JSON + Markdown) is tracked in #122.

## AI features

- **AI enrichment requires a configured provider.** Summaries, smart tags, semantic search, and Ask DevDeck need OpenAI, Ollama, or another supported provider. Without one, DevDeck uses a built-in heuristic tagger and text/fuzzy search, and the interactive AI surfaces are hidden rather than shown as dead buttons.
- **Heuristic tagging is more limited** than provider-backed enrichment: it works from URL patterns, metadata, and keywords, not from understanding content.
- **The weekly digest currently depends on an AI provider** for its summary. A no-AI fallback is tracked in #115.

## Search

- **Semantic ("by intent") search needs pgvector plus embeddings** from a configured provider. Without them, search falls back to text and fuzzy matching — still fast, but it matches words, not meaning.

## Social and team features

- **Circles are built for groups.** Solo users can create one, but the value appears when a team or community shares findings. Activity feed, reactions, and Circle digests are planned for `0.7.x`.
- **Explore/Trending depends on a community** and may look sparse while the user base grows.
- **Organizations, SAML SSO, and SCIM exist in the backend** but their UI is hidden unless you belong to an org. They are early enterprise capabilities, not polished products.

## Platform

- **The web API tester is subject to browser CORS.** The Desktop app sends requests from the Electron main process, so CORS does not apply there.
- **Desktop global shortcuts can conflict** with other apps; the shortcuts modal shows registration status and lets you change them.
- **Runbooks document commands but do not execute them.** Local command execution requires a security model we have not shipped yet.
- **No mobile app, PWA, or mobile share target yet.**

## Self-hosting

- **Postgres 16 with the pgvector extension is required** (the provided `deploy/` compose files use `pgvector/pgvector:pg16`).
- **This is a beta:** API routes and database schema may still change before `1.0.0`. Migrations are provided, but back up your database before upgrading.

---

See the [ROADMAP](../ROADMAP.md) for what is being worked on, and [SELF_HOSTING.md](SELF_HOSTING.md) for deployment details.
