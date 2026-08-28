# Liveworks — design spec

*(working name, to be confirmed)*
Status: draft for review · Date: 2026-08-28 · Repo: `ableton-agent`

## 1. Context and philosophy

This project already proved the chain *natural language → LLM → MCP → Remote Script →
LOM → real Live* (see `docs/architecture.md`, validation Gates A–G). This session added:

- a **superwhisper voice mode** ("Ableton ITA") that rewrites spoken rambles into
  LOM-aware structured requests;
- a **deep LOM capability map** (`docs/lom-capability-map.md`) — what is possible,
  partial, impossible;
- the insight that the LOM **can always rebuild but almost never rearrange**, and that
  it can never save/export — so reproducibility must come from *our* artifacts, not
  from Live's.

Liveworks is the cockpit that turns this into a repeatable way of making music:

> **The probabilistic decides, the deterministic executes and remembers.**
> The LLM interprets intent (probabilistic). Everything that lands in Live passes
> through deterministic, replayable, versionable artifacts: recipes, seeds, explicit
> note lists, verified readback.

## 2. Goals / non-goals

**Goals**

1. Reproducible setups: snapshot a Set we like into a *recipe* file; rebuild it later
   from scratch, verified step by step.
2. Transparency and learning: a live *trace* of request → interpretation → actual LOM
   operations, visible inside Live.
3. In-Live control surface: status HUD + quick command buttons, so the user stays in
   Ableton (voice via superwhisper remains the rich input channel).
4. Deterministic generation: seeded generators (Chordarium engine headless) recorded
   in recipes — same seed, same music.

**Non-goals (this project)**

- Distributable/commercial .amxd (later, maybe).
- Text chat inside the device (depends on the jweb keyboard spike; voice+terminal
  covers input meanwhile).
- Audio analysis / M4L audio-tap workflows.
- Replacing any AGENTS.md rule — all safety rules stay as-is.

## 3. Architecture overview

```
 voice (superwhisper "Ableton ITA")
   │ rewritten request
   ▼
 Claude session ──── MCP tools ────► Remote Script ────► LOM / Live
   │        ▲                              │
   │        └── readback / signatures ◄────┘
   │
   ├─ writes/reads  recipes/*.json          (deterministic memory, git)
   ├─ appends       state dir trace.jsonl   (via PostToolUse hook, source of truth)
   └─ pushes        interpretation + status ─► Liveworks device (M4L, jweb webview)
                                               ▲ buttons → status file → agent polls
```

Channels (all validated in the toolkit exploration of 2026-08-28):

- **agent → device**: `live_agent_m4l_device` command file + UDP wake; web state push
  (throttled, ≤8 KB / ≤48 keys per push).
- **device → agent**: status file, polled with `wait_status` (pull only).
- **hook → device**: Claude Code `PostToolUse` hook on `mcp__ableton_live__*` writes
  trace entries; delivery to the webview goes through the same command file
  (`command: set`, a `trace_append` state key). The JSONL file remains the source of
  truth; the in-device view is best-effort and can be resynced by the agent.

## 4. Component: Recipes (stage 1)

**Format** — one JSON file per recipe, `recipes/YYYY-MM-DD_slug.json`, committed to git.

```json
{
  "recipe_version": 1,
  "name": "dark-rnb-base",
  "created": "2026-08-28",
  "song": { "tempo": 82, "root_note": 2, "scale_name": "Minor" },
  "tracks": [
    {
      "name": "Keys", "type": "midi", "color_index": 12,
      "mixer": { "volume": {"value": 0.83, "display": "-2.1 dB"}, "pan": 0.0,
                 "sends": [ {"value": 0.25, "display": "-12 dB"} ] },
      "devices": [
        { "load": {"name": "Electric", "root": "instruments"},
          "class_name": "InstrumentVector",
          "params": { "Volume": {"value": 0.85, "display": "-2.1 dB"} } }
      ],
      "clips": [
        { "slot": 0, "name": "verse", "length": 16.0, "loop": true,
          "notes": [ {"pitch": 50, "start": 0.0, "dur": 1.0, "vel": 96} ],
          "generator": { "engine": "chordarium", "seed": "a3f19c",
                         "settings": { "key": "D", "scale": "Minor", "style": "RnB" } } }
      ]
    }
  ],
  "scenes": [ { "index": 0, "name": "A", "tempo": null } ]
}
```

Key decisions:

- **Notes are stored inline** (source of truth for fidelity); the optional `generator`
  block is provenance — it allows regenerating/creating variations, never replaces the
  stored notes on replay.
- Every parameter stores `value` (normalized, what the API writes) **and** `display`
  (human string, what the user reads/edits). On replay, `value` is written and
  `display` is compared on readback as a sanity check (numeric part within 1%, or
  exact string for enum params).
- What a snapshot does **not** capture (stated in the file under `"omissions"` when
  detected): third-party plugin internal state beyond exposed parameters, audio clip
  sample *content* (only the file path is stored), groove pool contents, arrangement
  automation. Honest capture beats silent loss.

**Snapshot procedure** (agent-executed, sequential reads only): `live_set_summary` →
walk tracks/devices/params/clips via the read tools → serialize → validate → write file.

**Replay procedure** (agent-executed): requires a disposable Set (`file_path == ""`,
rule 8) and full preflight (rule 3). Build strictly top-down — tempo/scale, tracks *in
final order* (the LOM cannot reorder), devices per track (browser load by name/root;
native `insert_device` where possible), params, clips+notes, scenes. After every
mutation: signature re-read + readback (rules 4–5). Divergences (device not found,
param name missing) stop the replay and are reported, never silently skipped.

**Code artifact**: `tools/recipe_check.py` — schema validation + human diff between two
recipes (no Live access; runs standalone). The snapshot/replay logic itself is agent
procedure, documented in `docs/recipes.md`, not scripted — the agent is the executor
and verifier.

## 5. Component: Device shell (stage 2)

- Built with `live_agent_m4l_device`, role `midi_effect` (lightest I/O), loaded on a
  disposable Set's track.
- Webview (jweb) UI, single page, authored inline (`html`/`css`/`js` so the bootstrap
  is injected). Width ≤ 960 px, height ≤ 180 px to stay inside preflight comfort; the
  page owns its scrolling.
- HUD state keys (agent-pushed): `agent_status` (idle/working/waiting), `current_op`
  (plain-language line), `set_signature`, `last_result` (ok/error + short text),
  `tempo`.
- **First-device ritual** (AGENTS.md rule 10): run the upstream validator WITHOUT
  `--allow-stale-m4l-host` / `--allow-missing-visual-capture` before the first M4L
  operation; visually verify the rendered UI via `live_visual_capture` pixel
  inspection (status alone is not proof).
- Includes the **keyboard spike**: one `<input>` field; user types and dictates into
  it; page reports received characters via the message bridge. Outcome decides whether
  in-device text/voice input is feasible (stage 6, out of scope here).

## 6. Component: Tracer (stage 3)

- **Level 3 (LOM calls, automatic)**: `PostToolUse` hook matching
  `mcp__ableton_live__*` appends `{ts, tool, args_digest, ok}` to
  `~/.ableton-live-mcp/liveworks_trace.jsonl` and forwards a compact entry to the
  device command file. Secrets/none expected; args are digested (paths, refs, counts —
  not full note dumps).
- **Levels 1–2 (request + interpretation, agent-pushed)**: only the agent knows them;
  pushed as `trace_append` entries at the start of each task.
- Webview renders a scrolling three-level log, color-coded: grey = read, orange =
  mutation, green = verified readback, red = error. Entries accumulate client-side
  (the push channel carries one entry at a time).
- Collision handling: the command file is shared with the MCP server's own commands;
  last-write-wins is acceptable because the JSONL is the source of truth and the agent
  resyncs the view (`replace_trace` push) whenever it detects a gap.
- The hook is configured in `.claude/settings.json` via the update-config path; it
  must never block or slow tool calls (fire-and-forget, ≤50 ms budget, failures
  silent-but-logged).

## 7. Component: Buttons (stage 4)

- Buttons in the webview: **Un'altra** (variation), **Fammi sentire** (fire),
  **Stop**, **Undo**, **Salva ricetta** (snapshot), **Commit** (freeze current
  variation as the keeper).
- Click → `set` state key (`pending_command`, monotonic counter) → agent polling loop
  (`command:"status"` + `wait_status`, `status_state_keys:["pending_command"]`)
  → agent acts → clears the key and pushes the outcome.
- Polling cadence: only during active musical sessions; the /loop-style cadence is the
  agent's concern, not the device's. Buttons are requests, not guarantees — the HUD
  shows acceptance.

## 8. Component: Seeds / Chordarium (stage 5)

- Chordarium's engine is deterministic and seedable and already runs headless in
  `node:vm` (proven by its own test harness, `tests/helpers/load-core.js` pattern).
- A small runner in `tools/chordarium_run.mjs` (reads a settings+seed JSON from argv,
  prints the events JSON) — reusing the production app's engine unmodified, per the
  owner's constraint (the public app and its paywall stay untouched; we only *take*
  the code, read-only, from `~/dev/Projects/ChordBloom-v1`).
- Tick→beat conversion: PPQ 960, `start/960`, `(end-start)/960`; tracks Pattern/Bass/
  Top Voice map to separate clips/tracks. MPE data is dropped in clip writes (LOM
  limit) and noted in the recipe's omissions.
- Generated clips carry the `generator` block (engine, seed, settings) in the recipe.

## 9. Error handling

- All AGENTS.md rules apply unchanged; nothing in Liveworks bypasses preflight,
  signature guards, sequential calls, or the modal/timeout protocols.
- Replay: first divergence stops the run; the trace shows exactly where; partial
  builds stay in the disposable Set for inspection (never auto-deleted).
- Device/webview failure never blocks music-making: every feature degrades to the
  terminal (trace → chat narration, buttons → voice/typed commands).
- Hook failure: tool calls proceed regardless; the trace file notes gaps on resync.

## 10. Testing & verification (per stage)

1. **Recipes**: `recipe_check.py` unit-tested standalone; live round-trip test —
   build a small Set, snapshot, wipe (new disposable Set), replay, then
   snapshot again and machine-diff the two recipes (target: zero diffs outside
   documented omissions).
2. **Shell**: validator passes with no exemption flags; `live_visual_capture` shows
   the rendered HUD (pixel check); a state push visibly updates the HUD.
3. **Tracer**: run one scripted task; every MCP call appears in the JSONL and in the
   device within seconds; kill the device mid-task and verify resync repopulates.
4. **Buttons**: each button pressed once → agent observes the key via `wait_status`,
   acts, HUD reflects the outcome; a press while busy queues (counter) and is not lost.
5. **Seeds**: same seed+settings → byte-identical events JSON across two runs; replayed
   clip readback matches stored notes exactly (the Gate G4 canonical comparison).

## 11. Roadmap

| Stage | Deliverable | Needs Live? |
|---|---|---|
| 1 | Recipe format + `recipe_check.py` + `docs/recipes.md` procedures | only for the round-trip test |
| 2 | Device shell: validator run, HUD webview, visual verification, keyboard spike | yes |
| 3 | Tracer: hook + push + resync | yes |
| 4 | Buttons + polling loop | yes |
| 5 | Chordarium runner + generator blocks in recipes | round-trip test only |

Each stage is independently useful; later stages can be reordered or dropped without
stranding earlier ones.

## 12. Open questions (resolved before their stage starts)

- Final name (working: Liveworks).
- Keyboard spike outcome → whether an input stage 6 (in-device text/voice) exists.
- Whether recipes should also capture return-track routing topologies in v1 or defer.
