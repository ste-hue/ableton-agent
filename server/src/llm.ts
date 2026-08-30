import type { ActionPlan, LiveContext, Message } from "./types.js";
import { ActionPlanSchema } from "./types.js";

// ---------------------------------------------------------------------------
// LLM gateway — the product is not tied to one model. The gateway receives
// conversation history + Live Set context and returns a reply plus a validated
// LOM action plan. Providers are pluggable; cost can be optimized per
// operation behind this interface without the client ever knowing.
// ---------------------------------------------------------------------------

export interface LlmResult {
  reply: string;
  actions: ActionPlan;
}

export interface LlmProvider {
  complete(messages: Message[], liveContext?: LiveContext): Promise<LlmResult>;
}

export const SYSTEM_PROMPT = `You are Tembro, a music agent operating Ableton Live for a musician.
You receive the current Live Set context and the conversation. Respond with:
1. "reply": one short sentence in the user's language describing what you are doing.
2. "actions": a JSON array of LOM operations from the allowed set
   (set_tempo, create_midi_track, load_device, create_clip, replace_notes,
   fire_clip, fire_scene, stop_all, undo).
Rules: new MIDI tracks are silent until a device is loaded — always load an
instrument before adding notes to a new track. Notes use beats, pitches 0-127.
Clip lengths are in beats: N bars = N x time-signature numerator beats when the
denominator is 4 (e.g. 4 bars in 4/4 = 16 beats). When the context includes a
selected clip (selection.clip with its notes), modification requests target
that exact clip: emit replace_notes for selection.track/selection.slot and do
NOT create a new track or clip. Preserve the clip's role and length unless
asked otherwise. Prefer modifying what exists over creating duplicates. Keep
plans short.`;

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
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

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
      body: JSON.stringify({
        model: this.model,
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
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM provider returned no content");
    return parseLlmOutput(content);
  }
}

/** Deterministic provider for tests and local development without API keys. */
export class StubProvider implements LlmProvider {
  async complete(messages: Message[]): Promise<LlmResult> {
    const last = messages[messages.length - 1]?.content ?? "";
    return {
      reply: `stub: ${last.slice(0, 60)}`,
      actions: [],
    };
  }
}
