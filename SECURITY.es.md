# Política de seguridad

## Reportar una vulnerabilidad

Si encontrás una vulnerabilidad de seguridad en DevDeck, **por favor no abras un issue público**. Mandá un email a:

**security@devdeck.ai**

(Si no tenés ese canal todavía, mandá a `tiagofur@gmail.com` con subject `[DevDeck Security]`.)

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
- Vulnerabilidades en dependencias sin vector de explotación en DevDeck.
- Spam, phishing, social engineering.

## Áreas sensibles conocidas

Para orientar a researchers: estas son áreas donde sabemos que hay superficie de ataque y estamos trabajando:

1. **SSRF en scraper de Open Graph** (`internal/enricher/generic.go`). Hay whitelist de esquemas, pero la validación de rangos IP privados está en roadmap. Si encontrás un bypass, reportalo.

2. **Allowlist de GitHub logins.** Autenticación vía `ALLOWED_GITHUB_LOGINS`. Si encontrás forma de pasarlo sin estar en la lista, es crítico.

3. **JWT refresh flow.** Revocación post-logout depende de borrar la sesión en DB. Si un refresh token robado puede seguir generando access tokens después de logout, es crítico.

4. **Markdown rendering.** `react-markdown` + `rehype-highlight` en Electron. Si encontrás XSS vía markdown crafted, es crítico.

5. **Runbooks ejecutables** (Ola 5+, aún no implementado). Cuando exista, el modelo de confianza va a ser: solo ejecuta local, con confirm por paso, nunca ejecuta comandos recibidos del server. Romper eso es crítico.

## Gracias

Un producto seguro se construye con ayuda de la comunidad. Gracias por tomarte el tiempo de reportar responsablemente.
