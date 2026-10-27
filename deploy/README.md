# HeapDeck — Deploy

Deploy completo: Postgres + API Go + Web React + Caddy a un VPS Linux.

## 0. Requisitos en el VPS

- Ubuntu 22.04+ / Debian 12+ (cualquier distro con Docker funciona)
- Docker + Docker Compose plugin instalados
- Puertos `80` y `443` abiertos
- Un dominio (o subdominio) apuntando al IP del VPS via registro `A`
  - Ejemplo: `heapdeck.tudominio.com  →  1.2.3.4`

### Instalar Docker (si no lo tenés)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# logout/login para que tome el grupo
```

## 1. Clonar el repo

```bash
git clone https://github.com/tiagofur/heapdeck.git
cd heapdeck/deploy
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
DOMAIN=heapdeck.com
FRONTEND_URL=https://heapdeck.com

# Postgres
PG_PASS=<password-segura>

# Auth (GitHub OAuth)
AUTH_MODE=jwt
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
# Exact callback registered in the GitHub OAuth app (provider-specific path):
GITHUB_OAUTH_CALLBACK_URL=https://heapdeck.com/api/auth/github/callback
# Where the API sends the browser after provider login (web frontend route):
WEB_OAUTH_REDIRECT_URL=https://heapdeck.com/auth/callback

# JWT Secrets
JWT_SECRET=<hex-32-chars>
REFRESH_SECRET=<hex-32-chars>

# IA (Opcional, pero recomendado para la beta 0.6)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Opcional tuning
LOG_LEVEL=info
CORS_ORIGINS=https://heapdeck.com,app://.
```

> ⚠️ **Nunca** commitees `.env`. Está en `.gitignore`.

## 4. Buildear y levantar

```bash
docker compose up -d --build
```

Esto va a:
1. Buildear `heapdeck-api:latest` desde `../backend/Dockerfile`
2. Buildear `heapdeck-web:latest` desde `../apps/web/Dockerfile`
3. Bajar `pgvector/pgvector:pg16`, `nginx:alpine`, y `caddy:2-alpine`
4. Levantar los 4 servicios (db, api, web, caddy)
5. **Caddy provisiona el certificado TLS automáticamente**

Verificá que arrancaron:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

## 5. Aplicar migraciones (beta 0.6)

HeapDeck 0.6 beta requiere aplicar las migraciones del core disponibles:

```bash
for f in ../backend/migrations/*.sql; do
  echo "Aplicando $f..."
  docker compose exec -T db psql -U heapdeck heapdeck -v ON_ERROR_STOP=1 -f - < "$f"
done
```

## 6. Probar que está vivo

```bash
# Health (público - incluye DB ping en beta 0.6)
curl https://heapdeck.com/healthz

# Métricas (Prometheus)
# Las métricas solo se exponen dentro de la red interna de compose:
docker compose exec prometheus wget -qO- http://api:8080/metrics | head -5
```

Si todo está bien, vas a ver `{"status":"ok"}` y una lista de métricas que incluyen `heapdeck_agent_tool_calls_total`.

## 7. Observabilidad (beta 0.6)

HeapDeck incluye un stack de monitoreo integrado:

- **Prometheus**: Recolecta métricas de la API y de los Agentes.
- **Grafana**: Visualización en el subdominio que definas con
  `GF_SERVER_ROOT_URL` en `.env` (ej. `https://monitor.tudominio.com`, con su
  registro DNS apuntando al VPS) — ver el bloque `monitor.{$DOMAIN}` del
  Caddyfile.
  - Usuario por defecto: `admin`
  - Password: La que definas en `GF_PASS` (.env).

### Dashboards recomendados
1. **AI Performance**: Monitoreá el éxito de los Tool Calls y la latencia de los agentes.
2. **API Health**: Tasa de error 5xx, latencia de handlers y volumen de tráfico.
3. **Hardware**: Uso de CPU y RAM del container de Go.

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
pnpm dev -F @heapdeck/web

# Desktop (con electron)
pnpm dev -F @heapdeck/desktop
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
docker compose exec -T db pg_dump -U heapdeck heapdeck \
  | gzip > backups/heapdeck-$(date +%F).sql.gz
```

### Restore
```bash
gunzip -c backups/heapdeck-2026-04-07.sql.gz \
  | docker compose exec -T db psql -U heapdeck heapdeck
```

### Shell en Postgres
```bash
docker compose exec db psql -U heapdeck heapdeck
```

### Rotar el API token
1. Generá uno nuevo con `openssl rand -hex 32`
2. Editá `.env`
3. `docker compose up -d api`
4. Actualizá el token en cualquier cliente que use el API

---

## Troubleshooting

### Caddy no consigue el cert
- Confirmá que el DNS resuelve al IP correcto: `dig heapdeck.tudominio.com`
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