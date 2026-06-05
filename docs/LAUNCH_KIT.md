# DevDeck — Community Launch Kit

This document contains honest, community-ready copy for introducing DevDeck on GitHub, Reddit, forums, Discord groups, newsletters, and social channels.

DevDeck is not being positioned as a finished enterprise platform. The launch angle is stronger and safer: **an open-source developer memory app looking for early users, contributors, and sharp feedback.**

---

## Version framing

DevDeck should be presented as **0.5.0 Public Beta**. Do not call it stable or 1.0 yet. The honest message is: useful today, actively polished, and looking for early users/contributors before a stable release.

---

## Core positioning

**Short tagline:**
The developer memory layer for everything useful you discover, build, and share.

**One-liner:**
DevDeck helps developers capture repos, CLIs, snippets, prompts, shortcuts, notes, and workflows — then rediscover them by context, intent, and community signal.

**30-second pitch:**
Developers discover useful tools every week and then lose them across chats, bookmarks, GitHub stars, and browser tabs. DevDeck turns those scattered discoveries into a searchable engineering memory. Save the artifact, add why it matters, retrieve it later by intent, use it inside Workbench, and share high-signal findings with trusted Circles.

---

## GitHub README hook

> I am building DevDeck as an open-source external memory for developers: a place to save useful repos, CLIs, prompts, snippets, shortcuts, notes, and runbooks with enough context to actually find and reuse them later.
>
> The current focus is launch readiness: better onboarding, UI polish, shared Circles for community knowledge, and making it easy for contributors to jump in.

---

## Reddit / forum post draft

**Title ideas:**
- I’m building an open-source external memory app for developers — looking for feedback and contributors
- Bookmarks and GitHub stars keep failing me, so I’m building DevDeck
- DevDeck: save developer tools, snippets, prompts, and workflows with context

**Post:**

Hey folks — I’m building **DevDeck**, an open-source developer memory app.

The problem I’m trying to solve: I keep finding useful repos, CLIs, snippets, prompts, shortcuts, and workflow notes, but weeks later I can’t remember where I saw them or why they mattered. Bookmarks become a graveyard. GitHub stars are too broad. Chat history disappears.

DevDeck is my attempt to make that memory reusable:

- Capture repos, CLIs, prompts, snippets, shortcuts, articles, notes, and how-tos.
- Add context like “why this matters”, tags, source, and gotchas.
- Retrieve things later with fuzzy/semantic search.
- Use saved context inside a Developer Workbench.
- Share high-signal findings with private Circles so a community can build collective memory.

It’s built with Go, React, Electron, Postgres, pgvector, pnpm workspaces, and a shared Web/Desktop feature layer.

I’m not claiming it’s perfect yet. I’m actively polishing the onboarding, UI, docs, demo flow, and contributor experience. I’d love feedback from developers who collect tools/workflows or participate in dev communities.

Repo: https://github.com/tiagofur/dev_deck
Site: https://devdeck.ai
Discussions: https://github.com/tiagofur/dev_deck/discussions
Call for contributors: https://github.com/tiagofur/dev_deck/discussions/100
Support: https://www.buymeacoffee.com/tiagofur

If this problem resonates with you, I’m especially looking for:

- UX feedback.
- Contributors for small polish PRs.
- Ideas for the Circles/community knowledge loop.
- People willing to try the app with their real saved dev resources.

---

## X / LinkedIn post

Developers discover useful tools every week and lose them across chats, bookmarks, tabs, and GitHub stars.

I’m building DevDeck: an open-source memory layer for repos, CLIs, snippets, prompts, shortcuts, notes, workflows, and community findings.

Looking for feedback + contributors.

https://github.com/tiagofur/dev_deck

---


## Promotion targets

Prioritize communities where people already discuss developer workflow, tooling, self-hosting, and knowledge management. Do not spam generic channels. Post once, respond carefully, and adapt the message to each community.

| Channel | Angle | Call to action | Notes |
| --- | --- | --- | --- |
| GitHub Discussions | Contributor coordination and early product feedback. | Reply to the [Call for contributors](https://github.com/tiagofur/dev_deck/discussions/100). | Keep this as the home base for rough ideas. |
| Reddit `r/selfhosted` | Self-hostable developer memory with Docker Compose + Caddy. | Ask for deployment feedback and VPS docs review. | Be transparent that DevDeck is 0.5.0 Public Beta. |
| Reddit `r/opensource` | Open-source developer tooling looking for early contributors. | Ask for small PRs and architecture/doc feedback. | Emphasize contribution flow and good-first-issues. |
| Reddit `r/programming` or language/tooling subs | Rediscovering useful dev artifacts by context. | Ask whether the problem resonates. | Avoid overclaiming AI; lead with workflow pain. |
| Hacker News `Show HN` | Practical app for developer memory and shared findings. | Ask for critical feedback. | Only post once the README and self-hosting path are verified. |
| Dev.to / Hashnode | Build-in-public story and technical architecture. | Invite contributors and self-hosting testers. | Longer-form post can reuse the 30-second pitch plus stack notes. |
| Discord/Slack dev communities | Community knowledge and Circle workflows. | Ask what a group would share into a Circle. | Prefer communities where you already participate. |
| X / LinkedIn | Short visibility loop. | Ask for feedback, stars, contributors, and shares. | Link to repo plus the contributor discussion. |

---

## Launch-day checklist

Before posting widely:

1. Confirm `main` CI is green after the latest docs and launch-readiness PRs.
2. Confirm README screenshots and demo GIF render correctly on GitHub.
3. Confirm [docs/SELF_HOSTING.md](SELF_HOSTING.md) matches the current Docker Compose stack.
4. Confirm [docs/SUPPORT.md](SUPPORT.md) has a working support link.
5. Confirm [GitHub Discussions](https://github.com/tiagofur/dev_deck/discussions) has starter threads.
6. Confirm the [Call for contributors](https://github.com/tiagofur/dev_deck/discussions/100) is visible.
7. Confirm at least five `good first issue` tasks are open or recently completed with clear examples.
8. Prepare one short post, one longer post, and one screenshot/GIF attachment.
9. Block time after posting to answer comments quickly.
10. Capture recurring feedback into issues or Discussions instead of losing it in comment threads.

---

## Follow-up workflow

The launch is only useful if feedback turns into product learning. Use this loop after every post:

1. **Collect signal:** save links to comments, forks, stars, posts, and useful replies.
2. **Route correctly:** questions go to Discussions, bugs go to issues, scoped improvements go to approved issues, and code changes go to small PRs.
3. **Respond publicly:** thank people, ask for concrete reproduction/context, and avoid defensive replies.
4. **Convert carefully:** only create issues for work that is clear enough to review and implement.
5. **Protect review quality:** keep launch-driven PRs small, issue-linked, and CI-verified.
6. **Update docs:** if two people ask the same thing, improve README, self-hosting docs, or first contribution docs.
7. **Report progress:** post small updates in Discussions so early contributors see momentum.

---

## Response templates

**When someone wants to contribute:**

> Amazing — thank you. The best first step is a small PR linked to an approved issue. Start here: https://github.com/tiagofur/dev_deck/blob/main/docs/FIRST_CONTRIBUTION.md. If you are unsure where to begin, reply in the contributor thread and we can shape a focused first task.

**When someone has a rough idea:**

> This sounds worth exploring, but it is still bigger than one reviewable issue. Could you drop it in Discussions with the problem, proposal, community value, and smallest first step? That keeps the idea visible without turning Issues into a backlog graveyard.

**When someone reports a bug:**

> Thank you — can you open a bug issue with OS, setup path, expected behavior, actual behavior, and logs/screenshots if available? If we can reproduce it, we can scope a focused fix.

**When someone asks how to support the project:**

> The repo is open source and free to use. If you want to support development costs and launch polish, the support page is here: https://github.com/tiagofur/dev_deck/blob/main/docs/SUPPORT.md. Sharing feedback and small PRs also helps a lot.

---
## Contributor call-to-action

DevDeck needs contributors who care about developer tooling, knowledge management, and community workflows.

Good first contribution areas:

- Polish one UI state.
- Improve onboarding copy.
- Add a focused test.
- Improve README/docs clarity.
- Fix Desktop/Web parity issues.
- Improve a Circle sharing surface.
- Make self-hosting smoother.

Rule: small PRs beat giant PRs.

---

## Support / sustainability copy

DevDeck is an indie open-source project. If the idea helps you, you can support the work here:

https://www.buymeacoffee.com/tiagofur

Possible future sustainability paths:

- Hosted community Circles.
- Paid setup/support for teams or communities.
- Premium workflow/template packs.
- Sponsorships from developer-tooling companies.

The goal is to keep the open-source core useful while finding a realistic way to fund continued development.

---

## Launch readiness checklist

Before posting widely:

1. [ ] README explains the value in under 30 seconds.
2. [ ] Repo has screenshots or a short demo GIF/video.
3. [ ] Contributor guide has a clear first-PR path.
4. [ ] At least 5 `good first issue` tasks exist.
5. [ ] Demo flow works with realistic sample data.
6. [ ] Local setup instructions are verified on a clean machine.
7. [ ] Known limitations are stated honestly.
8. [ ] Support link is visible but not pushy.
9. [ ] Reddit/forum post asks for feedback, not hype validation.
10. [x] Follow-up plan exists for issues, comments, and contributors after launch.
