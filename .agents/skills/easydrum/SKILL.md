---
name: easydrum
description: Rapidly create a cool genre-specific 128-bar electronic drum arrangement in Ableton Live when the user says "EASYDRUM [genre]". Opens new drum tracks, chooses suitable stock drum machines, writes phrase-aware MIDI, and lays everything directly on the Arrangement timeline; use drummer-dance instead for buses, detailed sound design, automation, or production finishing.
---

# EASYDRUM

`EASYDRUM [genre]` means: decide fast and produce the drums immediately. Create an
original 128-bar arrangement on new tracks, already laid out from beat 0 to beat
512 in Arrangement View. Do not turn the request into an interview or a production
session.

Follow `AGENTS.md` safety invariants even though the mode is intentionally direct.
Run the mandatory preflight, unsaved/authorized-Set check, signature guards, device
verification, note readback, and Arrangement readback silently. Inspect no more
musical content than the required Set summary: never overwrite existing clips or
tracks, and avoid interpreting or reorganizing what is already there. If safe new
tracks cannot be added, stop instead of touching existing work.

## Fast decision

Read the requested family in
`../drummer-dance/references/genres.md`, select a tempo and one clear groove claim,
then act. Use `../beat-making/references/drum-map.md` for stock-kit pitches.

Choose sound sources by function rather than prestige:

- 909: authoritative club kick, open hats, ride, crash;
- 707: dry clap/snare, rim, bright body and compact fills;
- 808: rounder low end, cowbell, tom colour, electro-derived patterns;
- another verified stock kit only when it fits the requested subgenre better.

Artist references describe feel and production values; never copy a recognizable
pattern or arrangement from a particular track.

## Direct build

Create separate tracks by rhythmic role. Three tracks are the minimum, not merely
a preference:

1. kick/foundation;
2. clap, snare, rim, and compact fills;
3. hats, shaker, ride, and motion;
4. optional counter-percussion and transition hits.

Never collapse these roles into one Drum Rack track. Load and verify a real drum
instrument on every created track, even when that means loading the same stock kit
more than once and using only the pitches assigned to that track's role. The kick
must never share a MIDI clip with hats, shakers, claps, or percussion that may need
groove. If two moving parts need different groove choices or amounts, give them
separate tracks as well; for example, closed hats may share with open hats when
they use the same groove, while a differently swung shaker gets its own track.

This separation is required so Ableton grooves can be assigned per clip without
moving the foundation. If the available Live controls expose Groove Pool and clip
groove assignment, apply a genre-appropriate groove only to the eligible hats,
shakers, claps, or percussion clips. Keep the kick clip straight. If groove
assignment is unavailable, leave the clips separated and grid-tight so the user
can apply grooves manually. Do not bake swing or microtiming into a clip that also
receives an Ableton groove; avoid double-swinging the same layer.

If the required separate tracks cannot be created safely, stop with a blocker.
Do not use a combined drum track as a fallback.

Load and verify an instrument before MIDI. Write one 128-bar source clip per track,
using Session only as the minimal staging area required by the available tools,
then duplicate each source once at beat 0 in Arrangement. The Arrangement timeline,
not Session View, is the deliverable.

Compose the form inside those long clips:

- every 8 bars: one omission, accent shift, ghost, fill, or hat change;
- every 16 bars: a clear density or voice change;
- every 32 bars: a new energy chapter made mainly through addition/subtraction;
- around the midpoint: decide whether the genre benefits from a macro variation,
  a big drop, a smaller timbral shift, or continuous evolution;
- before important arrivals: remove an expected hit and make the fill resolve on
  the boundary;
- final 4-8 bars: simplify into a usable DJ outro.

## Variable macro events

Do not force the same event at bar 64 in every result. Once per invocation, make a
weighted creative choice among:

- a large midpoint break and drop;
- a late break/drop at another 8- or 16-bar boundary;
- two shorter removals instead of one pausone;
- a timbral/density mutation with no conventional drop;
- gradual hypnotic evolution with no large break.

Weight the choice by genre and the groove already invented: house, french house,
and festival-leaning forms can favour a clear break; hypnotic techno can favour
continuous evolution; leftfield styles can move the event off the obvious midpoint
or replace it with asymmetry. Randomness should surprise the form without ignoring
the genre.

Use the requested genre plus the initial `set_signature` as a stable conceptual
seed for this one choice. Keep the chosen form unchanged during retries or safety
readbacks; do not re-roll halfway through construction.

If a **pausone** is chosen, remove the kick completely for a meaningful 4-16 bars
and retain only one or two tension-carrying voices. Its position may be near bar 64
or elsewhere on an 8/16-bar boundary.

If a **mega snare roll** is chosen, make it earn a big arrival: evolve from quarters
or eighths into sixteenths and optionally thirty-seconds, with rising velocity and
optional tom/clap colour. It may last 2-8 bars. Leave the final quarter- or half-beat
silent before the drop so the first kick lands alone. Do not use the roll when a
restrained or hypnotic genre interpretation is stronger without it.

Keep kick timing stable. Put genre-appropriate swing and microtiming—or an Ableton
groove, when available—into the separate hats, shakers, claps, and percussion
clips. Use at least three useful velocity levels where the style benefits from a
played feel. Silence and role changes should create more of the arrangement than
constant new material.

Default to tight drum-machine timing. Swing must be a small, consistent offset
shared by a rhythmic role, not unrelated per-hit drift. Do not add timing jitter,
random humanization, loose flams, or broad velocity randomness unless the user
explicitly asks for a sloppy, loose, live, or heavily shuffled feel. Even then,
keep the kick fixed and make the looseness intentional and repeatable. When the
brief does not specify looseness, prefer fewer voices, exact grids, restrained
velocity contours, and electronic snare/clap stutters over tom-heavy performed
fills.

## Deliberate omissions

Unless explicitly requested, do not add buses, routing architectures, return-track
design, complex effects, parameter automation, audio capture, recipes, alternative
versions, or extended commentary. Do not audition and compare multiple hypotheses.
Choose one strong solution and build it.

## Delivery gate

Before replying, verify silently that every created track has:

- a real drum instrument;
- exact MIDI-note readback;
- one Arrangement clip starting at beat 0 and ending at beat 512;
- only one groove domain: foundation, backbeat/fill, hats/motion, or a separately
  grooved counter-percussion role;
- the selected macro strategy—whether drop, pausone, roll, mutation, or gradual
  evolution—implemented consistently at musically counted boundaries;
- no reliance on Session playback for the requested form.

Also verify that the kick remains on its own straight clip and that no eligible
groove was accidentally applied twice through both note offsets and clip groove.

Report only tempo, genre interpretation, created roles, and any genuine blocker.
