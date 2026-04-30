# DevDeck — Self-hosting guide

> Guía paso a paso para levantar DevDeck en tu propio VPS. Pensado para un solo user o un grupo pequeño. Stack: Docker Compose + Caddy + Postgres + DevDeck API.

---

## Requisitos

- VPS con Linux (probado en Ubuntu 22.04 / Debian 12).
- 1 vCPU, 1 GB RAM, 10 GB disco como mínimo.
- Dominio apuntando al VPS (ej: `devdeck.tu-dominio.com`).
- Docker 24+ y Docker Compose v2 instalados.
- Cuenta de GitHub para crear una OAuth App.

---

## Paso 1 — OAuth App en GitHub

1. Ir a https://github.com/settings/developers → **New OAuth App**.
2. **Homepage URL:** `https://devdeck.tu-dominio.com`
3. **Authorization callback URL:** `https://api.devdeck.tu-dominio.com/api/auth/github/callback`
4. Guardar el `Client ID`.
5. Generar un `Client Secret`. Guardarlo ahora, GitHub no lo muestra de vuelta.

---

## Paso 2 — Clonar el repo

```bash
git clone https://github.com/<owner>/devdeck.git
cd devdeck/deploy
```

---

## Paso 3 — Variables de entorno

Crear `deploy/.env` a partir del ejemplo:

```env
# Dominios
DOMAIN=devdeck.tu-dominio.com
API_DOMAIN=api.devdeck.tu-dominio.com
APP_DOMAIN=app.devdeck.tu-dominio.com

# Postgres
POSTGRES_USER=devdeck
POSTGRES_PASSWORD=<password-largo-y-random>
POSTGRES_DB=devdeck

# Backend API
AUTH_MODE=jwt
JWT_SECRET=<256-bit-random-hex>
GITHUB_CLIENT_ID=<del paso 1>
GITHUB_CLIENT_SECRET=<del paso 1>
GITHUB_OAUTH_CALLBACK_URL=https://api.devdeck.tu-dominio.com/api/auth/github/callback
APP_OAUTH_REDIRECT_URL=https://app.devdeck.tu-dominio.com/auth/callback
ALLOWED_GITHUB_LOGINS=tu-usuario,otro-usuario

# Feature flags
SEED_CHEATSHEETS=true

# IA (opcional, Ola 6+)
AI_PROVIDER=disabled        # disabled | openai | ollama
OPENAI_API_KEY=
OLLAMA_URL=http://ollama:11434
```

Generar `JWT_SECRET`:
```bash
openssl rand -hex 32
```

**Nunca commitear `.env` al repo.** Está en `.gitignore`.

---

## Paso 4 — Caddyfile

`deploy/Caddyfile` ya está preparado para TLS automático via Let's Encrypt. Solo necesita que los dominios resuelvan al VPS. Ejemplo:

```
{$API_DOMAIN} {
    reverse_proxy api:8080
    encode gzip
}

{$APP_DOMAIN} {
    reverse_proxy web:80
    encode gzip
}

{$DOMAIN} {
    root * /srv/landing
    file_server
    encode gzip
}
```

---

## Paso 5 — Levantar los servicios

```bash
cd deploy
docker compose pull
docker compose up -d
docker compose logs -f api
```

El primer boot corre migrations automáticamente. Si `SEED_CHEATSHEETS=true`, además inserta los 10 cheatsheets seed (idempotente).

**Verificar salud:**
```bash
curl https://api.devdeck.tu-dominio.com/healthz
# → {"status":"ok"}
```

---

## Paso 6 — Login inicial

1. Abrir `https://app.devdeck.tu-dominio.com` en el browser.
2. Click "Login con GitHub".
3. Autorizar la OAuth App.
4. Si tu GitHub login está en `ALLOWED_GITHUB_LOGINS`, entrás al home.

Si no está en la allowlist, el backend devuelve 403. Agregarlo a `.env`, `docker compose up -d api` para reload.

---

## Paso 7 — Cliente desktop (opcional)

1. Descargar el instalador para tu OS desde releases de GitHub (Win NSIS, Mac DMG, Linux AppImage).
2. En Settings, configurar **API URL** = `https://api.devdeck.tu-dominio.com`.
3. Login OAuth (abre browser).

---

## Backups

Postgres en `deploy/docker-compose.yml` monta un volumen `pgdata`. Para backup:

```bash
# dump diario
docker compose exec -T db pg_dump -U devdeck devdeck | gzip > backups/devdeck-$(date +%F).sql.gz

# restore
gunzip -c backups/devdeck-2026-04-08.sql.gz | docker compose exec -T db psql -U devdeck devdeck
```

Recomendación: cronjob en el host + sync a S3/Backblaze B2 con `rclone`.

---

## Actualizaciones

```bash
cd devdeck
git pull
cd deploy
docker compose pull
docker compose up -d
```

Migrations corren automáticamente al boot del `api` container. **Siempre hacer backup antes de actualizar.**

---

## Troubleshooting

### Caddy no obtiene certificado
- Verificar que los 3 dominios resuelven al VPS (`dig`).
- Puertos 80 y 443 abiertos en el firewall.
- Logs: `docker compose logs caddy`.

### `api` en crash loop
- Logs: `docker compose logs api`.
- Revisar `DATABASE_URL`, `JWT_SECRET`, `GITHUB_CLIENT_ID`.
- Si es por migration: `docker compose exec db psql -U devdeck devdeck` y revisar `schema_migrations`.

### 401 en requests
- Token expiró: el cliente debería auto-refresh. Si no, re-login.
- `JWT_SECRET` cambió: todos los tokens viejos quedan inválidos. Normal después de rotar el secret.

### SSRF o scraping bloqueado
- El scraper de Open Graph bloquea IPs privadas por seguridad (ver `REVIEW_2026_04.md §3.4`). Si necesitás scrapear una URL interna, no es el caso de uso — usá "guardar como note" manual.

---

## Hardening recomendado

- Firewall: solo puertos 22, 80, 443 abiertos al público. Postgres solo escucha en la network interna de Docker.
- Fail2ban para SSH.
- SSH key-only, sin password.
- Backups automáticos fuera del VPS.
- Monitoreo: Uptime Kuma o healthchecks.io apuntando a `/healthz`.
- Logs centralizados: opcional, Loki + Grafana o Papertrail.

---

## IA local con Ollama (opcional)

Si querés features de IA sin mandar datos a OpenAI, agregar al `docker-compose.yml`:

```yaml
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama:/root/.ollama
    networks:
      - internal
    # Primer boot: pull modelos
    # docker compose exec ollama ollama pull llama3.2:3b
    # docker compose exec ollama ollama pull nomic-embed-text
```

En `.env`:
```
AI_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
```

Modelos recomendados:
- **Summaries / tags:** `llama3.2:3b` (2 GB, rápido, calidad ok).
- **Embeddings:** `nomic-embed-text` (270 MB, 768 dims).

Para embeddings de 1536 dims (compatible con OpenAI), se puede ajustar el schema de `items.embedding` según el modelo elegido.
