#!/usr/bin/env python3
"""Validate and diff Liveworks recipe files.

Spec: docs/superpowers/specs/2026-08-28-liveworks-design.md (section 4).
Stdlib only, Python 3.10+. No Live/MCP access.
"""
from __future__ import annotations

import json
import math
import re

FLOAT_TOL = 1e-6
TRACK_TYPES = {"midi", "audio", "return"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ENV_KEYS = {
    "recipe_schema_version": int,
    "live_version": str,
    "ableton_agent_version": str,
    "chordarium_engine_commit": str,
    "platform": str,
}


def load_recipe(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _is_int(x):
    return isinstance(x, int) and not isinstance(x, bool)


def _check_param(errors, path, obj):
    """Parameter: bare number, or {"value": num, "display"?: str, "symbol"?: str|int}."""
    if _is_num(obj):
        return
    if not isinstance(obj, dict):
        errors.append(f"{path}: expected number or object with 'value'")
        return
    if not _is_num(obj.get("value")):
        errors.append(f"{path}.value: required number")
    if "display" in obj and not isinstance(obj["display"], str):
        errors.append(f"{path}.display: must be string")
    if "symbol" in obj and not (isinstance(obj["symbol"], str) or _is_int(obj["symbol"])):
        errors.append(f"{path}.symbol: must be string or int")


def _check_note(errors, path, note):
    if not isinstance(note, dict):
        errors.append(f"{path}: expected object")
        return
    if not (_is_int(note.get("pitch")) and 0 <= note["pitch"] <= 127):
        errors.append(f"{path}.pitch: required int 0..127")
    if not (_is_num(note.get("start")) and note["start"] >= 0):
        errors.append(f"{path}.start: required number >= 0")
    if not (_is_num(note.get("dur")) and note["dur"] > 0):
        errors.append(f"{path}.dur: required number > 0")
    if not (_is_int(note.get("vel")) and 1 <= note["vel"] <= 127):
        errors.append(f"{path}.vel: required int 1..127")
    if "mute" in note and not isinstance(note["mute"], bool):
        errors.append(f"{path}.mute: must be bool")


def _check_generator(errors, path, gen):
    if not isinstance(gen, dict):
        errors.append(f"{path}: expected object")
        return
    for key in ("engine", "engine_commit", "seed"):
        if not isinstance(gen.get(key), str):
            errors.append(f"{path}.{key}: required string")
    if not isinstance(gen.get("settings"), dict):
        errors.append(f"{path}.settings: required object")


def _check_clip(errors, path, clip):
    if not isinstance(clip, dict):
        errors.append(f"{path}: expected object")
        return
    if not (_is_int(clip.get("slot")) and clip["slot"] >= 0):
        errors.append(f"{path}.slot: required int >= 0")
    if not (_is_num(clip.get("length")) and clip["length"] > 0):
        errors.append(f"{path}.length: required number > 0")
    if "loop" in clip and not isinstance(clip["loop"], bool):
        errors.append(f"{path}.loop: must be bool")
    if "name" in clip and not isinstance(clip["name"], str):
        errors.append(f"{path}.name: must be string")
    notes = clip.get("notes")
    if not isinstance(notes, list):
        errors.append(f"{path}.notes: required list (may be empty)")
    else:
        for i, note in enumerate(notes):
            _check_note(errors, f"{path}.notes[{i}]", note)
    if "generator" in clip:
        _check_generator(errors, f"{path}.generator", clip["generator"])


def _check_device(errors, path, dev):
    if not isinstance(dev, dict):
        errors.append(f"{path}: expected object")
        return
    load = dev.get("load")
    if not isinstance(load, dict) or not isinstance(load.get("name"), str) or not load.get("name"):
        errors.append(f"{path}.load.name: required non-empty string")
    elif "root" in load and not isinstance(load["root"], str):
        errors.append(f"{path}.load.root: must be string")
    if "class_name" in dev and not isinstance(dev["class_name"], str):
        errors.append(f"{path}.class_name: must be string")
    params = dev.get("params", {})
    if not isinstance(params, dict):
        errors.append(f"{path}.params: must be object")
    else:
        for pname, pval in params.items():
            _check_param(errors, f"{path}.params.{pname}", pval)


def _check_mixer(errors, path, mixer):
    if not isinstance(mixer, dict):
        errors.append(f"{path}: expected object")
        return
    for key in ("volume", "pan"):
        if key in mixer:
            _check_param(errors, f"{path}.{key}", mixer[key])
    if "sends" in mixer:
        if not isinstance(mixer["sends"], list):
            errors.append(f"{path}.sends: must be list")
        else:
            for i, send in enumerate(mixer["sends"]):
                _check_param(errors, f"{path}.sends[{i}]", send)


def _check_track(errors, path, track):
    if not isinstance(track, dict):
        errors.append(f"{path}: expected object")
        return
    if not isinstance(track.get("name"), str) or not track.get("name"):
        errors.append(f"{path}.name: required non-empty string")
    if track.get("type") not in TRACK_TYPES:
        errors.append(f"{path}.type: required one of {sorted(TRACK_TYPES)}")
    if "color_index" in track and not _is_int(track["color_index"]):
        errors.append(f"{path}.color_index: must be int")
    if "mixer" in track:
        _check_mixer(errors, f"{path}.mixer", track["mixer"])
    for key, checker in (("devices", _check_device), ("clips", _check_clip)):
        if key in track:
            if not isinstance(track[key], list):
                errors.append(f"{path}.{key}: must be list")
            else:
                for i, item in enumerate(track[key]):
                    checker(errors, f"{path}.{key}[{i}]", item)


def _check_scene(errors, path, scene):
    if not isinstance(scene, dict):
        errors.append(f"{path}: expected object")
        return
    if not (_is_int(scene.get("index")) and scene["index"] >= 0):
        errors.append(f"{path}.index: required int >= 0")
    if "name" in scene and not isinstance(scene["name"], str):
        errors.append(f"{path}.name: must be string")
    if "tempo" in scene and scene["tempo"] is not None and not _is_num(scene["tempo"]):
        errors.append(f"{path}.tempo: must be number or null")


def validate_recipe(data):
    if not isinstance(data, dict):
        return ["recipe: expected top-level object"]
    errors = []
    if data.get("recipe_version") != 1:
        errors.append("recipe_version: must be 1")
    if not isinstance(data.get("name"), str) or not data.get("name"):
        errors.append("name: required non-empty string")
    if not isinstance(data.get("created"), str) or not DATE_RE.match(data.get("created", "")):
        errors.append("created: required YYYY-MM-DD string")
    env = data.get("environment")
    if not isinstance(env, dict):
        errors.append("environment: required object")
    else:
        for key, typ in ENV_KEYS.items():
            val = env.get(key)
            if not isinstance(val, typ) or isinstance(val, bool):
                errors.append(f"environment.{key}: required {typ.__name__}")
    song = data.get("song")
    if song is not None:
        if not isinstance(song, dict):
            errors.append("song: must be object")
        else:
            if "tempo" in song and not (_is_num(song["tempo"]) and 20 <= song["tempo"] <= 999):
                errors.append("song.tempo: must be number in 20..999")
            if "root_note" in song and not (_is_int(song["root_note"]) and 0 <= song["root_note"] <= 11):
                errors.append("song.root_note: must be int 0..11")
            if "scale_name" in song and not isinstance(song["scale_name"], str):
                errors.append("song.scale_name: must be string")
    tracks = data.get("tracks")
    if not isinstance(tracks, list):
        errors.append("tracks: required list")
    else:
        for i, track in enumerate(tracks):
            _check_track(errors, f"tracks[{i}]", track)
    if "scenes" in data:
        if not isinstance(data["scenes"], list):
            errors.append("scenes: must be list")
        else:
            for i, scene in enumerate(data["scenes"]):
                _check_scene(errors, f"scenes[{i}]", scene)
    if "omissions" in data:
        oms = data["omissions"]
        if not isinstance(oms, list) or not all(isinstance(o, str) for o in oms):
            errors.append("omissions: must be list of strings")
    return errors


def _canon_param(obj):
    if _is_num(obj):
        return {"value": float(obj)}
    out = {"value": float(obj["value"])}
    if "symbol" in obj:
        out["symbol"] = obj["symbol"]
    return out


def _canon_notes(notes):
    canon = [
        {
            "pitch": n["pitch"],
            "start": float(n["start"]),
            "dur": float(n["dur"]),
            "vel": n["vel"],
            "mute": bool(n.get("mute", False)),
        }
        for n in notes
    ]
    return sorted(canon, key=lambda n: (n["pitch"], n["start"], n["dur"], n["vel"]))


def canonicalize(data):
    """Strip debug/context fields (created, environment, display, omissions), normalize floats, sort notes."""
    out = {"recipe_version": data.get("recipe_version"), "name": data.get("name")}
    if "song" in data:
        out["song"] = {
            k: (float(v) if _is_num(v) else v) for k, v in data["song"].items()
        }
    tracks_out = []
    for track in data.get("tracks", []):
        t = {"name": track.get("name"), "type": track.get("type")}
        if "color_index" in track:
            t["color_index"] = track["color_index"]
        if "mixer" in track:
            m = {}
            for key in ("volume", "pan"):
                if key in track["mixer"]:
                    m[key] = _canon_param(track["mixer"][key])
            if "sends" in track["mixer"]:
                m["sends"] = [_canon_param(s) for s in track["mixer"]["sends"]]
            t["mixer"] = m
        if "devices" in track:
            t["devices"] = [
                {
                    "load": dict(d.get("load", {})),
                    **({"class_name": d["class_name"]} if "class_name" in d else {}),
                    "params": {
                        name: _canon_param(val)
                        for name, val in d.get("params", {}).items()
                    },
                }
                for d in track["devices"]
            ]
        if "clips" in track:
            t["clips"] = [
                {
                    "slot": c.get("slot"),
                    **({"name": c["name"]} if "name" in c else {}),
                    "length": float(c.get("length", 0)),
                    "loop": bool(c.get("loop", False)),
                    "notes": _canon_notes(c.get("notes", [])),
                    **({"generator": c["generator"]} if "generator" in c else {}),
                }
                for c in track["clips"]
            ]
        tracks_out.append(t)
    out["tracks"] = tracks_out
    if "scenes" in data:
        out["scenes"] = data["scenes"]
    return out


def _cmp(path, a, b, out):
    if _is_num(a) and _is_num(b):
        if not math.isclose(a, b, abs_tol=FLOAT_TOL):
            out.append(f"{path}: {a} != {b}")
    elif isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(set(a) | set(b)):
            if key not in a:
                out.append(f"{path}.{key}: only in B")
            elif key not in b:
                out.append(f"{path}.{key}: only in A")
            else:
                _cmp(f"{path}.{key}", a[key], b[key], out)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f"{path}: length {len(a)} != {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)):
            _cmp(f"{path}[{i}]", x, y, out)
    elif a != b:
        out.append(f"{path}: {a!r} != {b!r}")


def diff_recipes(a, b):
    out = []
    _cmp("recipe", canonicalize(a), canonicalize(b), out)
    return out
