"use strict";

// Live context adapter — reads only what the model needs, right before each
// request: tempo, time signature, track list (index/name/kind/devices), the
// selected track + clip slot, and — when a MIDI clip is selected — its name,
// length and lossless LOM-shaped notes. The modify-by-reference acceptance
// test depends on those notes being present.

async function buildLiveContext(bridge) {
  const summary = await bridge.getSummary();
  const context = {
    tempo: summary.tempo,
    tracks: (summary.tracks || []).map((t) => ({
      index: t.index,
      name: t.name,
      kind: t.kind,
      devices: t.devices || [],
    })),
  };
  if (summary.time_signature) {
    context.time_signature = {
      numerator: summary.time_signature.numerator,
      denominator: summary.time_signature.denominator,
    };
  }

  const sel = summary.selection || {};
  if (sel.track !== undefined || sel.slot !== undefined) {
    const selection = {};
    if (sel.track !== undefined) selection.track = sel.track;
    if (sel.slot !== undefined) selection.slot = sel.slot;

    if (sel.track !== undefined && sel.slot !== undefined) {
      const clip = await bridge.readClip(sel.track, sel.slot);
      if (clip && clip.exists !== false && Array.isArray(clip.notes)) {
        selection.clip = {
          length_beats: clip.length_beats,
          notes: clip.notes,
        };
        if (clip.name !== undefined) selection.clip.name = clip.name;
      }
    }
    context.selection = selection;
  }
  return context;
}

module.exports = { buildLiveContext };
