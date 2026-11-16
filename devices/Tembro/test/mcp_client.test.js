"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { McpClient } = require("../code/mcp_client.js");

function mockTransport() {
  const client = new McpClient("unused-in-memory-transport");
  client.initialized = true;
  const sent = [];
  client._send = (message) => sent.push(message);
  const reply = (request, value) => {
    client._onData(
      JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        result: { structuredContent: value },
      }) + "\n",
    );
  };
  return { client, sent, reply };
}

function isUnknown(err, sent) {
  return err.outcomeUnknown === true &&
    err.code === "MCP_OUTCOME_UNKNOWN" &&
    err.requestSent === sent;
}

test("a timed-out sent call blocks queued mutations and late success cannot release quarantine", async () => {
  const { client, sent, reply } = mockTransport();
  const first = client.callTool("live_call", { method: "duplicate_clip_to" }, 10);
  const second = client.callTool("live_call", { method: "delete_clip" }, 100);
  await Promise.all([
    assert.rejects(first, (err) => isUnknown(err, true)),
    assert.rejects(second, (err) => isUnknown(err, false)),
  ]);

  assert.equal(sent.length, 1, "the queued second mutation must never be sent");
  assert.equal(client.quarantined, true);
  assert.equal(client.quarantine.requestId, sent[0].id);
  assert.equal(client.quarantine.toolName, "live_call");
  assert.ok(Object.isFrozen(client.quarantine));
  const evidence = client.quarantine;

  reply(sent[0], { ok: true });
  assert.equal(client.quarantine, evidence, "late success does not verify the affected Live objects");
  await assert.rejects(client.callTool("live_get", {}), (err) => isUnknown(err, false));
  await assert.rejects(client.listTools(), (err) => isUnknown(err, false));
  assert.equal(sent.length, 1);

  client._send = (message) => {
    sent.push(message);
    queueMicrotask(() => reply(message, { server_thread_responsive: true }));
  };
  assert.deepEqual(await client.callTool("live_bridge_status", {}), {
    server_thread_responsive: true,
  });
  assert.equal(client.quarantine, evidence, "a responsive bridge is not operation reconciliation");
  await assert.rejects(client.callTool("live_call", {}), (err) => isUnknown(err, false));
  assert.deepEqual(sent.map((message) => message.params.name), ["live_call", "live_bridge_status"]);
});

test("subprocess loss after send quarantines the request and survives reinitialization", async () => {
  const { client, sent, reply } = mockTransport();
  client._send = (message) => {
    sent.push(message);
    setImmediate(() => client._failAll(new Error("MCP server process exited")));
  };
  const first = client.callTool("live_call", { method: "fire" }, 100);
  const second = client.callTool("live_call", { method: "fire" }, 100);
  await Promise.all([
    assert.rejects(first, (err) => isUnknown(err, true)),
    assert.rejects(second, (err) => isUnknown(err, false)),
  ]);
  assert.equal(sent.length, 1);
  assert.equal(client.initialized, false);
  const evidence = client.quarantine;

  // Simulate the next status connection's successful handshake. A new
  // subprocess cannot settle what the previous one already sent to Live.
  client._ensureInitialized = async () => { client.initialized = true; };
  client._send = (message) => {
    sent.push(message);
    queueMicrotask(() => reply(message, { server_thread_responsive: true }));
  };
  await client.callTool("live_bridge_status", {});
  assert.equal(client.quarantine, evidence);
  await assert.rejects(client.callTool("live_call", {}), (err) => isUnknown(err, false));
  assert.equal(sent.length, 2);
});

test("failure before a tool request is sent does not invent an unknown Live outcome", async () => {
  const { client } = mockTransport();
  client._send = () => { throw new Error("bridge is not running"); };
  await assert.rejects(client.callTool("live_call", {}, 100), (err) => {
    assert.match(err.message, /bridge is not running/);
    return !err.outcomeUnknown;
  });
  assert.equal(client.quarantined, false);
  assert.equal(client.quarantine, null);
  assert.equal(client.pending.size, 0);
});

test("a definitive tool error leaves the serial queue usable", async () => {
  const { client, sent, reply } = mockTransport();
  client._send = (message) => {
    sent.push(message);
    queueMicrotask(() => {
      if (sent.length === 1) {
        client._onData(JSON.stringify({
          id: message.id,
          result: { isError: true, content: [{ type: "text", text: "signature mismatch" }] },
        }) + "\n");
      } else {
        reply(message, { set_signature: "current" });
      }
    });
  };
  await assert.rejects(client.callTool("live_call", {}), /signature mismatch/);
  assert.deepEqual(await client.callTool("live_set_summary", {}), { set_signature: "current" });
  assert.equal(client.quarantined, false);
});

for (const message of [
  "Ableton bridge request 'live_call' timed out after 20s waiting for a response. The request was sent, so it was not retried automatically.",
  "Tembro operation has unknown sent outcome; do not retry",
  "-32000 timed out waiting for Live main thread",
  "Live main-thread request already in flight (live_call for 20.0s); refusing to enqueue live_get.",
  "Live main thread is in stall cooldown after live_call timed out; refusing to enqueue live_get for 2.0s.",
  "Ableton bridge client is in stall cooldown after 'live_call' timed out; refusing to send 'live_get' for 2.0s.",
]) {
  for (const format of ["rpc_error", "tool_error"]) {
    test("upstream uncertainty quarantines " + format + ": " + message, async () => {
      const { client, sent } = mockTransport();
      client._send = (request) => {
        sent.push(request);
        const response = format === "rpc_error"
          ? { id: request.id, error: { code: -32000, message } }
          : { id: request.id, result: { isError: true, content: [{ type: "text", text: message }] } };
        queueMicrotask(() => client._onData(JSON.stringify(response) + "\n"));
      };
      await Promise.all([
        assert.rejects(client.callTool("live_call", {}), (err) => isUnknown(err, true)),
        assert.rejects(client.callTool("live_call", {}), (err) => isUnknown(err, false)),
      ]);
      assert.equal(client.quarantined, true);
      assert.equal(sent.length, 1);
      assert.equal(client.quarantine.reason, message);
    });
  }
}

test("local readback uncertainty shares transport quarantine and blocks subsequent calls", async () => {
  const { client, sent, reply } = mockTransport();
  client._send = (request) => {
    sent.push(request);
    queueMicrotask(() => reply(request, { ok: true }));
  };
  await client.callTool("live_clip_variation", { action: "create" });
  const error = client.markOutcomeUnknown("live_clip_variation", "created candidate readback is missing");
  assert.ok(isUnknown(error, true));
  assert.equal(error.quarantine.requestId, null);
  assert.equal(error.quarantine.toolName, "live_clip_variation");
  assert.equal(client.quarantined, true);
  await assert.rejects(client.callTool("live_call", {}), (err) => isUnknown(err, false));
  assert.equal(sent.length, 1);
  const evidence = client.quarantine;
  client.markOutcomeUnknown("another operation", "later failure");
  assert.equal(client.quarantine, evidence);
});
