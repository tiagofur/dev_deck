# DevDeck — Deploy

Deploy completo: Postgres + API Go + Web React + Caddy a un VPS Linux.

## 0. Requisitos en el VPS

- Ubuntu 22.04+ / Debian 12+ (cualquier distro con Docker funciona)
- Docker + Docker Compose plugin instalados
- Puertos `80` y `443` abiertos
- Un dominio (o subdominio) apuntando al IP del VPS via registro `A`
  - Ejemplo: `devdeck.tudominio.com  →  1.2.3.4`

### Instalar Docker (si no lo tenés)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# logout/login para que tome el grupo
```

## 1. Clonar el repo

```bash
git clone https://github.com/tu-usuario/devdeck.git
cd devdeck/deploy
```

## 2. Generar secretos

```bash
# API token (largo, random)
openssl rand -hex 32

# Postgres password
openssl rand -base64 24
```

Guardalos a mano — los vas a necesitar en el siguiente paso.

## 3. Configurar `.env`

Creá `deploy/.env` con este contenido:

```env
# Dominio que apunta al VPS
DOMAIN=devdeck.ai
FRONTEND_URL=https://devdeck.ai

# Postgres
PG_PASS=<password-segura>

# Auth (GitHub OAuth)
AUTH_MODE=jwt
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_OAUTH_CALLBACK_URL=https://devdeck.ai/api/auth/callback
ALLOWED_GITHUB_LOGINS=tu-usuario,otro-colega

# JWT Secrets
JWT_SECRET=<hex-32-chars>
REFRESH_SECRET=<hex-32-chars>

# IA (Opcional, pero recomendado para v1.0)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Opcional tuning
LOG_LEVEL=info
CORS_ORIGINS=https://devdeck.ai,app://.
```

> ⚠️ **Nunca** commitees `.env`. Está en `.gitignore`.

## 4. Buildear y levantar

```bash
docker compose up -d --build
```

Esto va a:
1. Buildear `devdeck-api:latest` desde `../backend/Dockerfile`
2. Buildear `devdeck-web:latest` desde `../apps/web/Dockerfile`
3. Bajar `pgvector/pgvector:pg16`, `nginx:alpine`, y `caddy:2-alpine`
4. Levantar los 4 servicios (db, api, web, caddy)
5. **Caddy provisiona el certificado TLS automáticamente**

Verificá que arrancaron:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

## 5. Aplicar migraciones (v1.0.0)

DevDeck v1.0.0 requiere aplicar todas las migraciones del core:

```bash
for f in ../backend/migrations/*.sql; do
  echo "Aplicando $f..."
  docker compose exec -T db psql -U devdeck devdeck -v ON_ERROR_STOP=1 -f - < "$f"
done
```

## 6. Probar que está vivo

```bash
# Health (público - incluye DB ping en v1.0)
curl https://devdeck.ai/healthz

# Métricas (Prometheus)
curl https://devdeck.ai/metrics
```

Si todo está bien, vas a ver `{"status":"ok"}` y una lista de métricas que incluyen `devdeck_agent_tool_calls_total`.

---

## Stack completo

```
┌──────────────┐
│   Caddy      │  ← reverse proxy con TLS automático
│  :80 :443    │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
┌──┴──┐ ┌┴────┐
│ api  │ │web  │
│:8080 │ │:3000│
└──┬──┘ └──┬──┘
   │        │
   └────┬──┘
        │
   ┌───┴────┐
   │   db   │
   │ :5432  │
   └────────┘
```

| Servicio | Puerto interno | Descripción |
|---------|---------------|------------|
| db | 5432 | Postgres 16 |
| api | 8080 | Go API |
| web | 3000 | Nginx + SPA |
| caddy | 80/443 | Reverse proxy + TLS |

---

## Desarrollo local

```bash
# Backend Go (puerto 8080)
cd backend && go run ./cmd/api

# Web app (puerto 5173)
pnpm dev -F @devdeck/web

# Desktop (con electron)
pnpm dev -F @devdeck/desktop
```

Con docker-compose local:

```bash
docker compose -f docker-compose.local.yml up -d
```

---

## Operación común

### Updates
```bash
git pull
docker compose up -d --build
```

### Logs en vivo
```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f caddy
```

### Backup de Postgres
```bash
docker compose exec -T db pg_dump -U devdeck devdeck \
  | gzip > backups/devdeck-$(date +%F).sql.gz
```

### Restore
```bash
gunzip -c backups/devdeck-2026-04-07.sql.gz \
  | docker compose exec -T db psql -U devdeck devdeck
```

### Shell en Postgres
```bash
docker compose exec db psql -U devdeck devdeck
```

### Rotar el API token
1. Generá uno nuevo con `openssl rand -hex 32`
2. Editá `.env`
3. `docker compose up -d api`
4. Actualizá el token en cualquier cliente que use el API

---

## Troubleshooting

### Caddy no consigue el cert
- Confirmá que el DNS resuelve al IP correcto: `dig devdeck.tudominio.com`
- Confirmá que los puertos 80/443 están abiertos: `sudo ufw status`
- Logs: `docker compose logs caddy`

### El api no arranca
- Casi siempre es `DB_URL` mal escrito o el container `db` todavía no terminó de inicializar
- `docker compose logs db` y `docker compose logs api` te dicen qué pasa

### El web muestra 502
- Verificá que el servicio web esté corriendo: `docker compose ps web`
- Logs: `docker compose logs web`
- Puede ser que el build no completó bien

### "API_TOKEN is required when AUTH_MODE=token"
- Olvidaste setear `API_TOKEN` en `.env`. Editá y `docker compose up -d api`.

### Quedé fuera por rate limit de GitHub
- Conseguite un PAT (Settings → Developer settings → Personal access tokens → Generate new) con scope `public_repo`
- Pegalo en `GITHUB_TOKEN` del `.env` y `docker compose up -d api`
- Pasás de 60/h a 5000/h