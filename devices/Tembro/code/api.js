"use strict";

// Tembro backend client — HTTPS calls to the Tembro server (/v0/*).
// No LLM provider key ever lives here: the device only holds a session token,
// persisted locally for development at ~/.tembro/session.json.

const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const TOKEN_DIR = path.join(os.homedir(), ".tembro");
const TOKEN_FILE = path.join(TOKEN_DIR, "session.json");

function loadToken() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    return typeof data.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

function saveToken(token) {
  fs.mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token }) + "\n", { mode: 0o600 });
}

function request(baseUrl, method, pathName, body, token) {
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
      { method, headers, timeout: 120000 },
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
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = loadToken();
  }

  get signedIn() {
    return Boolean(this.token);
  }

  /** Dev sign-in (server must run with dev-signin enabled). Persists the token. */
  async devSignin(email) {
    const res = await request(this.baseUrl, "POST", "/v0/auth/dev-signin", { email });
    if (res.status !== 200 || !res.json || !res.json.token) {
      throw new Error("sign-in failed (" + res.status + ")");
    }
    this.token = res.json.token;
    saveToken(this.token);
    return res.json;
  }

  /** POST /v0/chat → { conversation_id, reply, actions, credits_remaining } */
  async chat(message, liveContext, conversationId) {
    if (!this.token) throw new Error("not signed in");
    const body = { message };
    if (liveContext) body.live_context = liveContext;
    if (conversationId) body.conversation_id = conversationId;
    const res = await request(this.baseUrl, "POST", "/v0/chat", body, this.token);
    if (res.status === 401) throw new Error("session expired — sign in again");
    if (res.status === 402) throw new Error("out of credits");
    if (res.status !== 200 || !res.json) {
      throw new Error("chat failed (" + res.status + ")");
    }
    return res.json;
  }

  /** POST /v0/events — executor outcomes / readback mismatches / client errors. */
  async reportEvent(kind, payload) {
    if (!this.token) return;
    try {
      await request(this.baseUrl, "POST", "/v0/events", { kind, payload }, this.token);
    } catch {
      // Telemetry must never break the user flow.
    }
  }
}

module.exports = { TembroApi, TOKEN_FILE };
