# DevDeck.ai API Specification (v1.0)

This document describes the REST API for **DevDeck.ai**.

[Leer en español](API.es.md)

---

## 1. Authentication
The API uses **JWT (JSON Web Tokens)** for most operations and **API Keys** for programmatic access.

- **JWT Header:** `Authorization: Bearer <access_token>`
- **API Key Header:** `X-API-Key: devdeck_<token>`
- **SAML SSO:** Supported for enterprise organizations.
- **SCIM 2.0:** Supported for automatic user provisioning.

---

## 2. Base URL
- **Production:** `https://api.devdeck.ai`
- **Development:** `http://localhost:8080`

---

## 3. Endpoints

### 3.1 Polymorphic Items
Manage the core knowledge vault.

- `GET /api/items`: List all items with advanced filtering (stack, tags, type).
- `POST /api/items/capture`: Unified capture endpoint for URLs and text.
- `GET /api/items/:id`: Get detailed metadata and AI summary.
- `PATCH /api/items/:id`: Update tags, notes, or archive status.
- `DELETE /api/items/:id`: Permanent removal.
- `POST /api/items/:id/ai-enrich`: Trigger LLM classification and summarization.

### 3.2 AI Agents (Wave 16)
- `POST /api/agent/chat`: Interactive agent chat (Server-Sent Events).
- Supports multi-step orchestration and tool calling.

### 3.3 Organizations & Teams (Wave 15)
- `GET /api/orgs`: List user organizations.
- `POST /api/orgs`: Create a new team vault.
- `GET /api/orgs/:id/insights`: Aggregated adoption analytics (Admin only).
- `GET /api/orgs/:id/discovery/trending`: Team-wide trending tags (Hot Topics).
- `GET /api/orgs/:id/discovery/recommendations`: Smart tool suggestions from the team.

### 3.4 Identity & Enterprise (Wave 14)
- `GET /api/auth/me`: Current user profile and onboarding status.
- `PATCH /api/auth/me/onboarding/complete`: Mark product tour as finished.
- `GET /api/saml/metadata`: SP Metadata for identity providers.
- `POST /api/scim/v2/Users`: Standard SCIM provisioning endpoint.

### 3.5 Global Search
- `GET /api/search?q=query&mode=hybrid`: Unified search across items and cheatsheets.
- Modes: `text` (fuzzy), `vector` (semantic), `hybrid` (RRF merge).

---

## 4. Response Format

All responses are JSON envelopes:
```json
{
  "data": { ... },
  "meta": { "total": 100 }
}
```

Errors follow a predictable structure:
```json
{
  "error": {
    "code": "INVALID_ID",
    "message": "The provided ID must be a valid UUID"
  }
}
```

---

## 5. Rate Limits
- **Standard:** 2000 req/5m.
- **AI Agent:** 50 req/1h (Cloud Pro) | 5 req/1h (Free).
- **Public Feed:** 500 req/1m.

---

*Last updated: May 2026 (v1.0.0 Stable)*
