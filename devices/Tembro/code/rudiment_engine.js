"use strict";

// Trusted pinned composition code only. This adapter has no Live client and
// never maps a semantic drum role to an assumed MIDI pitch.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const REVISION = "e9fafb8d970f40fc8c3fd7147d6f550278aa9206";
const VERSION = "0.1.0";
const BUNDLE_SHA256 = "57b6ee87717eab58c51d68036697be454c28c76a7edd22d78a6896729112a387";
const MANIFEST_SHA256 = "be32eeec733a0378bd438c5211e34bfd7e7213d323c0c490924c9734a6960210";
const ENGINE_DIR = path.join(__dirname, "engines", "rudiment");
const STYLES = ["Tech House", "Minimal / Deep Tech", "House", "Disco House", "Techno", "Hypnotic Techno", "Hardgroove", "Melodic Techno", "Electro", "Breakbeat"];
const BARS = [8, 16, 32, 64, 96, 128];
const KIT_KEYS = ["kick", "snare", "clap", "hats", "shaker", "perc", "toms", "cymbals"];
const CONFIG_KEYS = ["style", "seed", "bars", "density", "syncopation", "kit"];
const ROLES = ["kick", "snare", "clap", "rim", "closedHat", "openHat", "ride", "crash", "tomLow", "tomMid", "tomHigh", "percLow", "percMid", "percHigh", "shaker"];
const SECTION_KINDS = ["intro", "soft", "main", "breakdown", "build", "drop", "outro"];
const MAX_EVENTS = 8192;
const INIT_TIMEOUT_MS = 1000;
const GENERATE_TIMEOUT_MS = 2000;

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const inputSchema = freeze({
  type: "object", additionalProperties: false, required: CONFIG_KEYS.slice(),
  properties: {
    style: { type: "string", enum: STYLES.slice() },
    seed: { type: "integer", minimum: 1, maximum: 4294967295 },
    bars: { type: "integer", enum: BARS.slice() },
    density: { type: "integer", minimum: 0, maximum: 100 },
    syncopation: { type: "integer", minimum: 0, maximum: 100 },
    kit: {
      type: "object", additionalProperties: false, required: KIT_KEYS.slice(),
      properties: Object.fromEntries(KIT_KEYS.map((key) => [key, { type: "boolean" }])),
      anyOf: KIT_KEYS.map((key) => ({ properties: { [key]: { const: true } }, required: [key] })),
    },
  },
});

const capabilities = freeze({
  id: "rudiment", version: VERSION, source_revision: REVISION, bundle_sha256: BUNDLE_SHA256,
  operations: ["compose"], kind: "drum_arrangement", deterministic: true,
  timing_unit: "beats", semantic_drums: true, requires_explicit_mapping: true,
  live_writes: false, minimum_node_major: 18,
  limits: { max_events: MAX_EVENTS, initialization_timeout_ms: INIT_TIMEOUT_MS, generation_timeout_ms: GENERATE_TIMEOUT_MS },
});

function requireValue(condition, message) {
  if (!condition) throw new Error("Rudiment: " + message);
}

function exactObject(value, keys, label) {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), label + " must be an object");
  const prototype = Object.getPrototypeOf(value);
  requireValue(prototype === Object.prototype || prototype === null, label + " must be a plain JSON object");
  const names = Object.getOwnPropertyNames(value);
  requireValue(Object.getOwnPropertySymbols(value).length === 0 && names.length === keys.length && names.every((key) => keys.includes(key)), label + " has missing or unexpected fields");
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    requireValue(descriptor.enumerable && Object.hasOwn(descriptor, "value"), label + " must contain plain JSON data");
  }
}

function validateInput(config) {
  exactObject(config, CONFIG_KEYS, "config");
  requireValue(STYLES.includes(config.style), "unsupported style");
  requireValue(Number.isInteger(config.seed) && config.seed >= 1 && config.seed <= 4294967295, "seed must be an integer from 1 to 4294967295");
  requireValue(Number.isInteger(config.bars) && BARS.includes(config.bars), "bars must be 8, 16, 32, 64, 96 or 128");
  for (const field of ["density", "syncopation"]) {
    requireValue(Number.isInteger(config[field]) && config[field] >= 0 && config[field] <= 100, field + " must be an integer from 0 to 100");
  }
  exactObject(config.kit, KIT_KEYS, "kit");
  requireValue(KIT_KEYS.every((key) => typeof config.kit[key] === "boolean"), "kit values must be booleans");
  requireValue(KIT_KEYS.some((key) => config.kit[key]), "enable at least one kit family");
  // Fixed key order makes provenance independent of object insertion order.
  return { style: config.style, seed: config.seed, bars: config.bars, density: config.density,
    syncopation: config.syncopation, kit: Object.fromEntries(KIT_KEYS.map((key) => [key, config.kit[key]])) };
}

let engineScript;
function verifiedScript() {
  if (engineScript) return engineScript;
  requireValue(Number(process.versions.node.split(".")[0]) >= 18, "Node 18 or newer is required");
  const bundle = fs.readFileSync(path.join(ENGINE_DIR, "engine.bundle.js"));
  const manifestBytes = fs.readFileSync(path.join(ENGINE_DIR, "manifest.json"));
  const digest = (data) => crypto.createHash("sha256").update(data).digest("hex");
  requireValue(digest(bundle) === BUNDLE_SHA256 && digest(manifestBytes) === MANIFEST_SHA256, "pinned engine artifact verification failed");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  requireValue(manifest.engine === "rudiment" && manifest.source_revision === REVISION && manifest.version === VERSION && manifest.bundle_sha256 === BUNDLE_SHA256, "unsupported engine manifest");
  engineScript = new vm.Script(bundle.toString("utf8"), { filename: "rudiment@" + REVISION + "/engine.bundle.js" });
  return engineScript;
}

const initializeScript = new vm.Script(`
  Math.random = function () { throw new Error("Unseeded randomness is unavailable"); };
  globalThis.Date = new Proxy(function () {}, {
    construct() { throw new Error("Clock access is unavailable"); },
    apply() { throw new Error("Clock access is unavailable"); },
    get() { throw new Error("Clock access is unavailable"); }
  });
`, { filename: "rudiment-adapter-initialize.js" });

// Configuration enters the context as JSON data. Neither user text nor musical
// output is interpolated into code. Each composition receives fresh cfg state.
const generateScript = new vm.Script(`
  (() => {
    const request = JSON.parse(__tembro_config_json);
    cfg.style = request.style;
    cfg.seed = request.seed;
    cfg.length = request.bars;
    cfg.density = request.density;
    cfg.syncopation = request.syncopation;
    cfg.kit = request.kit;
    const generated = generate();
    if (!Array.isArray(generated.semanticEvents) || generated.semanticEvents.length > 8192) {
      throw new Error("Generated event limit exceeded");
    }
    return JSON.stringify({
      totalBars: generated.totalBars, events: generated.semanticEvents,
      sections: generated.sections, resolved_config: cfg, ppq: PPQ
    });
  })()
`, { filename: "rudiment-adapter-compose.js" });

function normalize(result, config) {
  requireValue(result.ppq === 480 && result.totalBars === config.bars, "engine timing contract changed");
  requireValue(Array.isArray(result.events) && result.events.length > 0 && result.events.length <= MAX_EVENTS, "engine produced an empty or oversized proposal");
  const notes = result.events.map((event, index) => {
    requireValue(event && ROLES.includes(event.role), "unknown semantic drum role");
    requireValue(Number.isFinite(event.tick) && event.tick >= 0 && Number.isFinite(event.duration) && event.duration > 0, "invalid note timing");
    requireValue(Number.isInteger(event.velocity) && event.velocity >= 1 && event.velocity <= 127, "invalid note velocity");
    return { role: event.role, start_beats: event.tick / 480, duration_beats: event.duration / 480, velocity: event.velocity, index };
  }).sort((left, right) => left.start_beats - right.start_beats || (left.role < right.role ? -1 : left.role > right.role ? 1 : 0) || left.index - right.index)
    .map(({ index, ...note }) => note);
  requireValue(Array.isArray(result.sections) && result.sections.length > 0 && result.sections.length <= 32, "invalid arrangement sections");
  let nextStart = 0;
  const sections = result.sections.map((section) => {
    requireValue(section && typeof section.name === "string" && section.name.length > 0 && section.name.length <= 64 && SECTION_KINDS.includes(section.kind), "invalid section description");
    requireValue(Number.isInteger(section.start) && section.start === nextStart && Number.isInteger(section.bars) && section.bars > 0, "invalid section boundaries");
    nextStart += section.bars;
    return { name: section.name, kind: section.kind, start_beats: section.start * 4, duration_beats: section.bars * 4 };
  });
  requireValue(nextStart === config.bars, "section lengths do not match the requested bars");
  return {
    kind: "drum_arrangement",
    engine: { id: "rudiment", version: VERSION, source_revision: REVISION, bundle_sha256: BUNDLE_SHA256 },
    time_signature: { numerator: 4, denominator: 4 },
    duration_beats: config.bars * 4,
    content_end_beats: notes.reduce((end, note) => Math.max(end, note.start_beats + note.duration_beats), 0),
    notes, sections, harmony: [],
    mapping: { state: "unresolved", required_roles: [...new Set(notes.map((note) => note.role))].sort() },
    provenance: { requested_config: config, resolved_config: result.resolved_config, source_ppq: 480 },
  };
}

function compose(config) {
  const request = validateInput(config);
  const script = verifiedScript();
  const context = vm.createContext(Object.assign(Object.create(null), { __tembro_config_json: JSON.stringify(request) }), {
    name: "rudiment-composition", codeGeneration: { strings: false, wasm: false }, microtaskMode: "afterEvaluate",
  });
  initializeScript.runInContext(context, { timeout: INIT_TIMEOUT_MS });
  script.runInContext(context, { timeout: INIT_TIMEOUT_MS });
  const serialized = generateScript.runInContext(context, { timeout: GENERATE_TIMEOUT_MS });
  requireValue(typeof serialized === "string" && serialized.length <= 4 * 1024 * 1024, "engine response exceeds size limit");
  return normalize(JSON.parse(serialized), request);
}

module.exports = { compose, inputSchema, capabilities };
