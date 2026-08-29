# Drum map

Ableton's factory Drum Racks are laid out on the General MIDI convention, so
the numbers below are reliable for stock kits. Third-party racks and sliced
loops are not bound by it — when a pitch sounds wrong, read the truth from the
rack instead of guessing (see the bottom of this file).

## The pieces you actually use

| MIDI | Piece | Notes on use |
|---|---|---|
| 35 | Acoustic / sub kick | Some kits put a longer 808 boom here |
| **36** | **Kick** | The one that matters |
| 37 | Rim / sidestick | Quiet backbeat substitute; lovely in half-time |
| **38** | **Snare** | Backbeat. Ghost notes live here too |
| 39 | Clap | Layer *with* the snare, or replace it (house, trap) |
| 40 | Electric snare | Second snare colour for fills |
| 41 / 45 / 48 | Low / mid / high tom | Fills, and the tom groove in afro styles |
| **42** | **Closed hat** | Where the style lives |
| 44 | Pedal hat | Foot-closed, quieter than 42 |
| **46** | **Open hat** | Almost always on an off-beat; close it after |
| 49 / 57 | Crash | Section starts, sparingly |
| 51 / 59 | Ride | Swap for hats when the beat wants to be jazzier |
| 54 | Tambourine | Adds sixteenths without adding hats |
| 56 | Cowbell | Latin, and 808 tracks |
| 70 | Shaker | The quiet mover in afro and latin |
| 75 | Clave | The pattern that everything else agrees with |
| 76 / 77 | Wood block hi/lo | Percussive accents |

## Velocity tiers

Velocity is 1-127 and is the single biggest lever on feel.

| Tier | Range | What it is |
|---|---|---|
| Accent | 110-127 | The hits that define the bar: kick on one, backbeat snare |
| Normal | 85-105 | The body of the pattern |
| Soft | 60-80 | Off-beat hats, secondary percussion |
| **Ghost** | 30-55 | Barely-there snare or hat taps *between* the real hits |

Ghost notes are the most under-used tool in programmed drums. On a snare they
turn a stiff backbeat into something that feels played, and they cost two
notes per bar.

## Micro-timing

Offsets are in beats (1.0 = a quarter note). At 90 BPM, 0.01 beats ≈ 7 ms.

| Feel | Offset | Where |
|---|---|---|
| Laid back | +0.01 to +0.03 | Hats, snare — drags the beat, relaxed, hip hop |
| On the grid | 0 | Kick, and all of techno |
| Pushed | -0.01 to -0.02 | Percussion, claps — urgent, dance floor |

Keep the kick honest. When the kick drifts the whole track feels drunk rather
than grooving; move everything else around it.

## Swing

A shuffle delays the off-subdivisions. `groove.py --swing` uses the DAW
convention: 50 straight, 66 a full triplet. The unit matters:

- **Sixteenth swing** (`--swing-unit 16`): hip hop, modern house, garage.
  The "e" and "a" of each beat get pushed late.
- **Eighth swing** (`--swing-unit 8`): jazz, shuffle, boom bap played over an
  eighth pulse. A far more pronounced lilt.

Values above ~62 start sounding like a deliberate shuffle rather than a
groove; 54-58 is where most records sit.

## When a kit ignores the map

Sliced loops, third-party racks and some Packs assign pads freely. Read the
rack's own chains through the LOM instead of assuming:

```
live_children  ref: {path: "live_set tracks N devices 0"}  child: "chains"
```

Each chain's `name` tells you what the pad is, and its position gives the
pitch (chain 0 is the rack's lowest note, usually 36 in Live's default
layout). One read is cheaper than a beat built on wrong pitches.
