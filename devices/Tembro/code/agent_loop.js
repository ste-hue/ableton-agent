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
]);

function safeTools(advertised) {
  const seen = new Set();
  return (advertised || [])
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

async function runAgentTurn(options) {
  const {
    api,
    client,
    message,
    liveContext,
    conversationId,
    onStatus = () => {},
    onTool = () => {},
  } = options;
  onStatus("discovering Live tools…");
  const tools = safeTools(await client.listTools());
  if (tools.length === 0) throw new Error("no safe Ableton MCP tools available");

  onStatus("thinking with " + tools.length + " Live tools…");
  let step = await api.agentStart(message, liveContext, tools, conversationId);
  let iterations = 0;
  while (step.kind === "tool_calls") {
    iterations += 1;
    if (iterations > 24) throw new Error("agent exceeded the local step limit");
    if (!step.continuation_token) throw new Error("agent response missing continuation");
    const outputs = [];
    for (const call of step.tool_calls || []) {
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
        result = await client.callTool(call.name, call.arguments || {});
        result = { ok: true, result };
        onTool("success", call, result);
      } catch (error) {
        result = {
          ok: false,
          error: error && error.message ? error.message : String(error),
        };
        onTool("error", call, result);
      }
      outputs.push({ call_id: call.call_id, output: boundedJson(result) });
    }
    onStatus("checking the result…");
    step = await api.agentContinue(
      step.continuation_token,
      step.conversation_id,
      tools,
      outputs,
    );
  }
  if (step.kind !== "final") throw new Error("agent returned an unknown state");
  return step;
}

module.exports = { SAFE_TOOL_NAMES, safeTools, boundedJson, runAgentTurn };
