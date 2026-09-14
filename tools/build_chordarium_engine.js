#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const pin = require("../devices/Tembro/code/engines/chordarium/pin.js");

const defaultOutput = path.resolve(__dirname, "../devices/Tembro/code/engines/chordarium");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function extractBundle(source) {
  if (sha256(source) !== pin.source_sha256) {
    throw new Error("Unknown Chordarium source: pinned src/index.html SHA-256 mismatch");
  }
  const html = source.toString("utf8");
  const ending = "})(typeof window!=='undefined'?window:this);";
  function block(marker) {
    const start = html.indexOf(marker);
    if (start === -1 || html.indexOf(marker, start + marker.length) !== -1) {
      throw new Error(`Missing or repeated Chordarium boundary: ${marker}`);
    }
    const end = html.indexOf(ending, start);
    if (end === -1) throw new Error(`Missing Chordarium IIFE ending: ${marker}`);
    return html.slice(start, end + ending.length);
  }
  const bundle = block("/* House Piano Engine v23:") + "\n" +
    block("/* Deterministic section derivation from one Chordarium phrase. */") + "\n";
  if (/const SCALER_(?:LIBRARY|CHORD_SETS)\s*=/.test(bundle)) {
    throw new Error("Chordarium extraction unexpectedly includes a source catalog");
  }
  if (sha256(bundle) !== pin.bundle_sha256) {
    throw new Error("Chordarium extracted bundle SHA-256 mismatch");
  }
  return bundle;
}

function build({ sourceRoot, outputDir = defaultOutput, check = false } = {}) {
  if (typeof sourceRoot !== "string" || !sourceRoot) throw new Error("--source-root is required");
  const source = fs.readFileSync(path.resolve(sourceRoot, "src/index.html"));
  const bundle = extractBundle(source);
  const manifest = JSON.stringify(pin, null, 2) + "\n";
  const output = path.resolve(outputDir);
  const files = [[pin.bundle_file, bundle], ["manifest.json", manifest]];
  if (check) {
    for (const [name, expected] of files) {
      if (fs.readFileSync(path.join(output, name), "utf8") !== expected) {
        throw new Error(`Generated Chordarium ${name} differs; rebuild from the pinned source`);
      }
    }
  } else {
    fs.mkdirSync(output, { recursive: true });
    for (const [name, content] of files) fs.writeFileSync(path.join(output, name), content);
  }
  return { source_revision: pin.source_revision, bundle_sha256: pin.bundle_sha256, output_dir: output, checked: check };
}

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const key = { "--source-root": "sourceRoot", "--output-dir": "outputDir", "--check": "check" }[flag];
    if (!key || Object.hasOwn(options, key)) throw new Error(`Unknown or repeated option: ${flag}`);
    if (key === "check") options.check = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      options[key] = value;
    }
  }
  return options;
}

if (require.main === module) {
  try { console.log(JSON.stringify(build(parseArgs(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { extractBundle, build, parseArgs };
