# DevDeck Self-Hosting Guide

This guide explains how to deploy your own **DevDeck.ai** instance on a small
VPS using the repository's current production stack: **Docker Compose + Caddy +
Postgres + DevDeck API + Web app**.

[Leer en español](SELF_HOSTING.es.md)

---

## 1. Prerequisites

- A Linux VPS or server. Ubuntu 22.04+ or Debian 12+ are the safest targets.
- At least **1 vCPU**, **1 GB RAM**, and **10 GB disk** for a small personal or
  team install.
- A domain pointed at the VPS, for example `devdeck.yourdomain.com`.
- Docker 24+ and Docker Compose v2 installed.
- A GitHub account so you can create a GitHub OAuth App for sign-in.

---

## 2. Create the GitHub OAuth App

1. Open GitHub [Developer Settings](https://github.com/settings/developers).
2. Create a new **OAuth App**.
3. Set **Homepage URL** to `https://devdeck.yourdomain.com`.
4. Set **Authorization callback URL** to:
   `https://devdeck.yourdomain.com/api/auth/github/callback`
5. Save the app, then copy the **Client ID** and **Client Secret**.

GitHub does not show the client secret again later, so store it now.

---

## 3. Clone the Repository

```bash
git clone https://github.com/tiagofur/dev_deck.git
cd dev_deck/deploy
```

---

## 4. Configure `deploy/.env`

Start from the tracked example:

```bash
cp .env.example .env
```

Update the file with your real values:

```env
# Public domain
DOMAIN=devdeck.yourdomain.com
FRONTEND_URL=https://devdeck.yourdomain.com

# Postgres
PG_PASS=<strong-random-password>

# Auth
AUTH_MODE=jwt
LOCAL_AUTH_ENABLED=true
ALLOWED_GITHUB_LOGINS=your-github-login
GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
GITHUB_OAUTH_CALLBACK_URL=https://devdeck.yourdomain.com/api/auth/github/callback
WEB_OAUTH_REDIRECT_URL=https://devdeck.yourdomain.com/auth/callback
DESKTOP_OAUTH_REDIRECT_URL=devdeck://auth/callback

# JWT secrets
JWT_SECRET=<openssl rand -hex 32>
REFRESH_SECRET=<openssl rand -hex 32>

# Optional AI provider
AI_PROVIDER=heuristic
# If you switch to OpenAI, also set:
# AI_EXTERNAL_OPT_IN=true
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini

# Operational defaults
LOG_LEVEL=info
CORS_ORIGINS=https://devdeck.yourdomain.com,app://.
SEED_CHEATSHEETS=true
```

Generate the JWT secrets with:

```bash
openssl rand -hex 32
```

Notes:

- `AUTH_MODE=jwt` is the current default for the production compose stack.
- `LOCAL_AUTH_ENABLED=true` enables email/password login alongside OAuth. If
  you want GitHub-only auth, set it to `false`.
- `ALLOWED_GITHUB_LOGINS` acts as a login allowlist. Leave it empty only if you
  intentionally want any GitHub account to be allowed.
- If `AI_PROVIDER=openai`, the backend requires both
  `AI_EXTERNAL_OPT_IN=true` and `OPENAI_API_KEY`.

Never commit `.env`. It is already ignored by Git.

---

## 5. Start the Stack

Build and launch the full production stack:

```bash
docker compose up -d --build
```

This starts:

- `db` for Postgres 16
- `api` for the Go backend
- `web` for the React app
- `caddy` for HTTPS and reverse proxying
- `prometheus` and `grafana` for basic monitoring

Check service status and live logs:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

---

## 6. Apply Database Migrations

The production stack does **not** currently run migrations automatically. Apply
them after the first boot:

```bash
for f in ../backend/migrations/*.sql; do
  echo "Applying $f..."
  docker compose exec -T db psql -U devdeck devdeck -v ON_ERROR_STOP=1 -f - < "$f"
done
```

If you keep `SEED_CHEATSHEETS=true`, the API will also load the bundled
cheatsheet seed data during startup.

---

## 7. Verify the Deployment

Confirm the public health endpoint responds:

```bash
curl https://devdeck.yourdomain.com/healthz
```

Expected response:

```json
{"status":"ok"}
```

Then open `https://devdeck.yourdomain.com` in the browser and verify that the
GitHub login flow returns to `/auth/callback` successfully.

---

## 8. Public Beta Notes

Current `0.5.0` public beta limitations worth knowing up front:

- Self-hosting is workable, but the docs and deployment flow are still being
  tightened up.
- Production migrations are a manual step today.
- OpenAI usage is strictly opt-in and requires explicit environment settings.
- The GitHub login allowlist is easy to misconfigure; a missing login will
  result in a `403` during sign-in.

---

## 9. Troubleshooting

- **The API is crash-looping:** run `docker compose logs api` and confirm
  `PG_PASS`, `JWT_SECRET`, `GITHUB_CLIENT_ID`, and
  `GITHUB_OAUTH_CALLBACK_URL` are all set correctly.
- **Migrations failed:** connect to Postgres with
  `docker compose exec db psql -U devdeck devdeck` and inspect which migration
  stopped.
- **GitHub login returns 403:** add your GitHub login to
  `ALLOWED_GITHUB_LOGINS`, then restart the API with
  `docker compose up -d api`.
- **HTTPS certificate is not issued:** confirm DNS is pointed at the VPS and
  ports `80` and `443` are open, then inspect `docker compose logs caddy`.

---

## 10. Updates

To pull the latest code and restart the stack:

```bash
cd ../
git pull
cd deploy
docker compose up -d --build
```

Run the migration loop again after updates whenever new files were added under
`backend/migrations/`.
