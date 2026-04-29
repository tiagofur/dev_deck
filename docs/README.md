---
tags:
  - devdeck
  - docs
  - obsidian
aliases:
  - DevDeck Docs
  - DevDeck Vault
status: active
date: 2026-04-29
updated: 2026-04-29
---

# 📚 DevDeck - Documentación Operativa

> [!abstract] Resumen
> Esta carpeta contiene toda la documentación operativa de DevDeck, organizada por área: Backend, Frontend, Arquitectura, Producto y Runbooks. El objetivo es tener una fuente única de verdad para decisiones técnicas, roadmap y procedimientos operativos.

---

## 🎯 Punto de entrada

- [[00_DASHBOARD|Dashboard Ejecutivo]] — 30 segundos overview del proyecto
- **[[STRATEGIC_ROADMAP|Strategic Roadmap (NEW)]]** — Visión integrada web + desktop, 5 Olas de desarrollo

---

## 🗺️ Roadmaps estratégicos (START HERE!)

**Para entender a dónde vamos DevDeck:**

1. **[[STRATEGIC_ROADMAP|Strategic Roadmap]]** — Integración web + desktop, 5 Olas (Ola 1 Foundation → Ola 5 AI Assistant)
2. **[[ROADMAP_WEB|Web Roadmap]]** — React 18, desde captura rápida → IA → colaboración
3. **[[ROADMAP_DESKTOP|Desktop Roadmap]]** — Tauri, desde MVP → hotkeys/launcher → offline con Ollama
4. **[[FEATURE_INVENTORY|Feature Inventory]]** — Catálogo de 50+ features planeadas, agrupadas por Ola

**Estrategia de producto:**
5. **[[AI_STRATEGY|AI Strategy]]** — Cómo la IA genera valor: auto-tagging, semantic search, discovery, Ask DevDeck
6. **[[UX_PATTERNS|UX Patterns]]** — Diseño consistente: componentes, flujos, accessibility, dark mode

---

## 📁 Navegación por área

- **[[Backend/Backend MOC|Backend]]** — Servicios, APIs, base de datos
- **[[Frontend/Frontend MOC|Frontend]]** — Apps, UI, cliente
- **[[Architecture/Arquitectura General|Arquitectura]]** — Diseño general del sistema
- **[[PRD/README|Producto (PRD)]]** — Visión, features, roadmap
- **[[Runbooks/README|Runbooks]]** — Procedimientos operativos
- **[[Release_Notes/README|Release Notes]]** — Historial de versiones

---

## 🗂️ Templates disponibles

Usá estos al crear nueva documentación:
- [[_templates/Template - Modulo|Módulo]]
- [[_templates/Template - ADR|ADR (decisión arquitectónica)]]
- [[_templates/Template - Runbook|Runbook (procedimiento operativo)]]

Ver [[_templates/README|todos los templates]].

---

## 📋 Fuentes canónicas de estado

- [[Backend/Estado Plataforma|Estado Backend]]
- [[Frontend/Estado Plataforma|Estado Frontend]]
- [[Architecture/ADR Index|Decisiones arquitectónicas (ADRs)]]

---

## 🏗️ Estructura de mantenimiento

1. **Cambios en arquitectura** → Crear/actualizar ADR en `Architecture/`
2. **Nueva feature** → Crear módulo en carpeta correspondiente + actualizar PRD
3. **Procedimiento repetible** → Crear Runbook en `Runbooks/`
4. **Estado del sistema** → Actualizar `Estado Plataforma` en cada área
5. **Dashboard desactualizado** → Actualizar `00_DASHBOARD.md`

---

## 📚 Documentación en el root

Los siguientes documentos aún están en el root y necesitan migración gradual:

**Documentación de producto:**
- [PRD.md](PRD.md) — Product Requirements Document completo
- [VISION.md](VISION.md) — Visión y posicionamiento
- [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) — Análisis competitivo

**Landing page:**
- [LANDING_COPY.md](LANDING_COPY.md) — Copy en inglés
- [LANDING.md](LANDING.md) — Copy en español

**Técnica:**
- [ARCHITECTURE.md](ARCHITECTURE.md) — Arquitectura del sistema
- [API.md](API.md) — Especificación API
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — Design System
- [TECHNICAL_ROADMAP_AI_OFFLINE.md](TECHNICAL_ROADMAP_AI_OFFLINE.md) — Roadmap técnico

**Referencias externas:**
- [../README.md](../README.md) — README principal del repositorio
- [../ROADMAP.md](../ROADMAP.md) — Roadmap de implementación

---

## 🔗 Cómo leer

1. **Nuevo en DevDeck?** → [[00_DASHBOARD|Dashboard]] → [[STRATEGIC_ROADMAP|Strategic Roadmap]] → [[PRD/README|PRD]]
2. **¿A dónde vamos?** → [[STRATEGIC_ROADMAP|Strategic Roadmap]] (5 Olas) → [[FEATURE_INVENTORY|Features]]
3. **Quiero implementar feature X** → [[FEATURE_INVENTORY|Inventory]] → encuentra en qué Ola → [[ROADMAP_WEB|Web]] o [[ROADMAP_DESKTOP|Desktop]]
4. **Diseño de feature Y** → [[UX_PATTERNS|UX Patterns]] (componentes, flujos, accessibility)
5. **¿Cómo la IA agrega valor?** → [[AI_STRATEGY|AI Strategy]] (tagging, search, discovery)
6. **Cambios técnicos?** → [[Architecture/ADR Index|ADRs]] → [[Architecture/Arquitectura General|Arquitectura]]
7. **Procedimiento?** → [[Runbooks/README|Runbooks]]
8. **Estado actual?** → [[Backend/Estado Plataforma|Backend]] · [[Frontend/Estado Plataforma|Frontend]]

---

*Última revisión: 2026-04-29 — Nueva documentación estratégica agregada (Strategic Roadmap, Feature Inventory, Roadmaps web/desktop, AI Strategy, UX Patterns)*
