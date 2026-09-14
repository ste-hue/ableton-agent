#!/usr/bin/env node
"use strict";

// Offline proof of the same local tool implementation used by the M4L host.
// Usage: node tools/compose_tembro.js docs/examples/ensemble-request.json
const fs = require("node:fs");
const { MusicalEngines } = require("../devices/Tembro/code/musical_engines.js");

try {
  if (process.argv.length !== 3) throw new Error("usage: node tools/compose_tembro.js request.json");
  const raw = fs.readFileSync(process.argv[2]);
  if (raw.length > 64 * 1024) throw new Error("request exceeds 64 KiB");
  const request = JSON.parse(raw.toString("utf8"));
  if (!request || Object.keys(request).some((key) => !["tool", "arguments"].includes(key)) ||
      !["tembro_chordarium_compose", "tembro_rudiment_compose", "tembro_ensemble_compose"].includes(request.tool)) {
    throw new Error("expected a local compose tool and arguments");
  }
  const engines = new MusicalEngines();
  const receipt = engines.callTool(request.tool, request.arguments);
  const tracks = receipt.tracks.map((track) => {
    const notes = [];
    let offset = 0;
    do {
      const page = engines.callTool("tembro_proposal_notes", {
        proposal_id: receipt.proposal_id, track: track.track, offset, limit: 128,
      });
      notes.push(...page.notes); offset = page.next_offset;
    } while (offset !== null);
    return { ...track, notes };
  });
  process.stdout.write(JSON.stringify({ request, ...receipt, tracks }, null, 2) + "\n");
} catch (error) {
  process.stderr.write("Tembro composition failed: " + error.message + "\n");
  process.exitCode = 1;
}
