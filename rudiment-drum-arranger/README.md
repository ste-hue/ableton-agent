# Rudiment Drum Arranger

A dependency-free, browser-based electronic drum arrangement generator. This
project is a behavior-preserving migration of the latest single-file prototype
into a maintainable Codex Work project.

## Run locally

```sh
python3 -m http.server 4173 --directory rudiment-drum-arranger
```

Then open `http://127.0.0.1:4173`.

## Architecture

- `src/app/ui.js` — DOM rendering, controls, downloads and transport wiring
- `src/engine/core-config.js` — musical profiles, kit policy, shared state and narrative form
- `src/engine/arrangement-engine.js` — pattern families, section rendering and complete arrangement assembly
- `src/engine/fill-engine.js` — one fill genome, four-bar master and measure-level derivations
- `src/engine/theory-rudiment-engine.js` — subordinate Stick Control transformations and theory budget
- `src/engine/timing-velocity-engine.js` — swing/micro-timing policy
- `src/audio/synth-preview.js` — Web Audio preview voices and transport
- `src/midi/midi-renderer.js` — Standard MIDI File renderer and downloads
- `src/integrations/ableton-mcp-adapter.js` — explicit, inactive boundary for future Ableton/MCP work
- `reference/` — immutable copy of the migrated HTML baseline

The files use ordered classic scripts intentionally. That preserves the exact
prototype behavior while giving each subsystem a clear home. A later iteration
can convert these boundaries to ES modules without changing the music engine.

## Musical invariants

- Arrangement and section narrative outrank surface variation.
- The core groove remains recognizable through add/subtract transformations.
- One four-bar fill master supplies all 16/32/64-bar derivations.
- Stick Control and rudiments are budgeted detail, never the form generator.
- Seven independent kit families include a dedicated Shaker motion layer.
- Disabled kit families create neither events nor MIDI tracks; compatible fill
  voices may be re-orchestrated, while a disabled kick is simply omitted.
- Generate always chooses a fresh seed.
- Main Roll is one macro gesture with at most two transformations and a landing silence.
- Swing is circular: 0% and 100% are grid-aligned, while 50% produces the
  strongest displacement of alternating sixteenths.
- The eight-bar fill viewer shows the four-bar source genome followed by its
  first measure-level derivation.

## DAW-ready export

The compact export panel renders one merged arrangement clip or the canonical
four-bar master fill. Musical events remain semantic until export, so choosing a
DAW changes only pad notes—not rhythm, velocity or timing.

The adaptive content menu can export the full arrangement as one merged clip,
one Type 1 MIDI file with tracks separated by instrument family, or one selected
instrument only. The instrument selector always follows the currently enabled kit.

- Ableton Live: verified `909 Core Kit` pad layout
- Bitwig Studio: `Drum Machine` with a GM-compatible layout
- Logic Pro: `Drum Kit Designer`, `Default Preset`, input mapping `GM` (MIDI
  channel 1; shaker on GM note 82)

Arrangement lengths are locked to 8, 16, 32, 64, 96 or 128 bars. Each choice
uses a dedicated narrative form whose section lengths add up exactly to the
selected total.

## Baseline

`reference/rudiment-drum-arranger-baseline.html` is the exact latest prototype
used for this migration, including the distinct percussion preview voices.
