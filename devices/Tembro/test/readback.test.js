"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { compareNotes, compareClip } = require("../code/readback.js");
const { buildLiveContext } = require("../code/context.js");

test("compareNotes: exact match is order-insensitive", () => {
  const planned = [
    { pitch: 45, start: 0, duration: 1, velocity: 100 },
    { pitch: 48, start: 1, duration: 0.5, velocity: 90 },
  ];
  const actual = [planned[1], planned[0]].map((n) => ({ ...n }));
  assert.equal(compareNotes(planned, actual).ok, true);
});

test("compareNotes: catches pitch, timing, velocity and count drift", () => {
  const planned = [{ pitch: 45, start: 0, duration: 1, velocity: 100 }];
  assert.equal(compareNotes(planned, [{ pitch: 46, start: 0, duration: 1, velocity: 100 }]).ok, false);
  assert.equal(compareNotes(planned, [{ pitch: 45, start: 0.25, duration: 1, velocity: 100 }]).ok, false);
  assert.equal(compareNotes(planned, [{ pitch: 45, start: 0, duration: 1, velocity: 99 }]).ok, false);
  assert.equal(compareNotes(planned, []).ok, false);
  assert.equal(
    compareNotes(planned, [...planned, { pitch: 50, start: 2, duration: 1, velocity: 80 }]).ok,
    false,
  );
});

test("compareNotes: optional fields only checked when planned", () => {
  const actual = [
    { pitch: 45, start: 0, duration: 1, velocity: 100, mute: false, probability: 1 },
  ];
  assert.equal(
    compareNotes([{ pitch: 45, start: 0, duration: 1, velocity: 100 }], actual).ok,
    true,
  );
  assert.equal(
    compareNotes(
      [{ pitch: 45, start: 0, duration: 1, velocity: 100, probability: 0.5 }],
      actual,
    ).ok,
    false,
  );
});

test("compareClip: missing clip and wrong length are mismatches", () => {
  assert.equal(compareClip({ length_beats: 16 }, { exists: false }).ok, false);
  assert.equal(
    compareClip({ length_beats: 16 }, { exists: true, length_beats: 12, notes: [] }).ok,
    false,
  );
  assert.equal(
    compareClip({ length_beats: 16 }, { exists: true, length_beats: 16, notes: [] }).ok,
    true,
  );
});

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
      return { exists: true, name: "Bassline", length_beats: 16, notes };
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
