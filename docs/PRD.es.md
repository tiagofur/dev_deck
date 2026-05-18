# DevDeck — Product Requirements Document

> Versión: 1.0.0 (Stable) · Owner: tfurt · Última actualización: Mayo 2026
>
> **Estado:** Roadmap de 17 Olas **COMPLETADO**. v1.0 en producción.

---

## 0. Nombre y dominio

**DevDeck** es el nombre definitivo. "Deck" evoca una baraja personal de herramientas: organizada, extensible y curada por el propio developer.

**Dominio:** [devdeck.ai](https://devdeck.ai)

| Subdominio | Propósito |
|------------|-----------|
| `devdeck.ai` | Landing page + marketing + descargas |
| `app.devdeck.ai` | Web app (React 18 — comparte pages con desktop via monorepo) |
| `api.devdeck.ai` | Backend REST + sync engine |
| `docs.devdeck.ai` | Documentación |
| `download.devdeck.ai` | Descargas de la app desktop |

El `.ai` **no es decorativo**. DevDeck usa IA para clasificar, resumir, recuperar por intención y sugerir items relacionados — haciendo que todo lo que guardás sea **encontrable cuando lo necesitás**. Sin esas funciones, el dominio no estaría justificado.

---

## 1. Visión

> **DevDeck es tu memoria externa asistida por IA para el trabajo de desarrollo.**

Una app **offline-first, multi-usuario y multiplataforma** donde guardar, organizar y redescubrir todo lo útil que un dev encuentra: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agentes, prompts y workflows. Con IA que clasifica, resume y recupera por intención — no por tag exacto.

### Pilares del producto (v1.0.0)
1. **Items Polimórficos** — Vault universal para repos, CLIs, prompts, agentes, runbooks y notas.
2. **Agentes Autónomos** — Orquestación server-side con ejecución híbrida segura en el Desktop.
3. **Inteligencia Colectiva** — Descubrimiento de equipo, Hot Topics y analíticas de adopción organizacional.
4. **Resiliencia Total** — Offline-first real con SQLite/OPFS y sincronización multi-región global.
5. **Identidad Enterprise** — Soporte nativo para SAML 2.0, SCIM 2.0 y RBAC granular.

---

## 2. El Problema y la Solución

### El problema de fondo
> **El conocimiento útil para developers se pierde demasiado fácil y se recupera demasiado mal.**

### La solución DevDeck
DevDeck no solo guarda links; **contextualiza y ejecuta** el conocimiento. Mediante el enriquecimiento automático y la orquestación de agentes, transformamos una lista estática de herramientas en un sistema operativo de inteligencia activa.

---

## 3. Estado del Roadmap

### ✅ Olas 1–17 Completadas

DevDeck ha cumplido su ambicioso plan de desarrollo de 17 olas:
- **Cimientos (1-4):** API Core, Monorepo y paridad Web/Desktop.
- **Inteligencia (5-6):** Items polimórficos, embeddings y búsqueda semántica.
- **Colaboración (7-12):** Sync bidireccional, CRDTs, plugins y reputación social.
- **Escala (13-16):** Réplicas de lectura, SAML/SCIM, Insights de equipo y Agentes autónomos.
- **Lanzamiento (17):** Onboarding, Documentation y Versión 1.0 Estable.

---

## 4. Métricas de Éxito (v1.0.0)

- **Retención:** >80% de los usuarios capturan al menos 10 items por semana.
- **Eficiencia:** El tiempo de captura (Quick Capture) es < 3 segundos.
- **Automatización:** Los agentes de IA resuelven exitosamente el 70% de las consultas de Runbooks.
- **Adopción Team:** Reducción del 50% en la duplicación de herramientas dentro de las organizaciones registradas.

---

*Mission Accomplished: Mayo 2026 (v1.0.0 Stable)*
