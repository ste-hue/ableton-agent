"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createLatencyTrace, runAgentTurn } = require("../code/agent_loop.js");

function clockTrace() {
  let time = 100;
  return { trace: createLatencyTrace({ now: () => time }), advance: (ms) => { time += ms; } };
}

function scenario({ trace = null, advance = () => {}, failTool = false, forbidden = false } = {}) {
  const calls = [];
  const final = { kind: "final", reply: "done", conversation_id: "conversation-secret", credits_remaining: 8 };
  let inFlight = 0;
  let maxInFlight = 0;
  const advertised = [{ name: "live_get", inputSchema: { type: "object" } }];
  const client = {
    async listTools() { advance(5); calls.push(["discover"]); return advertised; },
    async callTool(name, args) {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      calls.push([name, args]);
      await Promise.resolve();
      advance(7);
      inFlight -= 1;
      if (failTool) throw new Error("private project path");
      return { value: "private note è" };
    },
  };
  const api = {
    async agentStart(...args) {
      calls.push(["start", ...args]); advance(100);
      return {
        kind: "tool_calls", continuation_token: "secret-token", conversation_id: "conversation-secret",
        tool_calls: [0, 1].map((i) => ({
          call_id: "id-" + i, name: forbidden ? "live_exec" : "live_get",
          arguments: { ref: { id: i }, private_value: "private argument" },
        })),
      };
    },
    async agentContinue(...args) { calls.push(["continue", ...args]); advance(80); return final; },
  };
  return {
    calls, final, api, client, maxInFlight: () => maxInFlight,
    options: { api, client, message: "private prompt", liveContext: { title: "private song" }, latency: trace },
  };
}

test("trace records stage totals using an injected monotonic clock", async () => {
  const { trace, advance } = clockTrace();
  const value = {};
  assert.equal(await trace.measure("context", async () => { advance(12.5); return value; }), value);
  trace.measureSync("encode_result", () => { advance(0.5); });
  trace.addOutputBytes(17);
  const report = trace.finish("completed");
  assert.equal(report.elapsed_ms, 13);
  assert.equal(report.stages.context.calls, 1);
  assert.equal(report.stages.context.wait_ms, 12.5);
  assert.equal(report.stages.encode_result.wait_ms, 0.5);
  assert.equal(report.result_json_bytes, 17);
  assert.equal(report.scope, "client_wait");
});

test("aggregates repeated tool calls without retaining an event stream", async () => {
  const { trace, advance } = clockTrace();
  for (let i = 0; i < 1000; i += 1) {
    await trace.measure("local_tool", () => { advance(1); }, "live_get");
  }
  const report = trace.finish("completed");
  assert.equal(report.tools.live_get.calls, 1000);
  assert.equal(report.tools.live_get.wait_ms, 1000);
  assert.equal(report.tools.live_get.max_wait_ms, 1);
  assert.equal(Object.keys(report.stages).length, 1);
  assert.equal(Object.keys(report.tools).length, 1);
  assert.ok(JSON.stringify(report).length < 1000);
});

test("errors and synchronous throws preserve the exact original exception", async () => {
  const { trace, advance } = clockTrace();
  const error = new Error("secret failure details");
  await assert.rejects(trace.measure("cloud_start", () => { advance(3); throw error; }), (e) => e === error);
  assert.throws(() => trace.measureSync("encode_result", () => { advance(2); throw error; }), (e) => e === error);
  const report = trace.finish("failed");
  assert.equal(report.stages.cloud_start.errors, 1);
  assert.equal(report.stages.encode_result.errors, 1);
  assert.ok(!JSON.stringify(report).includes("secret"));
});

test("a stopped wait is not reported as cancellation of its underlying operation", async () => {
  const { trace, advance } = clockTrace();
  const error = Object.assign(new Error("stopped"), { stopped: true });
  await assert.rejects(trace.measure("local_tool", () => { advance(8); throw error; }, "live_get"));
  const report = trace.finish("abandoned");
  assert.equal(report.stages.local_tool.abandoned_waits, 1);
  assert.equal(report.stages.local_tool.errors, 0);
  assert.equal(report.outcome, "abandoned");
  assert.ok(!("cancelled" in report));
});

test("watchdog finalization counts pending wait once and ignores late completion", async () => {
  const { trace, advance } = clockTrace();
  let resolve;
  const pending = trace.measure("local_tool", () => new Promise((r) => { resolve = r; }), "live_get");
  advance(20);
  const report = trace.finish("abandoned");
  assert.equal(report.stages.local_tool.wait_ms, 20);
  assert.equal(report.tools.live_get.abandoned_waits, 1);
  advance(500);
  resolve("actual outcome arrives later");
  assert.equal(await pending, "actual outcome arrives later");
  assert.equal(trace.finish("completed"), report);
  assert.equal(report.stages.local_tool.wait_ms, 20);
  assert.equal(report.stages.local_tool.calls, 1);
});

test("finalization ignores late rejection but propagates it to the original caller", async () => {
  const { trace } = clockTrace();
  let reject;
  const pending = trace.measure("cloud_start", () => new Promise((_, r) => { reject = r; }));
  const report = trace.finish("abandoned");
  const error = new Error("late private failure");
  reject(error);
  await assert.rejects(pending, (e) => e === error);
  assert.equal(trace.finish("failed"), report);
  assert.equal(report.stages.cloud_start.errors, 0);
});

test("unknown keys and tool names cannot leak into diagnostics", async () => {
  const { trace } = clockTrace();
  assert.equal(await trace.measure("private path", () => 42, "private name"), 42);
  await trace.measure("local_tool", () => {}, "private name");
  const report = trace.finish("private outcome");
  assert.deepEqual(Object.keys(report.stages), ["local_tool"]);
  assert.deepEqual(Object.keys(report.tools), []);
  assert.equal(report.outcome, "failed");
  assert.ok(!JSON.stringify(report).includes("private"));
});

test("byte counter rejects invalid input and stays fixed after finalization", () => {
  const { trace } = clockTrace();
  for (const n of [-1, 1.5, NaN, Infinity, "12"]) trace.addOutputBytes(n);
  trace.addOutputBytes(9);
  const report = trace.finish("completed");
  trace.addOutputBytes(10);
  assert.equal(report.result_json_bytes, 9);
  assert.equal(trace.finish("completed"), report);
});

test("snapshots are immutable and later work cannot rewrite finished diagnostics", async () => {
  const { trace } = clockTrace();
  await trace.measure("local_tool", () => {}, "live_get");
  const report = trace.finish("completed");
  assert.throws(() => { report.stages.local_tool.calls = 999; }, TypeError);
  assert.throws(() => { report.tools.extra = {}; }, TypeError);
  assert.equal(await trace.measure("cloud_start", () => 5), 5);
  assert.equal(report.stages.cloud_start, undefined);
});

test("disabled and enabled tracing preserve tool order, outputs and return values", async () => {
  const base = scenario();
  assert.equal(await runAgentTurn(base.options), base.final);
  const { trace, advance } = clockTrace();
  const observed = scenario({ trace, advance });
  assert.equal(await runAgentTurn(observed.options), observed.final);
  assert.deepEqual(observed.calls, base.calls);
  assert.equal(observed.maxInFlight(), 1);
  const report = trace.finish("completed");
  assert.equal(report.elapsed_ms, 199);
  assert.equal(report.stages.tool_discovery.wait_ms, 5);
  assert.equal(report.stages.cloud_start.wait_ms, 100);
  assert.equal(report.stages.cloud_continue.wait_ms, 80);
  assert.equal(report.stages.local_tool.wait_ms, 14);
  assert.equal(report.tools.live_get.calls, 2);
  const outputs = observed.calls.at(-1).at(-1);
  assert.equal(report.result_json_bytes, outputs.reduce((n, o) => n + Buffer.byteLength(o.output, "utf8"), 0));
  assert.ok(!/private|secret|conversation/.test(JSON.stringify(report)));
});

test("tool failures are measured without changing the existing continuation payload", async () => {
  const base = scenario({ failTool: true });
  await runAgentTurn(base.options);
  const { trace } = clockTrace();
  const observed = scenario({ failTool: true, trace });
  await runAgentTurn(observed.options);
  assert.deepEqual(observed.calls, base.calls);
  const report = trace.finish("completed");
  assert.equal(report.tools.live_get.errors, 2);
  assert.ok(!JSON.stringify(report).includes("private"));
});

test("forbidden calls remain blocked and do not become measured executions", async () => {
  const { trace } = clockTrace();
  const s = scenario({ forbidden: true, trace });
  await runAgentTurn(s.options);
  const report = trace.finish("completed");
  assert.equal(s.maxInFlight(), 0);
  assert.equal(report.stages.local_tool, undefined);
  assert.equal(report.stages.encode_result.calls, 2);
  assert.ok(s.calls.at(-1).at(-1).every((o) => !JSON.parse(o.output).ok));
});

test("failed discovery records a failure without calling the cloud", async () => {
  const { trace } = clockTrace();
  const s = scenario({ trace });
  const error = new Error("bridge not available");
  s.client.listTools = async () => { throw error; };
  await assert.rejects(runAgentTurn(s.options), (e) => e === error);
  const report = trace.finish("failed");
  assert.equal(report.stages.tool_discovery.errors, 1);
  assert.equal(report.stages.cloud_start, undefined);
});

// Load the actual entry point with fake Max, API and Live boundaries. No Ableton,
// filesystem writes, external services, credentials or paid calls are involved.
function deviceHarness({ enabled = false, envEnabled = false, contextError = null, sink = null } = {}) {
  const handlers = new Map();
  const logs = [];
  const uploads = [];
  const api = {
    signedIn: true,
    async agentStart() { return { kind: "final", reply: "done", credits_remaining: 8, conversation_id: "secret" }; },
    reportEvent(...args) { uploads.push(args); },
  };
  const modules = {
    fs: { readFileSync: () => JSON.stringify({ trace_latency: enabled }), existsSync: () => false },
    os: { homedir: () => "/fake-home" }, path,
    "./api.js": { TembroApi: function () { return api; } },
    "./mcp_client.js": { McpClient: function () { return { listTools: async () => [{ name: "live_get", inputSchema: { type: "object" } }], stop() {} }; } },
    "./lom_bridge.js": { LomBridge: function () {} },
    "./context.js": { buildLiveContext: async () => { if (contextError) throw contextError; return { tempo: 120, tracks: [], private: "secret" }; } },
    "./agent_loop.js": require("../code/agent_loop.js"),
    "./clipboard.js": {}, child_process: {},
    "max-api": {
      addHandler: (name, callback) => handlers.set(name, callback), outlet() {},
      post(text) { logs.push(text); if (sink && text.startsWith("Tembro latency ")) return sink(); },
    },
  };
  const context = {
    require(name) { assert.ok(name in modules, "unexpected dependency: " + name); return modules[name]; },
    process: { env: envEnabled ? { TEMBRO_TRACE_LATENCY: "1" } : {}, on() {} },
    __dirname: path.join(__dirname, "../code"), URL,
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 2, clearInterval() {}, setImmediate,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../code/tembro_main.js"), "utf8"), context);
  return { handlers, logs, uploads, reports: () => logs.filter((x) => x.startsWith("Tembro latency ")).map((x) => JSON.parse(x.slice(15))) };
}

test("device diagnostics are disabled by default", async () => {
  const h = deviceHarness();
  await h.handlers.get("chat")("private lyrics");
  assert.equal(h.reports().length, 0);
  assert.equal(h.uploads.length, 0);
});

test("device opt-in includes context and emits one local summary, no upload", async () => {
  const h = deviceHarness({ enabled: true });
  await h.handlers.get("chat")("private lyrics");
  assert.equal(h.reports().length, 1);
  const report = h.reports()[0];
  assert.equal(report.stages.context.calls, 1);
  assert.equal(report.stages.cloud_start.calls, 1);
  assert.equal(report.outcome, "completed");
  assert.equal(h.uploads.length, 0);
  assert.ok(!/private|secret|lyrics/.test(JSON.stringify(report)));
});

test("environment variable can enable local diagnostics", async () => {
  const h = deviceHarness({ envEnabled: true });
  await h.handlers.get("chat")("hello");
  assert.equal(h.reports().length, 1);
});

test("context failures still emit a report and never start an agent request", async () => {
  const h = deviceHarness({ enabled: true, contextError: new Error("private context failure") });
  await h.handlers.get("chat")("hello");
  const report = h.reports()[0];
  assert.equal(report.outcome, "failed");
  assert.equal(report.stages.context.errors, 1);
  assert.equal(report.stages.cloud_start, undefined);
});

test("stopped context is reported as abandoned rather than successful cancellation", async () => {
  const h = deviceHarness({ enabled: true, contextError: Object.assign(new Error("stop"), { stopped: true }) });
  await h.handlers.get("chat")("hello");
  const report = h.reports()[0];
  assert.equal(report.outcome, "abandoned");
  assert.equal(report.stages.context.abandoned_waits, 1);
});

test("throwing diagnostics sink does not keep the device busy", async () => {
  const h = deviceHarness({ enabled: true, sink: () => { throw new Error("logging failed"); } });
  await h.handlers.get("chat")("one");
  await h.handlers.get("chat")("two");
  assert.equal(h.reports().length, 2);
});

test("rejecting diagnostics sink is handled without delaying the next turn", async () => {
  const h = deviceHarness({ enabled: true, sink: () => Promise.reject(new Error("logging failed")) });
  await h.handlers.get("chat")("one");
  await h.handlers.get("chat")("two");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.reports().length, 2);
});
