# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in DevDeck, **please do not open a public issue**. Instead, send an email to:

**security@devdeck.ai**

(If that channel is not yet available, please send to `tiagofur@gmail.com` with the subject `[DevDeck Security]`.)

[Leer en español](SECURITY.es.md)

### What to Include
- Description of the issue.
- Affected component (backend API, desktop, web, extension, CLI).
- Steps to reproduce (as clear as possible).
- Estimated impact (what an attacker could achieve).
- Version / commit hash where the issue was found.
- Your name / handle for credit (optional).

### What to Expect
- Acknowledgment within **48 business hours**.
- Initial evaluation within **7 days**.
- Coordinated fix and disclosure when ready. We aim for a **30-day** window for critical issues.
- Public credit in the changelog / release notes (if desired).

## Scope

**In Scope:**
- Backend API (`backend/`)
- Official clients: desktop, web, extension, and CLI.
- Official Dockerfiles and Caddyfile.
- OAuth flow, JWT, refresh tokens.
- SQL injection, XSS, CSRF, SSRF, path traversal, auth bypass.
- Dependency vulnerabilities affecting the runtime.

**Out of Scope:**
- Vulnerabilities requiring physical access to the device.
- Resource DoS (e.g., sending 10k concurrent items). Rate limits and circuit breakers are on the roadmap.
- Self-hosted deployments with insecure configurations.
- Vulnerabilities in dependencies without an exploit vector in DevDeck.
- Spam, phishing, social engineering.

## Known Sensitive Areas
To guide researchers, these are areas where we are actively hardening the attack surface:

1. **SSRF in Open Graph Scraper** (`internal/enricher/generic.go`). There is a scheme whitelist, but IP range validation is in progress.
2. **GitHub Login Allowlist.** Authentication via `ALLOWED_GITHUB_LOGINS`. Bypassing this list is a critical finding.
3. **JWT Refresh Flow.** Revocation depends on database session deletion.
4. **Markdown Rendering.** `react-markdown` + `rehype-highlight` in Electron. Finding XSS via crafted markdown is a critical finding.

## Thank You
A secure product is built with the community's help. Thank you for taking the time to report issues responsibly.
