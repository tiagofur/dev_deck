---
tags:
  - devdeck
  - roadmap
  - strategy
status: active
date: 2026-04-29
---

# 🗺️ DevDeck — Strategic Roadmap (Web + Desktop)

> **Visión**: Transformar DevDeck en el cinturón de utilidades más poderoso para programadores. Tu memoria personal para desarrollo, asistida por IA, en todos tus dispositivos, offline-first.

---

## 🎯 Propósito de este documento

Este roadmap integra la evolución de **web** y **desktop** en una visión cohesiva. No es un cronograma fijo, sino un mapa de valor: qué agregamos, cuándo lo agregamos, y por qué.

El hilo conductor: **captura rápida → organización inteligente → redescubrimiento activo**.

---

## 📊 Landscape actual (2026-04)

### Web (React 18)
- ✅ Captura básica de items (repos, CLIs)
- ✅ Búsqueda fuzzy
- ✅ Preview rico (markdown, GitHub metadata)
- ✅ Cheatsheets por item
- ⏳ Auto-tagging (parcial)
- ❌ Compartición de items
- ❌ Búsqueda semántica
- ❌ Multi-user

### Desktop (Tauri)
- ⏳ MVP en desarrollo
- ❌ Hotkeys/launcher
- ❌ Offline-first
- ❌ Local indexing
- ❌ Sync con web

### Backend (Go)
- ✅ REST API base
- ✅ Auth simple
- ⏳ Versionado de API
- ❌ Endpoint de IA (tagging, search)
- ❌ Endpoint de compartición
- ❌ Vector DB para embeddings

---

## 🌊 Olas de desarrollo

### **Ola 1: Foundation (Ahora → Q2 2026)**

**Tema**: Claridad estratégica + Esquema robusto

#### Documentación
- [ ] STRATEGIC_ROADMAP.md (este archivo)
- [ ] FEATURE_INVENTORY.md (catálogo de features)
- [ ] ROADMAP_WEB.md (roadmap web específico)
- [ ] ROADMAP_DESKTOP.md (roadmap desktop específico)
- [ ] DATA_SCHEMA.md (definición de entidades)
- [ ] AI_STRATEGY.md (cómo IA agrega valor)
- [ ] UX_PATTERNS.md (componentes + flujos consistentes)

#### Backend
- [ ] Versionado de API (`/v1/` prefix)
- [ ] Schema completo en PostgreSQL (Items, Decks, Tips, Commands)
- [ ] Endpoint de extracto de metadata (URL → title, description, image)
- [ ] Endpoint de importación batch (compartición)

#### Web
- [ ] Mejorar captura (pega URL → auto-extrae metadata)
- [ ] Asignación de decks optimizada
- [ ] Tags manuales + auto-suggestions básicas

#### Desktop
- [ ] MVP base (Tauri)
- [ ] Sincronización SQLite ↔ Backend
- [ ] Modo offline básico (lectura)

**Resultado**: Decks organizados, captura rápida, sincronización base.

---

### **Ola 2: Intelligence (Q2-Q3 2026)**

**Tema**: IA que genera valor real (no decorativa)

#### Backend
- [ ] Integración con OpenAI API o Ollama
- [ ] Auto-tagging (classify item → tags relevantes)
- [ ] Auto-summary (generar descripción concisa)
- [ ] Embedding pipeline (generar embeddings para items)
- [ ] Vector DB (Pinecone, Weaviate o pgvector)

#### Web
- [ ] Búsqueda semántica ("dame un CLI para tareas paralelas")
- [ ] Sugerencias de items relacionados (por semántica)
- [ ] Preview mejorado con IA (summary destacado)
- [ ] Share links para items individuales

#### Desktop
- [ ] Hotkeys (cmd+K captura, cmd+shift+S screenshot)
- [ ] Launcher mode (search + execute commands)
- [ ] Desktop search (indexación local completa)

**Resultado**: Búsqueda inteligente, descubrimiento automático, captura ultrarrápida.

---

### **Ola 3: Collaboration (Q3-Q4 2026)**

**Tema**: Compartición + Comunidad

#### Backend
- [ ] Multi-user base (decks personales pero shareable)
- [ ] Share links con expiración (opcional)
- [ ] Comments en items (lightweight)
- [ ] Activity feed (lo que agregaron amigos)

#### Web
- [ ] Crear/compartir decks públicos
- [ ] Sistema de comentarios en items
- [ ] Trending section (decks populares en tu comunidad)
- [ ] Recomendaciones de items por comunidad

#### Desktop
- [ ] Sincronización de cambios en tiempo real
- [ ] Notificaciones de compartición

**Resultado**: DevDeck es red social, no solo app personal.

---

### **Ola 4: Offline Superpowers (Q4 2026 - Q1 2027)**

**Tema**: Funciona 100% offline, mejor que online

#### Backend
- [ ] Soporte para modelos de IA locales (Ollama)
- [ ] Exportación de embeddings para uso local

#### Desktop
- [ ] Ollama integration (embeddings + small LLMs locales)
- [ ] Semantic search completamente local
- [ ] Auto-tagging offline
- [ ] Sincronización smart (detecta cambios, resuelve conflictos)

#### Web
- [ ] Service Workers avanzados (offline caching)
- [ ] Sync de cambios cuando vuelve conexión

**Resultado**: Desktop es la mejor experiencia, web es la web app del desktop.

---

### **Ola 5: AI Assistant (Q1-Q2 2027)**

**Tema**: DevDeck conversa contigo

#### Backend
- [ ] "Ask DevDeck" endpoint (semantic search + LLM)
- [ ] Context-aware responses (busca en tu deck personal)
- [ ] Code generation (genera comandos basado en tu contexto)

#### Web + Desktop
- [ ] Chat sidebar (Ask DevDeck)
- [ ] Generate commands (describe → te genera el comando)
- [ ] Script generation (escribe workflow completo)

**Resultado**: DevDeck entiende tus problemas y sugiere soluciones basadas en tu colección personal.

---

## 🎯 Objetivos clave por plataforma

### 📱 **Web**

| Ola | Objetivo | Entrada del usuario | Salida de DevDeck |
|-----|----------|----------------------|-------------------|
| 1 | Captura rápida | Pega URL/descripción | Item en deck |
| 2 | Búsqueda inteligente | "CLI para tasks paralelas" | Items relevantes ranked por semántica |
| 3 | Compartición | Click "Share" | Link para compartir |
| 4 | Sincronización smart | Changes offline | Sync automático |
| 5 | Asistencia | "Cómo hago X?" | Chat con contexto de tu deck |

### 🖥️ **Desktop**

| Ola | Objetivo | Entrada del usuario | Salida de DevDeck |
|-----|----------|----------------------|-------------------|
| 1 | Espejo de web | Abres app | Tu deck sincronizado |
| 2 | Hotkeys | cmd+K | Captura modal + search |
| 3 | Sync en tiempo real | Agregás en web | Aparece en desktop |
| 4 | Offline 100% | Sin internet | Todo funciona igual |
| 5 | Asistencia local | "Genera comando para X" | Comando sugerido, ready to copy |

---

## 🏗️ Arquitectura conceptual

```
┌─────────────────────────────────────────────────────────────┐
│                     DevDeck Ecosystem                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌─────────────┐    ┌──────────────┐   │
│  │     Web      │    │   Desktop   │    │     CLI      │   │
│  │   (React)    │───→│   (Tauri)   │←───│   (Future)   │   │
│  └──────────────┘    └─────────────┘    └──────────────┘   │
│         │                   │                     │         │
│         └───────────────────┼─────────────────────┘         │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │   Backend Go    │                      │
│                    │  (REST API v1)  │                      │
│                    └────────┬────────┘                      │
│                             │                               │
│         ┌───────────────────┼───────────────────┐           │
│         │                   │                   │           │
│    ┌────▼────┐         ┌────▼────┐        ┌────▼────┐      │
│    │Database │         │  Vector │        │  Media  │      │
│    │ (PG)    │         │   DB    │        │ (S3)    │      │
│    └─────────┘         └─────────┘        └─────────┘      │
│         │                                                    │
│    ┌────▼───────────────────────┐                          │
│    │  AI Integration            │                          │
│    │  • OpenAI API              │                          │
│    │  • Ollama (local)          │                          │
│    │  • Embeddings              │                          │
│    └────────────────────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Métricas de éxito

### Ola 1
- ✅ Documentación clara (team entiende la visión)
- ✅ Schema validado (todos los tipos de items soportados)
- ✅ Captura rápida < 2 segundos
- ✅ Desktop MVP sincroniza en < 1 segundo

### Ola 2
- ✅ Búsqueda semántica funciona (top 3 resultados relevantes en 90% de queries)
- ✅ Auto-tagging >= 80% accuracy
- ✅ Desktop con hotkeys disponible
- ✅ 1000+ items capturados en beta

### Ola 3
- ✅ 50+ decks compartidos activamente
- ✅ Comment system usado
- ✅ Activity feed genera reengagement

### Ola 4
- ✅ Desktop funciona 100% offline
- ✅ Ollama integration reduces latency < 200ms
- ✅ Sync smart resuelve conflictos automáticamente

### Ola 5
- ✅ Ask DevDeck tiene >= 70% satisfaction
- ✅ Code generation saves devs 5+ min/día

---

## 🚀 Quick wins (comenzar ya)

1. **Crear FEATURE_INVENTORY.md** (esta semana)
   - Catálogo de 50+ features planeadas
   - Agrupar por Ola
   - Priorizar quick wins

2. **Mejorar docs/README.md** (esta semana)
   - Hacerlo inspirador
   - Agregar ejemplos de uso
   - Apuntar a roadmaps

3. **Actualizar ROADMAP.md (root)** (esta semana)
   - Conectar con STRATEGIC_ROADMAP
   - Alineación web + desktop

4. **Empezar DATA_SCHEMA.md** (próxima semana)
   - Definir Item, Deck, Tip, Command completamente
   - Incluir ejemplos JSON

---

## 🔄 Cómo mantener este documento

- **Actualizar cada Q** con cambios en prioridades
- **Mover features entre Olas** si el contexto cambia
- **Agregar aprendizajes** de implementación (qué fue más fácil/difícil)
- **Conectar con GitHub issues** (1 issue por feature importante)

---

## 📝 Notas de implementación

### Lenguaje
- Documentación en **español rioplatense casual** (per convention)
- Código en **inglés**
- Commits en **inglés con trailer de Copilot**

### Tech stack confirmado
- **Web**: React 18 (monorepo pnpm)
- **Desktop**: Tauri
- **Backend**: Go 1.23
- **DB**: PostgreSQL + Vector DB (TBD: Pinecone vs Weaviate vs pgvector)
- **AI**: OpenAI (+ Ollama local option)

### Decisiones abiertas
- [ ] Vector DB: Pinecone vs Weaviate vs pgvector?
- [ ] Multi-user desde Ola 3 o Ola 1?
- [ ] Monetización: tiering model?
- [ ] CLI como parte de Ola 4 o Ola 5?

---

**Owner**: tfurt  
**Última actualización**: 2026-04-29  
**Estado**: 🟢 Activo — Implementación en Ola 1
