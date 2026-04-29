---
tags:
  - devdeck
  - roadmap
  - web
  - react
status: active
date: 2026-04-29
---

# 🌐 DevDeck — Web Roadmap (React 18)

> Evolución específica del cliente web. Desde MVP de captura rápida → búsqueda inteligente → colaboración → poder offline.

---

## 📍 Estado actual (2026-04)

### Lo que existe ✅
- Captura básica de items (repos, CLIs)
- Vista de items con preview rico
- Búsqueda fuzzy por título/descripción
- Cheatsheets editables
- Sistema de decks
- Dark/light mode
- Integración con GitHub (metadata automática)

### Lo que falta 🚧
- Auto-tagging con IA
- Búsqueda semántica (embeddings)
- Compartición de items
- Multi-user support
- Mobile UI mejorada
- Funciones offline básicas

---

## 🌊 Fases de desarrollo

### **Fase 1: Captura Pro** (Q2 2026 — 3-4 semanas)

**Objetivo**: Hacer captura ultrarrápida y asignar a decks automáticamente

#### Features
- [ ] **Quick Capture optimizado** — Modal minimizado, drag-and-drop, paste URL
- [ ] **Auto-metadata** — Extrae title, description, image automáticamente
- [ ] **Deck suggestions** — IA sugiere qué deck asignarlo
- [ ] **Smart tags** — Tags manuales + suggestions básicas
- [ ] **Keyboard shortcuts** — cmd+K search, cmd+N new item, cmd+L focus search

#### Backend changes
- [ ] Endpoint `/items/metadata?url=...` (extrae og:title, og:image, etc)
- [ ] Endpoint `/suggestions/deck` (dado texto, qué deck)

#### UI/UX changes
- [ ] Refactor capture modal (más compacta, más rápida)
- [ ] Preview inline (sin hacer click)
- [ ] Feedback visual mientras se procesa

#### Done when
- ✅ Captura < 2 segundos
- ✅ 100% de items tienen metadata automática
- ✅ Keyboard shortcuts funcionan

---

### **Fase 2: Inteligencia** (Q3 2026 — 4-5 semanas)

**Objetivo**: IA que organiza y ayuda a encontrar

#### Features
- [ ] **Auto-tagging** — IA asigna 3-5 tags por item automáticamente
- [ ] **Stack detection** — Detecta tech stack (Go, Node, Python, Docker, etc)
- [ ] **Semantic search** — Buscar por intención, no por keywords exactos
- [ ] **Related items** — Sugerir items por semántica
- [ ] **Auto-summary** — IA genera descripción concisa si no existe

#### Backend changes
- [ ] Integración con OpenAI API (o Ollama)
- [ ] Endpoint `/items/{id}/tags/auto` (genera tags)
- [ ] Endpoint `/search/semantic?q=...` (busca por embeddings)
- [ ] Vector DB setup (Pinecone, Weaviate o pgvector)
- [ ] Embedding pipeline (generar embeddings para items)

#### AI prompt strategy
- Auto-tagging prompt: "Este es un item de desarrollo. Analiza su URL, título y descripción. Asigna 3-5 tags técnicos relevantes (ej: 'cli', 'go', 'performance')"
- Stack detection prompt: "¿Qué tech stack es relevante? Devuelve lista de: Go, Node, Python, Docker, Kubernetes, etc"

#### UI/UX changes
- [ ] Search bar mejorada (más grande, con ejemplos de queries)
- [ ] Search results ranking por relevancia (semantic > fuzzy)
- [ ] "Related items" section en vista de item
- [ ] Tags auto-generados con icono ✨ (diferenciados de manuales)

#### Done when
- ✅ Auto-tagging >= 80% accuracy (manual review de sample)
- ✅ Semantic search top 3 resultados relevantes en 90% queries
- ✅ Related items shown on 100% of items

---

### **Fase 3: Compartición** (Q3-Q4 2026 — 3-4 semanas)

**Objetivo**: Compartir lo bueno con otros

#### Features
- [ ] **Share item link** — Generar URL pública para item individual
- [ ] **Expiring links** — Link expira en 24h, 7d, 30d
- [ ] **Share modal** — UI para copiar link, configurar duración
- [ ] **Public deck preview** — Vista pública de deck (anónimo puede ver items)
- [ ] **Copy to my deck** — Si veo item compartido, copiarlo a mi deck
- [ ] **Comment system** — Comentarios lightweight en items públicos

#### Backend changes
- [ ] Endpoint `/items/{id}/share` (POST → genera share link)
- [ ] Endpoint `/share/{token}` (GET → devuelve item público)
- [ ] Endpoint `/items/{id}/comments` (GET/POST)
- [ ] Database schema: `shares` table (token, item_id, expires_at)
- [ ] Database schema: `comments` table (item_id, user_id, text, created_at)

#### UI/UX changes
- [ ] Share button en cada item
- [ ] Comments section en view item (solo si público)
- [ ] Activity feed (items que amigos compartieron)

#### Done when
- ✅ Share links funcionan (público ve item sin login)
- ✅ Comments permitidos en items compartidos
- ✅ Copy to deck workflow fluido

---

### **Fase 4: Social (Future)** (Q4 2026 - Q1 2027)

**Objetivo**: DevDeck es red social, no solo app personal

#### Features (planeadas)
- [ ] **Trending section** — Items más compartidos esta semana
- [ ] **User profiles** — Ver qué agregan otros devs
- [ ] **Follow users** — Seguir perfiles interesantes
- [ ] **Activity feed** — Qué agregaron usuarios que seguís
- [ ] **Upvotes** — Votar items interesantes

#### This connects to multi-user in backend

---

## 🛠️ Tech decisions

### Frontend
- **Framework**: React 18 (confirmado)
- **Build**: Vite (fast refresh, fast build)
- **Components**: Reutilizables entre web + desktop (monorepo pnpm)
- **Styling**: Tailwind + custom CSS (neo-brutalist + Snarkel colors)
- **State**: React Query (server state) + Zustand (local state)
- **Testing**: Vitest + React Testing Library

### Backend integration
- **API**: REST v1 (prefijo `/v1/`)
- **Auth**: JWT (bearer token)
- **Real-time**: Polling o WebSockets (TBD después de Fase 1)

### AI/Embeddings
- **OpenAI**: Fallback default, costs money
- **Ollama**: Alternative local, gratuito
- **Vector DB**: TBD (Pinecone vs Weaviate vs pgvector)

---

## 📈 Success metrics por fase

### Fase 1
- Capture time < 2 segundos
- 100% adoption de capture tool por users activos
- Keyboard shortcuts used in 70% of captures

### Fase 2
- Auto-tag accuracy >= 80%
- 60% of searches are semantic (no fuzzy)
- Related items click-through rate >= 15%

### Fase 3
- 50+ share links creados
- Average 5+ comments per public item
- Copy to deck conversion 30%

### Fase 4
- 100+ followers de top users
- Activity feed generates 2x reengagement

---

## 🚀 Próximos pasos inmediatos

1. **Esta semana**: Diseñar DATA_SCHEMA.md (qué campos nuevo para cada entidad)
2. **Próxima semana**: Actualizar API.md con endpoints nuevos
3. **Semana 3**: Feature branch "capture-pro" en repo
4. **Semana 4**: Auto-metadata en backend + test

---

## 🔗 Relacionado

- [STRATEGIC_ROADMAP.md](STRATEGIC_ROADMAP.md) — Visión integrada
- [ROADMAP_DESKTOP.md](ROADMAP_DESKTOP.md) — Roadmap desktop (espejo)
- [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md) — Catálogo de features
- [../API.md](../API.md) — Especificación API
- [../TECHNICAL_ROADMAP_AI_OFFLINE.md](../TECHNICAL_ROADMAP_AI_OFFLINE.md) — Original roadmap

---

**Owner**: tfurt  
**Última actualización**: 2026-04-29  
**Estado**: 🟢 Activo — Implementación Fase 1 en progreso
