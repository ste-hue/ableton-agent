"use strict";

// Tembro local action executor — maps the validated V0 action plan onto the
// existing MCP/LOM bridge. Invariants (AGENTS.md + issue):
//   • sequential execution, one call in flight;
//   • preflight before mutation;
//   • expected_set_signature guard where supported;
//   • stop immediately on the first failed operation;
//   • never silently continue after a mismatch;
//   • exact readback after every persistent mutation;
//   • outcomes reported to the caller (forwarded to /v0/events).
//
// The bridge is injected so the executor is testable without Live. The real
// implementation is lom_bridge.js (upstream ableton-live-mcp over MCP stdio).

const { compareNotes, compareClip, near } = require("./readback.js");

const PERSISTENT_OPS = new Set([
  "set_tempo",
  "create_midi_track",
  "load_device",
  "create_clip",
  "replace_notes",
  "undo",
]);

function failure(index, op, stage, message) {
  return { index, op, stage, message };
}

/**
 * Execute a validated action plan sequentially against the bridge.
 *
 * @param {Array} plan       validated V0 actions (ActionPlanSchema shape)
 * @param {Object} bridge    LOM bridge (see lom_bridge.js for the contract)
 * @param {Object} [opts]    { onEvent(kind, payload) } outcome reporter
 * @returns {Promise<{ok: boolean, executed: number, error?: object}>}
 */
async function executePlan(plan, bridge, opts) {
  const onEvent = (opts && opts.onEvent) || (() => {});

  // --- Preflight: bridge reachable + fresh Set signature before any mutation.
  let summary;
  try {
    await bridge.ping();
    summary = await bridge.getSummary();
  } catch (err) {
    const error = failure(-1, "preflight", "preflight", String((err && err.message) || err));
    await onEvent("client.error", error);
    return { ok: false, executed: 0, error };
  }
  let sig = summary.signature;

  for (let i = 0; i < plan.length; i++) {
    const action = plan[i];
    let expectation = null; // readback expectation captured before executing

    // --- Execute (signature-guarded where the bridge supports it) -----------
    try {
      switch (action.op) {
        case "set_tempo":
          await bridge.setTempo(action.bpm, sig);
          break;
        case "create_midi_track": {
          expectation = { newTrackIndex: summary.tracks.length };
          await bridge.createMidiTrack(expectation.newTrackIndex, action.name, sig);
          break;
        }
        case "load_device": {
          const track = summary.tracks[action.track];
          if (!track) {
            throw new Error("load_device: track " + action.track + " does not exist");
          }
          expectation = { devicesBefore: (track.devices || []).length };
          await bridge.loadDevice(action.track, action.query, sig);
          break;
        }
        case "create_clip":
          await bridge.createClip(action.track, action.slot, action.length_beats, action.name, sig);
          break;
        case "replace_notes":
          await bridge.replaceNotes(action.track, action.slot, action.notes, sig);
          break;
        case "fire_clip":
          await bridge.fireClip(action.track, action.slot);
          break;
        case "fire_scene":
          await bridge.fireScene(action.scene);
          break;
        case "stop_all":
          await bridge.stopAll();
          break;
        case "undo":
          await bridge.undo(sig);
          break;
        default:
          throw new Error("unknown op: " + action.op);
      }
    } catch (err) {
      const error = failure(i, action.op, "execute", String((err && err.message) || err));
      await onEvent("action.failed", error);
      return { ok: false, executed: i, error };
    }

    // --- Refresh signature after persistent mutations ------------------------
    if (PERSISTENT_OPS.has(action.op)) {
      try {
        summary = await bridge.getSummary();
        sig = summary.signature;
      } catch (err) {
        const error = failure(i, action.op, "readback", "summary refresh failed: " + String((err && err.message) || err));
        await onEvent("action.failed", error);
        return { ok: false, executed: i, error };
      }
    }

    // --- Exact readback: verify the concrete result in Live ------------------
    let mismatches = [];
    try {
      switch (action.op) {
        case "set_tempo":
          if (!near(summary.tempo, action.bpm)) {
            mismatches = ["tempo is " + summary.tempo + ", expected " + action.bpm];
          }
          break;
        case "create_midi_track": {
          const t = summary.tracks[expectation.newTrackIndex];
          if (!t) {
            mismatches = ["no track at expected index " + expectation.newTrackIndex];
          } else if (t.kind !== "midi") {
            mismatches = ["track at index " + expectation.newTrackIndex + " is not a MIDI track"];
          } else if (t.name !== action.name) {
            mismatches = ['track name is "' + t.name + '", expected "' + action.name + '"'];
          }
          break;
        }
        case "load_device": {
          const t = summary.tracks[action.track];
          const count = t ? (t.devices || []).length : 0;
          if (count <= expectation.devicesBefore) {
            mismatches = ["no new device on track " + action.track + ' after loading "' + action.query + '"'];
          }
          break;
        }
        case "create_clip": {
          const clip = await bridge.readClip(action.track, action.slot);
          const cmp = compareClip(
            { length_beats: action.length_beats, name: action.name },
            clip,
          );
          mismatches = cmp.mismatches;
          break;
        }
        case "replace_notes": {
          const clip = await bridge.readClip(action.track, action.slot);
          if (!clip || clip.exists === false) {
            mismatches = ["clip does not exist where expected"];
          } else {
            mismatches = compareNotes(action.notes, clip.notes || []).mismatches;
          }
          break;
        }
        default:
          break; // fire_clip / fire_scene / stop_all / undo: no exact readback in V0
      }
    } catch (err) {
      const error = failure(i, action.op, "readback", String((err && err.message) || err));
      await onEvent("action.failed", error);
      return { ok: false, executed: i, error };
    }

    if (mismatches.length > 0) {
      const error = failure(i, action.op, "readback", mismatches.join("; "));
      await onEvent("readback.mismatch", error);
      return { ok: false, executed: i, error };
    }

    await onEvent("action.executed", { index: i, op: action.op });
  }

  return { ok: true, executed: plan.length };
}

module.exports = { executePlan };
