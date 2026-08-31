# Tembro — Max for Live device (V0)

The Tembro v0.1.3 loop:

```text
Tembro.amxd
  → user types a musical request inside Ableton
  → POST /v0/agent with current Live context and allowlisted local MCP schemas
  → server returns one safe MCP tool call at a time
  → the device executes locally and returns bounded tool output
  → the same model continues until the musical request is complete
  → Tembro reports what changed and what was verified
```

The UI is intentionally compact: a transcript, chat input, send button,
email and access-code fields, a connect button, and a status line
showing `⏳ working / ✓ success / ⚠ error`.

## Layout

| File | Role |
| --- | --- |
| `Tembro.maxpat` | Device patch source. Open in Max (from a Max MIDI Effect on a MIDI track) and **save as `Tembro.amxd`** — see run doc. |
| `code/tembro_main.js` | `node.script` entry: UI wiring, agent loop, state machine. |
| `code/api.js` | Backend client (`/v0/auth/license`, `/v0/agent`, `/v0/credits`, `/v0/version`). Session token and Lemon Squeezy instance ID persist at `~/.tembro/session.json`. **Neither the raw license key nor the provider API key is stored in the device.** |
| `code/agent_loop.js` | Sequential Responses ↔ MCP loop with bounded results and iteration limits. |
| `code/context.js` | Live context adapter — read-only, immediately before each request. |
| `code/mcp_client.js` | Minimal MCP stdio JSON-RPC client; serializes all Live calls. |
| `tembro_ui.html` | Floating kawaii-minimal multi-message chat, activation, credits, context, and updates. |

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
- `chat <text…>` — starts the agent loop above. The chat composer emits this.
- `status` — re-report connection/auth state.

## Tests

```bash
cd devices/Tembro
npm test        # agent loop, API, executor compatibility, readback, context
```

The full developer run path and the two real-Ableton acceptance tests are in
[`../../docs/tembro-v0-run.md`](../../docs/tembro-v0-run.md).
