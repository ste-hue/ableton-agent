#!/usr/bin/env python3
"""Extract installed Ableton Drum Rack pad maps from compressed ADG presets."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

DEFAULT_ROOTS = [
    Path("/Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Core Library/Racks/Drum Racks"),
    Path.home() / "Music/Ableton/User Library/Presets/Instruments/Drum Rack",
]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")


def first_value(node: ET.Element, tags: tuple[str, ...]) -> str | None:
    for tag in tags:
        for element in node.iter(tag):
            value = element.get("Value", "").strip()
            if value and value != "AudioBranchMixerDevice":
                return value
    return None


def sound_name(branch: ET.Element) -> str:
    direct = first_value(branch, ("UserName", "Name"))
    if direct:
        return direct
    relative = first_value(branch, ("RelativePath",))
    if relative:
        return Path(relative).stem
    return "Unlabelled Pad"


def infer_role(name: str) -> str:
    value = name.casefold()
    rules = [
        (("kick", "bass drum", "bassdrum", "bd "), "kick"),
        (("snare",), "snare"),
        (("clap", "handclap"), "clap"),
        (("rim", "stick"), "rim"),
        (("closed hi", "hihat closed", "closed hat", "chh"), "closed_hat"),
        (("open hi", "hihat open", "open hat", "ohh"), "open_hat"),
        (("tom",), "tom"),
        (("ride",), "ride"),
        (("crash", "cymbal"), "cymbal"),
        (("cow",), "cowbell"),
        (("tamb",), "tambourine"),
        (("shaker", "maraca"), "shaker"),
        (("conga", "bongo"), "hand_drum"),
        (("perc", "fx ", "noise"), "percussion_fx"),
    ]
    for needles, role in rules:
        if any(needle in value for needle in needles):
            return role
    return "other"


def genre_tags(name: str, category: str) -> tuple[list[str], str]:
    value = f"{name} {category}".casefold()
    explicit = [
        (("909", "techno"), ["techno", "tech-house", "house", "acid-house"]),
        (("808",), ["hip-hop", "trap", "electro", "house", "rnb"]),
        (("707",), ["house", "disco", "electro", "synth-pop"]),
        (("606",), ["acid-house", "minimal-techno", "electro", "indie-dance"]),
        (("dmx",), ["electro", "hip-hop", "disco", "funk"]),
        (("c78", "cr-78"), ["disco", "indie-dance", "house", "synth-pop"]),
        (("garage",), ["uk-garage", "house", "tech-house", "breaks"]),
        (("chicago",), ["chicago-house", "acid-house", "house", "deep-house"]),
        (("dancehall", "riddim"), ["dancehall", "reggae", "afro-caribbean"]),
        (("driller", "drill"), ["drill", "trap", "hip-hop"]),
        (("boom bap",), ["boom-bap", "hip-hop", "lo-fi"]),
        (("lo-fi", "lofi", "mellow", "cozy"), ["lo-fi", "hip-hop", "downtempo"]),
        (("selector",), ["electronic", "experimental", "multi-genre"]),
    ]
    for needles, tags in explicit:
        if any(needle in value for needle in needles):
            return tags, "name-and-family-heuristic"
    if "acoustic" in value:
        return ["funk", "soul", "indie", "rock", "live-drums"], "category-heuristic"
    if "drum machines" in value:
        return ["electronic", "house", "electro"], "category-heuristic"
    if "electronic" in value:
        return ["electronic", "house", "techno", "experimental"], "category-heuristic"
    return ["hip-hop", "electronic", "experimental"], "category-heuristic"


def parse_kit(path: Path, root: Path) -> dict | None:
    try:
        raw = gzip.open(path, "rb").read()
        tree = ET.fromstring(raw)
    except (OSError, ET.ParseError):
        return None
    pads: dict[str, dict] = {}
    for branch in tree.iter("DrumBranchPreset"):
        receiving = next((e.get("Value") for e in branch.iter("ReceivingNote")), None)
        if receiving is None:
            continue
        # Ableton stores Drum Rack receiving notes inverted: stored 92 = MIDI 36.
        pitch = 128 - int(receiving)
        if not 0 <= pitch <= 127:
            continue
        name = sound_name(branch)
        sending = next((e.get("Value") for e in branch.iter("SendingNote")), None)
        choke = next((e.get("Value") for e in branch.iter("ChokeGroup")), None)
        pads[str(pitch)] = {
            "sound": name,
            "role": infer_role(name),
            "stored_receiving_note": int(receiving),
            "sending_note": int(sending) if sending is not None else None,
            "choke_group": int(choke) if choke is not None else None,
        }
    if not pads:
        return None
    relative = path.relative_to(root)
    category = str(relative.parent)
    genres, basis = genre_tags(path.stem, category)
    return {
        "id": slug(path.stem),
        "display_name": path.stem,
        "browser_query": path.stem,
        "category": category,
        "source_path": str(path),
        "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "mapping_source": "static-adg-extraction",
        "mapping_verified": True,
        "genre_tags": genres,
        "genre_assignment_basis": basis,
        "pads": dict(sorted(pads.items(), key=lambda item: int(item[0]))),
    }


def build(roots: list[Path]) -> dict:
    kits: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.adg")):
            kit = parse_kit(path, root)
            if not kit:
                continue
            key = (kit["display_name"].casefold(), kit["source_sha256"])
            if key in seen:
                continue
            seen.add(key)
            kits.append(kit)
    kits.sort(key=lambda kit: (kit["display_name"].casefold(), kit["source_path"]))
    id_counts: dict[str, int] = {}
    for kit in kits:
        base_id = kit["id"]
        id_counts[base_id] = id_counts.get(base_id, 0) + 1
        if id_counts[base_id] > 1:
            kit["id"] = f"{base_id}-{id_counts[base_id]}"
    return {
        "schema_version": 1,
        "ableton_version_family": "Live 12",
        "pitch_note": "MIDI pitch numbers are authoritative; octave labels are intentionally omitted.",
        "genre_note": "Genre tags are routing recommendations, not facts about the samples.",
        "kit_count": len(kits),
        "kits": kits,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "devices/installed-drum-kits.json")
    parser.add_argument("--root", action="append", type=Path)
    args = parser.parse_args()
    catalogue = build(args.root or DEFAULT_ROOTS)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalogue, indent=2) + "\n")
    print(json.dumps({"output": str(args.output), "kit_count": catalogue["kit_count"]}, indent=2))


if __name__ == "__main__":
    main()
