---
name: song-from-scratch
description: Take a musical idea from a spoken brief to a finished, reproducible track in Ableton Live — form a hypothesis, realize four to eight bars, listen, mutate one dimension, compare, keep or reject, develop into an arrangement, and save the result as a recipe. Use this whenever someone wants a whole piece rather than one part: "facciamo un pezzo", "fammi una traccia", "build me a track", a song brief with a mood or genre, or when a loop that already exists needs to become an actual arrangement with sections.
---

# A song from scratch

The job is not to execute a specification. Nobody — including the person
asking — knows what the track should be until they hear something. So the
method is not *plan then build*; it is **hypothesize, realize, listen, mutate,
compare, keep**. That loop is how musicians actually work, and it is the only
part of this skill that really matters.

Component skills do the parts: `beat-making` for rhythm, `harmony-melody` for
pitched material. This one is about the arc, the loop, and knowing what to do
next.

**Stylistic conventions are historical priors, not composition instructions.**
That holds at song level too: there is no obligatory intro-verse-chorus, no
required eight bars before the drop, no mandatory number of sections.

## The loop

Every cycle is small enough to be wrong cheaply.

1. **Hypothesis.** From the brief, commit to a specific musical claim: tempo,
   key or mode, feel, and which element carries the identity of the track (the
   drums? a chord loop? one sound?). Say it in one or two lines. A hypothesis
   that could describe any track is not a hypothesis.
2. **Realize four to eight bars.** Enough to be judged, not so much that
   throwing it away hurts. Get it *audible* — a MIDI track with no instrument
   is silent, and unheard music cannot be evaluated by anyone.
3. **Listen and inspect.** Fire it and confirm it is playing. Read the notes
   back. Then say what you actually hear, including what is not working — an
   honest "the bass is fighting the kick" is worth more than a summary of what
   you did.
4. **Mutate one dimension.** One. Density, register, harmonic rhythm, the
   swing amount, which instrument carries the melody, the tempo. Duplicate
   rather than overwrite — variations are cheap, and the previous version is
   the only thing the new one can be compared against.
5. **Compare and decide.** Play both. Keep the better one, or keep both as
   sections. If the person is present, the decision is theirs and one word is
   enough; if they are not, decide, and say what you rejected and why.
6. **Develop.** The kept material earns more: another part, a section that
   contrasts, an arrangement. Then loop back to 4.

Stop when the person says it is done. That judgement is not yours to make,
and "is it finished" is the one musical question no method answers.

## Getting started from a brief

Ask at most two questions before making sound. More than that and you are
interviewing instead of composing, and the answers get better after they hear
something anyway. Good first questions are the ones you genuinely cannot
guess: *what should it feel like*, and *is there a reference*. Tempo, key and
instrumentation you can decide yourself and correct later — deciding is
faster than asking, and a wrong guess produces better feedback than a blank
page.

If the brief is a single word ("qualcosa di cupo"), that is enough. Form the
hypothesis, name it, and build.

## Order of construction

Not a rule, an observation about what makes the loop turn fastest: **whatever
carries the track's identity comes first.** Usually that is the drums, because
tempo and feel constrain everything else. Sometimes it is a chord loop, and
occasionally it is one sound the whole piece is about.

The order that usually works after that: identity element → the low end
(kick/bass relationship is a decision, see `beat-making`) → harmony →
top line → arrangement. But a track built melody-first is a different track,
not a wrong one.

Keep everything in Session view while composing: clips are loops, loops are
comparable, and comparison is the method. Move to Arrangement only when the
material is decided and the question becomes form.

## Form

Sections exist to create and satisfy expectation. Two questions do most of the
work: **what changes**, and **when does the listener notice**.

The cheapest structural tools, in order of effectiveness:

- **Removal.** Drop the drums for four bars. Nothing costs less or lands
  harder.
- **Density.** The same material with two parts instead of five is a
  different section, not a lesser one.
- **Register.** Move a part an octave. Instant contrast, zero new material.
- **Harmonic rhythm.** Halve or double the rate of change.
- **Length asymmetry.** A six-bar phrase where the listener expects eight.

New material is the *most* expensive way to make a section and usually not the
best one. A track where everything is derived from one idea is more coherent
than one that keeps introducing things.

## Ending the session

When the person is happy, the work becomes durable:

- **Save a recipe** (see `docs/recipes.md` and `tools/recipe_check.py`) so the
  track can be rebuilt exactly from a file, in an empty Set, later. This is
  the point of the whole project: the music must not live only inside a Live
  Set that might be closed without saving, or inside a conversation that ends.
- **Saving the Set itself is the person's gesture**, not yours — and if they
  ask where, the naming convention is in `AGENTS.md`.
- **Say what is unfinished.** A track with a good loop and no arrangement is a
  good loop; describing it as a track is a disservice.

## What goes wrong

- **Building eight parts before anything has been heard.** The loop stops
  turning and you are back to executing a spec.
- **Asking questions instead of making sound.** After the second question,
  build something and let it be corrected.
- **Changing three things at once.** Then the comparison teaches nothing and
  the improvement cannot be attributed.
- **Overwriting the previous version.** Duplicate. The old one is the control
  in the experiment.
- **Reproducing a genre archetype and calling it composition.** Priors orient;
  they do not compose. If the output could have been produced by
  pattern-matching the genre name, go back to the hypothesis and make an
  actual musical claim.
- **Declaring it finished.** Not your call.
