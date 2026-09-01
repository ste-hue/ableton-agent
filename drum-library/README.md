# Ableton drum library prototype

This folder is a deterministic, pre-generated MIDI catalogue for the
`MAKEDRUMS [genre]` workflow. The customer-side command does not compose: it
selects an approved asset, checks its device profile, and returns the exact
notes to place in Ableton Live.

The catalogue routes each MIDI asset to an exact Ableton Drum Rack profile. The
initial rotation uses 909 Core Kit for techno, 707 Core Kit for disco, and 808
Core Kit for house. Pad assignments come from the installed ADG presets rather
than guessed General MIDI labels.

## Contents

- `manifest.json`: catalogue and genre-to-device routing.
- `devices/ableton-909-core-kit.json`: authoritative pad contract.
- `devices/installed-drum-kits.json`: extracted map of every installed Core/User
  Library Drum Rack, including pad sounds and recommended genre tags.
- `devices/live-verified-pad-maps.json`: PADREMAP cache populated from real Live
  LOM reads; this is the runtime authority used before placing MIDI.
- `midi/<genre>/`: one 128-bar, type-0 Standard MIDI arrangement per genre.
- `metadata/<genre>.json`: generated inspection data and musical sections.
- `tools/build_library.py`: dependency-free renderer and validator.
- `tools/makedrums.py`: deterministic catalogue selector and MIDI-to-LOM adapter.

## Build and validate

```bash
python3 drum-library/tools/build_library.py
python3 drum-library/tools/makedrums.py techno --format summary
python3 drum-library/tools/makedrums.py house --format lom-json
```

`lom-json` prints the selected asset plus its complete note list in the shape
needed by a Live clip-writing operation. It does not mutate Live by itself.

## Asset filename convention

Use lowercase ASCII and hyphens:

```text
<bpm>-<genre>-beat-<four-digit-id>-<ableton-kit-slug>.mid
```

Example: `124-house-beat-0001-808-core-kit.mid`. The filename is useful for
humans and storage searches, while `manifest.json` remains authoritative and is
validated against it before Live is touched.
