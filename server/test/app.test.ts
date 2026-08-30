import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/app.js";
import { MemoryStore } from "../src/store.js";
import {
  HttpChatProvider,
  HttpResponsesProvider,
  StubAgentProvider,
  StubProvider,
  AGENT_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
  parseLlmOutput,
} from "../src/llm.js";
import type { AgentProvider, LlmProvider } from "../src/llm.js";
import type { LicenseProvider } from "../src/billing.js";
import type { Message } from "../src/types.js";

function makeApp(llm?: LlmProvider, credits = 100, extra: Partial<AppConfig> = {}) {
  const store = new MemoryStore();
  const app = createApp({
    store,
    llm: llm ?? new StubProvider(),
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
    body: JSON.stringify({ protocol_version: "0.1", ...(body as object) }),
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

test("landing page explains the complete customer journey", async () => {
  const { app } = makeApp(undefined, 100, {
    checkoutUrl: "https://tembro.lemonsqueezy.com/buy/test-product",
    supportEmail: "support@tembro.test",
  });
  const res = await app.request("/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  assert.match(res.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  const body = await res.text();
  assert.match(body, /Big ideas\.<br>Tiny clicks\./);
  assert.match(body, /Buy/);
  assert.match(body, /Install/);
  assert.match(body, /Activate/);
  assert.match(body, /Chat/);
  assert.match(body, /https:\/\/tembro\.lemonsqueezy\.com\/buy\/test-product/);
  assert.match(body, /Tembro credits are product units, not OpenAI tokens/);
});

test("landing page rejects unsafe checkout URLs", async () => {
  const { app } = makeApp(undefined, 100, { checkoutUrl: "javascript:alert(1)" });
  const body = await (await app.request("/")).text();
  assert.doesNotMatch(body, /javascript:/);
  assert.match(body, /Early access soon/);
});

test("landing page switches to a free beta download without payment copy", async () => {
  const { app } = makeApp(undefined, 100, {
    downloadUrl: "https://github.com/ste-hue/ableton-agent/releases/download/v0-beta/Tembro.zip",
  });
  const body = await (await app.request("/")).text();
  assert.match(body, /Download free beta/);
  assert.match(body, /No card, checkout, or subscription required/);
  assert.match(body, /Free beta access code activation/);
  assert.doesNotMatch(body, /Secure checkout and license delivery/);
});

test("chat requires auth", async () => {
  const { app } = makeApp();
  const res = await app.request("/v0/chat", {
    method: "POST",
    body: JSON.stringify({ message: "ciao" }),
    headers: { "content-type": "application/json" },
  });
  assert.equal(res.status, 401);
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
  const { app } = makeApp(undefined, 2, { agent });
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
  };
  assert.equal(first.kind, "tool_calls");
  assert.equal(first.credits_remaining, 1);

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
  };
  assert.equal(final.kind, "final");
  assert.match(final.reply, /126 BPM/);
  assert.equal(final.credits_remaining, 1);
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

test("chat charges credits and returns a plan", async () => {
  const planner: LlmProvider = {
    async complete(messages: Message[]) {
      return {
        reply: "Setting tempo to 126 and making a house beat.",
        actions: [
          { op: "set_tempo" as const, bpm: 126 },
          { op: "create_midi_track" as const, name: "Drums" },
        ],
      };
    },
  };
  const { app } = makeApp(planner, 10);
  const { token } = await signin(app, "a@example.com");

  const res = await app.request("/v0/chat", authed(token, { message: "fammi un beat house a 126 BPM" }));
  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    reply: string;
    actions: unknown[];
    credits_remaining: number;
    conversation_id: string;
  };
  assert.equal(data.actions.length, 2);
  assert.equal(data.credits_remaining, 9);

  // follow-up in the same conversation works
  const res2 = await app.request(
    "/v0/chat",
    authed(token, { message: "rendilo più minimale", conversation_id: data.conversation_id }),
  );
  assert.equal(res2.status, 200);
});

test("insufficient credits → 402", async () => {
  const { app } = makeApp(undefined, 0);
  const { token } = await signin(app, "b@example.com");
  const res = await app.request("/v0/chat", authed(token, { message: "hi" }));
  assert.equal(res.status, 402);
});

test("users cannot access each other's conversations", async () => {
  const { app } = makeApp();
  const alice = await signin(app, "alice@example.com");
  const bob = await signin(app, "bob@example.com");

  const res = await app.request("/v0/chat", authed(alice.token, { message: "ciao" }));
  const { conversation_id } = (await res.json()) as { conversation_id: string };

  const intruded = await app.request(
    "/v0/chat",
    authed(bob.token, { message: "hijack", conversation_id }),
  );
  assert.equal(intruded.status, 404);
});

test("invalid LLM action plans are rejected before reaching the client", () => {
  assert.throws(() =>
    parseLlmOutput(JSON.stringify({ reply: "ok", actions: [{ op: "set_tempo", bpm: 5000 }] })),
  );
  assert.throws(() => parseLlmOutput("not json"));
  const ok = parseLlmOutput(
    JSON.stringify({ reply: "ok", actions: [{ op: "stop_all" }] }),
  );
  assert.equal(ok.actions.length, 1);
});

test("system prompt converts non-quarter-note meters to Ableton beats", () => {
  assert.match(SYSTEM_PROMPT, /N x numerator x\s*\(4 \/ denominator\)/);
  assert.match(SYSTEM_PROMPT, /4 bars in 6\/8 = 12/);
});

test("OpenAI V0 provider uses Luna with bounded low-effort JSON output", async () => {
  let requestBody: Record<string, unknown> = {};
  const fakeFetch = (async function (this: unknown, _input: unknown, init?: RequestInit) {
    assert.equal(this, globalThis);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"reply":"ok","actions":[]}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  const provider = new HttpChatProvider(
    "https://api.openai.com/v1/chat/completions",
    "test-key",
    "gpt-5.6-luna",
    fakeFetch,
  );
  const result = await provider.complete([{ role: "user", content: "make a beat" }]);
  assert.equal(result.reply, "ok");
  assert.equal(requestBody.model, "gpt-5.6-luna");
  assert.equal(requestBody.reasoning_effort, "low");
  assert.equal(requestBody.max_completion_tokens, 2_000);
  assert.deepEqual(requestBody.response_format, { type: "json_object" });
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
  assert.deepEqual(bodies[0]?.reasoning, { effort: "medium" });
  assert.equal(bodies[0]?.parallel_tool_calls, false);
  assert.match(String(bodies[0]?.instructions), /expert music-making agent/);
  assert.match(AGENT_SYSTEM_PROMPT, /Drum Rack/);

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

test("local stub supports a deterministic tempo smoke test", async () => {
  const result = await new StubProvider().complete([
    { role: "user", content: "Set tempo to 123" },
  ]);
  assert.equal(result.reply, "Setting tempo to 123 BPM.");
  assert.deepEqual(result.actions, [{ op: "set_tempo", bpm: 123 }]);
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

test("selected clip context (notes) reaches the LLM provider", async () => {
  let seenContext: unknown = null;
  const capture: LlmProvider = {
    async complete(_messages: Message[], liveContext?: unknown) {
      seenContext = liveContext;
      return { reply: "ok", actions: [] };
    },
  };
  const { app } = makeApp(capture);
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
    "/v0/chat",
    authed(token, { message: "make it more syncopated", live_context }),
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
    "/v0/chat",
    authed(token, {
      message: "hi",
      live_context: { selection: { track: 0, slot: 0, clip: { notes: [] } } }, // missing length_beats
    }),
  );
  assert.equal(res.status, 400);
});

test("duplicate request ids cannot charge twice", async () => {
  const { app } = makeApp(undefined, 2);
  const { token } = await signin(app, "duplicate@example.com");
  const request_id = "d1843f1e-f120-4bd7-87bb-a581c12dc17d";
  const first = await app.request(
    "/v0/chat",
    authed(token, { request_id, message: "first" }),
  );
  assert.equal(first.status, 200);
  const second = await app.request(
    "/v0/chat",
    authed(token, { request_id, message: "retry" }),
  );
  assert.equal(second.status, 409);
  const credits = await app.request("/v0/credits", {
    headers: { authorization: "Bearer " + token },
  });
  assert.equal(((await credits.json()) as { credits: number }).credits, 1);
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

test("provider failure refunds the reserved chat credit", async () => {
  const failing: LlmProvider = {
    async complete() {
      throw new Error("provider_down");
    },
  };
  const { app } = makeApp(failing, 1);
  const { token } = await signin(app, "refund@example.com");
  const response = await app.request(
    "/v0/chat",
    authed(token, {
      request_id: "bfdfaec1-4972-4bc6-9a55-447f43480060",
      message: "try",
    }),
  );
  assert.equal(response.status, 500);
  const credits = await app.request("/v0/credits", {
    headers: { authorization: "Bearer " + token },
  });
  assert.equal(((await credits.json()) as { credits: number }).credits, 1);
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
  const { app } = makeApp(undefined, 0, {
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
  const { app } = makeApp(undefined, 0, {
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
  const { app } = makeApp(undefined, 0, {
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
});

test("signed subscription payment webhook grants credits exactly once", async () => {
  const secret = "webhook-test-secret";
  const { app, store } = makeApp(undefined, 0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
    subscriptionGrantCredits: 500,
  });
  const payload = JSON.stringify({
    meta: { event_name: "subscription_payment_success" },
    data: {
      type: "subscription-invoices",
      id: "invoice-1",
      attributes: {
        store_id: 10,
        product_id: 20,
        variant_id: 30,
        customer_id: 40,
        user_email: "buyer@example.com",
      },
    },
  });
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  const send = () =>
    app.request("/v0/webhooks/lemonsqueezy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": signature },
      body: payload,
    });
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  const user = await store.getUserByEmail("buyer@example.com");
  assert.ok(user);
  assert.equal(await store.creditBalance(user.id), 500);
});

test("unsigned billing webhook is rejected", async () => {
  const { app } = makeApp(undefined, 0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: "secret",
  });
  const response = await app.request("/v0/webhooks/lemonsqueezy", {
    method: "POST",
    body: "{}",
  });
  assert.equal(response.status, 401);
});

test("signed billing webhook for another store is rejected without a grant", async () => {
  const secret = "webhook-test-secret";
  const { app, store } = makeApp(undefined, 0, {
    lemonStoreId: 10,
    lemonProductId: 20,
    lemonWebhookSecret: secret,
  });
  const payload = JSON.stringify({
    meta: { event_name: "subscription_payment_success" },
    data: {
      type: "subscription-invoices",
      id: "foreign-invoice",
      attributes: {
        store_id: 999,
        customer_id: 40,
        user_email: "buyer@example.com",
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
