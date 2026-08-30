import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { MemoryStore } from "../src/store.js";
import { StubProvider, parseLlmOutput } from "../src/llm.js";
import type { LlmProvider } from "../src/llm.js";
import type { Message } from "../src/types.js";

function makeApp(llm?: LlmProvider, credits = 100) {
  const store = new MemoryStore();
  const app = createApp({
    store,
    llm: llm ?? new StubProvider(),
    allowDevSignin: true,
    signupGrantCredits: credits,
  });
  return { app, store };
}

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
    body: JSON.stringify(body),
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

test("chat requires auth", async () => {
  const { app } = makeApp();
  const res = await app.request("/v0/chat", {
    method: "POST",
    body: JSON.stringify({ message: "ciao" }),
    headers: { "content-type": "application/json" },
  });
  assert.equal(res.status, 401);
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
