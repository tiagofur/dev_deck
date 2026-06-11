# I’m building DevDeck: an open-source developer memory app for tools, snippets, prompts, and shared knowledge

Cover image suggestion: `docs/assets/launch/devdeck-demo-loop.gif`

Tags: `opensource`, `productivity`, `webdev`, `selfhosted`

---

Developers do not have a saving problem.

We have a rediscovery problem.

I keep finding useful repos, CLIs, snippets, prompts, shortcuts, articles, and workflow notes. Some come from GitHub. Some come from Discord. Some come from Reddit, docs, YouTube, newsletters, coworkers, or random late-night debugging sessions.

At the moment I find them, they feel important.

Three weeks later, I remember the shape of the solution — but not the name, the link, the exact command, the flags, or why I saved it in the first place.

Bookmarks become a graveyard. GitHub stars are too broad. Notes become scattered. Chat history disappears.

That is the problem I am trying to solve with **DevDeck**.

Repo: https://github.com/tiagofur/dev_deck  
Site: https://devdeck.ai

## What is DevDeck?

DevDeck is an open-source desktop/web app for developers who want a better way to save, organize, retrieve, and share useful technical knowledge.

The idea is simple:

- capture useful developer artifacts;
- add enough context to make them reusable later;
- retrieve them by intent, not only exact keywords;
- use them inside a developer workbench;
- share high-signal findings with trusted groups or communities.

I think of it as a developer memory layer.

Not just “where did I save this link?” but:

> “Why did this matter, when should I use it, and who else in my community could benefit from it?”

## What can be saved?

DevDeck is designed around the kind of things developers actually collect every day:

- repositories;
- CLIs;
- snippets;
- prompts;
- shortcuts;
- runbooks;
- articles;
- tools;
- notes;
- how-tos;
- workflow ideas.

Each saved item can include context such as why it matters, when to use it, tags, source metadata, and gotchas.

That context is the important part.

A saved link without context is usually just another link you will forget.

## Why Circles matter

The feature I care about most right now is **Circles**.

Most developer communities already share valuable discoveries every day. Someone finds a useful CLI. Someone solves a deployment issue. Someone posts a snippet that saves hours. Someone discovers a library that fits a specific use case.

But that signal usually gets buried in chat.

A Circle is meant to be a shared space where a trusted group can contribute findings with context.

Not only:

> “Here is a link.”

But:

> “Here is what this is, why it matters, when we should use it, and what to watch out for.”

That is the direction I want DevDeck to grow toward: not only personal memory, but community memory.

## Current status

DevDeck is currently at **0.5.0 Public Beta**.

I am intentionally not calling it stable or 1.0 yet.

It is useful today, but it is still being polished. The current focus is:

- onboarding;
- UI/UX polish;
- self-hosting docs;
- contributor experience;
- demo data and screenshots;
- Circle/community workflows;
- smaller, easier-to-review pull requests.

I want to be honest about the stage of the project. This is not a finished enterprise platform. It is an open-source project looking for early users, contributors, and sharp feedback.

## Tech stack

DevDeck is built with:

- React 18;
- TypeScript;
- Electron;
- Go;
- Postgres;
- pgvector;
- pg_trgm;
- Docker Compose;
- Caddy;
- pnpm workspaces.

There is a shared React feature layer for web and desktop, plus a browser extension and a Go CLI.

## What I am looking for

I would love help from developers who care about developer tooling, knowledge management, self-hosting, open source, or community workflows.

Useful feedback right now would be:

- Does the problem resonate with you?
- How do you currently save tools, snippets, prompts, and workflow notes?
- Would you use private/shared spaces for community knowledge?
- What would make the first-run experience clearer?
- What should be improved before calling this 1.0?

Contributors are also welcome, especially for small focused improvements.

The project has a first contribution guide and GitHub Discussions open:

- Repo: https://github.com/tiagofur/dev_deck
- Discussions: https://github.com/tiagofur/dev_deck/discussions
- Call for contributors: https://github.com/tiagofur/dev_deck/discussions/100
- First contribution guide: https://github.com/tiagofur/dev_deck/blob/main/docs/FIRST_CONTRIBUTION.md

## Small PRs beat giant PRs

One thing I am trying to be disciplined about is the contribution workflow.

I do not want huge pull requests that are hard to review and easy to break.

The goal is:

- one issue;
- one focused PR;
- clear verification;
- tests or screenshots when relevant;
- no vague “big improvement” branches.

That is slower in the short term, but healthier if the goal is to build a project other people can actually contribute to.

## Why I am sharing this now

I am sharing DevDeck now because I want feedback while the direction is still flexible.

The project is already useful enough to explain, but early enough that good feedback can still shape the product.

If this problem sounds familiar, I would genuinely appreciate your thoughts.

How do you currently avoid losing useful developer knowledge?

And if you work with a team, Discord, Slack, study group, or open-source community: would a shared developer memory space be useful to you?

---

GitHub: https://github.com/tiagofur/dev_deck  
Site: https://devdeck.ai  
Discussions: https://github.com/tiagofur/dev_deck/discussions
