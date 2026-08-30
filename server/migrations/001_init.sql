-- Tembro V0 schema — plain Postgres, no pgvector.
-- The V1 musical memory layer (docs/musical-memory.md) is deliberately absent.

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  lemon_customer_id BIGINT UNIQUE,
  credit_balance INTEGER NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions: bearer tokens for the M4L device. Token is stored hashed.
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- Lemon Squeezy license activations. Raw license keys are never stored.
CREATE TABLE licenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_key_hash      TEXT NOT NULL,
  lemon_license_key_id  BIGINT NOT NULL,
  lemon_instance_id     UUID NOT NULL UNIQUE,
  lemon_customer_id     BIGINT NOT NULL,
  lemon_store_id        BIGINT NOT NULL,
  lemon_product_id      BIGINT NOT NULL,
  lemon_variant_id      BIGINT NOT NULL,
  last_validated_at     TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX licenses_user_idx ON licenses(user_id);

-- Credit ledger: the runtime accounting system (Lemon Squeezy is billing
-- authority only). Balance = SUM(delta) per user.
CREATE TABLE credit_ledger (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta       INTEGER NOT NULL,             -- + grant, - charge
  reason      TEXT NOT NULL,                -- 'grant:signup' | 'grant:purchase' | 'charge:chat' | ...
  ref         TEXT,                         -- e.g. Lemon Squeezy order id, chat message id
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX credit_ledger_user_idx ON credit_ledger(user_id, created_at);
CREATE UNIQUE INDEX credit_ledger_idempotency_idx
  ON credit_ledger(user_id, reason, ref)
  WHERE ref IS NOT NULL;

-- A client-generated request UUID prevents network retries from charging twice.
CREATE TABLE chat_charges (
  request_id  UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_charges_user_idx ON chat_charges(user_id, created_at);

-- Webhook retries are expected. Only the first event key may change balance.
CREATE TABLE billing_events (
  event_key          TEXT PRIMARY KEY,
  event_name         TEXT NOT NULL,
  resource_type      TEXT NOT NULL,
  resource_id        TEXT NOT NULL,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lemon_customer_id  BIGINT NOT NULL,
  lemon_store_id     BIGINT NOT NULL,
  lemon_product_id   BIGINT,
  lemon_variant_id   BIGINT,
  payload             JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversations: chat history per user (context for the model, audit for us).
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversations_user_idx ON conversations(user_id, created_at);

CREATE TABLE messages (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content          TEXT NOT NULL,
  actions          JSONB,                   -- LOM action plan attached to an assistant message
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON messages(conversation_id, created_at);

-- Observability: structured product/system events (client + server).
CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL,                -- 'chat.request' | 'action.executed' | 'action.failed' | 'client.error' | ...
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_kind_idx ON events(kind, created_at);
CREATE INDEX events_user_idx ON events(user_id, created_at);
