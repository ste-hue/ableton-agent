"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const UI_FILE = path.join(__dirname, "..", "tembro_ui.html");

test("chat UI exposes skill costs, honest waiting copy, and the eclipse mark", () => {
  const html = fs.readFileSync(UI_FILE, "utf8");
  assert.match(html, /id="skillRail"/);
  assert.match(html, /id="costHint"/);
  assert.match(html, /id="studioThought"/);
  assert.match(html, /outlet\("chat_skill", selectedSkill, text\)/);
  assert.match(html, /Tembro says done only after reading Live again\./);
  assert.match(html, /class="wait-eclipse"/);
  assert.match(html, /id="traceTerminal"/);
  assert.match(html, /Agent calls will appear here as they happen\./);
  assert.match(html, /https:\/\/docs\.cycling74\.com\/apiref\/lom\/clip\//);
  assert.match(html, /outlet\("open_doc", currentDocUrl\)/);

  const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(script, "inline UI script should exist");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("device host opens only official Live documentation hosts", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "code", "tembro_main.js"), "utf8");
  assert.match(source, /maxApi\.addHandler\("open_doc"/);
  assert.match(source, /docs\.cycling74\.com/);
  assert.match(source, /www\.ableton\.com/);
  assert.match(source, /DOC_HOSTS\.has\(url\.hostname\)/);
});

test("messages typed while busy are queued, never dropped, and a dead engine frees the page", () => {
  const html = fs.readFileSync(UI_FILE, "utf8");
  // submit() must not throw messages away while a turn is running…
  assert.doesNotMatch(html, /if \(!text \|\| busy \|\| !connected\) return;/);
  assert.match(html, /if \(!text \|\| !connected\) return;/);
  // …and the page frees its spinner when the engine goes silent.
  assert.match(html, /bind\("engine"/);
  assert.match(html, /ENGINE_SILENCE_MS/);
  assert.match(html, /engineLastSeen = Date\.now\(\)/);

  const source = fs.readFileSync(path.join(__dirname, "..", "code", "tembro_main.js"), "utf8");
  // The engine echoes queued messages into the transcript and runs them next.
  assert.match(source, /pendingChats\.push\(\{ message, skill \}\)/);
  assert.match(source, /transcript\("you", message\)/);
  assert.match(source, /pendingChats\.shift\(\)/);
  // /stop drops the queue along with the running turn.
  assert.match(source, /pendingChats\.length = 0/);
  // Heartbeat keeps the page's dead-engine watchdog honest.
  assert.match(source, /\["engine", "alive"\]/);
});

test("busy is driven by the state channel, and stop reaches inside the arrangement macro", () => {
  const html = fs.readFileSync(UI_FILE, "utf8");
  // The stop button must stay visible through long macros: busy comes from
  // the state channel, never from pattern-matching status text.
  assert.match(html, /if \(state === "working"\) setBusy\(true\)/);
  assert.doesNotMatch(html, /working\|reading\|thinking\|discovering/);

  const loop = fs.readFileSync(path.join(__dirname, "..", "code", "agent_loop.js"), "utf8");
  assert.match(loop, /arrangeClip\(client, args \|\| \{\}, onStatus, shouldStop\)/);

  const main = fs.readFileSync(path.join(__dirname, "..", "code", "tembro_main.js"), "utf8");
  // The bridge child is stopped when the engine goes away.
  assert.match(main, /process\.on\("exit", \(\) => client\.stop\(\)\)/);

  const mcp = fs.readFileSync(path.join(__dirname, "..", "code", "mcp_client.js"), "utf8");
  // A missing bridge executable fails the call, not the whole engine.
  assert.match(mcp, /this\.proc\.on\("error"/);
  assert.match(mcp, /not installed or failed to start/);
});
