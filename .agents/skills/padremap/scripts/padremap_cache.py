#!/usr/bin/env python3
"""Validate and maintain the PADREMAP live-verified mapping cache."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
DEFAULT_CACHE = ROOT / "drum-library/devices/live-verified-pad-maps.json"
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")


def infer_roles(*names: str) -> list[str]:
    value = " ".join(names).casefold()
    rules = [
        (("kick", "bass drum", "bassdrum"), "kick"),
        (("snare",), "snare"),
        (("clap", "handclap"), "clap"),
        (("rim", "stick"), "rim"),
        (("closed hi", "hihat closed", "closed hat"), "closed_hat"),
        (("open hi", "hihat open", "open hat"), "open_hat"),
        (("low tom", "tom low"), "low_tom"),
        (("mid tom", "tom mid"), "mid_tom"),
        (("high tom", "hi tom", "tom high", "tom hi"), "high_tom"),
        (("ride",), "ride"),
        (("crash", "cymbal"), "crash"),
        (("cow",), "cowbell"),
        (("tamb",), "tambourine"),
        (("shaker", "maraca"), "shaker"),
        (("conga", "bongo"), "hand_drum"),
        (("clave",), "clave"),
        (("perc", "fx", "noise"), "percussion_fx"),
    ]
    roles = [role for needles, role in rules if any(needle in value for needle in needles)]
    return sorted(set(roles)) or ["other"]


def canonical_hash(pads: dict) -> str:
    payload = json.dumps(pads, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def validate(scan: dict) -> dict:
    required = {
        "preset_id", "display_name", "browser_query", "browser_uri",
        "preset_sha256", "live_version", "scanned_at", "verification_source", "pads",
    }
    missing = sorted(required - scan.keys())
    if missing:
        raise ValueError(f"missing scan fields: {missing}")
    if not ID_RE.fullmatch(str(scan["preset_id"])):
        raise ValueError("invalid preset_id")
    if not SHA_RE.fullmatch(str(scan["preset_sha256"])):
        raise ValueError("preset_sha256 must be 64 lowercase hex characters")
    if scan["verification_source"] != "live-lom":
        raise ValueError("verification_source must be live-lom")
    for field in ("display_name", "browser_query", "browser_uri", "live_version", "scanned_at"):
        if not isinstance(scan[field], str) or not scan[field].strip():
            raise ValueError(f"{field} must be a non-empty string")
    if not isinstance(scan["pads"], dict) or not scan["pads"]:
        raise ValueError("pads must be a non-empty object")

    pads: dict[str, dict] = {}
    for raw_pitch, raw_pad in scan["pads"].items():
        pitch = int(raw_pitch)
        if str(pitch) != str(raw_pitch) or not 0 <= pitch <= 127:
            raise ValueError(f"invalid pad pitch: {raw_pitch}")
        if not isinstance(raw_pad, dict) or not str(raw_pad.get("name", "")).strip():
            raise ValueError(f"pad {pitch} needs a name")
        chains = raw_pad.get("chains")
        if not isinstance(chains, list) or not chains:
            raise ValueError(f"pad {pitch} needs at least one chain")
        clean_chains = []
        for chain in chains:
            name = str(chain.get("name", "")).strip()
            in_note = int(chain.get("in_note"))
            out_note = int(chain.get("out_note"))
            choke_group = int(chain.get("choke_group"))
            if not name:
                raise ValueError(f"pad {pitch} has an unnamed chain")
            if in_note not in (pitch, -1):
                raise ValueError(f"pad {pitch} chain input is {in_note}")
            if not 0 <= out_note <= 127 or choke_group < 0:
                raise ValueError(f"pad {pitch} has invalid chain routing")
            clean_chains.append({
                "name": name,
                "in_note": in_note,
                "out_note": out_note,
                "choke_group": choke_group,
            })
        pad_name = str(raw_pad["name"]).strip()
        pads[str(pitch)] = {
            "name": pad_name,
            "roles": infer_roles(pad_name, *(chain["name"] for chain in clean_chains)),
            "chains": clean_chains,
        }

    pads = dict(sorted(pads.items(), key=lambda item: int(item[0])))
    result = {key: scan[key] for key in required if key != "pads"}
    result["pads"] = pads
    result["mapping_sha256"] = canonical_hash(pads)
    result["populated_pad_count"] = len(pads)
    return result


def load_cache(path: Path) -> dict:
    if not path.exists():
        return {"schema_version": 1, "entries": []}
    cache = json.loads(path.read_text())
    if cache.get("schema_version") != 1 or not isinstance(cache.get("entries"), list):
        raise ValueError("unsupported PADREMAP cache")
    return cache


def merge(scan_path: Path, cache_path: Path) -> dict:
    scan = validate(json.loads(scan_path.read_text()))
    cache = load_cache(cache_path)
    key = (scan["preset_id"], scan["preset_sha256"])
    cache["entries"] = [
        entry for entry in cache["entries"]
        if (entry.get("preset_id"), entry.get("preset_sha256")) != key
    ]
    cache["entries"].append(scan)
    cache["entries"].sort(key=lambda entry: (entry["preset_id"], entry["preset_sha256"]))
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, indent=2, sort_keys=True) + "\n")
    return scan


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("merge", "validate", "list"))
    parser.add_argument("scan", nargs="?", type=Path)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    args = parser.parse_args()
    if args.command == "list":
        cache = load_cache(args.cache)
        print(json.dumps({"entries": [
            {k: entry[k] for k in ("preset_id", "display_name", "preset_sha256", "live_version", "mapping_sha256", "populated_pad_count")}
            for entry in cache["entries"]
        ]}, indent=2))
        return
    if args.scan is None:
        parser.error("scan JSON is required")
    result = validate(json.loads(args.scan.read_text())) if args.command == "validate" else merge(args.scan, args.cache)
    print(json.dumps({
        "preset_id": result["preset_id"],
        "preset_sha256": result["preset_sha256"],
        "mapping_sha256": result["mapping_sha256"],
        "populated_pad_count": result["populated_pad_count"],
    }, indent=2))


if __name__ == "__main__":
    main()
