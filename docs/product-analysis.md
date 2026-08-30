# Product analysis — from proof to product

Status: discussion document, 2026-08-30. Written after the first real distribution
test (setup on a second Mac, for a Bitwig user who knows Ableton) and prompted by
the existence of commercial competitors (e.g. Studio Pilot).

Note: `docs/architecture.md` explicitly lists "a commercial or distributable
product" and "Max for Live UI" as non-goals — for the *proof* phase, which has
passed. This document is the start of the next conversation; architecture.md
should be updated when a direction is decided.

## What the distribution test revealed

Giving the repo to a second user was the first real-world test, and it exposed
the actual product problem: ~23 environment-dependent fixes, manual Homebrew and
Python installs, hand-applied patches (the M4L symlink, the `float_window`
patch), manual Control Surface selection. `SETUP.md` estimates 20–30 minutes for
a technical user — an average musician abandons at step 2.

The positive result matters just as much: **the chain is replicable on another
Mac**. The problem is not the architecture, it is the packaging.

## How the competitors work (the "Studio Pilot" model)

Products like Studio Pilot typically work as follows:

1. **UI inside Ableton** — a Max for Live device that opens a `jweb` window
   (Max's embedded browser). The chat lives there; the user never touches a
   terminal.
2. **Who pays for tokens** — two possible models:
   - **Vendor keys + subscription** (the ~€30/month): the device talks to the
     vendor's cloud backend, which calls OpenAI/Anthropic with the vendor's
     keys. The subscription covers API costs with margin, usually with usage
     limits ("credits"). Dominant model because the user never needs to know
     what an API key is.
   - **BYO-key**: the user pastes their own OpenAI/Anthropic key and pays the
     provider directly. Zero API cost for the vendor, but a more technical
     audience.
3. When many people use your credits, you meter usage per account and bill for
   it — that is exactly what the subscription is for.

## Our differentiators

Compared to those products, this repo already has things they do not emphasize:
readback after every mutation, signature-guarded writes, disposable Sets, bridge
validation, and the musical skills (`beat-making`, `harmony-melody`,
`song-from-scratch`) that encode *musical method*, not patterns. The MCP
approach is host-neutral: it works with Claude Code, Codex, or any future host,
while Studio Pilot is closed inside its own device.

## Proposed plan, in phases

### Phase 0 — Consolidate current distribution (now, nearly free)

- Turn the second-Mac experience into concrete issues: list the ~23 fixes and
  absorb them into `setup.sh` (which already exists and already automates part
  of `SETUP.md`).
- Measurable goal: "clone + `./setup.sh` + open Live" works on a clean Mac with
  no manual intervention. Test on a third machine (or the same second Mac,
  again, from scratch).
- Document the real minimum prerequisites (is the Live 12 trial enough? is
  Suite needed for M4L? `SETUP.md` says Suite/trial is needed for the cockpit —
  clarify).

### Phase 1 — Validate demand without building anything

- Natural target: musicians curious about AI who do *not* want a terminal. The
  Bitwig-user-who-knows-Ableton tester is already an interesting persona.
- Decide the positioning versus Studio Pilot: (a) "pro agent, open, BYO-account"
  for power users, or (b) a closed consumer product with a subscription. These
  are two different products with different economics.
- The BYO-account model is what already exists: the user uses their *own*
  Claude/Codex account. Zero API costs, zero backend, zero credit management.
  Lowest-risk path for a v1.

### Phase 2 — Close the UX gap (the window inside Live)

- The repo already has the pieces: the M4L tools are unlocked
  (`live_agent_m4l_device`, `live_visual_capture`, …), the `float_window` patch
  exists in `liveworks/`, and the M4L device build
  (`ableton-live-mcp-build-m4l-device`) works. "Chat in an M4L jweb window
  talking to the local agent" is technically within reach.
- Minimal first iteration: not a full chat, but an M4L window showing the
  agent's *state* (what it is doing, what it is asking to approve), with input
  still in the terminal. Then, if that holds, input in the window.
- The agent stays local (MCP host on the user's Mac): no cloud, no vendor key
  management.

### Phase 3 — Only if Phases 1–2 get traction: subscription model

- Proxy backend with vendor keys, per-user metering, billing (Stripe), usage
  limits. A jump in complexity and responsibility (API costs, abuse, privacy of
  musical data transiting the vendor's server) — only worth it with a real
  demand signal.

## Risks to watch

- **Pinned upstream dependency** (`ableton-live-mcp` at a 2026-07 commit, no
  tags): a product needs either a maintained fork or an upstream
  agreement/contribution, plus a license check.
- **Live compatibility**: validation covers only the tested Live version; a
  product must survive Live updates.
- **Bitwig**: the bridge is Ableton-specific (Remote Script + LOM). Porting to
  Bitwig is a separate project, not an extension.

## Suggested next concrete step

Write down the list of the ~23 things fixed for the second-Mac setup: it is the
Phase 0 backlog and the most valuable empirical data currently available.
