# Versioning & Release Strategy

> Este documento describe el sistema de versionado, estrategia de release y convenciones de commits de DevDeck.

---

## 1. Versionado Semántico

DevDeck usa [Semantic Versioning](https://semver.org/) (SemVer) con el formato `MAJOR.MINOR.PATCH`:

| Componente | Cuándo cambia | Ejemplo |
|-----------|-------------|--------|
| **MAJOR** | Cambios incompatibles en la API | `0.x.0` → `1.0.0` |
| **MINOR** | Nueva funcionalidad compatibles | `0.1.0` → `0.2.0` |
| **PATCH** | Bug fixes compatibles | `0.1.0` → `0.1.1` |

**Estado actual:** `0.1.0` (Wave 4.5 - funcionalidades estables)

> DevDeck está en versión `0.x` porque aún no reached feature complete (Ola 7).EI cambio a `1.0.0` se dará cuando todas las olas estén completas.

---

## 2. Changelog

Usamos el formato [Keep a Changelog](https://keepachangelog.com/):

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

**Archivos:**
- `CHANGELOG.md` — Changelog del proyecto
- `package.json` — Versión del monorepo

---

## 3. Conventional Commits

Los mensajes de commit siguen [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[ámbito opcional]: <descripción>

[body opcional]

[footer opcional]
```

**Tipos:**

| Tipo | Descripción | Genera release |
|------|------------|--------------|
| `feat` | Nueva funcionalidad | `minor` bump |
| `fix` | Bug fix | `patch` bump |
| `docs` | Documentación | ❌ |
| `style` | Formateo (CSS, etc) | ❌ |
| `refactor` | Refactor sin cambio funcional | ❌ |
| `perf` | Optimización de performance | ❌ |
| `test` | Agregar/modificar tests | ❌ |
| `build` | Cambios en build system | ❌ |
| `ci` | Cambios en CI/CD | ❌ |
| `chore` | Mantenimiento | ❌ |
| `revert` | Revertir commit anterior | ❌ |
| `improvement` | Mejora de feature existente | `patch` bump |

**Ejemplos:**

```bash
feat(ui): add stack filter with multi-select pills
fix(items): resolve N+1 query in items list
docs(api): update authentication endpoint docs
chore: add release workflow
```

**Reglas de validación:**
- Header máximo 72 caracteres
- Subject en minúsculas
- Tipo obligatorio
- Descripción obligatoria (sin punto al final)

---

## 4. Flujo de Release

### Release manual (local)

```bash
# 1. Hacer cambios con commits conventional
git commit -m "feat(ui): add new feature"

# 2. Bump + tag + changelog
pnpm release
# Seleccionar: patch | minor | major
```

**Qué hace `bumpp`:**
1. Detecta tipo de cambio (feat→minor, fix→patch)
2. Sube versión en `package.json`
3. Actualiza `CHANGELOG.md` con nuevos cambios
4. Crea git tag (`v0.1.0`)
5. push con tags

### Release automático (CI)

El workflow `.github/workflows/release.yml` se ejecuta en cada push a `main`:

1. **Checkout** con todo el history (`fetch-depth: 0`)
2. **Install** dependencias
3. **Test** + **Build**
4. **bumpp** — detecta tipo, actualiza versión, crea tag
5. **conventional-changelog** — regenera changelog completo
6. **GitHub Release** — crea release en GitHub con notes

---

## 5. Scripts disponibles

```bash
# Verificar mensajes de commit
pnpm lint:commit

# Generar changelog (solo cambios desde último tag)
pnpm changelog

# Regenerar changelog completo
pnpm changelog:all

# Release local (bump + tag + changelog)
pnpm release
```

---

## 6. Git Tags

Tags siguen el formato `v<versión>`:

```bash
v0.1.0    # Versión 0.1.0
v0.1.1    # Patch posterior
v0.2.0    # Nueva funcionalidad
v1.0.0    # Primer release estable
```

**Ver tags locales:**
```bash
git tag -l
```

**Push de tags:**
```bash
git push --tags
```

---

## 7. GitHub Releases

Las releases se crean automáticamente en cada merge a `main` via `.github/workflows/release.yml`.

Cada release incluye:
- **Tag** con versión
- **Release notes** generadas automáticamente desde commits
- **Changelog** desde `CHANGELOG.md`

---

## 8. Configuración

| Archivo | Propósito |
|---------|-----------|
| `CHANGELOG.md` | Changelog del proyecto |
| `.commitlintrc.json` | Reglas de validación de commits |
| `.github/workflows/release.yml` | CI para auto-release |
| `package.json` | Scripts de release (`pnpm release`) |

---

## 9. Ejemplo de flujo completo

```bash
# 1. Trabajar en feature
git checkout -b feat/new-feature
git commit -m "feat(items): add new feature"
git commit -m "fix(items): resolve bug"
git push

# 2. Crear PR y merge a main
# (CI corre tests + typecheck + build)

# 3. En merge a main → Release workflow se dispara
#    - CI genera: v0.2.0
#    - GitHub crea: Release v0.2.0

# 4. Ver changelog
pnpm changelog
```

---

> **Nota:** Este documento complementa el [ROADMAP.md](../ROADMAP.md) y el [adr/0003-monorepo-pnpm-workspaces.md](adr/0003-monorepo-pnpm-workspaces.md).