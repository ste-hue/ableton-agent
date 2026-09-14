"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ClipVariation, NOTE_FIELDS } = require("../code/clip_variation.js");

const ownerId = "test-owner-0000000001";
const clone = (value) => JSON.parse(JSON.stringify(value));
function note(id, pitch = 42) {
  return { note_id: id, pitch, start_time: id / 4, duration: 0.125, velocity: 80, mute: false, probability: 1, velocity_deviation: 0, release_velocity: 64 };
}
function clip(id, notes) {
  return { id, path: "live_set tracks 0 clip_slots " + (id === 10 ? 0 : 1) + " clip", name: "Drums", track_name: "Kit", notes, note_count: notes.length, lane_note_count: notes.filter((n) => n.pitch === 42).length, content_sha256: JSON.stringify(notes), truncated: false };
}
function rig() {
  const calls = [];
  const outputs = [];
  let state = {
    protocol: "tembro.clip-variation.v1", owner_id: ownerId, action: "capture", state: "captured", verified: true,
    host_observed: true, set_signature: "signature-0", source: clip(10, [note(1), note(2), note(3), note(4), note(5, 36)]), candidate: null,
    lanes: [{ pitch: 42, label: "Closed Hat", count: 4 }], can_discard: false, audition: null,
    capabilities: { atomic_guards: true, raw_duplication: true, extended_note_fields: NOTE_FIELDS, note_expression_guard: false },
  };
  let override = async () => undefined;
  let preflight = async () => {};
  const client = {
    quarantined: false,
    markOutcomeUnknown(toolName, reason) {
      this.quarantined = true;
      if (!this.quarantine) this.quarantine = { toolName, reason };
      return Object.assign(new Error(reason), { outcomeUnknown: true });
    },
    async listTools() { calls.push(["tools/list"]); return [{ name: "live_clip_variation" }]; },
    async callTool(name, args) {
      calls.push([name, clone(args)]);
      if (this.quarantined && name !== "live_bridge_status") throw new Error("quarantined");
      const intercepted = await override(name, args);
      if (intercepted !== undefined) return intercepted;
      if (name === "live_bridge_status") return { ok: true, running: true, server_thread_responsive: true, main_thread: { in_flight_method: null, in_flight_timed_out: false, stall_cooldown_remaining: 0 } };
      if (name === "live_set_summary") return { set_signature: state.set_signature };
      if (name === "live_clip_notes") {
        const c = [state.source, state.candidate].find((c) => c && c.id === args.ref.id);
        return { clip: { id: c.id }, note_api: "extended", truncated: false, note_count: c.notes.length, notes: clone(c.notes) };
      }
      assert.equal(name, "live_clip_variation");
      assert.equal(args.owner_id, ownerId);
      if (!["capture", "status"].includes(args.action)) assert.equal(args.expected_set_signature, state.set_signature);
      if (args.action === "create") {
        state.candidate = clip(11, [note(101), note(103), note(105, 36)]);
        state.state = "candidate";
        state.set_signature = "signature-1";
      } else if (args.action === "thin") state.candidate = clip(11, [note(101), note(105, 36)]);
      else if (args.action === "keep") state.state = "kept";
      else if (args.action.startsWith("audition_")) state.audition = { target: args.action.slice(9), playing: false, triggered: true, fire_sent: true };
      return clone({ ...state, action: args.action });
    },
  };
  const controller = new ClipVariation({ client, ownerId, preflight: async () => { calls.push(["preflight"]); await preflight(); }, onState: (state) => outputs.push(state) });
  return { controller, client, calls, outputs, state: () => state, intercept: (fn) => { override = fn; }, preflight: (fn) => { preflight = fn; } };
}

test("capture uses mapped lanes, exact notes, and no mutative tools", async () => {
  const r = rig();
  await r.controller.execute("capture");
  assert.equal(r.controller.snapshot().state, "captured");
  assert.deepEqual(r.controller.snapshot().lanes, [{ pitch: 42, label: "Closed Hat", count: 4 }]);
  assert.deepEqual(r.calls.map(([name]) => name), ["preflight", "tools/list", "live_clip_variation", "live_clip_notes", "live_clip_variation"]);
  assert.equal(r.outputs.at(-1).busy, false);
});

test("create is signature guarded, refreshes summary, and verifies source and candidate notes", async () => {
  const r = rig();
  await r.controller.execute("capture");
  r.calls.length = 0;
  await r.controller.execute("create", 42);
  assert.deepEqual(r.calls.map(([name]) => name), ["preflight", "tools/list", "live_set_summary", "live_clip_variation", "live_set_summary", "live_clip_notes", "live_clip_notes", "live_clip_variation"]);
  assert.equal(r.calls[3][1].expected_set_signature, "signature-0");
  assert.equal(r.controller.snapshot().candidate.removedCount, 2);
  assert.equal(r.controller.snapshot().can.discard, false);
  assert.equal(r.controller.snapshot().can.keep, true);
  assert.match(r.controller.snapshot().message, /Discard is unavailable/);
});

test("unmapped or omitted pitch never reaches a mutation", async () => {
  const r = rig();
  await r.controller.execute("capture");
  await assert.rejects(r.controller.execute("create", 36), /explicitly mapped lane/);
  assert.equal(r.calls.filter(([name, args]) => name === "live_clip_variation" && args.action === "create").length, 0);
  assert.equal(r.client.quarantined, false);
});

test("Keep preserves the candidate ID and never regenerates it", async () => {
  const r = rig();
  await r.controller.execute("capture");
  await r.controller.execute("create", 42);
  const id = r.controller.snapshot().candidate.id;
  await r.controller.execute("keep");
  assert.equal(r.controller.snapshot().candidate.id, id);
  assert.equal(r.controller.snapshot().state, "kept");
  assert.equal(r.controller.snapshot().can.capture, true);
  assert.equal(r.calls.filter(([name, args]) => name === "live_clip_variation" && args.action === "create").length, 1);
});

test("malformed or mismatched mutation responses quarantine before publishing", async () => {
  for (const change of [{ state: "candidate", candidate: null }, { action: "thin" }, { state: "kept" }]) {
    const r = rig();
    await r.controller.execute("capture");
    r.intercept(async (name, args) => name === "live_clip_variation" && args.action === "create"
      ? { ...clone(r.state()), action: "create", state: "candidate", candidate: clip(11, [note(101)]), ...change } : undefined);
    await assert.rejects(r.controller.execute("create", 42), /snapshot|different action|expected state/);
    assert.equal(r.client.quarantined, true);
    assert.equal(r.controller.snapshot().can.keep, false);
  }
});

test("pending audition cannot fire twice; recheck only observes", async () => {
  const r = rig();
  await r.controller.execute("capture");
  await r.controller.execute("create", 42);
  await r.controller.execute("audition_candidate");
  await assert.rejects(r.controller.execute("audition_candidate"), /unavailable/);
  await r.controller.execute("reconcile");
  assert.equal(r.calls.filter(([name, args]) => name === "live_clip_variation" && args.action === "audition_candidate").length, 1);
  assert.equal(r.controller.snapshot().can.keep, false);
  r.state().audition = { target: "candidate", triggered: false, playing: true };
  await r.controller.execute("reconcile");
  assert.match(r.controller.snapshot().message, /playing in Live/);
});

test("a release-velocity edit during readback blocks all further Live work", async () => {
  const r = rig();
  await r.controller.execute("capture");
  r.intercept(async (name, args) => {
    if (name === "live_clip_notes" && args.ref.id === 11) {
      const c = clone(r.state().candidate);
      c.notes[0].release_velocity += 1;
      return { clip: { id: c.id }, note_api: "extended", truncated: false, note_count: c.notes.length, notes: c.notes };
    }
  });
  await assert.rejects(r.controller.execute("create", 42), /notes changed/);
  assert.equal(r.client.quarantined, true);
  assert.equal(r.controller.snapshot().candidate.id, 11);
  assert.equal(r.controller.snapshot().can.keep, false);
  r.calls.length = 0;
  await r.controller.execute("reconcile");
  assert.deepEqual(r.calls.map(([name]) => name), ["live_bridge_status"]);
  assert.equal(r.client.quarantined, true);
  assert.match(r.controller.snapshot().message, /manual reconciliation/);
});

test("missing or truncated notes cannot be treated as an empty verified clip", async () => {
  for (const read of [{}, { note_api: "extended", truncated: true, note_count: 5, notes: [] }]) {
    const r = rig();
    r.intercept(async (name) => name === "live_clip_notes" ? read : undefined);
    await assert.rejects(r.controller.execute("capture"), /incomplete note readback/);
    assert.equal(r.controller.snapshot().can.create, false);
  }
});

test("validator failure prevents even capture, and uncertain validator work quarantines", async () => {
  const r = rig();
  r.preflight(async () => { throw Object.assign(new Error("validator timed out"), { outcomeUnknown: true }); });
  await assert.rejects(r.controller.execute("capture"), /validator timed out/);
  assert.deepEqual(r.calls, [["preflight"]]);
  assert.equal(r.client.quarantined, true);
});

test("Stop before dispatch sends no mutation; Stop after dispatch completes readback", async () => {
  const r = rig();
  await r.controller.execute("capture");
  let stopped = false;
  r.intercept(async (name, args) => { if (name === "live_clip_variation" && args.action === "create") stopped = true; });
  await r.controller.execute("create", 42, () => stopped);
  assert.equal(r.controller.snapshot().state, "candidate");
  assert.equal(r.calls.at(-1)[1].action, "status");
  await assert.rejects(r.controller.execute("thin", undefined, () => true), /Stopped before/);
  assert.equal(r.calls.filter(([name, args]) => name === "live_clip_variation" && args.action === "thin").length, 0);
});

test("overlapping clicks cannot interleave with a pending local operation", async () => {
  const r = rig();
  let release;
  r.preflight(() => new Promise((resolve) => { release = resolve; }));
  const first = r.controller.execute("capture");
  await assert.rejects(r.controller.execute("capture"), /already running/);
  release();
  await first;
  assert.equal(r.calls.filter(([name, args]) => name === "live_clip_variation" && args.action === "capture").length, 1);
});
