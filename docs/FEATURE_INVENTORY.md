---
tags:
  - devdeck
  - features
  - inventory
status: active
date: 2026-04-29
---

# 📦 DevDeck — Feature Inventory

> Catálogo de **todas las features** planeadas, agrupadas por tipo y Ola de desarrollo. Cada feature describe: qué es, por qué importa, cuándo la hacemos.

---

## 🎯 Ola 1: Foundation

### Core Capture

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Quick Capture** | Modal: pega URL/descripción → extrae metadata automáticamente (title, description, image, tags básicos) | Sin esto, capturar es lento | 🟡 Mejorando |
| **Deck Assignment** | Al capturar, elegir o crear deck (carpeta temática) | Items desorganizados = inútiles | ✅ Existe |
| **Manual Tags** | Agregar tags propios al capturar | Tags auto-generados no siempre acierta | ✅ Existe |
| **Item Types** | Soportar: Repo, CLI, Plugin, Snippet, Tip, Workflow, Prompt | Cada cosa se ve y se usa distinto | ✅ Existe |
| **Cheatsheet Editor** | Editar cheatsheet por item (markdown) | Documentar "cómo se usa" cada herramienta | ✅ Existe |

### Organization

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Decks** | Carpetas temáticas (p.ej. "Go tools", "DevOps") | Agrupar items por contexto | ✅ Existe |
| **Favorites** | Marcar items como favoritos | Quick access a lo que usás siempre | ⏳ Pendiente |
| **Collections** | Agrupaciones temáticas dentro de decks | Sub-carpetas para estructura profunda | ⏳ Pendiente |
| **Search (Fuzzy)** | Búsqueda por título/descripción/tags | Base de la usabilidad | ✅ Existe |
| **Filter by Type** | Filtrar items por tipo (solo repos, solo CLIs) | Focus en lo que buscás | ⏳ Pendiente |
| **Filter by Stack** | Filtrar por tecnología (Go/Node/Python/Docker) | "Muestra solo mis Go tools" | ⏳ Pendiente |

### Experience

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Rich Preview** | Vista previa detallada del item (markdown, GitHub data, videos) | Vemos toda la información del item sin hacer click | ✅ Existe |
| **Keyboard Shortcuts** | cmd+K search, cmd+N new item, etc | Velocidad | ⏳ Mejorado web |
| **Dark/Light Mode** | Toggle tema (persist en settings) | Comodidad | ✅ Existe |
| **Mobile responsive** | Web app responsive en celular | Consultas on-the-go | 🟡 Parcial |

---

## 🎯 Ola 2: Intelligence

### AI-Powered Organization

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Auto-Tagging** | IA asigna tags automáticamente al capturar | Organizar sin trabajo manual | ⏳ Pendiente |
| **Auto-Summary** | IA genera descripción concisa del item | Saber qué es sin leer todo | ⏳ Pendiente |
| **Stack Detection** | IA detecta tech stack (Go/Node/Python/etc) | Filtrar automáticamente | ⏳ Pendiente |
| **Category Suggestion** | IA sugiere qué deck asignarlo | Assist en captura | ⏳ Pendiente |
| **Duplicate Detection** | IA detecta items similares | No duplicar | ⏳ Pendiente |

### Intelligent Search

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Semantic Search** | Buscar por intención: "CLI para tareas paralelas" → items relevantes ranked | Encontrar lo que necesitás sin memorizar keywords | ⏳ Pendiente |
| **Natural Language Query** | Preguntar en lenguaje natural | Búsqueda sin sintaxis | ⏳ Pendiente |
| **Search History** | Guardar búsquedas recientes | Volver a lo que buscaste | ⏳ Pendiente |
| **Saved Searches** | Guardar búsquedas complejas | "Mis busquedas favoritas" | ⏳ Pendiente |

### Discovery

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Related Items** | Sugerir items por semántica | "Si te gusto X, te gustará Y" | ⏳ Pendiente |
| **Trending in Deck** | Items más vistos en cada deck | Descubrir lo popular | ⏳ Pendiente |
| **Similar Commands** | Sugerir comandos similares al digitar | Helper en captura | ⏳ Pendiente |
| **Random Discovery** | "Algo random de tu deck" (Daily surprise) | Redescubrir cosas guardadas | ⏳ Pendiente |

### Desktop Power

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Hotkey Capture** | cmd+K = captura modal (global hotkey) | Capturar sin abrir app | ⏳ Pendiente |
| **Screenshot + Annotate** | cmd+shift+S = screenshot → annotate → save | Capturar visualmente | ⏳ Pendiente |
| **Launcher Mode** | cmd+K search + execute (CLI commands) | "My own Raycast, pero para mi DevDeck" | ⏳ Pendiente |
| **Sync Desktop→Web** | Cambios en desktop sincronizan a web | Always in sync | 🟡 Parcial |

---

## 🎯 Ola 3: Collaboration

### Sharing

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Share Item Link** | Generar link para compartir item individual | Mostrar a un colega | ⏳ Pendiente |
| **Expiring Links** | Link con expiración (24h, 7d, etc) | Control de acceso | ⏳ Pendiente |
| **Share Deck Public** | Publicar deck entero como público | "Mi deck de Go tools" disponible para community | ⏳ Pendiente |
| **Copy Item** | Copiar item a tu deck | Clonar cosas interesantes de otros | ⏳ Pendiente |

### Social

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Comments on Items** | Comentar en items compartidos | "Cómo lo usás vos?" | ⏳ Pendiente |
| **Activity Feed** | Ver qué agregaron amigos a decks públicos | Descubrir nuevo | ⏳ Pendiente |
| **Upvotes** | Upvotear items interesantes | Señalar calidad | ⏳ Pendiente |
| **Deck Followers** | Seguir decks de otros | "Quiero ver lo que agrega" | ⏳ Pendiente |

### Community

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Trending Decks** | Decks populares en la comunidad | Descubrir curación buena | ⏳ Pendiente |
| **Curated Collections** | Decks armados por DevDeck team | Onboarding: "Starter Go toolkit", "DevOps essentials" | ⏳ Pendiente |
| **Community Picks** | Items recomendados por comunidad | Crowdsourced discovery | ⏳ Pendiente |

---

## 🎯 Ola 4: Offline Superpowers

### Local Intelligence

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Ollama Integration** | Usar modelos de IA locales (Mistral, Llama2) | IA sin cloud costs, privacy | ⏳ Pendiente |
| **Local Embeddings** | Generar embeddings localmente | Semantic search offline | ⏳ Pendiente |
| **Local Vector DB** | SQLite + FTS para embeddings locales | No depender de cloud | ⏳ Pendiente |
| **Offline Auto-Tagging** | Auto-tagging sin internet | Funciona sin conexión | ⏳ Pendiente |

### Sync & Conflict Resolution

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Smart Sync** | Detecta cambios, sincroniza cuando hay conexión | Offline-first funciona | ⏳ Pendiente |
| **Conflict Resolution** | Si cambias same item en web y desktop, resolver automáticamente | No perder cambios | ⏳ Pendiente |
| **Sync Status Indicator** | Mostrar si estamos sincronizados o desincronizados | Transparencia | ⏳ Pendiente |
| **Selective Sync** | Sync solo ciertos decks | Control de datos | ⏳ Pendiente |

### Performance

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Instant Search** | Búsqueda local < 100ms | UX rápida | ⏳ Pendiente |
| **Quick Launch** | Desktop abre < 1s | Velocidad | ⏳ Pendiente |
| **Indexing Background** | Indexar items en background sin bloquear | Responsivo | ⏳ Pendiente |

---

## 🎯 Ola 5: AI Assistant

### Ask DevDeck

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Ask Modal** | cmd+A = Chat con DevDeck | "¿Cómo hago X?" | ⏳ Pendiente |
| **Contextual Answers** | IA busca en tu deck personal + internet | Respuestas personalizadas | ⏳ Pendiente |
| **Code Generation** | Generar comandos/scripts basado en tu contexto | "Genera un script para hacer X" | ⏳ Pendiente |
| **Workflow Generation** | "Generar workflow completo" → DevDeck arma pasos | Automatizar procesos | ⏳ Pendiente |

### Learning

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Generate Cheatsheet** | IA genera cheatsheet para item | Documentación automática | ⏳ Pendiente |
| **Learning Path** | "Enseñame Go" → secuencia items + mini-lessons | Onboarding a tools | ⏳ Pendiente |
| **Explain Item** | IA explica qué hace, cuándo lo usás | Entender herramientas | ⏳ Pendiente |

---

## 🌟 Special Features (All Olas)

### Tips & Commands System

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Tips by Stack** | Consejos para Go, Node, Docker, etc | "Mejores prácticas de Go" | ⏳ Pendiente |
| **Commands per Item** | Guardar comandos más usados de una tool | Copy-paste ready | ⏳ Pendiente |
| **Command Snippets** | Reutilizable bits de comandos | Recordar flags y opciones | ⏳ Pendiente |
| **Runbooks** | Workflow en pasos (paso 1: pull, paso 2: build, etc) | Procedimientos documentados | ⏳ Pendiente |
| **Context Variables** | Reemplazar `$PROJECT`, `$USER`, etc en comandos | Personalizar scripts | ⏳ Pendiente |

### Import/Export

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **GitHub Stars Import** | Importar tus stars de GitHub → items | Migración fácil | ⏳ Pendiente |
| **CSV Import** | Importar items desde CSV | Bulk onboarding | ⏳ Pendiente |
| **Deck Export (JSON)** | Exportar deck como JSON | Backup, share format | ⏳ Pendiente |
| **Obsidian Export** | Exportar a Obsidian vault format | Integración con PKM | ⏳ Pendiente |

### Settings & Personalization

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Theme Settings** | Dark/light, accent colors, font size | Comodidad | ✅ Existe (partial) |
| **Hotkey Customization** | Personalizar hotkeys | Respetar preferencias | ⏳ Pendiente |
| **API Key Config** | Configurar OpenAI key o Ollama URL | Control de IA | ⏳ Pendiente |
| **Sync Preferences** | Qué decks syncar, frecuencia, etc | Control de datos | ⏳ Pendiente |
| **Privacy Mode** | Ningún dato a cloud (local only) | Para muy paranoicos | ⏳ Pendiente |

### Analytics (Optional)

| Feature | Descripción | Por qué | Estado |
|---------|-------------|--------|--------|
| **Most Used Items** | Mostrar items más buscados/accedidos | Saber qué vale la pena | ⏳ Pendiente |
| **Deck Stats** | Items por deck, tamaño, etc | Entender tu colección | ⏳ Pendiente |
| **Search Analytics** | Qué buscas, con qué frecuencia | Mejorar search | ⏳ Pendiente |

---

## 📊 Feature Matrix (Plataforma × Ola)

```
                Ola1    Ola2    Ola3    Ola4    Ola5
Capture         ✅      🔄      🔄      🔄      🔄
Organization    ✅      🔄      🔄      🔄      🔄
Search          ⏳      🔄      🔄      🔄      🔄
AI              ⏳      ✅      🔄      🔄      ✅
Collaboration   ⏳      ⏳      ✅      🔄      ⏳
Offline         🟡      🟡      🟡      ✅      ✅
Desktop         🟡      ✅      ✅      ✅      ✅
Assistant       ⏳      ⏳      ⏳      ⏳      ✅
```

Legend:
- ✅ = Existente/Completado
- 🔄 = Mejorando/En desarrollo
- 🟡 = Parcial
- ⏳ = Planeado para Ola

---

## 🚀 Quick Wins (Comienza inmediatamente)

1. **Filter by Type + Stack** (1-2 días)
   - Agregar filtros UI en lista de items
   - Backend: agregar query params

2. **Favorites System** (1-2 días)
   - Agregar columna `is_favorite` en items
   - UI: ⭐ button

3. **Search History** (2-3 días)
   - Guardar últimas 20 búsquedas
   - Mostrar en dropdown

4. **Copy Command Hotkey** (1 día)
   - Cuando hoveras comando, show "copy" button
   - Hotkey: cmd+C = copy automático

5. **Mobile Responsive** (2-3 días)
   - Mejoras en layout mobile
   - Toque-friendly modals

---

## 🔗 Relación con otros documentos

- **STRATEGIC_ROADMAP.md** — Integración de features por Ola
- **ROADMAP_WEB.md** — Qué features en web, cuándo
- **ROADMAP_DESKTOP.md** — Qué features en desktop, cuándo
- **UX_PATTERNS.md** — Cómo se implementan UI/UX
- **DATA_SCHEMA.md** — Schema para soportar features

---

**Owner**: tfurt  
**Última actualización**: 2026-04-29  
**Estado**: 🟢 Activo — Usado como referencia para priorización
