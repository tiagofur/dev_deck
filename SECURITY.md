# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in DevDeck, **please do not open a public issue**. Send an email to:

**security@devdeck.ai**

(If that channel is not yet available, please send it to `tiagofur@gmail.com` with the subject `[DevDeck Security]`.)

### What to include

- A clear description of the problem.
- The affected component (Backend API, Desktop, Web, Extension, CLI).
- Reproduction steps (as clear as possible).
- Estimated impact (what an attacker could achieve).
- Version or commit hash where the vulnerability was found.
- Your name/handle for credit (optional).

### What to expect

- Acknowledgement of receipt within **48 business hours**.
- Initial assessment within **7 days**.
- A fix and coordinated disclosure once ready. We aim for a maximum of **30 days** for critical issues.
- Public credit in the changelog/release notes (if desired).

---

## Scope

**In-scope:**
- Backend API (`backend/`).
- Official clients: Desktop, Web, future Extension, and CLI.
- Official Dockerfiles and Caddyfile deployment configurations.
- OAuth flow, JWT handling, and refresh token rotation.
- SQL injection, XSS, CSRF, SSRF, path traversal, and auth bypass.
- Dependency vulnerabilities affecting the runtime.

**Out-of-scope:**
- Vulnerabilities requiring physical access to the device.
- Resource-based DoS (e.g., sending 10k concurrent items). Rate limits are in the roadmap.
- Self-hosted deployments with insecure configurations.
- Vulnerabilities in dependencies without a clear exploit vector in DevDeck.

---

## Known Sensitive Areas

To guide researchers, these are the areas where we know there is an attack surface:

1.  **SSRF in Open Graph Scraper** (`internal/enricher/generic.go`): We have a scheme whitelist, but private IP range validation is still in the roadmap.
2.  **GitHub Login Allowlist**: Authentication depends on the `ALLOWED_GITHUB_LOGINS` environment variable. Finding a way to bypass this list is considered critical.
3.  **JWT Refresh Flow**: Revocation depends on DB session deletion. If a stolen refresh token can still generate access tokens after a logout, it's considered critical.
4.  **Markdown Rendering**: We use `react-markdown` + `rehype-highlight` in Electron. Finding XSS via crafted markdown is considered critical.

---

*Thank you for helping us build a secure DevDeck.*
