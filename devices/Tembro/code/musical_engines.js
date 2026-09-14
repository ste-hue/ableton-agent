"use strict";

// Trusted local composition only. This module has no Live client, network or
// transport access. A proposal is material to review, never proof of application.
const { createHash } = require("node:crypto");
const chordarium = require("./chordarium_engine.js");
const rudiment = require("./rudiment_engine.js");

const SCHEMA = "tembro.musical-proposal.v1";
const MAX_NOTES = 8192;
const MAX_PROPOSALS = 16;
const MAX_STORE_BYTES = 8 * 1024 * 1024;
const MAX_PAGE = 128;
const NAMES = Object.freeze([
  "tembro_chordarium_compose", "tembro_rudiment_compose",
  "tembro_ensemble_compose", "tembro_proposal_notes",
]);

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  throw new Error("proposal contains a non-JSON value");
}

function digest(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
function strictObject(value, required, optional = []) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      required.some((key) => !Object.hasOwn(value, key)) ||
      Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))) {
    throw new Error("invalid fields; required: " + required.join(", "));
  }
}

function validateMaterial(material) {
  if (!material || !material.engine || !["chordarium", "rudiment"].includes(material.engine.id) ||
      !Number.isFinite(material.duration_beats) || material.duration_beats <= 0 ||
      material.time_signature?.numerator !== 4 || material.time_signature?.denominator !== 4 ||
      !Array.isArray(material.notes) || material.notes.length > MAX_NOTES) throw new Error("invalid engine proposal");
  let end = 0;
  for (const note of material.notes) {
    if (!Number.isFinite(note.start_beats) || note.start_beats < 0 || note.start_beats >= material.duration_beats ||
        !Number.isFinite(note.duration_beats) || note.duration_beats <= 0 ||
        !Number.isInteger(note.velocity) || note.velocity < 1 || note.velocity > 127 ||
        typeof note.role !== "string" || !note.role ||
        (material.engine.id === "chordarium" && (!Number.isInteger(note.pitch) || note.pitch < 0 || note.pitch > 127)) ||
        (material.engine.id === "rudiment" && Object.hasOwn(note, "pitch"))) throw new Error("invalid engine note");
    end = Math.max(end, note.start_beats + note.duration_beats);
  }
  if (Math.abs(material.content_end_beats - end) > 1e-9) throw new Error("engine content end differs from its notes");
  // Canonical serialization below also rejects non-finite metadata.
  return material;
}

const ensembleSchema = {
  type: "object", additionalProperties: false,
  required: ["seed", "key", "mode", "bpm", "bars", "drum_style", "density", "syncopation", "kit"],
  properties: {
    seed: { type: "integer", minimum: 1, maximum: 4294967295 },
    key: chordarium.inputSchema.properties.key, mode: chordarium.inputSchema.properties.mode,
    bpm: chordarium.inputSchema.properties.bpm,
    bars: { type: "integer", enum: [8, 16] },
    genre: chordarium.inputSchema.properties.genre,
    drum_style: rudiment.inputSchema.properties.style,
    density: rudiment.inputSchema.properties.density,
    syncopation: rudiment.inputSchema.properties.syncopation,
    kit: rudiment.inputSchema.properties.kit,
  },
};

const NOTES_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["proposal_id", "track", "offset", "limit"],
  properties: {
    proposal_id: { type: "string", pattern: "^[a-f0-9]{64}$" },
    track: { type: "integer", minimum: 0, maximum: 2 },
    offset: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1, maximum: MAX_PAGE },
    drum_mapping: {
      type: "object", additionalProperties: false, required: ["label", "roles"],
      properties: {
        label: { type: "string", minLength: 1, maxLength: 120 },
        roles: { type: "object", minProperties: 1, maxProperties: 15,
          additionalProperties: { type: "integer", minimum: 0, maximum: 127 } },
      },
    },
  },
};

class MusicalEngines {
  constructor() { this.proposals = new Map(); this.bytes = 0; }

  listTools() {
    return [
      { name: NAMES[0], inputSchema: chordarium.inputSchema,
        description: "Compose a deterministic local Chordarium phrase, bassline, arpeggio or pad. Tonal engine only, no Scaler catalogs. Returns a proposal receipt, not Live changes or audio. Reuse the same seed/config for correlated parts. Read exact notes with tembro_proposal_notes; never invent their contents." },
      { name: NAMES[1], inputSchema: rudiment.inputSchema,
        description: "Compose a deterministic local Rudiment drum arrangement using semantic drum roles. Returns a proposal receipt, not Live changes or audio. No MIDI pitches are guessed. Read exact notes with tembro_proposal_notes and supply a complete mapping from the chosen kit before using MIDI notes." },
      { name: NAMES[2], inputSchema: ensembleSchema,
        description: "Compose together: Chordarium chords and a bassline derived from those chords, plus Rudiment drums over the same 8 or 16 bars in 4/4. Tempo is context only, never changes Live. The rhythm engine shares duration/seed, not harmonic inference. Returns three local proposal tracks. Review them and fetch exact notes before any separately authorized Live operation." },
      { name: NAMES[3], inputSchema: NOTES_SCHEMA,
        description: "Read up to 128 exact notes of a retained local proposal. Track is zero-based; use next_offset until null. Returns semantic notes and MIDI notes only when pitched or explicitly mapped. A supplied drum map is not verified Live state: inspect the actual target kit. Application requires normal current-Set checks, fresh signatures and note readback. Never claim these generated notes were applied or heard." },
    ];
  }

  callTool(name, args) {
    if (name === NAMES[3]) return this.readNotes(args);
    let proposal;
    if (name === NAMES[0]) proposal = this.single(chordarium.compose(args));
    else if (name === NAMES[1]) proposal = this.single(rudiment.compose(args));
    else if (name === NAMES[2]) proposal = this.ensemble(args);
    else throw new Error("unknown local musical tool");
    return this.retain(proposal);
  }

  single(material) {
    return { schema: SCHEMA, kind: material.kind, duration_beats: material.duration_beats,
      time_signature: material.time_signature, tracks: [{ role: material.kind, material: validateMaterial(material) }] };
  }

  ensemble(args) {
    strictObject(args, ensembleSchema.required, ["genre"]);
    if (![8, 16].includes(args.bars) || !Number.isInteger(args.seed) || args.seed < 1 || args.seed > 4294967295) {
      throw new Error("ensemble requires 8 or 16 bars and a uint32 nonzero seed");
    }
    const config = { seed: args.seed, key: args.key, mode: args.mode, bpm: args.bpm, bars: args.bars };
    if (args.genre !== undefined) config.genre = args.genre;
    const chords = validateMaterial(chordarium.compose({ ...config, section: "phrase" }));
    const bass = validateMaterial(chordarium.compose({ ...config, section: "bassline" }));
    const drums = validateMaterial(rudiment.compose({ seed: args.seed, bars: args.bars, style: args.drum_style,
      density: args.density, syncopation: args.syncopation, kit: args.kit }));
    const materials = [chords, bass, drums];
    if (materials.some((item) => item.duration_beats !== args.bars * 4)) throw new Error("engine durations disagree");
    return { schema: SCHEMA, kind: "ensemble", duration_beats: args.bars * 4,
      time_signature: { numerator: 4, denominator: 4 },
      shared_context: { bpm: args.bpm, bars: args.bars, seed: args.seed, key: args.key, mode: args.mode },
      relationships: [{ from: 0, to: 1, kind: "derived_from_same_chordarium_phrase" },
        { from: 0, to: 2, kind: "shared_duration_and_seed" }],
      tracks: materials.map((material, index) => ({ role: ["chords", "bass", "drums"][index], material })) };
  }

  retain(proposal) {
    const serialized = canonical(proposal);
    const id = createHash("sha256").update(serialized).digest("hex");
    const bytes = Buffer.byteLength(serialized);
    if (bytes > MAX_STORE_BYTES / 2) throw new Error("proposal exceeds local storage limit");
    if (!this.proposals.has(id)) {
      while (this.proposals.size >= MAX_PROPOSALS || this.bytes + bytes > MAX_STORE_BYTES) {
        const oldest = this.proposals.keys().next().value;
        this.bytes -= this.proposals.get(oldest).bytes;
        this.proposals.delete(oldest);
      }
      this.proposals.set(id, { serialized, bytes }); this.bytes += bytes;
    }
    return { schema: SCHEMA, proposal_id: id, state: "generated", applied_to_live: false,
      retention: "local device session; oldest proposals expire", kind: proposal.kind,
      time_signature: proposal.time_signature, duration_beats: proposal.duration_beats,
      ...(proposal.shared_context ? { shared_context: proposal.shared_context, relationships: proposal.relationships } : {}),
      tracks: proposal.tracks.map(({ role, material }, index) => ({ track: index, role,
        engine: material.engine, note_count: material.notes.length, duration_beats: material.duration_beats,
        content_end_beats: material.content_end_beats, mapping: material.mapping,
        harmony: material.harmony.slice(0, 16), harmony_count: material.harmony.length })) };
  }

  readNotes(args) {
    strictObject(args, NOTES_SCHEMA.required, ["drum_mapping"]);
    if (typeof args.proposal_id !== "string" || !/^[a-f0-9]{64}$/.test(args.proposal_id) ||
        !Number.isInteger(args.track) || args.track < 0 || args.track > 2 ||
        !Number.isInteger(args.offset) || args.offset < 0 ||
        !Number.isInteger(args.limit) || args.limit < 1 || args.limit > MAX_PAGE) throw new Error("invalid proposal page");
    const stored = this.proposals.get(args.proposal_id);
    if (!stored) throw new Error("proposal is unavailable or expired; regenerate with its original config");
    const track = JSON.parse(stored.serialized).tracks[args.track];
    if (!track) throw new Error("proposal track does not exist");
    const material = track.material;
    if (args.offset > material.notes.length) throw new Error("offset exceeds note count");
    let mapping = null;
    if (args.drum_mapping !== undefined) {
      if (material.engine.id !== "rudiment") throw new Error("drum mapping cannot change pitched material");
      strictObject(args.drum_mapping, ["label", "roles"]);
      const { label, roles } = args.drum_mapping;
      const required = [...new Set(material.notes.map((note) => note.role))].sort();
      strictObject(roles, required);
      if (typeof label !== "string" || !label.trim() || label.length > 120 ||
          Object.values(roles).some((pitch) => !Number.isInteger(pitch) || pitch < 0 || pitch > 127)) throw new Error("invalid explicit drum mapping");
      mapping = { state: "supplied", label, roles, verified_in_live: false, sha256: digest(args.drum_mapping) };
    }
    const notes = material.notes.slice(args.offset, args.offset + args.limit);
    const resolved = material.engine.id === "chordarium" || mapping !== null;
    const midi = resolved ? notes.map((note) => ({ pitch: mapping ? mapping.roles[note.role] : note.pitch,
      start_time: note.start_beats, duration: note.duration_beats, velocity: note.velocity, mute: false })) : null;
    return { proposal_id: args.proposal_id, track: args.track, applied_to_live: false,
      offset: args.offset, total_notes: material.notes.length,
      next_offset: args.offset + notes.length < material.notes.length ? args.offset + notes.length : null,
      duration_beats: material.duration_beats, content_end_beats: material.content_end_beats,
      mapping: mapping || material.mapping, notes, midi_notes: midi };
  }
}

module.exports = { MusicalEngines, NAMES, SCHEMA, MAX_PAGE, MAX_PROPOSALS, canonical, digest, validateMaterial };
