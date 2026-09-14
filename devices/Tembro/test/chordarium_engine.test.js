"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { compose, inputSchema, capabilities } = require("../code/chordarium_engine.js");
const pin = require("../code/engines/chordarium/pin.js");
const { runEngine } = require("../code/engines/chordarium/runtime.js");
const builder = require("../../../tools/build_chordarium_engine.js");

const engineDir = path.resolve(__dirname, "../code/engines/chordarium");
const bundle = fs.readFileSync(path.join(engineDir, pin.bundle_file), "utf8");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const input = { seed: 424242, key: "C", mode: "Minor", bpm: 120, bars: 4 };
const siblingRoot = path.resolve(__dirname, "../../../../chordarium");
const sourceRoot = process.env.CHORDARIUM_SOURCE_ROOT ||
  (fs.existsSync(path.join(siblingRoot, "src/index.html")) ? siblingRoot : null);

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tembro-chordarium-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("generated engine has the pinned bytes and excludes both Scaler catalogs", () => {
  assert.equal(sha256(bundle), pin.bundle_sha256);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(engineDir, "manifest.json"))), pin);
  assert.doesNotMatch(bundle, /const SCALER_(?:LIBRARY|CHORD_SETS)\s*=/);
  assert.doesNotMatch(bundle, /chordarium\.licenseKey|chordariumHost|requestSpend/);
  const context = vm.createContext({});
  vm.runInContext(bundle, context, { timeout: 1000 });
  assert.equal(context.HouseEngine.version, 23);
  assert.equal(context.HouseArranger.version, 6);
  assert.equal(context.HouseEngine.SCALER_SETS.length, 0);
  assert.equal(vm.runInContext("typeof SCALER_LIBRARY", context), "undefined");
  assert.equal(vm.runInContext("typeof SCALER_CHORD_SETS", context), "undefined");
  assert.deepEqual([...Object.keys(context.HouseEngine.GENRES)], capabilities.genres);
});

// Fingerprints were recorded against source revision 9551df9, with the independent
// source-equivalence test below also run. Do not update these for adapter refactors.
const fixtures = {
  phrase: [20, "68230a41150ad85617b99722ae4cc64bb0ce623c9c614af80538bc1dddf04557"],
  bassline: [32, "1b7960cc3ec8e73946638548631f45598454fcbdb1f4d6cfab57f5e6425ad191"],
  arpeggio: [80, "b19a9d034a0ba2e030a1a0ece577ac046f426f2350db1b76b605dc2e5aa1a129"],
  pad: [16, "b309518333c2688a8b7402043a37ff29225433d76dd3317bc1080301dd3b04af"],
};

for (const [section, [count, fingerprint]] of Object.entries(fixtures)) {
  test(`real ${section} output matches its musical fingerprint and timing contract`, () => {
    const result = compose({ ...input, section });
    assert.equal(result.notes.length, count);
    assert.equal(sha256(JSON.stringify({ notes: result.notes, harmony: result.harmony })), fingerprint);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    assert.equal(result.kind, section);
    assert.equal(result.engine.id, "chordarium");
    assert.equal(result.engine.source_revision, pin.source_revision);
    assert.equal(result.engine.bundle_sha256, pin.bundle_sha256);
    assert.deepEqual(result.time_signature, { numerator: 4, denominator: 4 });
    assert.equal(result.duration_beats, 16);
    assert.equal(result.provenance.source_ppq, 480);
    assert.equal(result.provenance.resolved_config.progressionSource, "engine");
    assert.equal(result.provenance.resolved_config.articulationStyle, "passages");
    assert.deepEqual(result.mapping, { state: "pitched" });
    assert.deepEqual(result.sections, [{ kind: section, start_beats: 0, duration_beats: 16 }]);
    assert.deepEqual(result.harmony.map((chord) => chord.label), ["Cm7", "Fm7/C", "Bb7", "Ebmaj7/Bb"]);
    assert(result.content_end_beats <= result.duration_beats);
    assert(Math.abs(result.content_end_beats - Math.max(...result.notes.map((note) => note.start_beats + note.duration_beats))) < 1e-10);
    for (const note of result.notes) {
      assert(Number.isInteger(note.pitch) && note.pitch >= 0 && note.pitch <= 127);
      assert(Number.isInteger(note.velocity) && note.velocity >= 1 && note.velocity <= 127);
      assert(Number.isFinite(note.start_beats) && note.start_beats >= 0);
      assert(Number.isFinite(note.duration_beats) && note.duration_beats > 0);
      assert(note.start_beats + note.duration_beats <= 16 + 1e-10);
    }
  });
}

test("seeded generation is isolated, repeatable, and records the exact request and resolved defaults", () => {
  const before = JSON.stringify(input);
  const first = compose(input);
  const expected = JSON.parse(JSON.stringify(first));
  assert.deepEqual(compose(input), expected);
  assert.notDeepEqual(compose({ ...input, seed: input.seed + 1 }).notes, first.notes);
  assert.deepEqual(compose({ ...input, genre: "Power Piano House", section: "phrase" }).notes, first.notes);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(first.provenance.requested_config, input);
  assert.equal(first.provenance.resolved_config.genre, "Power Piano House");
  first.notes[0].pitch = 0;
  first.harmony[0].pitch_classes.push(99);
  first.provenance.resolved_config.seed = 0;
  assert.deepEqual(compose(input), expected);
  assert.throws(() => inputSchema.properties.bars.enum.push(128), TypeError);
});

test("strict inputs reject coercion, catalog requests, unknown fields and non-JSON objects", () => {
  const invalid = [null, [], new Date(), "phrase", Object.create({ ...input }),
    { ...input, seed: -1 }, { ...input, seed: 4294967296 }, { ...input, seed: 2.5 },
    { ...input, seed: "42" }, { ...input, seed: undefined },
    { ...input, bpm: NaN }, { ...input, bpm: Infinity }, { ...input, bpm: 89.99 }, { ...input, bpm: 145.01 },
    { ...input, key: "Db" }, { ...input, mode: "minor" },
    { ...input, bars: 1 }, { ...input, bars: 3 }, { ...input, bars: "4" },
    { ...input, section: "arp" }, { ...input, section: null }, { ...input, genre: "Unknown" },
    { ...input, progressionSource: "scaler-all" }, { ...input, revisions: {} },
    { ...input, [Symbol("unknown")]: true },
  ];
  for (const name of inputSchema.required) {
    const missing = { ...input };
    delete missing[name];
    invalid.push(missing);
  }
  let getterCalled = false;
  invalid.push(Object.defineProperty({ ...input }, "seed", { enumerable: true, get() { getterCalled = true; return 2; } }));
  for (const request of invalid) assert.throws(() => compose(request), /Chordarium input/);
  assert.equal(getterCalled, false);
  assert.equal(compose({ ...input, seed: 0, bpm: 90, bars: 2 }).duration_beats, 8);
  assert.equal(compose({ ...input, seed: 4294967295, bpm: 145, bars: 16 }).duration_beats, 64);
});

test("runtime refuses changed bundle and forged manifests even after a successful request", (t) => {
  const directory = temporary(t);
  fs.copyFileSync(path.resolve(__dirname, "../code/chordarium_engine.js"), path.join(directory, "chordarium_engine.js"));
  fs.cpSync(engineDir, path.join(directory, "engines/chordarium"), { recursive: true });
  const copied = require(path.join(directory, "chordarium_engine.js"));
  assert.equal(copied.compose(input).notes.length, 20);
  const bundlePath = path.join(directory, "engines/chordarium", pin.bundle_file);
  const manifestPath = path.join(directory, "engines/chordarium/manifest.json");
  fs.appendFileSync(bundlePath, "\n// modified\n");
  assert.throws(() => copied.compose(input), /bundle SHA-256 mismatch/);
  fs.writeFileSync(manifestPath, JSON.stringify({ ...pin, bundle_sha256: sha256(fs.readFileSync(bundlePath)) }));
  assert.throws(() => copied.compose(input), /manifest does not match/);
  fs.writeFileSync(bundlePath, bundle);
  fs.writeFileSync(manifestPath, JSON.stringify({ ...pin, source_revision: "different" }));
  assert.throws(() => copied.compose(input), /manifest does not match/);
  fs.writeFileSync(manifestPath, JSON.stringify(pin));
  assert.equal(copied.compose(input).notes.length, 20);
});

test("both initialization and real generation execute under VM timeouts", () => {
  const request = { config: { ...input, length: input.bars, progressionSource: "engine" }, section: "phrase" };
  assert.throws(() => runEngine(bundle + "\nwhile (true) {}", request, { initializeTimeoutMs: 10 }),
    { code: "ERR_SCRIPT_EXECUTION_TIMEOUT" });
  // Fault injection into the real bundled engine exercises the generation limit.
  assert.throws(() => runEngine(bundle + "\nHouseEngine.generate = function() { while (true) {} };", request,
    { generateTimeoutMs: 10 }), { code: "ERR_SCRIPT_EXECUTION_TIMEOUT" });
});

test("builder rejects unknown source and ambiguous CLI arguments", (t) => {
  assert.throws(() => builder.extractBundle(Buffer.from("unknown source")), /pinned .* SHA-256 mismatch/);
  assert.throws(() => builder.parseArgs(["--source-root", "one", "--source-root", "two"]), /repeated option/);
  assert.throws(() => builder.parseArgs(["--unknown"]), /Unknown/);
  assert.throws(() => builder.parseArgs(["--source-root"]), /Missing value/);
  assert.throws(() => builder.build(), /source-root is required/);
  const directory = temporary(t);
  fs.mkdirSync(path.join(directory, "src"));
  fs.writeFileSync(path.join(directory, "src/index.html"), "unknown source");
  const output = path.join(directory, "output");
  assert.throws(() => builder.build({ sourceRoot: directory, outputDir: output }), /pinned .* SHA-256 mismatch/);
  assert.equal(fs.existsSync(output), false);
});

test("pinned source rebuild is deterministic and all exposed sections equal the full original engine", {
  skip: sourceRoot ? false : "Set CHORDARIUM_SOURCE_ROOT to verify against a local Chordarium checkout",
}, (t) => {
  const source = fs.readFileSync(path.join(sourceRoot, "src/index.html"), "utf8");
  assert.equal(sha256(source), pin.source_sha256, "Source checkout differs from the approved pin");
  assert.equal(builder.extractBundle(source), bundle);
  const first = temporary(t), second = temporary(t);
  builder.build({ sourceRoot, outputDir: first });
  builder.build({ sourceRoot, outputDir: second });
  builder.build({ sourceRoot, outputDir: first, check: true });
  for (const name of [pin.bundle_file, "manifest.json"]) {
    assert.deepEqual(fs.readFileSync(path.join(first, name)), fs.readFileSync(path.join(second, name)));
    assert.deepEqual(fs.readFileSync(path.join(first, name)), fs.readFileSync(path.join(engineDir, name)));
  }
  fs.appendFileSync(path.join(first, pin.bundle_file), "\n");
  assert.throws(() => builder.build({ sourceRoot, outputDir: first, check: true }), /differs/);

  const context = vm.createContext({ TextEncoder });
  vm.runInContext(source.match(/<script>([\s\S]*)<\/script>/)[1], context, { timeout: 1000 });
  const { HouseEngine, HouseArranger } = context.__ChordariumCore;
  assert.equal(HouseEngine.SCALER_SETS.length, 998);
  assert.equal(context.__ChordariumCore.library.length, 1274);
  const lengths = [2, 4, 6, 8, 16], keys = ["C", "F#", "Eb", "A", "Bb"];
  for (let i = 0; i < capabilities.genres.length * 2; i++) {
    const request = { seed: i % 2 ? 4294967295 : 0, key: keys[i % keys.length],
      mode: i % 2 ? "Minor" : "Major", genre: capabilities.genres[Math.floor(i / 2)],
      bpm: i % 2 ? 145 : 90, bars: lengths[i % lengths.length] };
    const config = HouseEngine.config({ ...request, length: request.bars, progressionSource: "engine" });
    delete config.bars;
    const phrase = HouseEngine.generate(null, config);
    for (const section of Object.keys(fixtures)) {
      const actual = compose({ ...request, section });
      const original = section === "phrase" ? phrase :
        HouseArranger.derive(phrase, config, section === "arpeggio" ? "arp" : section, 0, request.bars);
      assert.deepEqual(actual.provenance.resolved_config, JSON.parse(JSON.stringify(config)));
      assert.deepEqual(actual.notes.map((note) => [note.pitch, note.role, note.start_beats, note.duration_beats, note.velocity]),
        JSON.parse(JSON.stringify(original.events.map((event) =>
          [event.note, event.role, event.startTick / 480, (event.endTick - event.startTick) / 480, event.velocity]))));
      assert.deepEqual(actual.harmony.map((chord) => [chord.start_beats, chord.duration_beats, chord.root_pc, chord.bass_pc, chord.label]),
        JSON.parse(JSON.stringify(phrase.harmony.events.map((chord) =>
          [chord.onsetBeat, chord.durationBeats, chord.rootPc, chord.bassPc, chord.label]))));
    }
  }
});
