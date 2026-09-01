---
name: padremap
description: Inspect an Ableton Drum Rack's real pads and chains through the Live Object Model, validate the mapping, and update the reusable verified preset-map cache. Use for PADREMAP, first-run device discovery, or when an installed drum preset changes.
---

# PADREMAP

`PADREMAP [preset or supported preset list]` builds the product's trusted preset
memory. It never treats a Drum Rack already present on a user's channel as the
preset definition. It resolves each requested Ableton browser preset by identity,
loads it on a dedicated temporary scan track, and records that preset's layout.
Static ADG extraction is useful for discovery, but only a complete preset-specific
LOM scan may write an entry marked `live_verified`.

Read [references/scan-schema.md](references/scan-schema.md) before producing or
merging a scan payload.

## Cache policy

The authoritative runtime cache is
`../../../drum-library/devices/live-verified-pad-maps.json`. Key entries by
preset ID plus source preset SHA-256. Reuse an entry only when its hash and Live
major version match the installed preset. Missing or stale entries must be
rescanned; never repair them by assuming General MIDI or copying another kit.

First launch should scan only the curated presets referenced by the shipped MIDI
manifest. Additional installed presets are scanned lazily when a catalogue asset
first targets them. This keeps first-run work bounded while allowing the product
to grow beyond 909/808/707.

## Preset-specific real scan

Follow all repository Live safety rules. Loading a preset for inspection is a
mutation and therefore requires preflight, an unsaved disposable Set, sequential
signature-guarded calls, and readback. Never scan an arbitrary existing channel
and never replace devices on a user track. The browser item, preset hash, loaded
device name, and scan payload must all identify the same preset.

For each uncached preset:

1. Create a temporary MIDI track and load the exact browser item identified by
   the catalogue. Confirm the loaded device is a Drum Rack.
2. Enumerate `drum_pads`, retaining only pads whose `chains` collection is
   non-empty. Read the real `DrumPad.note` and `DrumPad.name`.
3. For every chain on a populated pad, read `name`, `in_note`, `out_note`, and
   `choke_group`. Preserve multiple chains; do not collapse selector or layered
   pads into one guessed sound.
4. Require unique pad notes in 0–127, at least one populated pad, `in_note`
   matching the parent pad unless it is `-1`, and non-empty names. Record the
   exact Live version, preset hash, browser URI/path, and UTC scan time.
5. Merge the payload with `scripts/padremap_cache.py`. Re-read the cache and
   confirm the stored mapping hash. Remove only the temporary track created for
   this scan, with signature guard and readback.

Never play notes as a substitute for LOM inspection. Audio classification may be
added later, but it cannot override the pad and chain routing reported by Live.

## Consumer contract

`makedrums` selects the exact preset attached to the MIDI asset and requires its
matching live-verified cache entry before placement. Compare the source pitch-role
contract stored with the asset to the verified target preset map. If positions
differ, remap the note output by semantic role before it reaches Live. Keep timing,
duration, velocity, mute state, and note count unchanged. If a source role has no
unambiguous compatible target pad, stop and run `padremap`; never send the original
pitch and hope it hits the right sound. Filename, manifest, source role contract,
and verified target cache together form the authority.
