# Tembro V0 — developer run path and acceptance tests

One deterministic local sequence that starts the backend, wires the bridge,
loads `Tembro.amxd`, and runs the two acceptance tests in a **real** Ableton
Live Set. Mocks, HTTP tests, and docs alone do not complete V0.

## Prerequisites (once per machine)

1. Ableton Live 11.1+ (Live 12 recommended) with Max for Live.
2. The pinned upstream bridge installed per [`../SETUP.md`](../SETUP.md):
   `./setup.sh` creates `.venv/` with `ableton-live-mcp` at commit
   `70f7df9192b78d9bd9405f369c9e046c88f1610e` and installs the
   `Ableton_Live_MCP` Remote Script; enable it as a Control Surface in Live.
3. Node.js 18+ (for the backend; the device uses Live's bundled Node).

## Environment variables (never commit secrets)

| Variable | Where | Purpose |
| --- | --- | --- |
| `LLM_ENDPOINT` | server | OpenAI-compatible chat-completions URL |
| `LLM_API_KEY`  | server | provider key — **server-side only, never in the device** |
| `LLM_MODEL`    | server | model name |
| `TEMBRO_API_BASE` | device (optional) | defaults to `http://127.0.0.1:8787` |
| `TEMBRO_MCP_COMMAND` | device | absolute path to `<repo>/.venv/bin/ableton-live-mcp` |

The device reads `~/.tembro/config.json` as an env-free alternative:

```json
{ "api_base": "http://127.0.0.1:8787", "mcp_command": "<repo>/.venv/bin/ableton-live-mcp" }
```

## Run sequence

```bash
# 1. Automated tests (schema validation, executor failure behavior, readback)
cd server && npm install && npm run typecheck && npm test && cd ..
cd devices/Tembro && npm test && cd ../..

# 2. Start the backend with a real provider (dev sign-in enabled)
cd server
LLM_ENDPOINT=https://api.openai.com/v1/chat/completions \
LLM_API_KEY=... \
LLM_MODEL=gpt-5.6-luna \
npm run dev          # http://127.0.0.1:8787

# 3. Preflight the bridge (Live open, Remote Script loaded, NEW unsaved Set)
./.venv/bin/ableton-live-mcp-validate
#    → require "runtime_current": true and "live_mutations_safe": true
```

For a no-key local smoke test, run `npm run dev` without `LLM_*` variables and
send `Set tempo to 123`. The deterministic development provider emits only that
single validated tempo action; other prompts return a chat reply with no Live
changes. Production never enables dev sign-in or this provider.

4. In Live, in a **new, unsaved, disposable Set** (4/4): drop a
   **Max MIDI Effect** on a MIDI track → open it in Max → replace its contents
   with `devices/Tembro/Tembro.maxpat` (File → Open, copy all, or open the
   patch and save into the device) → **save as `Tembro.amxd`** next to
   `devices/Tembro/code/` so `node.script code/tembro_main.js` resolves.
5. In the device: click the `signin dev@tembro.local` message once
   (token persists at `~/.tembro/session.json`), confirm the status line shows
   `· connected · signed in`.

## Acceptance test A — create from language

Type in the device input and press send:

> Make a 4 bar bassline in A minor.

Pass only if **all** hold:

- the device shows `⏳ thinking…` then `⏳ applying N change(s) in Live…`;
- a new MIDI track appears with an instrument loaded **before** notes/playback;
- a Session clip of exactly 4 bars at the current time signature
  (16 beats in 4/4) exists with notes written through LOM;
- exact readback passes (the executor re-reads the clip and compares every
  note's pitch/start/duration/velocity);
- status line shows `✓ done · verified in Live · credits: N`;
- no manual note entry, no MIDI-file import.

## Acceptance test B — modify by reference to the selection

Click the clip created in test A (select its slot), then send:

> Make it more syncopated.

Pass only if **all** hold:

- the request's `live_context.selection.clip` contained the clip's notes
  (check the server log / request payload);
- the plan modifies **that** clip (`replace_notes` on the selected
  track/slot) — no duplicate track or clip appears;
- the result is audibly more syncopated, still a bassline, still 4 bars;
- exact readback passes and the status line reports success;
- fire the clip to hear the change.

## Failure behavior you should be able to demonstrate

- Stop the backend → the device shows `⚠` with a useful message; nothing
  touches Live.
- Close Live (or unload the Remote Script) → preflight fails; **no mutation is
  attempted** and the failure is surfaced, not hidden.
- Any readback/signature mismatch stops the plan at that step and reports
  `readback.mismatch` to `/v0/events`.

## Evidence checklist for the implementation PR

- [ ] screen recording (or reproducible transcript) of tests A and B in real Ableton
- [ ] request `live_context` payloads with tokens/emails redacted
- [ ] the returned validated plans (JSON)
- [ ] executor outcome + readback evidence (device status + `/v0/events` log)
- [x] automated tests: `server/test/app.test.ts` (schema/plan validation, auth,
      credits, selection.clip propagation) and `devices/Tembro/test/`
      (executor failure behavior, exact readback, context adapter)

## Remaining manual setup steps (explicit)

1. Run `./setup.sh` and enable the `Ableton_Live_MCP` Control Surface (once).
2. Save `Tembro.maxpat` as `Tembro.amxd` inside Live (Max cannot be scripted
   from this repo; one-time, ~1 minute).
3. Create `~/.tembro/config.json` (or export the two `TEMBRO_*` variables in
   the environment Live inherits).
4. Provide real `LLM_*` values to the server process.
5. Run acceptance tests A and B in a real, disposable Live Set and attach the
   evidence above. **V0 is not done until both pass in real Ableton.**
