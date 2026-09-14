# Shared musical engines

## Status

Proposed, 2026-09-14. Private implementation in `feat/product-engines`.

## Context

Tembro should use Chordarium and Rudiment as actual musical engines. Both already
have deterministic JavaScript composition code independent of their product UIs.
ADR-0003 establishes the distinction between proposing material and changing a
Live Set. This integration supplies real material to that proposal boundary.

## Decision

### 1. Compose with the existing source engines

Generate pinned artifacts from the original source, without maintaining a second
implementation of harmony or rhythm. Chordarium provides its HouseEngine and
HouseArranger IIFEs, excluding embedded Scaler catalogs and the UI. Rudiment
provides its six original engine scripts, excluding its MIDI renderer, UI and
JUCE wrapper. Original product repositories continue to own musical logic.

Each provider validates input independently of the model's schema, checks its
source manifest and bundle hash, creates a fresh execution context and runs a
fixed entry point under a timeout. Only trusted pinned source is loaded: Node's
VM is not a security boundary for arbitrary code. Engine code is never supplied
by a tool argument, downloaded at runtime or executed in Live.

### 2. Share explicit musical proposals

`tembro.musical-proposal.v1` represents beat-time notes, engine identity,
configuration, harmony, semantic roles, nominal duration and actual note end.
Canonical content hashes include durations and provenance. Retained proposals
are immutable serialized values, capped at 16 proposals and 8 MiB per device
session. Old proposals expire explicitly; retrieval never silently regenerates.

The ensemble operation uses the overlapping duration range of 8 or 16 bars, 4/4,
and Chordarium's 90–145 BPM range. Chordarium produces chords and a bassline
derived from the same phrase; Rudiment produces drums over that duration. Their
relationship is recorded exactly: the bass depends on Chordarium's harmony;
drums share duration and seed. There is no claim that either engine imports an
arbitrary groove or infers another engine's intent. Tempo is composition context,
not an instruction to change the Set.

### 3. Make the engines callable by Tembro

The device advertises four local tools alongside its permitted MCP tools:
`tembro_chordarium_compose`, `tembro_rudiment_compose`,
`tembro_ensemble_compose`, and `tembro_proposal_notes`. The server allows these
exact names and binds their schemas to the existing continuation token. Local
names are reserved: a remote bridge cannot replace their schemas or receive
their execution. Engine calls share the existing turn/cancellation lane.

Composition returns a compact receipt. Notes are fetched from the retained
proposal in pages of at most 128, preventing model transfer limits from silently
truncating an arrangement. Rudiment events remain semantic until a complete
explicit role-to-pitch map is supplied. That map is identified as supplied, not
certified as current Live state. Existing kit inspection and Live mutation
checks remain necessary for placement, launch and readback.

### 4. Preserve release and account boundaries

The development version is `0.1.8-dev.1`. The notarized `0.1.7-beta.1` artifact and
Mac source are preserved. The baseline source was copied into an isolated
worktree and all 39 release-manifest hashes matched before new work began.

Local generation has no network or licensing endpoint and adds no separate
engine credit charge. A normal Tembro model turn retains its existing server-side
charge. This implementation changes neither product entitlements nor standalone
plugin licenses. It does not unarchive Rudiment or publish either engine.

## Consequences

- Tembro can coordinate three real musical parts through one request; standalone
  products retain their existing source and operation.
- Engine updates are explicit rebuilds from pinned sources with parity tests.
- Regenerating the same request against the same code is reproducible. A changed
  source, configuration or note duration changes the proposal identity.
- The offline CLI exercises the real providers without an Ableton connection.
  Device chat still uses the existing signed-in, connected Live session flow.
- Generated proposals are not auditioned audio, applied clips or retained user
  decisions. Those states require their own observed host operations.

## Open questions

- Expose a proposal review/audition panel with guarded host application.
- Define optional common groove/harmonic import contracts only when each engine
  can actually consume them.
- Decide production access to the combined engines through the existing product
  release process; no entitlement changes are implicit in this private prototype.

## Sources

Read and executed on 2026-09-14:

- [Chordarium source revision](https://github.com/ste-hue/ChordBloom-v1/commit/9551df98030260188b728e1bf8915ad145dabb15)
- [Rudiment source revision](https://github.com/ste-hue/rudiment/commit/e9fafb8d970f40fc8c3fd7147d6f550278aa9206)
- Provider manifests under `devices/Tembro/code/engines/` and their deterministic
  builders under `tools/`.
- [Studio-partner interaction](0003-studio-partner-interaction.md).
