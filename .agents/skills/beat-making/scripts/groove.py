#!/usr/bin/env python3
"""Compile compact drum-pattern notation into live_clip_add_notes JSON.

Writing a groove note-by-note as JSON is slow and error-prone: a two-bar
boom bap pattern is ~30 notes, and the parts that make it *feel* right
(velocity tiers, swing, micro-timing) get lost in the noise. This compiles
a readable grid into the note array instead, so the pattern stays visible
and editable as text.

Pattern line:
    <name> [pitch] [modifiers] <grid>

    kick          X..x|....|x...|..x.
    snare  38     ....|X...|..o.|X...
    hat    42 @+0.06  x.x.|x.x.|x.x.|x.x.

  name       drum name (resolved via the built-in map) or any label if a
             pitch is given explicitly
  pitch      optional MIDI note; omit it when the name is in the map
  modifiers  @+N / @-N  shift every note of this line by N beats (feel:
                        "+" lays back, "-" pushes ahead of the beat)
             /N         note duration in beats (default 0.1, drums are hits)
  grid       one character per subdivision; "|" is decoration and ignored
                 X  accent      x  normal      o  ghost      .  rest

Swing is expressed the way DAWs do: --swing 50 is straight, 66 is a full
triplet shuffle, 54-58 is the pocket most hip hop and house lives in. It
delays the off-subdivisions only, which is exactly what a shuffle is.

Humanization is seeded, so the same command always yields the same groove.
That matters here: a beat has to be reproducible from its recipe, and
"random each run" would break that.

This tool makes no musical decisions. It renders whatever you invent, exactly
and repeatably — compose probabilistically, execute deterministically.

Usage:
    groove.py patterns.txt --grid 16 --swing 56 --humanize 6 --name my-groove
    cat patterns.txt | groove.py - --bars 2
    groove.py --example              # show the notation
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys

# The General MIDI drum map, which Live's Drum Racks follow for the common
# pieces. Names are what a musician says; the numbers are what the LOM wants.
DRUM_MAP = {
    "kick": 36, "bd": 36, "cassa": 36,
    "kick2": 35, "sub": 35,
    "rim": 37, "rimshot": 37,
    "snare": 38, "sd": 38, "rullante": 38,
    "clap": 39, "battimani": 39,
    "snare2": 40, "esnare": 40,
    "tomlow": 41, "tom1": 41,
    "hat": 42, "chh": 42, "hihat": 42, "closedhat": 42,
    "tommid": 45, "tom2": 45,
    "ohh": 46, "openhat": 46, "hatopen": 46,
    "tomhigh": 48, "tom3": 48,
    "crash": 49,
    "ride": 51,
    "tambourine": 54, "tamb": 54,
    "cowbell": 56,
    "shaker": 70,
    "clave": 75,
    "perc": 76,
}

VEL = {"X": 118, "x": 96, "o": 44}
GHOST = "o"


def resolve_pitch(name: str, explicit: str | None) -> int:
    if explicit is not None:
        return int(explicit)
    key = name.lower().replace("-", "").replace("_", "")
    if key not in DRUM_MAP:
        raise SystemExit(
            f"unknown drum name '{name}' — give a pitch explicitly "
            f"(e.g. '{name} 61 x...') or use one of: {', '.join(sorted(set(DRUM_MAP)))}"
        )
    return DRUM_MAP[key]


def parse_line(line: str):
    """-> (pitch, grid, shift_beats, duration) or None for blank/comment."""
    line = line.split("#", 1)[0].strip()
    if not line:
        return None
    tokens = line.split()
    name = tokens.pop(0)

    pitch_token = None
    if tokens and re.fullmatch(r"\d{1,3}", tokens[0]):
        pitch_token = tokens.pop(0)

    shift, duration = 0.0, None
    while tokens and (tokens[0].startswith("@") or tokens[0].startswith("/")):
        tok = tokens.pop(0)
        if tok.startswith("@"):
            shift = float(tok[1:])
        else:
            duration = float(tok[1:])

    grid = "".join(tokens).replace("|", "")
    if not grid:
        raise SystemExit(f"pattern line has no grid: {line!r}")
    bad = set(grid) - set("Xxo.")
    if bad:
        raise SystemExit(f"unknown grid characters {sorted(bad)} in {line!r} (use X x o .)")
    return resolve_pitch(name, pitch_token), grid, shift, duration


def compile_pattern(lines, grid_div, swing, humanize, seed, default_dur,
                    bars=None, swing_unit=None):
    """grid_div: subdivisions per beat (4 = sixteenths). swing: 50..75.

    swing_unit says which subdivision gets delayed: 16 shuffles the
    sixteenths (hip hop, modern house), 8 shuffles the eighths (jazz,
    shuffle, garage). They sound completely different, so it is worth
    being explicit; by default the grid decides.
    """
    rng = random.Random(seed)
    step = 1.0 / grid_div
    unit_div = (swing_unit // 4) if swing_unit else grid_div
    unit_div = max(1, min(unit_div, grid_div))
    period = max(1, round(grid_div / unit_div))        # steps per swung unit
    swing_delay = (swing - 50.0) / 100.0 * (2.0 / unit_div)  # 66% -> triplet feel
    notes = []
    longest = 0

    for parsed in (parse_line(l) for l in lines):
        if parsed is None:
            continue
        pitch, grid, shift, duration = parsed
        if bars:
            need = int(bars * 4 * grid_div)
            grid = (grid * (need // len(grid) + 1))[:need]
        longest = max(longest, len(grid))
        dur = duration if duration is not None else default_dur

        for i, ch in enumerate(grid):
            if ch == ".":
                continue
            t = i * step + shift
            # a step lands on a swung off-unit when it sits exactly halfway
            # between two units: that is the note a shuffle pushes late
            if period > 1 and (i % (period * 2)) == period:
                t += swing_delay
            elif period == 1 and i % 2 == 1:
                t += swing_delay
            vel = VEL[ch]
            if humanize:
                vel += rng.randint(-humanize, humanize)
                # ghosts stay ghosts and accents stay accents: clamp gently
                vel = max(20, min(127, vel))
                t += rng.uniform(-0.004, 0.004) * humanize
            notes.append({
                "pitch": pitch,
                "start_time": round(max(0.0, t), 4),
                "duration": dur,
                "velocity": int(vel),
            })

    notes.sort(key=lambda n: (n["start_time"], n["pitch"]))
    beats = longest / grid_div
    length = max(1.0, 4.0 * round(beats / 4.0) or 4.0)
    return notes, length


# A syntax demonstration, not a groove to compose from. It exercises every
# feature of the notation on deliberately neutral material: copying it will
# give you this, and this is nobody's idea of a beat.
SYNTAX_EXAMPLE = """# every line is: <name> [pitch] [@shift] [/duration] <grid>
# X accent   x normal   o ghost   . rest   | ignored, for reading

kick          X...|....|x...|....      # named drum, resolved via the map
snare         ....|X...|..o.|X...      # ghost note between the backbeats
hat    @+0.02 x.x.|x.x.|x.x.|x.x.      # @ shifts the part late (lays back)
openhat  /0.3 ....|....|....|...x      # / sets duration, for ringing hits
perc 61       ..x.|....|..x.|....      # explicit pitch when not in the map

# then compile, e.g.:
#   groove.py pattern.txt --swing 56 --humanize 6 --summary
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pattern_file", nargs="?", help="file with pattern lines, or - for stdin")
    ap.add_argument("--example", action="store_true",
                    help="print a syntax demonstration and exit (it shows the notation; "
                         "it is not a groove to compose from)")
    ap.add_argument("--grid", type=int, default=16,
                    help="subdivisions per bar: 16 = sixteenths (default), 8 = eighths, 32 = 32nds")
    ap.add_argument("--swing", type=float, default=50.0, help="50 straight .. 66 triplet shuffle")
    ap.add_argument("--swing-unit", type=int, choices=[8, 16], default=None,
                    help="which subdivision shuffles: 16 = sixteenth swing (hip hop, "
                         "house), 8 = eighth swing (jazz, shuffle). Default: the grid.")
    ap.add_argument("--humanize", type=int, default=0, help="velocity/timing jitter, 0-12 (6 is natural)")
    ap.add_argument("--seed", type=int, default=7, help="humanization seed (same seed = same groove)")
    ap.add_argument("--dur", type=float, default=0.1, help="default note duration in beats")
    ap.add_argument("--bars", type=int, help="tile or trim every line to this many bars")
    ap.add_argument("--name", default="groove", help="clip_name in the output")
    ap.add_argument("--summary", action="store_true", help="also print a human-readable check to stderr")
    args = ap.parse_args()

    if args.example:
        print(SYNTAX_EXAMPLE, end="")
        return

    if not args.pattern_file:
        ap.error("give a pattern file (or - for stdin), or use --example to see the notation")
    src = sys.stdin if args.pattern_file == "-" else open(args.pattern_file, encoding="utf-8")
    with src as fh:
        lines = fh.read().splitlines()

    grid_div = args.grid // 4
    if grid_div < 1:
        raise SystemExit("--grid must be 4, 8, 16 or 32 (subdivisions per bar)")

    notes, length = compile_pattern(
        lines, grid_div, args.swing, args.humanize, args.seed, args.dur,
        args.bars, args.swing_unit
    )

    if args.summary:
        by_pitch = {}
        for n in notes:
            by_pitch.setdefault(n["pitch"], []).append(n["velocity"])
        print(f"{len(notes)} notes over {length:g} beats "
              f"({length/4:g} bars), swing {args.swing:g}", file=sys.stderr)
        for pitch, vels in sorted(by_pitch.items()):
            name = next((k for k, v in DRUM_MAP.items() if v == pitch), "?")
            print(f"  {pitch:>3} {name:<10} {len(vels):>3} hits  vel {min(vels)}-{max(vels)}",
                  file=sys.stderr)

    print(json.dumps({
        "clip_name": args.name,
        "create_clip_length": length,
        "notes": notes,
    }, indent=1))


if __name__ == "__main__":
    main()
