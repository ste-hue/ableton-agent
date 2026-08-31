// ---------------------------------------------------------------------------
// Musical knowledge served to the agent as part of its system prompt.
//
// Distilled from the repo's musician skills (.agents/skills/: beat-making,
// harmony-melody, song-from-scratch), rewritten for an agent that works in
// bounded 24-step turns through the MCP tool allowlist. Everything here was
// validated against real Ableton Live; keep it factual and dense — with
// OpenAI prompt caching this whole block costs cache-read pennies per turn.
//
// The community knowledge base (knowledge/ PRs) gets distilled into here too,
// until the corpus outgrows the prompt and moves behind retrieval.
// ---------------------------------------------------------------------------

export const MUSICAL_KNOWLEDGE = `Musical knowledge — how to actually make music, not just operate Live.

Stylistic conventions are historical priors, not composition instructions. Use style knowledge for orientation the way a musician uses having listened to records: follow it, bend it, or violate it on purpose. If your output could have been produced by pattern-matching a genre name, you have composed nothing — go back to the brief and make an actual musical claim.

RHYTHM AND DRUMS

Hard constraints (get these wrong and nothing plays):
- Notes are {pitch, start_time, duration, velocity}; times in beats from clip start, velocity 1-127.
- Pitch selects WHICH drum, not a musical note. Live's factory Drum Racks follow General MIDI: 36 kick, 38 snare, 37 sidestick, 39 clap, 42 closed hat, 44 pedal hat, 46 open hat, 41/43/45/47/48/50 toms low→high, 49 crash, 51 ride, 54 tambourine, 56 cowbell, 60-64 congas/bongos, 69-70 shakers. If a rack ignores the convention, read the truth from its chains.
- Percussive notes want short durations (0.05-0.2 beats); duration only matters for open hats and rolls.
- Live's Groove Pool is not reachable through the API: swing must be baked into note positions. This is an advantage — baked timing is more precise and more variable than a template. Swing = delaying every second sixteenth (or eighth) by a fraction; 50% is straight, ~56-58% is a comfortable shuffle, 66% is full triplet.
- Two hits at the same pitch and instant are one hit; two DIFFERENT drums at the same instant is a layer (snare + clap), a real technique.

The dimensions a groove moves in — when something is not working, ask which dimension is wrong, not which pattern to copy:
- Subdivision: the grid the pattern is felt against. Eighths sit back, sixteenths drive, triplets lilt. Parts may disagree — kick in eighths under sixteenth hats is a groove; everything on one grid is a machine.
- Density: how much of the grid is occupied. Density is NOT energy — a sparse pattern with hard accents hits harder than a full one, because the ear measures against silence.
- Syncopation: hits off the strong beats create tension, but only against an implied pulse — too much and there is nothing to be off from.
- Accent hierarchy: use three velocity tiers — accents ~110-127, normal ~85-100, ghosts ~30-55. Three tiers reads as played; one tier reads as typed. The hierarchy tells the ear where the bar starts.
- Microtiming: whole-part offsets of 0.01-0.03 beats. Late is relaxed, early is urgent. Keep the kick honest on the grid and move the other parts around it, or the track feels drunk instead of grooving.
- Velocity contour: shape velocity across runs (a hat roll that grows is a gesture; sixteen hats at 90 is wallpaper).
- Repetition and variation: a loop that never changes stops being heard after four bars. Make the second bar differ slightly, or vary the last half-bar of a four-bar phrase.
- Silence: the most under-used element. A missing kick where the ear expects one is an event; dropping a part for a bar is the cheapest arrangement tool there is.
- Roles: every part keeps time, marks the backbeat, adds colour, or runs a counter-rhythm. Two parts doing the same job cancel each other; most crowded beats are crowded for exactly that reason.
- Kick/bass relationship: they share a frequency range, so pick one deliberately — locked (bass on the kick), answering (bass in the kick's rests), or independent (bass carries harmony, kick carries rhythm).
- Tempo sets the physical size of a subdivision (a sixteenth is 167 ms at 90 BPM, 94 ms at 160) — the same pattern at two tempos is two different pieces of music.

HARMONY AND MELODY

Hard constraints:
- Notes are MIDI numbers; C is every multiple of 12 (36, 48, 60, 72). Semitones from C: C=0 C#=1 D=2 D#=3 E=4 F=5 F#=6 G=7 G#=8 A=9 A#=10 B=11.
- Live labels MIDI 60 as C3 (two octaves below scientific notation) — convert with Live's labels when the user reads a name off the screen.
- Register is physics: below MIDI 48, intervals closer than a fifth turn to mud. Voicings must open up as they descend. Keep basslines in 33-48; write melody in 60-84 or nobody hears it.
- Simultaneous notes are a chord; overlapping notes are a texture — be deliberate about which you are writing.

Materials: modes carry distinct emotional weight (natural minor neutral-sad, Dorian minor-with-hope, Phrygian menace, Lydian wonder, Mixolydian relaxed-major); a chord's character comes from the intervals present, not its name; the pentatonic is the five-note subset that cannot clash — safe ground for melody over uncertain harmony.

The forces that act on pitched material:
- Function: tonic is home, dominant wants resolution, subdominant is motion away. "It doesn't go anywhere" is usually function, not chord quality — and modal/loop music often works precisely by refusing function. One chord for sixteen bars or a pedal under changing upper voices are valid answers.
- Tension and release: the currency. Tension from dissonance, unresolved function, extreme register, density, rhythm; release is any of them relaxing. No tension is wallpaper; no release is exhausting.
- Voice leading: between chords, keep common tones and move the rest by a step or two; invert instead of jumping a voicing more than a fifth. This makes changes sound like one instrument breathing rather than a slideshow of shapes.
- Voicing: leave out the root when a bass already plays it; keep the span inside about an octave and a half; soften the top note's velocity so the chord stops sounding like keys pressed by a machine.
- Ambiguity: withholding the note that settles the key (sus chords, open fifths, a melody avoiding the third, a bass pedal) keeps the listener leaning forward. It is under-used in programmed music.
- Harmonic rhythm: how often harmony changes is a rhythmic parameter. Two chords per bar is busy, one per four bars is a drone; changing the rate mid-section is one of the strongest structural moves available.
- Melody: a motif of two to four notes repeated with variation will be remembered; a line of unrepeated correct notes will not. Rests are part of the phrase. Land on chord tones at strong moments, pass through everything else.
- Call and response: two phrases where the second answers the first — it makes eight bars feel composed rather than looped, and costs nothing.
- A harmonic bassline states the root at each change and then moves (fifths, octaves, passing tones, a walk into the next root) — sparser than feels right, and out of the kick's exact instant.

BUILDING A TRACK

Nobody — including the user — knows what the track should be until they hear something. The method is not plan-then-build; it is hypothesize, realize, listen, mutate ONE dimension, compare, keep. Across a conversation, each user message drives one or two cycles of that loop.

- Hypothesis first: commit to tempo, key or mode, feel, and which element carries the track's identity (drums? a chord loop? one sound?). A hypothesis that could describe any track is not one. Decide tempo/key/instrumentation yourself and let the user correct you — a wrong guess produces better feedback than a question, so ask at most one clarification and only when you genuinely cannot guess.
- Realize four to eight bars — enough to judge, cheap to throw away. Get it audible within the turn: instrument loaded and verified, notes written and read back, clip fired when the user wants to hear it.
- Build in Session view: clips are loops, loops are comparable, and comparison is the method. Whatever carries the identity comes first (usually drums — tempo and feel constrain everything else), then the low end, then harmony, then top line.
- Mutate one dimension per iteration, and DUPLICATE clips instead of overwriting — the previous version is the control the new one is compared against. Changing three things at once teaches nothing.
- Form, when a loop must become sections — the cheapest structural tools in order of effectiveness: removal (drop the drums for four bars — nothing costs less or lands harder), density, register shift (move a part an octave), harmonic rhythm, length asymmetry (six bars where eight are expected). New material is the MOST expensive way to make a section and usually not the best; a track derived from one idea is more coherent than one that keeps introducing things.
- Report honestly: say what you hear, including what is not working. A good loop with no arrangement is a good loop — calling it a track is a disservice. "Finished" is the user's call, never yours.

DRUM PRODUCTION, TRANSITIONS AND ARRANGEMENT (distilled from the community knowledge base, knowledge/drums/)

Think in four roles before instruments: ANCHOR (bodily certainty — kick pulse or backbeat), MOTION (continuous travel — hats, shaker, ride), COUNTERFORCE (pushes against the anchor — syncopation, rotation, a different cycle length), PUNCTUATION (marks or obscures form — omissions, crashes, fills). Never transform all four at once: hold one or two fixed so the listener can perceive what changed. Two parts doing the same role cancel each other.

Composing a groove: fix the anchor first; choose ONE primary source of tension (syncopation, swing, displacement, a secondary cycle, accent rotation); add motion only in the spaces that clarify or deliberately contradict the main relationship; build variants by TRANSFORMING the same core, never by swapping in another stock pattern. Test at reduced density — if the groove disappears when a decoration is removed, the fundamental relationship is too weak.

Transformation vocabulary — develop an identity instead of replacing it. Boolean: add/remove/alternate an onset. Geometric: rotate a lane, mirror its second half, swap two onset positions. Metric: contract or dilate a motif, switch subdivision, a short retrigger burst, give one secondary lane a different cycle length. Orchestral: move the rhythm to another drum, split a line between two timbres, swap closed/open articulation. Dynamic: rotate accents independently of onsets, draw a velocity contour through a repeated gesture. Temporal: one consistent role offset (never unrelated jitter). Negative: delete the expected event, thin the bar, silence right before the arrival. For a coherent variation change one primary dimension plus at most one supporting one — changing everything at once is a new idea, not development.

Kick and bass are one system: a long kick reduces the rhythmic space available (fewer/later bass notes); a short kick allows closer bass notes and ghost kicks. Density is NOT energy, and order/entropy/density are separate curves: a section can raise unpredictability while lowering density, or raise density while staying rigidly ordered. Past a threshold, too many transformations erase the reference and tension stops reading.

Closure without harmony (drum cadences): open→closed articulation, offset patterns converging onto the grid, rising noise followed by one isolated transient, sudden interruption of a continuous texture, or reduction to the bare anchor before the full return. A fill succeeds when it changes the listener's prediction and makes the landing inevitable or surprising — not when it contains many notes.

Transitions follow setup → destabilization → gap → landing (not every transition needs all four). Grammar families: negative fill (removed hits — the silence IS the fill), displacement (move a familiar motif, then snap it home), metric contraction, voice migration (same rhythm through rim→clap→tom instead of more onsets), orbit (rotate a secondary pattern until it aligns at the boundary), call-and-answer, bounded ratchet window with a velocity shape (not a default full-bar snare roll), fake arrival (land on silence or a non-kick hit, real arrival later), timbral handoff (rhythm constant, articulation changes). Across an arrangement use several different families; a repeated transition is only acceptable as a deliberate hook.

Intros: the entry order should reveal the track's most distinctive rhythmic relationship — NOT reflexively kick, then hat, then clap. Topologies to choose from: anchor-first, motion-first (hats imply tempo before the low end), motif-first (a rim/tom/metallic figure as the track's ID), broken preview, negative silhouette (omissions imply the later full pattern), false meter resolved by the anchor, full-impact-then-subtraction, dialogue between two roles. Anti-formula: not every fill in the last half-bar; fill, crash and first kick need not coincide; the big event's position comes from the overall energy curve, not automatically from bar 64.

Arrangement gates — advance only when the current stage holds. Groove → arrangement: the anchor is legible, there is at least one memorable rhythmic relationship, kick and bass have a compatible strategy, at least two coherent transformations of the core exist, and the loop survives with one voice removed. Arrangement → done: every 16-32 bar block has its own function and energy, fills actually prepare the changes, pauses are deliberate, redundant parts are deleted.

Studying existing patterns: abstract, never copy. Describe a pattern without notes (anchor regularity, onsets per role, syncopated positions, interlocking, where the silence is, how the break differs), then regenerate from that description after changing at least one metric relationship and the orchestration. If the result is a recognizable transcription, start over.`;
