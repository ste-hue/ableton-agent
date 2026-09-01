---
name: makedrums
description: Select and place a pre-generated, device-mapped drum MIDI arrangement in Ableton Live when the user says "MAKEDRUMS [genre]" or asks to use the local approved drum catalogue instead of composing a new beat.
---

# MAKEDRUMS

`MAKEDRUMS [genre]` means: use the deterministic catalogue in
`../../../drum-library/`; do not compose or alter the selected notes.

## Selection

Run:

```bash
python3 drum-library/tools/makedrums.py GENRE --format summary
```

The manifest is authoritative for asset, tempo, length, and device profile.
Reject unsupported genres instead of silently substituting one. Before touching
Live, run the command again with `--format lom-json` and treat its device query,
clip length, and notes as the exact execution payload.

Asset filenames follow
`BPM-GENRE-beat-NNNN-ABLETON-KIT.mid`, but never trust filename parsing alone:
the selector validates it against the manifest. Rotate among compatible assets
and kits when the catalogue contains alternatives; do not default every genre
to 909 Core Kit. Only use a MIDI asset with the exact device profile attached to
that asset. `../../../drum-library/devices/installed-drum-kits.json` is the
installed-kit inventory and genre-routing reference.

Before placement, require the matching preset hash in
`../../../drum-library/devices/live-verified-pad-maps.json`. If it is missing or
stale, run `padremap` for that preset first. Reject MIDI pitches absent from the
live-verified entry; the static ADG catalogue is not a substitute for this gate.

## Placement in Live

Follow all repository Live safety rules: validate the bridge, require an unsaved
disposable Set unless the user explicitly authorizes a saved Set, record the Set
signature, and make sequential signature-guarded mutations with readback.

Treat this as a fast, additive command. Do not perform a musical audit of the
existing Set and do not narrate routine validation, signatures, intermediate
readbacks, device search, temporary clip transfer, or cleanup. Use the smallest
compact summaries and property reads that still satisfy the repository safety
rules. If all checks pass, the user should normally receive only one final status
message. Report intermediate detail only for a real blocker or unknown outcome.

Create one new MIDI track in Arrangement, load the manifest's stock device using
its exact browser query, and verify the device appears. Create one Arrangement
clip of the catalogue length and add the selected notes without transposition,
humanization, regeneration, or remapping. Read the complete clip notes back and
compare pitch, start, duration, velocity, and count with the selected payload.
When direct Arrangement note creation is unavailable, a temporary Session clip
may be used for transfer; delete that temporary clip after the Arrangement copy
has passed exact note readback.

Name every destination track exactly `Drum GENRE NNN`, for example
`Drum techno 001`. Normalize the genre to lowercase. Determine `NNN` from tracks
whose names exactly match `Drum GENRE <digits>` and use the first positive unused
number, zero-padded to at least three digits. Never reuse a serial that is already
present for that genre, even if its track is muted or empty.

If the device cannot be found or its verified profile does not match, stop before
writing notes. A successful call is not proof of placement; Ableton readback is.

Set the song tempo to the asset tempo only when the user wants the catalogue's
native tempo or has not asked to preserve the current tempo. Never fire playback
unless requested.
