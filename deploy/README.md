# DevDeck — Deploy

Deploy del backend Go + Postgres + Caddy a un VPS Linux.

## 0. Requisitos en el VPS

- Ubuntu 22.04+ / Debian 12+ (cualquier distro con Docker funciona)
- Docker + Docker Compose plugin instalados
- Puertos `80` y `443` abiertos
- Un dominio (o subdominio) apuntando al IP del VPS via registro `A`
  - Ejemplo: `api.devdeck.tudominio.com  →  1.2.3.4`

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
DOMAIN=api.devdeck.tudominio.com

# Postgres
PG_PASS=<el-base64-de-arriba>

# Backend
API_TOKEN=<el-hex-de-arriba>
GITHUB_TOKEN=                # opcional, ghp_... para 5000 req/h en lugar de 60

# Optional tuning
LOG_LEVEL=info
CORS_ORIGINS=app://.,http://localhost:5173
REFRESH_INTERVAL_HOURS=168
```

> ⚠️ **Nunca** commitees `.env`. Está en `.gitignore`.

## 4. Buildear y levantar

```bash
docker compose up -d --build
```

Esto va a:
1. Buildear `devdeck-api:latest` desde `../backend/Dockerfile`
2. Bajar `postgres:16-alpine` y `caddy:2-alpine`
3. Levantar los 3 servicios
4. **Caddy provisiona el certificado TLS automáticamente** la primera vez que tu dominio resuelva al VPS (Let's Encrypt)

Verificá que arrancaron:

```bash
docker compose ps
docker compose logs -f api
```

## 5. Aplicar la migración inicial (solo la primera vez)

```bash
docker compose exec -T db psql -U devdeck devdeck \
  < ../backend/migrations/0001_init.sql
```

## 6. Probar que está vivo

```bash
# Health (público)
curl https://api.devdeck.tudominio.com/healthz

# Auth check
curl -H "Authorization: Bearer $API_TOKEN" \
  https://api.devdeck.tudominio.com/api/repos
```

Si todo está bien, vas a ver `{"status":"ok"}` y `{"total":0,"items":[]}`.

## 7. Apuntar el cliente Electron al VPS

En tu máquina local, en `desktop/.env`:

```env
VITE_API_URL=https://api.devdeck.tudominio.com
VITE_API_TOKEN=<el-mismo-API_TOKEN-del-VPS>
```

Después rebuildeás el desktop con `npm run build:win` (Fase 6) y listo: tu DevDeck instalado en Windows habla con tu VPS.

---

## Operación común

### Updates
```bash
git pull
docker compose up -d --build api
```

### Logs en vivo
```bash
docker compose logs -f api
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
3. `docker compose up -d api` (recrea solo el container del api)
4. Actualizá también `desktop/.env` y rebuildeá el cliente

---

## Troubleshooting

### Caddy no consigue el cert
- Confirmá que el DNS resuelve al IP correcto: `dig api.devdeck.tudominio.com`
- Confirmá que los puertos 80/443 están abiertos: `sudo ufw status`
- Logs: `docker compose logs caddy`

### El api no arranca
- Casi siempre es `DB_URL` mal escrito o el container `db` todavía no terminó de inicializar (la primera vez puede tardar 10-20s)
- `docker compose logs db` y `docker compose logs api` te dicen qué pasa

### "API_TOKEN is required when AUTH_MODE=token"
- Olvidaste setear `API_TOKEN` en `.env`. Editá y `docker compose up -d api`.

### Quedé fuera por rate limit de GitHub
- Conseguite un PAT (Settings → Developer settings → Personal access tokens → Generate new) con scope `public_repo`
- Pegalo en `GITHUB_TOKEN` del `.env` y `docker compose up -d api`
- Pasás de 60/h a 5000/h
