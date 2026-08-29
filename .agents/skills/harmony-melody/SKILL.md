---
name: harmony-melody
description: Compose pitched material in Ableton Live through the LOM — harmonic function and tension, voice leading, modality, register and voicing, melodic contour and phrasing, and the MIDI note arithmetic underneath. Use this whenever someone asks for chords, a progression, a key or mode, a melody, a topline, a hook, a pad, a harmonic bassline, or wants pitched material rewritten, transposed, made darker, brighter, more open, more tense or to resolve — including when they describe it purely as a feeling and never name a chord.
---

# Harmony and melody

This skill gives you materials and the forces that act on them. It
deliberately does not give you progressions to paste in.

**Stylistic conventions are historical priors, not composition instructions.**
A style may suggest that minor sevenths and a slow harmonic rhythm fit — it
does not tell you to write any particular four chords. One chord for sixteen
bars, a pedal note under changing melody, or no harmony at all are all valid
answers to a brief, and often better ones than a progression.

## What must be true (constraints)

- **Notes are MIDI numbers. C is every multiple of 12** (36, 48, 60, 72);
  count semitones up from there.

  | C | C# | D | D# | E | F | F# | G | G# | A | A# | B |
  |---|----|---|----|---|---|----|---|----|---|----|---|
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |

- **Live labels MIDI 60 as C3**, two octaves below scientific pitch notation.
  When someone reads a note name off the screen, convert with Live's labels or
  land an octave out.
- **Register is physics, not taste.** Below MIDI 48 intervals closer than a
  fifth turn to mud — the ear cannot separate low frequencies that are close
  together. This is why voicings open up as they descend, in every style, in
  every century.
- **A MIDI track with no instrument is silent.** Load one, verify it, then
  write.
- **Simultaneous notes are a chord; overlapping notes are a texture.** Both
  are written the same way — the difference is durations and start times, and
  it is worth being deliberate about which one you are making.

## Materials

`references/harmonic-materials.md` has the scale and chord interval tables,
the degree arithmetic, and notes on what each material tends to do. Read it
when you need the numbers or want to work outside the common ones.

The short version: **modes** are seven-note collections that each carry a
distinct emotional weight (natural minor is neutral-sad, Dorian is minor with
hope, Phrygian is menace, Lydian is wonder); **chords** are stacks of thirds
whose character comes from the intervals present rather than the name; and
**pentatonic** is the five-note subset that cannot clash, which makes it the
safe ground for melody over uncertain harmony.

## The forces

**Harmonic function** — the sense that a chord is at rest, leaving, or
arriving. Tonic is home, dominant wants to resolve to it, subdominant is
motion away. Most of what people mean by "it resolves" or "it doesn't go
anywhere" is function, not chord quality. A progression that never leaves
tonic is static by construction; whether static is a problem depends entirely
on the brief. Modal and loop-based music often works precisely by refusing
function.

**Tension and release** — the currency. Tension comes from dissonance (a
second, a tritone, a note outside the collection), from function (a dominant
left unresolved), from register (extreme high or low), from density, from
rhythm. Release is any of those relaxing. Music with no tension is wallpaper;
music with no release is exhausting. Both are usable deliberately.

**Voice leading** — how individual voices move between chords. Keep common
tones, move the rest by a step or two. This is what makes a change sound like
one instrument breathing rather than a slideshow of shapes. When a voicing
jumps more than a fifth between chords, invert it instead — same harmony,
smoother line. Voice leading is also *the* argument against thinking in chord
names: the same two chords voiced two ways are two different musical events.

**Register and voicing** — which octave, and how the notes are spaced. Leave
out the root when a bass is playing it; a voicing that doubles the bass wastes
a voice and muddies the bottom. Keep the span inside about an octave and a
half or the chord stops cohering. Put the softest velocity on the top note and
a chord stops sounding like four keys pressed by a machine.

**Ambiguity** — deliberately withholding the information that would settle
the key. Suspended chords (no third), open fifths, a melody that avoids the
third, a bass pedal under changing upper voices. Ambiguity is not indecision;
it is a way to keep a listener leaning forward, and it is under-used in
programmed music where everything tends to be stated four times.

**Chromaticism** — notes outside the collection, used as passing motion,
colour, or a temporary lie about the key. The rule that matters is
directional: a chromatic note wants to continue the way it was heading.

**Harmonic rhythm** — how often the harmony changes, which is a rhythmic
parameter more than a harmonic one. Two chords per bar is busy, one chord per
four bars is a drone, and changing the harmonic rhythm mid-section is one of
the strongest structural tools available.

**Melodic contour and phrasing** — a melody is a shape in time, and shape
survives translation to any scale. A motif of two to four notes, repeated with
variation, will be remembered; a line of unrepeated correct notes will not.
Rests are part of the melody: a phrase that stops lets the beat speak and
gives the next phrase somewhere to arrive from. Land on chord tones at strong
moments and pass through everything else. Write melody above the chords
(60-84) or nobody hears it.

**Call and response** — the oldest structural device there is. Two phrases
where the second answers the first, between instruments or within one line.
It is what makes eight bars feel composed rather than looped, and it costs
nothing.

## Working method

Follow `AGENTS.md` — sequential calls, signature guard, readback. Then:

1. **Translate the brief into forces, not into chords.** "Più triste" might be
   mode, register, harmonic rhythm, or voicing density — decide which, and say
   which in one line so it can be corrected in one word.
2. **Set the Set key** (`root_note`, `scale_name`) once decided. It constrains
   nothing you write, but it makes Live's editors highlight correctly for the
   person watching, which matters when they want to join in.
3. **Load an instrument and verify it.** The instrument is half the harmony:
   the same voicing on a Rhodes and on a saw pad are different pieces of
   music.
4. **Write, read back, listen.** `live_clip_notes` catches the octave errors
   that voicing arithmetic invites. Then fire it — harmony that has not been
   heard has not been evaluated.
5. **Mutate one force and compare.** Same progression an octave up, or with
   the root removed, or at half the harmonic rhythm. Comparison is how the
   choice gets made; a single version leaves nothing to decide between.

## Basslines that carry harmony

Different job from the bass in `beat-making`, which locks to the kick. A
harmonic bassline states the root at each change and then moves — fifths,
octaves, passing tones, a walk into the next root. Keep it in 33-48, sparser
than feels right, and out of the kick's exact instant. When the bass and the
chords are the only harmony, the bass is doing more of the work than the
chords are.
