# Versioning & Release Strategy

> Este documento describe el sistema de versionado, estrategia de release y convenciones de commits de DevDeck.

---

## 1. Versionado Semántico

DevDeck usa [Semantic Versioning](https://semver.org/) (SemVer) con el formato `MAJOR.MINOR.PATCH`:

| Componente | Cuándo cambia | Ejemplo |
|-----------|---------------|---------|
| **MAJOR** | Contrato de producto/API estable y cambios incompatibles | `0.x.0` → `1.0.0` |
| **MINOR** | Nuevas funcionalidades compatibles o hitos de beta pública | `0.5.0` → `0.6.0` |
| **PATCH** | Bug fixes compatibles | `0.5.0` → `0.5.1` |

**Estado actual:** `0.5.0` — beta pública / hito de launch-readiness.

> DevDeck todavía no es un producto estable `1.0.0`. La posición pública honesta es: beta open-source funcional, con dirección clara de memoria para developers, polish activo y lanzamiento comunitario en progreso.

### Cuándo DevDeck puede ser 1.0.0

DevDeck no debería etiquetarse como `1.0.0` hasta que esto sea verdad:

- Onboarding/demo limpio para que una persona nueva vea valor en minutos.
- Setup local y self-hosting verificados en una máquina limpia.
- Flujos core de capture/search/workbench/Circles suficientemente estables para uso público.
- README público, screenshots/GIFs y docs de contribución confiables.
- Limitaciones conocidas documentadas con honestidad.
- CI/E2E crítico confiable.

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
```

**Archivos:**
- `CHANGELOG.md` — changelog del proyecto
- `package.json` — versión del monorepo
- `apps/*/package.json` y `packages/*/package.json` — versiones de paquetes workspace
- `apps/extension/manifest.json` — versión de la extensión

---

## 3. Conventional Commits

Los mensajes de commit siguen [Conventional Commits](https://www.conventionalcommits.org/):

```txt
<tipo>[scope opcional]: <descripción>
```

**Tipos:**

| Tipo | Descripción | Release |
|------|-------------|---------|
| `feat` | Nueva funcionalidad | `minor` bump |
| `fix` | Bug fix | `patch` bump |
| `docs` | Documentación | sin bump automático |
| `style` | Formato/CSS-only | sin bump automático |
| `refactor` | Refactor sin cambio funcional | sin bump automático |
| `perf` | Optimización | patch/minor según impacto |
| `test` | Tests | sin bump automático |
| `build` | Build system | sin bump automático |
| `ci` | CI/CD | sin bump automático |
| `chore` | Mantenimiento | sin bump automático |
| `revert` | Revert de commit anterior | depende del cambio revertido |

**Ejemplos:**

```bash
feat(circles): share workbench output with context
fix(items): resolve duplicate capture regression
docs(launch): clarify public beta positioning
chore(release): set public beta version to 0.5.0
```

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
1. Detecta tipo de cambio.
2. Actualiza versión en `package.json`.
3. Actualiza `CHANGELOG.md`.
4. Crea git tag.
5. Pushea tags cuando se confirma.

### Disciplina de release

No llamar una release “stable” si el producto no es realmente estable para usuarios públicos. Por ahora, usar lenguaje de **beta pública**.

---

## 5. Scripts disponibles

```bash
pnpm lint:commit      # Verificar mensajes de commit
pnpm changelog        # Generar changelog desde cambios recientes
pnpm changelog:all    # Regenerar changelog completo
pnpm release          # Release local: bump + tag + changelog
```

---

## 6. Git Tags

Los tags siguen el formato `v<versión>`:

```bash
v0.5.0    # Beta pública / hito de launch-readiness
v0.5.1    # Patch para fixes beta
v0.6.0    # Próximo hito beta
v1.0.0    # Primer release estable, solo al cumplir criterios de launch-readiness
```

---

## 7. GitHub Releases

Cada release debería incluir:

- Tag con versión.
- Release notes generadas desde commits o curadas manualmente.
- Estado honesto: alpha, beta, release candidate o stable.
- Limitaciones conocidas cuando corresponda.

---

## 8. Configuración

| Archivo | Propósito |
|---------|-----------|
| `CHANGELOG.md` | Changelog del proyecto |
| `.commitlintrc.json` | Reglas de validación de commits |
| `package.json` | Scripts de release y versión del monorepo |
| `apps/extension/manifest.json` | Versión de la extensión |

---

> **Nota:** Este documento complementa el [ROADMAP.md](../ROADMAP.md) y el [adr/0003-monorepo-pnpm-workspaces.md](adr/0003-monorepo-pnpm-workspaces.md).
