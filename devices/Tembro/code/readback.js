"use strict";

// Exact readback comparison — Ableton is the authoritative state. A success
// response from the bridge is never proof; the executor re-reads the affected
// object and compares with these pure functions.

const EPS = 1e-6;

function near(a, b) {
  return Math.abs(a - b) <= EPS;
}

/**
 * Compare the notes written (plan) with the notes read back from Live.
 * Both sides are LOM-shaped: pitch, start (beats), duration (beats),
 * velocity, plus optional mute / probability / velocity_deviation.
 * Order-insensitive; returns { ok, mismatches: [...] }.
 */
function compareNotes(planned, actual) {
  const mismatches = [];
  if (planned.length !== actual.length) {
    mismatches.push(
      "note count mismatch: planned " + planned.length + ", in Live " + actual.length,
    );
  }
  const remaining = actual.slice();
  for (const p of planned) {
    const i = remaining.findIndex(
      (a) =>
        a.pitch === p.pitch &&
        near(a.start, p.start) &&
        near(a.duration, p.duration) &&
        a.velocity === p.velocity &&
        (p.mute === undefined || Boolean(a.mute) === Boolean(p.mute)) &&
        (p.probability === undefined || near(a.probability, p.probability)) &&
        (p.velocity_deviation === undefined ||
          near(a.velocity_deviation, p.velocity_deviation)),
    );
    if (i === -1) {
      mismatches.push(
        "planned note not found in Live: pitch=" +
          p.pitch +
          " start=" +
          p.start +
          " duration=" +
          p.duration +
          " velocity=" +
          p.velocity,
      );
    } else {
      remaining.splice(i, 1);
    }
  }
  for (const a of remaining) {
    mismatches.push(
      "unexpected note in Live: pitch=" + a.pitch + " start=" + a.start,
    );
  }
  return { ok: mismatches.length === 0, mismatches };
}

/** Compare a clip's readback against expectations. Fields are optional. */
function compareClip(expected, actual) {
  const mismatches = [];
  if (!actual || actual.exists === false) {
    return { ok: false, mismatches: ["clip does not exist where expected"] };
  }
  if (expected.length_beats !== undefined && !near(actual.length_beats, expected.length_beats)) {
    mismatches.push(
      "clip length mismatch: expected " +
        expected.length_beats +
        " beats, in Live " +
        actual.length_beats,
    );
  }
  if (expected.name !== undefined && actual.name !== expected.name) {
    mismatches.push(
      'clip name mismatch: expected "' + expected.name + '", in Live "' + actual.name + '"',
    );
  }
  if (expected.notes !== undefined) {
    const n = compareNotes(expected.notes, actual.notes || []);
    mismatches.push(...n.mismatches);
  }
  return { ok: mismatches.length === 0, mismatches };
}

module.exports = { compareNotes, compareClip, near };
