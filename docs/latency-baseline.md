# Tembro client latency baseline — issue #83, first increment

## Scope

Measure the current runtime before adding shadow state, plan IR or caches. This
increment adds opt-in diagnostics to the existing Node/Max device. It does not
change the model, execution policy, tool allowlist, billing, release or deployment.
No new runtime dependencies, cloud service or database are introduced.

The initial checkpoint and sequential placement/readback logic in
`tembro_arrange_clip` remain unchanged. This is instrumentation, not a measured
speedup and not completion of #83.

## Enable in a development device

After loading a development build containing these source changes, add the boolean
`"trace_latency": true` to the existing `~/.tembro/config.json`. Preserve its other
keys. Alternatively start its Node process with `TEMBRO_TRACE_LATENCY=1`.
Configuration is read at engine startup; changing the file alone does not reload it.
Do not restart an engine or change a Live Set while another agent is driving it.

The feature is off by default. At the end of a started chat turn, the Max console
receives one JSON summary prefixed with `Tembro latency `. Nothing from this new
diagnostic is uploaded. Existing product event reporting is unchanged. Do not
replace a signed release or deploy the server to test this change.

## What the fields mean

- `elapsed_ms`: monotonic elapsed time from the start of handling a dequeued chat
  until cleanup. It excludes time spent waiting in the pending-chat queue.
- `context`: waiting for the pre-request Live context, including its local bridge
  work and timeout/stop race.
- `tool_discovery`: waiting for the client's tool list. Filtering that list is not
  timed separately.
- `cloud_start`, `cloud_continue`: complete client-observed request/response waits.
  They include transport and server work; they are **not model inference timings**.
  This client uses JSON round trips, so first-token latency is not measured.
- `local_tool`: waiting for the high-level local tool, including any internal
  macro calls/readbacks. A macro counts as one high-level call, not one LOM call.
- `encode_result`: encoding each tool output through the existing bounded JSON
  function. It does not include all HTTP request serialization.
- `result_json_bytes`: UTF-8 bytes of the bounded tool-output strings sent back
  during the turn. It is not total network traffic, prompt size or token count.

Each stage and allowlisted tool has call count, total/max wait, exception count and
`abandoned_waits`. Tool aggregates are a breakdown of `local_tool`; do not add them
to the stage totals again. UI work and other untimed overhead mean stage totals need
not equal total elapsed time. Counts retain fixed-size aggregates, not every span.

`completed` means the client turn returned normally. It does not assert that the
music sounds good, all requested effects were measured, or audio was verified.
`abandoned` means the client stopped waiting. An in-flight cloud/Live call may
still complete: no cancellation, rollback, safe-retry or exactly-once guarantee is
inferred. Watchdog finalization counts the elapsed portion of any open wait and
ignores late completions in that finished diagnostic.

No prompt, audio, tool arguments/results, parameter values, object IDs, continuation
tokens, error messages, project names or filesystem paths are retained by this
new summary. It contains only fixed stage names, allowlisted tool names, outcome
labels, counts and durations. A broken log sink must not block subsequent turns.

## Validation and next measurement

Targeted tests, without Live or external services:

```sh
cd devices/Tembro
node --test test/latency.test.js
```

For a full checkout, also run the pre-existing suite with `npm test`. Targeted
mock-boundary tests do not replace real Max/Ableton acceptance.

On a disposable authorized Set, collect the same bounded tasks with a cold and
warm bridge: read-only session question, selected-clip edit, arrangement macro.
Record machine, Live/device version, buffer size, task, result and the summary.
Compare median and tail latency across repeats, as well as high-level tool counts,
failures and whether requested changes actually appeared in Live. A faster turn
that skips safety checks or fails the task is not an improvement.

Choose the next change from the measured dominant cost: fewer cloud rounds,
smaller bounded context, supported local deterministic macros, or selected
read-only caching. Never replace mutation preflight/readback with cached state.
LOM IDs and paths need invalidation when objects or the Set change; they are not
persistent producer/project identifiers. Do not use `live_batch` or parallel Live
calls to implement the batching idea from #83.

## Adjacent work stays separate

#82 requires evidence-aware memory: no undo or absence of edits automatically
means dislike or approval. Missing observations stay unknown.

#84 can reuse `musicagent/providers/splice.ts` through a tested adapter. Its current
Markdown parsing, guessed argument construction and remote schemas need contract
tests; inspecting tool names alone is not full input-schema validation. A provider
implementation in the repository is not proof of current end-to-end service
availability. No OAuth flow, download or spending is triggered by this patch.
