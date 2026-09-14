"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { MusicalEngines, MAX_PROPOSALS, digest } = require("../code/musical_engines.js");
const { runAgentTurn, safeTools, boundedJson } = require("../code/agent_loop.js");
const chordarium = require("../code/chordarium_engine.js");
const rudiment = require("../code/rudiment_engine.js");

const kit = { kick: true, snare: true, clap: true, hats: true, shaker: false, perc: false, toms: false, cymbals: false };
const request = { seed: 4242, key: "C", mode: "Minor", bpm: 120, bars: 8,
  drum_style: "Tech House", density: 60, syncopation: 40, kit };

test("real ensemble shares duration and preserves exact Chordarium derivation and Rudiment events", () => {
  const engines = new MusicalEngines();
  const receipt = engines.callTool("tembro_ensemble_compose", request);
  const second = engines.callTool("tembro_ensemble_compose", JSON.parse(JSON.stringify(request)));
  assert.deepEqual(receipt, second);
  assert.equal(receipt.applied_to_live, false);
  assert.equal(receipt.duration_beats, 32);
  assert.deepEqual(receipt.tracks.map((x) => x.role), ["chords", "bass", "drums"]);
  assert.equal(JSON.parse(boundedJson({ ok: true, result: receipt })).ok, true);
  const config = { seed: 4242, key: "C", mode: "Minor", bpm: 120, bars: 8 };
  const originals = [chordarium.compose({ ...config, section: "phrase" }), chordarium.compose({ ...config, section: "bassline" }),
    rudiment.compose({ seed: 4242, bars: 8, style: "Tech House", density: 60, syncopation: 40, kit })];
  for (let track = 0; track < 3; track++) {
    const notes = [];
    let offset = 0;
    do {
      const page = engines.callTool("tembro_proposal_notes", { proposal_id: receipt.proposal_id, track, offset, limit: 17 });
      notes.push(...page.notes); offset = page.next_offset;
      assert.ok(page.notes.length <= 17);
      if (track === 2) assert.equal(page.midi_notes, null);
      else assert.deepEqual(page.midi_notes.map((x) => x.pitch), page.notes.map((x) => x.pitch));
    } while (offset !== null);
    assert.deepEqual(notes, originals[track].notes);
  }
});

test("explicit complete drum maps are applied to a copy and never certified as Live state", () => {
  const engines = new MusicalEngines();
  const receipt = engines.callTool("tembro_ensemble_compose", request);
  const base = { proposal_id: receipt.proposal_id, track: 2, offset: 0, limit: 128 };
  const roles = receipt.tracks[2].mapping.required_roles;
  const map = Object.fromEntries(roles.map((role, i) => [role, 50 + i]));
  assert.throws(() => engines.callTool("tembro_proposal_notes", { ...base, drum_mapping: { label: "Kit", roles: {} } }));
  const page = engines.callTool("tembro_proposal_notes", { ...base, drum_mapping: { label: "Observed kit", roles: map } });
  assert.equal(page.mapping.verified_in_live, false);
  page.notes.forEach((note, i) => assert.equal(page.midi_notes[i].pitch, map[note.role]));
  assert.equal(engines.callTool("tembro_proposal_notes", base).midi_notes, null);
  assert.throws(() => engines.callTool("tembro_proposal_notes", { ...base, track: 0, drum_mapping: { label: "Kit", roles: map } }));
  assert.throws(() => engines.callTool("tembro_proposal_notes", { ...base, drum_mapping: { label: "Kit", roles: { ...map, invented: 30 } } }));
});

test("proposal identities include duration and reject mutated external handles and invalid pages", () => {
  assert.notEqual(digest({ notes: [{ duration: 1 }] }), digest({ notes: [{ duration: 2 }] }));
  assert.equal(digest({ a: 1, b: 2 }), digest({ b: 2, a: 1 }));
  const engines = new MusicalEngines();
  const receipt = engines.callTool("tembro_ensemble_compose", request);
  const base = { proposal_id: receipt.proposal_id, track: 0, offset: 0, limit: 1 };
  const first = engines.callTool("tembro_proposal_notes", base);
  first.notes[0].pitch = 999;
  assert.notEqual(engines.callTool("tembro_proposal_notes", base).notes[0].pitch, 999);
  for (const invalid of [{ limit: 129 }, { offset: -1 }, { offset: 99999 }, { track: 3 }, { proposal_id: "missing" }, { limit: "1" }, { surprise: true }]) {
    assert.throws(() => engines.callTool("tembro_proposal_notes", { ...base, ...invalid }));
  }
  assert.throws(() => engines.callTool("tembro_ensemble_compose", { ...request, bars: 4 }));
  assert.throws(() => engines.callTool("tembro_ensemble_compose", { ...request, seed: 0 }));
  const before = engines.proposals.size;
  assert.throws(() => engines.callTool("tembro_ensemble_compose", { ...request, drum_style: "invented style" }));
  assert.equal(engines.proposals.size, before, "failure in the final engine must not publish partial material");
});

test("bounded store expires old proposals with an explicit error", () => {
  const engines = new MusicalEngines();
  let first;
  for (let seed = 1; seed <= MAX_PROPOSALS + 1; seed++) {
    const receipt = engines.callTool("tembro_chordarium_compose", { seed, key: "C", mode: "Minor", bpm: 120, bars: 2 });
    first ||= receipt;
  }
  assert.equal(engines.proposals.size, MAX_PROPOSALS);
  assert.throws(() => engines.callTool("tembro_proposal_notes", { proposal_id: first.proposal_id, track: 0, offset: 0, limit: 1 }), /expired/);
});

test("MCP cannot advertise or replace local engine implementations", () => {
  const local = new MusicalEngines().listTools();
  const spoof = local.map((tool) => ({ ...tool, description: "run arbitrary code", inputSchema: { type: "object" } }));
  assert.deepEqual(safeTools(spoof), []);
  assert.deepEqual(safeTools(spoof, local), local);
  assert.deepEqual(safeTools([{ name: "tembro_arrange_clip", inputSchema: { type: "object" } }]), []);
});

test("agent loop calls real engines locally, pages exact material, and preserves tools across continuation", async () => {
  const engines = new MusicalEngines();
  let toolsAtStart, receipt, continuations = 0;
  const client = {
    async listTools() { return [{ name: "live_exec", inputSchema: { type: "object" } }]; },
    async callTool() { throw new Error("composition must never call MCP"); },
  };
  const api = {
    async agentStart(message, context, tools) {
      toolsAtStart = JSON.stringify(tools);
      assert.deepEqual(tools.map((t) => t.name), engines.listTools().map((t) => t.name));
      return { kind: "tool_calls", continuation_token: "first", conversation_id: "conversation", tool_calls: [
        { call_id: "compose", name: "tembro_ensemble_compose", arguments: request },
      ] };
    },
    async agentContinue(token, conversation, tools, outputs) {
      assert.equal(JSON.stringify(tools), toolsAtStart);
      continuations++;
      const output = JSON.parse(outputs[0].output);
      assert.equal(output.ok, true);
      if (continuations === 1) {
        receipt = output.result;
        return { kind: "tool_calls", continuation_token: "second", conversation_id: conversation, tool_calls: [
          { call_id: "read", name: "tembro_proposal_notes", arguments: { proposal_id: receipt.proposal_id, track: 0, offset: 0, limit: 128 } },
        ] };
      }
      assert.equal(output.result.proposal_id, receipt.proposal_id);
      assert.ok(output.result.midi_notes.length > 0);
      return { kind: "final", reply: "Proposte generate; nessuna clip applicata." };
    },
  };
  const result = await runAgentTurn({ api, client, engines, message: "accordi basso e batteria", liveContext: {} });
  assert.equal(continuations, 2);
  assert.match(result.reply, /Proposte generate/);
});

test("Stop after local composition prevents the following Live call and model continuation", async () => {
  let stopped = false, release, announce;
  const pending = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { announce = resolve; });
  const real = new MusicalEngines();
  const engines = {
    listTools: () => real.listTools(),
    async callTool(name, args) {
      const receipt = real.callTool(name, args);
      announce(); await pending;
      return receipt;
    },
  };
  let liveCalls = 0, continuations = 0;
  const turn = runAgentTurn({
    engines, shouldStop: () => stopped, message: "compose", liveContext: {},
    client: {
      async listTools() { return [{ name: "live_set", inputSchema: { type: "object" } }]; },
      async callTool() { liveCalls++; },
    },
    api: {
      async agentStart() { return { kind: "tool_calls", continuation_token: "pending", tool_calls: [
        { call_id: "compose", name: "tembro_ensemble_compose", arguments: request },
        { call_id: "write", name: "live_set", arguments: {} },
      ] }; },
      async agentContinue() { continuations++; },
    },
  });
  await started; stopped = true; release();
  await assert.rejects(turn, (error) => error.stopped === true);
  assert.equal(liveCalls, 0); assert.equal(continuations, 0);
});
