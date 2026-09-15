"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const adapter = require("../code/rudiment_engine");
const builder = require("../../../tools/build_rudiment_engine");
const parity = require("./fixtures/rudiment-golden-parity.json");
const runtimeDir = path.resolve(__dirname, "../code/engines/rudiment");
const bundle = fs.readFileSync(path.join(runtimeDir, "engine.bundle.js"));
const bundleScript = new vm.Script(bundle.toString("utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(runtimeDir, "manifest.json"), "utf8"));
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const allKit = Object.fromEntries(["kick", "snare", "clap", "hats", "shaker", "perc", "toms", "cymbals"].map((role) => [role, true]));
const config = (overrides = {}) => ({ style: "Tech House", seed: 4242, bars: 8, density: 60, syncopation: 40, kit: { ...allKit }, ...overrides });

// This is the original harness contract: merge kit overrides, replace other
// config fields and hash the full unmodified engine result. No adapter involved.
const generateOriginal = new vm.Script(`(() => {
  const { kit, ...rest } = JSON.parse(__overrides);
  Object.assign(cfg, rest);
  if (kit) Object.assign(cfg.kit, kit);
  return JSON.stringify(generate());
})()`);
function originalJSON(overrides) {
  const context = vm.createContext({ __overrides: JSON.stringify(overrides) }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext("Math.random = () => { throw new Error('Unseeded randomness'); }; Date = new Proxy(function(){}, {construct(){throw new Error('Clock')}, apply(){throw new Error('Clock')}, get(){throw new Error('Clock')}});", context, { timeout: 1000 });
  bundleScript.runInContext(context, { timeout: 1000 });
  return generateOriginal.runInContext(context, { timeout: 2000 });
}
function originalFor(request) {
  return JSON.parse(originalJSON({ style: request.style, seed: request.seed, length: request.bars, density: request.density, syncopation: request.syncopation, kit: request.kit }));
}
function expectedNotes(events) {
  return events.map((event, index) => ({ role: event.role, start_beats: event.tick / 480, duration_beats: event.duration / 480, velocity: event.velocity, index }))
    .sort((a, b) => a.start_beats - b.start_beats || (a.role < b.role ? -1 : a.role > b.role ? 1 : 0) || a.index - b.index)
    .map(({ index, ...note }) => note);
}
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tembro-rudiment-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function copyRuntime(dir) {
  fs.mkdirSync(path.join(dir, "engines/rudiment"), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, "../code/rudiment_engine.js"), path.join(dir, "rudiment_engine.js"));
  for (const name of ["engine.bundle.js", "manifest.json"]) fs.copyFileSync(path.join(runtimeDir, name), path.join(dir, "engines/rudiment", name));
  return path.join(dir, "rudiment_engine.js");
}

test("checked-in bundle is the canonical composition of six independently pinned source blobs", () => {
  assert.deepEqual(builder.verify(), manifest);
  assert.equal(digest(bundle), adapter.capabilities.bundle_sha256);
  assert.equal(manifest.source_revision, parity.source_revision);
  assert.equal(manifest.sources.length, 6);
  assert.equal(manifest.declared_license, "UNLICENSED");
  assert.equal(manifest.version, "0.1.1");
  assert.equal(manifest.baseline_source_revision, "e9fafb8d970f40fc8c3fd7147d6f550278aa9206");
  assert.equal(manifest.source_change, "seeded-fisher-yates-v1");
  assert.deepEqual(fs.readdirSync(runtimeDir).sort(), ["engine.bundle.js", "manifest.json"]);
});

for (const golden of parity.cases) {
  test("upstream golden parity: " + golden.name, () => {
    assert.equal(digest(originalJSON(golden.config)), golden.result_sha256);
  });
}

test("public API and schema expose only the finite configuration surface", () => {
  assert.deepEqual(Object.keys(adapter).sort(), ["capabilities", "compose", "inputSchema"]);
  assert.deepEqual(adapter.inputSchema.required, ["style", "seed", "bars", "density", "syncopation", "kit"]);
  assert.equal(adapter.inputSchema.additionalProperties, false);
  assert.equal(adapter.inputSchema.properties.style.enum.length, 10);
  assert.equal(adapter.capabilities.live_writes, false);
  assert.equal(adapter.capabilities.requires_explicit_mapping, true);
  assert.ok(Object.isFrozen(adapter.inputSchema.properties.kit.properties));
  assert.ok(Object.isFrozen(adapter.capabilities.limits));
});

test("adapter preserves every semantic event in the public styles", () => {
  for (const style of adapter.inputSchema.properties.style.enum) {
    const request = config({ style, bars: 32 });
    const original = originalFor(request), proposal = adapter.compose(request);
    assert.deepEqual(proposal.notes, expectedNotes(original.semanticEvents), style);
    assert.deepEqual(proposal.sections, original.sections.map((section) => ({ name: section.name, kind: section.kind, start_beats: section.start * 4, duration_beats: section.bars * 4 })), style);
    assert.deepEqual(proposal, JSON.parse(JSON.stringify(proposal)));
    assert.deepEqual(Object.keys(proposal).sort(), ["content_end_beats", "duration_beats", "engine", "harmony", "kind", "mapping", "notes", "provenance", "sections", "time_signature"]);
  }
});

test("same request is deterministic across other calls and property insertion order", () => {
  const request = config();
  const first = adapter.compose(request);
  adapter.compose(config({ style: "Breakbeat", seed: 4294967295, bars: 16, density: 0, syncopation: 100 }));
  const reordered = Object.fromEntries(Object.entries(request).reverse());
  reordered.kit = Object.fromEntries(Object.entries(request.kit).reverse());
  assert.deepEqual(adapter.compose(reordered), first);
  assert.notDeepEqual(adapter.compose(config({ seed: 4243 })).notes, first.notes);
});

test("caller data stays untouched and resolved defaults document the real engine choices", () => {
  const request = config();
  const before = JSON.stringify(request);
  Object.freeze(request.kit); Object.freeze(request);
  const proposal = adapter.compose(request);
  assert.equal(JSON.stringify(request), before);
  assert.notEqual(proposal.provenance.requested_config, request);
  assert.deepEqual(proposal.provenance.requested_config, request);
  assert.equal(proposal.provenance.resolved_config.length, 8);
  assert.equal(proposal.provenance.resolved_config.swing, 30);
  assert.equal(proposal.provenance.resolved_config.creativity, 60);
  assert.equal(proposal.provenance.source_ppq, 480);
  assert.deepEqual(proposal.time_signature, { numerator: 4, denominator: 4 });
  assert.equal(proposal.duration_beats, 32);
});

test("semantic roles stay unresolved and hats-only requests do not invent a MIDI map", () => {
  const request = config({ kit: Object.fromEntries(Object.keys(allKit).map((key) => [key, key === "hats"])) });
  const proposal = adapter.compose(request);
  assert.deepEqual(proposal.mapping, { state: "unresolved", required_roles: ["closedHat", "openHat"] });
  assert.equal(proposal.notes.length, 60);
  assert.ok(proposal.notes.every((note) => !Object.hasOwn(note, "pitch") && Object.keys(note).length === 4));
  assert.deepEqual(proposal.harmony, []);
});

test("sustained final crash keeps its original tail beyond nominal arrangement length", () => {
  const request = config({ bars: 32 });
  const proposal = adapter.compose(request);
  assert.equal(proposal.notes.length, 723);
  assert.equal(proposal.duration_beats, 128);
  assert.equal(proposal.content_end_beats, 128.2);
  assert.ok(proposal.notes.some((note) => note.role === "crash" && note.start_beats === 127.5 && note.duration_beats === 0.7));
  assert.deepEqual(proposal.notes, expectedNotes(originalFor(request).semanticEvents));
});

test("supported duration and configuration boundaries produce bounded real proposals", () => {
  for (const bars of adapter.inputSchema.properties.bars.enum) {
    const proposal = adapter.compose(config({ bars, style: "Hardgroove", seed: 1, density: 100, syncopation: 100 }));
    assert.equal(proposal.duration_beats, bars * 4);
    assert.ok(proposal.notes.length > 0 && proposal.notes.length < adapter.capabilities.limits.max_events);
    assert.ok(proposal.notes.every((note) => note.start_beats >= 0 && note.duration_beats > 0 && Number.isInteger(note.velocity) && note.velocity >= 1 && note.velocity <= 127));
  }
});

test("strict input validation rejects coercion, unsupported fields and inactive kits", () => {
  const cases = [null, [], "{}", {}, config({ style: "house" }), config({ style: "House; process.exit()" }),
    config({ seed: 0 }), config({ seed: -1 }), config({ seed: 1.5 }), config({ seed: 4294967296 }), config({ seed: "1" }),
    config({ bars: 12 }), config({ bars: "8" }), config({ density: -1 }), config({ density: 101 }), config({ density: 0.1 }),
    config({ density: NaN }), config({ syncopation: Infinity }), config({ syncopation: "40" }),
    config({ code: "generate()" }), config({ source_root: "/tmp/arbitrary-engine" }), config({ kit: null }),
    config({ kit: { ...allKit, kick: 1 } }), config({ kit: { ...allKit, bass: true } }),
    config({ kit: Object.fromEntries(Object.keys(allKit).map((key) => [key, false])) })];
  for (const key of Object.keys(config())) { const missing = config(); delete missing[key]; cases.push(missing); }
  for (const key of Object.keys(allKit)) { const missing = config(); delete missing.kit[key]; cases.push(missing); }
  for (const value of cases) assert.throws(() => adapter.compose(value), /^Error: Rudiment:/);
});

test("configuration accessors and non-JSON prototypes are rejected before invoking getters", () => {
  let calls = 0;
  const accessor = config();
  Object.defineProperty(accessor, "seed", { enumerable: true, get() { calls++; return 1; } });
  assert.throws(() => adapter.compose(accessor), /plain JSON data/);
  const inherited = Object.assign(Object.create({ hidden: true }), config());
  assert.throws(() => adapter.compose(inherited), /plain JSON object/);
  const symbolic = config(); symbolic[Symbol("hidden")] = true;
  assert.throws(() => adapter.compose(symbolic), /unexpected fields/);
  const kitGetter = config();
  Object.defineProperty(kitGetter.kit, "kick", { enumerable: true, get() { calls++; return true; } });
  assert.throws(() => adapter.compose(kitGetter), /plain JSON data/);
  assert.equal(calls, 0);
});

test("changed bundle is rejected before any changed engine code runs", (t) => {
  const dir = temporary(t), entry = copyRuntime(dir);
  fs.appendFileSync(path.join(dir, "engines/rudiment/engine.bundle.js"), "\nthrow new Error('Changed engine ran');\n");
  assert.throws(() => require(entry).compose(config()), /pinned engine artifact verification failed/);
});

test("changing both bundle and its manifest cannot replace the compiled trusted pin", (t) => {
  const dir = temporary(t), entry = copyRuntime(dir);
  const bundlePath = path.join(dir, "engines/rudiment/engine.bundle.js");
  fs.appendFileSync(bundlePath, "\n// altered\n");
  const changed = { ...manifest, bundle_sha256: digest(fs.readFileSync(bundlePath)) };
  fs.writeFileSync(path.join(dir, "engines/rudiment/manifest.json"), JSON.stringify(changed, null, 2) + "\n");
  assert.throws(() => require(entry).compose(config()), /pinned engine artifact verification failed/);
});

test("manifest-only tampering is rejected even if the bundle remains intact", (t) => {
  const dir = temporary(t), entry = copyRuntime(dir);
  fs.appendFileSync(path.join(dir, "engines/rudiment/manifest.json"), " ");
  assert.throws(() => require(entry).compose(config()), /pinned engine artifact verification failed/);
});

test("generator reproduces the bundle and fails before writing on source drift", (t) => {
  const dir = temporary(t), sourceRoot = path.join(dir, "source"), outputDir = path.join(dir, "output");
  for (const source of manifest.sources) {
    const file = path.join(sourceRoot, source.path);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bundle.subarray(source.offset_bytes, source.offset_bytes + source.size_bytes));
  }
  assert.deepEqual(builder.build({ sourceRoot, outputDir }), manifest);
  assert.deepEqual(builder.verify(outputDir), manifest);
  assert.deepEqual(fs.readdirSync(outputDir).sort(), ["engine.bundle.js", "manifest.json"]);
  assert.deepEqual(builder.build({ sourceRoot, outputDir, check: true }), manifest);
  fs.appendFileSync(path.join(sourceRoot, manifest.sources[0].path), "\n// drift\n");
  assert.throws(() => builder.build({ sourceRoot, outputDir: path.join(dir, "must-not-exist") }), /pinned source mismatch/);
  assert.equal(fs.existsSync(path.join(dir, "must-not-exist")), false);
});

test("stale bundle composition and altered manifest are caught by the source-free build check", (t) => {
  const dir = temporary(t); copyRuntime(dir);
  const outputDir = path.join(dir, "engines/rudiment");
  fs.appendFileSync(path.join(outputDir, "engine.bundle.js"), "\n// extra code\n");
  assert.throws(() => builder.verify(outputDir), /canonical pinned source/);
  fs.writeFileSync(path.join(outputDir, "engine.bundle.js"), bundle);
  fs.appendFileSync(path.join(outputDir, "manifest.json"), "\n");
  assert.throws(() => builder.verify(outputDir), /manifest does not match/);
});

test("optional original checkout reproduces both runtime and upstream parity fixture", { skip: !process.env.TEMBRO_RUDIMENT_SOURCE_ROOT }, () => {
  assert.deepEqual(builder.build({ sourceRoot: process.env.TEMBRO_RUDIMENT_SOURCE_ROOT, fixtureOutput: builder.DEFAULT_FIXTURE, check: true }), manifest);
});
