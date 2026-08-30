"use strict";

// Integration: McpClient + LomBridge + executor + context adapter against a
// fake MCP stdio server emulating the pinned upstream protocol (JSON-RPC 2.0
// over newline-delimited stdio, structuredContent, expected_set_signature).

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { McpClient } = require("../code/mcp_client.js");
const { LomBridge } = require("../code/lom_bridge.js");
const { executePlan } = require("../code/executor.js");
const { buildLiveContext } = require("../code/context.js");

const client = new McpClient(process.execPath, [path.join(__dirname, "fake_mcp_server.js")]);
const bridge = new LomBridge(client);

after(() => client.stop());

const PLAN_A = [
  { op: "create_midi_track", name: "Bass" },
  { op: "load_device", track: 1, query: "Operator" },
  { op: "create_clip", track: 1, slot: 0, length_beats: 16, name: "Bassline A minor" },
  {
    op: "replace_notes",
    track: 1,
    slot: 0,
    notes: [
      { pitch: 45, start: 0, duration: 1, velocity: 100 },
      { pitch: 45, start: 2, duration: 0.5, velocity: 92 },
      { pitch: 48, start: 3.5, duration: 0.5, velocity: 88 },
    ],
  },
  { op: "fire_clip", track: 1, slot: 0 },
];

test("acceptance shape A over the MCP protocol: create → load → clip → notes → verify", async () => {
  const events = [];
  const result = await executePlan(PLAN_A, bridge, {
    onEvent: (kind, payload) => void events.push({ kind, payload }),
  });
  assert.deepEqual(result, { ok: true, executed: 5 });
  assert.ok(events.every((e) => e.kind === "action.executed"));

  const clip = await bridge.readClip(1, 0);
  assert.equal(clip.exists, true);
  assert.equal(clip.length_beats, 16);
  assert.equal(clip.name, "Bassline A minor");
  assert.equal(clip.notes.length, 3);
});

test("context adapter reads the selected clip notes over the protocol", async () => {
  // The fake set's selection is track 0 / slot 0 (no clip): selection present,
  // clip absent.
  const ctx = await buildLiveContext(bridge);
  assert.equal(ctx.tempo, 120);
  assert.deepEqual(ctx.time_signature, { numerator: 4, denominator: 4 });
  assert.equal(ctx.tracks.length, 2);
  assert.equal(ctx.tracks[1].kind, "midi");
  assert.equal(ctx.tracks[1].name, "Bass");
  assert.deepEqual(ctx.tracks[1].devices, ["Operator"]);
  assert.equal(ctx.selection.clip, undefined);
});

test("acceptance shape B: modify the same clip in place, exact readback", async () => {
  const syncopated = [
    {
      op: "replace_notes",
      track: 1,
      slot: 0,
      notes: [
        { pitch: 45, start: 0.5, duration: 0.5, velocity: 100 },
        { pitch: 45, start: 1.75, duration: 0.25, velocity: 95 },
        { pitch: 48, start: 3.5, duration: 0.5, velocity: 90 },
        { pitch: 43, start: 2.5, duration: 0.5, velocity: 85 },
      ],
    },
  ];
  const result = await executePlan(syncopated, bridge, {});
  assert.equal(result.ok, true);
  const clip = await bridge.readClip(1, 0);
  assert.equal(clip.notes.length, 4);
  assert.equal(clip.length_beats, 16); // still four bars in 4/4
});

test("stale expected_set_signature is rejected by the guard and surfaced", async () => {
  await assert.rejects(
    () => bridge.setTempo(99, "fake-sig-STALE"),
    /signature mismatch/,
  );
});

test("extended note fields round-trip via the update pass", async () => {
  const notes = [
    { pitch: 45, start: 0, duration: 1, velocity: 100, probability: 0.7, velocity_deviation: 10 },
  ];
  const result = await executePlan(
    [{ op: "replace_notes", track: 1, slot: 0, notes }],
    bridge,
    {},
  );
  assert.equal(result.ok, true, JSON.stringify(result.error));
  const clip = await bridge.readClip(1, 0);
  assert.equal(clip.notes[0].probability, 0.7);
  assert.equal(clip.notes[0].velocity_deviation, 10);
});

test("extended fields match duplicate notes by velocity without reusing note ids", async () => {
  const notes = [
    { pitch: 48, start: 0, duration: 1, velocity: 80, probability: 0.25 },
    { pitch: 48, start: 0, duration: 1, velocity: 110, probability: 0.9 },
  ];
  const result = await executePlan(
    [{ op: "replace_notes", track: 1, slot: 0, notes }],
    bridge,
    {},
  );
  assert.equal(result.ok, true, JSON.stringify(result.error));
  const clip = await bridge.readClip(1, 0);
  const quiet = clip.notes.find((note) => note.velocity === 80);
  const loud = clip.notes.find((note) => note.velocity === 110);
  assert.equal(quiet.probability, 0.25);
  assert.equal(loud.probability, 0.9);
  assert.notEqual(quiet.note_id, loud.note_id);
});
