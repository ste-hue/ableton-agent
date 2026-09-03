"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PassThrough } = require("node:stream");

const clipboard = require("../code/clipboard.js");

test("clipboard text survives the Max message boundary via base64", () => {
  const text = "two  spaces, a\nnewline, tabs\t and ünïcödé 🎛";
  const encoded = clipboard.encodeText(text);
  assert.doesNotMatch(encoded, /\s/);
  assert.equal(clipboard.decodeText(encoded), text);
  assert.equal(clipboard.decodeText(""), "");
  assert.equal(clipboard.decodeText(undefined), "");
});

test("readClipboard shells out to pbpaste and returns its stdout", async () => {
  const calls = [];
  const exec = (cmd, args, opts, cb) => {
    calls.push([cmd, args]);
    cb(null, "ABCD-1234 from pasteboard\n");
  };
  assert.equal(await clipboard.readClipboard(exec), "ABCD-1234 from pasteboard\n");
  assert.deepEqual(calls, [["pbpaste", []]]);
});

test("readClipboard rejects when pbpaste fails", async () => {
  const exec = (cmd, args, opts, cb) => cb(new Error("spawn pbpaste ENOENT"));
  await assert.rejects(clipboard.readClipboard(exec), /ENOENT/);
});

test("writeClipboard pipes the text into pbcopy", async () => {
  let written = "";
  const exec = (cmd, args, cb) => {
    assert.equal(cmd, "pbcopy");
    const stdin = new PassThrough();
    stdin.on("data", (chunk) => { written += chunk.toString("utf8"); });
    stdin.on("finish", () => cb(null));
    return { stdin };
  };
  await clipboard.writeClipboard("hello\nclipboard", exec);
  assert.equal(written, "hello\nclipboard");
});

test("page, engine and patch agree on the clipboard selector", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "tembro_ui.html"), "utf8");
  assert.match(html, /bind\("clipboard"/);
  assert.match(html, /outlet\("clipboard", "read"\)/);
  assert.match(html, /outlet\("clipboard", "write", encodeClipboard\(text\)\)/);
  // Paste paths fall back to the engine instead of dying on a denied clipboard API.
  assert.match(html, /requestEnginePaste\(field, replace, fail\)/);
  assert.match(html, /requestEnginePaste\(field, false, null\)/);

  const engine = fs.readFileSync(path.join(__dirname, "..", "code", "tembro_main.js"), "utf8");
  assert.match(engine, /maxApi\.addHandler\("clipboard"/);
  assert.match(engine, /\["clipboard", "text", clipboard\.encodeText\(text\)\]/);

  const patch = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Tembro.maxpat"), "utf8"));
  const chat = patch.patcher.boxes.find((b) => b.box.id === "obj-chat-patcher").box.patcher;
  const route = chat.boxes.find((b) => b.box.id === "chat-route").box;
  const selectors = route.text.split(" ").slice(1);
  assert.equal(selectors[selectors.length - 1], "clipboard");
  assert.equal(route.numoutlets, selectors.length + 1);
  const prepend = chat.boxes.find((b) => b.box.id === "chat-prepend-clipboard").box;
  assert.equal(prepend.text, "prepend clipboard");
  const lines = chat.lines.map((l) => l.patchline);
  assert.ok(lines.some((l) => l.source[0] === "chat-route" && l.source[1] === selectors.length - 1 && l.destination[0] === "chat-prepend-clipboard"));
  assert.ok(lines.some((l) => l.source[0] === "chat-prepend-clipboard" && l.destination[0] === "chat-out"));
});
