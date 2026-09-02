"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildLiveContext } = require("../code/context.js");

test("buildLiveContext includes the selected clip's notes losslessly", async () => {
  const notes = [
    { pitch: 45, start: 0, duration: 1, velocity: 100 },
    { pitch: 45, start: 2.5, duration: 0.5, velocity: 92 },
  ];
  const bridge = {
    async getSummary() {
      return {
        signature: "sig",
        tempo: 110,
        time_signature: { numerator: 4, denominator: 4 },
        tracks: [{ index: 0, name: "Bass", kind: "midi", devices: ["Operator"] }],
        selection: { track: 0, slot: 0 },
      };
    },
    async readClip(track, slot) {
      assert.equal(track, 0);
      assert.equal(slot, 0);
      return { exists: true, is_midi_clip: true, name: "Bassline", length_beats: 16, notes };
    },
  };
  const ctx = await buildLiveContext(bridge);
  assert.equal(ctx.tempo, 110);
  assert.deepEqual(ctx.time_signature, { numerator: 4, denominator: 4 });
  assert.deepEqual(ctx.selection.clip, {
    name: "Bassline",
    length_beats: 16,
    notes,
  });
});

test("buildLiveContext omits selection.clip when the slot is empty", async () => {
  const bridge = {
    async getSummary() {
      return {
        signature: "sig",
        tempo: 120,
        tracks: [],
        selection: { track: 0, slot: 1 },
      };
    },
    async readClip() {
      return { exists: false };
    },
  };
  const ctx = await buildLiveContext(bridge);
  assert.equal(ctx.selection.clip, undefined);
  assert.equal(ctx.selection.track, 0);
});

test("buildLiveContext does not expose an audio clip as editable MIDI", async () => {
  const bridge = {
    async getSummary() {
      return {
        tempo: 120,
        tracks: [{ index: 0, name: "Vocal", kind: "audio", devices: [] }],
        selection: { track: 0, slot: 0 },
      };
    },
    async readClip() {
      return {
        exists: true,
        is_midi_clip: false,
        name: "Vocal take",
        length_beats: 8,
      };
    },
  };
  const ctx = await buildLiveContext(bridge);
  assert.equal(ctx.selection.clip, undefined);
});
