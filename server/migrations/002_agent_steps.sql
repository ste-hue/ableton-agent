-- Consumed continuation steps per agent request. A row (request_id, step)
-- means that step's continuation token has been used and can never be
-- replayed; step = -1 closes the request entirely (refunded or step-limited
-- turns accept no further continuations).
CREATE TABLE agent_steps (
  request_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, step)
);
CREATE INDEX agent_steps_user_idx ON agent_steps(user_id, created_at);
