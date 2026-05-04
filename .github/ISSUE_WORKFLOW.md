# Workflow: Issue → PR → Merge

## Para trabajo correcto en DevDeck

### Nunca hacer:
- ❌ Commits directos a main
- ❌ Push sin PR
- ❌ Cerrar issue sin referenciar PR

### Siempre hacer:
- ✅ Crear branch desde `main` o última rama estable
- ✅ Working branch: `feat/issue-{id}-{description}`
- ✅ Commits atómicos con conventional commits
- ✅ PR con description completa
- ✅ Merge con squash o rebase
- ✅ Cerrar issue referenciando PR

## Prefijo de branches

| Tipo | Prefijo | Ejemplo |
|------|--------|--------|
| Feature | `feat/` | `feat/items-stack-filter` |
| Fix | `fix/` | `fix/auth-redirect` |
| Chore | `chore/` | `chore/cleanup-deps` |
| Docs | `docs/` | `docs/deploy-readme` |

## Commits convencionales

```
feat(items): add stack filter UI
fix(config): separate OAuth callback
ci: add workspace typecheck job
docs(deploy): update self-hosting guide
```

## Flujo completo

```bash
# 1. Actualizar main
git checkout main && git pull

# 2. Crear branch desde issue
git checkout -b feat/issue-{id}-{description}

# 3. Trabajar, commitear

# 4. Push y crear PR
git push -u origin feat/issue-{id}-{description}
gh pr create --title "feat(items): add stack filter"

# 5. Review y merge

# 6. Cerrar issue
gh issue close {id}
```

## Issues de referencia

- #33 — Stack filter (merged directly in feat/item-filters)
- #16 — Smart tags (fixed in 5d331fe)
- #34-#38 — Production readiness sub-issues