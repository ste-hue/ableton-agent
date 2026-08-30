# tembro-server — Tembro V0 backend

The shortest path to a usable paid product:

```
M4L device (chat UI in Live)
   │ HTTPS, bearer token
   ▼
this server            auth · per-user isolation · credits · logging
   │
   ▼
LLM gateway            provider-agnostic; returns reply + validated action plan
   │
   ▼ (response)
M4L device → local MCP/LOM bridge → Ableton   (execution + readback happen
                                               on the user's machine, never here)
```

The backend **never talks to Ableton**. It returns a validated `actions` plan;
the M4L device executes it locally through the existing MCP/LOM bridge —
sequentially, signature-guarded, with readback — and reports outcomes to
`/v0/events`.

## API (V0)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /v0/health` | – | liveness |
| `POST /v0/auth/dev-signin` | – | dev-only email → token (production sign-in wired at deploy) |
| `GET /v0/credits` | ✓ | credit balance |
| `POST /v0/chat` | ✓ | message + Live Set context → reply + LOM action plan; charges credits |
| `POST /v0/events` | ✓ | client telemetry: action outcomes, readback mismatches, errors |

## Action surface

Defined and zod-validated in `src/types.ts`, mirroring the verified capabilities
in `../docs/lom-capability-map.md`: `set_tempo`, `create_midi_track`,
`load_device`, `create_clip`, `replace_notes`, `fire_clip`, `fire_scene`,
`stop_all`, `undo`. Invalid model output never reaches Live.

## Credits (V0 invariant)

The credit policy is **server-side and replaceable**. The current flat
per-chat charge is a V0 placeholder; the client only ever receives a balance.
Credits are **not** chats and are **not** provider tokens — pricing, metering
granularity, and grants can all change behind `/v0/chat` and `/v0/credits`
without any device update.

## Develop

```bash
cd server
npm install
npm run typecheck
npm test
npm run dev        # http://127.0.0.1:8787, StubProvider unless LLM_* env is set
```

Environment for a real model (any OpenAI-compatible chat-completions API):
`LLM_ENDPOINT`, `LLM_API_KEY`, `LLM_MODEL`.

## Storage

`src/store.ts` defines the `Store` interface — every data method takes
`userId`, so isolation holds by construction. `MemoryStore` backs dev/tests;
the Postgres schema in `migrations/001_init.sql` (plain Postgres, **no
pgvector**) is the deploy target — wire a driver (Hyperdrive/Neon) behind the
same interface.

## Deliberately not here (V1, post-launch)

Musical memory / Musical Object Model, lineage, embeddings and retrieval —
see `../docs/musical-memory.md` (north star). Also not here yet: Lemon Squeezy
webhooks (credit grants land in `credit_ledger` with `reason='grant:purchase'`),
production sign-in, streaming responses.

## Remaining to ship V0

- [ ] Production auth (magic link or device code) replacing dev-signin
- [ ] Postgres `Store` implementation + migration runner
- [ ] Lemon Squeezy webhook → credit grants
- [ ] Streaming chat responses
- [x] M4L device: chat UI + local action executor over the MCP/LOM bridge
      (`../devices/Tembro/` — run path in `../docs/tembro-v0-run.md`)
- [ ] Deploy pipeline (Workers) + Cloud Logging/error reporting
