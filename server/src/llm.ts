import type {
  ActionPlan,
  AgentToolCall,
  AgentToolOutput,
  LiveContext,
  McpTool,
  Message,
} from "./types.js";
import { ActionPlanSchema } from "./types.js";
import { MUSICAL_KNOWLEDGE } from "./knowledge.js";

// ---------------------------------------------------------------------------
// LLM gateway — the product is not tied to one model. The current agent uses
// Responses function calls in a bounded server ↔ local MCP loop. The legacy
// JSON planner stays available only for v0.1.0 clients during the beta upgrade.
// ---------------------------------------------------------------------------

export interface LlmResult {
  reply: string;
  actions: ActionPlan;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
  };
}

export interface LlmProvider {
  complete(messages: Message[], liveContext?: LiveContext): Promise<LlmResult>;
}

export interface AgentStepRequest {
  messages?: Message[];
  liveContext?: LiveContext;
  tools: McpTool[];
  previousResponseId?: string;
  toolOutputs?: AgentToolOutput[];
  /** Composition-priced turns (2+ credits) buy deep thinking; chat stays medium. */
  reasoningEffort?: "medium" | "high";
}

export interface AgentStepResult {
  responseId: string;
  reply: string;
  toolCalls: AgentToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
  };
}

export interface AgentProvider {
  step(request: AgentStepRequest): Promise<AgentStepResult>;
}

const AGENT_OUTPUT_TOKEN_BUDGET = 32_000;
// High reasoning effort spends part of the output budget on thinking tokens:
// give deep turns headroom so plans are not truncated mid-thought.
const AGENT_DEEP_OUTPUT_TOKEN_BUDGET = 48_000;
const AGENT_RECOVERY_OUTPUT_TOKEN_BUDGET = 64_000;

const AGENT_OUTPUT_RECOVERY_INSTRUCTIONS = `Output recovery rules:
- The previous model output was incomplete or contained malformed function arguments.
- Return exactly one compact, valid function call or a short final reply.
- Never emit more than 128 MIDI notes in one live_clip_add_notes call. Split larger note sets across later calls.
- Never encode a long arrangement as one giant note array. Build short reusable clips and place them with tembro_arrange_clip when available, otherwise live_clip_duplicate_to_arrangement.`;

export const SYSTEM_PROMPT = `You are Tembro, a music agent operating Ableton Live for a musician.
You receive the current Live Set context and the conversation. Respond with:
1. "reply": one short sentence in the user's language describing what you are doing.
2. "actions": a JSON array of LOM operations from the allowed set
   (set_tempo, create_midi_track, load_device, create_clip, replace_notes,
   fire_clip, fire_scene, stop_all, undo).
Rules: new MIDI tracks are silent until a device is loaded — always load an
instrument before adding notes to a new track. Notes use beats, pitches 0-127.
Clip lengths use Ableton's quarter-note beat unit: N bars = N x numerator x
(4 / denominator) beats (e.g. 4 bars in 4/4 = 16 beats; 4 bars in 6/8 = 12
beats). When the context includes a
selected clip (selection.clip with its notes), modification requests target
that exact clip: emit replace_notes for selection.track/selection.slot and do
NOT create a new track or clip. Preserve the clip's role and length unless
asked otherwise. Prefer modifying what exists over creating duplicates. Keep
plans short.`;

export const AGENT_SYSTEM_PROMPT = `You are Tembro, an expert music-making agent operating the user's currently open Ableton Live Set through MCP tools.

Work like a capable studio collaborator, not a JSON planner. Inspect Live, use the available tools, read each result, and continue until the musical request is actually complete. Reply in the user's language.

Safety and execution rules:
- Use only the supplied MCP tools and their schemas. Never invent a tool or argument.
- All Live calls are sequential. Make one tool call at a time.
- Before the first mutation, call live_ping and live_set_summary. Confirm the bridge is current and mutations are safe. Record the latest set_signature.
- Pass expected_set_signature on every persistent mutation that supports it. Re-read live_set_summary after each persistent mutation and use the fresh signature for the next mutation.
- Read back the affected object after every mutation. Notes must be verified with live_clip_notes.
- A timed-out mutation has an unknown outcome: do not retry it. Inspect bridge status and read Live state before deciding what happened.
- Never use arbitrary-code or generic batch execution. Those tools are intentionally unavailable. tembro_arrange_clip is the one approved local arrangement macro: it still performs every placement sequentially with signature refresh and readback.
- Work in an unsaved disposable Set by default. If the Set is saved, do not alter existing material unless the user explicitly asked you to.
- Do not save, close, replace, or discard a Set. Do not click through modal dialogs.
- Prefer creating a variation over destroying existing musical work.

Step budget — this matters:
- You have at most 88 model/tool rounds per turn. Plan them: one live_set_summary tells you almost everything; do not poll state in a loop, and never repeat a call that just failed with the same arguments.
- If a property read fails, the property does not exist on that object. Do not retry it elsewhere blind — consult the facts below.

Live Object Model facts (these prevent wasted, failing calls):
- Track objects have NO volume, pan, or meter properties. Mixer values live on the track's mixer_device: its "volume" and "panning" are DeviceParameter children (read their "value"). Output meters are output_meter_left / output_meter_right on the Track, but only while audio is actually playing — do not use meters to decide whether something is audible; check devices and clip playing state instead.
- Session music is heard by FIRING clips or scenes (call "fire" on a ClipSlot, Clip, or Scene), then verifying the clip's is_playing is true. Starting the transport (live_transport play/continue) plays the ARRANGEMENT, which is usually empty in session workflows — it does not launch session clips.
- A bare Drum Rack has empty pads and makes NO sound. Load a full drum kit preset (browser search for a kit, e.g. a "Kit" preset) or load samples into pads; verify the rack has chains before writing drum notes.
- Clip slots: a track's clip_slots N has_clip tells you where clips are; the clip object is clip_slots N clip.
- Object ids can change between sessions; resolve fresh ids from live_set_summary rather than reusing remembered ones.

Musical rules:
- Translate ordinary musical language into concrete Live operations.
- A new MIDI track is silent until an instrument or Drum Rack is loaded. Search/load a suitable stock Live device or preset and verify it appears before adding notes.
- For drums, use a Drum Rack or an appropriate stock drum preset, write a playable MIDI pattern, verify the notes, and launch it only when the user asked to hear it.
- Keep note payloads compact: live_clip_add_notes must contain at most 128 notes. If a clip needs more, add the notes in multiple sequential calls and verify each chunk.
- Build long arrangements from reusable 4- or 8-bar source clips. For a 128-bar song, place short source clips with tembro_arrange_clip when it is supplied; pass every destination for the same unchanged clip in one call. Fall back to live_clip_duplicate_to_arrangement only when the macro is unavailable. Create only the variations or fills that actually differ. Never generate 128 bars as one giant MIDI-note array.
- Before placing a long arrangement, form a concise bar-by-bar section map appropriate to the brief: intro, entries, main groove, breakdowns, rebuilds, peaks, and outro are functions, not a mandatory template.
- Repetition must preserve musical logic. Reuse a clip when its role is unchanged; create a variation when the section changes energy, density, register, harmony, or rhythmic emphasis.
- Arrange with deliberate entrances and exits. The kick and snare must not run mechanically through all 128 bars: bring each in when its role should become audible, remove or thin it when the arrangement needs suspension, and make its return structurally clear. Kick and snare suspensions may differ, but both must support the section's energy and transition grammar. Apply the same judgment to bass, hats, percussion, harmony, and lead parts.
- Put fills where they announce or complete a transition, usually in the final half-bar or bar before a meaningful section boundary. Do not add fills at arbitrary fixed intervals, and do not overwrite the main groove when a dedicated fill variation can be placed only where needed.
- After arranging, inspect the complete Arrangement from first bar to last. Verify every requested section is covered, all positions and lengths are correct, no unintended gaps remain, and intentional silences, fills, plus major kick/snare entrances and exits landed at the requested bars.
- When the user asks to hear the result ("play it", "fammi sentire"), fire the relevant clips or the scene and verify is_playing — do not only start the transport.
- Respect the current tempo, meter, selection, and existing arrangement unless the user asks to change them.
- Ask one concise clarification only when a required musical choice cannot reasonably be inferred.

Completion language is strict:
- While tool calls remain, describe work as in progress and never claim that the task is done.
- Emit a final answer only after the request is complete and the required readbacks pass.
- In Italian, the final answer must begin exactly with "Ho finito — ". In another language, begin with the natural equivalent of "I have finished — ". Then state concisely what changed and what was verified.

${MUSICAL_KNOWLEDGE}`;

/**
 * Parse the model's raw JSON output into a validated LlmResult.
 * Anything that fails validation is rejected — invalid plans never reach Live.
 */
export function parseLlmOutput(raw: string): LlmResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM output is not valid JSON");
  }
  const obj = parsed as { reply?: unknown; actions?: unknown };
  if (typeof obj.reply !== "string") throw new Error("LLM output missing reply");
  const actions = ActionPlanSchema.parse(obj.actions ?? []);
  return { reply: obj.reply, actions };
}

/**
 * HTTP provider for OpenAI-compatible chat-completion APIs (works for several
 * vendors). Model/endpoint/key come from environment configuration at deploy.
 */
export class HttpChatProvider implements LlmProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly model: string,
    fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 30_000,
  ) {
    // Cloudflare's native fetch rejects calls whose receiver is an arbitrary
    // object. Keeping it as a class method and calling `this.fetchImpl(...)`
    // would therefore throw "Illegal invocation" before any network request.
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  async complete(messages: Message[], liveContext?: LiveContext): Promise<LlmResult> {
    const contextMsg = liveContext
      ? [{ role: "system" as const, content: `Live Set context: ${JSON.stringify(liveContext)}` }]
      : [];
    const res = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + this.apiKey,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: 2_000,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...contextMsg,
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`LLM provider error: ${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM provider returned no content");
    const result = parseLlmOutput(content);
    return {
      ...result,
      ...(data.usage
        ? {
            usage: {
              inputTokens: data.usage.prompt_tokens ?? 0,
              outputTokens: data.usage.completion_tokens ?? 0,
              totalTokens: data.usage.total_tokens ?? 0,
              model: this.model,
            },
          }
        : {}),
    };
  }
}

/**
 * OpenAI Responses provider for the distributed agent loop. Function calls are
 * returned to the Max device, executed against its local MCP server, and sent
 * back on the next step with previous_response_id.
 */
export class HttpResponsesProvider implements AgentProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly model: string,
    fetchImpl: typeof fetch = fetch,
    // Heavy arrangement-planning steps can think well past a minute; the
    // device waits up to 300s per agent request and 840/900s per turn.
    private readonly timeoutMs = 240_000,
  ) {
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  private async createResponse(body: Record<string, unknown>): Promise<ResponsesApiData> {
    const res = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + this.apiKey,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`LLM provider error: ${res.status}`);
    return (await res.json()) as ResponsesApiData;
  }

  async step(request: AgentStepRequest): Promise<AgentStepResult> {
    const instructions = request.liveContext
      ? `${AGENT_SYSTEM_PROMPT}\n\nCurrent Live context supplied by the device:\n${JSON.stringify(request.liveContext)}`
      : AGENT_SYSTEM_PROMPT;
    const input = request.previousResponseId
      ? (request.toolOutputs ?? []).map((item) => ({
          type: "function_call_output",
          call_id: item.call_id,
          output: item.output,
        }))
      : (request.messages ?? []).map((message) => ({
          role: message.role,
          content: message.content,
        }));
    const tools = request.tools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      strict: false,
    }));
    const body: Record<string, unknown> = {
      model: this.model,
      instructions,
      input,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      reasoning: { effort: request.reasoningEffort ?? "medium" },
      max_output_tokens:
        request.reasoningEffort === "high"
          ? AGENT_DEEP_OUTPUT_TOKEN_BUDGET
          : AGENT_OUTPUT_TOKEN_BUDGET,
      store: true,
    };
    if (request.previousResponseId) body.previous_response_id = request.previousResponseId;

    const data = await this.createResponse(body);
    try {
      return parseAgentResponse(data, this.model);
    } catch (error) {
      if (!(error instanceof RetryableAgentOutputError)) throw error;
    }

    const recovered = await this.createResponse({
      ...body,
      instructions: `${instructions}\n\n${AGENT_OUTPUT_RECOVERY_INSTRUCTIONS}`,
      max_output_tokens: AGENT_RECOVERY_OUTPUT_TOKEN_BUDGET,
    });
    try {
      return parseAgentResponse(recovered, this.model);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM output recovery failed: ${message}`);
    }
  }
}

interface ResponsesApiData {
  id?: string;
  status?: "completed" | "failed" | "in_progress" | "cancelled" | "queued" | "incomplete";
  incomplete_details?: { reason?: string } | null;
  error?: { message?: string } | null;
  output?: Array<
    | {
        type: "function_call";
        call_id?: string;
        name?: string;
        arguments?: string;
      }
    | {
        type: "message";
        content?: Array<{ type?: string; text?: string }>;
      }
  >;
  output_text?: string;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

class RetryableAgentOutputError extends Error {}

function parseAgentResponse(data: ResponsesApiData, model: string): AgentStepResult {
  if (data.status && data.status !== "completed") {
    const reason = data.incomplete_details?.reason ?? data.error?.message ?? data.status;
    if (data.status === "incomplete" && reason === "max_output_tokens") {
      throw new RetryableAgentOutputError(`LLM response incomplete: ${reason}`);
    }
    throw new Error(`LLM response ${data.status}: ${reason}`);
  }
  if (!data.id) throw new Error("LLM provider returned no response id");

  const toolCalls: AgentToolCall[] = [];
  const text: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type === "function_call") {
      if (!item.call_id || !item.name) {
        throw new RetryableAgentOutputError("LLM returned an invalid tool call");
      }
      let args: unknown;
      try {
        args = JSON.parse(item.arguments || "{}");
      } catch {
        throw new RetryableAgentOutputError(
          `LLM returned invalid arguments for ${item.name}`,
        );
      }
      if (!args || typeof args !== "object" || Array.isArray(args)) {
        throw new RetryableAgentOutputError(
          `LLM returned non-object arguments for ${item.name}`,
        );
      }
      toolCalls.push({
        call_id: item.call_id,
        name: item.name,
        arguments: args as Record<string, unknown>,
      });
    } else if (item.type === "message") {
      for (const content of item.content ?? []) {
        if (content.type === "output_text" && content.text) text.push(content.text);
      }
    }
  }
  const reply = text.join("\n").trim() || data.output_text?.trim() || "";
  if (toolCalls.length === 0 && !reply) {
    throw new RetryableAgentOutputError("LLM provider returned no output");
  }
  return {
    responseId: data.id,
    reply,
    toolCalls,
    ...(data.usage
      ? {
          usage: {
            inputTokens: data.usage.input_tokens ?? 0,
            outputTokens: data.usage.output_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
            model,
          },
        }
      : {}),
  };
}

/** Deterministic provider for tests and local development without API keys. */
export class StubProvider implements LlmProvider {
  async complete(messages: Message[]): Promise<LlmResult> {
    const last = messages[messages.length - 1]?.content ?? "";
    const tempoMatch = last.match(/\b(?:set\s+)?tempo(?:\s+to)?\s+(\d{2,3}(?:\.\d+)?)\b/i);
    const bpm = tempoMatch ? Number(tempoMatch[1]) : null;
    if (bpm !== null && bpm >= 20 && bpm <= 999) {
      return {
        reply: `Setting tempo to ${bpm} BPM.`,
        actions: [{ op: "set_tempo", bpm }],
      };
    }
    return {
      reply: `stub: ${last.slice(0, 60)}`,
      actions: [],
    };
  }
}

/** Deterministic distributed-agent provider used by local tests. */
export class StubAgentProvider implements AgentProvider {
  async step(request: AgentStepRequest): Promise<AgentStepResult> {
    if (request.previousResponseId) {
      return {
        responseId: "stub-response-final",
        reply: "Done and verified in Live.",
        toolCalls: [],
      };
    }
    const last = request.messages?.[request.messages.length - 1]?.content ?? "";
    const tempoMatch = last.match(/\b(?:set\s+)?tempo(?:\s+to)?\s+(\d{2,3}(?:\.\d+)?)\b/i);
    if (tempoMatch) {
      return {
        responseId: "stub-response-tool",
        reply: "",
        toolCalls: [
          {
            call_id: "stub-call-1",
            name: "live_set",
            arguments: {
              ref: { path: "live_set" },
              property: "tempo",
              value: Number(tempoMatch[1]),
            },
          },
        ],
      };
    }
    return {
      responseId: "stub-response-final",
      reply: `stub: ${last.slice(0, 60)}`,
      toolCalls: [],
    };
  }
}
