import type {
  ActionPlan,
  AgentToolCall,
  AgentToolOutput,
  LiveContext,
  McpTool,
  Message,
} from "./types.js";
import { ActionPlanSchema } from "./types.js";

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
- Never use arbitrary-code or batch execution. Those tools are intentionally unavailable.
- Work in an unsaved disposable Set by default. If the Set is saved, do not alter existing material unless the user explicitly asked you to.
- Do not save, close, replace, or discard a Set. Do not click through modal dialogs.
- Prefer creating a variation over destroying existing musical work.

Step budget — this matters:
- You have at most 24 tool calls per turn. Plan them: one live_set_summary tells you almost everything; do not poll state in a loop, and never repeat a call that just failed with the same arguments.
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
- When the user asks to hear the result ("play it", "fammi sentire"), fire the relevant clips or the scene and verify is_playing — do not only start the transport.
- Respect the current tempo, meter, selection, and existing arrangement unless the user asks to change them.
- Ask one concise clarification only when a required musical choice cannot reasonably be inferred.

Keep the final answer concise and state exactly what changed and what was verified.`;

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
    private readonly timeoutMs = 60_000,
  ) {
    this.fetchImpl = fetchImpl.bind(globalThis);
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
      reasoning: { effort: "medium" },
      max_output_tokens: 4_000,
      store: true,
    };
    if (request.previousResponseId) body.previous_response_id = request.previousResponseId;

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
    const data = (await res.json()) as {
      id?: string;
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
    };
    if (!data.id) throw new Error("LLM provider returned no response id");

    const toolCalls: AgentToolCall[] = [];
    const text: string[] = [];
    for (const item of data.output ?? []) {
      if (item.type === "function_call") {
        if (!item.call_id || !item.name) throw new Error("LLM returned an invalid tool call");
        let args: unknown;
        try {
          args = JSON.parse(item.arguments || "{}");
        } catch {
          throw new Error(`LLM returned invalid arguments for ${item.name}`);
        }
        if (!args || typeof args !== "object" || Array.isArray(args)) {
          throw new Error(`LLM returned non-object arguments for ${item.name}`);
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
    if (toolCalls.length === 0 && !reply) throw new Error("LLM provider returned no output");
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
              model: this.model,
            },
          }
        : {}),
    };
  }
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
