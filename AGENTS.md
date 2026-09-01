# Ableton Agent — operating rules for any LLM host

These rules apply to every agent session (Codex, Claude Code, or any other MCP host)
opened in this directory. They encode what was learned and validated in the real-Live
end-to-end proof (see `docs/architecture.md` and `docs/validation-plan.md`).

## What this project is

Natural language → LLM → MCP → Remote Script → Live Object Model → real Ableton Live.

The MCP server is the pinned upstream `ableton-live-mcp` installed in `.venv/`
(commit `70f7df9192b78d9bd9405f369c9e046c88f1610e`). The Remote Script
`Ableton_Live_MCP` is installed as a Control Surface in Live and listens on
`127.0.0.1:8765`. Host configs: `.codex/config.toml` (Codex), `.mcp.json` +
`.claude/settings.json` (Claude Code).

## User collaboration contract

Before musical work, read `.agents/COLLABORATION.md` completely. It records the
user's durable workflow and communication preferences for this project. Update it
only when the user asks or confirms that a recurring preference should become a
rule. Safety and authorization rules in this file always take precedence.

## Knowledge sources

- **What exists in the LOM** (objects, properties, methods): the `ableton-lom` skill
  in `.agents/skills/ableton-lom/` (`SKILL.md` + `references/*.md`). It is written
  from the Remote Script perspective (`song.tempo`); the MCP tools use path syntax
  (`live_set`, canonical paths like `live_set tracks 4 clip_slots 0 clip`). Same
  object model, same names — map mechanically.
- **How to call it**: the MCP tool schemas advertised by the server. Trust the
  schemas over memory; wrong argument shapes are rejected locally and never reach Live.
- **How to make music with it**: the musical skills in `.agents/skills/`
  (`beat-making`, `harmony-melody`, `song-from-scratch`) — see
  `.agents/skills/README.md` for what each covers and the principle behind them.
  Hosts with a skill mechanism load them automatically; on any other host, read
  the relevant `SKILL.md` when the task is musical. They carry constraints,
  musical primitives and working method — never patterns to reproduce.

## Hard rules

1. **One driver at a time.** Never issue Live calls while another agent session may
   be doing the same. If unsure, ask the user which session is active.
2. **All Live calls are sequential.** Never parallel. One request in flight, read the
   result, then the next. The Remote Script enforces this with a semaphore; do not
   test it.
3. **Preflight before any mutation.** Run upstream validation and require both
   `runtime_current: true` and `live_mutations_safe: true`. Then read
   `live_set_summary` and record the `set_signature`.
4. **Signature-guard every mutation.** Pass the latest `set_signature` as
   `expected_set_signature`. Re-read the summary after each persistent mutation
   before the next one.
5. **Readback after every mutation.** Ableton is the authoritative state. A success
   response is not proof; read the affected object back (notes via `live_clip_notes`
   exactly — the signature does not cover note contents).
6. **Sent-call timeouts have unknown outcomes.** Do not resend the mutation. Call
   `live_bridge_status` only, wait, re-read the Set, then classify the operation as
   applied / not applied / unknown.
7. **Never fire a clip twice** while waiting for launch quantization; poll instead.
   Stops must be issued as isolated calls and verified with a separate delayed read
   (an aggregated stop was observed not to stick).
8. **Work only in unsaved, disposable Sets** (`file_path == ""`) unless the user
   explicitly authorizes touching a saved Set. Never target existing user tracks or
   clips without being asked.
9. **Modals and UI stalls are blockers.** Never click through dialogs, restart Live,
   reload the Control Surface, close a Set, or discard changes without explicit user
   authorization.
10. **No arbitrary code in Live.** `live_exec`, `live_eval`, and `live_batch` are
    off-limits (deny-listed in the Claude config, excluded from `enabled_tools` in
    the Codex config). Do not work around this.
    **Max for Live tools are unlocked** (user decision, 2026-08-27, on the Live 12
    Suite trial): `live_agent_m4l_device`, `live_agent_m4l_cleanup`,
    `live_agent_audio_tap`, `live_agent_audio_tap_setup`, `live_visual_capture`,
    `live_max_console_capture`. Conditions: run the upstream validator WITHOUT
    `--allow-stale-m4l-host` and `--allow-missing-visual-capture` before the first
    M4L operation of a session; follow the server's M4L verification rules (visual
    UI verification via pixel inspection, real telemetry only, no fake data); M4L
    device work happens in disposable Sets like everything else (rule 8).
11. **Cleanup is the user's call.** Closing a Set without saving requires explicit
    authorization.

## Project storage and naming convention

Working Sets stay unsaved and disposable by default (rule 8). When the user asks to
save a song — or when you direct them to save it manually — always use this layout:

- **Root for all Ableton projects:** `~/Music/Ableton/Projects/`
- **One folder per song/project**, named `YYYY-MM-DD_project-slug` with the
  descriptive part in lowercase kebab-case (e.g. `2026-08-26_primo-prova`,
  `2026-08-27_dark-rnb-01`).
- **The main `.als` uses the same base name** as its folder. Subsequent versions
  append `_v01`, `_v02`, … :
  `Projects/2026-08-26_primo-prova/2026-08-26_primo-prova_v01.als`
- Keep Ableton-generated `Samples/`, `Backup/`, and `Ableton Project Info/` inside
  the same project folder.
- A project is portable only after **Collect All and Save**.
- **Never save song projects inside the User Library** (that is for devices,
  presets, and Remote Scripts only).
- Throwaway experiments go under `Projects/Sketches/` with the same naming.

Default to this structure without asking, unless the user names another location.

## Musical sessions (making music with a non-Ableton user)

- The user speaks in musical terms; you translate to LOM operations. Explain what you
  are doing in plain language, not in tool jargon.
- New MIDI tracks are silent until an instrument is loaded. Load stock instruments
  via browser search/load (`live_browser_search`, `live_browser_load`,
  `live_load_device`) and verify the device actually appears on the track before
  adding notes.
- Prefer creating variations over destroying work: duplicate clips, use undo
  (`Song.undo`, one call, then observe what actually reverted).
- "Fammi sentire" → fire the relevant clips/scene, confirm playing state via readback,
  and stop when asked.
