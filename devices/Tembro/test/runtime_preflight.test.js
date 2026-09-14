"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { validateRuntime } = require("../code/runtime_preflight.js");

function report() {
  return {
    remote_script: {
      current: true,
      installed_files_current: true,
      runtime_current: true,
      live_mutations_safe: true,
      source_runtime_version: "transport-stop-settle-1+tembro-clip-variation-v1",
      source_bridge_sha256: "a".repeat(64),
      source_runtime_code_sha256: "b".repeat(64),
      live_compiled_runtime_code_sha256: "c".repeat(64),
    },
    ping: { remote_script: {
      runtime_version: "transport-stop-settle-1+tembro-clip-variation-v1",
      bridge_sha256: "a".repeat(64),
      runtime_code_sha256: "c".repeat(64),
    } },
    mcp_tools: { ok: true, checks: [{ tool: "live_clip_variation", ok: true }] },
    m4l_host: { current: true },
    visual_capture: { ok: true },
  };
}

function fakeProcess(onSpawn) {
  const calls = [];
  const signals = [];
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = (signal) => {
    signals.push(signal);
    queueMicrotask(() => child.emit("close", null, signal));
    return true;
  };
  const dependencies = {
    async access() {},
    async stat() { return { isFile() { return true; } }; },
    spawn(command, args, options) {
      calls.push({ command, args, options });
      queueMicrotask(() => {
        child.emit("spawn");
        if (onSpawn) onSpawn(child);
      });
      return child;
    },
  };
  return { dependencies, calls, signals, child };
}

function completes(value, code = 0) {
  return fakeProcess((child) => {
    const text = JSON.stringify(value);
    child.stdout.emit("data", Buffer.from(text.slice(0, 80)));
    child.stdout.emit("data", Buffer.from(text.slice(80) + "\n"));
    child.emit("close", code, null);
  });
}

test("preflight runs the sibling official validator with strict checks and verifies loaded fingerprints", async () => {
  const expected = report();
  const testProcess = completes(expected);
  const result = await validateRuntime("/tmp/Tembro test;literal/bin/ableton-live-mcp", testProcess.dependencies);
  assert.deepEqual(result, expected);
  assert.equal(testProcess.calls.length, 1);
  assert.equal(testProcess.calls[0].command, "/tmp/Tembro test;literal/bin/ableton-live-mcp-validate");
  assert.deepEqual(testProcess.calls[0].args, ["--timeout", "10", "--strict-timeout"]);
  assert.equal(testProcess.calls[0].options.shell, false);
  assert.deepEqual(testProcess.calls[0].options.stdio, ["ignore", "pipe", "pipe"]);
});

test("a missing companion fails before spawning and there is no unsafe fallback", async () => {
  const testProcess = completes(report());
  testProcess.dependencies.access = async () => { throw new Error("ENOENT"); };
  await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), /companion validator is missing/);
  assert.equal(testProcess.calls.length, 0);
  await assert.rejects(validateRuntime("ableton-live-mcp", testProcess.dependencies), /absolute MCP executable path/);
  assert.equal(testProcess.calls.length, 0);
});

for (const field of ["runtime_current", "live_mutations_safe"]) {
  for (const value of [false, "true", undefined]) {
    test("preflight requires strict true for " + field + " (received " + value + ")", async () => {
      const invalid = report();
      invalid.remote_script[field] = value;
      const testProcess = completes(invalid);
      await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), /not verified as current and safe/);
    });
  }
}

test("current booleans do not excuse an unpatched or mismatched loaded runtime", async () => {
  for (const change of [
    (value) => { value.ping.remote_script.runtime_version = "transport-stop-settle-1"; },
    (value) => { value.remote_script.source_runtime_version = "transport-stop-settle-1"; },
    (value) => { value.ping.remote_script.bridge_sha256 = "d".repeat(64); },
    (value) => { value.ping.remote_script.runtime_code_sha256 = "b".repeat(64); },
    (value) => { value.mcp_tools.checks = []; },
    (value) => { value.m4l_host.current = false; },
  ]) {
    const invalid = report();
    change(invalid);
    const testProcess = completes(invalid);
    await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), (err) => {
      assert.equal(err.code, "TEMBRO_PREFLIGHT_FAILED");
      return true;
    });
  }
});

test("validator failure rejects even a successful-looking report and preserves bounded diagnostics", async () => {
  const testProcess = completes(report(), 1);
  await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), /validator exited with status 1/);
  const invalidJson = fakeProcess((child) => {
    child.stdout.emit("data", "not JSON");
    child.emit("close", 0, null);
  });
  await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", invalidJson.dependencies), /invalid JSON/);
});

test("a validator timeout kills its process and reports potentially pending Live work", async () => {
  const testProcess = fakeProcess();
  testProcess.dependencies.timeoutMs = 5;
  testProcess.dependencies.killGraceMs = 5;
  await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), (err) => {
    assert.equal(err.outcomeUnknown, true);
    assert.equal(err.code, "MCP_OUTCOME_UNKNOWN");
    return /exceeded its time limit/.test(err.message);
  });
  assert.deepEqual(testProcess.signals, ["SIGTERM"]);
});

test("oversized output is bounded and the subprocess is stopped without claiming cancellation", async () => {
  const testProcess = fakeProcess((child) => child.stdout.emit("data", Buffer.alloc(256 * 1024 + 1, "x")));
  await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), (err) => {
    assert.equal(err.outcomeUnknown, true);
    return /output exceeded its limit/.test(err.message);
  });
  assert.deepEqual(testProcess.signals, ["SIGTERM"]);
});

test("sent Live timeout reports remain uncertain after the validator itself exits", async () => {
  const invalid = report();
  invalid.remote_script.runtime_current = false;
  invalid.remote_script.live_mutations_safe = false;
  invalid.live_failure_type = "live_main_thread_hung";
  invalid.live_error = "timed out waiting for Live main thread";
  const testProcess = completes(invalid, 1);
  await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), (err) => {
    assert.equal(err.outcomeUnknown, true);
    assert.equal(err.validationReport.live_failure_type, "live_main_thread_hung");
    return true;
  });
});

test("a definitively closed Live connection fails preflight without inventing a sent operation", async () => {
  const invalid = report();
  invalid.remote_script.runtime_current = false;
  invalid.remote_script.live_mutations_safe = false;
  invalid.live_failure_type = "bridge_not_listening";
  invalid.live_error = "Connection refused";
  const testProcess = completes(invalid, 1);
  await assert.rejects(validateRuntime("/tmp/tembro/bin/ableton-live-mcp", testProcess.dependencies), (err) => {
    assert.equal(err.outcomeUnknown, undefined);
    return /Connection refused/.test(err.message);
  });
});
