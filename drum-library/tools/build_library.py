#!/usr/bin/env python3
"""Build and validate the pre-generated Ableton drum MIDI catalogue."""

from __future__ import annotations

import json
import math
import struct
from dataclasses import asdict, dataclass
from pathlib import Path

PPQ = 480
TOTAL_BARS = 128
BEATS_PER_BAR = 4
TOTAL_BEATS = TOTAL_BARS * BEATS_PER_BAR
ROOT = Path(__file__).resolve().parents[1]

KICK = 36
RIM = 37
SNARE = 38
CLAP = 39
CH = 42
LOW_TOM = 44
MID_TOM = 45
OH = 46
HIGH_TOM = 47
CRASH = 48
RIDE = 50


@dataclass(frozen=True)
class Note:
    pitch: int
    start: float
    duration: float
    velocity: int
    channel: int = 9


def add(notes: list[Note], pitch: int, start: float, velocity: int, duration: float = 0.1) -> None:
    if 0 <= start < TOTAL_BEATS:
        notes.append(Note(pitch, round(start, 6), duration, velocity))


def bar_beat(bar: int, beat: float = 0.0) -> float:
    return (bar - 1) * BEATS_PER_BAR + beat


def fill(notes: list[Note], bar: int, pitches: list[int], velocities: list[int], subdivision: float = 0.25) -> None:
    start = bar_beat(bar, 2.0)
    for index, (pitch, velocity) in enumerate(zip(pitches, velocities)):
        add(notes, pitch, start + index * subdivision, velocity, 0.08)


def techno() -> tuple[list[Note], dict]:
    notes: list[Note] = []
    for bar in range(1, 129):
        phase = (bar - 1) // 16
        # Subtractive intro, two breaks, and a DJ-friendly outro.
        kick_on = not (bar <= 4 or 49 <= bar <= 52 or 97 <= bar <= 100 or bar > 124)
        if kick_on:
            for beat in range(4):
                add(notes, KICK, bar_beat(bar, beat), 119 if beat == 0 else 112)
        elif bar <= 4:
            add(notes, KICK, bar_beat(bar, 0), 112)

        if 5 <= bar <= 120 and not (49 <= bar <= 52 or 97 <= bar <= 100):
            for step in range(8):
                vel = 91 if step % 2 else 73
                add(notes, CH, bar_beat(bar, step * 0.5), vel)
        if 17 <= bar <= 120 and not (49 <= bar <= 52 or 97 <= bar <= 100):
            for beat in range(4):
                add(notes, OH, bar_beat(bar, beat + 0.5), 94 if beat in (1, 3) else 86, 0.16)
        if 17 <= bar <= 112 and not (49 <= bar <= 52 or 97 <= bar <= 100):
            add(notes, CLAP, bar_beat(bar, 1), 108)
            add(notes, CLAP, bar_beat(bar, 3), 112)
        if 33 <= bar <= 48 or 65 <= bar <= 96:
            add(notes, RIM, bar_beat(bar, 1.75), 65)
            if bar % 2 == 0:
                add(notes, RIM, bar_beat(bar, 3.25), 78)
        if 65 <= bar <= 96:
            for beat in range(4):
                add(notes, RIDE, bar_beat(bar, beat + 0.5), 74 if beat % 2 else 82)
        if bar in (17, 33, 53, 65, 81, 101, 113):
            add(notes, CRASH, bar_beat(bar), 118, 0.25)
        if bar in (16, 32, 64, 80, 112):
            fill(notes, bar, [LOW_TOM, MID_TOM, HIGH_TOM, MID_TOM, HIGH_TOM, HIGH_TOM, CLAP, CLAP],
                 [70, 76, 82, 87, 92, 98, 106, 119])
        if bar in (48, 96):
            # Silence supplies the first half; a short snare acceleration answers it.
            for index, velocity in enumerate((72, 78, 86, 96, 106, 118)):
                add(notes, SNARE, bar_beat(bar, 2.5 + index * 0.25), velocity, 0.07)
        if phase in (2, 5) and bar % 8 == 7:
            add(notes, KICK, bar_beat(bar, 3.75), 94)
    return notes, {
        "identity": "Straight 909 pressure: subtraction, closed/open-hat tension, restrained tom ramps.",
        "sections": [[1, 16, "filtered-style drum intro"], [17, 48, "main pressure"],
                     [49, 64, "break and rebuild"], [65, 96, "ride peak"],
                     [97, 112, "second break and return"], [113, 128, "final drive and outro"]],
    }


def disco() -> tuple[list[Note], dict]:
    notes: list[Note] = []
    swing = 0.055
    for bar in range(1, 129):
        active = not (49 <= bar <= 52 or 97 <= bar <= 100)
        if active and bar <= 120:
            for beat in range(4):
                add(notes, KICK, bar_beat(bar, beat), 114 if beat in (0, 2) else 106)
        elif bar <= 8 or bar > 120:
            add(notes, KICK, bar_beat(bar), 108)

        if 5 <= bar <= 124:
            for step in range(8):
                pos = step * 0.5 + (swing if step % 2 else 0)
                add(notes, CH, bar_beat(bar, pos), 73 if step % 2 == 0 else 91)
        if 9 <= bar <= 120 and active:
            add(notes, CLAP, bar_beat(bar, 1), 111)
            add(notes, CLAP, bar_beat(bar, 3), 115)
            for beat in range(4):
                add(notes, OH, bar_beat(bar, beat + 0.5 + swing), 97 if beat in (1, 3) else 89, 0.18)
        if 17 <= bar <= 112 and active:
            # Syncopated rim/tom conversation gives this machine kit a disco contour.
            add(notes, RIM, bar_beat(bar, 0.75 + swing), 69)
            add(notes, RIM, bar_beat(bar, 2.75 + swing), 80)
            if bar % 2 == 0:
                add(notes, LOW_TOM, bar_beat(bar, 3.5 + swing), 76)
        if 33 <= bar <= 48 or 65 <= bar <= 96:
            add(notes, 51, bar_beat(bar, 1.5 + swing), 78)  # 707 Ride
            add(notes, 51, bar_beat(bar, 3.5 + swing), 84)
        if bar in (9, 17, 33, 53, 65, 81, 101, 113):
            add(notes, 49, bar_beat(bar), 116, 0.25)  # 707 Crash
        if bar in (16, 32, 64, 80, 112):
            fill(notes, bar, [LOW_TOM, LOW_TOM, MID_TOM, MID_TOM, HIGH_TOM, HIGH_TOM, CLAP, CRASH],
                 [67, 73, 79, 84, 91, 98, 110, 121])
        if bar in (48, 96):
            for index, pitch in enumerate((RIM, RIM, SNARE, SNARE, CLAP, CLAP)):
                add(notes, pitch, bar_beat(bar, 2.5 + index * 0.25), 72 + index * 8, 0.08)
    return notes, {
        "identity": "Machine disco: four-on-floor continuity, swung hats, syncopated rim/tom answers.",
        "sections": [[1, 16, "percussion entrance"], [17, 48, "full disco engine"],
                     [49, 64, "break and lift"], [65, 96, "ride-led peak"],
                     [97, 112, "second lift"], [113, 128, "final chorus and DJ outro"]],
    }


def house() -> tuple[list[Note], dict]:
    notes: list[Note] = []
    swing = 0.035
    for bar in range(1, 129):
        active = not (49 <= bar <= 52 or 97 <= bar <= 100)
        if active and bar <= 120:
            for beat in range(4):
                add(notes, KICK, bar_beat(bar, beat), 116 if beat == 0 else 109)
        elif bar <= 8 or bar > 120:
            add(notes, KICK, bar_beat(bar), 109)

        if 5 <= bar <= 124:
            for step in range(8):
                pos = step * 0.5 + (swing if step % 2 else 0)
                add(notes, CH, bar_beat(bar, pos), 68 if step % 2 == 0 else 88)
        if 9 <= bar <= 120 and active:
            add(notes, CLAP, bar_beat(bar, 1), 108)
            if bar not in (32, 80):
                add(notes, CLAP, bar_beat(bar, 3), 113)
        if 17 <= bar <= 112 and active:
            for beat in range(4):
                add(notes, OH, bar_beat(bar, beat + 0.5 + swing), 91 if beat % 2 == 0 else 99, 0.17)
            if bar not in (48, 96):
                add(notes, RIM, bar_beat(bar, 2.75 + swing), 72)
                if bar % 2 == 0:
                    add(notes, RIM, bar_beat(bar, 3.5 + swing), 79)
        if 33 <= bar <= 48 or 65 <= bar <= 96:
            add(notes, LOW_TOM, bar_beat(bar, 1.75 + swing), 71)
            add(notes, MID_TOM, bar_beat(bar, 3.25 + swing), 78)
        if 81 <= bar <= 96:
            for beat in range(4):
                add(notes, RIDE, bar_beat(bar, beat + 0.5 + swing), 76)
        if bar in (9, 17, 33, 53, 65, 81, 101, 113):
            add(notes, 49, bar_beat(bar), 117, 0.25)  # 808 Cymbal
        if bar in (16, 64, 112):
            fill(notes, bar, [RIM, LOW_TOM, RIM, MID_TOM, SNARE, SNARE, CLAP, CLAP],
                 [64, 70, 73, 79, 87, 96, 107, 118])
        if bar in (32, 80):
            for index, velocity in enumerate((69, 75, 82, 90, 101, 116)):
                add(notes, CLAP, bar_beat(bar, 2.5 + index * 0.25), velocity, 0.07)
        if bar in (48, 96):
            # The missing downbeat before the boundary is the fill.
            add(notes, RIM, bar_beat(bar, 2.75), 82)
            add(notes, CLAP, bar_beat(bar, 3.5), 111)
    return notes, {
        "identity": "Classic house pocket: firm quarters, shuffled hat lift, sparse syncopated percussion.",
        "sections": [[1, 16, "DJ intro"], [17, 48, "main pocket"],
                     [49, 64, "break and rebuild"], [65, 96, "club peak"],
                     [97, 112, "second break"], [113, 128, "return and DJ outro"]],
    }


def vlq(value: int) -> bytes:
    output = [value & 0x7F]
    value >>= 7
    while value:
        output.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(output))


def write_midi(path: Path, name: str, tempo: float, notes: list[Note]) -> None:
    events: list[tuple[int, int, bytes]] = []
    title = name.encode("utf-8")
    events.append((0, 0, b"\xff\x03" + vlq(len(title)) + title))
    micros = round(60_000_000 / tempo)
    events.append((0, 0, b"\xff\x51\x03" + micros.to_bytes(3, "big")))
    events.append((0, 0, b"\xff\x58\x04\x04\x02\x18\x08"))
    for note in notes:
        on = round(note.start * PPQ)
        off = round((note.start + note.duration) * PPQ)
        status = 0x90 | note.channel
        events.append((on, 2, bytes((status, note.pitch, note.velocity))))
        events.append((off, 1, bytes((status, note.pitch, 0))))
    events.sort(key=lambda event: (event[0], event[1]))
    track = bytearray()
    previous = 0
    for tick, _, payload in events:
        track.extend(vlq(tick - previous))
        track.extend(payload)
        previous = tick
    end_tick = TOTAL_BEATS * PPQ
    track.extend(vlq(end_tick - previous))
    track.extend(b"\xff\x2f\x00")
    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, PPQ)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(header + b"MTrk" + struct.pack(">I", len(track)) + track)


def validate(notes: list[Note], allowed: set[int]) -> dict:
    if not notes:
        raise ValueError("arrangement contains no notes")
    invalid = sorted({note.pitch for note in notes} - allowed)
    if invalid:
        raise ValueError(f"notes outside verified device map: {invalid}")
    duplicates: set[tuple[int, int]] = set()
    seen: set[tuple[int, int]] = set()
    for note in notes:
        key = (round(note.start * PPQ), note.pitch)
        if key in seen:
            duplicates.add(key)
        seen.add(key)
        if not 1 <= note.velocity <= 127 or note.start < 0 or note.start + note.duration > TOTAL_BEATS:
            raise ValueError(f"invalid note: {note}")
    if duplicates:
        raise ValueError(f"duplicate notes at pitch/tick: {sorted(duplicates)[:5]}")
    return {
        "bars": TOTAL_BARS,
        "length_beats": TOTAL_BEATS,
        "note_count": len(notes),
        "used_pitches": sorted({note.pitch for note in notes}),
        "velocity_range": [min(n.velocity for n in notes), max(n.velocity for n in notes)],
        "last_note_end": round(max(n.start + n.duration for n in notes), 4),
    }


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text())
    generators = {"techno": techno, "disco": disco, "house": house}
    results = []
    for asset in manifest["assets"]:
        profile = json.loads((ROOT / asset["device_profile"]).read_text())
        allowed = set(profile["prototype_allowed_pitches"])
        notes, musical = generators[asset["genre"]]()
        inspection = validate(notes, allowed)
        path = ROOT / asset["midi_file"]
        write_midi(path, asset["id"], asset["tempo_bpm"], notes)
        metadata = {**asset, **musical, "validation": inspection}
        metadata_path = ROOT / asset["metadata_file"]
        metadata_path.parent.mkdir(parents=True, exist_ok=True)
        metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")
        results.append({"file": str(path.relative_to(ROOT)), **inspection})
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
