# HeapDeck Pro y facturación

Cómo funciona el plan Pro de $5/mes: gating Gratis/Pro, medición de IA,
provider Gemini, facturación con Stripe y descubrimiento en GitHub por
necesidad.

[Read in English](PRO_BILLING.md)

---

## 1. Modelo

- **Gratis ($0, para siempre):** vault ilimitado, captura, búsqueda fuzzy,
  Workbench, runbooks, Circles, desktop offline-first, self-hosting. Las
  superficies IA corren con la heurística determinística ($0, local):
  resúmenes y tags básicos.
- **Pro ($5/mes, fijo):** todo lo Gratis, más acciones IA en la nube —
  auto-summary, auto-tagging, búsqueda semántica, descubrimiento en GitHub
  por necesidad, contenido → conocimiento, relacionados. Sin chatbot.
- **Uso justo:** ~$3 de costo de modelos incluido por usuario por mes
  calendario (UTC). Pasado el tope, la IA pausa hasta el próximo ciclo —
  el vault sigue andando completo. Sin cargos extra, nunca.

## 2. Gating (Gratis vs Pro)

La facturación es un flag del servidor: `BILLING_ENABLED=false` (default)
desactiva todo el gating para que self-hosted se comporte exactamente
igual que antes — el operador paga su propio provider. `AUTH_MODE=token`
(dev local) también lo saltea.

Con billing activado:

| Superficie | Gratis | Pro |
|---|---|---|
| `POST /api/ask` | 402 `PRO_REQUIRED` | permitido, medido |
| `POST /api/agent/chat` | 402 | permitido, medido |
| `GET /api/search?mode=vector` | 402 | permitido, medido |
| `GET /api/search?mode=hybrid` | degrada a texto + `ai_downgraded:true` | permitido, medido |
| `GET /api/search?mode=text` | permitido | permitido |
| `GET /api/discovery/github` | 402 | permitido, medido |
| Enrichment en background | heurística ($0) | IA cloud, medida |
| Embeddings (vectores) | nunca se generan | se generan con presupuesto |

Implementación: `internal/http/middleware/pro.go` (`ProGater`) lee el
**plan fresco de DB** en cada request — nunca el claim JWT, que puede
tardar hasta el TTL del access token después de un upgrade. `GET
/api/system/config` expone `billing_enabled` para que los clientes sepan
si mostrar upsells.

## 3. Medición y tope mensual

Cada llamada IA con costo registra una fila en `ai_usage_events`:

- `action`: `enrich`, `embed_search`, `embed_item`, `agent_chat`, `discovery`
- `provider`, `model`, `input_tokens`, `output_tokens`, `estimated_cents`

Los costos salen de una tabla por modelo con fecha (`internal/ai/usage.go`,
precios verificados 2026-10-27). Los providers reportan uso real de tokens
vía las interfaces `Detailed*`; embeddings y turnos de agente estiman de
forma conservadora (~4 caracteres/token). Modelos desconocidos se precean
a $0 y nunca bloquean.

Comportamiento del tope (`AI_MONTHLY_BUDGET_CENTS`, default 300):

- Endpoints sincrónicos pasado el tope responden `429 AI_QUOTA_EXCEEDED`
  (la búsqueda híbrida degrada a texto en vez de fallar).
- El enrichment en background cae silenciosamente a la heurística.
- La medición es best-effort: fallos de registro se loguean y nunca fallan
  el request; fallos de lectura de gasto dejan pasar (una caída de metering
  no debe romper la IA).

Los clientes leen el estado en `GET /api/me/ai-usage`:

```json
{
  "plan": "pro",
  "used_cents": 42.5,
  "cap_cents": 300,
  "resets_at": "2026-11-01T00:00:00Z",
  "by_action": [{"action": "enrich", "events": 120, "cents": 30.1}]
}
```

Hook: `useAIUsage()` en `@heapdeck/api-client`.

## 4. Provider Gemini

`AI_PROVIDER=gemini` con `GEMINI_API_KEY` (y `AI_EXTERNAL_OPT_IN=true`).
Modelo default `gemini-3.8-flash` (estable al 2026-10-27; precio promo
$0.75/$3.75 por 1M hasta el 2026-12-31, se duplica el 2027-01-01 —
revisar `usage.go` entonces).

Nota de embeddings: el modelo de embeddings de Gemini es 768-dim,
incompatible con la columna `vector(1536)`. Con `AI_PROVIDER=gemini` el
servidor combina chat Gemini con `text-embedding-3-small` de OpenAI cuando
existe `OPENAI_API_KEY`. La nube hosteada corre ambas keys (los embeddings
cuestan fracciones de centavo).

## 5. Facturación con Stripe

### Setup (nube hosteada)

1. Crear el Producto "HeapDeck Pro" ($5/mes recurrente) en el Dashboard de
   Stripe → copiar el Price ID en `STRIPE_PRO_PRICE_ID`.
2. Crear el webhook → `https://api.heapdeck.com/api/billing/webhook`,
   suscripto a `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` →
   copiar el secreto de firma en `STRIPE_WEBHOOK_SECRET`.
3. Setear `STRIPE_SECRET_KEY`, `BILLING_SUCCESS_URL`, `BILLING_CANCEL_URL`,
   `BILLING_ENABLED=true` y reiniciar.

Webhooks en local:

```bash
stripe listen --forward-to localhost:8080/api/billing/webhook
stripe trigger checkout.session.completed
```

### Endpoints

- `POST /api/billing/checkout` (auth) → `{checkout_url}`. 409 si ya es
  Pro. `client_reference_id` lleva el user ID para reconciliar en el webhook.
- `POST /api/billing/portal` (auth) → `{portal_url}` para gestionar/cancelar.
  409 si el usuario aún no tiene customer de Stripe.
- `POST /api/billing/webhook` (público, firma verificada, rate-limited).
  Siempre responde 200 tras verificar; entregas duplicadas se deduplican
  con `stripe_webhook_events`.
- `POST /api/admin/users/{id}/plan` (admin) → override de soporte
  (`{"plan":"pro"|"free"}`, `plan_source=admin`).

Hooks: `useCheckout()`, `usePortal()` en `@heapdeck/api-client`.

### Semántica del webhook

- `checkout.session.completed` → vincula customer, `ActivatePro(source=stripe)`.
- `subscription.updated/deleted` → upsert de la fila de suscripción; `active` /
  `trialing` mantienen Pro, `canceled` / `incomplete_expired` / `unpaid` bajan a
  Gratis. `past_due` / `incomplete` / `paused` mantienen Pro — el dunning maneja
  la zona gris, no nosotros.
- Customers desconocidos se responden en silencio (ruido de test-mode).

Bajar de plan no borra nada: resúmenes y tags ya generados quedan.

## 6. Descubrimiento en GitHub por necesidad (Pro)

`GET /api/discovery/github?q=<necesidad>&language=&limit=` (default 10, máx 20):

1. Una llamada Flash convierte la necesidad en una query GitHub rica en
   qualifiers (`language:`, `stars:>`, `pushed:>`, `topic:`); una heurística
   $0 cubre fallos y setups sin key. La llamada LLM se mide como `discovery`.
2. `GET /search/repositories` (ordenado por stars) con mapeo de rate-limit a 429.
3. Re-ranking propio: stars en escala log + recencia + match de lenguaje +
   overlap de keywords/topics, cada hit con `score` + `match_reason`.
4. Cache de 1h sobre la necesidad normalizada (Redis, nil-safe).

La respuesta incluye `github_query` por transparencia. Guardar es 1 click vía
el existente `POST /api/items/capture` con la URL del hit — sin endpoint nuevo.

Hook: `useGitHubDiscovery({need, language, limit})`. Usuarios Gratis reciben
402 — la UI debe mostrar un upsell, no un error.

## 7. Referencia de env

Ver `backend/.env.example` para la lista completa. Nuevas vars de esta épica:

| Var | Default | Significado |
|---|---|---|
| `BILLING_ENABLED` | `false` | switch maestro de gating + metering + billing |
| `AI_MONTHLY_BUDGET_CENTS` | `300` | tope IA con costo por Pro por mes UTC |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | — / `gemini-3.8-flash` | provider Gemini |
| `STRIPE_SECRET_KEY` | — | API key de Stripe (requerida si enabled) |
| `STRIPE_WEBHOOK_SECRET` | — | secreto de firma del webhook (requerido) |
| `STRIPE_PRO_PRICE_ID` | — | price de $5/mes (requerido) |
| `BILLING_SUCCESS_URL` / `BILLING_CANCEL_URL` | localhost | redirects del checkout |

## 8. Notas de ops

- Los cambios de plan aplican de inmediato (el gate lee DB, no JWT).
- `billing_subscriptions` refleja el estado de Stripe; `users.plan` es la
  fuente de enforcement. Ante drift, corregir vía admin override o
  re-ejecutar el evento desde el dashboard de Stripe.
- Re-verificar los precios en `internal/ai/usage.go` antes de tocar el tope —
  una tabla vieja o sobre-bloquea usuarios o fuga margen. Próximo cambio
  conocido: la promo de Gemini 3.8 Flash termina el 2026-12-31.
- Cuota de búsqueda GitHub: 30 req/min autenticado, 10 anónimo. El cache de 1h
  absorbe repeticiones; picos de `heapdeck_github_search_total{outcome=error}`
  significan cuota agotada — setear `GITHUB_TOKEN`.
