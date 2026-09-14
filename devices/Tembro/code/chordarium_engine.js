"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const pin = require("./engines/chordarium/pin.js");
const { runEngine } = require("./engines/chordarium/runtime.js");

function freeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

const keys = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const genres = ["Power Piano House", "Classic House", "90s Piano House", "Chicago House", "Deep House",
  "Soulful House", "Gospel House", "Disco House", "NY / NJ Garage", "UK Garage Piano", "Latin Piano House"];
const sections = { phrase: "phrase", bassline: "bassline", arpeggio: "arp", pad: "pad" };
const inputSchema = freeze({
  type: "object",
  additionalProperties: false,
  required: ["seed", "key", "mode", "bpm", "bars"],
  properties: {
    seed: { type: "integer", minimum: 0, maximum: 4294967295 },
    key: { type: "string", enum: keys },
    mode: { type: "string", enum: ["Major", "Minor"] },
    bpm: { type: "number", minimum: 90, maximum: 145 },
    bars: { type: "integer", enum: [2, 4, 6, 8, 16] },
    genre: { type: "string", enum: genres, default: "Power Piano House" },
    section: { type: "string", enum: Object.keys(sections), default: "phrase" },
  },
});

const capabilities = freeze({
  id: "chordarium",
  version: "23",
  source_revision: pin.source_revision,
  bundle_sha256: pin.bundle_sha256,
  sections: Object.keys(sections),
  genres,
  time_signatures: [{ numerator: 4, denominator: 4 }],
  bpm: { minimum: 90, maximum: 145 },
  bars: [2, 4, 6, 8, 16],
  deterministic: true,
  source_ppq: 480,
  max_notes: 8192,
  embedded_catalogs: false,
  mapping: { state: "pitched" },
});

function validateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError("Chordarium input must be a plain JSON object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const name of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[name];
    if (typeof name !== "string" || !Object.hasOwn(inputSchema.properties, name)) {
      throw new TypeError(`Unknown Chordarium input field: ${String(name)}`);
    }
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`Chordarium input ${name} must be a JSON value`);
    }
  }
  for (const name of inputSchema.required) {
    if (!Object.hasOwn(descriptors, name)) throw new TypeError(`Missing Chordarium input: ${name}`);
  }
  for (const [name, descriptor] of Object.entries(descriptors)) {
    const value = descriptor.value, rule = inputSchema.properties[name];
    const validType = rule.type === "integer" ? Number.isInteger(value) :
      rule.type === "number" ? typeof value === "number" && Number.isFinite(value) : typeof value === "string";
    if (!validType || (rule.enum && !rule.enum.includes(value)) ||
        (rule.minimum !== undefined && value < rule.minimum) ||
        (rule.maximum !== undefined && value > rule.maximum)) {
      throw new TypeError(`Invalid Chordarium input: ${name}`);
    }
  }
  return Object.fromEntries(Object.entries(descriptors).map(([name, descriptor]) => [name, descriptor.value]));
}

function verifiedBundle() {
  const directory = path.join(__dirname, "engines/chordarium");
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
  if (!manifest || Object.keys(manifest).length !== Object.keys(pin).length ||
      Object.entries(pin).some(([name, value]) => manifest[name] !== value)) {
    throw new Error("Chordarium manifest does not match the approved engine pin");
  }
  const bundle = fs.readFileSync(path.join(directory, pin.bundle_file));
  const hash = crypto.createHash("sha256").update(bundle).digest("hex");
  if (hash !== pin.bundle_sha256) throw new Error("Chordarium engine bundle SHA-256 mismatch");
  return bundle.toString("utf8");
}

function compose(input) {
  const requested = validateInput(input);
  const section = requested.section || "phrase";
  const config = {
    seed: requested.seed, key: requested.key, mode: requested.mode,
    bpm: requested.bpm, length: requested.bars,
    genre: requested.genre || "Power Piano House", progressionSource: "engine",
  };
  const result = runEngine(verifiedBundle(), { config, section: sections[section] });
  const duration = requested.bars * 4;
  if (!Array.isArray(result.events) || !result.events.length || result.events.length > 8192) {
    throw new Error("Chordarium returned an invalid number of notes");
  }
  const notes = result.events.map((event) => {
    if (!Number.isInteger(event.note) || event.note < 0 || event.note > 127 ||
        !Number.isInteger(event.velocity) || event.velocity < 1 || event.velocity > 127 ||
        !Number.isFinite(event.startTick) || !Number.isFinite(event.endTick) ||
        event.startTick < 0 || event.endTick <= event.startTick || event.endTick > duration * 480 ||
        typeof event.role !== "string" || !event.role) {
      throw new Error("Chordarium returned an invalid MIDI note");
    }
    return { pitch: event.note, role: event.role, start_beats: event.startTick / 480,
      duration_beats: (event.endTick - event.startTick) / 480, velocity: event.velocity };
  });
  if (!Array.isArray(result.harmony)) throw new Error("Chordarium returned invalid harmony");
  const harmony = result.harmony.map((event) => {
    if (!Number.isFinite(event.onsetBeat) || event.onsetBeat < 0 ||
        !Number.isFinite(event.durationBeats) || event.durationBeats <= 0 ||
        event.onsetBeat + event.durationBeats > duration) {
      throw new Error("Chordarium returned invalid harmony timing");
    }
    const chord = { start_beats: event.onsetBeat, duration_beats: event.durationBeats };
    for (const [source, target] of [["rootPc", "root_pc"], ["bassPc", "bass_pc"],
      ["quality", "quality"], ["pcs", "pitch_classes"], ["label", "label"], ["function", "function"]]) {
      if (event[source] !== undefined) chord[target] = event[source];
    }
    return chord;
  });
  return {
    kind: section,
    engine: { id: "chordarium", version: "23", source_revision: pin.source_revision, bundle_sha256: pin.bundle_sha256 },
    time_signature: { numerator: 4, denominator: 4 },
    duration_beats: duration,
    content_end_beats: Math.max(...notes.map((note) => note.start_beats + note.duration_beats)),
    notes,
    harmony,
    sections: [{ kind: section, start_beats: 0, duration_beats: duration }],
    mapping: { state: "pitched" },
    provenance: { requested_config: requested, resolved_config: result.config, source_ppq: 480 },
  };
}

module.exports = { compose, inputSchema, capabilities };
