# Self-Hosting Guide

This guide explains how to deploy your own instance of **DevDeck.ai**.

[Leer en español](SELF_HOSTING.es.md)

---

## 1. Prerequisites
- A VPS or server with **Docker** and **Docker Compose** installed.
- A domain or subdomain (e.g., `devdeck.yourdomain.com`).
- A GitHub OAuth App (for authentication).

---

## 2. GitHub OAuth Setup
1. Go to your GitHub [Developer Settings](https://github.com/settings/developers).
2. Create a new **OAuth App**.
3. Set the **Authorization callback URL** to: `https://api.yourdomain.com/v1/auth/github/callback`.
4. Note down your **Client ID** and **Client Secret**.

---

## 3. Deployment Steps

### 3.1 Clone the Repository
```bash
git clone https://github.com/tiagofur/dev_deck.git
cd dev_deck/deploy
```

### 3.2 Configure Environment Variables
Copy `.env.example` to `.env` and fill in the values:
```bash
# Database
PG_PASS=your_strong_password

# Auth
JWT_SECRET=your_random_secret
OAUTH_GITHUB_CLIENT_ID=your_id
OAUTH_GITHUB_CLIENT_SECRET=your_secret
OAUTH_REDIRECT_URL=https://api.yourdomain.com/v1/auth/github/callback
ALLOWED_GITHUB_LOGINS=your_username

# AI (Optional)
OPENAI_API_KEY=sk-...
```

### 3.3 Start the Services
```bash
docker compose up -d
```

### 3.4 Configure Caddy (Reverse Proxy)
Edit the `Caddyfile` to match your domain and run:
```bash
docker compose restart caddy
```

---

## 4. Troubleshooting
- **Logs:** Check logs with `docker compose logs -f api`.
- **Database:** Ensure the `db` container is healthy and migrations have run.
- **Auth:** If you get a 403 error, double-check that your GitHub username is in `ALLOWED_GITHUB_LOGINS`.

---

## 5. Updates
To update to the latest version:
```bash
git pull
docker compose pull
docker compose up -d
```
