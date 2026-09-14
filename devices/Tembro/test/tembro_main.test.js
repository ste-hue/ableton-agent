"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const loop = require("../code/agent_loop.js");
const { LomBridge } = require("../code/lom_bridge.js");
const { ClipVariation, NOTE_FIELDS } = require("../code/clip_variation.js");
const { createHash } = require("node:crypto");

const codeDir = path.join(__dirname, "..", "code");
const source = fs.readFileSync(path.join(codeDir, "tembro_main.js"), "utf8");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function loadHost(options = {}) {
  const handlers = new Map();
  const outputs = [];
  const timers = new Set();
  const sent = deferred();
  const mutation = deferred();
  const variationSent = deferred();
  const variationMutation = deferred();
  const variationReadbackSent = deferred();
  const variationReadback = deferred();
  let placements = 0;
  let starts = 0;
  let contextBuilds = 0;
  let preflights = 0;
  const calls = [];
  const variationActions = [];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const note = (id, pitch = 42) => ({
    note_id: id, pitch, start_time: id / 4, duration: 0.125,
    velocity: 80, mute: false, probability: 1, velocity_deviation: 0, release_velocity: 64,
  });
  const clip = (id, notes) => ({
    id, path: "live_set tracks 0 clip_slots " + (id === 10 ? 0 : 1) + " clip",
    name: "Drums", track_name: "Kit", notes, note_count: notes.length,
    lane_note_count: notes.filter((entry) => entry.pitch === 42).length,
    content_sha256: createHash("sha256").update(JSON.stringify(notes)).digest("hex"),
    truncated: false,
  });
  const variationState = {
    protocol: "tembro.clip-variation.v1", owner_id: null, state: "captured", verified: true,
    host_observed: true, set_signature: "sig-0",
    source: clip(10, [note(1), note(2), note(3), note(4), note(5, 36)]), candidate: null,
    lanes: [{ pitch: 42, label: "Closed Hat", count: 4 }], can_discard: false, audition: null,
    capabilities: { atomic_guards: true, raw_duplication: true, extended_note_fields: NOTE_FIELDS, note_expression_guard: false },
  };
  const client = {
    quarantined: false,
    markOutcomeUnknown(toolName, reason) {
      this.quarantined = true;
      this.quarantine = this.quarantine || { toolName, reason };
      return Object.assign(new Error(reason), { outcomeUnknown: true });
    },
    async listTools() {
      return ["live_set_summary", "live_get", "live_clip_duplicate_to_arrangement", "live_clip_variation"].map((name) => ({
        name, inputSchema: { type: "object", properties: {} },
      }));
    },
    async callTool(name, args = {}) {
      calls.push(name);
      if (name === "live_clip_variation") {
        variationActions.push(args.action);
        if (args.action === "capture") variationState.owner_id = args.owner_id;
        assert.equal(args.owner_id, variationState.owner_id);
        if (args.action === "create") {
          assert.equal(args.expected_set_signature, "sig-" + placements);
          variationSent.resolve();
          if (options.holdVariationCreate) await variationMutation.promise;
          variationState.state = "candidate";
          variationState.candidate = clip(11, [0, 2, 4].map((index) => ({
            ...variationState.source.notes[index], note_id: 101 + index,
          })));
        }
        return clone({ ...variationState, action: args.action });
      }
      if (name === "live_clip_notes") {
        const selected = [variationState.source, variationState.candidate].find((entry) => entry && entry.id === args.ref.id);
        assert.ok(selected);
        if (selected === variationState.candidate && options.holdVariationReadback) {
          variationReadbackSent.resolve();
          await variationReadback.promise;
        }
        return { clip: { id: selected.id }, note_api: "extended", truncated: false,
          note_count: selected.note_count, notes: clone(selected.notes) };
      }
      if (name === "live_set_summary") {
        return {
          set_signature: "sig-" + placements,
          tracks: [{ arrangement_clips: placements ? [{ id: 101 }] : [] }],
        };
      }
      if (name === "live_clip_duplicate_to_arrangement") {
        sent.resolve();
        await mutation.promise;
        placements += 1;
        return { ok: true };
      }
      if (name === "live_get") {
        return { properties: { start_time: 0, end_time: 16, is_arrangement_clip: true } };
      }
      throw new Error("unexpected call " + name);
    },
    stop() {},
  };
  const api = {
    signedIn: true,
    reportEvent() {},
    async agentStart() {
      starts += 1;
      if (starts > 1) return { kind: "final", reply: "Done", credits_remaining: 5 };
      return {
        kind: "tool_calls",
        continuation_token: "pending",
        tool_calls: [{
          call_id: "first",
          name: "tembro_arrange_clip",
          arguments: {
            track: { id: 7 }, clip: { id: 70 },
            destination_times: [0, 16], expected_set_signature: "sig-0",
          },
        }],
      };
    },
    async agentContinue() { throw new Error("stopped macro must not continue to the model"); },
  };
  const modules = {
    fs: { readFileSync() { throw new Error("no user config in test"); }, existsSync() { return true; } },
    os: { homedir() { return "/unused-test-home"; } },
    path,
    "./api.js": { TembroApi: class { constructor() { return api; } } },
    "./mcp_client.js": { McpClient: class { constructor() { return client; } } },
    "./lom_bridge.js": { LomBridge },
    "./context.js": { async buildLiveContext() { contextBuilds += 1; return { tracks: [], tempo: 120 }; } },
    "./agent_loop.js": loop,
    "./clip_variation.js": { ClipVariation },
    "./runtime_preflight.js": { async validateRuntime() {
      preflights += 1;
      if (options.preflightError) throw options.preflightError;
    } },
    "./clipboard.js": {},
    child_process: { spawn() { throw new Error("test must not spawn external processes"); } },
    "max-api": {
      addHandler(name, handler) { handlers.set(name, handler); },
      outlet(value) { outputs.push(value); },
      post() {},
    },
  };
  const timer = (callback, ms) => {
    const handle = { callback, ms };
    timers.add(handle);
    return handle;
  };
  const context = vm.createContext({
    require(name) {
      if (Object.prototype.hasOwnProperty.call(modules, name)) return modules[name];
      throw new Error("unexpected dependency " + name);
    },
    __dirname: codeDir,
    process: { env: {}, on() {}, exit() {} },
    setTimeout: timer,
    clearTimeout(handle) { timers.delete(handle); },
    setInterval: timer,
    clearInterval(handle) { timers.delete(handle); },
    setImmediate,
    URL,
  });
  vm.runInContext(source, context, { filename: "tembro_main.js" });
  return {
    handlers, outputs, timers, client, sent, mutation, calls, variationActions,
    variationSent, variationMutation, variationReadbackSent, variationReadback,
    state: () => vm.runInContext("({ busy, activeRun, pending: pendingChats.length })", context),
    counts: () => ({ starts, placements, contextBuilds, preflights }),
  };
}

test("Stop retains the lane until the sent macro settles and a later turn cannot revive it", async () => {
  const host = loadHost();
  const first = host.handlers.get("chat")("arrange this");
  await host.sent.promise;
  const oldToken = host.state().activeRun;
  assert.equal(oldToken.kind, "chat");
  await host.handlers.get("chat")("/stop");
  await host.handlers.get("chat")("try another request now");

  assert.equal(host.state().busy, true);
  assert.equal(host.state().activeRun, oldToken);
  assert.equal(oldToken.stopped, true);
  assert.equal(host.counts().starts, 1);
  assert.equal(host.state().pending, 0);

  host.mutation.resolve();
  await first;
  assert.equal(host.state().busy, false);
  assert.equal(host.state().activeRun, null);
  assert.equal(host.counts().placements, 1);
  assert.equal(host.calls.filter((name) => name === "live_clip_duplicate_to_arrangement").length, 1);
  assert.ok(host.calls.includes("live_get"), "the sent placement finishes its readback before releasing ownership");

  await host.handlers.get("chat")("a genuinely new request");
  assert.equal(host.counts().starts, 2);
  assert.equal(oldToken.stopped, true, "starting a later turn never resets the previous token");
});

test("the hard watchdog stops its run without abandoning an outstanding Live mutation", async () => {
  const host = loadHost();
  const first = host.handlers.get("chat")("arrange this");
  await host.sent.promise;
  const token = host.state().activeRun;
  const watchdog = [...host.timers].find((entry) => entry.ms === 900000);
  assert.ok(watchdog);
  watchdog.callback();
  await host.handlers.get("chat")("new request while timed out");
  assert.equal(token.stopped, true);
  assert.equal(host.state().busy, true);
  assert.equal(host.counts().starts, 1);
  host.mutation.resolve();
  await first;
  assert.equal(host.counts().placements, 1);
  assert.equal(host.state().busy, false);
  assert.equal([...host.timers].some((entry) => entry.ms === 900000), false);
});

test("uncertainty drops queued chats and blocks new chats before reading context", async () => {
  const host = loadHost();
  const first = host.handlers.get("chat")("arrange this");
  await host.sent.promise;
  await host.handlers.get("chat")("queued request");
  assert.equal(host.state().pending, 1);
  host.client.quarantined = true;
  host.mutation.reject(Object.assign(new Error("sent outcome unknown"), { outcomeUnknown: true }));
  await first;
  await new Promise(setImmediate);
  assert.equal(host.state().pending, 0);
  assert.equal(host.counts().starts, 1);
  assert.equal(host.counts().contextBuilds, 1);
  await host.handlers.get("chat")("attempt while quarantined");
  assert.equal(host.counts().contextBuilds, 1);
  assert.equal(host.counts().starts, 1);
  assert.ok(host.outputs.some((entry) => entry[0] === "status" && /requests blocked/.test(entry[1])));
});

test("a stopped variation owns the shared lane through its late response and final note readback", async () => {
  const host = loadHost({ holdVariationCreate: true, holdVariationReadback: true });
  await host.handlers.get("variation")("capture");
  const creating = host.handlers.get("variation")("create", 42);
  await host.variationSent.promise;
  const token = host.state().activeRun;
  assert.equal(token.kind, "variation");

  await host.handlers.get("chat")("/stop");
  await host.handlers.get("chat")("new chat while the variation is sent");
  assert.equal(token.stopped, true);
  assert.equal(host.state().busy, true);
  assert.equal(host.counts().starts, 0);
  assert.equal(host.counts().contextBuilds, 0);
  assert.equal(host.state().pending, 0);

  host.variationMutation.resolve();
  await host.variationReadbackSent.promise;
  assert.equal(host.state().busy, true, "a successful mutation response alone must not release the lane");
  assert.equal(host.state().activeRun, token);
  await host.handlers.get("chat")("new chat during note verification");
  await host.handlers.get("variation")("thin");
  assert.equal(host.counts().starts, 0);
  assert.equal(host.state().pending, 0);
  assert.deepEqual(host.variationActions, ["capture", "status", "create"]);

  host.variationReadback.resolve();
  await creating;
  assert.equal(host.state().busy, false);
  assert.equal(host.state().activeRun, null);
  assert.equal(token.stopped, true);
  assert.equal(host.counts().preflights, 2);
  assert.deepEqual(host.variationActions, ["capture", "status", "create", "status"]);
  const published = host.outputs.filter((entry) => entry[0] === "variation_state").map((entry) => JSON.parse(entry[1]));
  assert.equal(published.at(-1).state, "candidate");
  assert.equal(published.at(-1).busy, false);
});

test("an active chat rejects variation actions before starting preflight or another Live operation", async () => {
  const host = loadHost();
  const chatting = host.handlers.get("chat")("arrange this");
  await host.sent.promise;
  const token = host.state().activeRun;
  await host.handlers.get("variation")("capture");
  assert.equal(host.state().activeRun, token);
  assert.equal(token.kind, "chat");
  assert.equal(host.state().busy, true);
  assert.equal(host.counts().preflights, 0);
  assert.deepEqual(host.variationActions, []);
  await host.handlers.get("chat")("/stop");
  host.mutation.resolve();
  await chatting;
  assert.equal(host.counts().placements, 1);
  assert.equal(host.state().busy, false);
});

test("uncertain variation preflight quarantines the shared client before a subsequent chat", async () => {
  const host = loadHost({ preflightError: Object.assign(new Error("validator timed out"), { outcomeUnknown: true }) });
  await host.handlers.get("variation")("capture");
  assert.equal(host.client.quarantined, true);
  assert.equal(host.state().busy, false);
  assert.equal(host.counts().preflights, 1);
  assert.deepEqual(host.variationActions, []);
  await host.handlers.get("chat")("continue with a chat");
  assert.equal(host.counts().contextBuilds, 0);
  assert.equal(host.counts().starts, 0);
  assert.ok(host.outputs.some((entry) => entry[0] === "status" && /requests blocked/.test(entry[1])));
});
