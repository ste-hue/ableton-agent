#!/usr/bin/env node
"use strict";

// Local, real-engine portability probe. Run this unchanged under each Node
// runtime and compare aggregate_sha256, then cases[].sha256 for any mismatch.
// No timestamps, machine paths or runtime metadata enter the musical hashes.
const chordarium = require("../devices/Tembro/code/chordarium_engine.js");
const rudiment = require("../devices/Tembro/code/rudiment_engine.js");
const { canonical, digest, validateMaterial } = require("../devices/Tembro/code/musical_engines.js");

function buildCases() {
  const cases = [];
  const genres = chordarium.inputSchema.properties.genre.enum;
  const styles = rudiment.inputSchema.properties.style.enum;
  const kitKeys = rudiment.inputSchema.properties.kit.required;
  if (genres.length !== 11 || styles.length !== 10 || kitKeys.length !== 8) {
    throw new Error("Engine capabilities changed; review the portability matrix explicitly");
  }
  const keys = ["C", "F#", "Eb", "A", "Bb"];
  const lengths = [2, 8, 16];
  const sections = ["phrase", "bassline", "arpeggio", "pad"];
  for (const [genreIndex, genre] of genres.entries()) {
    for (const [modeIndex, mode] of ["Major", "Minor"].entries()) {
      const configIndex = genreIndex * 2 + modeIndex;
      for (const section of sections) {
        cases.push({
          case_id: `chordarium-${String(genreIndex).padStart(2, "0")}-${mode.toLowerCase()}-${section}`,
          engine: "chordarium",
          request: {
            seed: modeIndex === 0 ? 0 : 4294967295,
            key: keys[configIndex % keys.length],
            mode,
            bpm: modeIndex === 0 ? 90 : 145,
            bars: lengths[configIndex % lengths.length],
            genre,
            section,
          },
        });
      }
    }
  }
  for (const [styleIndex, style] of styles.entries()) {
    for (const seed of [1, 4242, 4294967295]) {
      for (const bars of [8, 32, 128]) {
        cases.push({
          case_id: `rudiment-${String(styleIndex).padStart(2, "0")}-seed${seed}-bars${bars}`,
          engine: "rudiment",
          request: {
            style,
            seed,
            bars,
            density: 60,
            syncopation: 55,
            kit: Object.fromEntries(kitKeys.map((key) => [key, true])),
          },
        });
      }
    }
  }
  if (cases.length !== 178 || new Set(cases.map((entry) => entry.case_id)).size !== cases.length) {
    throw new Error("Incomplete or ambiguous portability matrix");
  }
  return cases;
}

function run() {
  const adapters = { chordarium, rudiment };
  const completeRecords = [];
  const cases = [];
  for (const entry of buildCases()) {
    // Preserve the request exactly even if a future engine starts mutating it.
    const requestJson = canonical(entry.request);
    const request = JSON.parse(requestJson);
    try {
      const result = validateMaterial(adapters[entry.engine].compose(request));
      if (canonical(request) !== requestJson) throw new Error("Engine mutated its request");
      if (result.engine.id !== entry.engine) throw new Error("Engine identity differs from the request");
      const complete = { case_id: entry.case_id, engine: entry.engine, request: entry.request, result };
      // Hash the complete result, including notes, harmony, sections, mapping and
      // all provenance fields. Do not trim, round or normalize musical values.
      const sha256 = digest(complete);
      completeRecords.push(complete);
      cases.push({ case_id: entry.case_id, engine: entry.engine,
        request: entry.request, notes_count: result.notes.length, sha256 });
    } catch (cause) {
      const error = new Error(`Portability case failed: ${entry.case_id}: ${cause.message}`);
      error.case_id = entry.case_id;
      error.engine = entry.engine;
      error.request = entry.request;
      throw error;
    }
  }
  return {
    schema: "tembro.engine-portability.v1",
    runtime: { node: process.versions.node, v8: process.versions.v8, platform: process.platform, arch: process.arch },
    case_count: cases.length,
    engine_case_counts: { chordarium: 88, rudiment: 90 },
    hash_algorithm: "sha256",
    hash_input: "canonical({case_id,engine,request,result}); aggregate canonical array of all complete records in case order",
    cases,
    aggregate_sha256: digest(completeRecords),
  };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw new Error("Usage: node tools/check_tembro_engine_portability.js (no arguments)");
    const report = run();
    process.stdout.write(JSON.stringify(JSON.parse(canonical(report)), null, 2) + "\n");
  } catch (error) {
    const failure = { error: error.message };
    for (const name of ["case_id", "engine", "request"]) {
      if (error[name] !== undefined) failure[name] = error[name];
    }
    process.stderr.write(JSON.stringify(failure, null, 2) + "\n");
    process.exitCode = 1;
  }
}

module.exports = { buildCases, run };
