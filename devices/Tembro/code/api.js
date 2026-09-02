"use strict";

// Tembro backend client — HTTPS calls to the Tembro server (/v0/*).
// No LLM provider key ever lives here: the device only holds a session token,
// persisted locally for development at ~/.tembro/session.json.

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const TOKEN_DIR = path.join(os.homedir(), ".tembro");
const TOKEN_FILE = path.join(TOKEN_DIR, "session.json");

function loadSession(sessionFile = TOKEN_FILE) {
  try {
    const data = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
    return {
      token: typeof data.token === "string" ? data.token : null,
      instanceId: typeof data.instance_id === "string" ? data.instance_id : null,
    };
  } catch {
    return { token: null, instanceId: null };
  }
}

function saveSession(sessionFile, token, instanceId) {
  fs.mkdirSync(path.dirname(sessionFile), { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    sessionFile,
    JSON.stringify({ token, instance_id: instanceId }) + "\n",
    { mode: 0o600 },
  );
}

const DEFAULT_TIMEOUT_MS = 120000;
// Agent steps can legitimately think for minutes on big arrangement plans;
// the device-side turn watchdogs (840/900s) remain the real backstop.
const AGENT_TIMEOUT_MS = 300000;

function request(baseUrl, method, pathName, body, token, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, baseUrl);
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const headers = { accept: "application/json" };
    if (payload) {
      headers["content-type"] = "application/json";
      headers["content-length"] = payload.length;
    }
    if (token) headers.authorization = "Bearer " + token;
    const lib = url.protocol === "http:" ? http : https;
    const req = lib.request(
      url,
      { method, headers, timeout: timeoutMs || DEFAULT_TIMEOUT_MS },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            /* non-JSON error body */
          }
          resolve({ status: res.statusCode, json });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

class TembroApi {
  /** @param {string} baseUrl e.g. https://api.tembro.ai or http://127.0.0.1:8787 (dev) */
  constructor(baseUrl, sessionFile = TOKEN_FILE, requestImpl = request) {
    this.baseUrl = baseUrl;
    this.sessionFile = sessionFile;
    this.request = requestImpl;
    const session = loadSession(sessionFile);
    this.token = session.token;
    this.instanceId = session.instanceId;
  }

  /** Activate a paid license or free-beta access code and persist the session. */
  async licenseSignin(email, licenseKey, instanceName = os.hostname()) {
    const body = {
      email,
      license_key: licenseKey,
      instance_name: instanceName || "Ableton workstation",
    };
    if (this.instanceId) body.instance_id = this.instanceId;
    const res = await this.request(this.baseUrl, "POST", "/v0/auth/license", body);
    if (res.status !== 200 || !res.json || !res.json.token || !res.json.instance_id) {
      throw new Error("access activation failed (" + res.status + ")");
    }
    this.token = res.json.token;
    this.instanceId = res.json.instance_id;
    saveSession(this.sessionFile, this.token, this.instanceId);
    return res.json;
  }

  get signedIn() {
    return Boolean(this.token);
  }

  /** A 401 means the server no longer honors this token: forget it, so the
   * UI returns to the (prefilled) sign-in view instead of a stranded chat. */
  clearSession() {
    this.token = null;
    try {
      fs.unlinkSync(this.sessionFile);
    } catch {
      /* already gone */
    }
  }

  /** Dev sign-in (server must run with dev-signin enabled). Persists the token. */
  async devSignin(email) {
    const res = await this.request(this.baseUrl, "POST", "/v0/auth/dev-signin", { email });
    if (res.status !== 200 || !res.json || !res.json.token) {
      throw new Error("sign-in failed (" + res.status + ")");
    }
    this.token = res.json.token;
    saveSession(this.sessionFile, this.token, this.instanceId);
    return res.json;
  }

  /** Start one V0.2 agent turn. The server charges exactly once here. */
  async agentStart(message, liveContext, tools, conversationId, skill) {
    if (!this.token) throw new Error("not signed in");
    const body = {
      kind: "start",
      protocol_version: "0.2",
      request_id: crypto.randomUUID(),
      message,
      tools,
    };
    if (skill) body.skill = skill;
    if (liveContext) body.live_context = liveContext;
    if (conversationId) body.conversation_id = conversationId;
    const res = await this.request(
      this.baseUrl,
      "POST",
      "/v0/agent",
      body,
      this.token,
      AGENT_TIMEOUT_MS,
    );
    return this._agentResponse(res);
  }

  /** Continue a charged turn after executing the requested MCP tools locally. */
  async agentContinue(continuationToken, conversationId, tools, toolOutputs) {
    if (!this.token) throw new Error("not signed in");
    const res = await this.request(
      this.baseUrl,
      "POST",
      "/v0/agent",
      {
        kind: "continue",
        protocol_version: "0.2",
        continuation_token: continuationToken,
        conversation_id: conversationId,
        tools,
        tool_outputs: toolOutputs,
      },
      this.token,
      AGENT_TIMEOUT_MS,
    );
    return this._agentResponse(res);
  }

  _agentResponse(res) {
    if (res.status === 401) {
      this.clearSession();
      throw new Error("session or agent continuation expired");
    }
    if (res.status === 402) {
      const required = res.json && res.json.credits_required;
      throw new Error(required ? "this needs " + required + " credits" : "out of credits");
    }
    if (res.status === 422 && res.json && res.json.error === "agent_step_limit") {
      throw new Error("agent stopped after too many Live steps");
    }
    if (res.status === 502 && res.json && res.json.error === "agent_provider_error") {
      const balance =
        typeof res.json.credits_remaining === "number"
          ? " (credits refunded — balance: " + res.json.credits_remaining + ")"
          : "";
      throw new Error(
        (res.json.detail || "the model call failed; try again") + balance,
      );
    }
    if (res.status !== 200 || !res.json) {
      const detail = res.json && res.json.error ? ": " + res.json.error : "";
      throw new Error("agent failed (" + res.status + ")" + detail);
    }
    return res.json;
  }

  async credits() {
    if (!this.token) return null;
    const res = await this.request(this.baseUrl, "GET", "/v0/credits", undefined, this.token);
    if (res.status === 401) {
      this.clearSession();
      return null;
    }
    if (res.status !== 200 || !res.json || typeof res.json.credits !== "number") {
      throw new Error("could not read credits");
    }
    return res.json.credits;
  }

  async skills() {
    const res = await this.request(this.baseUrl, "GET", "/v0/skills");
    if (res.status !== 200 || !res.json || !Array.isArray(res.json.skills)) {
      return null;
    }
    return res.json.skills;
  }

  async version() {
    const res = await this.request(this.baseUrl, "GET", "/v0/version");
    if (res.status !== 200 || !res.json || typeof res.json.version !== "string") {
      return null;
    }
    return res.json;
  }

  /** POST /v0/events — agent outcomes / readback mismatches / client errors. */
  async reportEvent(kind, payload) {
    if (!this.token) return;
    try {
      await this.request(this.baseUrl, "POST", "/v0/events", { kind, payload }, this.token);
    } catch {
      // Telemetry must never break the user flow.
    }
  }
}

module.exports = { TembroApi, TOKEN_FILE, loadSession };
