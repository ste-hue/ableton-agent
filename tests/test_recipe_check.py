"""Tests for tools/recipe_check.py. Stdlib only; run with:
python3 -m unittest discover -s tests -v
"""
import json
import sys
import tempfile
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

    def test_diff_ignores_omissions(self):
        a, b = make_recipe(), make_recipe()
        b["omissions"] = ["third-party plugin internal state not captured"]
        self.assertEqual(recipe_check.diff_recipes(a, b), [])


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


class TestRepositoryRecipes(unittest.TestCase):
    def test_all_committed_recipes_are_valid(self):
        repo_root = Path(__file__).resolve().parent.parent
        recipe_files = sorted((repo_root / "recipes").rglob("*.json"))
        self.assertTrue(recipe_files, "recipes/ must contain at least the example")
        for path in recipe_files:
            with self.subTest(recipe=path.name):
                errors = recipe_check.validate_recipe(recipe_check.load_recipe(str(path)))
                self.assertEqual(errors, [], f"{path}: {errors}")


if __name__ == "__main__":
    unittest.main()
