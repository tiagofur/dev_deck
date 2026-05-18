# DevDeck — Roadmap Técnico: Offline-first + Sync + Multi-usuario + IA (v1.0)

> Versión: 1.0.0 (Stable) · Última actualización: Mayo 2026

Este documento detalla la arquitectura implementada para las Olas 5 y 6.
Todas las fases técnicas descritas aquí se encuentran **COMPLETADAS** y en producción.

---

## 0. Contexto y premisas

### Estado Final v1.0
- ✅ Backend Go (Multi-Pool) + Postgres 16 (pgvector) + Réplicas de Lectura.
- ✅ IA: Agentes Autónomos con Tool Calling (OpenAI y Ollama).
- ✅ Sync: Motor bidireccional LWW + CRDTs para colaboración real-time.
- ✅ Offline-first: SQLite local persistente en Web y Desktop.
- ✅ Enterprise: SAML 2.0, SCIM 2.0 y RBAC granular.

### Principios técnicos implementados
1. **Offline-first real.** La app es 100% funcional sin red. La sync es eventual y atómica.
2. **Backwards compatibility.** Los repos existentes se migraron al modelo polimórfico sin pérdida de datos.
3. **IA como copiloto.** La IA propone (Tool Calling), el usuario aprueba (Human-in-the-loop).
4. **Multi-usuario & Enterprise.** Vaults aislados con soporte para identidades corporativas.
5. **Ownership de datos.** Exportación total de datos en formato JSON.

---

## 1. Ola 5 — Items generales + IA real (COMPLETO)

### 1.1 Modelo de datos polimórfico
Implementado mediante la tabla `items` (originalmente `repos`) con el campo `item_type`.

### 1.2 Módulo de IA (Agentes)
Soporte completo para OpenAI (GPT-4o) y Ollama local (llama3.1) con orquestación server-side y streaming vía SSE.

### 1.3 Búsqueda semántica
Implementada con `pgvector` y búsqueda híbrida (RRF) que combina trigramas y vectores.

---

## 2. Ola 6 — Offline-first + Sync + Multi-usuario (COMPLETO)

### 2.1 Arquitectura offline-first
Sincronización bidireccional atómica basada en SQLite local y colas de cambios idempotentes.

### 2.2 Sync Engine
Algoritmo Last-Write-Wins (LWW) por campo con soporte multi-dispositivo.

### 2.3 Multi-usuario y Decks compartibles
Sistema multi-tenant con perfiles públicos y vaults compartidos (Teams).

---

## 3. Estado de Ejecución Final

### ✅ Sprint 1 — Modelo extendido + Quick capture (Fase 17 — COMPLETO)
### ✅ Sprint 2 — Auto-tagging + Auto-summary (Fase 18 — COMPLETO)
### ✅ Sprint 3 — Búsqueda semántica (Fase 19 — COMPLETO)
### ✅ Sprint 4 — Items relacionados + Ask DevDeck (Fase 20 — COMPLETO)
### ✅ Sprint 5 — SQLite local + offline básico (Fase 21 — COMPLETO)
### ✅ Sprint 6 — Sync bidireccional + multi-device (Fase 22 — COMPLETO)
### ✅ Sprint 7 — Decks compartibles (Fase 23 — COMPLETO)
### ✅ Sprint 8 — Multi-usuario + Inteligencia de Equipo (Fase 24+ — COMPLETO)

---

*Misión técnica v1.0.0 cumplida. Roadmap finalizado.*
