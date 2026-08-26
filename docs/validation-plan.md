# Ableton Agent validation plan

Status: ready through the offline gates; real-Live gates blocked until Ableton Live is installed manually

## Observable success criterion

The experiment passes only when a natural-language instruction to an MCP-capable LLM produces a recorded, user-approved tool trace that demonstrates all of the following against the same disposable Live Set:

1. the LLM connects to the pinned upstream MCP server;
2. the MCP server connects to the currently loaded `Ableton_Live_MCP` Remote Script;
3. the LLM reads the current Live Set;
4. it creates one MIDI track named `Agent Test` at the end of the Set;
5. it creates one 16-beat Session MIDI clip, equal to four bars in an asserted 4/4 Set;
6. it inserts exactly three sustained MIDI notes: 60, 63, and 67;
7. it reads the clip back through Live's extended note API and matches the canonical notes;
8. it launches the clip and observes playback;
9. it stops clip and transport and observes the stopped state;
10. it calls Live's undo once and observes what last persistent operation changed;
11. it reports evidence and uncertainties without silently retrying any mutation.

An exit code, a successful MCP initialization, a screenshot, or an LLM statement by itself does not satisfy this criterion.

## Current gate status

| Gate | Status | Evidence or blocker |
| --- | --- | --- |
| Repository and environment inspection | Passed | Empty local repository inspected; required developer tools enumerated. |
| Upstream source inspection | Passed | Pinned commit inspected outside this repository; active MCP and bridge paths traced. |
| Upstream non-Live tests | Passed | Fresh run required before implementation handoff; earlier discovery run produced 266 passes with 19 validation tests deselected. |
| Local-only upstream validation | Passed with explicit exemptions | Schemas were current. Missing Remote Script, M4L host, and Quartz were allowed because Live is absent and those features are outside this milestone. |
| Ableton application installed | Blocked | Ableton Live was not found on this Mac. |
| Remote Script installed and loaded | Blocked | Requires Ableton installation and a user-approved copy into the Ableton User Library. |
| Real-Live read-only connection | Blocked | Requires Live running with the Control Surface loaded. |
| Real-Live mutation and readback | Blocked | Requires explicit authorization for a disposable Set. |
| LLM-driven end-to-end run | Blocked | Depends on all prior gates. |

## Gate A: manual Ableton installation

Codex will not install, purchase, authorize, or launch Ableton without explicit user action or approval.

The user must install:

1. **Ableton Live 12 Suite**, using either an owned license or the current official Suite trial.
2. Download the macOS installer from the Ableton account or trial page.
3. Open the downloaded `.dmg`.
4. Drag `Ableton Live 12 Suite.app` into `/Applications`.
5. Launch Live and complete Ableton's authorization or trial activation.
6. Confirm Live can open a new Set normally, with no warning or recovery dialog.

Why Suite: upstream states it was tested with Live Suite 12.3.8, and Suite also keeps Max for Live available for a later milestone. This is not a claim that only that exact version can work; the installed version must be recorded and validated.

Official references:

- [Ableton installation instructions](https://help.ableton.com/hc/en-us/articles/209773565-Installing-Ableton-Live)
- [Ableton Live Suite trial](https://www.ableton.com/en/trial/)
- [Live minimum system requirements](https://help.ableton.com/hc/en-us/articles/115001663530-Live-Minimum-System-Requirements)

Pass condition:

```text
exactly one Ableton Live 12 application bundle is present in /Applications
```

and the user confirms that Live opens a new Set without a blocking dialog.

## Gate B: reproducible upstream runtime

This gate is planned but not yet executed. It downloads and installs an external Python package, so it requires user approval first.

Proposed commands from this repository:

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python \
  "ableton-live-mcp @ git+https://github.com/bschoepke/ableton-live-mcp.git@70f7df9192b78d9bd9405f369c9e046c88f1610e"
```

Pass conditions:

```bash
.venv/bin/python --version
.venv/bin/ableton-live-mcp-install-remote-script --list
.venv/bin/ableton-live-mcp --help
```

The Python version must be 3.12.x, the installer must list `Ableton_Live_MCP`, and the executables must resolve from this repository's virtual environment. The installed distribution metadata and source commit are recorded in the evidence bundle.

No editable install or runtime dependency on the temporary inspection clone is allowed.

## Gate C: Remote Script installation

This gate writes outside the repository to the Ableton User Library and therefore requires explicit approval.

With Live closed, run:

```bash
.venv/bin/ableton-live-mcp-install-remote-script --update
```

Expected target:

```text
~/Music/Ableton/User Library/Remote Scripts/Ableton_Live_MCP
```

Then the user must:

1. start Ableton Live;
2. open **Live > Settings > Link, Tempo & MIDI**;
3. select `Ableton_Live_MCP` in a Control Surface row;
4. leave Input and Output as `None` unless Live requires another value;
5. close Settings and wait for Live to settle;
6. restart Live if the Control Surface does not load after installation.

Official reference: [Installing third-party Remote Scripts](https://help.ableton.com/hc/en-us/articles/209072009-Installing-third-party-remote-scripts).

Pass conditions:

- `Ableton_Live_MCP` is visible and selected as a Control Surface;
- Live has no Remote Script warning modal;
- a process is listening on loopback port 8765 while Live is running;
- stopping Live removes the listener.

The last two checks confirm process ownership and lifetime; they do not yet prove runtime fingerprint parity.

## Gate D: installed/runtime parity and bridge health

Run the upstream validator from the pinned environment:

```bash
.venv/bin/ableton-live-mcp-validate \
  --allow-stale-m4l-host \
  --allow-missing-visual-capture \
  --timeout 45
```

The M4L and visual exemptions are intentional because neither capability belongs to this milestone. Do not use `--skip-live` and do not use `--allow-stale-remote-script` for this gate.

Pass conditions in the validator's JSON:

```json
{
  "mcp_tools": {"ok": true},
  "remote_script": {
    "installed_files_current": true,
    "runtime_current": true,
    "live_mutations_safe": true,
    "loaded_runtime_state": "current"
  }
}
```

The `ping`, `song`, and `application` checks must also be present without an error. Preserve the complete JSON output.

If this gate fails, do not mutate Live. A stale loaded script requires an explicitly authorized Control Surface reload or Live restart, followed by the complete gate again.

## Gate E: project-scoped Codex MCP configuration

Codex is the primary LLM host. Official Codex documentation supports STDIO MCP servers in a trusted project's `.codex/config.toml`, an `enabled_tools` allowlist, and prompt-based approvals.

The implementation will add a configuration equivalent to:

```toml
[mcp_servers.ableton_live]
command = "/Users/stefanodellapietra/dev/Projects/ableton-agent/.venv/bin/ableton-live-mcp"
cwd = "/Users/stefanodellapietra/dev/Projects/ableton-agent"
startup_timeout_sec = 20
tool_timeout_sec = 45
enabled = true
required = false
default_tools_approval_mode = "prompt"
enabled_tools = [
  "live_ping",
  "live_bridge_status",
  "live_get",
  "live_set_summary",
  "live_set",
  "live_call",
  "live_clip_add_notes",
  "live_clip_notes",
  "live_transport",
]
```

`required` remains false so opening this project while Live is closed does not make the Codex host unusable. Every tool stays in prompt mode because `live_call` and `live_set` are generic mutation surfaces.

After adding the configuration, restart the local Codex host. Then run:

```bash
codex --version
codex mcp list
```

and inspect `/mcp` in the local Codex interface.

Pass conditions:

- `ableton_live` initializes as a STDIO MCP server;
- host diagnostics identify the Codex client version and upstream `serverInfo` as `ableton-live-mcp` version `0.1.1` with the tools capability;
- only the nine allowlisted tools are model-visible;
- `live_exec`, `live_eval`, `live_batch`, device/browser/audio/M4L tools are absent;
- `live_ping` reports the same loaded Remote Script fingerprint accepted by Gate D.

Official reference: [Codex Model Context Protocol configuration](https://developers.openai.com/codex/mcp).

## Gate F: disposable Live Set preflight

This gate is read-only until the user authorizes the mutation run.

User preparation:

1. create a new Live Set;
2. do not open a valuable or existing `.als` file;
3. do not save the Set;
4. ensure no clips are playing or recording;
5. keep Live visible and responsive;
6. explicitly authorize creation of the test track and clip.

The LLM then calls, sequentially:

1. `live_ping`;
2. `live_bridge_status`;
3. `live_set_summary` with limits large enough to include every current track and at least Session slot 0;
4. `live_transport` with `action: "status"`;
5. `live_get` on `live_set` for `file_path`, `can_undo`, `signature_numerator`, `signature_denominator`, and `clip_trigger_quantization`.

Preflight pass conditions:

- validator parity from Gate D is still current;
- the Set is 4/4;
- `file_path` is empty, proving the test is not targeting a saved Set;
- at least one Session scene exists;
- global clip-trigger quantization is `None`, `1 Bar`, or a subdivision shorter than one bar; values of `8 Bars`, `4 Bars`, or `2 Bars` are rejected for this bounded playback check;
- transport is stopped;
- no track named `Agent Test` exists;
- scene 0 and an empty slot 0 will be available on the new track;
- no modal or UI stall is visible;
- the initial complete summary and `set_signature` are preserved.

If the Set is not 4/4, the transport is running, `Agent Test` already exists, or a target cannot be proven empty, stop and ask the user. Do not silently normalize the Set.

## Gate G: fixed LLM end-to-end scenario

The user gives Codex this fixed intent in natural language:

> In the open disposable Ableton Live Set, inspect first. Then create one MIDI track at the end named “Agent Test”, create a four-bar Session clip in slot 0, add one sustained C minor triad using MIDI pitches 60, 63, and 67 for the full four bars at velocity 100, read the notes back and verify them, play the clip, stop it, call undo once, and report exact evidence. Ask for approval for every mutation. Never retry a timed-out mutation.

The model may select tools, but it may not reinterpret the fixture.

### G1. Create and identify the track

Call:

```json
{
  "tool": "live_call",
  "arguments": {
    "ref": {"path": "live_set"},
    "method": "create_midi_track",
    "args": [-1],
    "expected_set_signature": "<latest-signature>"
  }
}
```

Then call `live_set_summary` again. The pass condition is exactly one additional MIDI track at the final index. Derive its canonical path from that new summary; do not retain an object ID.

### G2. Name the track

Call `live_set` on the discovered track path with property `name`, value `Agent Test`, and the latest signature. Read the Set again.

Pass condition: exactly one track has the exact case-sensitive name `Agent Test`, at the expected new index. Before creating the clip, use `live_get` on slot 0 and require `has_clip == false`.

### G3. Create the clip and insert notes

Target the new track's Session slot 0 and call `live_clip_add_notes` once:

```json
{
  "ref": {"path": "live_set tracks <index> clip_slots 0"},
  "create_clip_length": 16.0,
  "clip_name": "Agent Test - C minor",
  "fire": false,
  "replace_existing_clip": false,
  "expected_set_signature": "<latest-signature>",
  "notes": [
    {"pitch": 60, "start_time": 0.0, "duration": 16.0, "velocity": 100, "mute": false},
    {"pitch": 63, "start_time": 0.0, "duration": 16.0, "velocity": 100, "mute": false},
    {"pitch": 67, "start_time": 0.0, "duration": 16.0, "velocity": 100, "mute": false}
  ]
}
```

Immediate response pass conditions:

- `note_api == "extended"`;
- `added == 3`;
- `created_clip == true`;
- `replaced_clip == false`;
- `launched == false`;
- `legacy_note_api == false`;
- `note_count == 3`;
- clip name and length are correct.

### G4. Read back and compare

Call `live_clip_notes` on:

```text
live_set tracks <index> clip_slots 0 clip
```

Canonicalize both expected and actual notes to these fields, sorted by pitch, start, duration, velocity, and mute:

```text
(pitch, start_time, duration, velocity, mute)
```

Ignore generated `note_id` values and read-only expressive defaults. Numeric time and velocity comparisons use a tolerance of `1e-6` only to accommodate Live's numeric representation.

Pass conditions:

- `note_api == "extended"`;
- `note_count == 3`;
- `truncated == false`;
- the canonical actual list equals the canonical expected list;
- clip length, loop start, and loop end are `16.0`, `0.0`, and `16.0` respectively.

The test fails on extra notes, missing notes, transposed pitches, shortened durations, mute changes, legacy API use, or truncation.

### G5. Play and observe

After successful readback, call `live_call` on the clip slot with method `fire`, no arguments, and the latest Set signature. Do not combine launch with note creation.

Read the Set's current `clip_trigger_quantization` during preflight. Reject global launch settings longer than one bar for this deterministic fixture. Poll sequentially with bounded read-only calls for at least the configured launch-quantization duration plus three seconds, capped at the 45-second validation timeout:

- `live_get` on the clip for `is_playing`, `is_triggered`, and `playing_position` where supported;
- `live_transport` with `action: "status"`.

Pass condition: the clip reports `is_playing == true`, and Live transport reports a settled playing state. If launch quantization delays playback, polling may continue within the bound; no second `fire` call is allowed. The new MIDI track has no instrument, so audible sound is not an acceptance condition.

### G6. Stop and observe

Call `live_call` on the clip slot with method `stop` and the latest Set signature, then call `live_transport` with `action: "stop"`. Poll status until settled or until the same bounded observation window expires.

Pass conditions:

- the clip is neither playing nor triggered;
- transport reports `playing == false`;
- a follow-up status does not report an unsettled optimistic result.

### G7. Undo and observe

Before undo, call `live_get` on `live_set` for `can_undo` and require it to be true. Capture the Set summary and clip readback.

Then call exactly once:

```json
{
  "tool": "live_call",
  "arguments": {
    "ref": {"path": "live_set"},
    "method": "undo",
    "args": [],
    "expected_set_signature": "<latest-signature>"
  }
}
```

After Live settles, re-read the Set and the target if it still exists.

Pass condition: `can_redo == true`, at least one persistent aspect of the immediately preceding test state is observably reversed, and the LLM states exactly what changed. Examples include the clip disappearing, its notes changing, its name changing, the track name reverting, or the track disappearing.

Do not claim that one undo restores the complete original Set. The upstream call sequence is not transactional, and the official Live Object Model defines `undo` as undoing the last operation. Do not issue extra undo calls during acceptance; close the disposable Set without saving after explicit user authorization.

## Unknown-outcome and failure protocol

For any timeout after a request was sent:

1. label the operation `UNKNOWN`, not failed;
2. do not automatically retry;
3. use only `live_bridge_status` during the cooldown;
4. re-inspect the target through a canonical path after the bridge is responsive;
5. record whether the requested state exists;
6. stop the run if the state still cannot be proven.

The upstream client also retries one generic socket `OSError`. Because an EOF or reset could theoretically arrive after bytes were sent, the experiment does not claim exactly-once mutation delivery. Every track creation, rename, clip insertion, launch, stop, and undo is reconciled by reading the authoritative Live state; an observed duplicate is a failure and a concrete upstream issue, not something to hide during cleanup.

For connection refusal before a request is sent, verify Live is running and the Control Surface is selected. Restarting Live or reloading the script still requires user approval.

Other hard failures:

- any warning or modal dialog;
- an occupied target slot;
- `runtime_current` or `live_mutations_safe` not true;
- a legacy MIDI note API;
- a stale or truncated readback;
- parallel or overlapping Live requests;
- an LLM request for a tool outside the allowlist;
- any attempt to use `live_exec`, `live_eval`, or blind retries.

## Evidence bundle

Store one timestamped run record containing:

- macOS and hardware architecture;
- Ableton edition and exact version;
- upstream URL, full commit SHA, and distribution version;
- Python version and executable path;
- installed, source, and loaded Remote Script hashes;
- complete validator JSON;
- Codex MCP server listing and visible tool names;
- original natural-language instruction;
- ordered tool-call transcript with approvals, arguments, results, and timestamps;
- initial and final Set summaries;
- expected and actual canonical note lists;
- play and stop observations;
- pre-undo and post-undo observations;
- any timeout, modal, warning, or manual intervention;
- final result: `PASS`, `FAIL`, or `UNKNOWN` with the failed gate.

Do not include credentials, unrelated global Codex configuration, or content from any non-disposable Live Set.

## Cleanup

Cleanup is intentionally manual and recoverable:

1. verify transport is stopped;
2. ask the user for permission to close the disposable Set;
3. choose **Don't Save** only after explicit confirmation;
4. leave the Remote Script installed for repeat validation unless the user asks to remove it.

The validation procedure never deletes tracks or clips merely to make a run appear clean.
