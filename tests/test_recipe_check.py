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
