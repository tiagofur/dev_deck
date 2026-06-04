# DevDeck.ai API Specification (0.5.0 Public Beta)

This document describes the REST API for **DevDeck.ai**.

[Leer en español](API.es.md)

---

## 1. Authentication
The API uses **JWT (JSON Web Tokens)** for most operations and **API Keys** for programmatic access.

- **JWT Header:** `Authorization: Bearer <access_token>`
- **API Key Header:** `X-API-Key: devdeck_<token>`

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

### 3.2 Identity
- `GET /api/auth/me`: Current user profile and onboarding status.
- `PATCH /api/auth/me/onboarding/complete`: Mark product tour as finished.

### 3.3 Global Search
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

---

*Last updated: June 2026 (0.5.0 Public Beta)*
