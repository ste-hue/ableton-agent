"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  TEMBRO_ARRANGE_CLIP_TOOL,
  arrangeClip,
  boundedJson,
  completionReply,
  runAgentTurn,
  safeTools,
} = require("../code/agent_loop.js");

const SUMMARY_TOOL = {
  name: "live_set_summary",
  description: "Read the Live Set.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

const DUPLICATE_TOOL = {
  name: "live_clip_duplicate_to_arrangement",
  description: "Duplicate a clip.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

const GET_TOOL = {
  name: "live_get",
  description: "Read an object.",
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

test("safeTools advertises Tembro's verified arrangement macro when its primitives exist", () => {
  const tools = safeTools([SUMMARY_TOOL, DUPLICATE_TOOL, GET_TOOL]);
  assert.deepEqual(tools.slice(0, 3), [SUMMARY_TOOL, DUPLICATE_TOOL, GET_TOOL]);
  assert.deepEqual(tools[3], TEMBRO_ARRANGE_CLIP_TOOL);
});

test("arrangement macro places clips sequentially with fresh signatures and readback", async () => {
  const calls = [];
  let summary = 0;
  const client = {
    async callTool(name, args) {
      calls.push([name, args]);
      if (name === "live_set_summary") {
        summary += 1;
        const clips = [];
        if (summary >= 2) clips.push({ id: 101 });
        if (summary >= 3) clips.push({ id: 102 });
        return {
          set_signature: `sig-${summary - 1}`,
          tracks: [{ id: 7, arrangement_clips: clips }],
        };
      }
      if (name === "live_clip_duplicate_to_arrangement") {
        const expected = args.destination_time === 0 ? "sig-0" : "sig-1";
        assert.equal(args.expected_set_signature, expected);
        return { ok: true };
      }
      if (name === "live_get") {
        return {
          properties: {
            start_time: args.ref.id === 101 ? 0 : 16,
            end_time: args.ref.id === 101 ? 16 : 32,
            is_arrangement_clip: true,
          },
        };
      }
      throw new Error("unexpected tool " + name);
    },
  };
  const result = await arrangeClip(client, {
    track: { id: 7 },
    clip: { id: 70 },
    destination_times: [0, 16],
    expected_set_signature: "sig-0",
  });
  assert.equal(result.placed, 2);
  assert.equal(result.set_signature, "sig-2");
  assert.deepEqual(
    calls.map(([name]) => name),
    [
      "live_set_summary",
      "live_clip_duplicate_to_arrangement",
      "live_set_summary",
      "live_get",
      "live_clip_duplicate_to_arrangement",
      "live_set_summary",
      "live_get",
    ],
  );
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

test("completion reply always announces that the work is finished", () => {
  assert.equal(
    completionReply("Fatto e verificato in Live."),
    "Ho finito — lavoro completato e verificato in Live.",
  );
  assert.equal(
    completionReply("Ho finito — arrangiamento verificato."),
    "Ho finito — arrangiamento verificato.",
  );
});
