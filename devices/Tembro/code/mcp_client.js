"use strict";

// Minimal MCP stdio client for the pinned upstream `ableton-live-mcp` server
// (newline-delimited JSON-RPC 2.0: initialize → notifications/initialized →
// tools/call). Enforces one request in flight — all Live calls are sequential
// by construction (AGENTS.md hard rule).

const { spawn } = require("child_process");

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
    this.pending = new Map(); // id → {resolve, reject, timer}
    this.queue = Promise.resolve(); // serializes requests: one in flight
    this.buffer = "";
    this.initialized = false;
    this.tools = null;
  }

  start() {
    if (this.proc) return;
    this.proc = spawn(this.command, this.args, {
      stdio: ["pipe", "pipe", "inherit"],
    });
    this.proc.stdout.setEncoding("utf8");
    this.proc.stdout.on("data", (chunk) => this._onData(chunk));
    // Without these handlers a missing or broken bridge executable raises an
    // uncaught 'error'/EPIPE and kills the whole node.script engine instead of
    // failing this one call with a message the user can act on.
    this.proc.on("error", (spawnError) => {
      this._failAll(
        new Error(
          "Tembro's local bridge is not installed or failed to start (" +
            this.command +
            "): " +
            (spawnError && spawnError.message ? spawnError.message : spawnError),
        ),
      );
    });
    this.proc.stdin.on("error", () => {
      /* the paired 'exit'/'error' event rejects the pending requests */
    });
    this.proc.on("exit", () => {
      this._failAll(new Error("MCP server process exited"));
    });
  }

  _failAll(err) {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
    this.proc = null;
    this.initialized = false;
    this.tools = null;
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
        if (msg.error) {
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
      const timer = setTimeout(() => {
        // Sent-call timeouts have unknown outcomes: reject, never resend.
        this.pending.delete(id);
        reject(new Error("MCP request timed out: " + method + " (outcome unknown — do not resend)"));
      }, timeoutMs || 60000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this._send({ jsonrpc: "2.0", id, method, params: params || {} });
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
      clientInfo: { name: "tembro", version: "0.1.0" },
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
