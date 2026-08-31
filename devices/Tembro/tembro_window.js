"use strict";

// Runs inside Max 9's v8 object: top-level assignments to undeclared names
// throw under strict mode, so Max globals and message handlers must be set
// on globalThis explicitly (a bare `inlets = 1` aborts the script and leaves
// "v8: no function bang" spam from the resize qmetro).
globalThis.inlets = 1;
globalThis.outlets = 0;

// Keep the jweb surface pinned to the presentation window while the user
// resizes the floating Tembro chat.
globalThis.bang = function () {
  try {
    const bounds = this.patcher.wind.size;
    const width = Math.max(420, Number(bounds[2]) - Number(bounds[0]));
    const height = Math.max(420, Number(bounds[3]) - Number(bounds[1]));
    const web = this.patcher.getnamed("tembro-web");
    if (!web) return;
    web.rect = [0, 0, width, height];
    web.presentation_rect = [0, 0, width, height];
  } catch (_) {
    // The patcher window is not available during the first construction tick.
  }
};
