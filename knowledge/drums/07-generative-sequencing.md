# Generative dance-drum sequencing

Use this reference when electronic drums need more structural variety, especially
when intros or fills have begun to repeat. Its purpose is to enlarge the decision
space without replacing one cliché with another.

## Evidence translated into practice

- Dance music depends on a stable metrical reference, but surface patterns can
  evolve through several interacting layers. Preserve at least one clear anchor
  while other roles create ambiguity.
- Groove response tends to peak at an intermediate degree of syncopation rather
  than at either extreme. Increase complexity around a stable pulse, and remove an
  existing complication before adding another when the result stops feeling
  physically legible.
- EDM form is strongly repetitive at pattern and phrase levels; interest often
  comes from micro-level accents/timing, interactions between parts, and the order
  in which variants appear. Repetition is therefore material, not a failure, but
  each return needs a reason.
- Conditional triggers, cycle recurrence, probability, per-track lengths,
  microtiming, and retriggers are different musical operations. When delivering
  ordinary MIDI, bake a chosen deterministic realization of these ideas into the
  note events.
- Euclidean distribution spaces a chosen number of onsets as evenly as possible.
  It is useful for discovering counter-rhythms, not as an automatic finished beat.

## Four independent layers

Think in roles before instruments:

1. **Anchor** — supplies bodily certainty: kick pulse, backbeat, or another clear
   periodic reference.
2. **Motion** — supplies continuous travel: hats, shaker, ride, muted percussion.
3. **Counterforce** — pushes against the anchor with syncopation, rotation, or a
   different cycle length.
4. **Punctuation** — marks or deliberately obscures form: omissions, crashes,
   stutters, fills, and transition hits.

Do not let all four layers transform simultaneously. Hold one or two fixed so the
listener can perceive what changed.

## Transformation vocabulary

Transform an existing identity instead of reaching immediately for another stock
pattern.

- **Boolean:** add, remove, alternate, or condition an onset on the presence or
  absence of a preceding event.
- **Geometric:** rotate a lane, mirror only its second half, exchange two onset
  positions, or phase one role against another.
- **Metric:** contract or dilate a motif, switch subdivision, insert a short tuple
  or retrigger burst, or let one secondary lane use a different cycle length.
- **Orchestral:** move the rhythm to another drum, split one line between two
  timbres, exchange closed/open articulation, or answer a sound with another.
- **Dynamic:** rotate accents independently of onsets, invert strong/weak hits, or
  draw a velocity contour through a repeated gesture.
- **Temporal:** apply one consistent role offset, progressively converge a late
  part toward the grid, or make a single anticipatory hit early. Avoid unrelated
  jitter.
- **Negative:** delete the expected event, thin the bar, choke a ringing voice, or
  place silence immediately before the arrival.

For an audible but coherent variation, change one primary dimension and at most one
supporting dimension. Changing pitch assignment, density, subdivision, accents,
and timing at once produces a new idea rather than development.

## Intro topologies

Choose the topology from the brief and avoid reusing the last obvious choice:

- **Anchor-first:** expose the kick or backbeat, then reveal counter-rhythms.
- **Motion-first:** hats/shaker imply tempo before the low-end arrives.
- **Motif-first:** a rim, tom, clap, or metallic figure acts as the track's ID.
- **Broken preview:** present a deliberately incomplete form of the main groove.
- **Negative silhouette:** let omissions imply the later full pattern.
- **False meter:** secondary percussion suggests another grouping until the anchor
  resolves it.
- **Full-impact then subtraction:** state the identity briefly, remove layers, and
  rebuild without repeating the same entrance order.
- **Dialogue:** alternate two roles before allowing them to interlock.

An intro is not automatically kick, then hat, then clap. Entry order should reveal
the track's most distinctive rhythmic relationship.

## Fill and transition grammar

A transition can contain up to four functions:

`setup -> destabilization -> gap -> landing`

Not every transition needs all four. Select a grammar family before writing hits:

- **Negative fill:** progressively remove expected hits; the silence is the fill.
- **Displacement:** move a familiar motif earlier or later, then snap it home.
- **Metric contraction:** shorten the interval between attacks while preserving
  the same voice or accent contour.
- **Voice migration:** pass one rhythm through rim, clap, snare, tom, or hat rather
  than increasing the number of onsets.
- **Orbit:** rotate a secondary pattern over one or more bars until it aligns at
  the boundary.
- **Call and answer:** one voice opens the transition and another closes it.
- **Ratchet window:** use a short, bounded retrigger region with a clear velocity
  shape; do not default to a full-bar rising snare roll.
- **Fake arrival:** create a convincing setup, land on silence or a non-kick hit,
  then place the real arrival later.
- **Timbral handoff:** keep rhythm nearly constant while articulation changes, such
  as closed hat to open hat, snare to clap, or tom to metallic percussion.

Across a 128-bar arrangement, use several families. A repeated transition may act
as a hook, but otherwise do not repeat an exact onset fingerprint. A large drop
does not require a mega roll; reserve it for forms whose previous density and scale
make the gesture believable.

## Novelty protocol

Before composing, write four internal labels:

`intro topology / groove engine / transition family / macro event`

Examples of groove engines are interlocking straight roles, swung role offsets,
broken anchor, Euclidean counterforce, rotating accents, polymetric secondary lane,
and call-response. These are mechanisms, not patterns.

Reject the plan when it shares both intro topology and transition family with the
most recent comparable output visible in the workspace. Within the new piece:

- A, B, and C transitions should use different families, or the returning family
  must change at least two dimensions.
- Never generate the intro by merely muting parts from a stock full loop without
  deciding which relationship the reveal is meant to teach.
- Never use randomness on the anchor merely to make a result look novel.
- Use a seed for reproducibility, but let the seed choose among musically valid
  mechanisms only.
- Novelty is subordinate to function: preserve danceability, genre identity, and a
  clear landing.

## Genre-weighted choices

- **Hypnotic techno:** stable anchor; recurrence, phase, accent rotation, sparse
  punctuation, long transformations.
- **Raw or industrial techno:** asymmetric counterforce, clipped ratchets, timbral
  handoffs, abrupt negative fills; avoid constant maximum density.
- **House/classic house:** shuffle or role offsets, interlocking clap/rim/hats,
  conversational percussion, expressive omissions.
- **Tech house:** firm anchor, tight syncopated counter-rhythm, short gated
  stutters, precise negative space; avoid acoustic-sounding tom parades.
- **UK garage/2-step:** broken kick anchor, backbeat stability, shuffled motion,
  ghost dialogue, fills that preserve the skip.
- **Indie dance:** motif-led 808/909 hybrid, tom/cowbell/metal colour, asymmetric
  orchestration, and sectional identity; keep performance gestures electronic.
- **Leftfield dance:** non-square inner cycles inside DJ-legible outer phrases,
  false arrivals, and controlled discontinuity.

## Learning from MIDI corpora

Study only user-provided material or corpora with clear research/use terms. Extract
aggregate tendencies, never memorize or reproduce a recognizable sequence.

Useful measurements:

- onset density and inter-onset intervals per drum role;
- syncopation relative to the metrical anchor;
- velocity tiers and contours, not only averages;
- stable role offsets and swing ratios;
- recurrence length and variation distance between 1-, 2-, 4-, and 8-bar units;
- entry/exit order in intros;
- density, subdivision, orchestration, and silence deltas before boundaries;
- how often exact patterns return versus transformed returns.

Do not bulk-ingest commercial MIDI packs or unidentified web files. Public MIDI
availability is not proof of permission, and a large corpus can still contain
duplicates or copyrighted transcriptions. Prefer aggregate research datasets such
as the Groove MIDI Dataset for timing/velocity evidence and explicitly licensed
EDM datasets for note-distribution evidence. Treat genre tags as noisy metadata.

## Sources

- Bitwig, [Operators](https://www.bitwig.com/userguide/latest/operators/) and
  [Note FX](https://www.bitwig.com/userguide/latest/note_fx/): chance, recurrence,
  occurrence, repeats, Euclidean distribution, and velocity shaping.
- Elektron, [Digitakt II User Manual](https://www.elektron.se/wp-content/uploads/2025/06/Digitakt-2-User-Manual_ENG_OS1.15_250625.pdf): microtiming,
  conditional trigs, track lengths, Euclidean mode, and retriggers.
- Witek et al. (2014), [Syncopation, Body-Movement and Pleasure in Groove Music](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0094446):
  intermediate syncopation produced the strongest movement/pleasure response.
- Toussaint (2005), [The Euclidean Algorithm Generates Traditional Musical Rhythms](https://archive.bridgesmathart.org/2005/bridges2005-47.html):
  even onset distribution as a generative rhythm construction.
- Magenta, [Groove MIDI Dataset](https://magenta.tensorflow.org/datasets/groove):
  aligned expressive drum MIDI/audio suitable for aggregate timing and velocity
  analysis.
- Leimeister et al. (2014), [Rhythmic Classification of Electronic Dance Music](https://publica.fraunhofer.de/entities/publication/60f578cc-981c-48d8-9a0d-704a1091c632):
  four-bar kick/snare rhythm contributes measurable subgenre information beyond
  tempo alone.
- WaivOps, [EDM-HSE](https://zenodo.org/records/13769544): open code-generated
  house-drum loops with paired note-number and tempo data.

