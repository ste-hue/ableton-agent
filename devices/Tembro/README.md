# Tembro — Max for Live device (V0)

The smallest real Tembro loop:

```text
Tembro.amxd
  → user types a musical request inside Ableton
  → POST /v0/chat with current Live context (tempo, tracks, selection, selected clip notes)
  → server returns a Zod-validated action plan
  → local executor applies it through the existing MCP/LOM bridge
  → exact readback verifies the result
  → the device reports success or a useful failure
```

The UI is intentionally compact: a transcript, chat input, send button,
email and access-code fields, a connect button, and a status line
showing `⏳ working / ✓ success / ⚠ error`.

## Layout

| File | Role |
| --- | --- |
| `Tembro.maxpat` | Device patch source. Open in Max (from a Max MIDI Effect on a MIDI track) and **save as `Tembro.amxd`** — see run doc. |
| `code/tembro_main.js` | `node.script` entry: UI wiring, chat loop, state machine. |
| `code/api.js` | Backend client (`/v0/auth/license`, `/v0/chat`, `/v0/events`). Session token and Lemon Squeezy instance ID persist at `~/.tembro/session.json`. **Neither the raw license key nor the provider API key is stored in the device.** |
| `code/context.js` | Live context adapter — read-only, immediately before each request. |
| `code/executor.js` | Local action executor: sequential, one call in flight, preflight, `expected_set_signature` guard, stop on first failure, outcomes → `/v0/events`. |
| `code/readback.js` | Exact clip/note comparison (pitch, start, duration, velocity, mute, probability, velocity_deviation). |
| `code/lom_bridge.js` | Maps the V0 action surface onto the pinned upstream `ableton-live-mcp` tools. The only Ableton-control path — no second control stack, no direct port 8765 access. |
| `code/mcp_client.js` | Minimal MCP stdio JSON-RPC client; serializes all Live calls. |

## Configuration (no secrets)

`~/.tembro/config.json`:

```json
{
  "api_base": "http://127.0.0.1:8787",
  "mcp_command": "/absolute/path/to/repo/.venv/bin/ableton-live-mcp"
}
```

Env overrides: `TEMBRO_API_BASE`, `TEMBRO_MCP_COMMAND`.

## Device messages

- `license <email> <access-code>` — activate a free-beta code or paid Lemon Squeezy license; the session persists locally.
- `signin <email>` — local development only (server started with dev-signin enabled).
- `chat <text…>` — the loop above. The input box + send button emit this.
- `status` — re-report connection/auth state.

## Tests

```bash
cd devices/Tembro
npm test        # executor failure behavior, readback exactness, context adapter
```

The full developer run path and the two real-Ableton acceptance tests are in
[`../../docs/tembro-v0-run.md`](../../docs/tembro-v0-run.md).
