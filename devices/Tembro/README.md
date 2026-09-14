# Tembro — Max for Live device (V0)

The Tembro v0.1.5 loop:

```text
Tembro.amxd
  → user types a musical request inside Ableton
  → POST /v0/agent with current Live context and allowlisted local MCP schemas
  → server returns one safe MCP tool call at a time
  → the device executes locally and returns bounded tool output
  → the same model continues until the musical request is complete
  → Tembro reports what changed and what was verified
```

The UI is intentionally compact: a transcript, musical skill buttons with
server-provided credit estimates, chat input, activation, and an honest waiting
card. Its embedded Liveworks terminal shows every real tool call as it happens;
clicking a row explains the related Live object and can open its official Ableton
or Cycling '74 documentation page.

## Experimental clip variation

The **Clip variation** panel adds an explicit local workflow: capture a selected
Session MIDI clip on a Drum Rack track, choose a mapped pitch lane, and create a
separate clip with alternate hits removed from that lane. **Less dense** repeats
the operation on the candidate. **Play original** and **Play candidate** launch
only when requested; **Keep** retains the exact candidate in its existing slot.
These controls make no model requests and incur no agent-turn credit charge.

Install the matching [fixed bridge patch](bridge/README.md) with the device.
The official runtime validator must pass before the controls operate. Source
and candidate notes are read back independently after changes. Clip automation,
grooves, recording, frozen tracks and ambiguous drum mappings are unsupported.
The source clip stays untouched. This experiment implements the first bounded
interaction from ADR-0003, not a universal musical recommendation engine.

**Discard is currently disabled**: the documented note API cannot verify all
per-note expression edits. Delete unwanted candidates manually in Live. If an
operation times out or cannot be verified, further Live requests are blocked.
**Recheck** can inspect bridge health, but does not automatically clear an
unknown outcome; manual reconciliation is required. **Stop** prevents new
operations while allowing an already sent operation to finish verification.

This code has automated tests; a real Live scratch-Set trial is required before
calling a build ready for distribution. Select a simple unautomated drum clip,
capture it, choose a lane, create, listen to both versions, thin, and keep. Check
that the original and every other lane remain unchanged. Repeat with a manual
note edit to confirm that stale operations refuse to overwrite it.

## Layout

| File | Role |
| --- | --- |
| `Tembro.maxpat` | Device patch source. Open in Max (from a Max MIDI Effect on a MIDI track) and **save as `Tembro.amxd`** — see run doc. |
| `code/tembro_main.js` | `node.script` entry: UI wiring, agent loop, state machine. |
| `code/api.js` | Backend client (`/v0/auth/license`, `/v0/agent`, `/v0/credits`, `/v0/skills`, `/v0/version`). Session token and Lemon Squeezy instance ID persist at `~/.tembro/session.json`. **Neither the raw license key nor the provider API key is stored in the device.** |
| `code/agent_loop.js` | Sequential Responses ↔ MCP loop with bounded results and iteration limits. |
| `code/context.js` | Live context adapter — read-only, immediately before each request. |
| `code/mcp_client.js` | Minimal MCP stdio JSON-RPC client; serializes all Live calls. |
| `code/clip_variation.js` | Local variation state, explicit actions, full note readback, and shared quarantine. |
| `code/runtime_preflight.js` | Strict companion-validator check of installed and loaded runtime fingerprints. |
| `bridge/` | Exact pinned runtime patch, installer support, and fake-host safety tests. |
| `tembro_ui.html` | Floating butter-and-ink chat, activation, skill menu, credit estimates, live work state, context, and updates. |

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
- `chat_skill <skill-id> <text…>` — starts the same loop with a visible skill and its minimum credit tier.
- `variation <action> [pitch]` — local panel actions; pitch is required only by `create`.
- `status` — re-report connection/auth state.

## Tests

```bash
cd devices/Tembro
npm test        # agent loop, API, MCP bridge integration, context, UI
```

The full developer run path and the two real-Ableton acceptance tests are in
[`../../docs/tembro-v0-run.md`](../../docs/tembro-v0-run.md).
## Local Chordarium and Rudiment engines (0.1.8 development)

Tembro can compose with the original Chordarium harmony/arranger engine and
Rudiment rhythm engine. The ensemble tool generates chords, a related bassline
and drums across the same 8 or 16 bars. Chordarium's embedded Scaler catalogs are
not included. The standalone products remain the source of their musical logic.

Four tools are registered locally: `tembro_chordarium_compose`,
`tembro_rudiment_compose`, `tembro_ensemble_compose`, `tembro_proposal_notes`.
Results are retained proposals with stable content identifiers; notes are read in
pages of up to 128. Drum roles need an explicit mapping from the chosen kit.
Generation makes no Live changes. Tembro must still inspect the target, apply
approved notes through its existing Live tools, and read them back.

Try the actual engine combination offline from the repository root:

```sh
node tools/compose_tembro.js docs/examples/ensemble-request.json > /tmp/tembro-ensemble.json
```

The output includes source identities and all three note streams. It is generated
MIDI material, not a recording or proof of playback. In-device chat also needs
the matching server allowlist update; this development work does not deploy it.
The existing chat credit policy is unchanged and there is no additional local
engine charge. See [ADR-0004](../../docs/adr/0004-shared-musical-engines.md).
