"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "tembro_ui.html"), "utf8");

// Execute the actual page script against the small DOM surface it uses. No
// engine or Live calls are made; host messages are delivered through bindInlet.
function page() {
  const elements = new Map();
  const bindings = new Map();
  const calls = [];
  const intervals = new Map();
  let timerId = 0;
  let now = 1000;
  class Element {
    constructor(tagName = "div") {
      this.tagName = tagName.toUpperCase();
      this.className = "";
      this.children = [];
      this.listeners = new Map();
      this.attributes = {};
      this.dataset = {};
      this.style = {};
      this.value = "";
      this.textContent = "";
      this.disabled = false;
      this.classList = {
        contains: (name) => this.className.split(/\s+/).includes(name),
        add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" "); },
        remove: (...names) => { this.className = this.className.split(/\s+/).filter((name) => !names.includes(name)).join(" "); },
        toggle: (name, force) => {
          const add = force === undefined ? !this.classList.contains(name) : force;
          this.classList[add ? "add" : "remove"](name);
        }
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    dispatchEvent(event) { this.listeners.get(event.type)?.(event); }
    click() { this.dispatchEvent({ type: "click" }); }
    focus() { document.activeElement = this; }
    querySelectorAll(selector) { return this.children.filter((child) => child.classList?.contains(selector.slice(1))); }
  }
  for (const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const element = new Element(match[1]);
    element.className = match[2].match(/class="([^"]*)"/)?.[1] || "";
    element.disabled = /\bdisabled\b/.test(match[2]);
    elements.set(match[3], element);
  }
  const document = {
    getElementById: (id) => elements.get(id),
    createElement: (tagName) => new Element(tagName),
    createTextNode: (textContent) => ({ textContent }),
    addEventListener() {},
    body: new Element("body")
  };
  vm.runInNewContext(html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1], {
    document,
    window: { max: { bindInlet: (selector, callback) => bindings.set(selector, callback), outlet: (...args) => calls.push(JSON.parse(JSON.stringify(args))) } },
    localStorage: { getItem: () => null },
    navigator: {},
    Date: { now: () => now },
    setTimeout: () => ++timerId,
    clearTimeout() {},
    setInterval: (callback, delay) => { const id = ++timerId; intervals.set(id, { callback, delay }); return id; },
    clearInterval: (id) => intervals.delete(id)
  });
  return {
    get: (id) => elements.get(id),
    emit: (selector, ...args) => bindings.get(selector)(...args),
    state: (state) => bindings.get("variation_state")(JSON.stringify(state)),
    calls: () => calls.filter(([selector]) => selector === "variation"),
    advance: (milliseconds) => { now += milliseconds; for (const { callback } of [...intervals.values()]) callback(); }
  };
}

const idle = () => ({ state: "idle", busy: false, message: "Select a Session MIDI clip, then capture it.", source: null, candidate: null, lanes: [], can: { capture: true } });
const captured = () => ({
  state: "captured", busy: false, message: "Choose a note lane.",
  source: { path: "live_set tracks 1 clip_slots 0 clip", name: "Drums", trackName: "Kit" },
  candidate: null,
  lanes: [{ pitch: 42, label: "MIDI 42", count: 16 }, { pitch: 46, label: "MIDI 46", count: 4 }],
  can: { capture: true, create: true, auditionSource: true }
});
const candidate = () => ({
  ...captured(), state: "candidate", message: "Candidate checked in Live.",
  candidate: { name: "Drums variation", removedCount: 8, noteCount: 12 },
  can: { thin: true, auditionSource: true, auditionCandidate: true, keep: true, discard: true }
});
const commandIds = ["Capture", "Create", "Thin", "AuditionSource", "AuditionCandidate", "Keep", "Discard", "Reconcile"].map((name) => "variation" + name);

function assertLocked(ui) {
  for (const id of commandIds) assert.equal(ui.get(id).disabled, true, id + " must be disabled");
  assert.equal(ui.get("variationLane").disabled, true);
}

test("variation commands wait for host state, capture only once, and never invent a source", () => {
  const ui = page();
  ui.emit("auth", "connected");
  assertLocked(ui);
  assert.match(ui.get("variationMessage").textContent, /Waiting for the device engine/);
  ui.state(idle());
  assert.equal(ui.get("variationCapture").disabled, false);
  ui.get("variationCapture").click();
  ui.get("variationCapture").click();
  assert.deepEqual(ui.calls(), [["variation", "capture"]]);
  assertLocked(ui);
  assert.equal(ui.get("variationSource").textContent, "No clip captured");
  ui.emit("state", "idle");
  assertLocked(ui);
  ui.state(captured());
  assert.equal(ui.get("variationSource").textContent, "Drums · Kit");
  assert.equal(ui.get("variationCapture").disabled, false);
});

test("lane selection is explicit and sends the exact selected pitch", () => {
  const ui = page();
  ui.emit("auth", "connected");
  ui.state(captured());
  assert.equal(ui.get("variationLane").value, "");
  assert.equal(ui.get("variationCreate").disabled, true);
  ui.get("variationCreate").click();
  assert.deepEqual(ui.calls(), []);
  ui.get("variationLane").value = "46";
  ui.get("variationLane").dispatchEvent({ type: "change" });
  assert.equal(ui.get("variationCreate").disabled, false);
  ui.get("variationCreate").click();
  assert.deepEqual(ui.calls(), [["variation", "create", 46]]);
  assertLocked(ui);
  assert.equal(ui.get("variationCandidate").classList.contains("hidden"), true);
  ui.state(candidate());
  assert.equal(ui.get("variationCandidate").textContent, "Drums variation · 12 notes · 8 hits removed");
});

test("global work and host work both block commands, including after variation readback", () => {
  const ui = page();
  ui.emit("auth", "connected");
  ui.state(candidate());
  ui.emit("state", "working");
  assertLocked(ui);
  ui.state(candidate());
  assertLocked(ui);
  ui.get("variationKeep").click();
  assert.deepEqual(ui.calls(), []);
  ui.emit("state", "success");
  assert.equal(ui.get("variationKeep").disabled, false);
  ui.state({ ...candidate(), busy: true });
  ui.emit("state", "idle");
  assertLocked(ui);
  ui.state(candidate());
  assert.equal(ui.get("variationKeep").disabled, false);
});

test("candidate commands preserve host outcomes and dispatch the agreed actions", () => {
  for (const [suffix, action] of [["Thin", "thin"], ["AuditionSource", "audition_source"], ["AuditionCandidate", "audition_candidate"], ["Keep", "keep"], ["Discard", "discard"]]) {
    const ui = page();
    ui.emit("auth", "connected");
    ui.state(candidate());
    ui.get("variation" + suffix).click();
    ui.get("variation" + suffix).click();
    assert.deepEqual(ui.calls(), [["variation", action]]);
    assertLocked(ui);
    assert.match(ui.get("variationCandidate").textContent, /Drums variation/);
    assert.match(ui.get("variationMessage").textContent, /Waiting for Live/);
  }
});

test("unknown outcomes expose only the host-authorized recheck", () => {
  const ui = page();
  ui.emit("auth", "connected");
  ui.state({ ...candidate(), state: "unknown", message: "The request timed out. Recheck before another action.", can: { reconcile: true } });
  assert.equal(ui.get("variationKeep").disabled, true);
  assert.equal(ui.get("variationReconcile").disabled, false);
  assert.equal(ui.get("variationReconcile").classList.contains("hidden"), false);
  ui.get("variationReconcile").click();
  assert.deepEqual(ui.calls(), [["variation", "reconcile"]]);
  assertLocked(ui);
});

test("invalid payloads and an unresponsive engine cannot unlock stale capabilities", () => {
  const ui = page();
  ui.emit("auth", "connected");
  ui.state(candidate());
  ui.emit("variation_state", "not JSON");
  ui.emit("state", "idle");
  assertLocked(ui);
  ui.state(candidate());
  assert.equal(ui.get("variationKeep").disabled, false);
  ui.emit("state", "working");
  ui.advance(21000);
  assertLocked(ui);
  assert.match(ui.get("variationMessage").textContent, /fresh state/);
  ui.state(candidate());
  assert.equal(ui.get("variationKeep").disabled, false);
});

test("changing or recapturing the source requires a new lane choice", () => {
  const ui = page();
  ui.emit("auth", "connected");
  ui.state(captured());
  ui.get("variationLane").value = "42";
  ui.get("variationLane").dispatchEvent({ type: "change" });
  ui.state({ ...captured(), source: { ...captured().source, path: "live_set tracks 1 clip_slots 1 clip" } });
  assert.equal(ui.get("variationLane").value, "");
  assert.equal(ui.get("variationCreate").disabled, true);
  ui.get("variationLane").value = "42";
  ui.get("variationLane").dispatchEvent({ type: "change" });
  ui.get("variationCapture").click();
  ui.state(captured());
  assert.equal(ui.get("variationLane").value, "");
});

test("disconnect and invalid pitch choices fail closed", () => {
  const ui = page();
  ui.emit("auth", "connected");
  ui.state({ ...captured(), lanes: [...captured().lanes, { pitch: 128, label: "Invalid", count: 2 }] });
  assert.equal(ui.get("variationLane").children.length, 3);
  ui.get("variationLane").value = "128";
  ui.get("variationLane").dispatchEvent({ type: "change" });
  assert.equal(ui.get("variationCreate").disabled, true);
  ui.emit("auth", "disconnected");
  ui.state(candidate());
  assertLocked(ui);
});
