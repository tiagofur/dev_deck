# HeapDeck Pro & Billing

How the $5/mo Pro plan works: Free/Pro gating, AI metering, the Gemini
provider, Stripe billing, and need-based GitHub discovery.

[Leer en español](PRO_BILLING.es.md)

---

## 1. Model

- **Free ($0, forever):** unlimited vault, capture, fuzzy search, Workbench,
  runbooks, Circles, offline-first desktop, self-hosting. AI surfaces run
  on the deterministic heuristic ($0, local): basic summaries and tags.
- **Pro ($5/mo, flat):** everything in Free, plus cloud AI actions —
  auto-summary, auto-tagging, semantic vault search, need-based GitHub
  discovery, content → knowledge, related items. No chatbot.
- **Fair use:** ~$3 of model cost included per user per UTC calendar month.
  Past the cap, AI pauses until next cycle — the vault keeps working fully.
  No overage charges, ever.

## 2. Gating (Free vs Pro)

Billing is a server flag: `BILLING_ENABLED=false` (default) disables all
gating so self-hosted deployments behave exactly as before — the operator
pays for their own provider. `AUTH_MODE=token` (local dev) also bypasses.

With billing on:

| Surface | Free | Pro |
|---|---|---|
| `POST /api/ask` | 402 `PRO_REQUIRED` | allowed, metered |
| `POST /api/agent/chat` | 402 | allowed, metered |
| `GET /api/search?mode=vector` | 402 | allowed, metered |
| `GET /api/search?mode=hybrid` | degraded to text + `ai_downgraded:true` | allowed, metered |
| `GET /api/search?mode=text` | allowed | allowed |
| `GET /api/discovery/github` | 402 | allowed, metered |
| Background enrich | heuristic ($0) | cloud AI, metered |
| Embeddings (item vectors) | never generated | generated when budget left |

Implementation: `internal/http/middleware/pro.go` (`ProGater`) reads the
**fresh plan from DB** on every request — never the JWT claim, which can
lag up to the access-token TTL after an upgrade. `GET /api/system/config`
exposes `billing_enabled` so clients know whether to show upsells.

## 3. Metering and the monthly cap

Every priced AI call records one row in `ai_usage_events`:

- `action`: `enrich`, `embed_search`, `embed_item`, `agent_chat`, `discovery`
- `provider`, `model`, `input_tokens`, `output_tokens`, `estimated_cents`

Costs come from a dated per-model table (`internal/ai/usage.go`, prices
verified 2026-10-27). Providers report real token usage via the
`Detailed*` interfaces; embeddings and agent turns estimate conservatively
(~4 chars/token). Unknown models price at $0 and never block.

Cap behavior (`AI_MONTHLY_BUDGET_CENTS`, default 300):

- Sync endpoints past the cap answer `429 AI_QUOTA_EXCEEDED` (hybrid search
  degrades to text instead of failing).
- Background enrich silently falls back to the heuristic.
- Metering is best-effort: record failures log and never fail the request;
  spend-lookup failures fail open (a metering outage must not break AI).

Clients read state from `GET /api/me/ai-usage`:

```json
{
  "plan": "pro",
  "used_cents": 42.5,
  "cap_cents": 300,
  "resets_at": "2026-11-01T00:00:00Z",
  "by_action": [{"action": "enrich", "events": 120, "cents": 30.1}]
}
```

Hook: `useAIUsage()` in `@heapdeck/api-client`.

## 4. Gemini provider

`AI_PROVIDER=gemini` with `GEMINI_API_KEY` (and `AI_EXTERNAL_OPT_IN=true`).
Default model `gemini-3.8-flash` (stable pick as of 2026-10-27; promo
pricing $0.75/$3.75 per 1M through 2026-12-31, doubles 2027-01-01 —
revisit `usage.go` then).

Embeddings note: Gemini's embedding model is 768-dim, incompatible with
the `vector(1536)` column. With `AI_PROVIDER=gemini` the server pairs
Gemini chat with OpenAI's `text-embedding-3-small` when `OPENAI_API_KEY`
is set. The hosted cloud runs both keys (embeddings cost fractions of a
cent).

## 5. Stripe billing

### Setup (hosted cloud)

1. Create a Product "HeapDeck Pro" ($5/mo recurring) in Stripe Dashboard →
   copy the Price ID into `STRIPE_PRO_PRICE_ID`.
2. Create a webhook endpoint → `https://api.heapdeck.com/api/billing/webhook`,
   subscribe to `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` →
   copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Set `STRIPE_SECRET_KEY`, `BILLING_SUCCESS_URL`, `BILLING_CANCEL_URL`,
   `BILLING_ENABLED=true` and restart.

Local webhook testing:

```bash
stripe listen --forward-to localhost:8080/api/billing/webhook
stripe trigger checkout.session.completed
```

### Endpoints

- `POST /api/billing/checkout` (auth) → `{checkout_url}`. 409 if already
  Pro. `client_reference_id` carries the user ID for webhook reconciliation.
- `POST /api/billing/portal` (auth) → `{portal_url}` for manage/cancel.
  409 when the user has no Stripe customer yet.
- `POST /api/billing/webhook` (public, signature-verified, rate-limited).
  Always acks 200 after verification; duplicate deliveries are deduped by
  `stripe_webhook_events`.
- `POST /api/admin/users/{id}/plan` (admin) → support override
  (`{"plan":"pro"|"free"}`, `plan_source=admin`).

Hooks: `useCheckout()`, `usePortal()` in `@heapdeck/api-client`.

### Webhook semantics

- `checkout.session.completed` → link customer, `ActivatePro(source=stripe)`.
- `subscription.updated/deleted` → upsert subscription row; `active` /
  `trialing` keep Pro, `canceled` / `incomplete_expired` / `unpaid` drop to
  Free. `past_due` / `incomplete` / `paused` keep Pro — dunning owns the
  gray zone, not us.
- Unknown customers ack silently (test-mode noise).

Downgrade deletes nothing: summaries and tags already generated stay.

## 6. Need-based GitHub discovery (Pro)

`GET /api/discovery/github?q=<need>&language=&limit=` (default 10, max 20):

1. A Flash-class call turns the need into a qualifier-rich GitHub query
   (`language:`, `stars:>`, `pushed:>`, `topic:`); a $0 heuristic covers
   failures and keyless setups. The LLM call is metered as `discovery`.
2. `GET /search/repositories` (star-sorted) with rate-limit mapping to 429.
3. Server-side re-rank: log-scaled stars + recency + language match +
   keyword/topic overlap, each hit carrying `score` + `match_reason`.
4. Cached 1h on the normalized need (Redis, nil-safe).

Response echoes `github_query` for transparency. Saving is 1-click via the
existing `POST /api/items/capture` with the hit URL — no new save endpoint.

Hook: `useGitHubDiscovery({need, language, limit})`. Free users get 402 —
the UI should render an upsell, not an error.

## 7. Env reference

See `backend/.env.example` for the full list. New vars in this epic:

| Var | Default | Meaning |
|---|---|---|
| `BILLING_ENABLED` | `false` | master switch for gating + metering + billing |
| `AI_MONTHLY_BUDGET_CENTS` | `300` | priced AI cap per Pro user per UTC month |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | — / `gemini-3.8-flash` | Gemini provider |
| `STRIPE_SECRET_KEY` | — | Stripe API key (required when enabled) |
| `STRIPE_WEBHOOK_SECRET` | — | webhook signing secret (required) |
| `STRIPE_PRO_PRICE_ID` | — | $5/mo price (required) |
| `BILLING_SUCCESS_URL` / `BILLING_CANCEL_URL` | localhost | checkout redirects |

## 8. Ops notes

- Plan changes take effect immediately (gate reads DB, not JWT).
- `billing_subscriptions` mirrors Stripe state; `users.plan` is the
  enforcement source. On drift, fix via admin override or replay the event
  from the Stripe dashboard.
- Re-verify `internal/ai/usage.go` prices before touching the cap — a stale
  table either over-blocks users or leaks margin. Next known change:
  Gemini 3.8 Flash promo ends 2026-12-31.
- GitHub search quota: 30 req/min authenticated, 10 anon. The 1h cache
  absorbs repeats; `heapdeck_github_search_total{outcome=error}` spikes
  mean quota spent — set `GITHUB_TOKEN`.
