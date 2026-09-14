"use strict";

// Run the official companion validator under the caller's shared Live lane.
// This module never schedules a second Live client concurrently, repairs an
// installation, relaxes validator flags, or reloads the Control Surface.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const RUNTIME_VERSION = "transport-stop-settle-1+tembro-clip-variation-v1";
const VALIDATOR_ARGS = ["--timeout", "10", "--strict-timeout"];
const MAX_OUTPUT_BYTES = 256 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const UNCERTAIN_FAILURES = new Set([
  "bridge_response_timeout", "bridge_unresponsive", "live_main_thread_hung",
  "live_main_thread_timeout", "live_process_unresponsive",
]);

function failure(message, report, uncertain = false) {
  const err = new Error("Tembro runtime preflight failed: " + message);
  err.code = uncertain ? "MCP_OUTCOME_UNKNOWN" : "TEMBRO_PREFLIGHT_FAILED";
  if (report) err.validationReport = report;
  if (uncertain) {
    // The caller must latch its shared MCP quarantine before releasing the
    // lane: stopping the validator cannot cancel a sent Live main-thread read.
    err.outcomeUnknown = true;
    err.requestSent = true;
  }
  return err;
}

function verifyReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw failure("validator returned no report object");
  }
  const remote = report.remote_script || {};
  const loaded = (report.ping || {}).remote_script || {};
  if (remote.runtime_current !== true || remote.live_mutations_safe !== true) {
    throw failure("the running bridge is not verified as current and safe", report,
      UNCERTAIN_FAILURES.has(report.live_failure_type));
  }
  if (remote.current !== true || remote.installed_files_current !== true ||
      (report.m4l_host || {}).current !== true || (report.visual_capture || {}).ok !== true) {
    throw failure("the installed bridge, M4L companion, or visual capture dependencies are not current", report);
  }
  const schemas = report.mcp_tools || {};
  if (schemas.ok !== true || !Array.isArray(schemas.checks) ||
      !schemas.checks.some((check) => check && check.tool === "live_clip_variation" && check.ok === true)) {
    throw failure("the validator has not verified Tembro's clip variation tool schema", report);
  }
  if (remote.source_runtime_version !== RUNTIME_VERSION || loaded.runtime_version !== RUNTIME_VERSION) {
    throw failure("the loaded bridge does not include the required Tembro clip variation patch", report);
  }
  const expectedCode = remote.live_compiled_runtime_code_sha256 || remote.source_runtime_code_sha256;
  if (!SHA256.test(String(remote.source_bridge_sha256 || "")) ||
      loaded.bridge_sha256 !== remote.source_bridge_sha256 ||
      !SHA256.test(String(expectedCode || "")) || loaded.runtime_code_sha256 !== expectedCode) {
    throw failure("the loaded bridge fingerprint does not match the validated Tembro runtime", report);
  }
  return report;
}

/**
 * Validate the installed AND loaded runtime. Call only while holding the same
 * busy lane as MCP calls, before capture and each persistent variation action.
 * Dependencies are injectable for subprocess tests; production needs one arg.
 */
async function validateRuntime(mcpCommand, dependencies = {}) {
  if (typeof mcpCommand !== "string" || !path.isAbsolute(mcpCommand)) {
    throw failure("configure an absolute MCP executable path so its companion validator can be identified");
  }
  const validatorPath = path.join(path.dirname(mcpCommand), "ableton-live-mcp-validate");
  const access = dependencies.access || fs.promises.access.bind(fs.promises);
  const stat = dependencies.stat || fs.promises.stat.bind(fs.promises);
  const spawnProcess = dependencies.spawn || spawn;
  try {
    await access(validatorPath, fs.constants.X_OK);
    if (!(await stat(validatorPath)).isFile()) throw new Error("not a regular executable file");
  } catch {
    throw failure("companion validator is missing or not executable at " + validatorPath + "; repair the Tembro bridge installation before continuing");
  }

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnProcess(validatorPath, VALIDATOR_ARGS.slice(), {
        shell: false, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
      });
    } catch (err) {
      reject(failure("could not start the companion validator: " + err.message));
      return;
    }
    let output = "";
    let diagnostics = "";
    let bytes = 0;
    let settled = false;
    let spawned = false;
    let stoppedError = null;
    let killTimer = null;
    const finish = (err, report) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (killTimer) clearTimeout(killTimer);
      if (err) reject(err);
      else resolve(report);
    };
    const halt = (err) => {
      if (settled || stoppedError) return;
      stoppedError = err;
      killTimer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* retain uncertainty */ }
        finish(stoppedError);
      }, dependencies.killGraceMs || 1000);
      try { child.kill("SIGTERM"); } catch { /* retain uncertainty */ }
    };
    const deadline = setTimeout(() => halt(failure(
      "the validator exceeded its time limit; reconcile bridge status before another Live call",
      null, true,
    )), dependencies.timeoutMs || 20000);
    const collect = (chunk, stderr) => {
      if (settled || stoppedError) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_OUTPUT_BYTES) {
        halt(failure("validator output exceeded its limit; reconcile bridge status before another Live call", null, true));
        return;
      }
      if (stderr) diagnostics += chunk.toString();
      else output += chunk.toString();
    };
    child.stdout.on("data", (chunk) => collect(chunk, false));
    child.stderr.on("data", (chunk) => collect(chunk, true));
    child.on("spawn", () => { spawned = true; });
    child.on("error", (err) => finish(stoppedError || failure(
      "companion validator process failed: " + err.message, null, spawned,
    )));
    child.on("close", (code, signal) => {
      if (settled) return;
      if (stoppedError) { finish(stoppedError); return; }
      if (signal) { finish(failure("companion validator exited on " + signal, null, true)); return; }
      let report;
      try { report = JSON.parse(output); } catch {
        finish(failure("validator returned invalid JSON"));
        return;
      }
      if (code !== 0) {
        const detail = report && (report.live_error || (report.remote_script || {}).runtime_mismatch);
        finish(failure(String(detail || diagnostics.trim() || "validator exited with status " + code).slice(0, 1500),
          report, UNCERTAIN_FAILURES.has(report && report.live_failure_type)));
        return;
      }
      try { finish(null, verifyReport(report)); } catch (err) { finish(err); }
    });
  });
}

module.exports = { validateRuntime };
