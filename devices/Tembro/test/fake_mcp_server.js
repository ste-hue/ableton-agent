"use strict";

// Fake upstream `ableton-live-mcp` MCP stdio server with a tiny in-memory
// Live Set. Emulates the pinned upstream's protocol surface used by Tembro:
// newline-delimited JSON-RPC 2.0, initialize / notifications/initialized /
// tools/call, results in structuredContent, expected_set_signature guard.
// Used only by tests.

const readline = require("readline");

let sigCounter = 1;
const state = {
  tempo: 120,
  signature_numerator: 4,
  signature_denominator: 4,
  tracks: [
    { name: "Audio", has_midi_input: false, devices: [], clips: {} },
  ],
  selection: { track: 0, slot: 0 },
};

function signature() {
  return "fake-sig-" + sigCounter;
}
function mutate() {
  sigCounter += 1;
}
function guard(args) {
  if (
    args.expected_set_signature !== undefined &&
    args.expected_set_signature !== signature()
  ) {
    throw new Error(
      "set signature mismatch: expected " + args.expected_set_signature + ", current " + signature(),
    );
  }
}

function parsePath(path) {
  // e.g. "live_set tracks 1 clip_slots 0 clip"
  const parts = String(path || "").trim().split(/\s+/);
  return parts;
}

function noteId() {
  noteId.n = (noteId.n || 0) + 1;
  return noteId.n;
}

const tools = {
  live_ping() {
    return { ok: true, remote_script: { runtime_version: "fake" } };
  },
  live_bridge_status() {
    return { server_thread_responsive: true };
  },
  live_set_summary() {
    return {
      set_signature: signature(),
      tracks: state.tracks.map((t, i) => ({
        index: i,
        name: t.name,
        kind: t.has_midi_input ? "midi" : "audio",
        devices: t.devices.map((d) => ({ name: d })),
      })),
    };
  },
  live_get(args) {
    const parts = parsePath(args.ref.path);
    const out = {};
    let target;
    if (parts.length === 1 && parts[0] === "live_set") {
      target = state;
    } else if (parts[1] === "view") {
      target = {
        selected_track: "live_set tracks " + state.selection.track,
        highlighted_clip_slot:
          "live_set tracks " + state.selection.track + " clip_slots " + state.selection.slot,
      };
    } else if (parts[1] === "tracks") {
      const t = state.tracks[Number(parts[2])];
      if (!t) throw new Error("track does not exist: " + args.ref.path);
      if (parts[3] === "clip_slots") {
        const slot = Number(parts[4]);
        const clip = t.clips[slot];
        if (parts[5] === "clip") {
          if (!clip) throw new Error("no clip: " + args.ref.path);
          target = { name: clip.name, length: clip.length, is_midi_clip: true };
        } else {
          target = { has_clip: Boolean(clip) };
        }
      } else {
        target = t;
      }
    } else {
      throw new Error("unsupported path: " + args.ref.path);
    }
    for (const p of args.properties || []) out[p] = target[p];
    return out;
  },
  live_set(args) {
    guard(args);
    const parts = parsePath(args.ref.path);
    if (parts.length === 1) {
      state[args.property] = args.value;
    } else if (parts[1] === "tracks" && parts.length === 3) {
      state.tracks[Number(parts[2])][args.property] = args.value;
    } else if (parts[3] === "clip_slots" && parts[5] === "clip") {
      state.tracks[Number(parts[2])].clips[Number(parts[4])][args.property] = args.value;
    } else {
      throw new Error("unsupported set path: " + args.ref.path);
    }
    mutate();
    return { ok: true };
  },
  live_call(args) {
    guard(args);
    const parts = parsePath(args.ref.path);
    const method = args.method;
    if (method === "create_midi_track") {
      const index = args.args[0];
      state.tracks.splice(index, 0, {
        name: (index + 1) + " MIDI",
        has_midi_input: true,
        devices: [],
        clips: {},
      });
      mutate();
      return { ok: true };
    }
    if (method === "create_clip") {
      const t = state.tracks[Number(parts[2])];
      t.clips[Number(parts[4])] = { name: "", length: args.args[0], notes: [] };
      mutate();
      return { ok: true };
    }
    if (method === "fire" || method === "stop_all_clips" || method === "undo") {
      if (method === "undo") mutate();
      return { ok: true };
    }
    throw new Error("unsupported method: " + method);
  },
  live_clip_add_notes(args) {
    guard(args);
    const parts = parsePath(args.ref.path);
    const clip = state.tracks[Number(parts[2])].clips[Number(parts[4])];
    if (!clip) throw new Error("no clip at " + args.ref.path);
    if (args.clear) clip.notes = [];
    for (const n of args.notes) {
      clip.notes.push({
        note_id: noteId(),
        pitch: n.pitch,
        start_time: n.start_time,
        duration: n.duration,
        velocity: n.velocity,
        mute: Boolean(n.mute),
        probability: 1,
        velocity_deviation: 0,
      });
    }
    mutate();
    return { ok: true, added: args.notes.length };
  },
  live_clip_update_notes(args) {
    guard(args);
    const parts = parsePath(args.ref.path);
    const clip = state.tracks[Number(parts[2])].clips[Number(parts[4])];
    for (const u of args.updates) {
      const note = clip.notes.find((n) => n.note_id === u.note_id);
      if (!note) throw new Error("no note " + u.note_id);
      Object.assign(note, u);
    }
    mutate();
    return { ok: true };
  },
  live_clip_notes(args) {
    const parts = parsePath(args.ref.path);
    const clip = state.tracks[Number(parts[2])].clips[Number(parts[4])];
    if (!clip) throw new Error("no clip at " + args.ref.path);
    return { notes: clip.notes.map((n) => ({ ...n })) };
  },
  live_browser_search(args) {
    return {
      items: [
        { id: 7, uri: "query:Synths#Operator", name: args.query, is_loadable: true },
      ],
    };
  },
  live_browser_load(args) {
    guard(args);
    const parts = parsePath(args.target_track.path);
    state.tracks[Number(parts[2])].devices.push("Operator");
    mutate();
    return { ok: true };
  },
};

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.method === "notifications/initialized") return; // notification
  const reply = { jsonrpc: "2.0", id: msg.id };
  try {
    if (msg.method === "initialize") {
      reply.result = {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "fake-ableton-live-mcp", version: "0.0.0" },
        capabilities: { tools: {} },
      };
    } else if (msg.method === "tools/call") {
      const { name, arguments: args } = msg.params;
      if (!tools[name]) throw new Error("unknown tool: " + name);
      const structured = tools[name](args || {});
      reply.result = {
        content: [{ type: "text", text: JSON.stringify(structured) }],
        structuredContent: structured,
      };
    } else {
      throw new Error("unknown method: " + msg.method);
    }
  } catch (err) {
    reply.result = {
      isError: true,
      content: [{ type: "text", text: String(err.message || err) }],
    };
  }
  process.stdout.write(JSON.stringify(reply) + "\n");
});
