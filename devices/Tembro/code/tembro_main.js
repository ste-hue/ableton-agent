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
const { ClipVariation } = require("./clip_variation.js");
const { validateRuntime } = require("./runtime_preflight.js");
const clipboard = require("./clipboard.js");
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
const variation = new ClipVariation({
  client,
  preflight: () => validateRuntime(config.mcpCommand),
  onState: (state) => maxApi.outlet(["variation_state", JSON.stringify(state)]),
});

let conversationId = null;
let busy = false;
let updateUrl = null;
const DEVICE_VERSION = "0.1.7-beta.1";

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
  // The page's dead-engine watchdog runs during any busy phase, so the
  // heartbeat must cover license activation too — a slow server response
  // would otherwise be misreported as a dead engine after 20s.
  const heartbeat = setInterval(() => maxApi.outlet(["engine", "alive"]), 5000);
  try {
    if (!email || !licenseKey) throw new Error("enter email and access code");
    ui("working", "connecting…");
    const result = await api.licenseSignin(String(email), String(licenseKey));
    reportAuth();
    maxApi.outlet(["credits", result.credits]);
    transcript("tembro", "access active · credits: " + result.credits);
  } catch (err) {
    ui("error", "connection failed: " + err.message);
  } finally {
    clearInterval(heartbeat);
  }
});

// Clipboard bridge for the page: jweb denies navigator.clipboard, so paste and
// copy fall back to the macOS pasteboard via the engine. Payloads are base64.
maxApi.addHandler("clipboard", async (op, payload) => {
  try {
    if (op === "read") {
      const text = await clipboard.readClipboard();
      maxApi.outlet(["clipboard", "text", clipboard.encodeText(text)]);
    } else if (op === "write") {
      await clipboard.writeClipboard(clipboard.decodeText(payload));
      maxApi.outlet(["clipboard", "written"]);
    }
  } catch (err) {
    maxApi.outlet(["clipboard", "error", String(err && err.message ? err.message : err)]);
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

// The current token belongs to exactly one run and is never reset. Stopping
// prevents another operation; an already sent Live call must first settle or
// enter transport quarantine before this run releases the shared busy lane.
let activeRun = null;
const TURN_SOFT_TIMEOUT_MS = 840000;
const TURN_HARD_TIMEOUT_MS = 900000;
const CONTEXT_TIMEOUT_MS = 30000;
const HEARTBEAT_MS = 5000;

// Messages typed while a turn is running are queued (echoed into the
// transcript right away) and start on their own when the turn finishes.
// /stop drops the queue along with the running turn.
const pendingChats = [];
const PENDING_MAX = 3;

async function handleChat(message, skill = null, echoed = false) {
  message = String(message || "").trim();
  if (!message) return;
  if (message === "/stop") {
    pendingChats.length = 0;
    if (busy && activeRun) {
      activeRun.stopped = true;
      ui("working", "stopping…");
    }
    return;
  }
  if (client.quarantined) {
    pendingChats.length = 0;
    if (!echoed) transcript("you", message);
    transcript("tembro", "Live's previous operation has an unknown outcome. Reconciliation is required before another request can run.");
    ui("error", "Live outcome unknown · requests blocked");
    return;
  }
  if (busy) {
    if (activeRun && activeRun.kind === "variation") {
      if (!echoed) transcript("you", message);
      transcript("tembro", "waiting for the clip variation to be verified in Live — resend this request when it finishes");
      return;
    }
    if (activeRun && activeRun.stopped) {
      if (!echoed) transcript("you", message);
      transcript("tembro", "still waiting for the previous Live operation to settle — this request will not run; resend it once stopping finishes");
      ui("working", "stopping · waiting for Live");
      return;
    }
    if (pendingChats.length >= PENDING_MAX) {
      // Never destroy what the user typed: echo it and say it won't run.
      transcript("you", message);
      transcript(
        "tembro",
        "the queue is full — this one will NOT run; resend it when I finish (or send /stop)",
      );
      ui("working", "queue is full — still working (send /stop to abort)");
      return;
    }
    pendingChats.push({ message, skill });
    transcript("you", message);
    ui("working", "queued — still working, this starts when the current run finishes");
    return;
  }
  busy = true;
  const run = { stopped: false, kind: "chat" };
  activeRun = run;
  const ensureRunning = () => {
    if (run.stopped) {
      const err = new Error(run.reason || "stopped by user");
      err.stopped = true;
      throw err;
    }
  };
  const watchdog = setTimeout(() => {
    run.stopped = true;
    run.reason = "turn time limit reached";
    ui("working", "time limit reached · waiting for Live to settle");
  }, TURN_SOFT_TIMEOUT_MS);
  const hardWatchdog = setTimeout(() => {
    run.stopped = true;
    run.reason = "turn exceeded its hard time limit";
    // Do not abandon local promises: the transport timeout determines when
    // the lane is usable again, or quarantines it if the outcome is unknown.
    ui("working", "time limit reached · waiting for Live to settle");
  }, TURN_HARD_TIMEOUT_MS);
  let contextWatchdog = null;
  // The page frees its own spinner if these stop arriving (dead engine).
  const heartbeat = setInterval(() => maxApi.outlet(["engine", "alive"]), HEARTBEAT_MS);
  if (!echoed) transcript("you", message);
  try {
    // 1. Live context (read-only), immediately before the request. This phase
    // gets its own deadline. A stopped context build cannot keep issuing
    // reads in the background while a subsequent turn starts mutating Live.
    ui("working", "reading Live context…");
    contextWatchdog = setTimeout(() => {
      run.stopped = true;
      run.reason = "could not read Live within " + CONTEXT_TIMEOUT_MS / 1000 + "s";
      ui("working", "context timed out · waiting for Live to settle");
    }, CONTEXT_TIMEOUT_MS);
    const contextBridge = new LomBridge({
      callTool: (name, args) => {
        ensureRunning();
        return client.callTool(name, args);
      },
    });
    const liveContext = await buildLiveContext(contextBridge);
    clearTimeout(contextWatchdog);
    contextWatchdog = null;
    ensureRunning();

    const trackCount = (liveContext.tracks || []).length;
    const tempo = liveContext.tempo ? liveContext.tempo + " BPM" : "tempo unknown";
    maxApi.outlet(["context", tempo + " · " + trackCount + " tracks"]);

    // 2. Server-side model ↔ local MCP loop. Tool calls execute one at a time
    // and every result goes back to the model before it decides what to do next.
    const res = await runAgentTurn({
      api,
      client,
      message,
      skill,
      liveContext,
      conversationId,
      shouldStop: () => run.stopped,
      onStatus: (status) => ui("working", status),
      onStep: (current, maximum) => {
        maxApi.outlet(["progress", current, maximum]);
      },
      onTool: (kind, call, result) => {
        if (kind === "progress") {
          maxApi.outlet([
            "step",
            "progress",
            call.call_id || "",
            call.name,
            JSON.stringify(result || {}),
          ]);
          return;
        }
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
    ensureRunning();
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
    if (client.quarantined || (err && err.outcomeUnknown)) {
      transcript("tembro", "Live's previous operation has an unknown outcome. No further requests will run until its effects are reconciled.");
      ui("error", "Live outcome unknown · requests blocked");
    } else if (err && err.stopped) {
      transcript(
        "tembro",
        "stopped — no further actions were scheduled; an operation that had already started may have changed the Set",
      );
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
    clearTimeout(hardWatchdog);
    if (contextWatchdog) clearTimeout(contextWatchdog);
    clearInterval(heartbeat);
    activeRun = null;
    busy = false;
    // A 401 cleared the session: queued messages can only fail the same way,
    // and running them would bury the sign-in view under fresh errors.
    if (!api.signedIn || client.quarantined || run.stopped) pendingChats.length = 0;
    const next = pendingChats.shift();
    if (next) {
      setImmediate(() => {
        handleChat(next.message, next.skill, true).catch(() => {});
      });
    }
  }
}

maxApi.addHandler("chat", async (...words) => {
  await handleChat(words.join(" "));
});

maxApi.addHandler("chat_skill", async (skill, ...words) => {
  await handleChat(words.join(" "), String(skill || "") || null);
});

maxApi.addHandler("variation", async (action, pitch) => {
  if (busy || !api.signedIn) {
    variation.publish();
    return;
  }
  busy = true;
  const run = { stopped: false, kind: "variation" };
  activeRun = run;
  const heartbeat = setInterval(() => maxApi.outlet(["engine", "alive"]), HEARTBEAT_MS);
  ui("working", "checking clip variation in Live…");
  try {
    await variation.execute(String(action), pitch, () => run.stopped);
    ui(client.quarantined ? "error" : "success", client.quarantined ? "Live outcome unknown · requests blocked" : run.stopped ? "stopped · sent operation checked" : "clip variation checked in Live");
  } catch (error) {
    ui("error", error.message);
  } finally {
    clearInterval(heartbeat);
    activeRun = null;
    busy = false;
    variation.publish();
  }
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
  variation.publish();
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

// Best-effort: never leave the bridge child orphaned holding the 8765 socket
// when the engine goes away (device removed, Live quits, node crashes).
process.on("exit", () => client.stop());
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    client.stop();
    process.exit(0);
  });
}

reportAuth();
startUiLoad();
maxApi.post("Tembro ready · api=" + config.apiBase);
