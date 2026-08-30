"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { TembroApi, loadSession } = require("../code/api.js");

test("paid device activates once, persists its instance, and sends protocol-safe chat", async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tembro-api-test-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const sessionFile = path.join(tempDir, "session.json");
  const requests = [];

  const requestImpl = async (baseUrl, method, pathName, body, token) => {
    requests.push({ baseUrl, method, pathName, body, token });
    if (pathName === "/v0/auth/license") {
      return {
        status: 200,
        json: {
          token: "session-token",
          instance_id: "2d473749-2037-4817-aa15-e2b44882a67c",
          credits: 500,
          protocol_version: "0.1",
        },
      };
    }
    if (pathName === "/v0/chat") {
      return {
        status: 200,
        json: {
          request_id: body.request_id,
          protocol_version: "0.1",
          conversation_id: "416f659c-3b43-4d00-8fad-767c3e4551ba",
          reply: "ok",
          actions: [],
          credits_remaining: 499,
        },
      };
    }
    if (pathName === "/v0/agent") {
      if (body.kind === "start") {
        return {
          status: 200,
          json: {
            protocol_version: "0.2",
            kind: "tool_calls",
            conversation_id: "416f659c-3b43-4d00-8fad-767c3e4551ba",
            reply: "",
            tool_calls: [
              { call_id: "call-1", name: "live_set_summary", arguments: {} },
            ],
            continuation_token: "signed-continuation-token-for-test",
            credits_remaining: 498,
          },
        };
      }
      return {
        status: 200,
        json: {
          protocol_version: "0.2",
          kind: "final",
          conversation_id: body.conversation_id,
          reply: "done",
          tool_calls: [],
          credits_remaining: 498,
        },
      };
    }
    if (pathName === "/v0/credits") {
      return { status: 200, json: { credits: 498 } };
    }
    return { status: 404, json: null };
  };
  const api = new TembroApi("https://api.tembro.test", sessionFile, requestImpl);

  await api.licenseSignin("buyer@example.com", "license-key-123", "Studio Mac");
  assert.deepEqual(loadSession(sessionFile), {
    token: "session-token",
    instanceId: "2d473749-2037-4817-aa15-e2b44882a67c",
  });

  await api.chat("make a beat", { tempo: 120, tracks: [] });
  assert.equal(requests[0].pathName, "/v0/auth/license");
  assert.equal(requests[0].body.license_key, "license-key-123");
  assert.equal(requests[1].pathName, "/v0/chat");
  assert.equal(requests[1].token, "session-token");
  assert.equal(requests[1].body.protocol_version, "0.1");
  assert.match(requests[1].body.request_id, /^[0-9a-f-]{36}$/);
  assert.equal(requests[1].body.live_context.tempo, 120);

  const tools = [
    {
      name: "live_set_summary",
      description: "summary",
      inputSchema: { type: "object", properties: {} },
    },
  ];
  const first = await api.agentStart("make a beat", { tempo: 120, tracks: [] }, tools);
  assert.equal(first.kind, "tool_calls");
  assert.equal(requests[2].pathName, "/v0/agent");
  assert.equal(requests[2].body.protocol_version, "0.2");
  const final = await api.agentContinue(
    first.continuation_token,
    first.conversation_id,
    tools,
    [{ call_id: "call-1", output: '{"ok":true}' }],
  );
  assert.equal(final.kind, "final");
  assert.equal(await api.credits(), 498);

  const reloaded = new TembroApi("https://api.tembro.test", sessionFile, requestImpl);
  await reloaded.licenseSignin("buyer@example.com", "license-key-123", "Studio Mac");
  assert.equal(
    requests[5].body.instance_id,
    "2d473749-2037-4817-aa15-e2b44882a67c",
  );
});
