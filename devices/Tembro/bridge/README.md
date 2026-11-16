# Fixed clip-variation bridge (experimental)

This package adds one finite `live_clip_variation` MCP tool to upstream
`ableton-live-mcp` commit `70f7df9192b78d9bd9405f369c9e046c88f1610e`.
It uses the existing socket client, sequential scheduler, main-thread callback,
set signature guard, and runtime validator. It does not use `exec`, `eval`, or
`batch`; it creates no second connection/control stack. Keep the tool outside
the model's tool allowlist. Only explicit Tembro controls may call it.

The package has fake-host and pinned-source integration tests. It has **not been
installed into Live or verified against a running Live process**. Patching source
files does not reload the Control Surface. Real installation/reload and a scratch
Set trial remain separate steps requiring the project's existing authorization.

## Supported boundary

Capture reads the highlighted occupied Session MIDI clip (or an explicit clip
ID), retains its actual Song/Track/Slot/Clip identities and raw notes, and returns
occupied Drum Rack pitch lanes. Create requires an explicit pitch chosen from
that capture. It verifies the original capture, duplicates into a freshly checked
empty slot on the same track, and removes alternate notes on that lane using
the duplicate's existing note IDs. Thin repeats that operation on the owned
candidate. The original clip is never mutated, renamed, stopped, or replaced.
Keep verifies and retains the exact candidate object without a Live write.

Every mutation requires `expected_set_signature`; all content and identity
checks occur in the same main-thread callback as the mutation. Status rechecks
the held snapshots without accepting intervening edits as a new baseline. Notes
are compared exactly, including `release_velocity`, probability and velocity
deviation, rather than relying on the Set signature. Metadata fields are listed
in the capability response. Recording, overdubbing, frozen tracks, automation,
grooves, incomplete attributes, missing/ambiguous Drum Rack mappings, stale
identities, and exhausted Session slots fail closed.

The documented extended-note API exposes nine scalar fields but does not expose
full per-note expression envelopes. `has_envelopes` documents clip automation;
it is not proof of the absence of MPE data. No MPE absence flag is invented here.
Raw duplication preserves the source's unexposed data and only specified note
IDs are removed from the candidate, but the package cannot certify detection of
intervening edits to invisible expression data. The response explicitly reports
`note_expression_guard: false` and the scope of `verified`.

**Discard is disabled in the shipped runtime**, returning `can_discard: false`
and an explanation. A call to discard fails without deleting anything. Keep the
candidate, or delete it manually in Live. The compare-and-delete implementation
is tested with a fully observable fake host; its source-level gate cannot be
enabled by a request parameter or environment flag. Enabling it in a future
revision requires a reliable full-content proof, new tests, and a new reviewed
runtime fingerprint. `verified: true` currently certifies the advertised note
and metadata fields, never all invisible clip content.

Audition is explicit, sends exactly one `fire()`, rejects a clip whose launch is
pending, and returns playing/triggered readback. The controller must poll status
and never resend while waiting for quantization. Create, Thin, Keep and Discard
never launch clips. Existing stop operations stay isolated and separately
verified. Transport changes are not bundled into variation operations.

## Wire contract

```json
{"action":"capture","owner_id":"session-uuid-at-least-16-chars"}
{"action":"capture","owner_id":"session-uuid-at-least-16-chars","source":{"id":1234}}
{"action":"create","owner_id":"session-uuid-at-least-16-chars","pitch":42,"expected_set_signature":"fresh-summary-signature"}
{"action":"status","owner_id":"session-uuid-at-least-16-chars"}
```

Remaining finite actions are `thin`, `audition_source`, `audition_candidate`,
`keep`, and `discard`; each requires the signature and same session owner ID.
Capture precedes lane choice; pitch is accepted only by Create. Capture can
replace an unmodified capture or a finalized session, never an owned candidate.
Owner state lasts only as long as this Remote Script runtime. Restarting does
not adopt or delete orphaned candidates.

Responses include `protocol: "tembro.clip-variation.v1"`, `action`, `owner_id`,
`state`, `verified`, `host_observed`, `set_signature`, `source`, `candidate`,
`pitch`, `lanes`, `mapping`, `audition`, `conflicts`, `requires_readback`,
`can_discard`, `discard_reason`, and `capabilities`.

Each source/candidate includes `id`, `path`, `name`, `track_name`, `note_count`,
`lane_note_count`, `notes` (all nine raw fields), `metadata`, `truncated: false`,
and a host-only `content_sha256`. At most 4096 notes per clip are accepted.
The fixed response type bypasses both generic 200-item LOM encoder branches,
so independent readback does not silently lose notes.

After each mutation, separately read `live_set_summary`, then `live_clip_notes`
with an untruncated limit and encoder controls for source/candidate. Compare
the raw note objects by note ID and all nine values. Do not recompute the Python
JSON hash in JavaScript; numeric JSON spellings can differ across runtimes.
Readback confirms the advertised note/metadata scope, not invisible MPE data.
The backend's internal readback does not replace the controller's required
independent `live_clip_notes` readback.

Sent-call timeouts, disconnects, and mismatched idle-timeout response IDs cannot
automatically retry this tool. Use `live_bridge_status`, observe recovery, then
read summary/status to classify the outcome. Partial writes do not silently
replace the guard with arbitrary observed content; incomplete outcomes preserve
clips for manual recovery.

## Reproducible pinned integration

The patcher accepts an upstream root containing `server.py`, `bridge.py`,
`validate.py`, and `Ableton_Live_MCP/bridge.py`. Every input must match the
checked-in SHA-256 value in `patch_runtime.py`; no fuzzy patching is performed.

```bash
python3 devices/Tembro/bridge/patch_runtime.py check --upstream-root /path/to/upstream
python3 devices/Tembro/bridge/patch_runtime.py diff --upstream-root /path/to/upstream
python3 devices/Tembro/bridge/patch_runtime.py apply --upstream-root /path/to/upstream
python3 devices/Tembro/bridge/patch_runtime.py revert --upstream-root /path/to/upstream
python3 devices/Tembro/bridge/patch_runtime.py export --upstream-root /path/to/upstream --output-dir /new/release-overlay
```

Check/diff are read-only. Apply first checks every source and compiles all four
outputs, stores exact originals and output hashes, then atomically replaces
files. Revert accepts only original or expected patched bytes and refuses to
overwrite unrelated edits; it also supports an interrupted apply. Backups are
retained. A repeat apply is accepted only when all four files already equal the
current patch output or all four equal the pinned baseline after a dependency
reinstall, with an intact exact original backup. Mixed/changed files or modified
backups fail closed. No command invokes Live or installs/reloads a Control Surface.

Export produces the same final four files and a SHA-256 manifest in a new output
directory while leaving the source checkout untouched. The four baseline hashes
have also been verified against GitHub's exact blobs at the pinned commit; this
is a portable patch against the pinned upstream, not a machine-specific fork.
An installer can apply the bundled patcher to the freshly installed pinned
Python package before copying the patched Remote Script; a release builder can
export the exact matching Remote Script from a clean source snapshot.

The Remote Script embeds the fixed functions directly in `bridge.py` and adds a
version suffix. Upstream's compiled-runtime fingerprint covers all guard helper
functions and the RPC method; a sidecar import cannot escape validation. The
validator also requires the new tool schema. Its existing runtime-current,
mutation-safe, M4L, and capture checks are retained without stale-runtime flags.

```bash
python3 -m unittest discover -s devices/Tembro/bridge/tests -v
TEMBRO_UPSTREAM_ROOT=/path/to/upstream python3 -m unittest discover -s devices/Tembro/bridge/tests -v
```

References: [Clip and extended-note fields](https://docs.cycling74.com/apiref/lom/clip/),
[ClipSlot duplicate operation](https://docs.cycling74.com/apiref/lom/clipslot/).
