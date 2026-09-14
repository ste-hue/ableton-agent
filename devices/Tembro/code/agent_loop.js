"use strict";

// Distributed agent loop: OpenAI runs on Tembro's server, while each requested
// MCP function executes locally next to Ableton. Tool results are returned to
// the server until the model emits a final reply.

const SAFE_TOOL_NAMES = new Set([
  "live_ping",
  "live_bridge_status",
  "live_get",
  "live_set_summary",
  "live_set",
  "live_call",
  "live_children",
  "live_device_parameters",
  "live_parameter_set",
  "live_clip_notes",
  "live_clip_update_notes",
  "live_clip_add_notes",
  "live_clip_duplicate_to_arrangement",
  "live_clip_envelope",
  "live_clip_velocity_envelope",
  "live_clip_warp_markers",
  "live_track_create_audio_clip",
  "live_track_insert_device",
  "live_transport",
  "live_browser_roots",
  "live_browser_capabilities",
  "live_browser_search",
  "live_browser_load",
  "live_load_device",
  "live_browser_preview",
  "find_similar_sounds",
  "live_observe",
  "live_events",
  "tembro_arrange_clip",
]);

// Safety net only: the server ends a turn at its own step budget (64) with a
// refund; this cap just keeps a misbehaving server from running the device forever.
const MAX_LOCAL_AGENT_STEPS = 72;
const MAX_ARRANGEMENT_DESTINATIONS = 32;
// A user's stop must land within this interval even while a server round or a
// Live call is in flight — the in-flight work is abandoned, like the watchdog.
const STOP_POLL_MS = 300;
// Consecutive failed Live calls before the turn gives up instead of letting
// the model spin its whole step budget against a bridge that keeps refusing.
const MAX_CONSECUTIVE_TOOL_FAILURES = 5;

function raceWithStop(promise, shouldStop) {
  if (shouldStop()) {
    const err = new Error("stopped by user");
    err.stopped = true;
    return Promise.reject(err);
  }
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (shouldStop()) {
        clearInterval(timer);
        const err = new Error("stopped by user");
        err.stopped = true;
        reject(err);
      }
    }, STOP_POLL_MS);
    promise.then(
      (value) => {
        clearInterval(timer);
        resolve(value);
      },
      (error) => {
        clearInterval(timer);
        reject(error);
      },
    );
  });
}

const TEMBRO_ARRANGE_CLIP_TOOL = {
  name: "tembro_arrange_clip",
  description:
    "Place one Session clip at multiple Arrangement times. Tembro executes every placement sequentially, refreshes the set signature, and verifies the new Arrangement clip before continuing.",
  inputSchema: {
    type: "object",
    properties: {
      track: {
        type: "object",
        properties: { path: { type: "string" }, id: { type: "integer" } },
        additionalProperties: false,
      },
      clip: {
        type: "object",
        properties: { path: { type: "string" }, id: { type: "integer" } },
        additionalProperties: false,
      },
      destination_times: {
        type: "array",
        minItems: 1,
        maxItems: MAX_ARRANGEMENT_DESTINATIONS,
        items: { type: "number", minimum: 0 },
      },
      expected_set_signature: { type: "string" },
    },
    required: ["track", "clip", "destination_times", "expected_set_signature"],
    additionalProperties: false,
  },
};

function safeTools(advertised) {
  const seen = new Set();
  const safe = (advertised || [])
    .filter((tool) => {
      const allowed =
        tool &&
        SAFE_TOOL_NAMES.has(tool.name) &&
        !seen.has(tool.name) &&
        tool.inputSchema &&
        tool.inputSchema.type === "object";
      if (allowed) seen.add(tool.name);
      return allowed;
    })
    .map((tool) => {
      return {
        name: tool.name,
        description: String(tool.description || "").slice(0, 2000),
        inputSchema: tool.inputSchema,
      };
    });
  if (
    seen.has("live_clip_duplicate_to_arrangement") &&
    seen.has("live_set_summary") &&
    seen.has("live_get")
  ) {
    safe.push(TEMBRO_ARRANGE_CLIP_TOOL);
  }
  return safe;
}

function boundedJson(value, limit) {
  let text;
  try {
    text = JSON.stringify(value);
  } catch {
    text = JSON.stringify({ ok: false, error: "tool result was not serializable" });
  }
  const max = limit || 90_000;
  if (text.length <= max) return text;
  return JSON.stringify({
    ok: false,
    error: "tool result exceeded Tembro's transfer limit",
    preview: text.slice(0, max - 200),
  });
}

function completionReply(reply) {
  const text = String(reply || "").trim();
  if (/^ho finito\b/i.test(text)) return text;
  const normalized = text.replace(
    /^fatto e verificato\b/i,
    "lavoro completato e verificato",
  );
  const detail = normalized
    .replace(/^(ho fatto|fatto|completato|i have finished|i've finished|done|finished)\s*[—:.,-]?\s*/i, "")
    .trim();
  return "Ho finito — " + (detail || "lavoro completato e verificato in Live.");
}

function arrangementClipIds(summary) {
  const ids = new Set();
  for (const track of (summary && summary.tracks) || []) {
    for (const clip of track.arrangement_clips || []) {
      if (clip && Number.isInteger(clip.id)) ids.add(clip.id);
    }
  }
  return ids;
}

function validRef(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      ((typeof value.path === "string" && value.path.length > 0) ||
        Number.isInteger(value.id)),
  );
}

async function arrangeClip(client, args, onStatus = () => {}, shouldStop = () => false) {
  args = args || {};
  if (!validRef(args && args.track) || !validRef(args && args.clip)) {
    throw new Error("tembro_arrange_clip requires valid track and clip references");
  }
  const destinations = args.destination_times;
  if (
    !Array.isArray(destinations) ||
    destinations.length === 0 ||
    destinations.length > MAX_ARRANGEMENT_DESTINATIONS ||
    destinations.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error("tembro_arrange_clip received invalid destination times");
  }
  if (new Set(destinations).size !== destinations.length) {
    throw new Error("tembro_arrange_clip destination times must be unique");
  }
  let signature = String(args.expected_set_signature || "");
  if (!signature) {
    throw new Error("tembro_arrange_clip requires expected_set_signature");
  }

  const summaryArgs = {
    track_limit: 128,
    clip_slot_limit: 0,
    device_limit: 0,
    arrangement_clip_limit: 512,
    detail: false,
  };
  let summary = await client.callTool("live_set_summary", summaryArgs);
  if (!summary || typeof summary.set_signature !== "string") {
    throw new Error("tembro_arrange_clip could not read the Live Set signature");
  }
  if (summary.set_signature !== signature) {
    throw new Error("Live Set changed before arrangement placement; inspect it again");
  }
  let knownIds = arrangementClipIds(summary);
  const verified = [];

  for (let index = 0; index < destinations.length; index += 1) {
    // Stop must interrupt the macro itself, not just abandon its promise:
    // otherwise placements keep landing minutes after the user saw "stopped".
    if (shouldStop()) {
      const err = new Error(
        "stopped during arrangement after placing " +
          verified.length +
          " of " +
          destinations.length +
          " clips",
      );
      err.stopped = true;
      throw err;
    }
    const destination = destinations[index];
    onStatus(
      "arranging clip " + (index + 1) + "/" + destinations.length + "…",
    );
    try {
      await client.callTool("live_clip_duplicate_to_arrangement", {
        track: args.track,
        clip: args.clip,
        destination_time: destination,
        expected_set_signature: signature,
      });
      summary = await client.callTool("live_set_summary", summaryArgs);
      if (!summary || typeof summary.set_signature !== "string") {
        throw new Error("missing set signature after placement");
      }
      const nextIds = arrangementClipIds(summary);
      const newIds = [...nextIds].filter((id) => !knownIds.has(id));
      if (newIds.length !== 1) {
        throw new Error("could not identify exactly one new Arrangement clip");
      }
      const readback = await client.callTool("live_get", {
        ref: { id: newIds[0] },
        properties: [
          "name",
          "start_time",
          "end_time",
          "length",
          "is_arrangement_clip",
        ],
        child_limit: 0,
        detail: false,
      });
      const properties = (readback && readback.properties) || {};
      const actualStart = Number(properties.start_time);
      const actualEnd = Number(properties.end_time);
      if (
        !properties.is_arrangement_clip ||
        !Number.isFinite(actualStart) ||
        !Number.isFinite(actualEnd) ||
        actualEnd <= actualStart ||
        Math.abs(actualStart - destination) > 0.001
      ) {
        throw new Error(
          "Arrangement readback did not match destination " + destination,
        );
      }
      verified.push({
        destination_time: destination,
        clip_id: newIds[0],
        start_time: actualStart,
        end_time: actualEnd,
      });
      signature = summary.set_signature;
      knownIds = nextIds;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      throw new Error(
        "tembro_arrange_clip stopped after " +
          verified.length +
          "/" +
          destinations.length +
          " verified placements: " +
          message +
          ". Inspect Live before continuing; do not retry completed destinations.",
      );
    }
  }

  return {
    placed: verified.length,
    verified,
    set_signature: signature,
  };
}

async function executeTool(client, name, args, onStatus, shouldStop = () => false) {
  if (name === "tembro_arrange_clip") {
    return arrangeClip(client, args || {}, onStatus, shouldStop);
  }
  return client.callTool(name, args || {});
}

// Opt-in client-side diagnostics, outside the audio callback. Only fixed stage
// names, allowlisted tool names, counters and durations are retained. These are
// client-observed waits: a cloud wait is NOT a measurement of model inference.
const LATENCY_STAGES = new Set([
  "context", "tool_discovery", "cloud_start", "cloud_continue", "local_tool", "encode_result",
]);

function createLatencyTrace({ now = () => require("perf_hooks").performance.now() } = {}) {
  const startedAt = now();
  const stages = new Map();
  const tools = new Map();
  const pending = new Set();
  let outputBytes = 0;
  let finished = null;
  const newStats = () => ({ calls: 0, wait_ms: 0, max_wait_ms: 0, errors: 0, abandoned_waits: 0 });
  function record(map, key, elapsed, status) {
    const stats = map.get(key) || newStats();
    stats.calls += 1;
    stats.wait_ms += elapsed;
    stats.max_wait_ms = Math.max(stats.max_wait_ms, elapsed);
    if (status === "error") stats.errors += 1;
    if (status === "abandoned") stats.abandoned_waits += 1;
    map.set(key, stats);
  }
  function begin(stage, tool) {
    // Unknown names cannot turn diagnostics into an unbounded payload store.
    if (finished || !LATENCY_STAGES.has(stage)) return () => {};
    const start = now();
    let ended = false;
    const end = (status, at = now()) => {
      if (ended || finished) return;
      ended = true;
      pending.delete(end);
      const elapsed = Math.max(0, at - start);
      record(stages, stage, elapsed, status);
      if (stage === "local_tool" && SAFE_TOOL_NAMES.has(tool)) {
        record(tools, tool, elapsed, status);
      }
    };
    pending.add(end);
    return end;
  }
  const statusOf = (error) => error && error.stopped ? "abandoned" : "error";
  const rounded = (n) => Math.round(n * 1000) / 1000;
  function snapshot(map) {
    return Object.freeze(Object.fromEntries([...map].map(([key, value]) => [
      key,
      Object.freeze({ ...value, wait_ms: rounded(value.wait_ms), max_wait_ms: rounded(value.max_wait_ms) }),
    ])));
  }
  return {
    async measure(stage, work, tool) {
      const end = begin(stage, tool);
      try {
        const result = await work();
        end("ok");
        return result;
      } catch (error) {
        end(statusOf(error));
        throw error;
      }
    },
    measureSync(stage, work) {
      const end = begin(stage);
      try {
        const result = work();
        end("ok");
        return result;
      } catch (error) {
        end(statusOf(error));
        throw error;
      }
    },
    addOutputBytes(bytes) {
      if (!finished && Number.isSafeInteger(bytes) && bytes >= 0) {
        outputBytes = Math.min(Number.MAX_SAFE_INTEGER, outputBytes + bytes);
      }
    },
    finish(outcome) {
      if (finished) return finished;
      const at = now();
      // A watchdog can finish the UI while a promise is still in flight. Count
      // only the wait observed so far; never claim the underlying call stopped.
      for (const end of [...pending]) end("abandoned", at);
      finished = Object.freeze({
        schema_version: 1,
        scope: "client_wait",
        outcome: ["completed", "failed", "abandoned"].includes(outcome) ? outcome : "failed",
        elapsed_ms: rounded(Math.max(0, at - startedAt)),
        stages: snapshot(stages),
        tools: snapshot(tools),
        result_json_bytes: outputBytes,
      });
      return finished;
    },
  };
}

async function runAgentTurn(options) {
  const {
    api,
    client,
    message,
    skill,
    liveContext,
    conversationId,
    onStatus = () => {},
    onTool = () => {},
    onStep = () => {},
    shouldStop = () => false,
    latency = null,
  } = options;
  const measure = (stage, work, tool) => latency ? latency.measure(stage, work, tool) : work();
  const encodeResult = (result) => {
    if (!latency) return boundedJson(result);
    const text = latency.measureSync("encode_result", () => boundedJson(result));
    latency.addOutputBytes(Buffer.byteLength(text, "utf8"));
    return text;
  };
  const ensureNotStopped = () => {
    if (shouldStop()) {
      const err = new Error("stopped by user");
      err.stopped = true;
      throw err;
    }
  };
  onStatus("discovering Live tools…");
  const tools = safeTools(await measure("tool_discovery", () => raceWithStop(client.listTools(), shouldStop)));
  if (tools.length === 0) throw new Error("no safe Ableton MCP tools available");

  onStatus("thinking with " + tools.length + " Live tools…");
  let step = await measure("cloud_start", () => raceWithStop(
    api.agentStart(message, liveContext, tools, conversationId, skill),
    shouldStop,
  ));
  let iterations = 0;
  let consecutiveFailures = 0;
  let lastFailure = null;
  while (step.kind === "tool_calls") {
    ensureNotStopped();
    iterations += 1;
    if (iterations > MAX_LOCAL_AGENT_STEPS) {
      throw new Error(
        "agent could not finish within " + MAX_LOCAL_AGENT_STEPS + " Live steps",
      );
    }
    onStep(iterations, MAX_LOCAL_AGENT_STEPS);
    if (!step.continuation_token) throw new Error("agent response missing continuation");
    const outputs = [];
    for (const call of step.tool_calls || []) {
      ensureNotStopped();
      const allowed = SAFE_TOOL_NAMES.has(call.name) && tools.some((tool) => tool.name === call.name);
      if (!allowed) {
        outputs.push({
          call_id: call.call_id,
          output: encodeResult({ ok: false, error: "tool is not allowed by Tembro" }),
        });
        continue;
      }
      onStatus("Live · " + call.name.replace(/^live_/, "").replace(/_/g, " ") + "…");
      onTool("start", call);
      let result;
      try {
        // Long macros (tembro_arrange_clip) report per-placement progress:
        // surface it on the trace row too, not only in the status line.
        const perCallStatus = (note) => {
          onStatus(note);
          onTool("progress", call, { note });
        };
        result = await measure("local_tool", () => raceWithStop(
          executeTool(client, call.name, call.arguments || {}, perCallStatus, shouldStop),
          shouldStop,
        ), call.name);
        result = { ok: true, result };
        consecutiveFailures = 0;
        onTool("success", call, result);
      } catch (error) {
        if (error && error.stopped) throw error;
        result = {
          ok: false,
          error: error && error.message ? error.message : String(error),
        };
        consecutiveFailures += 1;
        lastFailure = result.error;
        onTool("error", call, result);
      }
      outputs.push({ call_id: call.call_id, output: encodeResult(result) });
    }
    if (consecutiveFailures >= MAX_CONSECUTIVE_TOOL_FAILURES) {
      throw new Error(
        consecutiveFailures +
          " Live calls failed in a row (last: " +
          lastFailure +
          ") — check that Ableton is open, the Set is responsive and the Tembro bridge is running, then try again",
      );
    }
    onStatus("checking the result…");
    step = await measure("cloud_continue", () => raceWithStop(
      api.agentContinue(step.continuation_token, step.conversation_id, tools, outputs),
      shouldStop,
    ));
  }
  if (step.kind !== "final") throw new Error("agent returned an unknown state");
  return step;
}

module.exports = {
  SAFE_TOOL_NAMES,
  MAX_LOCAL_AGENT_STEPS,
  TEMBRO_ARRANGE_CLIP_TOOL,
  arrangeClip,
  completionReply,
  createLatencyTrace,
  raceWithStop,
  safeTools,
  boundedJson,
  runAgentTurn,
};
