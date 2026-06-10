# DevDeck.ai Roadmap

This roadmap reflects the current public position of DevDeck: **0.5.0 Public Beta**.

[Leer en español](ROADMAP.es.md)

---

## Current product direction

DevDeck is becoming a developer memory layer: capture useful developer artifacts, add context, retrieve them by intent, use them inside a Workbench, and share high-signal findings with trusted Circles.

The priority before a stable `1.0.0` is not more hype. It is trust:

- clear onboarding,
- reliable setup,
- polished UI states,
- honest documentation,
- useful demo data,
- stable capture/search/workbench/Circles flows,
- and a contributor path that makes small PRs easy.

Offline-first sync is intentionally deferred until after `1.0.0` (see [docs/FEATURE_REVIEW_2026_06.md](docs/FEATURE_REVIEW_2026_06.md), decision A5). Today DevDeck runs in honest cloud mode; Workbench utilities work fully local, and a full vault export (#122) covers data ownership in the meantime.

---

## 0.5.x — Public beta / launch readiness

### Product polish

- [x] Clarify public README and launch story.
- [x] Position DevDeck honestly as `0.5.0 Public Beta`.
- [x] Add screenshots and/or a short demo GIF.
- [ ] Add realistic demo/seed data for a first-run experience (#117).
- [ ] Document known limitations clearly (#129).
- [ ] Verify local setup on a clean machine.

### Core developer memory loop

- [x] Capture developer artifacts into the vault.
- [x] Add context such as notes, tags, source, and why it matters.
- [x] Support fuzzy/semantic retrieval direction with Postgres search extensions.
- [x] Share useful findings into Circles with context and attribution.
- [ ] Tighten empty/loading/error states across core flows (#119).
- [ ] Improve first-run onboarding around capture → retrieve → share (#118).

### Workbench

- [x] Establish Developer Workbench as a daily-use surface.
- [x] Support reusable utilities, snippets, runbooks, requests, and project context direction.
- [ ] Improve Workbench onboarding and examples (#120).
- [ ] Add more tests around save/share flows.

### Circles / community memory

- [x] Treat Circles as a strategic community contribution loop.
- [x] Add context-required sharing from useful surfaces.
- [x] Display share context, attribution, source metadata, and tags.
- [x] Add empty-state guidance for starting a shared vault.
- [ ] Add lightweight activity feed design.
- [ ] Add save/fork/usefulness interactions for shared findings.
- [ ] Prepare public/community showcase strategy without exposing private Circle content.

### Contributor readiness

- [x] Add contributor call-to-action in README.
- [x] Add best-first-contribution guidance.
- [ ] Create at least 5 `good first issue` tasks.
- [ ] Add a short architecture map for new contributors (#129).
- [ ] Keep PRs small, issue-backed, and CI-verified.

---

## 0.6.x — Stronger beta

- [ ] Ship demo data and guided first-run path.
- [ ] Improve responsive UI polish for public screenshots.
- [ ] Harden extension and CLI capture flows.
- [ ] Improve self-hosting docs and deploy verification.
- [ ] Add more integration/E2E coverage for critical user loops.
- [ ] Refine AI enrichment quality and local/Ollama setup guidance.

---

## 0.7.x — Community collaboration beta

- [ ] Circle activity feed.
- [ ] Reactions/comments or usefulness signals.
- [ ] Weekly digest prototype.
- [ ] Public curated collection prototype.
- [ ] Contributor/curator profile improvements.

---

## 1.0.0 criteria

DevDeck should only be called `1.0.0 Stable` when:

- A new developer can understand the value from the README in under 30 seconds.
- Screenshots/GIF/demo assets exist.
- Clean setup works from documented instructions.
- Capture, search, Workbench, and Circles flows are reliable.
- Known limitations are explicit.
- CI and critical E2E checks are stable.
- Contributor workflow is proven through small external-friendly issues/PRs.

Until then, DevDeck stays honest: useful public beta, improving in the open.

---

*Last updated: June 2026 — 0.5.0 Public Beta*
