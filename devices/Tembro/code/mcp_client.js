"use strict";

// Minimal MCP stdio client for the pinned upstream `ableton-live-mcp` server
// (newline-delimited JSON-RPC 2.0: initialize → notifications/initialized →
// tools/call). Serializes Live calls and quarantines the connection when a
// sent call's outcome is unknown. A timeout is not proof that Live stopped.

const { spawn } = require("child_process");

function upstreamOutcomeUnknown(message) {
  // These are the pinned upstream's explicit sent-request timeout and
  // main-thread uncertainty messages, not ordinary validation failures.
  return /the request was sent, so it was not retried automatically|tembro operation has unknown sent outcome; do not retry|timed out waiting for live main thread|live main-thread request already in flight|live main thread is in stall cooldown|ableton bridge client is in stall cooldown/i.test(message);
}

class McpClient {
  /**
   * @param {string} command  path to the ableton-live-mcp executable
   * @param {string[]} [args]
   */
  constructor(command, args) {
    this.command = command;
    this.args = args || [];
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map(); // id → {resolve, reject, timer, method, toolName, sent}
    this.queue = Promise.resolve(); // serializes requests: one in flight
    this.buffer = "";
    this.initialized = false;
    this.tools = null;
    this._quarantine = null;
  }

  get quarantined() {
    return this._quarantine !== null;
  }

  get quarantine() {
    return this._quarantine;
  }

  /**
   * Latch uncertainty found by a local controller after a sent operation, for
   * example when its readback is missing or invalid. Returns the fatal Error
   * for the caller to throw; never clears an existing quarantine.
   */
  markOutcomeUnknown(toolName, reason) {
    return this._unknownOutcome(
      { id: null, toolName: String(toolName || "Live operation") },
      String(reason || "A sent Live operation could not be verified"),
    );
  }

  _unknownOutcome(request, reason, requestSent = true) {
    // Preserve the first uncertain request. Neither a late reply, a healthy
    // status response nor restarting the subprocess reconciles its effects.
    if (!this._quarantine) {
      this._quarantine = Object.freeze({
        requestId: request.id,
        toolName: request.toolName,
        reason,
      });
    }
    const err = new Error(
      reason + ". Live outcome unknown; only bridge status is available until reconciliation. Do not resend.",
    );
    err.code = "MCP_OUTCOME_UNKNOWN";
    err.outcomeUnknown = true;
    err.requestSent = requestSent;
    err.quarantine = this._quarantine;
    return err;
  }

  _assertAvailable(name) {
    if (this._quarantine && name !== "live_bridge_status") {
      throw this._unknownOutcome(
        this._quarantine,
        "Live calls are blocked after " + this._quarantine.toolName,
        false,
      );
    }
  }

  start() {
    if (this.proc) return;
    const proc = spawn(this.command, this.args, {
      stdio: ["pipe", "pipe", "inherit"],
    });
    this.proc = proc;
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      if (this.proc === proc) this._onData(chunk);
    });
    // Without these handlers a missing or broken bridge executable raises an
    // uncaught 'error'/EPIPE and kills the whole node.script engine instead of
    // failing this one call with a message the user can act on.
    proc.on("error", (spawnError) => {
      this._failAll(
        new Error(
          "Tembro's local bridge is not installed or failed to start (" +
            this.command +
            "): " +
            (spawnError && spawnError.message ? spawnError.message : spawnError),
        ),
        proc,
      );
    });
    proc.stdin.on("error", (err) => {
      this._failAll(new Error("MCP server input failed: " + err.message), proc);
    });
    proc.on("exit", () => {
      this._failAll(new Error("MCP server process exited"), proc);
    });
  }

  _failAll(err, proc) {
    // A previous subprocess may emit exit after error. It must not reject
    // requests belonging to a subsequently started status connection.
    if (proc && proc !== this.proc) return;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(
        p.sent && p.method === "tools/call"
          ? this._unknownOutcome(p, err.message)
          : err,
      );
    }
    this.pending.clear();
    this.proc = null;
    this.initialized = false;
    this.tools = null;
    this.buffer = "";
  }

  stop() {
    if (this.proc) this.proc.kill();
  }

  _onData(chunk) {
    this.buffer += chunk;
    let nl;
    while ((nl = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // stray non-JSON output
      }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        const errorText = msg.error
          ? String(msg.error.message || JSON.stringify(msg.error))
          : msg.result && msg.result.isError
            ? (msg.result.content || []).map((part) => part.text || "").join("\n")
            : "";
        if (p.method === "tools/call" && upstreamOutcomeUnknown(errorText)) {
          p.reject(this._unknownOutcome(p, errorText));
        } else if (msg.error) {
          p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          p.resolve(msg.result);
        }
      }
    }
  }

  _send(obj) {
    if (!this.proc || !this.proc.stdin.writable) {
      throw new Error("Tembro's local bridge is not running");
    }
    this.proc.stdin.write(JSON.stringify(obj) + "\n");
  }

  _request(method, params, timeoutMs) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const request = {
        id,
        method,
        toolName: method === "tools/call" ? params.name : undefined,
        resolve,
        reject,
        sent: false,
      };
      const timer = setTimeout(() => {
        // Sent-call timeouts have unknown outcomes: reject, never resend.
        this.pending.delete(id);
        const reason = "MCP request timed out: " + (request.toolName || method);
        reject(
          request.sent && method === "tools/call"
            ? this._unknownOutcome(request, reason)
            : new Error(reason),
        );
      }, timeoutMs || 60000);
      request.timer = timer;
      this.pending.set(id, request);
      try {
        this._send({ jsonrpc: "2.0", id, method, params: params || {} });
        request.sent = true;
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  async _ensureInitialized() {
    if (this.initialized) return;
    this.start();
    await this._request("initialize", {
      protocolVersion: "2024-11-05",
      clientInfo: { name: "tembro", version: "0.1.8-beta.1" },
      capabilities: {},
    });
    this._send({ jsonrpc: "2.0", method: "notifications/initialized" });
    this.initialized = true;
  }

  /**
   * Call one MCP tool. Requests are chained on an internal queue so only one
   * Live call is ever in flight.
   * @returns {Promise<object>} the tool's structured result
   */
  callTool(name, args, timeoutMs) {
    const run = async () => {
      // Check when the queued call starts: an earlier request may have
      // timed out since this call was queued.
      this._assertAvailable(name);
      await this._ensureInitialized();
      const result = await this._request(
        "tools/call",
        { name, arguments: args || {} },
        timeoutMs,
      );
      if (result && result.isError) {
        const text =
          (result.content && result.content[0] && result.content[0].text) ||
          JSON.stringify(result);
        throw new Error("tool " + name + " failed: " + text);
      }
      if (result && result.structuredContent !== undefined) {
        return result.structuredContent;
      }
      const text = result && result.content && result.content[0] && result.content[0].text;
      if (typeof text === "string") {
        try {
          return JSON.parse(text);
        } catch {
          return { text };
        }
      }
      return result;
    };
    // Chain regardless of previous outcome, but propagate this call's result.
    const p = this.queue.then(run, run);
    this.queue = p.then(
      () => undefined,
      () => undefined,
    );
    return p;
  }

  /** Return the MCP server's advertised tools and schemas (cached per process). */
  listTools() {
    const run = async () => {
      this._assertAvailable("tools/list");
      await this._ensureInitialized();
      if (this.tools) return this.tools;
      const result = await this._request("tools/list", {}, 30_000);
      if (!result || !Array.isArray(result.tools)) {
        throw new Error("MCP server returned no tool list");
      }
      this.tools = result.tools;
      return this.tools;
    };
    const p = this.queue.then(run, run);
    this.queue = p.then(
      () => undefined,
      () => undefined,
    );
    return p;
  }
}

module.exports = { McpClient };
