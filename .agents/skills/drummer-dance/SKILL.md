---
name: drummer-dance
description: Program and lay out a complete, production-minded electronic drum system on Ableton Live's Arrangement timeline when the user says "DRUMMER [genre]" or asks for fully arranged dance drums with drum machines, buses, sends, fills, transitions, sound design, and phrase-synchronous automation. Covers house, techno, french house, tech house, leftfield techno, indie dance, and adjacent modern dance styles; use beat-making for simpler groove-only requests.
---

# DRUMMER dance

Turn `DRUMMER [genre]` into an original, audible drum arrangement rather than a
single loop. Build the complete rhythmic ecosystem: foundation, backbeat, tops,
percussion, fills/transitions, processing, routing, sends, and automation.

This skill complements `beat-making`: use its note constraints, groove compiler,
readback discipline, and kick/bass relationship. For a whole track, also follow
`song-from-scratch`. Always follow `AGENTS.md` and `.agents/COLLABORATION.md` for
Live safety, signature guards, sequential calls, readback, and user interaction.

## Interpret the invocation

Extract the genre after `DRUMMER`. If absent, infer it from the current Set or
brief; ask only when no responsible inference is possible. Treat artist names as
values and production traits, never as instructions to copy a track.

Before composing, state one compact hypothesis containing tempo, groove feel,
machine palette, low-end relationship, and the arrangement's main tension device.
Read [references/genres.md](references/genres.md) for the requested family, then
compose a fresh rhythmic identity inside those priorities.

## Required result

Unless the user narrows the scope, create an Arrangement-view drum production
whose length follows the requested song or the current arrangement. If neither
exists, default to a DJ-usable 128 bars.

**The deliverable must already be laid out on the Arrangement timeline.** Session
clips are only source material, audition variants, or a reproducible recipe. A set
of completed Session clips—even clips that internally contain the whole form—does
not satisfy this skill until every required drum role, transition, silence, and
automation gesture has been placed and verified at its intended timeline position.
Do not hand the result back while the Arrangement is empty or only partially laid
out unless a safety blocker prevents further mutation; if blocked, report exactly
which timeline regions and roles remain missing.

Use distinct functional layers; never multiply tracks merely to sound elaborate:

1. **Foundation:** kick and only the low support that genuinely reinforces it.
2. **Backbeat:** clap/snare/rim and controlled ghosts.
3. **Motion:** closed/open hats, shaker, ride, or tambourine.
4. **Counter-rhythm:** percussion whose interlock creates a new rhythm.
5. **Transitions:** fills, crash, reverse, noise, impacts, and deliberate silence.

One drum rack may cover several roles when its processing and automation can stay
coherent. Split racks or machines when roles need different dynamics, saturation,
sends, decay, swing, or arrangement density. A new MIDI track must have a verified
instrument before receiving notes.

## Phrase architecture

Design from large to small: 32-bar energy chapters, 16-bar section changes, 8-bar
phrases, and 1- or 2-bar transitions. Every part must answer three questions:
what changes, at what phrase boundary, and what expectation that change creates.

- Micro change at 8: one accent, omission, ghost, timbral nudge, or short fill.
- Medium change at 16: density, counter-rhythm, hat voice, or send state.
- Macro change at 32: section role, low-end state, register, or machine palette.
- Reserve the strongest fill or silence for a genuine macro arrival.

Automation gestures must have destinations. Start ramps early enough to be felt,
and land them exactly on the fill, removal, drop, or variation they prepare. Avoid
unrelated free-running automation that obscures the phrase.

Read [references/production-system.md](references/production-system.md) before
choosing routing, processing, sends, transitions, or automation targets.

## Working loop

1. Inspect the actual Set, Arrangement, devices, routing, clips, returns, and tempo.
2. Preflight and confirm the Set is disposable or explicitly authorized.
3. Build and audition a representative 8-bar groove before scaling it.
4. Read back notes and devices; capture real audio before making sonic claims.
5. Mutate one dimension, compare, and keep the stronger version.
6. Develop 8/16/32-bar variants, then lay every kept role across the full requested
   length in Arrangement View. Session-only form is an intermediate state.
7. Add routing and processing from dry foundation outward.
8. Add phrase-bound automation and transitions only after the form reads clearly.
9. Verify notes, devices, parameter values, automation, routing, and Arrangement
   coverage. Do not call it finished; hand it to the user for listening and revision.

## Quality gates

- Kick and bass have an explicit relationship and do not blindly overlap.
- At least three velocity tiers exist where a played feel is intended.
- Swing/microtiming is intentional by role; the kick remains the timing reference
  unless the genre hypothesis explicitly chooses otherwise.
- Every added layer has a unique rhythmic or timbral job.
- Breaks contain real subtraction, not merely quieter versions of every element.
- Fills prepare changes and leave space after the gesture.
- Foundation stays drier and more centered than transition/color layers.
- Drum-bus processing preserves transients and level is compared fairly.
- Sends are role-aware, filtered where appropriate, and automated around phrases.
- Cymbal/reverb/filter/drive automation resolves on 8/16/32 boundaries.
- Every audible section exists as clips or automation on the Arrangement timeline;
  Session clips alone never pass the delivery gate.
- Arrangement length and clip placement are verified in Live, not inferred from
  successful mutation responses.
