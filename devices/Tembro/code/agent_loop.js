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
// Cloud waits can be abandoned promptly. Local Live calls must settle before
// releasing execution ownership, because their effects cannot be cancelled.
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
      const failure = new Error(
        "tembro_arrange_clip stopped after " +
          verified.length +
          "/" +
          destinations.length +
          " verified placements: " +
          message +
          ". Inspect Live before continuing; do not retry completed destinations.",
      );
      if (error && error.outcomeUnknown) {
        failure.outcomeUnknown = true;
        failure.code = error.code;
        failure.requestSent = error.requestSent;
        failure.quarantine = error.quarantine;
        failure.verifiedPlacements = verified;
      }
      throw failure;
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
  } = options;
  const ensureNotStopped = () => {
    if (shouldStop()) {
      const err = new Error("stopped by user");
      err.stopped = true;
      throw err;
    }
  };
  onStatus("discovering Live tools…");
  const tools = safeTools(await raceWithStop(client.listTools(), shouldStop));
  if (tools.length === 0) throw new Error("no safe Ableton MCP tools available");

  onStatus("thinking with " + tools.length + " Live tools…");
  let step = await raceWithStop(
    api.agentStart(message, liveContext, tools, conversationId, skill),
    shouldStop,
  );
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
          output: boundedJson({ ok: false, error: "tool is not allowed by Tembro" }),
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
        result = await executeTool(client, call.name, call.arguments || {}, perCallStatus, shouldStop);
        result = { ok: true, result };
        consecutiveFailures = 0;
        onTool("success", call, result);
      } catch (error) {
        // An uncertain sent call is fatal to this turn. Returning it to the
        // model as an ordinary failure could schedule duplicate mutations.
        if (error && (error.stopped || error.outcomeUnknown)) throw error;
        result = {
          ok: false,
          error: error && error.message ? error.message : String(error),
        };
        consecutiveFailures += 1;
        lastFailure = result.error;
        onTool("error", call, result);
      }
      outputs.push({ call_id: call.call_id, output: boundedJson(result) });
    }
    ensureNotStopped();
    if (consecutiveFailures >= MAX_CONSECUTIVE_TOOL_FAILURES) {
      throw new Error(
        consecutiveFailures +
          " Live calls failed in a row (last: " +
          lastFailure +
          ") — check that Ableton is open, the Set is responsive and the Tembro bridge is running, then try again",
      );
    }
    onStatus("checking the result…");
    step = await raceWithStop(
      api.agentContinue(step.continuation_token, step.conversation_id, tools, outputs),
      shouldStop,
    );
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
  raceWithStop,
  safeTools,
  boundedJson,
  runAgentTurn,
};
