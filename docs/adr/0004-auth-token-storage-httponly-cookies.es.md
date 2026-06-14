# ADR 0004 — Sacar los tokens de auth web de `localStorage` a cookies HttpOnly

- Estado: **Propuesto** (solo diseño — todavía no implementado)
- Fecha: 2026-06-14
- Relacionado: follow-up de seguridad señalado en el pase de hardening 0.6.0

## Contexto

Hoy el cliente **web** guarda el access token y el refresh token en
`localStorage`:

- `packages/api-client/src/auth/storage/localStorage.ts` guarda
  `devdeck_access_token` y `devdeck_refresh_token`.
- `packages/api-client/src/api-client.ts` lee el access token
  (`getBearerToken()`) y lo manda como `Authorization: Bearer <jwt>`.
- El backend Go autentica `/api` con el middleware `TokenAuth` leyendo ese
  header. El login (`POST /api/auth/login`) y el callback de OAuth devuelven el
  par de tokens al cliente (body JSON / params del redirect); `POST
  /api/auth/refresh` recibe `{ refresh_token }` en el body y lo rota (los
  refresh tokens se guardan server-side como hashes SHA-256, de un solo uso).

**Problema:** todo lo que está en `localStorage` es legible por cualquier
JavaScript de la página. Un solo XSS (acabamos de cerrar uno almacenado en el
visor de README) = **robo total de la sesión**, incluido el refresh token de
larga vida. Es el ítem de seguridad pendiente de mayor valor para la web.

El **desktop** ya guarda los tokens en el keychain del SO vía Electron
`safeStorage` (no legible por JS) y la **extensión** usa `chrome.storage`;
ninguno comparte la exposición de `localStorage` de la web. Por eso este cambio
es **específico de web** y no debe romper desktop/extensión.

## Decisión

Adoptar un **modelo híbrido de tokens en web** (recomendado por sobre auth
totalmente por cookies):

1. **Access token** — corto, devuelto en el **body** de login/refresh, mantenido
   **solo en memoria** (variable JS, nunca `localStorage`). Se envía como
   `Authorization: Bearer` igual que hoy.
2. **Refresh token** — seteado por el backend como cookie **`HttpOnly; Secure;
   SameSite=Lax`**, con scope al path de refresh (`Path=/api/auth`). Nunca
   legible por JS.

Al cargar la página se hace un **refresh silencioso** (`POST /api/auth/refresh`
con `credentials: 'include'`, sin body); la cookie lo autentica, el backend rota
la cookie de refresh y devuelve un access token nuevo a memoria. Los reloads ya
no necesitan un token persistente legible por JS.

### Por qué híbrido (no cookies para todo)

- **Mínimo radio de impacto**: el access token sigue por header, así que solo el
  endpoint `/api/auth/refresh` pasa a basarse en cookie y necesita manejo de
  CSRF. Todos los demás endpoints `/api` quedan iguales (Bearer header).
- **Elimina el riesgo real**: no sobrevive ningún token persistente legible por
  JS. El access en memoria muere en el reload y es corto; el refresh nunca se
  expone a JS. Un XSS ya no puede robar una sesión durable.
- **Multi-superficie**: desktop/extensión mantienen el flujo body+Bearer.

Auth totalmente por cookies (access también en cookie, leído por el middleware)
empujaría la protección CSRF a **todos** los endpoints mutadores y complicaría
la extensión cross-origin — más superficie, más riesgo, poco beneficio extra.

## Cambios en el backend (Go)

Todo detrás de un flag para rollout seguro: `AUTH_COOKIE_MODE` (default
`false`).

- **Handlers de login / callback OAuth** (`internal/http/handlers/auth.go`): en
  modo cookie, además `Set-Cookie` del refresh como `HttpOnly; Secure;
  SameSite=Lax; Path=/api/auth; Max-Age=<TTL refresh>`. Dejar de poner el
  refresh en la **URL de redirect** de OAuth (hoy queda en el historial) — setear
  la cookie en la navegación top-level del callback (SameSite=Lax lo permite) y
  redirigir limpio.
- **`POST /api/auth/refresh`**: leer el refresh de la cookie **primero**, con
  fallback al body (para que desktop/extensión sigan funcionando). Rotar como
  hoy, `Set-Cookie` del nuevo refresh, devolver el nuevo access en el body.
- **`POST /api/auth/logout`**: además limpiar la cookie (`Set-Cookie` expirada
  con los mismos atributos) y borrar la sesión server-side.
- **CSRF**: el endpoint de refresh pasa a autenticarse por cookie, así que sumar
  una defensa CSRF liviana — `SameSite=Lax` ya bloquea POST cross-site en
  navegadores modernos; además verificar que `Origin`/`Referer` coincida con un
  origen permitido en `/api/auth/refresh`. (No hace falta double-submit token
  porque solo ese endpoint usa cookie y devuelve un token corto al mismo
  origen.)
- **CORS** (`internal/http/router.go`): `AllowCredentials` ya es `true`;
  asegurar que la lista de orígenes nunca contenga `*` con credenciales activas
  (guard al arranque — también notado en la auditoría del backend).
- **Dev**: las cookies `Secure` no viajan por `http://` plano. Desarrollar sobre
  `https`/`localhost` (los navegadores tratan `localhost` como seguro) o quitar
  `Secure` solo cuando la config indique local/dev.

## Cambios en el frontend (web)

- **`TokenStorage`**: agregar un adapter de access token **en memoria** para web;
  dejar de escribir access/refresh en `localStorage`. (La abstracción
  `TokenStorage` ya existe — `setTokenStorage()` — así que es un swap de adapter
  en `apps/web/src/main.tsx`.)
- **`api-client.ts`**: el refresh usa `credentials: 'include'` y no manda body de
  refresh en modo cookie; al arrancar, intentar un refresh silencioso para
  re-hidratar el access en memoria.
- **`isLoggedIn()`**: derivar de la presencia del token en memoria + el
  resultado del refresh de arranque, en vez de leer `localStorage`.
- **Página de callback OAuth**: ya no parsear tokens de la URL en modo cookie (la
  cookie ya está seteada); solo disparar refresh silencioso + navegar.

## Impacto multi-superficie

- **Desktop (Electron)**: sin cambios — mantiene `safeStorage` + refresh
  body/Bearer (no expuesto a XSS). El modo cookie solo lo pide el cliente web.
- **Extensión**: mantiene `chrome.storage` + body/Bearer. Sus fetches son
  cross-origin a la API; cookies ahí requerirían `SameSite=None` (más débil) y
  permisos de host — no vale la pena. El refresh cookie-primero/body-fallback del
  backend lo soporta de forma transparente.

## Plan de rollout

1. **Backend, aditivo + con flag**: soportar refresh por cookie
   (`AUTH_COOKIE_MODE`) sin dejar de aceptar refresh por body. Mergear y
   verificar que con el flag apagado nada cambia.
2. **Web opt-in**: pasar web a access en memoria + refresh por cookie bajo el
   mismo flag; QA del flujo completo login/reload/expiración/logout.
3. **Default on para web; dejar de persistir tokens en `localStorage`.**

## Riesgos y rollback

- **No verificable en CI**: la suite e2e es solo de desktop (modo token), así que
  no ejercita el auth por cookies de web. Este cambio **requiere QA manual de
  web** (login, reload→refresh silencioso, expiración del access→refresh, logout,
  ida y vuelta de OAuth) en al menos Chrome + Firefox + Safari antes de activarlo
  por default. Es la razón principal para tratarlo como un esfuerzo aparte y por
  etapas.
- **Errores en los atributos de cookie** son el modo de fallo clásico: `Secure`
  sobre `http` dev, `SameSite=Strict` rompiendo el redirect de OAuth, `Path`
  equivocado. Mitigado por el flag y el rollout por etapas.
- **Rollback**: apagar `AUTH_COOKIE_MODE` → los clientes vuelven al flujo
  body/Bearer actual. Sin migración de datos (los refresh ya son hashes
  server-side).

## Testing

- **Backend (CI-able)**: tests unitarios/integración de set/rotate/clear de
  cookie, refresh cookie-primero vs body-fallback, y el chequeo de Origin en
  `/api/auth/refresh`.
- **Web (manual)**: la matriz de QA de arriba. Opcional: agregar un e2e web
  (nuevo) con Playwright que corra el flujo real login→reload→logout contra el
  backend vivo para hacerlo verificable en CI a futuro.
