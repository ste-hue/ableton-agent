"use strict";

// System clipboard for the device page. Max's embedded browser (jweb) denies
// navigator.clipboard on file:// pages, so the page falls back to the engine,
// which talks to the macOS pasteboard through pbpaste/pbcopy. Text crosses the
// Max message boundary base64-encoded: Max splits messages on whitespace and
// would otherwise mangle spaces and newlines.

const { execFile } = require("child_process");

function encodeText(text) {
  return Buffer.from(String(text), "utf8").toString("base64");
}

function decodeText(encoded) {
  return Buffer.from(String(encoded || ""), "base64").toString("utf8");
}

function readClipboard(exec = execFile) {
  return new Promise((resolve, reject) => {
    exec("pbpaste", [], { maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(String(stdout));
    });
  });
}

function writeClipboard(text, exec = execFile) {
  return new Promise((resolve, reject) => {
    const child = exec("pbcopy", [], (err) => (err ? reject(err) : resolve()));
    child.stdin.on("error", reject);
    child.stdin.end(String(text), "utf8");
  });
}

module.exports = { encodeText, decodeText, readClipboard, writeClipboard };
