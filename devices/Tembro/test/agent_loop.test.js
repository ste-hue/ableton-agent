"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boundedJson, runAgentTurn, safeTools } = require("../code/agent_loop.js");

const SUMMARY_TOOL = {
  name: "live_set_summary",
  description: "Read the Live Set.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

test("safeTools preserves MCP schemas and removes arbitrary-code tools", () => {
  const tools = safeTools([
    SUMMARY_TOOL,
    {
      name: "live_exec",
      description: "dangerous",
      inputSchema: { type: "object", properties: {} },
    },
    SUMMARY_TOOL,
  ]);
  assert.deepEqual(tools, [SUMMARY_TOOL]);
});

test("distributed loop executes requested MCP calls sequentially and returns final reply", async () => {
  const calls = [];
  const statuses = [];
  const client = {
    async listTools() {
      return [SUMMARY_TOOL];
    },
    async callTool(name, args) {
      calls.push([name, args]);
      return { set_signature: "sig-1", tracks: [] };
    },
  };
  const api = {
    async agentStart(message, context, tools, conversationId) {
      assert.equal(message, "fammi una batteria");
      assert.equal(context.tempo, 120);
      assert.equal(tools.length, 1);
      assert.equal(conversationId, null);
      return {
        kind: "tool_calls",
        conversation_id: "conversation-1",
        continuation_token: "continuation-1",
        tool_calls: [{ call_id: "call-1", name: "live_set_summary", arguments: {} }],
        credits_remaining: 9,
      };
    },
    async agentContinue(token, conversationId, tools, outputs) {
      assert.equal(token, "continuation-1");
      assert.equal(conversationId, "conversation-1");
      assert.equal(tools.length, 1);
      assert.equal(outputs[0].call_id, "call-1");
      assert.match(outputs[0].output, /sig-1/);
      return {
        kind: "final",
        conversation_id: "conversation-1",
        reply: "Ho creato e verificato la batteria.",
        tool_calls: [],
        credits_remaining: 9,
      };
    },
  };
  const result = await runAgentTurn({
    api,
    client,
    message: "fammi una batteria",
    liveContext: { tempo: 120 },
    conversationId: null,
    onStatus: (status) => statuses.push(status),
  });
  assert.equal(result.kind, "final");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["live_set_summary", {}]);
  assert.ok(statuses.some((status) => status.includes("set summary")));
});

test("boundedJson truncates unexpectedly large MCP results", () => {
  const output = boundedJson({ huge: "x".repeat(1000) }, 200);
  assert.ok(output.length < 1100);
  assert.match(output, /transfer limit/);
});
