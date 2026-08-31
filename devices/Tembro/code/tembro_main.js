"use strict";

// Tembro node.script entry point (runs inside the Max for Live device).
//
// Wires: Max UI messages → server-side OpenAI agent → local MCP tools →
// tool results back to the agent until it returns a verified final response.
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
const { completionReply, runAgentTurn } = require("./agent_loop.js");
const { spawn } = require("child_process");

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
let updateUrl = null;
const DEVICE_VERSION = "0.1.3-beta";

const STATE_MARK = { idle: "·", working: "⏳", success: "✓", error: "⚠" };

function ui(state, status) {
  maxApi.outlet(["state", state]);
  maxApi.outlet(["status", (STATE_MARK[state] || "") + " " + status]);
}

function transcript(who, text) {
  maxApi.outlet(["transcript", who, String(text)]);
}

function compactToolArgs(args) {
  const compact = {};
  for (const [key, value] of Object.entries(args || {})) {
    if (Array.isArray(value)) {
      compact[key] = value.length > 6 ? `[${value.length} items]` : value;
    } else if (value && typeof value === "object") {
      const encoded = JSON.stringify(value);
      compact[key] = encoded.length > 180 ? encoded.slice(0, 177) + "…" : value;
    } else if (typeof value === "string" && value.length > 160) {
      compact[key] = value.slice(0, 157) + "…";
    } else {
      compact[key] = value;
    }
  }
  const encoded = JSON.stringify(compact);
  return encoded.length > 700
    ? JSON.stringify({ preview: encoded.slice(0, 660) + "…" })
    : encoded;
}

function reportAuth() {
  maxApi.outlet(["auth", api.signedIn ? "connected" : "disconnected"]);
  ui(
    "idle",
    api.signedIn ? "connected · access active" : "connect with email + access code",
  );
}

maxApi.addHandler("license", async (email, licenseKey) => {
  try {
    if (!email || !licenseKey) throw new Error("enter email and access code");
    ui("working", "connecting…");
    const result = await api.licenseSignin(String(email), String(licenseKey));
    reportAuth();
    maxApi.outlet(["credits", result.credits]);
    transcript("tembro", "access active · credits: " + result.credits);
  } catch (err) {
    ui("error", "connection failed: " + err.message);
  }
});

// Local development only. The production device uses the `license` handler.
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

// A turn must never leave the device stuck: the user can stop it, and a
// watchdog abandons it on its own. Soft stop aborts between steps; the hard
// race frees the UI even if a single await hangs past every other timeout.
let stopRequested = false;
const TURN_SOFT_TIMEOUT_MS = 840000;
const TURN_HARD_TIMEOUT_MS = 900000;

async function handleChat(message, skill = null) {
  message = String(message || "").trim();
  if (!message) return;
  if (message === "/stop") {
    if (busy) {
      stopRequested = true;
      ui("working", "stopping…");
    }
    return;
  }
  if (busy) {
    ui("working", "one request at a time — still working (send /stop to abort)");
    return;
  }
  busy = true;
  stopRequested = false;
  const watchdog = setTimeout(() => {
    stopRequested = true;
  }, TURN_SOFT_TIMEOUT_MS);
  transcript("you", message);
  try {
    // 1. Live context (read-only), immediately before the request.
    ui("working", "reading Live context…");
    const liveContext = await buildLiveContext(bridge);

    const trackCount = (liveContext.tracks || []).length;
    const tempo = liveContext.tempo ? liveContext.tempo + " BPM" : "tempo unknown";
    maxApi.outlet(["context", tempo + " · " + trackCount + " tracks"]);

    // 2. Server-side model ↔ local MCP loop. Tool calls execute one at a time
    // and every result goes back to the model before it decides what to do next.
    const turn = runAgentTurn({
      api,
      client,
      message,
      skill,
      liveContext,
      conversationId,
      shouldStop: () => stopRequested,
      onStatus: (status) => ui("working", status),
      onStep: (current, maximum) => {
        maxApi.outlet(["progress", current, maximum]);
      },
      onTool: (kind, call, result) => {
        maxApi.outlet([
          "step",
          kind,
          call.call_id || "",
          call.name,
          compactToolArgs(call.arguments),
        ]);
        if (kind === "success") {
          api.reportEvent("action.executed", {
            tool: call.name,
            arguments: call.arguments,
          });
        } else if (kind === "error") {
          api.reportEvent("action.failed", {
            tool: call.name,
            arguments: call.arguments,
            error: result && result.error,
          });
        }
      },
    });
    const res = await Promise.race([
      turn,
      new Promise((_, reject) =>
        setTimeout(() => {
          const err = new Error("turn abandoned after " + TURN_HARD_TIMEOUT_MS / 1000 + "s");
          err.stopped = true;
          reject(err);
        }, TURN_HARD_TIMEOUT_MS),
      ),
    ]);
    conversationId = res.conversation_id;
    const finalReply = completionReply(res.reply);
    transcript("tembro", finalReply);
    maxApi.outlet(["credits", res.credits_remaining]);
    maxApi.outlet(["charge", res.credits_charged || 1]);
    ui(
      "success",
      "Ho finito · " + (res.credits_charged || 1) + " credits · " + res.credits_remaining + " left",
    );
  } catch (err) {
    if (err && err.stopped) {
      transcript("tembro", "stopped — ready for the next message");
      ui("idle", "stopped · ready");
    } else {
      ui("error", err.message);
      api.reportEvent("client.error", { message: err.message });
      // A 401 cleared the stored session; tell the page so it returns to the
      // (prefilled) sign-in view instead of a chat that can never work.
      if (!api.signedIn) reportAuth();
    }
  } finally {
    clearTimeout(watchdog);
    busy = false;
  }
}

maxApi.addHandler("chat", async (...words) => {
  await handleChat(words.join(" "));
});

maxApi.addHandler("chat_skill", async (skill, ...words) => {
  await handleChat(words.join(" "), String(skill || "") || null);
});

maxApi.addHandler("status", reportAuth);

// The bundled Max 9 runtime does not reliably deliver the chat subpatcher's
// loadmess to jweb (the same defect that forced the explicit loadbang → delay
// → script start chain for this node.script), which leaves the chat window
// blank. Node's outlet feeds the jweb inlet directly, so re-send readfile
// with an absolute path until the page reports ui_ready. Flattened customer
// bundles keep tembro_ui.html next to this file; the dev tree keeps it one
// level up.
const UI_PAGE = [
  path.join(__dirname, "tembro_ui.html"),
  path.join(__dirname, "..", "tembro_ui.html"),
].find((candidate) => fs.existsSync(candidate));
// jweb's internal file server 404s on absolute paths, so lead with the bare
// filename (resolved through Max's search path, which includes the device
// folder) and keep file:// and absolute forms as fallbacks.
const UI_LOAD_KICKS = [
  ["readfile", "tembro_ui.html"],
  UI_PAGE ? ["url", "file://" + UI_PAGE] : null,
  UI_PAGE ? ["readfile", UI_PAGE] : null,
].filter(Boolean);
const UI_LOAD_RETRY_MS = 1500;
const UI_LOAD_MAX_TRIES = 40;

let uiLoadTimer = null;
let uiLoadTries = 0;

function stopUiLoad() {
  if (uiLoadTimer) {
    clearInterval(uiLoadTimer);
    uiLoadTimer = null;
  }
}

function startUiLoad() {
  if (!UI_PAGE) {
    maxApi.post("Tembro: tembro_ui.html not found next to the device");
  }
  const send = () => {
    if (uiLoadTries >= UI_LOAD_MAX_TRIES) {
      stopUiLoad();
      return;
    }
    maxApi.outlet(UI_LOAD_KICKS[uiLoadTries % UI_LOAD_KICKS.length]);
    uiLoadTries += 1;
  };
  uiLoadTimer = setInterval(send, UI_LOAD_RETRY_MS);
  send();
}

maxApi.addHandler("ui_ready", async () => {
  stopUiLoad();
  reportAuth();
  if (api.signedIn) {
    try {
      const balance = await api.credits();
      if (balance !== null) maxApi.outlet(["credits", balance]);
    } catch {
      /* the normal status line already describes the session */
    }
  }
  try {
    const skills = await api.skills();
    if (skills) maxApi.outlet(["skills", JSON.stringify(skills)]);
  } catch {
    /* bundled skill buttons remain available if the server cannot be reached */
  }
  try {
    const latest = await api.version();
    if (latest && latest.version !== DEVICE_VERSION && latest.download_url) {
      updateUrl = latest.download_url;
      maxApi.outlet(["update", latest.version]);
    }
  } catch {
    /* update checks never block music-making */
  }
});

maxApi.addHandler("open_update", () => {
  if (!updateUrl || !/^https:\/\//.test(updateUrl)) return;
  const child = spawn("open", [updateUrl], { detached: true, stdio: "ignore" });
  child.unref();
});

const DOC_HOSTS = new Set(["docs.cycling74.com", "www.ableton.com"]);

maxApi.addHandler("open_doc", (rawUrl) => {
  try {
    const url = new URL(String(rawUrl || ""));
    if (url.protocol !== "https:" || !DOC_HOSTS.has(url.hostname)) return;
    const child = spawn("open", [url.toString()], { detached: true, stdio: "ignore" });
    child.unref();
  } catch {
    /* only fixed official documentation URLs are accepted */
  }
});

reportAuth();
startUiLoad();
maxApi.post("Tembro ready · api=" + config.apiBase);
