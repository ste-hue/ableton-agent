# Liveworks Stage 1 — Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recipe file format v1 with a zero-dependency validator/differ (`tools/recipe_check.py`), a committed example recipe, and the documented snapshot/replay procedures (`docs/recipes.md`).

**Architecture:** Recipes are declarative JSON files (`recipes/*.json`, git-versioned) describing a rebuildable Set state. A stdlib-only Python tool validates them and computes canonical diffs (ignoring debug-only fields). Snapshot and replay are *agent procedures* documented in prose — the LLM agent executes them against Live via MCP; no code in this stage touches Live.

**Tech Stack:** Python 3.10+ stdlib only (`json`, `math`, `re`, `unittest`). No new dependencies — the repo's `.venv` is the pinned upstream MCP server and must not be modified.

**Spec:** `docs/superpowers/specs/2026-08-28-liveworks-design.md` (§4 Recipes, §3 artifacts, §10.1 testing)

## Global Constraints

- Stdlib only; runs with system `python3` (3.10+). Never install into `.venv/`.
- No Live/MCP access from `tools/` or `tests/` — they must run offline.
- Float comparison tolerance: `1e-6` absolute (matches validation Gate G4).
- `value` is canonical; `display` is debug-only and must be ignored by diff; enums may carry `symbol` (string or int), which diff compares exactly.
- `created` and `environment` are excluded from the canonical diff (environment mismatches are a replay *warning*, not a diff).
- Notes compare order-insensitively (sorted by pitch, start, dur, vel).
- All git commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Do not stage or commit `AGENTS.md` (has unrelated uncommitted user edits).

---

### Task 1: Recipe validation (`load_recipe`, `validate_recipe`)

**Files:**
- Create: `tools/recipe_check.py`
- Test: `tests/test_recipe_check.py`

**Interfaces:**
- Produces: `load_recipe(path: str) -> dict` (raises `OSError`/`json.JSONDecodeError`); `validate_recipe(data: dict) -> list[str]` (empty list = valid; each error is `"<json.path>: <message>"`). Module-level constants `FLOAT_TOL = 1e-6`, `TRACK_TYPES = {"midi", "audio", "return"}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_recipe_check.py`:

```python
"""Tests for tools/recipe_check.py. Stdlib only; run with:
python3 -m unittest discover -s tests -v
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))

import recipe_check


def make_recipe():
    """Smallest fully-populated valid recipe (mirrors spec section 4)."""
    return {
        "recipe_version": 1,
        "name": "test-base",
        "created": "2026-08-28",
        "environment": {
            "recipe_schema_version": 1,
            "live_version": "12.0.5",
            "ableton_agent_version": "70f7df9",
            "chordarium_engine_commit": "",
            "platform": "macOS",
        },
        "song": {"tempo": 82, "root_note": 2, "scale_name": "Minor"},
        "tracks": [
            {
                "name": "Keys",
                "type": "midi",
                "color_index": 12,
                "mixer": {
                    "volume": {"value": 0.83, "display": "-2.1 dB"},
                    "pan": 0.0,
                    "sends": [{"value": 0.25, "display": "-12 dB"}],
                },
                "devices": [
                    {
                        "load": {"name": "Electric", "root": "instruments"},
                        "class_name": "InstrumentVector",
                        "params": {"Volume": {"value": 0.85, "display": "-2.1 dB"}},
                    }
                ],
                "clips": [
                    {
                        "slot": 0,
                        "name": "verse",
                        "length": 16.0,
                        "loop": True,
                        "notes": [
                            {"pitch": 50, "start": 0.0, "dur": 1.0, "vel": 96},
                            {"pitch": 53, "start": 1.0, "dur": 0.5, "vel": 80},
                        ],
                        "generator": {
                            "engine": "chordarium",
                            "engine_commit": "abc1234",
                            "seed": "a3f19c",
                            "settings": {"key": "D", "scale": "Minor"},
                        },
                    }
                ],
            }
        ],
        "scenes": [{"index": 0, "name": "A", "tempo": None}],
        "omissions": [],
    }


class TestValidate(unittest.TestCase):
    def test_minimal_recipe_is_valid(self):
        self.assertEqual(recipe_check.validate_recipe(make_recipe()), [])

    def test_missing_environment_key_fails(self):
        r = make_recipe()
        del r["environment"]["chordarium_engine_commit"]
        errors = recipe_check.validate_recipe(r)
        self.assertTrue(any("environment.chordarium_engine_commit" in e for e in errors))

    def test_bad_note_pitch_fails(self):
        r = make_recipe()
        r["tracks"][0]["clips"][0]["notes"][0]["pitch"] = 128
        errors = recipe_check.validate_recipe(r)
        self.assertTrue(any(".pitch" in e for e in errors))

    def test_generator_requires_engine_commit(self):
        r = make_recipe()
        del r["tracks"][0]["clips"][0]["generator"]["engine_commit"]
        errors = recipe_check.validate_recipe(r)
        self.assertTrue(any("engine_commit" in e for e in errors))

    def test_bad_track_type_fails(self):
        r = make_recipe()
        r["tracks"][0]["type"] = "video"
        errors = recipe_check.validate_recipe(r)
        self.assertTrue(any(".type" in e for e in errors))

    def test_param_bare_number_is_accepted(self):
        r = make_recipe()
        r["tracks"][0]["devices"][0]["params"]["Volume"] = 0.85
        self.assertEqual(recipe_check.validate_recipe(r), [])

    def test_param_without_value_fails(self):
        r = make_recipe()
        r["tracks"][0]["devices"][0]["params"]["Volume"] = {"display": "-2.1 dB"}
        errors = recipe_check.validate_recipe(r)
        self.assertTrue(any(".value" in e for e in errors))

    def test_wrong_recipe_version_fails(self):
        r = make_recipe()
        r["recipe_version"] = 2
        errors = recipe_check.validate_recipe(r)
        self.assertTrue(any("recipe_version" in e for e in errors))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m unittest discover -s tests -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'recipe_check'`

- [ ] **Step 3: Write the implementation**

Create `tools/recipe_check.py`:

```python
#!/usr/bin/env python3
"""Validate and diff Liveworks recipe files.

Spec: docs/superpowers/specs/2026-08-28-liveworks-design.md (section 4).
Stdlib only, Python 3.10+. No Live/MCP access.
"""
from __future__ import annotations

import json
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m unittest discover -s tests -v`
Expected: all `TestValidate` tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/recipe_check.py tests/test_recipe_check.py
git commit -m "feat(liveworks): recipe schema v1 validation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Canonical diff (`diff_recipes`)

**Files:**
- Modify: `tools/recipe_check.py` (append after `validate_recipe`)
- Test: `tests/test_recipe_check.py` (append `TestDiff` class)

**Interfaces:**
- Consumes: `validate_recipe`, `FLOAT_TOL` from Task 1.
- Produces: `diff_recipes(a: dict, b: dict) -> list[str]` (empty = canonically identical; each line is `"<path>: <a-side> != <b-side>"` or `"<path>: only in A/B"` or `"<path>: length X != Y"`); `canonicalize(data: dict) -> dict` (drops `created`, `environment`, all `display`; sorts notes; floats as float).

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_recipe_check.py` (before the `if __name__` block):

```python
class TestDiff(unittest.TestCase):
    def test_identical_recipes_have_no_diff(self):
        self.assertEqual(recipe_check.diff_recipes(make_recipe(), make_recipe()), [])

    def test_diff_ignores_display_created_environment(self):
        a, b = make_recipe(), make_recipe()
        b["created"] = "2026-09-01"
        b["environment"]["live_version"] = "12.9.0"
        b["tracks"][0]["devices"][0]["params"]["Volume"]["display"] = "OTHER"
        self.assertEqual(recipe_check.diff_recipes(a, b), [])

    def test_diff_detects_param_value_change(self):
        a, b = make_recipe(), make_recipe()
        b["tracks"][0]["devices"][0]["params"]["Volume"]["value"] = 0.5
        diffs = recipe_check.diff_recipes(a, b)
        self.assertEqual(len(diffs), 1)
        self.assertIn("params.Volume.value", diffs[0])

    def test_diff_within_float_tolerance_is_equal(self):
        a, b = make_recipe(), make_recipe()
        b["song"]["tempo"] = 82 + 1e-9
        self.assertEqual(recipe_check.diff_recipes(a, b), [])

    def test_diff_note_order_insensitive(self):
        a, b = make_recipe(), make_recipe()
        b["tracks"][0]["clips"][0]["notes"].reverse()
        self.assertEqual(recipe_check.diff_recipes(a, b), [])

    def test_diff_detects_missing_note(self):
        a, b = make_recipe(), make_recipe()
        del b["tracks"][0]["clips"][0]["notes"][1]
        diffs = recipe_check.diff_recipes(a, b)
        self.assertTrue(any("notes" in d for d in diffs))

    def test_diff_symbol_compared_exactly(self):
        a, b = make_recipe(), make_recipe()
        a["tracks"][0]["devices"][0]["params"]["Mode"] = {"value": 2, "symbol": "MS"}
        b["tracks"][0]["devices"][0]["params"]["Mode"] = {"value": 2, "symbol": "LR"}
        diffs = recipe_check.diff_recipes(a, b)
        self.assertTrue(any("Mode.symbol" in d for d in diffs))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m unittest discover -s tests -v`
Expected: `TestDiff` tests FAIL with `AttributeError: ... 'diff_recipes'`

- [ ] **Step 3: Write the implementation**

Append to `tools/recipe_check.py`:

```python
import math  # placed with the other imports at the top of the file


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
    """Strip debug/context fields, normalize floats, sort notes."""
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
```

(Move the `import math` line up next to `import json` — imports live at the top of the file.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m unittest discover -s tests -v`
Expected: all tests PASS (Task 1 + Task 2)

- [ ] **Step 5: Commit**

```bash
git add tools/recipe_check.py tests/test_recipe_check.py
git commit -m "feat(liveworks): canonical recipe diff

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: CLI (`validate` / `diff` commands)

**Files:**
- Modify: `tools/recipe_check.py` (append `main` + `__main__` block)
- Test: `tests/test_recipe_check.py` (append `TestCli` class)

**Interfaces:**
- Consumes: `load_recipe`, `validate_recipe`, `diff_recipes` from Tasks 1–2.
- Produces: `main(argv: list[str]) -> int`. Exit codes: `0` = valid / no canonical diff, `1` = validation errors or diffs found, `2` = usage error, unreadable/unparseable file, or diff input that is not a valid recipe. Usage string: `usage: recipe_check.py validate FILE | diff FILE_A FILE_B`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_recipe_check.py`:

```python
import json
import tempfile


class TestCli(unittest.TestCase):
    def _write(self, data):
        f = tempfile.NamedTemporaryFile(
            "w", suffix=".json", delete=False, encoding="utf-8"
        )
        json.dump(data, f)
        f.close()
        self.addCleanup(Path(f.name).unlink)
        return f.name

    def test_validate_ok_returns_0(self):
        self.assertEqual(recipe_check.main(["validate", self._write(make_recipe())]), 0)

    def test_validate_invalid_returns_1(self):
        bad = make_recipe()
        del bad["environment"]
        self.assertEqual(recipe_check.main(["validate", self._write(bad)]), 1)

    def test_validate_unreadable_returns_2(self):
        self.assertEqual(recipe_check.main(["validate", "/nonexistent.json"]), 2)

    def test_diff_identical_returns_0(self):
        a = self._write(make_recipe())
        b = self._write(make_recipe())
        self.assertEqual(recipe_check.main(["diff", a, b]), 0)

    def test_diff_different_returns_1(self):
        changed = make_recipe()
        changed["song"]["tempo"] = 120
        a = self._write(make_recipe())
        b = self._write(changed)
        self.assertEqual(recipe_check.main(["diff", a, b]), 1)

    def test_diff_invalid_input_returns_2(self):
        bad = make_recipe()
        del bad["tracks"]
        a = self._write(make_recipe())
        b = self._write(bad)
        self.assertEqual(recipe_check.main(["diff", a, b]), 2)

    def test_usage_error_returns_2(self):
        self.assertEqual(recipe_check.main([]), 2)
        self.assertEqual(recipe_check.main(["frobnicate", "x"]), 2)
```

(`import json`, `import tempfile` go at the top of the test file with the other imports.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m unittest discover -s tests -v`
Expected: `TestCli` tests FAIL with `AttributeError: ... 'main'`

- [ ] **Step 3: Write the implementation**

Append to `tools/recipe_check.py`:

```python
import sys  # placed with the other imports at the top of the file

USAGE = "usage: recipe_check.py validate FILE | diff FILE_A FILE_B"


def main(argv):
    if len(argv) == 2 and argv[0] == "validate":
        try:
            data = load_recipe(argv[1])
        except (OSError, json.JSONDecodeError) as exc:
            print(f"error: {exc}")
            return 2
        errors = validate_recipe(data)
        for err in errors:
            print(err)
        print("valid" if not errors else f"{len(errors)} error(s)")
        return 0 if not errors else 1

    if len(argv) == 3 and argv[0] == "diff":
        recipes = []
        for arg in argv[1:]:
            try:
                data = load_recipe(arg)
            except (OSError, json.JSONDecodeError) as exc:
                print(f"error: {exc}")
                return 2
            errors = validate_recipe(data)
            if errors:
                print(f"error: {arg} is not a valid recipe ({len(errors)} error(s))")
                return 2
            recipes.append(data)
        diffs = diff_recipes(*recipes)
        for line in diffs:
            print(line)
        print("identical (canonical)" if not diffs else f"{len(diffs)} difference(s)")
        return 0 if not diffs else 1

    print(USAGE)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

(Move `import sys` to the top of the file with the other imports.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m unittest discover -s tests -v`
Expected: all tests PASS. Also smoke-test by hand:
`python3 tools/recipe_check.py` → prints usage, exit code 2 (`echo $?`).

- [ ] **Step 5: Commit**

```bash
git add tools/recipe_check.py tests/test_recipe_check.py
git commit -m "feat(liveworks): recipe_check CLI with validate and diff

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Example recipe + repository-wide validation test

**Files:**
- Create: `recipes/examples/minimal.json`
- Test: `tests/test_recipe_check.py` (append `TestRepositoryRecipes` class)

**Interfaces:**
- Consumes: `load_recipe`, `validate_recipe` from Task 1.
- Produces: the committed reference example every future recipe imitates; a test guaranteeing every `recipes/**/*.json` in the repo stays valid forever.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_recipe_check.py`:

```python
class TestRepositoryRecipes(unittest.TestCase):
    def test_all_committed_recipes_are_valid(self):
        repo_root = Path(__file__).resolve().parent.parent
        recipe_files = sorted((repo_root / "recipes").rglob("*.json"))
        self.assertTrue(recipe_files, "recipes/ must contain at least the example")
        for path in recipe_files:
            with self.subTest(recipe=path.name):
                errors = recipe_check.validate_recipe(recipe_check.load_recipe(str(path)))
                self.assertEqual(errors, [], f"{path}: {errors}")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -v`
Expected: `test_all_committed_recipes_are_valid` FAILS ("recipes/ must contain at least the example")

- [ ] **Step 3: Create the example recipe**

Create `recipes/examples/minimal.json`:

```json
{
  "recipe_version": 1,
  "name": "example-minimal",
  "created": "2026-08-28",
  "environment": {
    "recipe_schema_version": 1,
    "live_version": "12.0.5",
    "ableton_agent_version": "70f7df9",
    "chordarium_engine_commit": "",
    "platform": "macOS"
  },
  "song": { "tempo": 100 },
  "tracks": [
    {
      "name": "Keys",
      "type": "midi",
      "mixer": { "volume": { "value": 0.85, "display": "0.0 dB" } },
      "devices": [
        { "load": { "name": "Electric", "root": "instruments" }, "params": {} }
      ],
      "clips": [
        {
          "slot": 0,
          "name": "loop",
          "length": 4.0,
          "loop": true,
          "notes": [
            { "pitch": 60, "start": 0.0, "dur": 1.0, "vel": 100 },
            { "pitch": 64, "start": 1.0, "dur": 1.0, "vel": 96 },
            { "pitch": 67, "start": 2.0, "dur": 2.0, "vel": 92 }
          ]
        }
      ]
    }
  ],
  "scenes": [{ "index": 0, "name": "A" }],
  "omissions": []
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m unittest discover -s tests -v`
Expected: all tests PASS. Also: `python3 tools/recipe_check.py validate recipes/examples/minimal.json` prints `valid`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add recipes/examples/minimal.json tests/test_recipe_check.py
git commit -m "feat(liveworks): example recipe + repo-wide recipe validation test

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Snapshot & replay procedures (`docs/recipes.md`)

**Files:**
- Create: `docs/recipes.md`

**Interfaces:**
- Consumes: the recipe format from Tasks 1–4 and CLI exit-code contract from Task 3.
- Produces: the agent-facing procedure document that snapshot/replay sessions follow verbatim; the trace checkpoint entry format `{"ts": <iso8601>, "recipe": <name>, "step": <canonical path>, "checkpoint": true}` that Stage 4 (tracer) will render.

- [ ] **Step 1: Write the document**

Create `docs/recipes.md`:

```markdown
# Recipes — snapshot & replay procedures

Spec: `docs/superpowers/specs/2026-08-28-liveworks-design.md` §4. Tool:
`python3 tools/recipe_check.py validate FILE | diff FILE_A FILE_B`
(exit 0 = ok, 1 = errors/diffs, 2 = unusable input).

A recipe is the declarative, git-versioned description of a rebuildable Set
state. Inline notes are the source of truth for replay; `generator` blocks are
provenance only. `value` is canonical for every parameter; `display` is
debug-only. All AGENTS.md rules apply to both procedures.

## Snapshot ("Salva ricetta")

1. Preflight (AGENTS.md rule 3): upstream validation with `runtime_current:
   true` and `live_mutations_safe: true`; read `live_set_summary`, record
   `set_signature`. Snapshot is read-only, but the signature anchors the
   "verified state" claim.
2. Read, strictly sequentially: song (tempo, root_note, scale_name) → per
   track: name, type, color_index, mixer (volume/pan/sends) → devices
   (class_name, load name/root as loaded, all parameters) → clips (slot,
   name, length, loop, all notes via `live_clip_notes`) → scenes.
3. Serialization rules:
   - floats rounded to 6 decimals; times/durations in beats;
   - every parameter: `{"value": <normalized>, "display": <string>}`, plus
     `"symbol"` for quantized/enum parameters;
   - notes: `{"pitch", "start", "dur", "vel"}` (+ `"mute"` when true);
   - anything observed but not representable goes into `"omissions"` as a
     human sentence (e.g. third-party plugin internal state, audio sample
     content, groove pool contents, arrangement automation).
4. Fill `environment`: `live_version` from the LOM Application object;
   `ableton_agent_version` = pinned server commit (AGENTS.md); 
   `chordarium_engine_commit` = the generator's commit if any generated clip
   is present, else `""`; `platform` = OS name.
5. Re-read `live_set_summary`: if `set_signature` changed during the walk,
   the snapshot is stale — discard and restart.
6. Write to `recipes/YYYY-MM-DD_slug.json` (kebab-case slug), run
   `recipe_check.py validate`, then commit.

## Replay (rebuild)

Preconditions: disposable Set (`file_path == ""`, rule 8) — opening/closing a
Set is the user's manual gesture; full preflight; fresh `set_signature`.
If the recipe `environment` does not match the current environment, WARN and
continue (never fail blind on environment alone).

Build strictly top-down, one Live call at a time:

1. song: tempo, scale;
2. tracks **in recipe order** (the LOM cannot reorder tracks);
3. per track: create → rename/color → devices (browser load by
   `load.name`/`load.root`, or native `insert_device` when applicable; verify
   the device appears before continuing) → parameters (`value` only) →
   mixer → clips (create with `create_clip_length`, write notes) → scenes.

The loop is transaction-like — for each unit:

    mutation → readback (rules 4–5) → checkpoint → next

After each verified unit, append a checkpoint line to
`~/.ableton-live-mcp/liveworks_trace.jsonl`:

    {"ts": "<iso8601>", "recipe": "<name>", "step": "tracks[0].devices[0]", "checkpoint": true}

`step` uses the same canonical paths as `recipe_check.py` diff output, so the
trace always answers "how far did this recipe get?".

No implicit rollback: on the first divergence (device not found, parameter
name missing, readback mismatch beyond 1e-6) STOP, report the failing step,
and leave the partial build in the Set for inspection.

## Round-trip verification (the Stage-1 acceptance test)

1. Build a small Set (agent, disposable), snapshot → `A.json`.
2. User opens a fresh disposable Set.
3. Replay `A.json`; snapshot again → `B.json`.
4. `python3 tools/recipe_check.py diff A.json B.json` → exit 0
   (zero canonical differences outside documented omissions).
```

- [ ] **Step 2: Verify the document's commands work**

Run: `python3 tools/recipe_check.py validate recipes/examples/minimal.json && echo OK`
Expected: `valid` + `OK` (the doc's tool invocations are real).

- [ ] **Step 3: Run the full test suite one final time**

Run: `python3 -m unittest discover -s tests -v`
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add docs/recipes.md
git commit -m "docs(liveworks): snapshot and replay procedures

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Live round-trip test (agent-executed, needs Live + user)

**Not a subagent task.** This is the Stage-1 acceptance run, executed by the
main agent in a session with Ableton Live open, following `docs/recipes.md`
§Round-trip verification exactly. It requires the user at the keyboard (only
the user may open/close Sets, rule 11) and the one-driver check (rule 1).

- [ ] **Step 1:** Confirm with the user that Live is open on a disposable Set and no other agent session is driving it.
- [ ] **Step 2:** Preflight per AGENTS.md rule 3; then build a 2-track test Set: MIDI track "Keys" (Electric + 3-note clip), MIDI track "Bass" (Operator + 2-note clip), tempo 100.
- [ ] **Step 3:** Snapshot per `docs/recipes.md` → `recipes/examples/roundtrip-a.json`; `recipe_check.py validate` must exit 0.
- [ ] **Step 4:** Ask the user to open a fresh disposable Set.
- [ ] **Step 5:** Replay `roundtrip-a.json` with checkpoints; then snapshot → `recipes/examples/roundtrip-b.json`.
- [ ] **Step 6:** `python3 tools/recipe_check.py diff recipes/examples/roundtrip-a.json recipes/examples/roundtrip-b.json` → REQUIRED exit 0. On failure: keep both files, report the diff lines, do not "fix" by editing recipes.
- [ ] **Step 7:** Commit the two round-trip recipes as regression fixtures:

```bash
git add recipes/examples/roundtrip-a.json recipes/examples/roundtrip-b.json
git commit -m "test(liveworks): stage-1 live round-trip fixtures

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
