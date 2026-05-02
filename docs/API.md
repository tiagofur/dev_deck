# DevDeck.ai API Specification

This document describes the REST API for **DevDeck.ai**.

[Leer en español](API.es.md)

---

## 1. Authentication
The API uses **JWT (JSON Web Tokens)** for authentication.

- **Header:** `Authorization: Bearer <access_token>`
- **Refresh Flow:** Handled via HttpOnly cookies (`refresh_token`).
- **CLI/Extension Auth:** Uses a static `API_KEY` passed in the `X-API-KEY` header.

---

## 2. Base URL
- **Production:** `https://api.devdeck.ai/v1`
- **Development:** `http://localhost:8080/v1`

---

## 3. Endpoints

### 3.1 Items
Manage repos, URLs, and snippets.

- `GET /items`: List items (paginated).
- `POST /items`: Create a new item (triggers auto-enrichment).
- `GET /items/:id`: Get item details.
- `PATCH /items/:id`: Update item (tags, notes, etc.).
- `DELETE /items/:id`: Delete item.
- `POST /items/:id/ai-enrich`: Manually trigger AI enrichment.

### 3.2 Cheatsheets
- `GET /cheatsheets`: List cheatsheets.
- `POST /cheatsheets`: Create a cheatsheet.
- `GET /cheatsheets/:id`: Get cheatsheet + entries.
- `PATCH /cheatsheets/:id`: Update cheatsheet.
- `POST /cheatsheets/:id/entries`: Add entry to cheatsheet.

### 3.3 Auth (Internal)
- `GET /auth/github/login`: Redirect to GitHub OAuth.
- `GET /auth/github/callback`: OAuth callback handler.
- `POST /auth/refresh`: Rotate access token.
- `POST /auth/logout`: Revoke session.

### 3.4 Search
- `GET /search?q=query`: Search items (hybrid: fuzzy + semantic).

---

## 4. Error Codes
The API returns standard HTTP status codes and a JSON error body:
```json
{
  "error": "Short error code",
  "message": "Human readable description",
  "code": 400
}
```

- `400 Bad Request`: Validation failed.
- `401 Unauthorized`: Missing or invalid token.
- `403 Forbidden`: User not in allowlist.
- `404 Not Found`: Resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Something went wrong.

---

## 5. Rate Limits
- **Authenticated:** 1000 requests / 5 minutes.
- **AI Endpoints:** 20 requests / 1 minute (to protect LLM costs).
