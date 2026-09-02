"use strict";

// LOM bridge — read-side helpers over the pinned upstream `ableton-live-mcp`
// MCP tools (live_ping / live_set_summary / live_get / live_clip_notes) used
// to build the Live context sent with each agent turn. Mutations are not
// issued from here: the server-driven agent loop calls MCP tools directly
// (agent_loop.js). This is the ONLY Ableton path in Tembro: no second control
// stack, no direct port 8765 access.
//
// Canonical LOM paths are space-separated, e.g.
//   live_set tracks 2 clip_slots 0 clip

/** Depth-first search for the first value of `key` anywhere in a JSON tree. */
function findKey(obj, key) {
  if (obj === null || typeof obj !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  for (const k of Object.keys(obj)) {
    const found = findKey(obj[k], key);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Unwrap a live_get property value that may arrive raw or wrapped. */
function prop(result, name) {
  let v = findKey(result, name);
  if (v && typeof v === "object" && !Array.isArray(v) && "value" in v) v = v.value;
  return v;
}

function indexFrom(value, collection) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const m = text.match(new RegExp(collection + "[\\s.]+(\\d+)"));
  return m ? Number(m[1]) : undefined;
}

function normalizeNote(n) {
  const note = {
    pitch: n.pitch,
    start: n.start_time !== undefined ? n.start_time : n.start,
    duration: n.duration,
    velocity: n.velocity,
  };
  if (n.mute !== undefined) note.mute = Boolean(n.mute);
  if (n.probability !== undefined) note.probability = n.probability;
  if (n.velocity_deviation !== undefined) note.velocity_deviation = n.velocity_deviation;
  if (n.note_id !== undefined) note.note_id = n.note_id;
  return note;
}

class LomBridge {
  /** @param {{callTool(name, args): Promise<object>}} client MCP client */
  constructor(client) {
    this.client = client;
  }

  call(name, args) {
    return this.client.callTool(name, args);
  }

  async ping() {
    await this.call("live_ping", {});
  }

  async _signature() {
    const raw = await this.call("live_set_summary", {
      include_return_tracks: false,
      include_master_track: false,
      track_limit: 0,
    });
    return findKey(raw, "set_signature");
  }

  async getSummary() {
    const raw = await this.call("live_set_summary", {
      include_return_tracks: false,
      include_master_track: false,
    });
    const signature = findKey(raw, "set_signature");

    const song = await this.call("live_get", {
      ref: { path: "live_set" },
      properties: ["tempo", "signature_numerator", "signature_denominator"],
    });
    const tempo = Number(prop(song, "tempo"));
    const numerator = Number(prop(song, "signature_numerator"));
    const denominator = Number(prop(song, "signature_denominator"));

    const tracks = await this._readTracks(raw);
    const selection = await this._readSelection();

    const summary = { signature, tempo, tracks, selection };
    if (Number.isFinite(numerator) && Number.isFinite(denominator)) {
      summary.time_signature = { numerator, denominator };
    }
    return summary;
  }

  /** Normalize the summary's track list; fall back to per-track live_get probes. */
  async _readTracks(rawSummary) {
    const rawTracks = findKey(rawSummary, "tracks");
    const tracks = [];
    if (Array.isArray(rawTracks) && rawTracks.length > 0) {
      for (let i = 0; i < rawTracks.length; i++) {
        const t = rawTracks[i] || {};
        const name = t.name !== undefined ? String(t.name) : "Track " + (i + 1);
        let kind = t.kind || t.type;
        if (kind !== "midi" && kind !== "audio") {
          kind = t.has_midi_input || t.is_midi ? "midi" : t.has_audio_input ? "audio" : undefined;
        }
        if (kind === undefined) {
          const probed = await this.call("live_get", {
            ref: { path: "live_set tracks " + i },
            properties: ["has_midi_input"],
          });
          kind = prop(probed, "has_midi_input") ? "midi" : "audio";
        }
        const rawDevices = t.devices;
        let devices = [];
        if (Array.isArray(rawDevices)) {
          devices = rawDevices.map((d) =>
            typeof d === "string" ? d : String((d && d.name) || "device"),
          );
        }
        tracks.push({ index: i, name, kind, devices });
      }
      return tracks;
    }
    // Fallback: probe tracks one by one (sequential, bounded).
    for (let i = 0; i < 200; i++) {
      let probed;
      try {
        probed = await this.call("live_get", {
          ref: { path: "live_set tracks " + i },
          properties: ["name", "has_midi_input"],
        });
      } catch {
        break;
      }
      const name = prop(probed, "name");
      if (name === undefined) break;
      tracks.push({
        index: i,
        name: String(name),
        kind: prop(probed, "has_midi_input") ? "midi" : "audio",
        devices: [],
      });
    }
    return tracks;
  }

  async _readSelection() {
    try {
      const view = await this.call("live_get", {
        ref: { path: "live_set view" },
        properties: ["selected_track", "highlighted_clip_slot"],
      });
      const track = indexFrom(prop(view, "selected_track"), "tracks");
      const slot = indexFrom(prop(view, "highlighted_clip_slot"), "clip_slots");
      const selection = {};
      if (track !== undefined) selection.track = track;
      if (slot !== undefined) selection.slot = slot;
      return selection;
    } catch {
      return {};
    }
  }

  async readClip(track, slot) {
    const slotPath = "live_set tracks " + track + " clip_slots " + slot;
    const slotInfo = await this.call("live_get", {
      ref: { path: slotPath },
      properties: ["has_clip"],
    });
    if (!prop(slotInfo, "has_clip")) return { exists: false };

    const clipPath = slotPath + " clip";
    const clipInfo = await this.call("live_get", {
      ref: { path: clipPath },
      properties: ["name", "length", "is_midi_clip"],
    });
    const isMidiClip = Boolean(prop(clipInfo, "is_midi_clip"));
    const result = {
      exists: true,
      is_midi_clip: isMidiClip,
      name: prop(clipInfo, "name") !== undefined ? String(prop(clipInfo, "name")) : undefined,
      length_beats: Number(prop(clipInfo, "length")),
    };
    if (isMidiClip) {
      result.notes = [];
      const rawNotes = await this.call("live_clip_notes", { ref: { path: clipPath } });
      const list = Array.isArray(rawNotes) ? rawNotes : findKey(rawNotes, "notes");
      if (Array.isArray(list)) result.notes = list.map(normalizeNote);
    }
    return result;
  }
}

module.exports = { LomBridge, findKey, prop, indexFrom, normalizeNote };
