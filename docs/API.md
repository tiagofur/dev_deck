# DevDeck — API Specification

> OpenAPI 3.1 · Versión: 0.2 · Base URL: `https://api.devdeck.tu-dominio.com`

**Auth modes:**
- **Ola 1–3 (`AUTH_MODE=token`):** todos los endpoints (excepto `/healthz`) requieren `Authorization: Bearer <API_TOKEN>` (token estático)
- **Ola 4+ (`AUTH_MODE=jwt`):** mismos endpoints requieren `Authorization: Bearer <JWT_ACCESS_TOKEN>`. Endpoints `/api/auth/*` son públicos.

**Marcadores de ola:** los paths con 🌊2/🌊3/🌊4 indican en qué ola se introducen.

---

```yaml
openapi: 3.1.0
info:
  title: DevDeck API
  version: 0.1.0
  description: Personal repository directory backend.

servers:
  - url: https://api.devdeck.tu-dominio.com
    description: Production
  - url: http://localhost:8080
    description: Local dev

security:
  - bearerAuth: []

paths:

  /healthz:
    get:
      summary: Health check
      security: []
      responses:
        '200':
          description: OK

  /api/repos:
    get:
      summary: List repos
      parameters:
        - in: query
          name: q
          schema: { type: string }
          description: Fuzzy search (name + description + tags)
        - in: query
          name: lang
          schema: { type: string }
        - in: query
          name: tag
          schema: { type: string }
        - in: query
          name: archived
          schema: { type: boolean, default: false }
        - in: query
          name: sort
          schema:
            type: string
            enum: [added_desc, added_asc, stars_desc, name_asc]
            default: added_desc
        - in: query
          name: limit
          schema: { type: integer, default: 100, maximum: 500 }
        - in: query
          name: offset
          schema: { type: integer, default: 0 }
      responses:
        '200':
          description: List of repos
          content:
            application/json:
              schema:
                type: object
                properties:
                  total:   { type: integer }
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/Repo' }

    post:
      summary: Add a repo by URL (auto-enriches metadata)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [url]
              properties:
                url:  { type: string, format: uri }
                tags:
                  type: array
                  items: { type: string }
                notes: { type: string }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Repo' }
        '409':
          description: Already exists
        '422':
          description: Could not resolve URL

  /api/repos/{id}:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }

    get:
      summary: Get repo by id
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Repo' }
        '404': { description: Not found }

    patch:
      summary: Update editable fields
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                notes:    { type: string }
                tags:
                  type: array
                  items: { type: string }
                archived: { type: boolean }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Repo' }

    delete:
      summary: Delete repo
      responses:
        '204': { description: Deleted }

  # ─────────────────────────────────────────
  # 🌊2 — Repo detail extras + Commands
  # ─────────────────────────────────────────

  /api/repos/{id}/readme:
    get:
      summary: 🌊2 Get rendered README content from source
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: README markdown
          content:
            application/json:
              schema:
                type: object
                properties:
                  format:  { type: string, enum: [markdown] }
                  content: { type: string }
                  fetched_at: { type: string, format: date-time }
        '404': { description: No README available }

  /api/repos/{id}/commands:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
    get:
      summary: 🌊2 List custom commands for a repo
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/RepoCommand' }
    post:
      summary: 🌊2 Add a custom command to a repo
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RepoCommandInput' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/RepoCommand' }

  /api/repos/{id}/commands/reorder:
    post:
      summary: 🌊2 Reorder commands of a repo (drag & drop)
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [order]
              properties:
                order:
                  type: array
                  items: { type: string, format: uuid }
      responses:
        '204': { description: Reordered }

  /api/repos/{id}/commands/{cmdId}:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
      - in: path
        name: cmdId
        required: true
        schema: { type: string, format: uuid }
    patch:
      summary: 🌊2 Update a command
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RepoCommandInput' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/RepoCommand' }
    delete:
      summary: 🌊2 Delete a command
      responses:
        '204': { description: Deleted }

  /api/repos/{id}/cheatsheets:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
    get:
      summary: 🌊2 List cheatsheets linked to this repo
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Cheatsheet' }
    post:
      summary: 🌊2 Link a cheatsheet to this repo
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [cheatsheet_id]
              properties:
                cheatsheet_id: { type: string, format: uuid }
      responses:
        '204': { description: Linked }
    delete:
      summary: 🌊2 Unlink a cheatsheet from this repo
      parameters:
        - in: query
          name: cheatsheet_id
          required: true
          schema: { type: string, format: uuid }
      responses:
        '204': { description: Unlinked }

  # ─────────────────────────────────────────
  # 🌊3 — Cheatsheets
  # ─────────────────────────────────────────

  /api/cheatsheets:
    get:
      summary: 🌊3 List cheatsheets
      parameters:
        - in: query
          name: q
          schema: { type: string }
        - in: query
          name: category
          schema: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Cheatsheet' }
    post:
      summary: 🌊3 Create a cheatsheet
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CheatsheetInput' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Cheatsheet' }

  /api/cheatsheets/{id}:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
    get:
      summary: 🌊3 Get cheatsheet detail (with entries)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Cheatsheet'
                  - type: object
                    properties:
                      entries:
                        type: array
                        items: { $ref: '#/components/schemas/CheatsheetEntry' }
    patch:
      summary: 🌊3 Update cheatsheet
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CheatsheetInput' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Cheatsheet' }
    delete:
      summary: 🌊3 Delete cheatsheet (cascades entries)
      responses:
        '204': { description: Deleted }

  /api/cheatsheets/{id}/entries:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
    post:
      summary: 🌊3 Add entry to cheatsheet
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CheatsheetEntryInput' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CheatsheetEntry' }

  /api/cheatsheets/{id}/entries/{entryId}:
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
      - in: path
        name: entryId
        required: true
        schema: { type: string, format: uuid }
    patch:
      summary: 🌊3 Update entry
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CheatsheetEntryInput' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CheatsheetEntry' }
    delete:
      summary: 🌊3 Delete entry
      responses:
        '204': { description: Deleted }

  /api/search:
    get:
      summary: 🌊3 Global search across repos + commands + cheatsheet entries
      parameters:
        - in: query
          name: q
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  repos:              { type: array, items: { $ref: '#/components/schemas/Repo' } }
                  repo_commands:      { type: array, items: { $ref: '#/components/schemas/RepoCommand' } }
                  cheatsheet_entries: { type: array, items: { $ref: '#/components/schemas/CheatsheetEntry' } }

  # ─────────────────────────────────────────
  # 🌊4 — Auth (GitHub OAuth + JWT)
  # ─────────────────────────────────────────

  /api/auth/github/login:
    get:
      summary: 🌊4 Start GitHub OAuth flow
      security: []
      responses:
        '302':
          description: Redirect to github.com/login/oauth/authorize

  /api/auth/github/callback:
    get:
      summary: 🌊4 OAuth callback — validates code, checks allowlist, emits JWT pair
      security: []
      parameters:
        - in: query
          name: code
          required: true
          schema: { type: string }
        - in: query
          name: state
          required: true
          schema: { type: string }
      responses:
        '302':
          description: Redirect back to client (web) or deeplink (electron) with tokens
        '403':
          description: GitHub login not in allowlist

  /api/auth/refresh:
    post:
      summary: 🌊4 Exchange a refresh token for a new access token
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refresh_token]
              properties:
                refresh_token: { type: string }
      responses:
        '200':
          description: New token pair
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenPair' }
        '401': { description: Invalid or expired refresh token }

  /api/auth/logout:
    post:
      summary: 🌊4 Revoke the current session
      responses:
        '204': { description: Logged out }

  /api/auth/me:
    get:
      summary: 🌊4 Get current authenticated user
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }

  /api/repos/{id}/refresh:
    post:
      summary: Re-fetch metadata from source
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Refreshed
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Repo' }

  /api/repos/{id}/seen:
    post:
      summary: Mark repo as seen (updates last_seen_at) — used by discovery
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string, format: uuid }
      responses:
        '204': { description: OK }

  /api/discovery/next:
    get:
      summary: Get next repo to surface in discovery mode
      description: |
        Returns a repo not seen recently. Strategy: prioritize repos with
        oldest `last_seen_at` (or never seen), excluding archived.
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Repo' }
        '204':
          description: Nothing to discover

  /api/stats:
    get:
      summary: App stats (drives mascot mood)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  total_repos:        { type: integer }
                  total_archived:     { type: integer }
                  top_language:       { type: string,  nullable: true }
                  top_language_share: { type: number }
                  last_added_at:      { type: string, format: date-time, nullable: true }
                  last_open_at:       { type: string, format: date-time, nullable: true }
                  streak_days:        { type: integer }
                  mascot_mood:
                    type: string
                    enum: [idle, happy, sleeping, judging, celebrating]

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer

  schemas:
    Repo:
      type: object
      required: [id, url, source, name, added_at]
      properties:
        id:              { type: string, format: uuid }
        url:             { type: string, format: uri }
        source:
          type: string
          enum: [github, generic]
        owner:           { type: string, nullable: true }
        name:            { type: string }
        description:     { type: string, nullable: true }
        language:        { type: string, nullable: true }
        language_color:  { type: string, nullable: true }
        stars:           { type: integer }
        forks:           { type: integer }
        avatar_url:      { type: string, nullable: true }
        og_image_url:    { type: string, nullable: true }
        homepage:        { type: string, nullable: true }
        topics:
          type: array
          items: { type: string }
        notes:           { type: string }
        tags:
          type: array
          items: { type: string }
        archived:        { type: boolean }
        added_at:        { type: string, format: date-time }
        last_fetched_at: { type: string, format: date-time, nullable: true }
        last_seen_at:    { type: string, format: date-time, nullable: true }

    # ─── 🌊2 ───
    RepoCommand:
      type: object
      required: [id, repo_id, label, command, position]
      properties:
        id:          { type: string, format: uuid }
        repo_id:     { type: string, format: uuid }
        label:       { type: string }
        command:     { type: string }
        description: { type: string }
        category:
          type: string
          nullable: true
          enum: [install, dev, test, build, deploy, lint, db, other, null]
        position:    { type: integer }
        created_at:  { type: string, format: date-time }

    RepoCommandInput:
      type: object
      required: [label, command]
      properties:
        label:       { type: string, maxLength: 80 }
        command:     { type: string, maxLength: 500 }
        description: { type: string, maxLength: 500 }
        category:    { type: string, nullable: true }

    # ─── 🌊3 ───
    Cheatsheet:
      type: object
      required: [id, slug, title, category]
      properties:
        id:          { type: string, format: uuid }
        slug:        { type: string }
        title:       { type: string }
        category:
          type: string
          enum: [vcs, os, language, framework, tool, package-manager, editor, shell, cloud, other]
        icon:        { type: string, nullable: true }
        color:       { type: string, nullable: true }
        description: { type: string }
        is_seed:     { type: boolean }
        created_at:  { type: string, format: date-time }
        updated_at:  { type: string, format: date-time }

    CheatsheetInput:
      type: object
      required: [slug, title, category]
      properties:
        slug:        { type: string, pattern: '^[a-z0-9-]+$' }
        title:       { type: string }
        category:    { type: string }
        icon:        { type: string }
        color:       { type: string }
        description: { type: string }

    CheatsheetEntry:
      type: object
      required: [id, cheatsheet_id, label, command, position]
      properties:
        id:            { type: string, format: uuid }
        cheatsheet_id: { type: string, format: uuid }
        label:         { type: string }
        command:       { type: string }
        description:   { type: string }
        tags:
          type: array
          items: { type: string }
        position:      { type: integer }

    CheatsheetEntryInput:
      type: object
      required: [label, command]
      properties:
        label:       { type: string }
        command:     { type: string }
        description: { type: string }
        tags:
          type: array
          items: { type: string }

    # ─── 🌊4 ───
    User:
      type: object
      properties:
        id:           { type: string, format: uuid }
        github_id:    { type: integer }
        github_login: { type: string }
        avatar_url:   { type: string, nullable: true }
        email:        { type: string, nullable: true }
        last_login_at:{ type: string, format: date-time, nullable: true }

    TokenPair:
      type: object
      required: [access_token, refresh_token, expires_in]
      properties:
        access_token:  { type: string }
        refresh_token: { type: string }
        token_type:    { type: string, enum: [Bearer] }
        expires_in:    { type: integer, description: seconds until access_token expires }
```

---

## Errores

Formato uniforme:
```json
{
  "error": {
    "code": "REPO_ALREADY_EXISTS",
    "message": "This URL is already in your vault.",
    "details": { "existing_id": "..." }
  }
}
```

Códigos definidos:
- `UNAUTHORIZED` (401)
- `FORBIDDEN_NOT_IN_ALLOWLIST` (403) — 🌊4
- `REPO_NOT_FOUND` (404)
- `COMMAND_NOT_FOUND` (404) — 🌊2
- `CHEATSHEET_NOT_FOUND` (404) — 🌊3
- `REPO_ALREADY_EXISTS` (409)
- `CHEATSHEET_SLUG_TAKEN` (409) — 🌊3
- `INVALID_URL` (422)
- `ENRICH_FAILED` (422)
- `INVALID_OAUTH_STATE` (400) — 🌊4
- `INTERNAL` (500)
