---
name: beat-making
description: Compose drum grooves and the bass that locks to them in Ableton Live through the LOM — the dimensions a groove actually moves in (subdivision, density, syncopation, accent hierarchy, microtiming, velocity contour, silence), the MIDI and drum-map constraints that make it playable, and a compiler that turns any invented pattern into notes. Use this whenever someone asks for a beat, a groove, drums, percussion, a rhythm section, "una base", "un beat", a tempo or feel, a named style, or wants an existing pattern to swing, hit harder, breathe, get busier or stop sounding mechanical — even when they never say the word "drums".
---

# Beat making

This skill gives you the dimensions a rhythm moves in and the constraints that
make it playable. It deliberately does not give you patterns to reproduce.

**Stylistic conventions are historical priors, not composition instructions.**
Follow them, bend them, combine them, or violate them on purpose — but do not
reproduce a canonical pattern unless someone asks for exactly that. "A dirty
hip hop beat that doesn't sound like nostalgic boom bap" is a legitimate brief
and the right answer to it is not in any reference file. Compose from the
brief; use style knowledge as orientation, the way a musician uses having
listened to records.

## What must be true (constraints)

These are not aesthetic choices — get them wrong and nothing plays.

- **A MIDI track with no instrument is silent.** Load a kit before writing
  notes, and verify the device is on the track.
- **Notes are `{pitch, start_time, duration, velocity}`**, times in beats from
  the clip start, velocity 1-127.
- **Pitch selects the drum**, not the note. Live's factory racks follow
  General MIDI; `references/drum-map.md` has the numbers and how to read the
  truth off a rack that ignores the convention.
- **Live's Groove Pool cannot be created through the LOM.** Swing has to live
  in the note positions. This is a constraint, and also an opportunity: baked
  timing is more precise and more variable than a groove template.
- **Percussive notes want short durations** (0.05-0.2 beats). Duration on a
  drum hit rarely matters except for open hats and rolls, where it does.
- **Two hits at the same pitch and instant** are one hit with wasted data;
  two *different* drums at the same instant is a layer, which is a real
  technique (snare + clap) rather than a mistake.

## The dimensions

A groove is a point in this space. When something isn't working, the useful
question is *which dimension is wrong*, not *which pattern should I copy*.

**Tempo and meter.** Sets the physical size of a subdivision — at 90 BPM a
sixteenth is 167 ms, at 160 it is 94 ms. The same pattern at two tempos is two
different pieces of music. Meter other than 4/4 is available and mostly
unexplored in programmed music.

**Subdivision.** The grid the pattern is felt against: eighths sit back,
sixteenths drive, triplets lilt, thirty-seconds blur into texture. Parts can
disagree — a kick in eighths under hats in sixteenths is a groove; everything
on the same subdivision is a machine.

**Density.** How much of the grid is occupied. Density is not energy: a sparse
pattern with hard accents hits harder than a full one, because the ear
measures against the silence. Density can also *change* — the same loop
gaining a part every two bars is an arrangement in miniature.

**Syncopation.** Hits placed off the strong beats. This is where rhythmic
tension comes from: the listener predicts the downbeat, the music arrives
somewhere else. Too little and the beat is a metronome, too much and there is
nothing to be off from — syncopation only works against an implied pulse.

**Accent hierarchy.** Which hits are loud, which are quiet, which are barely
there. A pattern with three velocity tiers (accent / normal / ghost) reads as
played; a pattern with one reads as typed. The hierarchy is what tells the ear
where the bar starts — often more than the pattern itself.

**Microtiming.** Whole-part offsets of 0.01-0.03 beats. Late is relaxed,
early is urgent, and the interaction between parts placed differently is what
"pocket" means. Keep the kick honest and move the others around it, or the
track feels drunk rather than grooving.

**Velocity contour.** Velocity across a run of notes: a hat roll that
accelerates in volume is a gesture; sixteen hats at 90 is wallpaper. Contour
applies to whole phrases, not just individual accents.

**Repetition and variation.** A loop that never changes stops being heard
after four bars. The standard move is asymmetry: two bars where the second
differs slightly, or a four-bar phrase with a variation in the last half-bar.
What varies matters less than that something does.

**Silence.** The most under-used element. A missing kick where the ear expects
one is an event. Dropping a part for a bar is the cheapest arrangement tool
that exists.

**Percussion roles.** In any groove each part is doing one job: keeping time,
marking the backbeat, adding colour, or running a counter-rhythm against the
others. Ask what role a part is playing before adding it — two parts doing the
same job cancel each other out, and most crowded beats are crowded for exactly
that reason.

**The kick/bass relationship.** They occupy the same frequency range, so they
either take turns or cancel out. Locked (bass on the kick, one voice), answering
(bass in the kick's rests), or independent (bass carries harmony, kick carries
rhythm) are three different musics. Pick one deliberately.

## Working method

Follow `AGENTS.md` — sequential calls, signature guard, readback after every
mutation. Then:

1. **Read the brief for dimensions, not for a genre label.** "Cupo e spoglio"
   is density and register. "Che spinge" is microtiming and accent. Translate
   the words into the space above, then compose in it.
2. **Load a kit** and verify it. Search the browser with
   `roots: ["drums"]` — Live ships kits named for machines (808, 909, 606) and
   for styles. The kit is a colour choice, not a genre commitment.
3. **Write the pattern as a grid** and compile it (below). The grid keeps the
   pattern visible while you work on it, which is what lets you *see* density
   and syncopation instead of guessing at them in a JSON array.
4. **Read the notes back** with `live_clip_notes`. A success response is not
   proof; the note count and a velocity spot-check is.
5. **Fire it and confirm `is_playing`.** Ears decide, so get it audible early
   and expect the first version to be wrong.
6. **Then mutate one dimension and compare.** Not five variations — one
   change, heard against the original, kept or rejected. That loop is where
   the music actually happens; the first pattern is only a hypothesis.

## The compiler

`scripts/groove.py` turns a grid into the note array. It makes no musical
decisions — it takes whatever you invent and renders it deterministically.
That separation is the point: compose probabilistically, execute exactly.

```
kick         X..x|....|x...|....   x..x|....|x...|..x.
snare        ....|X...|..o.|X...   ....|X...|..o.|X...
hat   @+0.02 X.x.|X.x.|X.x.|X.x.   X.x.|X.x.|X.x.|X.x.
```

One character per subdivision: `X` accent, `x` normal, `o` ghost, `.` rest;
`|` is ignored. Names resolve through the drum map, or give a pitch
(`perc 61 x...`). Per line, `@+0.02` shifts that part in beats (positive lays
back) and `/0.3` sets duration.

```bash
.venv/bin/python3 .agents/skills/beat-making/scripts/groove.py pattern.txt \
  --swing 56 --humanize 6 --name my-groove --summary
```

- `--swing` 50 straight, 66 full triplet; `--swing-unit 16` shuffles
  sixteenths, `8` shuffles eighths — a large audible difference.
- `--humanize N` seeded jitter on velocity and timing. Seeded so a groove is
  reproducible from its recipe; change `--seed` to roll a different feel from
  the same pattern, which is itself a cheap way to generate variations.
- `--summary` prints hits and velocity range per drum to stderr. Read it
  before writing to Live — it catches a dead or lopsided part instantly.
- `--example` prints a syntax demonstration. It is there to show the notation,
  not to be composed from; starting from it will produce its groove rather
  than yours.

## Style priors

`references/style-priors.md` describes what various styles *value* — the
concerns behind the conventions, not patterns to copy. Read it when a style is
named and you want orientation, and treat what you find there as context for
invention. If your output could have been produced by pattern-matching the
style name, you have used it wrong.
