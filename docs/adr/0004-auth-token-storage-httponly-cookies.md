# ADR 0004 — Move web auth tokens out of `localStorage` into HttpOnly cookies

- Status: **Proposed** (design only — not yet implemented)
- Date: 2026-06-14
- Supersedes/relates: security follow-up flagged in the 0.6.0 hardening pass

## Context

Today the **web** client stores both the access token and the refresh token in
`localStorage`:

- `packages/api-client/src/auth/storage/localStorage.ts` keeps
  `devdeck_access_token` and `devdeck_refresh_token`.
- `packages/api-client/src/api-client.ts` reads the access token
  (`getBearerToken()`) and sends it as `Authorization: Bearer <jwt>`.
- The Go backend authenticates `/api` via the `TokenAuth` middleware reading
  that `Authorization: Bearer` header. Login (`POST /api/auth/login`) and the
  OAuth callback return the token pair to the client (JSON body / redirect
  params); `POST /api/auth/refresh` takes `{ refresh_token }` in the body and
  rotates it (refresh tokens are stored server-side as SHA-256 hashes,
  single-use).

**Problem:** anything in `localStorage` is readable by any JavaScript running
on the page. A single XSS bug (we just closed a stored-XSS in the README
viewer) therefore means **full session theft**, including the long-lived
refresh token. This is the highest-value remaining security item for the web
surface.

The **desktop** app already stores tokens in the OS keychain via Electron
`safeStorage` (not JS-readable) and the **extension** uses `chrome.storage`;
neither shares the web's `localStorage` exposure. So this change is
**web-specific** and must not break desktop/extension.

## Decision

Adopt a **hybrid token model on web** (recommended over full cookie auth):

1. **Access token** — short-lived, returned in the login/refresh **response
   body**, held **in memory only** (a JS variable, never `localStorage`). Sent
   as `Authorization: Bearer` exactly as today.
2. **Refresh token** — set by the backend as an **`HttpOnly; Secure;
   SameSite=Lax` cookie**, scoped to the refresh path (`Path=/api/auth`). Never
   readable by JS.

On page load the app performs a **silent refresh** (`POST /api/auth/refresh`
with `credentials: 'include'`, no body); the cookie authenticates it, the
backend rotates the refresh cookie and returns a fresh access token into
memory. Reloads no longer need a JS-readable persistent token.

### Why hybrid (not full cookie auth)

- **Smallest blast radius**: the access token stays header-based, so only the
  single `/api/auth/refresh` endpoint becomes cookie-based and needs CSRF
  handling. Every other `/api` endpoint is unchanged (still Bearer header).
- **Eliminates the actual risk**: no persistent, JS-readable token survives.
  An in-memory access token dies on reload and is short-lived; the refresh
  token is never exposed to JS. XSS can no longer steal a durable session.
- **Multi-surface friendly**: desktop/extension keep the body+Bearer flow.

Full cookie auth (access token also in a cookie, middleware reads it) would
push CSRF protection onto **every** mutating endpoint and complicate the
cross-origin extension — more surface, more risk, little extra benefit.

## Backend changes (Go)

Gate everything behind a config flag for safe rollout: `AUTH_COOKIE_MODE`
(default `false`).

- **Login / OAuth callback handlers** (`internal/http/handlers/auth.go`): when
  the request opts into cookie mode, additionally `Set-Cookie` the refresh
  token as `HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=<refresh
  TTL>`. Stop putting the refresh token in the OAuth **redirect URL** (it
  currently lands in browser history) — set the cookie on the callback's
  top-level navigation (SameSite=Lax permits this) and redirect clean.
- **`POST /api/auth/refresh`**: read the refresh token from the cookie
  **first**, falling back to the request body (so desktop/extension keep
  working). Rotate as today, `Set-Cookie` the new refresh token, return the new
  access token in the body.
- **`POST /api/auth/logout`**: also clear the cookie (`Set-Cookie` expired with
  the same attributes) in addition to deleting the server-side session.
- **CSRF**: the refresh endpoint becomes cookie-authenticated, so add a
  lightweight CSRF defense — `SameSite=Lax` already blocks cross-site POSTs in
  modern browsers; additionally verify the `Origin`/`Referer` matches an
  allowed origin on `/api/auth/refresh`. (No double-submit token needed because
  only this one endpoint is cookie-driven and it returns a short-lived token to
  the same origin.)
- **CORS** (`internal/http/router.go`): `AllowCredentials` is already `true`;
  ensure the origin list never contains `*` when credentials are on (add a
  startup guard — also noted in the backend audit).
- **Dev ergonomics**: `Secure` cookies don't flow over plain `http://`. Either
  develop over `https`/`localhost` (browsers treat `localhost` as secure) or
  drop `Secure` only when `cfg` indicates local/dev.

## Frontend changes (web)

- **`TokenStorage`**: add an **in-memory** access-token adapter for web; stop
  writing access/refresh to `localStorage`. (The `TokenStorage` abstraction
  already exists — `setTokenStorage()` — so this is an adapter swap in
  `apps/web/src/main.tsx`.)
- **`api-client.ts`**: the refresh call uses `credentials: 'include'` and sends
  no refresh body in cookie mode; on boot, attempt one silent refresh to
  re-hydrate the in-memory access token.
- **`isLoggedIn()`**: derive from in-memory token presence + the boot-refresh
  result instead of reading `localStorage`.
- **OAuth callback page**: no longer parse tokens from the URL in cookie mode
  (the cookie is already set); just trigger a silent refresh + navigate.

## Multi-surface impact

- **Desktop (Electron)**: unchanged — keeps `safeStorage` + body/Bearer refresh
  (not XSS-exposed). Cookie mode is requested only by the web client.
- **Extension**: keep `chrome.storage` + body/Bearer. Extension fetches are
  cross-origin to the API; cookie auth there would require `SameSite=None`
  (weaker) and host permissions — not worth it. The backend's cookie-first,
  body-fallback refresh supports this transparently.

## Rollout plan

1. **Backend, additive + flagged**: support cookie refresh (`AUTH_COOKIE_MODE`)
   while still accepting body refresh. Ship + verify nothing changes with the
   flag off.
2. **Web opt-in**: switch web to in-memory access + cookie refresh behind the
   same flag; QA the full login/reload/expiry/logout flow.
3. **Default on for web; stop persisting tokens in `localStorage`.**

## Risks & rollback

- **Cannot be verified in CI**: the e2e suite is desktop-only (token mode), so
  it will not exercise web cookie auth. This change **requires manual web QA**
  (login, reload→silent refresh, access-token expiry→refresh, logout, OAuth
  round-trip) across at least Chrome + Firefox + Safari before enabling by
  default. This is the main reason it is a separate, deliberately-staged effort.
- **Cookie attribute mistakes** are the classic failure mode: `Secure` over
  `http` dev, `SameSite=Strict` breaking the OAuth redirect, wrong `Path`.
  Mitigated by the flag and staged rollout.
- **Rollback**: turn `AUTH_COOKIE_MODE` off → clients fall back to the existing
  body/Bearer flow. No data migration involved (refresh tokens are already
  server-side hashes).

## Testing

- **Backend (CI-able)**: unit/integration tests for cookie set/rotate/clear,
  cookie-first vs body-fallback refresh, and the Origin check on
  `/api/auth/refresh`.
- **Web (manual)**: the QA matrix above. Optionally add a Playwright web e2e
  (new) that runs the real login→reload→logout flow against the live backend to
  make this CI-verifiable in the future.
