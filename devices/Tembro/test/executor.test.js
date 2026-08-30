"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { executePlan } = require("../code/executor.js");

// Fake bridge: scripted Live Set state, records every call in order.
function makeBridge(overrides) {
  const state = {
    signature: "sig-1",
    tempo: 120,
    tracks: [{ index: 0, name: "Audio", kind: "audio", devices: [] }],
    clips: {}, // "t:s" → {exists, name, length_beats, notes}
  };
  let sigCounter = 1;
  const calls = [];
  const bump = () => {
    sigCounter += 1;
    state.signature = "sig-" + sigCounter;
  };
  const bridge = {
    state,
    calls,
    async ping() {
      calls.push(["ping"]);
    },
    async getSummary() {
      calls.push(["getSummary"]);
      return {
        signature: state.signature,
        tempo: state.tempo,
        time_signature: { numerator: 4, denominator: 4 },
        tracks: state.tracks.map((t) => ({ ...t, devices: [...t.devices] })),
        selection: {},
      };
    },
    async setTempo(bpm, sig) {
      calls.push(["setTempo", bpm, sig]);
      state.tempo = bpm;
      bump();
    },
    async createMidiTrack(index, name, sig) {
      calls.push(["createMidiTrack", index, name, sig]);
      state.tracks[index] = { index, name, kind: "midi", devices: [] };
      bump();
    },
    async loadDevice(track, query, sig) {
      calls.push(["loadDevice", track, query, sig]);
      state.tracks[track].devices.push(query);
      bump();
    },
    async createClip(track, slot, lengthBeats, name, sig) {
      calls.push(["createClip", track, slot, lengthBeats, name, sig]);
      state.clips[track + ":" + slot] = {
        exists: true,
        name: name,
        length_beats: lengthBeats,
        notes: [],
      };
      bump();
    },
    async replaceNotes(track, slot, notes, sig) {
      calls.push(["replaceNotes", track, slot, notes, sig]);
      state.clips[track + ":" + slot].notes = notes.map((n) => ({ ...n }));
      bump();
    },
    async readClip(track, slot) {
      calls.push(["readClip", track, slot]);
      return state.clips[track + ":" + slot] || { exists: false };
    },
    async fireClip(track, slot) {
      calls.push(["fireClip", track, slot]);
    },
    async fireScene(scene) {
      calls.push(["fireScene", scene]);
    },
    async stopAll() {
      calls.push(["stopAll"]);
    },
    async undo(sig) {
      calls.push(["undo", sig]);
      bump();
    },
  };
  return Object.assign(bridge, overrides);
}

function eventRecorder() {
  const events = [];
  return { events, onEvent: (kind, payload) => void events.push({ kind, payload }) };
}

const BASSLINE_PLAN = [
  { op: "create_midi_track", name: "Bass" },
  { op: "load_device", track: 1, query: "Bass" },
  {
    op: "create_clip",
    track: 1,
    slot: 0,
    length_beats: 16,
    name: "Bassline A minor",
  },
  {
    op: "replace_notes",
    track: 1,
    slot: 0,
    notes: [
      { pitch: 45, start: 0, duration: 1, velocity: 100 },
      { pitch: 45, start: 1.5, duration: 0.5, velocity: 90 },
    ],
  },
];

test("happy path: full bassline plan executes, verifies, reports outcomes", async () => {
  const bridge = makeBridge();
  const rec = eventRecorder();
  const result = await executePlan(BASSLINE_PLAN, bridge, rec);
  assert.equal(result.ok, true);
  assert.equal(result.executed, 4);
  assert.deepEqual(
    rec.events.map((e) => e.kind),
    ["action.executed", "action.executed", "action.executed", "action.executed"],
  );
  // Preflight happened before any mutation.
  assert.deepEqual(bridge.calls[0], ["ping"]);
  assert.deepEqual(bridge.calls[1], ["getSummary"]);
});

test("expected_set_signature is refreshed and passed to every mutation", async () => {
  const bridge = makeBridge();
  await executePlan(BASSLINE_PLAN, bridge, eventRecorder());
  const mutations = bridge.calls.filter((c) =>
    ["createMidiTrack", "loadDevice", "createClip", "replaceNotes"].includes(c[0]),
  );
  assert.equal(mutations.length, 4);
  const sigs = mutations.map((c) => c[c.length - 1]);
  assert.deepEqual(sigs, ["sig-1", "sig-2", "sig-3", "sig-4"]);
});

test("preflight failure blocks all mutations", async () => {
  const bridge = makeBridge({
    async ping() {
      throw new Error("bridge unreachable");
    },
  });
  const rec = eventRecorder();
  const result = await executePlan(BASSLINE_PLAN, bridge, rec);
  assert.equal(result.ok, false);
  assert.equal(result.executed, 0);
  assert.equal(result.error.stage, "preflight");
  assert.equal(rec.events[0].kind, "client.error");
  // No mutation ever reached the bridge.
  assert.ok(!bridge.calls.some((c) => c[0] !== "ping"));
});

test("execution stops immediately at the first failed operation", async () => {
  const bridge = makeBridge({
    async loadDevice() {
      throw new Error("browser item not found");
    },
  });
  const rec = eventRecorder();
  const result = await executePlan(BASSLINE_PLAN, bridge, rec);
  assert.equal(result.ok, false);
  assert.equal(result.executed, 1);
  assert.deepEqual(
    { index: result.error.index, op: result.error.op, stage: result.error.stage },
    { index: 1, op: "load_device", stage: "execute" },
  );
  assert.equal(rec.events.at(-1).kind, "action.failed");
  // Nothing after the failed op ran.
  assert.ok(!bridge.calls.some((c) => c[0] === "createClip" || c[0] === "replaceNotes"));
});

test("readback mismatch is surfaced, never silently continued", async () => {
  const bridge = makeBridge();
  // Live "lies": write succeeds but the notes that land differ.
  const realReplace = bridge.replaceNotes.bind(bridge);
  bridge.replaceNotes = async (t, s, notes, sig) => {
    await realReplace(t, s, [{ pitch: 46, start: 0, duration: 1, velocity: 100 }], sig);
  };
  const rec = eventRecorder();
  const result = await executePlan(BASSLINE_PLAN, bridge, rec);
  assert.equal(result.ok, false);
  assert.equal(result.error.op, "replace_notes");
  assert.equal(result.error.stage, "readback");
  assert.match(result.error.message, /pitch=45/);
  assert.equal(rec.events.at(-1).kind, "readback.mismatch");
});

test("clip length mismatch is a readback failure", async () => {
  const bridge = makeBridge();
  const realCreate = bridge.createClip.bind(bridge);
  bridge.createClip = async (t, s, len, name, sig) => realCreate(t, s, 15, name, sig);
  const result = await executePlan(BASSLINE_PLAN, bridge, eventRecorder());
  assert.equal(result.ok, false);
  assert.equal(result.error.op, "create_clip");
  assert.match(result.error.message, /length mismatch/);
});

test("create_midi_track verifies the track exists with the right name and kind", async () => {
  const bridge = makeBridge({
    async createMidiTrack() {
      /* silently does nothing */
    },
  });
  const result = await executePlan([{ op: "create_midi_track", name: "Bass" }], bridge, eventRecorder());
  assert.equal(result.ok, false);
  assert.equal(result.error.stage, "readback");
});

test("load_device on a missing track fails before touching Live", async () => {
  const bridge = makeBridge();
  const result = await executePlan(
    [{ op: "load_device", track: 7, query: "Operator" }],
    bridge,
    eventRecorder(),
  );
  assert.equal(result.ok, false);
  assert.equal(result.error.stage, "execute");
  assert.ok(!bridge.calls.some((c) => c[0] === "loadDevice"));
});

test("modification plan targets the existing selected clip (no new track/clip)", async () => {
  const bridge = makeBridge();
  await executePlan(BASSLINE_PLAN, bridge, eventRecorder());
  const before = bridge.state.tracks.length;
  const syncopated = [
    {
      op: "replace_notes",
      track: 1,
      slot: 0,
      notes: [
        { pitch: 45, start: 0.5, duration: 0.5, velocity: 100 },
        { pitch: 45, start: 1.75, duration: 0.25, velocity: 90 },
      ],
    },
  ];
  const result = await executePlan(syncopated, bridge, eventRecorder());
  assert.equal(result.ok, true);
  assert.equal(bridge.state.tracks.length, before); // no duplicate track
  assert.equal(bridge.state.clips["1:0"].notes[0].start, 0.5);
});

test("set_tempo readback compares the resulting tempo", async () => {
  const bridge = makeBridge({
    async setTempo() {
      /* tempo silently not applied */
    },
  });
  const result = await executePlan([{ op: "set_tempo", bpm: 100 }], bridge, eventRecorder());
  assert.equal(result.ok, false);
  assert.match(result.error.message, /tempo is 120/);
});
