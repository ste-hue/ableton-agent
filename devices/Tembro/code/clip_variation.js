"use strict";

// Explicit local controls only. Never registered as a model tool or charged as
// an agent turn. The fixed Remote Script operation owns the atomic Live guards.
const { randomUUID } = require("crypto");
const { isDeepStrictEqual } = require("util");

const PROTOCOL = "tembro.clip-variation.v1";
const TOOL = "live_clip_variation";
const MAX_NOTES = 4096;
const NOTE_FIELDS = ["note_id", "pitch", "start_time", "duration", "velocity", "mute", "probability", "velocity_deviation", "release_velocity"];
const ACTIONS = new Set(["capture", "create", "thin", "audition_source", "audition_candidate", "keep", "discard", "reconcile"]);
const CAPABILITY = { audition_source: "auditionSource", audition_candidate: "auditionCandidate" };

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function exactNotes(notes) {
  requireValue(Array.isArray(notes) && notes.length <= MAX_NOTES, "Incomplete note readback");
  const rows = notes.map((note) => NOTE_FIELDS.map((field) => {
    const value = note[field];
    requireValue(typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)), "Missing extended note field: " + field);
    return value;
  })).sort((a, b) => a[0] - b[0]);
  requireValue(rows.every((row) => Number.isInteger(row[0]) && row[0] > 0) && new Set(rows.map((row) => row[0])).size === rows.length, "Invalid note identity");
  return rows;
}

class ClipVariation {
  constructor({ client, preflight, onState = () => {}, ownerId = randomUUID() }) {
    this.client = client;
    this.preflight = preflight;
    this.onState = onState;
    this.ownerId = ownerId;
    this.observed = null;
    this.state = "idle";
    this.message = "Select a Session MIDI clip in a Drum Rack track, then capture it.";
    this.busy = false;
  }

  snapshot() {
    const result = this.observed;
    const candidate = result && result.candidate;
    const pending = Boolean(result && result.audition && result.audition.triggered);
    const unknown = this.client.quarantined || this.state === "unknown";
    const ready = this.state === "candidate" && Boolean(candidate) && !unknown && !pending;
    const can = {
      capture: !unknown && ["idle", "captured", "kept", "discarded", "unavailable"].includes(this.state),
      create: !unknown && this.state === "captured" && (result.lanes || []).some((lane) => lane.count >= 2),
      thin: ready && candidate.lane_note_count >= 2,
      auditionSource: ready,
      auditionCandidate: ready,
      keep: ready,
      discard: ready && result.can_discard === true && !(result.audition && result.audition.target === "candidate" && result.audition.playing),
      reconcile: unknown || Boolean(result),
    };
    return {
      state: unknown ? "unknown" : this.state,
      busy: this.busy,
      message: unknown ? "Live outcome unknown. " + (this.state === "unknown" ? this.message : "Recheck bridge status; do not repeat the operation.") : this.message,
      source: result && result.source ? { id: result.source.id, path: result.source.path, name: result.source.name, trackName: result.source.track_name } : null,
      candidate: candidate && this.state !== "discarded" ? { id: candidate.id, path: candidate.path, name: candidate.name, noteCount: candidate.note_count, removedCount: result.source.note_count - candidate.note_count } : null,
      lanes: result ? result.lanes : [], can,
    };
  }

  publish() { const value = this.snapshot(); this.onState(value); return value; }

  _validate(result, expectedAction) {
    requireValue(result && result.protocol === PROTOCOL && result.owner_id === this.ownerId && result.host_observed === true, "Unsupported variation runtime response");
    requireValue(result.action === expectedAction, "Variation response belongs to a different action");
    requireValue(result.capabilities && result.capabilities.atomic_guards === true && result.capabilities.raw_duplication === true && Array.isArray(result.capabilities.extended_note_fields) && NOTE_FIELDS.every((field) => result.capabilities.extended_note_fields.includes(field)), "Required variation guards unavailable");
    requireValue(Array.isArray(result.lanes) && typeof result.set_signature === "string" && result.set_signature.length > 0, "Incomplete variation response");
    requireValue(result.source && ["captured", "candidate", "kept", "discarded", "conflict", "creating", "discarding"].includes(result.state), "Missing source or invalid variation state");
    requireValue(!["candidate", "kept", "discarded"].includes(result.state) || result.candidate, "Missing candidate snapshot");
    if (result.verified !== true || result.state === "conflict") {
      throw new Error((result.conflicts || ["Live content changed"]).join("; "));
    }
    const expectedState = { capture: "captured", create: "candidate", thin: "candidate", audition_source: "candidate", audition_candidate: "candidate", keep: "kept", discard: "discarded" }[expectedAction];
    requireValue(!expectedState || result.state === expectedState, "Variation action did not reach its expected state");
    for (const clip of [result.source, result.state === "discarded" ? null : result.candidate].filter(Boolean)) {
      requireValue(Number.isInteger(clip.id) && clip.truncated === false && Array.isArray(clip.notes) && clip.note_count === clip.notes.length && typeof clip.content_sha256 === "string", "Incomplete clip snapshot");
      exactNotes(clip.notes);
    }
    return result;
  }

  async _summary() {
    const result = await this.client.callTool("live_set_summary", { track_limit: 0, clip_slot_limit: 0, device_limit: 0, include_return_tracks: false, include_master_track: false });
    requireValue(result && typeof result.set_signature === "string" && result.set_signature.length > 0, "Live did not return a Set signature");
    return result;
  }

  async _readback(result) {
    for (const clip of [result.source, result.state === "discarded" ? null : result.candidate].filter(Boolean)) {
      const read = await this.client.callTool("live_clip_notes", { ref: { id: clip.id }, limit: MAX_NOTES, max_items: MAX_NOTES, max_depth: 12 });
      requireValue(read && read.note_api === "extended" && read.truncated === false && read.note_count === clip.note_count && Array.isArray(read.notes) && read.note_count === read.notes.length, "Truncated or incomplete note readback");
      requireValue(read.clip && read.clip.id === clip.id, "Readback clip identity changed");
      requireValue(isDeepStrictEqual(exactNotes(read.notes), exactNotes(clip.notes)), "Clip notes changed during verification; candidate retained");
    }
    const fresh = this._validate(await this.client.callTool(TOOL, { action: "status", owner_id: this.ownerId }), "status");
    for (const key of ["source", "candidate"]) {
      const before = result[key];
      const after = fresh[key];
      requireValue((!before && !after) || (before && after && before.id === after.id && before.content_sha256 === after.content_sha256), "Clip changed during verification");
    }
    requireValue(fresh.state === result.state, "Variation ownership changed during verification");
    return fresh;
  }

  _accept(result) {
    this.observed = result;
    this.state = result.state;
    const pending = result.audition && result.audition.triggered;
    if (pending) this.message = "Launch queued in Live. Use Recheck to observe it; do not launch again.";
    else if (result.audition && result.audition.playing) this.message = (result.audition.target === "source" ? "Original" : "Candidate") + " is playing in Live. Compare by listening.";
    else if (this.state === "captured") this.message = "Choose the drum lane to thin in a separate clip.";
    else if (this.state === "candidate") this.message = "Candidate notes verified. Play either version to compare. Discard is unavailable while note-expression edits cannot be checked.";
    else if (this.state === "kept") this.message = "Kept this exact candidate in its Session slot.";
    else if (this.state === "discarded") this.message = "Candidate removal verified.";
    else this.message = "Live returned an unfinished operation. Recheck before continuing.";
  }

  async execute(action, pitch, shouldStop = () => false) {
    requireValue(ACTIONS.has(action), "Unknown variation action");
    requireValue(!this.busy, "A variation operation is already running");
    requireValue(this.snapshot().can[CAPABILITY[action] || action] === true, "This action is unavailable; recheck Live first");
    const checkStop = () => requireValue(!shouldStop(), "Stopped before the next Live operation");
    let mutationSent = false;
    this.busy = true;
    this.publish();
    try {
      if (this.client.quarantined) {
        this.state = "unknown";
        const status = await this.client.callTool("live_bridge_status", {});
        const thread = status && status.main_thread;
        this.message = status && status.ok === true && status.running === true && status.server_thread_responsive === true && thread && !thread.in_flight_method && !thread.in_flight_timed_out && thread.stall_cooldown_remaining === 0
          ? "Bridge is idle; the previous operation still needs manual reconciliation. Requests remain blocked."
          : "Live may still be completing the previous operation. Requests remain blocked.";
        // An idle socket is not evidence about clip contents. This experimental
        // controller deliberately has no transport-quarantine reset shortcut.
        return this.publish();
      }
      checkStop();
      await this.preflight();
      checkStop();
      const tools = await this.client.listTools();
      requireValue(tools.some((tool) => tool.name === TOOL), "Install the matching Tembro variation runtime before using these controls");
      checkStop();
      let result;
      if (action === "reconcile") {
        result = this._validate(await this.client.callTool(TOOL, { action: "status", owner_id: this.ownerId }), "status");
      } else {
        const args = { action, owner_id: this.ownerId };
        if (action === "create") {
          requireValue(Number.isInteger(pitch) && this.observed.lanes.some((lane) => lane.pitch === pitch && lane.count >= 2), "Choose an explicitly mapped lane with at least two notes");
          args.pitch = pitch;
        }
        if (action !== "capture") {
          const summary = await this._summary();
          args.expected_set_signature = summary.set_signature;
        }
        checkStop();
        mutationSent = action !== "capture";
        result = this._validate(await this.client.callTool(TOOL, args), action);
        // Retain candidate identity even when subsequent verification fails.
        this.observed = result;
        if (mutationSent) await this._summary();
      }
      // A user Stop prevents new mutations; an operation already sent must
      // still receive all readback before the shared lane can be released.
      result = await this._readback(result);
      this._accept(result);
      return result;
    } catch (error) {
      if ((mutationSent || error.outcomeUnknown) && !this.client.quarantined) {
        error = this.client.markOutcomeUnknown(TOOL, "Variation operation could not be verified: " + error.message);
      }
      this.state = this.client.quarantined || error.outcomeUnknown ? "unknown" : this.observed ? "conflict" : "unavailable";
      this.message = error.message;
      throw error;
    } finally {
      this.busy = false;
      this.publish();
    }
  }
}

module.exports = { ClipVariation, NOTE_FIELDS, MAX_NOTES };
