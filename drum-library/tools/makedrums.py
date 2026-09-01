#!/usr/bin/env python3
"""Select an approved drum asset and adapt its MIDI notes for Ableton LOM."""

from __future__ import annotations

import argparse
import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILENAME_RE = re.compile(
    r"^(?P<bpm>\d+)-(?P<genre>[a-z0-9-]+)-beat-(?P<sequence>\d{4})-(?P<kit>[a-z0-9-]+)\.mid$"
)


def next_track_name(genre: str, existing_names: list[str]) -> str:
    normalized = genre.casefold().strip()
    pattern = re.compile(rf"^Drum {re.escape(normalized)} (?P<serial>\d+)$")
    used = {
        int(match["serial"])
        for name in existing_names
        if (match := pattern.fullmatch(name)) is not None
    }
    serial = 1
    while serial in used:
        serial += 1
    return f"Drum {normalized} {serial:03d}"


def remap_notes(notes: list[dict], source_roles: dict[str, str], target_pads: dict[str, dict]) -> tuple[list[dict], dict]:
    used = sorted({int(note["pitch"]) for note in notes})
    mapping: dict[int, int] = {}
    for pitch in used:
        role = source_roles.get(str(pitch))
        if not role:
            raise ValueError(f"source kit has no semantic role for MIDI pitch {pitch}")
        current = target_pads.get(str(pitch))
        if current and role in current.get("roles", []):
            mapping[pitch] = pitch
            continue
        candidates = sorted(
            int(target_pitch) for target_pitch, pad in target_pads.items()
            if role in pad.get("roles", [])
        )
        if not candidates:
            raise ValueError(f"PADREMAP cannot translate role {role!r} from MIDI pitch {pitch}")
        mapping[pitch] = min(candidates, key=lambda candidate: (abs(candidate - pitch), candidate))

    remapped = [{**note, "pitch": mapping[int(note["pitch"])]} for note in notes]
    seen: set[tuple[int, float]] = set()
    for note in remapped:
        key = (int(note["pitch"]), float(note["start_time"]))
        if key in seen:
            raise ValueError(f"PADREMAP would create a duplicate note at pitch/time {key}")
        seen.add(key)
    return remapped, {
        "source_to_target": {str(source): target for source, target in sorted(mapping.items())},
        "remapped_note_count": sum(1 for note in notes if mapping[int(note["pitch"])] != int(note["pitch"])),
        "source_used_pitches": used,
        "output_used_pitches": sorted({int(note["pitch"]) for note in remapped}),
    }


def read_vlq(data: bytes, offset: int) -> tuple[int, int]:
    value = 0
    while True:
        byte = data[offset]
        offset += 1
        value = (value << 7) | (byte & 0x7F)
        if not byte & 0x80:
            return value, offset


def read_notes(path: Path) -> tuple[int, list[dict]]:
    data = path.read_bytes()
    if data[:4] != b"MThd":
        raise ValueError("not a Standard MIDI file")
    header_length = struct.unpack(">I", data[4:8])[0]
    _, tracks, ppq = struct.unpack(">HHH", data[8:14])
    if tracks != 1:
        raise ValueError("prototype accepts one-track MIDI files only")
    offset = 8 + header_length
    if data[offset:offset + 4] != b"MTrk":
        raise ValueError("missing MIDI track")
    size = struct.unpack(">I", data[offset + 4:offset + 8])[0]
    chunk = data[offset + 8:offset + 8 + size]
    cursor = tick = 0
    running = None
    active: dict[tuple[int, int], list[tuple[int, int]]] = {}
    notes: list[dict] = []
    while cursor < len(chunk):
        delta, cursor = read_vlq(chunk, cursor)
        tick += delta
        status = chunk[cursor]
        if status < 0x80:
            if running is None:
                raise ValueError("invalid running status")
            status = running
        else:
            cursor += 1
            if status < 0xF0:
                running = status
        if status == 0xFF:
            cursor += 1
            length, cursor = read_vlq(chunk, cursor)
            cursor += length
        elif status in (0xF0, 0xF7):
            length, cursor = read_vlq(chunk, cursor)
            cursor += length
        else:
            kind = status & 0xF0
            channel = status & 0x0F
            width = 1 if kind in (0xC0, 0xD0) else 2
            event = chunk[cursor:cursor + width]
            cursor += width
            if kind == 0x90 and event[1] > 0:
                active.setdefault((channel, event[0]), []).append((tick, event[1]))
            elif kind == 0x80 or (kind == 0x90 and event[1] == 0):
                key = (channel, event[0])
                if active.get(key):
                    start, velocity = active[key].pop(0)
                    notes.append({
                        "pitch": event[0],
                        "start_time": start / ppq,
                        "duration": (tick - start) / ppq,
                        "velocity": velocity,
                        "mute": False,
                    })
    if any(active.values()):
        raise ValueError("MIDI contains unterminated notes")
    notes.sort(key=lambda note: (note["start_time"], note["pitch"]))
    return ppq, notes


def select(genre: str) -> dict:
    manifest = json.loads((ROOT / "manifest.json").read_text())
    matches = [asset for asset in manifest["assets"] if asset["genre"].casefold() == genre.casefold()]
    if not matches:
        genres = ", ".join(sorted({asset["genre"] for asset in manifest["assets"]}))
        raise SystemExit(f"unsupported genre {genre!r}; available: {genres}")
    asset = matches[0]
    filename = Path(asset["midi_file"]).name
    match = FILENAME_RE.fullmatch(filename)
    if not match:
        raise ValueError(f"asset filename does not follow catalogue convention: {filename}")
    if int(match["bpm"]) != asset["tempo_bpm"] or match["genre"] != asset["genre"] or match["kit"] != asset["kit_id"]:
        raise ValueError(f"filename metadata disagrees with manifest: {filename}")
    device = json.loads((ROOT / asset["device_profile"]).read_text())
    cache = json.loads((ROOT / "devices/live-verified-pad-maps.json").read_text())
    verified = next((
        entry for entry in cache["entries"]
        if entry["preset_id"] == asset["kit_id"]
        and entry["preset_sha256"] == device["preset_sha256"]
    ), None)
    if verified is None:
        raise SystemExit(
            f"PADREMAP required for {device['display_name']} "
            f"({device['preset_sha256'][:12]}): run the first-launch preset scan"
        )
    _, source_notes = read_notes(ROOT / asset["midi_file"])
    notes, remap = remap_notes(source_notes, device["pad_roles"], verified["pads"])
    used = remap["output_used_pitches"]
    allowed = {int(pitch) for pitch in verified["pads"]}
    if not set(used) <= allowed:
        raise ValueError(f"filtered output uses unapproved pads: {sorted(set(used) - allowed)}")
    return {
        "asset": asset,
        "device": {
            "id": device["id"],
            "display_name": device["display_name"],
            "ableton_browser_query": device["ableton_browser_query"],
            "verified": device["verified"],
        },
        "clip": {"length_beats": asset["bars"] * 4, "notes": notes},
        "validation": {"note_count": len(notes), "used_pitches": used},
        "padremap": {
            "mapping_sha256": verified["mapping_sha256"],
            "live_version": verified["live_version"],
            "scanned_at": verified["scanned_at"],
            **remap,
        },
        "filename_metadata": match.groupdict(),
        "track_naming": {
            "prefix": f"Drum {asset['genre'].casefold()}",
            "serial_format": "first-unused-zero-padded-3",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("genre")
    parser.add_argument("--format", choices=("summary", "lom-json"), default="summary")
    args = parser.parse_args()
    result = select(args.genre)
    if args.format == "lom-json":
        print(json.dumps(result, separators=(",", ":")))
    else:
        asset = result["asset"]
        print(json.dumps({
            "asset_id": asset["id"],
            "genre": asset["genre"],
            "tempo_bpm": asset["tempo_bpm"],
            "bars": asset["bars"],
            "midi_file": str((ROOT / asset["midi_file"]).resolve()),
            "device": result["device"],
            "validation": result["validation"],
        }, indent=2))


if __name__ == "__main__":
    main()
