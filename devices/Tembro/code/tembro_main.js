"use strict";

// Tembro node.script entry point (runs inside the Max for Live device).
//
// Wires: Max UI messages → backend chat → validated plan → local executor
// over the MCP/LOM bridge → exact readback → UI status.
//
// Configuration (no secrets, no provider keys — those live server-side):
//   ~/.tembro/config.json   { "api_base": "...", "mcp_command": "..." }
//   or env TEMBRO_API_BASE / TEMBRO_MCP_COMMAND.
// Session token: persisted by api.js at ~/.tembro/session.json.

const fs = require("fs");
const os = require("os");
const path = require("path");

const { TembroApi } = require("./api.js");
const { McpClient } = require("./mcp_client.js");
const { LomBridge } = require("./lom_bridge.js");
const { buildLiveContext } = require("./context.js");
const { executePlan } = require("./executor.js");

const maxApi = require("max-api");

function loadConfig() {
  const file = path.join(os.homedir(), ".tembro", "config.json");
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* optional */
  }
  return {
    apiBase: process.env.TEMBRO_API_BASE || cfg.api_base || "http://127.0.0.1:8787",
    mcpCommand:
      process.env.TEMBRO_MCP_COMMAND ||
      cfg.mcp_command ||
      path.join(os.homedir(), ".tembro", "bin", "ableton-live-mcp"),
  };
}

const config = loadConfig();
const api = new TembroApi(config.apiBase);
const client = new McpClient(config.mcpCommand);
const bridge = new LomBridge(client);

let conversationId = null;
let busy = false;

const STATE_MARK = { idle: "·", working: "⏳", success: "✓", error: "⚠" };

function ui(state, status) {
  maxApi.outlet(["state", state]);
  maxApi.outlet(["status", (STATE_MARK[state] || "") + " " + status]);
}

function transcript(who, text) {
  maxApi.outlet(["transcript", who + ": " + text]);
}

function reportAuth() {
  ui("idle", api.signedIn ? "connected · signed in" : "not signed in — send: signin your@email");
}

maxApi.addHandler("signin", async (email) => {
  try {
    ui("working", "signing in…");
    await api.devSignin(String(email));
    reportAuth();
    transcript("tembro", "signed in as " + email);
  } catch (err) {
    ui("error", "sign-in failed: " + err.message);
  }
});

maxApi.addHandler("chat", async (...words) => {
  const message = words.join(" ").trim();
  if (!message) return;
  if (busy) {
    ui("working", "one request at a time — still working");
    return;
  }
  busy = true;
  transcript("you", message);
  try {
    // 1. Live context (read-only), immediately before the request.
    ui("working", "reading Live context…");
    const liveContext = await buildLiveContext(bridge);

    // 2. Backend chat → validated plan.
    ui("working", "thinking…");
    const res = await api.chat(message, liveContext, conversationId);
    conversationId = res.conversation_id;
    transcript("tembro", res.reply);

    // 3. Guarded local execution + exact readback.
    const plan = res.actions || [];
    if (plan.length === 0) {
      ui("success", "done (no Live changes) · credits: " + res.credits_remaining);
      return;
    }
    ui("working", "applying " + plan.length + " change(s) in Live…");
    const outcome = await executePlan(plan, bridge, {
      onEvent: (kind, payload) => api.reportEvent(kind, payload),
    });
    if (outcome.ok) {
      ui("success", "done · verified in Live · credits: " + res.credits_remaining);
    } else {
      const e = outcome.error;
      ui(
        "error",
        "stopped at step " + (e.index + 1) + " (" + e.op + ", " + e.stage + "): " + e.message,
      );
      transcript("tembro", "⚠ " + e.message);
    }
  } catch (err) {
    ui("error", err.message);
    api.reportEvent("client.error", { message: err.message });
  } finally {
    busy = false;
  }
});

maxApi.addHandler("status", reportAuth);

reportAuth();
maxApi.post("Tembro ready · api=" + config.apiBase);
