# Versioning & Release Strategy

> This document describes DevDeck's versioning system, release strategy, and commit conventions.

---

## 1. Semantic Versioning

DevDeck uses [Semantic Versioning](https://semver.org/) (SemVer) with the format `MAJOR.MINOR.PATCH`:

| Component | When to bump | Example |
|-----------|-------------|---------|
| **MAJOR** | Incompatible API changes | `0.x.0` → `1.0.0` |
| **MINOR** | New backward-compatible features | `0.1.0` → `0.2.0` |
| **PATCH** | Backward-compatible bug fixes | `0.1.0` → `0.1.1` |

**Current state:** `0.1.0` (Wave 4.5 - stable features)

> DevDeck is on `0.x` because feature complete is not yet reached (Wave 7). The jump to `1.0.0` will happen when all waves are complete.

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

---

## [0.1.0] - 2026-05-03
### Added
- Stack filter
- Smart tags
...
```

**Files:**
- `CHANGELOG.md` — Project changelog
- `package.json` — Monorepo version

---

## 3. Conventional Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[<scope>]: <description>

[optional body]

[optional footer]
```

**Types:**

| Type | Description | Triggers release |
|------|------------|----------------|
| `feat` | New feature | `minor` bump |
| `fix` | Bug fix | `patch` bump |
| `docs` | Documentation | ❌ |
| `style` | Formatting (CSS, etc) | ❌ |
| `refactor` | Refactor without functional change | ❌ |
| `perf` | Performance optimization | ❌ |
| `test` | Add/modify tests | ❌ |
| `build` | Build system changes | ❌ |
| `ci` | CI/CD changes | ❌ |
| `chore` | Maintenance | ❌ |
| `revert` | Revert previous commit | ❌ |
| `improvement` | Improve existing feature | `patch` bump |

**Examples:**

```bash
feat(ui): add stack filter with multi-select pills
fix(items): resolve N+1 query in items list
docs(api): update authentication endpoint docs
chore: add release workflow
```

**Validation rules:**
- Header max 72 characters
- Subject in lowercase
- Type required
- Description required (no period at end)

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
1. Detects change type (feat→minor, fix→patch)
2. Updates version in `package.json`
3. Updates `CHANGELOG.md` with new changes
4. Creates git tag (`v0.1.0`)
5. Pushes with tags

### Automatic release (CI)

The `.github/workflows/release.yml` workflow runs on every push to `main`:

1. **Checkout** with full history (`fetch-depth: 0`)
2. **Install** dependencies
3. **Test** + **Build**
4. **bumpp** — detects type, updates version, creates tag
5. **conventional-changelog** — regenerates full changelog
6. **GitHub Release** — creates release with notes

---

## 5. Available Scripts

```bash
# Verify commit messages
pnpm lint:commit

# Generate changelog (changes since last tag)
pnpm changelog

# Regenerate full changelog
pnpm changelog:all

# Local release (bump + tag + changelog)
pnpm release
```

---

## 6. Git Tags

Tags follow the format `v<version>`:

```bash
v0.1.0    # Version 0.1.0
v0.1.1    # Subsequent patch
v0.2.0    # New features
v1.0.0    # First stable release
```

**List local tags:**
```bash
git tag -l
```

**Push tags:**
```bash
git push --tags
```

---

## 7. GitHub Releases

Releases are automatically created on every merge to `main` via `.github/workflows/release.yml`.

Each release includes:
- **Tag** with version
- **Release notes** auto-generated from commits
- **Changelog** from `CHANGELOG.md`

---

## 8. Configuration

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Project changelog |
| `.commitlintrc.json` | Commit validation rules |
| `.github/workflows/release.yml` | Auto-release CI |
| `package.json` | Release scripts (`pnpm release`) |

---

## 9. Complete Flow Example

```bash
# 1. Work on feature
git checkout -b feat/new-feature
git commit -m "feat(items): add new feature"
git commit -m "fix(items): resolve bug"
git push

# 2. Create PR and merge to main
# (CI runs tests + typecheck + build)

# 3. On merge to main → Release workflow triggers
#    - CI generates: v0.2.0
#    - GitHub creates: Release v0.2.0

# 4. View changelog
pnpm changelog
```

---

> **Note:** This document complements [ROADMAP.md](../ROADMAP.md) and [adr/0003-monorepo-pnpm-workspaces.md](adr/0003-monorepo-pnpm-workspaces.md).