# Especificación de la API de DevDeck.ai (v0.5 beta)

Este documento describe la API REST de **DevDeck.ai**.

[Read in English](API.md)

---

## 1. Autenticación
La API utiliza **JWT (JSON Web Tokens)** para la mayoría de las operaciones y **API Keys** para acceso programático.

- **Header JWT:** `Authorization: Bearer <access_token>`
- **Header API Key:** `X-API-Key: devdeck_<token>`
- **SAML SSO:** Soportado para organizaciones enterprise.
- **SCIM 2.0:** Soportado para aprovisionamiento automático de usuarios.

---

## 2. URL Base
- **Producción:** `https://api.devdeck.ai`
- **Desarrollo:** `http://localhost:8080`

---

## 3. Endpoints

### 3.1 Items Polimórficos
Gestión del vault de conocimiento central.

- `GET /api/items`: Listar todos los items con filtrado avanzado (stack, tags, tipo).
- `POST /api/items/capture`: Endpoint unificado de captura para URLs y texto.
- `GET /api/items/:id`: Obtener metadata detallada y resumen de IA.
- `PATCH /api/items/:id`: Actualizar tags, notas o estado de archivado.
- `DELETE /api/items/:id`: Eliminación permanente.
- `POST /api/items/:id/ai-enrich`: Disparar clasificación y resumen vía LLM.

### 3.2 Agentes de IA (Ola 16)
- `POST /api/agent/chat`: Chat interactivo con el agente (Server-Sent Events).
- Soporta orquestación multi-paso y ejecución de herramientas (Tool Calling).

### 3.3 Organizaciones y Equipos (Ola 15)
- `GET /api/orgs`: Listar organizaciones del usuario.
- `POST /api/orgs`: Crear un nuevo vault de equipo.
- `GET /api/orgs/:id/insights`: Analíticas de adopción agregadas (Solo Admin).
- `GET /api/orgs/:id/discovery/trending`: Tags tendencia en el equipo (Hot Topics).
- `GET /api/orgs/:id/discovery/recommendations`: Sugerencias inteligentes del equipo.

### 3.4 Identidad y Enterprise (Ola 14)
- `GET /api/auth/me`: Perfil del usuario actual y estado de onboarding.
- `PATCH /api/auth/me/onboarding/complete`: Marcar tour de producto como terminado.
- `GET /api/saml/metadata`: Metadata de SP para proveedores de identidad.
- `POST /api/scim/v2/Users`: Endpoint estándar de aprovisionamiento SCIM.

### 3.5 Búsqueda Global
- `GET /api/search?q=query&mode=hybrid`: Búsqueda unificada en items y cheatsheets.
- Modos: `text` (fuzzy), `vector` (semántica), `hybrid` (fusión RRF).

---

## 4. Formato de Respuesta

Todas las respuestas son sobres JSON:
```json
{
  "data": { ... },
  "meta": { "total": 100 }
}
```

Los errores siguen una estructura predecible:
```json
{
  "error": {
    "code": "INVALID_ID",
    "message": "El ID proporcionado debe ser un UUID válido"
  }
}
```

---

## 5. Rate Limits
- **Estándar:** 2000 req/5m.
- **Agente de IA:** 50 req/1h (Cloud Pro) | 5 req/1h (Gratis).
- **Feed Público:** 500 req/1m.

---

*Última actualización: Mayo 2026 (v1.0.0 Estable)*
