# Harmonic materials

Interval tables and the arithmetic. These are materials — what they *do* in a
piece depends on register, rhythm, voicing and context, and none of that is
decided here.

## Scales and modes

Semitones from the root. Add to the root's MIDI number.

| Collection | Intervals | Tends toward |
|---|---|---|
| Major (Ionian) | 0 2 4 5 7 9 11 | Resolved, plain, unambiguous |
| Natural minor (Aeolian) | 0 2 3 5 7 8 10 | The neutral dark; most loop-based music |
| Dorian | 0 2 3 5 7 9 10 | Minor with the sixth raised — hope inside the dark |
| Phrygian | 0 1 3 5 7 8 10 | The flat second is menace; Spanish, drill |
| Lydian | 0 2 4 6 7 9 11 | Major with a raised fourth — wonder, suspension |
| Mixolydian | 0 2 4 5 7 9 10 | Major with a flat seventh — blues, folk, funk |
| Locrian | 0 1 3 5 6 8 10 | Unstable by construction; rarely a home |
| Harmonic minor | 0 2 3 5 7 8 11 | The raised seventh creates a real pull home |
| Melodic minor | 0 2 3 5 7 9 11 | Ambiguous, jazz; minor bottom, major top |
| Minor pentatonic | 0 3 5 7 10 | Five notes that cannot clash |
| Major pentatonic | 0 2 4 7 9 | Open, folk, unresolvable in a pleasant way |
| Blues | 0 3 5 6 7 10 | Pentatonic plus the flat five |
| Whole tone | 0 2 4 6 8 10 | No leading tone anywhere; weightless, dreamlike |
| Octatonic (dim) | 0 2 3 5 6 8 9 11 | Symmetrical tension; horror, tension cues |

Modes are the same seven notes started from different places, which means
choosing a mode is choosing *which note feels like home* — and that choice is
established by the bass and by emphasis, not by the note list. A mode nobody
hears the tonic of is just a scale.

## Chords

Semitones from the chord root.

| Chord | Intervals | Present |
|---|---|---|
| Major triad | 0 4 7 | |
| Minor triad | 0 3 7 | |
| Diminished | 0 3 6 | Tritone; unstable |
| Augmented | 0 4 8 | Symmetrical; no home |
| sus2 / sus4 | 0 2 7 / 0 5 7 | No third — neither major nor minor |
| Major 7 | 0 4 7 11 | The seventh is a step below the octave: soft friction |
| Minor 7 | 0 3 7 10 | The workhorse of loop-based music |
| Dominant 7 | 0 4 7 10 | Tritone between third and seventh: wants to move |
| Minor 9 | 0 3 7 10 14 | Colour without commitment |
| Major 9 | 0 4 7 11 14 | Wide, floating |
| 6 / min6 | 0 4 7 9 / 0 3 7 9 | Older, gentler than a seventh |
| Half-diminished | 0 3 6 10 | Minor's darkest usable chord |
| 7#9 / 7b9 | 0 4 7 10 15 / 0 4 7 10 13 | Deliberate grit on a dominant |
| Quartal | 0 5 10 | Stacked fourths: modern, unplaceable, no third |

A chord's character comes from which intervals are present, not from the name.
Removing the third makes it modeless; removing the fifth costs almost nothing;
removing the root is usually an improvement when a bass exists.

## Degrees

To build on a scale degree: take the offset, add it to the key root, then
stack the chord intervals on that.

| degree | i/I | ii/II | III/iii | iv/IV | v/V | VI/vi | VII/vii |
|---|---|---|---|---|---|---|---|
| in major | 0 | 2 | 4 | 5 | 7 | 9 | 11 |
| in minor | 0 | 2 | 3 | 5 | 7 | 8 | 10 |

The chord quality that falls naturally on each degree comes from the
collection itself: in natural minor, i / ii° / III / iv / v / VI / VII. You
can override any of them — a major V in a minor key (borrowed from harmonic
minor) is the standard way to get a real cadence, and borrowing in the other
direction is where a lot of modern colour comes from.

## Voicing arithmetic, worked

Fm9 over an F bass, chords in the 53-67 range.

- F minor 9 = F Ab C Eb G. The bass has F.
- Drop the root: Ab C Eb G.
- Place in register: Ab3 = 56, C4 = 60, Eb4 = 63, G4 = 67.

Moving to the chord a minor third below (Db), staying smooth:

- Db major 9 = Db F Ab C. The bass takes Db.
- Drop the root: F Ab C — and Eb from the previous chord can stay as the ninth.
- Place: F3 = 53, Ab3 = 56, C4 = 60, Eb4 = 63.

Three of the four voices did not move. That is why it sounds like one
instrument breathing rather than two shapes; and it is a property of the
*voicing*, not of the two chord names, which is the whole reason to think in
voices.

## Frequency and mud

Approximate lowest interval that stays clear at a given register:

| Bottom note | Safe interval above |
|---|---|
| MIDI 28-36 | octave or nothing — sub range, one note at a time |
| 36-43 | fifth |
| 43-48 | fourth |
| 48-55 | third |
| 55+ | anything, including seconds |

This is why big chords are voiced wide at the bottom and close at the top, and
why a lush voicing transposed down two octaves turns to porridge.
