"use strict";

// Integration: McpClient + LomBridge (read side) + context adapter against a
// fake MCP stdio server emulating the pinned upstream protocol (JSON-RPC 2.0
// over newline-delimited stdio, structuredContent, expected_set_signature).
//
// Mutations are issued the way the agent loop issues them — as raw MCP tool
// calls — and the bridge is then asked to read the result back.

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { McpClient } = require("../code/mcp_client.js");
const { LomBridge } = require("../code/lom_bridge.js");
const { buildLiveContext } = require("../code/context.js");

const client = new McpClient(process.execPath, [path.join(__dirname, "fake_mcp_server.js")]);
const bridge = new LomBridge(client);

after(() => client.stop());

async function currentSignature() {
  return (await bridge.getSummary()).signature;
}

test("context adapter reads the fake Set over the protocol", async () => {
  // The fake set's selection is track 0 / slot 0 (no clip): selection present,
  // clip absent.
  const ctx = await buildLiveContext(bridge);
  assert.equal(ctx.tempo, 120);
  assert.deepEqual(ctx.time_signature, { numerator: 4, denominator: 4 });
  assert.equal(ctx.tracks.length, 1);
  assert.equal(ctx.tracks[0].kind, "audio");
  assert.equal(ctx.selection.track, 0);
  assert.equal(ctx.selection.clip, undefined);
});

test("stale expected_set_signature is rejected by the upstream guard and surfaced", async () => {
  await assert.rejects(
    () =>
      bridge.call("live_set", {
        ref: { path: "live_set" },
        property: "tempo",
        value: 99,
        expected_set_signature: "fake-sig-STALE",
      }),
    /signature mismatch/,
  );
  assert.equal((await bridge.getSummary()).tempo, 120);
});

test("clip created and filled through raw MCP calls reads back exactly", async () => {
  let sig = await currentSignature();
  await bridge.call("live_call", {
    ref: { path: "live_set" },
    method: "create_midi_track",
    args: [1],
    expected_set_signature: sig,
  });
  sig = await currentSignature();
  await bridge.call("live_set", {
    ref: { path: "live_set tracks 1" },
    property: "name",
    value: "Bass",
    expected_set_signature: sig,
  });
  sig = await currentSignature();
  await bridge.call("live_call", {
    ref: { path: "live_set tracks 1 clip_slots 0" },
    method: "create_clip",
    args: [16],
    expected_set_signature: sig,
  });
  sig = await currentSignature();
  await bridge.call("live_set", {
    ref: { path: "live_set tracks 1 clip_slots 0 clip" },
    property: "name",
    value: "Bassline A minor",
    expected_set_signature: sig,
  });
  sig = await currentSignature();
  await bridge.call("live_clip_add_notes", {
    ref: { path: "live_set tracks 1 clip_slots 0 clip" },
    notes: [
      { pitch: 45, start_time: 0, duration: 1, velocity: 100 },
      { pitch: 45, start_time: 2, duration: 0.5, velocity: 92 },
      { pitch: 48, start_time: 3.5, duration: 0.5, velocity: 88 },
    ],
    expected_set_signature: sig,
  });
  // Extended fields (probability, velocity_deviation) are not accepted by
  // add_new_notes upstream: they are applied by note_id in an update pass.
  const added = await bridge.readClip(1, 0);
  const target = added.notes.find((n) => n.start === 0);
  sig = await currentSignature();
  await bridge.call("live_clip_update_notes", {
    ref: { path: "live_set tracks 1 clip_slots 0 clip" },
    updates: [{ note_id: target.note_id, probability: 0.7, velocity_deviation: 10 }],
    expected_set_signature: sig,
  });

  const clip = await bridge.readClip(1, 0);
  assert.equal(clip.exists, true);
  assert.equal(clip.is_midi_clip, true);
  assert.equal(clip.name, "Bassline A minor");
  assert.equal(clip.length_beats, 16);
  assert.equal(clip.notes.length, 3);
  // Notes come back LOM-shaped (start, not start_time) with extended fields intact.
  const first = clip.notes.find((n) => n.start === 0);
  assert.equal(first.pitch, 45);
  assert.equal(first.probability, 0.7);
  assert.equal(first.velocity_deviation, 10);

  const ctx = await buildLiveContext(bridge);
  assert.equal(ctx.tracks.length, 2);
  assert.equal(ctx.tracks[1].kind, "midi");
  assert.equal(ctx.tracks[1].name, "Bass");
});
