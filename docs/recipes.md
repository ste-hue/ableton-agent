# Recipes — snapshot & replay procedures

Spec: `docs/superpowers/specs/2026-08-28-liveworks-design.md` §4. Tool:
`python3 tools/recipe_check.py validate FILE | diff FILE_A FILE_B`
(exit 0 = ok, 1 = errors/diffs, 2 = unusable input).

A recipe is the declarative, git-versioned description of a rebuildable Set
state. Inline notes are the source of truth for replay; `generator` blocks are
provenance only. `value` is canonical for every parameter; `display` is
debug-only. All AGENTS.md rules apply to both procedures.

## Snapshot ("Salva ricetta")

1. Preflight (AGENTS.md rule 3): upstream validation with `runtime_current:
   true` and `live_mutations_safe: true`; read `live_set_summary`, record
   `set_signature`. Snapshot is read-only, but the signature anchors the
   "verified state" claim.
2. Read, strictly sequentially: song (tempo, root_note, scale_name) → per
   track: name, type, color_index, mixer (volume/pan/sends) → devices
   (class_name, load name/root as loaded, all parameters) → clips (slot,
   name, length, loop, all notes via `live_clip_notes`) → scenes.
3. Serialization rules:
   - floats rounded to 6 decimals; times/durations in beats;
   - every parameter: `{"value": <normalized>, "display": <string>}`, plus
     `"symbol"` for quantized/enum parameters;
   - notes: `{"pitch", "start", "dur", "vel"}` (+ `"mute"` when true);
   - anything observed but not representable goes into `"omissions"` as a
     human sentence (e.g. third-party plugin internal state, audio sample
     content, groove pool contents, arrangement automation).
4. Fill `environment`: `live_version` from the LOM Application object;
   `ableton_agent_version` = pinned server commit (AGENTS.md); 
   `chordarium_engine_commit` = the generator's commit if any generated clip
   is present, else `""`; `platform` = OS name.
5. Re-read `live_set_summary`: if `set_signature` changed during the walk,
   the snapshot is stale — discard and restart.
6. Write to `recipes/YYYY-MM-DD_slug.json` (kebab-case slug), run
   `recipe_check.py validate`, then commit.

## Replay (rebuild)

Preconditions: disposable Set (`file_path == ""`, rule 8) — opening/closing a
Set is the user's manual gesture; full preflight; fresh `set_signature`.
If the recipe `environment` does not match the current environment, WARN and
continue (never fail blind on environment alone).

Build strictly top-down, one Live call at a time:

1. song: tempo, scale;
2. tracks **in recipe order** (the LOM cannot reorder tracks);
3. per track: create → rename/color → devices (browser load by
   `load.name`/`load.root`, or native `insert_device` when applicable; verify
   the device appears before continuing) → parameters (`value` only) →
   mixer → clips (create with `create_clip_length`, write notes) → scenes.

The loop is transaction-like — for each unit:

    mutation → readback (rules 4–5) → checkpoint → next

After each verified unit, append a checkpoint line to
`~/.ableton-live-mcp/liveworks_trace.jsonl`:

    {"ts": "<iso8601>", "recipe": "<name>", "step": "tracks[0].devices[0]", "checkpoint": true}

`step` uses the same canonical paths as `recipe_check.py` diff output, so the
trace always answers "how far did this recipe get?".

No implicit rollback: on the first divergence (device not found, parameter
name missing, readback mismatch beyond 1e-6) STOP, report the failing step,
and leave the partial build in the Set for inspection.

## Round-trip verification (the Stage-1 acceptance test)

1. Build a small Set (agent, disposable), snapshot → `A.json`.
2. User opens a fresh disposable Set.
3. Replay `A.json`; snapshot again → `B.json`.
4. `python3 tools/recipe_check.py diff A.json B.json` → exit 0
   (zero canonical differences outside documented omissions).
