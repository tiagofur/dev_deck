# DevDeck

> Antes conocido como "RepoVault" durante el planning.

> Tu directorio personal de repos. Hermoso, divertido, y diseñado para que **nunca más pierdas un repo que un amigo te recomendó**.

Una app de escritorio (Electron + React) con backend Go + Postgres, en estilo **neo-brutalist colorido**, con preview rico tipo WhatsApp/Open Graph, búsqueda fuzzy, tags personales, modo descubrimiento tipo Tinder y una mascota animada que te juzga gentilmente.

---

## Stack

- **Desktop:** Electron + React 18 + TypeScript + Tailwind + Framer Motion
- **Backend:** Go + Chi + pgx + sqlc
- **DB:** Postgres 16 (con `pg_trgm` para fuzzy search)
- **Deploy:** VPS propio · Docker Compose · Caddy (TLS automático)

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/PRD.md](docs/PRD.md) | Producto, features, user stories, scope MVP |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, paleta, tipografía, componentes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama, stack, decisiones, schema DB |
| [docs/API.md](docs/API.md) | OpenAPI spec |

---

## Estado

🚧 **En construcción.** Fase 0 (docs) completa. Próximo: backend mínimo.

Roadmap completo en el plan original.
