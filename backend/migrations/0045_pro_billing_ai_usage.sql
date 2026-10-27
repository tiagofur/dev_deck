-- 0045_pro_billing_ai_usage.sql
-- Paso 2: metering de IA por eventos + columnas de billing en users.
--
-- ai_usage_events registra cada acción IA con costo estimado en centavos.
-- El cap mensual se calcula con SUM sobre (user_id, created_at) — sin
-- agregados dual-write que puedan diverger.

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,  -- enrich, embed_search, embed_item, agent_chat, discovery
  provider      TEXT NOT NULL,  -- openai, deepseek, qwen, gemini, ollama, lmstudio, heuristic
  model         TEXT NOT NULL DEFAULT '',
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  -- Costo estimado en centavos de USD (micro-decimales redondeados hacia
  -- arriba: los eventos cuestan fracciones de centavo y el cap es 300).
  estimated_cents NUMERIC(12, 4) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
  ON ai_usage_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_action_month
  ON ai_usage_events (user_id, action, created_at);

-- Columnas de billing en users (el webhook de Stripe las puebla en Paso 4).
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_since TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_source TEXT DEFAULT 'free'; -- free, stripe, selfhost, trial, admin
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer
  ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Normaliza planes legacy y endurece el dominio: solo free/pro.
UPDATE users SET plan = 'free' WHERE plan IS NULL OR plan NOT IN ('free', 'pro');
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_plan_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'pro'));
  END IF;
END $$;

-- Subscripciones de Stripe (Paso 4) con idempotencia de webhook.
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id       TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'active',
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_subs_user ON billing_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_subs_status_period
  ON billing_subscriptions (status, current_period_end);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
