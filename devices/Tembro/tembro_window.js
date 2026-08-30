"use strict";

// Keep the jweb surface pinned to the presentation window while the user
// resizes the floating Tembro chat.
inlets = 1;
outlets = 0;

function bang() {
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
}
