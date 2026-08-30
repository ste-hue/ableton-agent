-- Liveworks V0 schema — plain Postgres, no pgvector.
-- The V1 musical memory layer (docs/musical-memory.md) is deliberately absent.

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
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
