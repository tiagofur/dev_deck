---
tags:
  - dashboard
  - devdeck
  - daily-progress
aliases:
  - Dashboard
  - Hub
  - Inicio
type: dashboard
status: active
date: 2026-04-29
updated: 2026-04-29
---

# 📊 DevDeck — Dashboard

> **Tu memoria externa asistida por IA para desarrollo.**  
> Offline-first, multi-usuario, multiplataforma — Guardar, organizar y redescubrir todo lo útil.

---

## 🎯 Visión ejecutiva (30 segundos)

DevDeck es una app para guardar y recuperar **por intención** todo lo que un developer descubre: repos, CLIs, plugins, shortcuts, snippets, agentes, prompts, workflows. La IA clasifica, resume y busca semánticamente lo que guardaste.

| Aspecto | Detalle |
|---------|---------|
| **Fase actual** | Ola 5 — Fase 17 completada |
| **Stack** | Electron + React (Desktop) / React + Vite (Web) / Go + Chi (Backend) / PostgreSQL 16 |
| **Modo offline** | SQLite local (Electron) + sql.js/OPFS (Web) |
| **Dominio** | [devdeck.ai](https://devdeck.ai) |

---

## 📈 Progreso por streams

| Stream | Fase actual | Objetivo | Estado |
|--------|-------------|----------|--------|
| **Backend** | 17 | Auto-tagging + Auto-summary IA | 🟡 Hardened & Ready |
| **Frontend** | 17 | React 18 full (de Vue) | 🟡 Migrado, en content |
| **IA & Búsqueda** | 18 (próximo) | Auto-tagging + Semantic search | 🔲 Próxima fase |
| **Offline-Sync** | Ola 6 | CRDTs + Multi-user | 🔲 Después |

---

## 🟢 Bloqueantes: NINGUNO

- ✅ Tests + CI completados (Fase 16.6)
- ✅ Backend hardened (SSRF guard, rate limiting, auth)
- ✅ Capture pipeline funcional (Fase 16.9)
- ✅ Monorepo pnpm workspaces + React unificado (Fase 16.13)

---

## 🎯 Próximos hitos

### Fase 18 — Auto-tagging + Auto-summary (próximo)
- Auto-detect tags basado en itemContent + intent
- Auto-generar 1-liner summary
- UI: preview antes de guardar
- Usar OpenAI o Ollama (local)

### Fase 19 — Búsqueda semántica
- Embeddings en PostgreSQL (pgvector)
- `/search/semantic` endpoint
- Discovery mejorado

### Fase 20 — "Ask DevDeck"
- LLM-powered QA sobre tu colección
- Multi-turn conversations
- Graph de items relacionados

### Ola 6 — Offline-first + Sync
- CRDTs o Event sourcing
- SQLite ↔ PostgreSQL sync
- Colaboración multi-usuario real-time

---

## 🏗️ Stack en 30 segundos

```
DESKTOP: Electron + React 18 + Tailwind + Framer Motion
WEB:     React 18 + Vite + React Router + TanStack Query
BACKEND: Go + Chi + pgx + pgvector + PostgreSQL 16
OFFLINE: SQLite (Desktop) + sql.js/OPFS (Web)
IA:      OpenAI API / Ollama (local)
DEPLOY:  Docker Compose + Caddy + VPS
```

---

## 📚 Navegación por área

| Área | Enlaces |
|------|---------|
| **Frontend** | [[Frontend/Frontend MOC]] · [[Frontend/Estado Plataforma]] |
| **Backend** | [[Backend/Backend MOC]] · [[Backend/Estado Plataforma]] |
| **Arquitectura** | [[Architecture/Arquitectura General]] · [[Architecture/ADR Index]] |
| **Producto** | [[PRD/README]] |
| **Operación** | [[Runbooks/README]] |

---

## 🔄 Estado por plataforma

| Plataforma | Status | Link |
|-----------|--------|------|
| **Desktop (Electron)** | 🟡 Fase 17 | [[Frontend/Estado Plataforma]] |
| **Web (React)** | 🟡 Fase 17 | [[Frontend/Estado Plataforma]] |
| **Backend (Go)** | 🟢 Ready | [[Backend/Estado Plataforma]] |
| **CLI** | 🟡 P0 listo, falta release | [[Backend/Estado Plataforma]] |
| **Extension** | 🟡 Manifest v3 P0 | [[Backend/Estado Plataforma]] |

---

## 📖 Documentos clave

- **[[PRD/README]]** — Features, user stories, scope por ola
- **[[Architecture/Arquitectura General]]** — Full-stack diagram + decisiones
- **[[Runbooks/Setup Local]]** — Desarrollo local
- **[[Runbooks/Testing]]** — Estrategia de tests + CI/CD
- **[[Runbooks/Deployment]]** — Producción + Docker
- **[[Architecture/ADR Index]]** — Decisiones documentadas

---

*Última actualización: 2026-04-29*  
*Owner: @dev-team*  
*Mantener actualizado es crítico para la coherencia del equipo.*
