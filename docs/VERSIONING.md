# Versioning & Release Strategy

> This document describes DevDeck's versioning system, release strategy, and commit conventions.

---

## 1. Semantic Versioning

DevDeck uses [Semantic Versioning](https://semver.org/) with the format `MAJOR.MINOR.PATCH`:

| Component | When to bump | Example |
|-----------|-------------|---------|
| **MAJOR** | Stable product/API contract and incompatible changes | `0.x.0` → `1.0.0` |
| **MINOR** | New backward-compatible features or public beta milestones | `0.5.0` → `0.6.0` |
| **PATCH** | Backward-compatible bug fixes | `0.5.0` → `0.5.1` |

**Current state:** `0.5.0` — public beta / launch-readiness milestone.

> DevDeck is not yet a stable `1.0.0` product. The honest public position is: functional open-source beta with a clear developer-memory direction, active polish, and a contributor/community launch in progress.

### When DevDeck can become 1.0.0

DevDeck should not be tagged as `1.0.0` until these are true:

- Clean onboarding/demo flow works for a new user in minutes.
- Local setup and self-hosting instructions are verified on a clean machine.
- Core capture/search/workbench/Circles flows are stable enough for public use.
- Public README, screenshots/GIFs, and contributor docs are trustworthy.
- Known limitations are documented honestly.
- Critical CI/E2E checks are reliable.

---

## 2. Changelog

We use [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
```

**Files:**
- `CHANGELOG.md` — Project changelog
- `package.json` — Monorepo version
- `apps/*/package.json` and `packages/*/package.json` — workspace package versions
- `apps/extension/manifest.json` — browser extension version

---

## 3. Conventional Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```txt
<type>[<scope>]: <description>
```

**Types:**

| Type | Description | Triggers release |
|------|-------------|------------------|
| `feat` | New feature | `minor` bump |
| `fix` | Bug fix | `patch` bump |
| `docs` | Documentation | no automatic bump |
| `style` | Formatting/CSS-only change | no automatic bump |
| `refactor` | Refactor without functional change | no automatic bump |
| `perf` | Performance optimization | patch/minor by impact |
| `test` | Add/modify tests | no automatic bump |
| `build` | Build system changes | no automatic bump |
| `ci` | CI/CD changes | no automatic bump |
| `chore` | Maintenance | no automatic bump |
| `revert` | Revert previous commit | depends on reverted change |

**Examples:**

```bash
feat(circles): share workbench output with context
fix(items): resolve duplicate capture regression
docs(launch): clarify public beta positioning
chore(release): set public beta version to 0.5.0
```

---

## 4. Release Flow

### Manual release (local)

```bash
# 1. Make changes with conventional commits
git commit -m "feat(ui): add new feature"

# 2. Bump + tag + changelog
pnpm release
# Select: patch | minor | major
```

**What `bumpp` does:**
1. Detects change type.
2. Updates version in `package.json`.
3. Updates `CHANGELOG.md`.
4. Creates git tag.
5. Pushes tags when confirmed.

### Release discipline

Do not call a release “stable” unless the product is actually stable for public users. For now, use **public beta** language.

---

## 5. Available Scripts

```bash
pnpm lint:commit      # Verify commit messages
pnpm changelog        # Generate changelog from recent changes
pnpm changelog:all    # Regenerate full changelog
pnpm release          # Local release bump + tag + changelog
```

---

## 6. Git Tags

Tags follow the format `v<version>`:

```bash
v0.5.0    # Public beta / launch-readiness milestone
v0.5.1    # Patch for beta fixes
v0.6.0    # Next beta milestone
v1.0.0    # First stable release, only after launch-readiness criteria are met
```

---

## 7. GitHub Releases

Each release should include:

- Tag with version.
- Release notes generated from commits or manually curated.
- Honest status: alpha, beta, release candidate, or stable.
- Known limitations when relevant.

---

## 8. Configuration

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Project changelog |
| `.commitlintrc.json` | Commit validation rules |
| `package.json` | Release scripts and monorepo version |
| `apps/extension/manifest.json` | Browser extension version |

---

> **Note:** This document complements [ROADMAP.md](../ROADMAP.md) and [adr/0003-monorepo-pnpm-workspaces.md](adr/0003-monorepo-pnpm-workspaces.md).
