import { z } from "zod";

// ---------------------------------------------------------------------------
// Legacy LOM action surface (v0.1.0 compatibility)
//
// The backend never talks to Ableton. This older endpoint returns an action plan; the M4L
// device executes each action locally through the MCP/LOM bridge, sequentially,
// signature-guarded, with readback — then reports outcomes via /v0/events.
// The surface mirrors verified capabilities in docs/lom-capability-map.md.
// ---------------------------------------------------------------------------

export const NoteSchema = z.object({
  pitch: z.number().int().min(0).max(127),
  start: z.number().min(0), // beats
  duration: z.number().positive(), // beats
  velocity: z.number().int().min(1).max(127),
  mute: z.boolean().optional(),
  probability: z.number().min(0).max(1).optional(),
  velocity_deviation: z.number().optional(),
});
export type Note = z.infer<typeof NoteSchema>;

export const LomActionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_tempo"), bpm: z.number().min(20).max(999) }),
  z.object({
    op: z.literal("create_midi_track"),
    name: z.string().min(1).max(128),
  }),
  z.object({
    op: z.literal("load_device"),
    track: z.number().int().min(0),
    query: z.string().min(1).max(256), // browser search string (literal, not semantic)
  }),
  z.object({
    op: z.literal("create_clip"),
    track: z.number().int().min(0),
    slot: z.number().int().min(0),
    length_beats: z.number().positive(),
    name: z.string().max(128).optional(),
  }),
  z.object({
    op: z.literal("replace_notes"),
    track: z.number().int().min(0),
    slot: z.number().int().min(0),
    notes: z.array(NoteSchema).max(2000),
  }),
  z.object({
    op: z.literal("fire_clip"),
    track: z.number().int().min(0),
    slot: z.number().int().min(0),
  }),
  z.object({ op: z.literal("fire_scene"), scene: z.number().int().min(0) }),
  z.object({ op: z.literal("stop_all") }),
  z.object({ op: z.literal("undo") }),
]);
export type LomAction = z.infer<typeof LomActionSchema>;

export const ActionPlanSchema = z.array(LomActionSchema).max(50);
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

// ---------------------------------------------------------------------------
// Live Set context, as reported by the device with each chat request.
// Kept intentionally small: track list + selection, not a full Set dump.
// ---------------------------------------------------------------------------

export const LiveContextSchema = z.object({
  tempo: z.number().min(20).max(999).optional(),
  time_signature: z
    .object({
      numerator: z.number().int().min(1).max(99),
      denominator: z.number().int().min(1).max(64),
    })
    .optional(),
  tracks: z
    .array(
      z.object({
        index: z.number().int().min(0),
        name: z.string(),
        kind: z.enum(["midi", "audio", "return", "master"]),
        devices: z.array(z.string()).default([]),
      }),
    )
    .max(200)
    .default([]),
  // Selection carries the selected MIDI clip (name, length, lossless LOM-shaped
  // notes) when present — modification requests ("make it more syncopated")
  // depend on the model seeing the exact notes of the clip it must change.
  selection: z
    .object({
      track: z.number().int().min(0).optional(),
      slot: z.number().int().min(0).optional(),
      clip: z
        .object({
          name: z.string().optional(),
          length_beats: z.number().positive(),
          notes: z.array(NoteSchema).max(2000),
        })
        .optional(),
    })
    .optional(),
});
export type LiveContext = z.infer<typeof LiveContextSchema>;

// ---------------------------------------------------------------------------
// API request/response
// ---------------------------------------------------------------------------

export const ChatRequestSchema = z.object({
  request_id: z.string().uuid().optional(),
  protocol_version: z.literal("0.1"),
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  live_context: LiveContextSchema.optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatResponse {
  request_id: string;
  protocol_version: "0.1";
  conversation_id: string;
  reply: string;
  actions: ActionPlan;
  credits_remaining: number;
}

// ---------------------------------------------------------------------------
// Agent protocol (V0.2)
//
// The model runs on Tembro's server, while MCP tools run on the customer's
// machine next to Ableton. A turn therefore alternates between model steps and
// local tool results until the model emits a final reply.
// ---------------------------------------------------------------------------

export const McpToolSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  description: z.string().max(2000).default(""),
  inputSchema: z
    .record(z.unknown())
    .refine((value) => value.type === "object", "MCP inputSchema must be an object schema"),
});
export type McpTool = z.infer<typeof McpToolSchema>;

export const AgentToolOutputSchema = z.object({
  call_id: z.string().min(1).max(256),
  output: z.string().max(100_000),
});
export type AgentToolOutput = z.infer<typeof AgentToolOutputSchema>;

export const AgentStartRequestSchema = z.object({
  kind: z.literal("start"),
  protocol_version: z.literal("0.2"),
  request_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  live_context: LiveContextSchema.optional(),
  tools: z.array(McpToolSchema).min(1).max(40),
});

export const AgentContinueRequestSchema = z.object({
  kind: z.literal("continue"),
  protocol_version: z.literal("0.2"),
  conversation_id: z.string().uuid(),
  continuation_token: z.string().min(20).max(16_000),
  tools: z.array(McpToolSchema).min(1).max(40),
  tool_outputs: z.array(AgentToolOutputSchema).min(1).max(8),
});

export const AgentRequestSchema = z.discriminatedUnion("kind", [
  AgentStartRequestSchema,
  AgentContinueRequestSchema,
]);
export type AgentRequest = z.infer<typeof AgentRequestSchema>;

export interface AgentToolCall {
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentStepResponse {
  protocol_version: "0.2";
  kind: "tool_calls" | "final";
  conversation_id: string;
  reply: string;
  tool_calls: AgentToolCall[];
  continuation_token?: string;
  credits_remaining: number;
}

export const LicenseAuthRequestSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  license_key: z.string().min(8).max(256),
  instance_name: z.string().min(1).max(128),
  instance_id: z.string().uuid().optional(),
});

export const LemonWebhookSchema = z.object({
  meta: z.object({
    event_name: z.string(),
    custom_data: z.record(z.unknown()).optional(),
  }),
  data: z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.record(z.unknown()),
  }),
});
export type LemonWebhook = z.infer<typeof LemonWebhookSchema>;

export const ClientEventSchema = z.object({
  kind: z.enum(["action.executed", "action.failed", "client.error", "readback.mismatch"]),
  payload: z.record(z.unknown()).default({}),
});

// ---------------------------------------------------------------------------
// Domain records
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  actions?: ActionPlan;
}
