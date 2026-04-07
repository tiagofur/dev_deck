# DevDeck Backend

Go API. Wave 1: minimal CRUD for repos with static-token auth.

## Quick start

```bash
# 1. Levantar Postgres (ejemplo con docker)
docker run -d --name devdeck-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=devdeck \
  -p 5432:5432 \
  postgres:16-alpine

# 2. Copiar env y editar API_TOKEN
cp .env.example .env
# editá .env y poné un API_TOKEN largo random

# 3. Cargar env (bash)
set -a && source .env && set +a

# 4. Bajar deps
make tidy

# 5. Aplicar migración
make migrate-up

# 6. Correr el server
make run
```

## Smoke test

```bash
# add a repo
make smoke-add

# list repos
make smoke-list

# health
curl http://localhost:8080/healthz
```

## Estructura

```
cmd/api/main.go              # entry point
internal/
  config/                    # env loading
  domain/repos/              # entidad Repo + inputs
  http/
    router.go                # chi setup
    middleware/
      auth.go                # bearer token (Wave 1)
      logger.go              # request logging
    handlers/
      health.go
      repos.go               # CRUD
      response.go            # JSON helpers
  store/
    store.go                 # pgx pool wrapper
    repos.go                 # SQL queries para repos
migrations/
  0001_init.sql              # schema base
```

## Endpoints (Wave 1)

| Method | Path                | Descripción |
|--------|---------------------|-------------|
| GET    | `/healthz`          | Health (público) |
| POST   | `/api/repos`        | Add repo by URL |
| GET    | `/api/repos`        | List with q/lang/tag/sort/limit/offset |
| GET    | `/api/repos/{id}`   | Get one |
| PATCH  | `/api/repos/{id}`   | Update notes/tags/archived |
| DELETE | `/api/repos/{id}`   | Delete |

Todos los `/api/*` requieren `Authorization: Bearer $API_TOKEN`.

## Notas

- **Sin enricher todavía.** El POST solo extrae `name`/`owner` de la URL. El enricher (GitHub API + Open Graph) llega en Wave 2 (Fase 2).
- **Migraciones manuales por psql.** En Wave 2 evaluaremos goose embebido si crece el schema.
- **`go mod tidy` no se corre automáticamente** — corrélo vos después del primer clone.
