# GitHub Discussions guide

GitHub Discussions is the place for early collaboration around DevDeck. Use it when the topic needs conversation before it becomes a focused issue or pull request.

## When to use Discussions

Use Discussions for:

- Questions about setup, usage, self-hosting, or contribution flow.
- Rough product ideas that still need shape.
- Community workflows, Circle use cases, and collaboration patterns.
- Show-and-tell posts with screenshots, demos, or personal DevDeck setups.
- Feedback from people trying DevDeck before a public launch.

Use Issues for:

- Approved, scoped work that can become one focused PR.
- Bugs with reproduction steps.
- Feature requests that are already clear enough to review and implement.

Use Pull Requests for:

- One approved issue at a time.
- Small, reviewable changes with clear verification notes.

## Categories

| Category | Use it for | Expected outcome |
| --- | --- | --- |
| Announcements | Maintainer updates, releases, launch notes, and roadmap highlights. | Keep contributors aligned. |
| General | Open conversation that does not fit another category. | Clarify context or route to a better category. |
| Ideas | Rough feature proposals, Circle workflows, community-memory concepts, monetization/support ideas. | Turn strong ideas into approved issues. |
| Q&A | Setup help, usage questions, contribution questions. | Mark the best answer when resolved. |
| Show and tell | Screenshots, demos, personal workflows, community examples. | Surface inspiring examples for the community. |
| Polls | Lightweight votes when maintainers need directional feedback. | Inform prioritization, not replace product judgment. |

## Starter discussions

Start with these pinned-style entry points:

- [Welcome to DevDeck Discussions](https://github.com/tiagofur/dev_deck/discussions/96) — orientation and community flow.
- [Share ideas for DevDeck Circles and community workflows](https://github.com/tiagofur/dev_deck/discussions/97) — rough Circle/community proposals.
- [Ask setup, usage, and contribution questions here](https://github.com/tiagofur/dev_deck/discussions/98) — Q&A for users and contributors.
- [Show us your DevDeck workflow](https://github.com/tiagofur/dev_deck/discussions/99) — demos, screenshots, workflows, and inspiration.

## Recommended posting format

For ideas:

```markdown
## Problem
What problem are you seeing?

## Proposal
What should DevDeck do?

## Community value
Who benefits from this?

## Smallest first step
What could be shipped in one focused PR?
```

For Q&A:

```markdown
## Question
What are you trying to do?

## Context
OS, app version, local/self-hosted setup, and relevant logs if any.

## What you tried
What did you already test?
```

For show-and-tell:

```markdown
## What I built or discovered
Short summary.

## Why it helps
How this improves a developer workflow.

## Screenshots or demo
Add images, GIFs, or links when useful.
```

## Maintainer workflow

1. Let rough ideas start in Discussions instead of issues.
2. Ask for the smallest useful first step.
3. Convert only focused, actionable work into an issue.
4. Add `status:approved` only when the issue is ready for a PR.
5. Keep PRs small and linked to one approved issue.

This keeps the repository welcoming without turning Issues into an unreviewable backlog.
