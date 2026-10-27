# Política de seguridad

## Reportar una vulnerabilidad

Si encontrás una vulnerabilidad de seguridad en HeapDeck, **por favor no abras un issue público**. Mandá un email a:

**security@heapdeck.com**

(Si no tenés ese canal todavía, mandá a `tiagofur@gmail.com` con subject `[HeapDeck Security]`.)

### Qué incluir

- Descripción del problema.
- Componente afectado (backend API, desktop, web, extension, CLI).
- Pasos de reproducción (lo más claros posible).
- Impacto estimado (qué puede hacer un atacante).
- Versión / commit hash donde lo encontraste.
- Tu nombre / handle para el crédito (opcional).

### Qué esperar

- Acuso de recibo en **48 horas hábiles**.
- Primera evaluación en **7 días**.
- Fix y disclosure coordinado cuando esté listo. Intentamos no pasar de **30 días** para críticas.
- Crédito público en el changelog / release notes (si lo querés).

## Scope

**Dentro de scope:**
- Backend API (`backend/`)
- Clientes oficiales: desktop, web, futura extensión y CLI.
- Dockerfiles y Caddyfile de deploy oficial.
- OAuth flow, JWT, refresh tokens.
- SQL injection, XSS, CSRF, SSRF, path traversal, auth bypass.
- Dependency vulnerabilities que afectan el runtime.

**Fuera de scope:**
- Vulnerabilidades que requieren acceso físico al device.
- DoS por recursos (ej: mandar 10k items concurrentes). Tenemos rate limits y circuit breakers en roadmap.
- Deployments self-hosted con config insegura (responsabilidad del operador).
- La beta hosteada en heapdeck.com como objetivo de ataque: probá contra tu propia instancia self-hosteada o un checkout local. No hagas probing, scraping ni load-testing contra el host de producción.
- Vulnerabilidades en dependencias sin vector de explotación en HeapDeck.
- Spam, phishing, social engineering.

## Áreas sensibles conocidas

Para orientar a researchers: estas son áreas donde sabemos que hay superficie de ataque y el estado actual de las mitigaciones:

1. **Scraper de Open Graph** (`internal/enricher/generic.go`): Protegido contra SSRF mediante validación de IPs prohibidas (CIDRs) en tiempo de dial (`ssrfSafeTransport`).
2. **Auth local y registro** (`internal/http/handlers/auth.go`): el registro soporta gating por invitación (`REQUIRE_INVITE`) y los endpoints de auth tienen rate limit por IP. Cualquier bypass del gate de invitaciones o credential stuffing es crítico.
3. **JWT refresh flow**: La revocación depende de la eliminación de sesiones en DB. Un refresh token robado activo post-logout es crítico.
4. **Markdown rendering**: Usamos `react-markdown` + `rehype-highlight`. Encontrar XSS vía markdown malicioso es crítico.
5. **Ejecución de Runbooks (Agentes)**: El modelo de confianza es híbrido (Fase 50). La IA propone comandos pero el cliente (Desktop) requiere **aprobación manual explícita**. Cualquier ejecución no supervisada es un hallazgo crítico.

## Gracias

Un producto seguro se construye con ayuda de la comunidad. Gracias por tomarte el tiempo de reportar responsablemente.
