# First contribution guide

Thanks for considering a contribution to DevDeck. The best first PR is small, useful, and easy to review.

## Quick path

1. Pick an issue labeled [`good first issue`](https://github.com/tiagofur/dev_deck/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22) or [`help wanted`](https://github.com/tiagofur/dev_deck/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22help%20wanted%22).
2. Make sure the issue has `status:approved`.
3. Create a focused branch from `main`.
4. Change only what the issue needs.
5. Run the smallest relevant verification command.
6. Open a PR that links the issue with `Closes #...`.

## Local setup

```bash
pnpm install
pnpm typecheck
pnpm test
```

Run the web app:

```bash
pnpm dev:web
```

Run the backend locally:

```bash
cd backend
cp .env.example .env
docker compose -f ../deploy/docker-compose.local.yml up -d db
go run ./cmd/api
```

## What makes a good first PR?

Good first PRs usually do one of these:

- Improve one empty state or UI copy block.
- Add one focused test around existing behavior.
- Clarify one setup or self-hosting doc section.
- Improve one screenshot/demo/readme detail.
- Fix one small Desktop/Web parity gap.

Avoid starting with broad rewrites, large refactors, or multi-feature PRs. Those are harder to review and easier to break.

## PR expectations

Every PR should:

- Link an approved issue.
- Use a conventional commit title such as `docs(readme): clarify setup`.
- Have exactly one `type:*` label.
- Include tests or a clear verification note.
- Avoid `Co-Authored-By` or AI attribution trailers.

## Need help?

Use [GitHub Discussions](https://github.com/tiagofur/dev_deck/discussions) for questions, rough ideas, community workflows, and early feedback. See [docs/DISCUSSIONS.md](DISCUSSIONS.md) for category guidance and posting formats.

Open an issue only when the problem or proposal is clear enough to become a focused, reviewable task. If the idea is still rough, start in Discussions first and keep the proposed first step small.
