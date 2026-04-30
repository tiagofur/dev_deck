---
tags:
  - runbook
  - devdeck
  - local-development
aliases:
  - Local Dev Setup
  - Setup
type: runbook
status: active
date: 2026-04-29
updated: 2026-04-29
---

# 🚀 Runbook — Setup Local Development

> Cómo levantar DevDeck en tu máquina para desarrollo.

---

## 📋 Pre-requisitos

```bash
# Verificar que los tienes instalados:
node --version          # v18+ (recomendado v20+)
pnpm --version          # v10+ (package manager)
go version              # 1.21+ (backend)
docker --version        # Docker Desktop (database)
git --version           # v2.37+
```

### Instalar si falta algo

```bash
# macOS (Homebrew)
brew install node
brew install pnpm
brew install go
brew install docker
brew install git

# Linux (Ubuntu/Debian)
sudo apt-get install nodejs npm
npm install -g pnpm
sudo apt-get install golang-go
sudo apt-get install docker.io
```

---

## 🔧 Setup Paso a Paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/devdeckai/dev_deck.git
cd dev_deck
```

### 2. Instalar dependencias (Frontend + Backend)

```bash
# Frontend: pnpm workspaces
pnpm install

# Verificar que todo está instalado
pnpm -r list --depth=0 | grep "@devdeck"
# Debe mostrar: @devdeck/ui, @devdeck/api-client, @devdeck/features
```

### 3. Levantar PostgreSQL (Docker)

```bash
# En la raíz del proyecto, usar el compose local
docker compose -f deploy/docker-compose.local.yml up -d db migrate api

# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Esperar ~5 segundos para que levante completamente
sleep 5

# Ver logs (opcional)
docker compose -f deploy/docker-compose.local.yml logs db
```

### 4. Configurar variables de entorno

```bash
# Backend
cat > backend/.env << 'EOF'
DB_URL=postgres://devdeck:devdeck@localhost:5432/devdeck?sslmode=disable
PORT=8080
AUTH_MODE=jwt
JWT_SECRET=devdeck-local-jwt-secret
GITHUB_CLIENT_ID=stub
GITHUB_CLIENT_SECRET=stub
GITHUB_OAUTH_CALLBACK_URL=http://localhost:8080/api/auth/github/callback
APP_OAUTH_REDIRECT_URL=http://localhost:5173/auth/callback
LOG_LEVEL=debug
SEED_CHEATSHEETS=true
EOF

# Desktop
cat > apps/desktop/.env << 'EOF'
VITE_API_URL=http://localhost:8080
VITE_AUTH_MODE=token
VITE_API_TOKEN=devdeck-local-token
VITE_ENV=development
EOF

# Web
cat > apps/web/.env << 'EOF'
VITE_API_URL=http://localhost:8080
VITE_AUTH_MODE=jwt
VITE_ENV=development
EOF
```

### 5. Ejecutar migraciones de base de datos

Con `deploy/docker-compose.local.yml`, las migraciones corren automáticamente en el servicio `migrate`.

```bash
# Verificar que migrate terminó bien
docker compose -f deploy/docker-compose.local.yml logs migrate

# Verificar que las tablas existen
docker compose -f deploy/docker-compose.local.yml exec db \
  psql -U devdeck -d devdeck -c "\dt"
```

### 6. Levantar el backend (Go)

```bash
# En la raíz o en backend/
cd backend

# Terminal 1: Backend API (si no querés usar el container api local)
go run ./cmd/api

# Debe mostrar algo como:
# INFO ... msg="server starting" addr=":8080"

# Verificar que está vivo
curl http://localhost:8080/healthz
# Respuesta: {"status":"ok"}
```

### 7. Levantar el frontend (Web o Desktop)

```bash
# Terminal 2 (desde raíz)

# OPCIÓN A: Web (React + Vite)
pnpm dev:web
# Abre http://localhost:5173

# OPCIÓN B: Desktop (Electron)
pnpm dev:desktop
# Se abre una ventana de Electron

# Ambas: ejecutar secuencialmente si quieres ambas
pnpm dev:web &
pnpm dev:desktop
```

---

## ✅ Verificar que todo funciona

### Checklist

```bash
✅ Backend running (http://localhost:8080/healthz)
✅ PostgreSQL running (docker ps)
✅ Web available (http://localhost:5173)
✅ Database has tables (psql -c "\dt")

# Si algo no funciona, ver siguiente sección
```

### Test rápido

```bash
# 1. Backend API
curl http://localhost:8080/healthz
# {"status":"ok"}

# 2. List repos (modo token para desktop dev)
curl http://localhost:8080/api/repos \
  -H "Authorization: Bearer devdeck-local-token"

# 3. Frontend
open http://localhost:5173
# Verás la UI
```

---

## 🐛 Troubleshooting

### "Connection refused on localhost:5432"

```bash
# PostgreSQL no está corriendo
docker compose -f deploy/docker-compose.local.yml up -d db migrate api

# Esperar ~5 segundos
sleep 5

# Verificar
docker ps | grep postgres
```

### "database does not exist"

```bash
# Revisar logs del servicio migrate
docker compose -f deploy/docker-compose.local.yml logs migrate
```

### "pnpm: command not found"

```bash
npm install -g pnpm
# O en macOS:
brew install pnpm

# Verificar
pnpm --version
```

### Backend: "Address already in use :3000"

```bash
# Algo ya está usando puerto 3000
lsof -i :3000
kill -9 <PID>

# O cambiar puerto en backend/.env
PORT=3001
```

### Web: "CORS error" en console

```bash
# El backend CORS no está configurado correctamente
# Verificar backend/internal/http/router.go

# Asegurar que VITE_API_URL apunta al backend correcto
echo $VITE_API_URL
# Debe ser: http://localhost:8080
```

### Desktop: "Cannot find electron"

```bash
# No se instalaron dependencias de desktop
cd apps/desktop
pnpm install

# O desde raíz
pnpm install
```

---

## 📁 Estructura de carpetas (overview)

```
dev_deck/
├── backend/                 # Go API
│   ├── cmd/api/main.go
│   ├── internal/
│   │   ├── domain/         # Business logic
│   │   ├── http/           # HTTP handlers
│   │   └── store/          # Database layer
│   ├── migrations/         # SQL migrations (5 files)
│   └── .env
│
├── apps/
│   ├── desktop/            # Electron app
│   │   ├── src/
│   │   │   ├── main.ts     # Electron main process
│   │   │   └── App.tsx     # React renderer
│   │   └── .env
│   │
│   └── web/                # Web app
│       ├── src/
│       │   ├── main.tsx
│       │   └── App.tsx
│       └── .env
│
├── packages/
│   ├── ui/                 # Design system
│   ├── api-client/         # TanStack Query hooks
│   └── features/           # Shared pages + components
│
├── docs/                   # Documentation
│   ├── Architecture/
│   ├── PRD/
│   ├── Runbooks/
│   └── adr/
│
└── deploy/
    ├── docker-compose.yml
    └── Caddyfile (production)
```

---

## 🧪 Ejecutar tests

```bash
# Backend tests
cd backend
go test ./...

# Frontend tests (Vitest)
pnpm -F @devdeck/ui test
pnpm -F @devdeck/api-client test
pnpm -F @devdeck/features test
pnpm -F @devdeck/desktop test

# E2E tests (Playwright)
pnpm -F @devdeck/web e2e

# Todos los tests
pnpm test
```

---

## 🔧 Debugging

### Backend (Go)

```bash
# Con verbose logging
LOG_LEVEL=debug go run ./cmd/api/main.go

# Con debugger (dlv)
go install github.com/go-delve/delve/cmd/dlv@latest
dlv debug ./cmd/api
(dlv) continue
(dlv) break main.main
(dlv) c
```

### Frontend (Web)

```bash
# Chrome DevTools abre automáticamente
pnpm dev:web
# F12 para abrir DevTools

# Debugger breakpoints
# En el código: debugger;
// En src/main.tsx
debugger;
```

### Frontend (Desktop)

```bash
# Electron DevTools
pnpm dev:desktop

# Presiona: Cmd+Option+I (macOS) o Ctrl+Shift+I (Linux/Windows)
# Para abrir DevTools
```

---

## 📚 Documentos relacionados

- **[[Runbooks/Testing]]** — Estrategia de tests completa
- **[[Runbooks/Deployment]]** — Deployment a producción
- **[[Backend/Backend MOC]]** — Estructura del backend
- **[[Frontend/Frontend MOC]]** — Estructura del frontend

---

## 🎯 Próximos pasos

1. **Leer el código:** Empieza en `backend/cmd/api/main.go` o `apps/web/src/App.tsx`
2. **Crear un item:** Usa CaptureModal para guardar un repo
3. **Escribir un test:** Agrega un test en `backend/internal/http/handlers/items_test.go`
4. **Hacer un cambio:** Modifica un handler y verifica que los tests pasen

---

**Last updated:** 2026-04-29  
**Maintained by:** @dev-team  
**Status:** Production-ready
