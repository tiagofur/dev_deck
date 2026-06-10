# DevDeck — Product Requirements Document

> Versión: 1.1 · Owner: tfurt · Última actualización: Mayo 2026
>
> Estado: producto open-source en evolución.

---

## 0. Nombre y dominio

**DevDeck** es una baraja personal de herramientas, comandos y conocimiento de desarrollo: organizada, extensible y curada por el propio developer.

**Dominio:** [devdeck.ai](https://devdeck.ai)

| Subdominio | Propósito |
|------------|-----------|
| `devdeck.ai` | Landing page + marketing + descargas |
| `app.devdeck.ai` | Web app |
| `api.devdeck.ai` | Backend REST + sync |
| `docs.devdeck.ai` | Documentación |
| `download.devdeck.ai` | Descargas de la app desktop |

El `.ai` no debe ser decorativo. La IA en DevDeck existe para clasificar, resumir, enriquecer, recuperar por intención y sugerir relaciones útiles dentro del vault.

---

## 1. Visión

> **DevDeck es tu memoria externa asistida por IA para el trabajo de desarrollo.**

DevDeck ayuda a guardar, organizar, recuperar y reutilizar todo lo útil que un developer encuentra o construye: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agentes, prompts, requests, runbooks y workflows.

El **Developer Workbench** ya materializó esta dirección (ver estado por fase en [DEV_WORKBENCH.es.md](DEV_WORKBENCH.es.md)):

> Guardás conocimiento útil, lo encontrás cuando importa y lo convertís en acciones reutilizables.

El paso actual de producto es la preparación para el lanzamiento: primera experiencia, documentación honesta y Circles como memoria comunitaria (ver el [ROADMAP](../ROADMAP.es.md)).

---

## 2. Problema

El conocimiento útil para developers se pierde demasiado fácil y se recupera demasiado mal.

Casos típicos:

- Un repo con estrella que después no recordás cómo se llamaba.
- Un comando que funcionó una vez y quedó enterrado en el historial.
- Un snippet copiado desde un tutorial que nunca llegó a una librería interna.
- Un request API probado a mano y perdido al día siguiente.
- Un prompt o agente que funcionó bien, pero quedó en un chat.

El problema no es falta de herramientas. El problema es reconstruir contexto una y otra vez.

---

## 3. Solución

DevDeck combina tres capas:

1. **Vault polimórfico:** items específicos para trabajo dev.
2. **Recuperación inteligente:** búsqueda textual, fuzzy y semántica.
3. **Acciones reutilizables:** comandos, snippets, requests, runbooks y utilities locales conectadas al vault.

La frontera de producto:

- DevDeck no reemplaza IDEs, launchers, clientes API o gestores de secretos.
- DevDeck guarda el contexto que hace que esas acciones sean reutilizables.
- Cuando una utility integrada no gana valor por estar conectada al vault, probablemente no pertenece al core.

---

## 4. Pilares

| Pilar | Descripción |
|-------|-------------|
| **Developer-first** | Tipos, metadata y flujos pensados para desarrollo, no bookmarks genéricos. |
| **Low-friction capture** | Guardar desde web, desktop, CLI, extensión o paste debe tomar segundos. |
| **AI-assisted memory** | IA para clasificar, resumir y recuperar; no IA decorativa. |
| **Local-first trust** | Funciones útiles offline y control claro de datos sensibles. |
| **Reusable actions** | Cada comando, request, snippet o runbook debe poder volver a usarse sin reconstruir contexto. |
| **Open-source pragmático** | Fácil de probar, self-hostear y contribuir por partes pequeñas. |

---

## 5. Alcance funcional

### Core actual / base esperada

- Items polimórficos.
- Cheatsheets y comandos.
- Captura desde CLI/extensión/app.
- Enriquecimiento automático.
- Búsqueda textual y semántica.
- Desktop, web y CLI.
- Self-hosting.

### Próximo alcance: Developer Workbench

- Utilities locales: JSON, JWT, Base64, URL encode, UUID, timestamps, hashes.
- Guardar outputs como snippets/notas.
- Paleta interna para buscar, abrir tools, copiar comandos y crear items.
- Quick API Tester ligero con requests guardables.
- Contexto por proyecto desde Desktop/CLI.

### Fuera de alcance por ahora

- Reemplazar Postman/Insomnia.
- Reemplazar Raycast/Alfred como launcher del sistema.
- Implementar un gestor de secretos propio.
- Clipboard history global por defecto.
- OCR/IA visual como feature core inicial.

---

## 6. Métricas de éxito

- **Captura:** guardar un item útil en menos de 3 segundos.
- **Reutilización:** encontrar y copiar/abrir/ejecutar una acción guardada en menos de 10 segundos.
- **Retención:** usuarios que capturan y reutilizan items cada semana.
- **Search success:** búsquedas que terminan en una acción concreta.
- **Trust:** porcentaje de utilities locales usadas sin red.
- **Contribución:** issues pequeñas resueltas por contributors externos.

---

## 7. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Scope creep | Cada feature debe demostrar conexión clara con el vault. |
| Prometer demasiado | Documentar fases y estado real de implementación. |
| Privacidad | Features sensibles siempre opt-in, locales y con apagado visible. |
| Seguridad de secretos | Usar keychains/gestores existentes; no inventar criptografía propia. |
| Comunidad lenta | Crear demos, issues pequeñas y docs de contribución accionables. |

---

## 8. Documentos relacionados

- [VISION.es.md](VISION.es.md)
- [DEV_WORKBENCH.es.md](DEV_WORKBENCH.es.md)
- [COMPETITIVE_ANALYSIS.es.md](COMPETITIVE_ANALYSIS.es.md)
- [TECHNICAL_ROADMAP_AI_OFFLINE.es.md](TECHNICAL_ROADMAP_AI_OFFLINE.es.md)
