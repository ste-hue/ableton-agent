import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/app.js";
import { MemoryStore } from "../src/store.js";
import {
  HttpResponsesProvider,
  StubAgentProvider,
  AGENT_SYSTEM_PROMPT,
  AGENT_STEP_BUDGET,
} from "../src/llm.js";
import type { AgentProvider } from "../src/llm.js";
import type { LicenseProvider } from "../src/billing.js";
import { parseCreditPacks } from "../src/billing.js";
import { estimateCreditCost, skillPromptFor } from "../src/skills.js";
import type { AgentStepResponse, McpTool } from "../src/types.js";

function makeApp(credits = 100, extra: Partial<AppConfig> = {}) {
  const store = new MemoryStore();
  const app = createApp({
    store,
    agent: new StubAgentProvider(),
    agentTokenSecret: "test-agent-token-secret",
    allowDevSignin: true,
    signupGrantCredits: credits,
    ...extra,
  });
  return { app, store };
}

const LIVE_SET_TOOL = {
  name: "live_set",
  description: "Set a Live property.",
  inputSchema: {
    type: "object",
    properties: {
      ref: { type: "object" },
      property: { type: "string" },
      value: {},
    },
    required: ["ref", "property", "value"],
    additionalProperties: false,
  },
};

async function signin(app: ReturnType<typeof makeApp>["app"], email: string) {
  const res = await app.request("/v0/auth/dev-signin", {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "content-type": "application/json" },
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { token: string; user_id: string };
  return data;
}

function authed(token: string, body: unknown) {
  return {
    method: "POST",
    body: JSON.stringify({ protocol_version: "0.2", ...(body as object) }),
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + token,
    },
  };
}

test("health endpoint", async () => {
  const { app } = makeApp();
  const res = await app.request("/v0/health");
  assert.equal(res.status, 200);
});

test("skills endpoint exposes the server-side credit menu", async () => {
  const { app } = makeApp();
  const res = await app.request("/v0/skills");
  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    skills: { id: string; estimated_credits: number }[];
  };
  assert.deepEqual(
    data.skills.map((skill) => [skill.id, skill.estimated_credits]),
    [
      ["clip_edit", 1],
      ["beat_making", 2],
      ["harmony_melody", 2],
      ["song_from_scratch", 4],
    ],
  );
});

test("credit estimates rise with musical scope and cannot be lowered by a cheap skill", () => {
  assert.equal(estimateCreditCost(1, "set tempo to 126"), 1);
  assert.equal(estimateCreditCost(1, "make a house beat"), 2);
  assert.equal(estimateCreditCost(1, "arrange a full 128-bar track", "clip_edit"), 4);
  // The device pastes the pressed skill's own prompt into the message. That
  // text must never price the turn: the beat prompt says "complete
  // arrangement" and charged every beat 4 credits until 2026-09-05.
  const beatPrompt = skillPromptFor("beat_making") ?? "";
  assert.match(beatPrompt, /complete arrangement/);
  assert.equal(estimateCreditCost(1, `${beatPrompt} Hip hop underground`, "beat_making"), 2);
  assert.equal(estimateCreditCost(1, `${beatPrompt} a full 128-bar track please`, "beat_making"), 4);
  assert.equal(estimateCreditCost(1, skillPromptFor("harmony_melody") ?? "", "harmony_melody"), 2);
});

test("legacy payment settings cannot republish the retired credit landing page", async () => {
  for (const legacy of [
    { checkoutUrl: "https://tembro.lemonsqueezy.com/buy/test-product" },
    { checkoutUrl: "https://tembro.lemonsqueezy.com/buy/test-product", freeFirstPackCode: "FIRSTPACK" },
    { checkoutUrl: "javascript:alert(1)", freeFirstPackCode: "<script>" },
    { downloadUrl: "https://example.com/tembro.zip" },
  ]) {
    const { app } = makeApp(100, legacy);
    const response = await app.request("/tembro");
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/#products");
    assert.doesNotMatch(await response.text(), /checkout|credits|javascript:/i);
  }
});

test("agent requires auth", async () => {
  const { app } = makeApp();
  const res = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "ciao",
      tools: [LIVE_SET_TOOL],
    }),
    headers: { "content-type": "application/json" },
  });
  assert.equal(res.status, 401);
});

function agentStart(token: string, body: Record<string, unknown>) {
  return authed(token, { kind: "start", tools: [LIVE_SET_TOOL], ...body });
}

// Representative client-owned schemas: the API must preserve every nested
// constraint, without implementing or guessing the local engine's contract.
const LOCAL_ENGINE_TOOLS: McpTool[] = [
  "tembro_chordarium_compose",
  "tembro_rudiment_compose",
  "tembro_ensemble_compose",
].map((name) => ({
  name,
  description: "Generate a local MIDI proposal without writing to Live.",
  inputSchema: {
    type: "object",
    properties: {
      seed: { type: "integer", minimum: 0, maximum: 4294967295 },
      bars: { type: "integer", enum: [4, 8, 16] },
    },
    required: ["seed", "bars"],
    additionalProperties: false,
  },
}));
LOCAL_ENGINE_TOOLS.push({
  name: "tembro_proposal_notes",
  description: "Read one bounded page of a local proposal.",
  inputSchema: {
    type: "object",
    properties: {
      proposal_id: { type: "string", pattern: "^[a-f0-9]{64}$" },
      offset: { type: "integer", minimum: 0 },
      limit: { type: "integer", minimum: 1, maximum: 128 },
    },
    required: ["proposal_id", "offset", "limit"],
    additionalProperties: false,
  },
});

test("all four local engine tools survive the API round trip with exact schemas and one charge", async () => {
  let calls = 0;
  const outputs = LOCAL_ENGINE_TOOLS.map((tool, index) => ({
    call_id: "local-call-" + index,
    output: JSON.stringify({ ok: true, result: { tool: tool.name, written_to_live: false } }),
  }));
  const agent: AgentProvider = {
    async step(request) {
      calls += 1;
      assert.deepEqual(request.tools, LOCAL_ENGINE_TOOLS);
      if (calls === 1) {
        return {
          responseId: "local-start",
          reply: "",
          toolCalls: LOCAL_ENGINE_TOOLS.map((tool, index) => ({
            call_id: "local-call-" + index,
            name: tool.name,
            arguments: {},
          })),
        };
      }
      assert.equal(request.previousResponseId, "local-start");
      assert.deepEqual(request.toolOutputs, outputs);
      return { responseId: "local-final", reply: "Proposta generata localmente.", toolCalls: [] };
    },
  };
  const { app } = makeApp(10, { agent });
  const { token } = await signin(app, "local-engines@example.com");
  const forbidden = ["live_exec", "live_eval", "live_batch", "tembro_shell"].map((name) => ({
    name,
    description: "Must never reach the model.",
    inputSchema: { type: "object" },
  }));
  const started = await app.request("/v0/agent", agentStart(token, {
    message: "prepare a local proposal",
    tools: [...LOCAL_ENGINE_TOOLS, ...forbidden, { ...LOCAL_ENGINE_TOOLS[0], description: "duplicate" }],
  }));
  assert.equal(started.status, 200);
  const first = await started.json() as AgentStepResponse;
  assert.equal(first.kind, "tool_calls");
  assert.deepEqual(first.tool_calls.map((call) => call.name), LOCAL_ENGINE_TOOLS.map((tool) => tool.name));
  assert.ok(first.credits_charged > 0);
  assert.equal(first.credits_remaining, 10 - first.credits_charged);
  const continued = await app.request("/v0/agent", authed(token, {
    kind: "continue",
    conversation_id: first.conversation_id,
    continuation_token: first.continuation_token,
    tools: LOCAL_ENGINE_TOOLS,
    tool_outputs: outputs,
  }));
  assert.equal(continued.status, 200);
  const final = await continued.json() as AgentStepResponse;
  assert.equal(final.kind, "final");
  assert.equal(final.reply, "Proposta generata localmente.");
  assert.equal(final.credits_remaining, first.credits_remaining);
  assert.equal(final.credits_charged, first.credits_charged);
  assert.equal(calls, 2);
});

test("local tool continuation binds nested schemas and tool order before consuming the token", async () => {
  let calls = 0;
  const agent: AgentProvider = {
    async step(request) {
      calls += 1;
      assert.deepEqual(request.tools, LOCAL_ENGINE_TOOLS);
      return calls === 1
        ? { responseId: "schema-start", reply: "", toolCalls: [{
          call_id: "compose", name: "tembro_ensemble_compose", arguments: { seed: 7, bars: 4 },
        }] }
        : { responseId: "schema-final", reply: "ready", toolCalls: [] };
    },
  };
  const { app } = makeApp(10, { agent });
  const { token } = await signin(app, "local-schema@example.com");
  const started = await app.request("/v0/agent", agentStart(token, {
    message: "prepare a proposal", tools: LOCAL_ENGINE_TOOLS,
  }));
  assert.equal(started.status, 200);
  const first = await started.json() as AgentStepResponse;
  const next = (tools: McpTool[]) => app.request("/v0/agent", authed(token, {
    kind: "continue",
    conversation_id: first.conversation_id,
    continuation_token: first.continuation_token,
    tools,
    tool_outputs: [{ call_id: "compose", output: '{"ok":true}' }],
  }));
  const changedSchema = LOCAL_ENGINE_TOOLS.map((tool, index) => index !== 3 ? tool : {
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      properties: { proposal_id: { type: "string" }, limit: { type: "integer", maximum: 100000 } },
    },
  });
  for (const tools of [changedSchema, [...LOCAL_ENGINE_TOOLS].reverse(), LOCAL_ENGINE_TOOLS.slice(0, 3)]) {
    const rejected = await next(tools);
    assert.equal(rejected.status, 401);
    assert.deepEqual(await rejected.json(), { error: "invalid_continuation" });
    assert.equal(calls, 1);
  }
  const accepted = await next(LOCAL_ENGINE_TOOLS);
  assert.equal(accepted.status, 200);
  const final = await accepted.json() as AgentStepResponse;
  assert.equal(final.kind, "final");
  assert.equal(final.credits_remaining, first.credits_remaining);
  assert.equal(calls, 2);
});

test("engine allowlist does not admit arbitrary code or similarly named local tools", async () => {
  let calls = 0;
  const agent: AgentProvider = {
    async step() {
      calls += 1;
      return { responseId: "unexpected", reply: "unexpected", toolCalls: [] };
    },
  };
  const { app } = makeApp(10, { agent });
  const { token } = await signin(app, "local-denied@example.com");
  for (const name of ["live_exec", "live_eval", "live_batch", "tembro_proposal_write", "tembro_ensemble_compose_exec"]) {
    const response = await app.request("/v0/agent", agentStart(token, {
      message: "prepare a proposal",
      tools: [{ name, description: "denied", inputSchema: { type: "object" } }],
    }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "no_safe_mcp_tools" });
  }
  assert.equal(calls, 0);
  const balance = await app.request("/v0/credits", { headers: { authorization: "Bearer " + token } });
  assert.equal((await balance.json() as { credits: number }).credits, 10);
});

test("insufficient credits → 402 before the model is called", async () => {
  let modelCalls = 0;
  const agent: AgentProvider = {
    async step() {
      modelCalls += 1;
      return { responseId: "never", reply: "never", toolCalls: [] };
    },
  };
  const { app } = makeApp(0, { agent });
  const { token } = await signin(app, "b@example.com");
  const res = await app.request("/v0/agent", agentStart(token, { message: "hi" }));
  assert.equal(res.status, 402);
  assert.equal(modelCalls, 0);
});

test("users cannot continue each other's conversations", async () => {
  const { app } = makeApp();
  const alice = await signin(app, "alice@example.com");
  const bob = await signin(app, "bob@example.com");

  const res = await app.request("/v0/agent", agentStart(alice.token, { message: "ciao" }));
  assert.equal(res.status, 200);
  const { conversation_id } = (await res.json()) as { conversation_id: string };

  const intruded = await app.request(
    "/v0/agent",
    agentStart(bob.token, { message: "hijack", conversation_id }),
  );
  assert.equal(intruded.status, 404);
});

test("selected clip context (notes) reaches the agent provider", async () => {
  let seenContext: unknown = null;
  const agent: AgentProvider = {
    async step(request) {
      seenContext = request.liveContext;
      return { responseId: "resp", reply: "ok", toolCalls: [] };
    },
  };
  const { app } = makeApp(100, { agent });
  const { token } = await signin(app, "sel@example.com");
  const live_context = {
    tempo: 110,
    time_signature: { numerator: 4, denominator: 4 },
    tracks: [{ index: 0, name: "Bass", kind: "midi", devices: ["Operator"] }],
    selection: {
      track: 0,
      slot: 0,
      clip: {
        name: "Bassline",
        length_beats: 16,
        notes: [{ pitch: 45, start: 0, duration: 1, velocity: 100 }],
      },
    },
  };
  const res = await app.request(
    "/v0/agent",
    agentStart(token, { message: "make it more syncopated", live_context }),
  );
  assert.equal(res.status, 200);
  const ctx = seenContext as typeof live_context;
  assert.ok(ctx.selection.clip);
  assert.equal(ctx.selection.clip.notes.length, 1);
  assert.equal(ctx.selection.clip.notes[0]?.pitch, 45);
  assert.equal(ctx.selection.clip.length_beats, 16);
});

test("malformed selection.clip is rejected", async () => {
  const { app } = makeApp();
  const { token } = await signin(app, "bad@example.com");
  const res = await app.request(
    "/v0/agent",
    agentStart(token, {
      message: "hi",
      live_context: { selection: { track: 0, slot: 0, clip: { notes: [] } } }, // missing length_beats
    }),
  );
  assert.equal(res.status, 400);
});

test("duplicate request ids cannot charge twice", async () => {
  const { app } = makeApp(2);
  const { token } = await signin(app, "duplicate@example.com");
  const request_id = "d1843f1e-f120-4bd7-87bb-a581c12dc17d";
  const first = await app.request("/v0/agent", agentStart(token, { request_id, message: "first" }));
  assert.equal(first.status, 200);
  const second = await app.request("/v0/agent", agentStart(token, { request_id, message: "retry" }));
  assert.equal(second.status, 409);
  const credits = await app.request("/v0/credits", {
    headers: { authorization: "Bearer " + token },
  });
  assert.equal(((await credits.json()) as { credits: number }).credits, 1);
});

test("agent alternates model and local MCP results but charges only once", async () => {
  let step = 0;
  const agent: AgentProvider = {
    async step(request) {
      step += 1;
      if (step === 1) {
        assert.equal(request.tools.length, 1);
        assert.equal(request.tools[0]?.name, "live_set");
        return {
          responseId: "resp-first",
          reply: "",
          toolCalls: [
            {
              call_id: "call-tempo",
              name: "live_set",
              arguments: { ref: { path: "live_set" }, property: "tempo", value: 126 },
            },
          ],
        };
      }
      assert.equal(request.previousResponseId, "resp-first");
      assert.deepEqual(request.toolOutputs, [
        { call_id: "call-tempo", output: '{"ok":true,"tempo":126}' },
      ]);
      return {
        responseId: "resp-final",
        reply: "Tempo impostato a 126 BPM e verificato.",
        toolCalls: [],
      };
    },
  };
  const { app } = makeApp(2, { agent });
  const { token } = await signin(app, "agent@example.com");
  const started = await app.request(
    "/v0/agent",
    {
      method: "POST",
      body: JSON.stringify({
        kind: "start",
        protocol_version: "0.2",
        message: "porta il tempo a 126",
        tools: [
          LIVE_SET_TOOL,
          {
            name: "live_exec",
            description: "must be filtered",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      }),
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + token,
      },
    },
  );
  assert.equal(started.status, 200);
  const first = (await started.json()) as {
    kind: string;
    conversation_id: string;
    continuation_token: string;
    credits_remaining: number;
    credits_charged: number;
    skill: string | null;
  };
  assert.equal(first.kind, "tool_calls");
  assert.equal(first.credits_remaining, 1);
  assert.equal(first.credits_charged, 1);
  assert.equal(first.skill, null);

  const continued = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "continue",
      protocol_version: "0.2",
      conversation_id: first.conversation_id,
      continuation_token: first.continuation_token,
      tools: [LIVE_SET_TOOL],
      tool_outputs: [{ call_id: "call-tempo", output: '{"ok":true,"tempo":126}' }],
    }),
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + token,
    },
  });
  assert.equal(continued.status, 200);
  const final = (await continued.json()) as {
    kind: string;
    reply: string;
    credits_remaining: number;
    credits_charged: number;
  };
  assert.equal(final.kind, "final");
  assert.match(final.reply, /126 BPM/);
  assert.equal(final.credits_remaining, 1);
  assert.equal(final.credits_charged, 1);
});

test("agent meters every model call and reports the whole turn on completion", async () => {
  const usage = (input: number, cached: number, output: number, reasoning: number) => ({
    inputTokens: input,
    cachedInputTokens: cached,
    outputTokens: output,
    reasoningTokens: reasoning,
    totalTokens: input + output,
    model: "gpt-5.6-sol",
  });
  let step = 0;
  const agent: AgentProvider = {
    async step() {
      step += 1;
      if (step === 1) {
        return {
          responseId: "resp-first",
          reply: "",
          toolCalls: [
            {
              call_id: "call-tempo",
              name: "live_set",
              arguments: { ref: { path: "live_set" }, property: "tempo", value: 126 },
            },
          ],
          usage: usage(1000, 0, 300, 250),
        };
      }
      return {
        responseId: "resp-final",
        reply: "Ho finito — tempo a 126.",
        toolCalls: [],
        usage: usage(1400, 900, 60, 20),
      };
    },
  };
  const { app, store } = makeApp(2, { agent });
  const { token } = await signin(app, "meter@example.com");
  const headers = { "content-type": "application/json", authorization: "Bearer " + token };
  const started = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "porta il tempo a 126",
      tools: [LIVE_SET_TOOL],
    }),
    headers,
  });
  const first = (await started.json()) as { conversation_id: string; continuation_token: string };
  const continued = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "continue",
      protocol_version: "0.2",
      conversation_id: first.conversation_id,
      continuation_token: first.continuation_token,
      tools: [LIVE_SET_TOOL],
      tool_outputs: [{ call_id: "call-tempo", output: '{"ok":true}' }],
    }),
    headers,
  });
  assert.equal(continued.status, 200);

  type Payload = { step?: number; usage?: { inputTokens: number }; model?: string };
  const metered = store.events.filter((e) => e.kind === "agent.usage");
  assert.deepEqual(
    metered.map((e) => {
      const payload = e.payload as Payload;
      return [payload.step, payload.usage?.inputTokens];
    }),
    [
      [1, 1000],
      [2, 1400],
    ],
  );
  const completed = store.events.find((e) => e.kind === "agent.completed")?.payload as
    | Payload
    | undefined;
  assert.deepEqual(completed?.usage, {
    calls: 2,
    inputTokens: 2400,
    cachedInputTokens: 900,
    outputTokens: 360,
    reasoningTokens: 270,
    totalTokens: 2760,
  });
  assert.equal(completed?.model, "gpt-5.6-sol");
});

test("agent rejects a tampered continuation token", async () => {
  const { app } = makeApp();
  const { token } = await signin(app, "tamper@example.com");
  const started = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "set tempo to 123",
      tools: [LIVE_SET_TOOL],
    }),
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
  });
  const first = (await started.json()) as {
    conversation_id: string;
    continuation_token: string;
  };
  const rejected = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "continue",
      protocol_version: "0.2",
      conversation_id: first.conversation_id,
      continuation_token: first.continuation_token + "x",
      tools: [LIVE_SET_TOOL],
      tool_outputs: [{ call_id: "stub-call-1", output: "{}" }],
    }),
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
  });
  assert.equal(rejected.status, 401);
});

test("a continuation token is single-use: replay is rejected with 409", async () => {
  let steps = 0;
  const agent: AgentProvider = {
    async step() {
      steps += 1;
      if (steps === 1) {
        return {
          responseId: "resp-1",
          reply: "",
          toolCalls: [
            {
              call_id: "call-1",
              name: "live_set",
              arguments: { ref: { path: "live_set" }, property: "tempo", value: 120 },
            },
          ],
        };
      }
      return { responseId: "resp-" + steps, reply: "done", toolCalls: [] };
    },
  };
  const { app } = makeApp(2, { agent });
  const { token } = await signin(app, "replay@example.com");
  const started = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "set tempo",
      tools: [LIVE_SET_TOOL],
    }),
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
  });
  const first = (await started.json()) as {
    conversation_id: string;
    continuation_token: string;
  };
  const continueBody = JSON.stringify({
    kind: "continue",
    protocol_version: "0.2",
    conversation_id: first.conversation_id,
    continuation_token: first.continuation_token,
    tools: [LIVE_SET_TOOL],
    tool_outputs: [{ call_id: "call-1", output: '{"ok":true}' }],
  });
  const headers = { "content-type": "application/json", authorization: "Bearer " + token };
  const accepted = await app.request("/v0/agent", { method: "POST", body: continueBody, headers });
  assert.equal(accepted.status, 200);
  const modelCallsAfterFirst = steps;
  // Replaying the very same token must not trigger another model call.
  const replayed = await app.request("/v0/agent", { method: "POST", body: continueBody, headers });
  assert.equal(replayed.status, 409);
  assert.deepEqual(await replayed.json(), { error: "continuation_replayed" });
  assert.equal(steps, modelCallsAfterFirst);
});

test("a provider failure refunds the agent turn and reports the refund", async () => {
  const agent: AgentProvider = {
    async step() {
      throw new Error("provider exploded");
    },
  };
  const { app } = makeApp(2, { agent });
  const { token } = await signin(app, "agentfail@example.com");
  const failed = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "set tempo",
      tools: [LIVE_SET_TOOL],
    }),
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
  });
  assert.equal(failed.status, 502);
  const body = (await failed.json()) as { error: string; credits_remaining: number };
  assert.equal(body.error, "agent_provider_error");
  // The reserved credit came back: the balance equals the initial grant.
  assert.equal(body.credits_remaining, 2);
});

test("Responses provider emits MCP function calls and continues with tool output", async () => {
  const bodies: Record<string, unknown>[] = [];
  const fakeFetch = (async function (this: unknown, _input: unknown, init?: RequestInit) {
    assert.equal(this, globalThis);
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    bodies.push(body);
    if (bodies.length === 1) {
      return new Response(
        JSON.stringify({
          id: "resp-tool",
          output: [
            {
              type: "function_call",
              call_id: "call-1",
              name: "live_set_summary",
              arguments: "{}",
            },
          ],
          usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "resp-final",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Fatto e verificato." }],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  const provider = new HttpResponsesProvider(
    "https://api.openai.com/v1/responses",
    "test-key",
    "gpt-5.6-luna",
    fakeFetch,
  );
  const summaryTool = {
    name: "live_set_summary",
    description: "Read Set summary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  };
  const first = await provider.step({
    messages: [{ role: "user", content: "fammi una batteria" }],
    tools: [summaryTool],
  });
  assert.equal(first.toolCalls[0]?.name, "live_set_summary");
  assert.deepEqual(bodies[0]?.reasoning, { effort: "medium", summary: "auto" });
  assert.equal(bodies[0]?.max_output_tokens, 32_000);
  assert.equal(bodies[0]?.parallel_tool_calls, false);
  assert.match(String(bodies[0]?.instructions), /expert music-making agent/);
  assert.match(AGENT_SYSTEM_PROMPT, /Drum Rack/);
  assert.match(AGENT_SYSTEM_PROMPT, /at most 128 notes/);
  assert.match(AGENT_SYSTEM_PROMPT, /live_clip_duplicate_to_arrangement/);
  assert.match(AGENT_SYSTEM_PROMPT, /tembro_arrange_clip/);
  assert.match(AGENT_SYSTEM_PROMPT, new RegExp(`at most ${AGENT_STEP_BUDGET} model\\/tool rounds`));
  assert.match(AGENT_SYSTEM_PROMPT, /kick and snare must not run mechanically through all 128 bars/);
  assert.match(AGENT_SYSTEM_PROMPT, /complete Arrangement from first bar to last/);
  assert.match(AGENT_SYSTEM_PROMPT, /final half-bar or bar before a meaningful section boundary/);
  assert.match(AGENT_SYSTEM_PROMPT, /final answer must begin exactly with "Ho finito — "/);

  const final = await provider.step({
    previousResponseId: first.responseId,
    toolOutputs: [{ call_id: "call-1", output: '{"tracks":[]}' }],
    tools: [summaryTool],
  });
  assert.equal(final.reply, "Fatto e verificato.");
  assert.equal(bodies[1]?.previous_response_id, "resp-tool");
  assert.deepEqual(bodies[1]?.input, [
    { type: "function_call_output", call_id: "call-1", output: '{"tracks":[]}' },
  ]);
});

test("Responses provider retries an output truncated by the token budget", async () => {
  const bodies: Record<string, unknown>[] = [];
  const fakeFetch = (async (_input: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    if (bodies.length === 1) {
      return new Response(
        JSON.stringify({
          id: "resp-incomplete",
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          output: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "resp-recovered",
        status: "completed",
        output: [
          {
            type: "function_call",
            call_id: "call-recovered",
            name: "live_clip_add_notes",
            arguments: '{"notes":[]}',
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  const provider = new HttpResponsesProvider(
    "https://api.openai.com/v1/responses",
    "test-key",
    "gpt-5.6-terra",
    fakeFetch,
  );
  const result = await provider.step({
    messages: [{ role: "user", content: "arrange 128 bars" }],
    tools: [
      {
        name: "live_clip_add_notes",
        description: "Add MIDI notes.",
        inputSchema: { type: "object", properties: { notes: { type: "array" } } },
      },
    ],
  });
  assert.equal(result.toolCalls[0]?.name, "live_clip_add_notes");
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0]?.max_output_tokens, 32_000);
  assert.equal(bodies[1]?.max_output_tokens, 64_000);
  assert.match(String(bodies[1]?.instructions), /Output recovery rules/);
  assert.match(String(bodies[1]?.instructions), /Never emit more than 128 MIDI notes/);
});

test("Responses provider retries malformed function arguments", async () => {
  let attempts = 0;
  const fakeFetch = (async () => {
    attempts += 1;
    return new Response(
      JSON.stringify({
        id: `resp-${attempts}`,
        status: "completed",
        output: [
          {
            type: "function_call",
            call_id: `call-${attempts}`,
            name: "live_clip_add_notes",
            arguments: attempts === 1 ? '{"notes":[' : '{"notes":[]}',
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  const provider = new HttpResponsesProvider(
    "https://api.openai.com/v1/responses",
    "test-key",
    "gpt-5.6-terra",
    fakeFetch,
  );
  const result = await provider.step({
    messages: [{ role: "user", content: "make a long arrangement" }],
    tools: [
      {
        name: "live_clip_add_notes",
        description: "Add MIDI notes.",
        inputSchema: { type: "object", properties: { notes: { type: "array" } } },
      },
    ],
  });
  assert.equal(attempts, 2);
  assert.deepEqual(result.toolCalls[0]?.arguments, { notes: [] });
});

test("memory store rejects appending to an unknown conversation", async () => {
  const store = new MemoryStore();
  await assert.rejects(
    store.appendMessage("missing", { role: "user", content: "hello" }),
    /conversation_not_found/,
  );
});

test("client events are logged with the user id", async () => {
  const { app, store } = makeApp();
  const { token, user_id } = await signin(app, "c@example.com");
  const res = await app.request(
    "/v0/events",
    authed(token, { kind: "action.executed", payload: { op: "set_tempo" } }),
  );
  assert.equal(res.status, 200);
  const evt = store.events.find((e) => e.kind === "action.executed");
  assert.ok(evt);
  assert.equal(evt.userId, user_id);
});

test("concurrent charges cannot spend the same last credit", async () => {
  const store = new MemoryStore();
  const user = await store.createUser("concurrent@example.com");
  await store.addCredits(user.id, 1, "grant:test", "one-credit");
  const [first, second] = await Promise.all([
    store.chargeCredits(user.id, 1, "416f659c-3b43-4d00-8fad-767c3e4551ba"),
    store.chargeCredits(user.id, 1, "5af230aa-22d1-41e6-a403-26988f51c5b9"),
  ]);
  assert.equal(Number(first.charged) + Number(second.charged), 1);
  assert.equal(await store.creditBalance(user.id), 0);
});

test("license activation verifies store, product and customer email", async () => {
  const licenseProvider: LicenseProvider = {
    async activateOrValidate() {
      return {
        licenseKeyId: 90,
        instanceId: "2d473749-2037-4817-aa15-e2b44882a67c",
        status: "active",
        storeId: 10,
        productId: 20,
        variantId: 30,
        customerId: 40,
        customerEmail: "buyer@example.com",
      };
    },
  };
  const { app } = makeApp(0, {
    licenseProvider,
    lemonStoreId: 10,
    lemonProductId: 20,
  });
  const response = await app.request("/v0/auth/license", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.com",
      license_key: "valid-license-key",
      instance_name: "Studio Mac",
    }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { token: string; instance_id: string };
  assert.ok(body.token);
  assert.equal(body.instance_id, "2d473749-2037-4817-aa15-e2b44882a67c");
});

test("free beta access grants credits once and needs no Lemon Squeezy account", async () => {
  const { app } = makeApp(0, {
    betaAccessCode: "beta-secret-code",
    betaGrantCredits: 25,
  });
  const signin = () =>
    app.request("/v0/auth/license", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "beta@example.com",
        license_key: "beta-secret-code",
        instance_name: "Beta Mac",
      }),
    });
  const first = await signin();
  assert.equal(first.status, 200);
  const firstBody = (await first.json()) as { credits: number; access_mode: string };
  assert.equal(firstBody.credits, 25);
  assert.equal(firstBody.access_mode, "free_beta");

  const second = await signin();
  assert.equal(second.status, 200);
  assert.equal(((await second.json()) as { credits: number }).credits, 25);

  const rejected = await app.request("/v0/auth/license", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "stranger@example.com",
      license_key: "wrong-code",
      instance_name: "Other Mac",
    }),
  });
  assert.equal(rejected.status, 401);
});

test("license activation rejects a purchase for another customer", async () => {
  const licenseProvider: LicenseProvider = {
    async activateOrValidate() {
      return {
        licenseKeyId: 90,
        instanceId: "2d473749-2037-4817-aa15-e2b44882a67c",
        status: "active",
        storeId: 10,
        productId: 20,
        variantId: 30,
        customerId: 40,
        customerEmail: "owner@example.com",
      };
    },
  };
  const { app, store } = makeApp(0, {
    licenseProvider,
    lemonStoreId: 10,
    lemonProductId: 20,
  });
  const response = await app.request("/v0/auth/license", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "attacker@example.com",
      license_key: "someone-elses-license",
      instance_name: "Studio Mac",
    }),
  });
  assert.equal(response.status, 403);
  const failure = store.events.find((event) => event.kind === "auth.license_failed");
  assert.ok(failure, "failed activation is logged");
  assert.deepEqual(failure.payload, {
    reason: "product_or_email_mismatch",
    email: "attacker@example.com",
    keyPrefix: "someone-",
    instanceName: "Studio Mac",
    hasInstanceId: false,
    licenseStoreId: 10,
    licenseProductId: 20,
    licenseEmail: "owner@example.com",
  });
});

test("license activation logs the provider's rejection reason without the key", async () => {
  const licenseProvider: LicenseProvider = {
    async activateOrValidate() {
      throw new Error("license_inactive");
    },
  };
  const { app, store } = makeApp(0, { licenseProvider, lemonStoreId: 10, lemonProductId: 20 });
  const response = await app.request("/v0/auth/license", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.com",
      license_key: "ABCD1234-EFGH-5678",
      instance_name: "Studio Mac",
    }),
  });
  assert.equal(response.status, 401);
  const failure = store.events.find((event) => event.kind === "auth.license_failed");
  assert.ok(failure);
  const payload = failure.payload as Record<string, unknown>;
  assert.equal(payload.reason, "provider_rejected");
  assert.equal(payload.providerError, "license_inactive");
  assert.equal(payload.keyPrefix, "ABCD1234");
  assert.doesNotMatch(JSON.stringify(payload), /EFGH-5678/);
});

function paidOrder(overrides: Record<string, unknown> = {}, item: Record<string, unknown> = {}) {
  return {
    meta: { event_name: "order_created" },
    data: {
      type: "orders",
      id: "order-1",
      attributes: {
        store_id: 10,
        customer_id: 40,
        user_email: "buyer@example.com",
        status: "paid",
        first_order_item: { product_id: 20, variant_id: 30, quantity: 1, ...item },
        ...overrides,
      },
    },
  };
}

function signedWebhook(app: ReturnType<typeof makeApp>["app"], secret: string, body: unknown) {
  const payload = JSON.stringify(body);
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return app.request("/v0/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": signature },
    body: payload,
  });
}

const PACKS = new Map([
  [30, 40],
  [31, 120],
]);

test("signed paid order webhook grants the pack's credits exactly once", async () => {
  const secret = "webhook-test-secret";
  const { app, store } = makeApp(0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
    creditPacks: PACKS,
  });
  assert.equal((await signedWebhook(app, secret, paidOrder())).status, 200);
  assert.equal((await signedWebhook(app, secret, paidOrder())).status, 200);
  const user = await store.getUserByEmail("buyer@example.com");
  assert.ok(user);
  assert.equal(await store.creditBalance(user.id), 40);

  // A second, distinct order for the bigger pack adds to the same account.
  const bigger = paidOrder({}, { variant_id: 31, quantity: 2 });
  bigger.data.id = "order-2";
  assert.equal((await signedWebhook(app, secret, bigger)).status, 200);
  assert.equal(await store.creditBalance(user.id), 40 + 2 * 120);
});

test("a fully discounted order grants the free pack once per email, paid orders still add up", async () => {
  // Observed live: the FIRSTPACK redemption cap in Lemon Squeezy is global, not
  // per customer, so one email redeemed the free Starter twice and got 80 credits.
  const secret = "webhook-test-secret";
  const { app, store } = makeApp(0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
    creditPacks: PACKS,
  });
  const free = (id: string) => {
    const order = paidOrder({ total: 0, discount_total: 1200, subtotal: 1200 });
    order.data.id = id;
    return order;
  };
  const first = await signedWebhook(app, secret, free("free-1"));
  assert.deepEqual(await first.json(), { ok: true, processed: true, credits: 40 });
  const second = await signedWebhook(app, secret, free("free-2"));
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), { ok: true, processed: true, credits: 0 });
  const user = await store.getUserByEmail("buyer@example.com");
  assert.ok(user);
  assert.equal(await store.creditBalance(user.id), 40);
  assert.ok(store.events.some((e) => e.kind === "billing.free_pack_repeat" && e.userId === user.id));

  // A real purchase after the free pack is unaffected.
  const paid = paidOrder({ total: 1200 });
  paid.data.id = "paid-1";
  assert.deepEqual(await (await signedWebhook(app, secret, paid)).json(), { ok: true, processed: true, credits: 40 });
  assert.equal(await store.creditBalance(user.id), 80);
});

test("orders that are not paid, or subscription events, grant nothing", async () => {
  const secret = "webhook-test-secret";
  const { app, store } = makeApp(0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
    creditPacks: PACKS,
  });
  const pending = await signedWebhook(app, secret, paidOrder({ status: "pending" }));
  assert.equal(pending.status, 200);
  assert.deepEqual(await pending.json(), { ok: true, ignored: true });
  const subscription = await signedWebhook(app, secret, {
    meta: { event_name: "subscription_payment_success" },
    data: { type: "subscription-invoices", id: "invoice-1", attributes: { store_id: 10 } },
  });
  assert.deepEqual(await subscription.json(), { ok: true, ignored: true });
  assert.equal(await store.getUserByEmail("buyer@example.com"), null);
});

test("a paid order for an unconfigured variant is refused so Lemon Squeezy retries", async () => {
  const secret = "webhook-test-secret";
  const { app, store } = makeApp(0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
    creditPacks: PACKS,
  });
  const response = await signedWebhook(app, secret, paidOrder({}, { variant_id: 999 }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "billing_unknown_variant" });
  assert.equal(await store.getUserByEmail("buyer@example.com"), null);
});

test("the webhook route is disabled until credit packs are configured", async () => {
  const secret = "webhook-test-secret";
  const { app } = makeApp(0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
  });
  assert.equal((await signedWebhook(app, secret, paidOrder())).status, 404);
});

test("CREDIT_PACKS parses variant→credits pairs and rejects garbage", () => {
  assert.deepEqual([...parseCreditPacks("1001:40, 1002:120")], [
    [1001, 40],
    [1002, 120],
  ]);
  assert.equal(parseCreditPacks("").size, 0);
  assert.equal(parseCreditPacks(undefined).size, 0);
  assert.throws(() => parseCreditPacks("1001:0"), /invalid_env:CREDIT_PACKS/);
  assert.throws(() => parseCreditPacks("abc"), /invalid_env:CREDIT_PACKS/);
});

test("unsigned billing webhook is rejected", async () => {
  const { app } = makeApp(0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: "secret",
    creditPacks: PACKS,
  });
  const response = await app.request("/v0/webhooks/lemonsqueezy", {
    method: "POST",
    body: "{}",
  });
  assert.equal(response.status, 401);
});

test("signed billing webhook for another store is rejected without a grant", async () => {
  const secret = "webhook-test-secret";
  const { app, store } = makeApp(0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
    creditPacks: PACKS,
  });
  const payload = JSON.stringify({
    meta: { event_name: "order_created" },
    data: {
      type: "orders",
      id: "foreign-order",
      attributes: {
        store_id: 999,
        customer_id: 40,
        user_email: "buyer@example.com",
        status: "paid",
        first_order_item: { product_id: 20, variant_id: 30 },
      },
    },
  });
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  const response = await app.request("/v0/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": signature },
    body: payload,
  });
  assert.equal(response.status, 400);
  assert.equal(await store.getUserByEmail("buyer@example.com"), null);
});

test("every agent turn runs at deep thinking (full-throttle beta)", async () => {
  // Provider level: reasoningEffort lands in the Responses body with headroom.
  const bodies: Record<string, unknown>[] = [];
  const fakeFetch = (async function (_input: unknown, init?: RequestInit) {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(
      JSON.stringify({
        id: "resp-deep",
        output: [
          { type: "message", content: [{ type: "output_text", text: "ok" }] },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  const provider = new HttpResponsesProvider(
    "https://api.openai.com/v1/responses",
    "test-key",
    "gpt-5.6-terra",
    fakeFetch,
  );
  const summaryTool = {
    name: "live_set_summary",
    description: "Read Set summary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  };
  await provider.step({
    messages: [{ role: "user", content: "fai un beat" }],
    tools: [summaryTool],
    reasoningEffort: "high",
  });
  assert.deepEqual(bodies[0]?.reasoning, { effort: "high", summary: "auto" });
  assert.equal(bodies[0]?.max_output_tokens, 48_000);

  // App level: the credit estimate decides the effort on start AND continue.
  const efforts: (string | undefined)[] = [];
  const agent: AgentProvider = {
    async step(request) {
      efforts.push(request.reasoningEffort);
      if (efforts.length === 2) {
        return {
          responseId: "resp-beat-tools",
          reply: "",
          toolCalls: [
            {
              call_id: "call-beat",
              name: "live_set",
              arguments: { ref: { path: "live_set" }, property: "tempo", value: 90 },
            },
          ],
        };
      }
      return { responseId: "resp-" + efforts.length, reply: "done", toolCalls: [] };
    },
  };
  const { app } = makeApp(10, { agent });
  const { token } = await signin(app, "effort@example.com");
  const headers = { "content-type": "application/json", authorization: "Bearer " + token };
  const cheap = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "set tempo to 126",
      tools: [LIVE_SET_TOOL],
    }),
    headers,
  });
  assert.equal(cheap.status, 200);
  const beat = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "make a house beat",
      tools: [LIVE_SET_TOOL],
    }),
    headers,
  });
  assert.equal(beat.status, 200);
  const started = (await beat.json()) as {
    conversation_id: string;
    continuation_token: string;
  };
  const continued = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "continue",
      protocol_version: "0.2",
      conversation_id: started.conversation_id,
      continuation_token: started.continuation_token,
      tools: [LIVE_SET_TOOL],
      tool_outputs: [{ call_id: "call-beat", output: '{"ok":true}' }],
    }),
    headers,
  });
  assert.equal(continued.status, 200);
  assert.deepEqual(efforts, ["high", "high", "high"]);
});

test("the pressed skill button's guidance reaches the model", async () => {
  const prompts: (string | undefined)[] = [];
  const agent: AgentProvider = {
    async step(request) {
      prompts.push(request.skillPrompt);
      return { responseId: "resp-skill", reply: "done", toolCalls: [] };
    },
  };
  const { app } = makeApp(10, { agent });
  const { token } = await signin(app, "skillprompt@example.com");
  const headers = { "content-type": "application/json", authorization: "Bearer " + token };
  const res = await app.request("/v0/agent", {
    method: "POST",
    body: JSON.stringify({
      kind: "start",
      protocol_version: "0.2",
      message: "vai",
      skill: "beat_making",
      tools: [LIVE_SET_TOOL],
    }),
    headers,
  });
  assert.equal(res.status, 200);
  assert.match(String(prompts[0]), /Focus: groove/);
});

test("each continuation carries the round budget after the tool outputs; the last one disables tools", async () => {
  const bodies: Record<string, unknown>[] = [];
  const fakeFetch = (async function (_input: unknown, init?: RequestInit) {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(
      JSON.stringify({
        id: "resp-budget",
        output: [{ type: "message", content: [{ type: "output_text", text: "ok" }] }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  const provider = new HttpResponsesProvider("https://example.test/v1/responses", "k", "m", fakeFetch);
  const outputs = [{ call_id: "c1", output: "{}" }];

  await provider.step({ previousResponseId: "prev", toolOutputs: outputs, tools: [LIVE_SET_TOOL], budget: { round: 12, total: 64 } });
  await provider.step({ previousResponseId: "prev", toolOutputs: outputs, tools: [LIVE_SET_TOOL], budget: { round: 60, total: 64 } });
  await provider.step({ previousResponseId: "prev", toolOutputs: outputs, tools: [LIVE_SET_TOOL], budget: { round: 65, total: 64 }, finalOnly: true });
  // A fresh turn (no previous response) carries no notice: the prompt states the budget.
  await provider.step({ messages: [{ role: "user", content: "ciao" }], tools: [LIVE_SET_TOOL], budget: { round: 1, total: 64 } });

  const inputs = bodies.map((b) => b.input as Record<string, unknown>[]);
  const notice = (i: number) => String(inputs[i]?.[1]?.content);
  // The notice is the LAST item, after the tool outputs, so the cached prefix is untouched.
  assert.equal(inputs[0]?.[0]?.type, "function_call_output");
  assert.deepEqual(inputs[0]?.[1], { role: "developer", content: "[Tembro] Round 12 of 64." });
  assert.match(notice(1), /Round 60 of 64: 4 left after this one\. Finish the mutation in flight/);
  assert.match(notice(1), /"Pausa — "/);
  assert.equal(bodies[1]?.tool_choice, "auto");
  assert.match(notice(2), /budget exhausted \(64 of 64\)\. No tool calls are possible/);
  assert.equal(bodies[2]?.tool_choice, "none");
  assert.equal(inputs[3]?.length, 1);
  assert.equal(bodies[3]?.tool_choice, "auto");

  assert.match(AGENT_SYSTEM_PROMPT, /begin instead with "Pausa — "/);
  assert.match(AGENT_SYSTEM_PROMPT, /Build the core first/);
});

test("a turn that exhausts the round budget ends with a spoken report, not an error", async () => {
  // A model that never stops asking for tools, but answers when tools are disabled.
  const seen: { round?: number; finalOnly?: boolean; toolChoiceNone: boolean }[] = [];
  const agent: AgentProvider = {
    async step(request) {
      seen.push({ round: request.budget?.round, finalOnly: request.finalOnly, toolChoiceNone: Boolean(request.finalOnly) });
      if (request.finalOnly) {
        return {
          responseId: "resp-paused",
          reply: "Pausa — groove, bass and hook are in Live and verified; the breakdown and outro remain. Continue, or listen first?",
          toolCalls: [
            // Even a stray tool call here must be dropped by the server.
            { call_id: "stray", name: "live_set_summary", arguments: {} },
          ],
        };
      }
      return {
        responseId: "resp-" + seen.length,
        reply: "",
        toolCalls: [{ call_id: "call-" + seen.length, name: "live_set", arguments: { ref: { path: "live_set" }, property: "tempo", value: 120 } }],
      };
    },
  };
  const { app, store } = makeApp(10, { agent });
  const { token } = await signin(app, "budget@example.com");
  const headers = { "content-type": "application/json", authorization: "Bearer " + token };
  const post = (body: unknown) =>
    app.request("/v0/agent", { method: "POST", headers, body: JSON.stringify(body) });
  let step = (await (
    await post({ kind: "start", protocol_version: "0.2", message: "arrange a full 128-bar track", tools: [LIVE_SET_TOOL] })
  ).json()) as Record<string, unknown>;
  assert.equal(step.kind, "tool_calls");
  assert.equal(step.credits_charged, 4);
  let rounds = 1;
  while (step.kind === "tool_calls") {
    rounds += 1;
    assert.ok(rounds <= AGENT_STEP_BUDGET + 1, "the loop must end at the budget");
    const res = await post({
      kind: "continue",
      protocol_version: "0.2",
      conversation_id: step.conversation_id,
      continuation_token: step.continuation_token,
      tools: [LIVE_SET_TOOL],
      tool_outputs: [{ call_id: "call-" + (rounds - 1), output: '{"ok":true}' }],
    });
    assert.equal(res.status, 200, `round ${rounds}: ${await res.clone().text()}`);
    step = (await res.json()) as Record<string, unknown>;
  }
  assert.equal(step.kind, "final");
  assert.equal(rounds, AGENT_STEP_BUDGET + 1);
  assert.match(String(step.reply), /^Pausa — /);
  assert.equal(step.continuation_token, undefined);
  // The model was told its round every time, and only the last call had tools disabled.
  assert.deepEqual(seen.slice(1, 3).map((s) => s.round), [2, 3]);
  assert.equal(seen.at(-1)?.round, AGENT_STEP_BUDGET + 1);
  assert.deepEqual(seen.map((s) => s.finalOnly ?? false).filter(Boolean).length, 1);
  // The work in Live is real and was reported: no refund, one event to count how often this happens.
  const user = await store.getUserByEmail("budget@example.com");
  assert.ok(user);
  assert.equal(await store.creditBalance(user.id), 6);
  const exhausted = store.events.filter((e) => e.kind === "agent.budget_exhausted");
  assert.equal(exhausted.length, 1);
  assert.equal((exhausted[0]?.payload as { ignoredToolCalls: number }).ignoredToolCalls, 1);
  assert.equal(store.events.filter((e) => e.kind === "agent.completed").length, 1);
});
