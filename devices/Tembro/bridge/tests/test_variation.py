import copy
import importlib.util
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("variation_runtime", ROOT / "variation_runtime.py")
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


def note(number, pitch=42, start=None):
    return NS(note_id=number, pitch=pitch, start_time=float(number if start is None else start),
              duration=0.125, velocity=91.125, mute=False, probability=0.875,
              velocity_deviation=-3.75, release_velocity=32.25)


class Clip:
    serial = 100

    def __init__(self, notes=None):
        Clip.serial += 1
        self._live_ptr = Clip.serial
        self.notes = notes if notes is not None else [note(i) for i in range(1, 9)] + [note(20, 36), note(21, 38)]
        self.name = "Original beat"
        self.color = 123
        self.color_index = 1
        self.is_midi_clip = self.is_session_clip = self.looping = True
        self.is_audio_clip = self.is_arrangement_clip = self.is_take_lane_clip = self.muted = False
        self.length = self.loop_end = self.end_marker = 16.0
        self.loop_start = self.start_marker = 0.0
        self.signature_numerator = self.signature_denominator = 4
        self.launch_mode = self.launch_quantization = 0
        self.legato = False
        self.velocity_amount = 0.0
        self.has_envelopes = self.has_groove = False
        self.is_recording = self.is_overdubbing = self.will_record_on_start = False
        self.is_triggered = self.is_playing = False
        self.removals = []
        self.fires = 0

    def get_all_notes_extended(self):
        return self.notes

    def remove_notes_by_id(self, ids):
        self.removals.append(ids)
        self.notes = [n for n in self.notes if n.note_id not in ids]

    def fire(self):
        self.fires += 1
        self.is_triggered = True


class Slot:
    def __init__(self, clip=None):
        self.clip = clip
        self.is_recording = self.is_triggered = self.is_group_slot = False
        self.deletes = self.duplicates = 0

    @property
    def has_clip(self):
        return self.clip is not None

    def duplicate_clip_to(self, target):
        self.duplicates += 1
        target.clip = copy.deepcopy(self.clip)
        Clip.serial += 1
        target.clip._live_ptr = Clip.serial
        for n in target.clip.notes:
            n.note_id += 1000

    def delete_clip(self):
        self.deletes += 1
        self.clip = None


class Host:
    def __init__(self):
        self._objects = {}
        pads = [NS(note=pitch, name=name, chains=[NS()]) for pitch, name in ((42, "Closed Hat"), (36, "Kick"), (38, "Snare"))]
        rack = NS(can_have_drum_pads=True, has_drum_pads=True, drum_pads=pads)
        self.track = NS(name="Drums", has_midi_input=True, is_frozen=False, devices=[rack],
                        clip_slots=[Slot(Clip()), Slot(), Slot()])
        self._song = NS(tracks=[self.track], record_mode=False, session_record=False,
                        view=NS(highlighted_clip_slot=self.track.clip_slots[0]))
        self.owner = "test-owner-session-0001"

    def song(self):
        return self._song

    def _object_id(self, obj):
        return getattr(obj, "_live_ptr", id(obj))

    def _remember_object(self, obj_id, obj):
        self._objects[obj_id] = obj

    def _set_signature(self):
        # Intentionally unchanged by all edits in these tests, like upstream's
        # signature for note-content-only changes. Guards must do actual reads.
        return "unchanged-signature"

    def _check_expected_set_signature(self, params):
        if params["expected_set_signature"] != self._set_signature():
            raise RuntimeError("Set changed since last inspection")

    def call(self, action, **params):
        return runtime._tembro_clip_variation(self, {"owner_id": self.owner, "action": action, **params})

    def mutate(self, action, **params):
        return self.call(action, expected_set_signature=self._set_signature(), **params)

    def candidate(self):
        return self.track.clip_slots[1].clip

    def create(self):
        self.call("capture")
        return self.mutate("create", pitch=42)


class VariationTests(unittest.TestCase):
    def setUp(self):
        self.host = Host()

    def test_capture_uses_selection_before_lane_choice_without_mutation(self):
        result = self.host.call("capture")
        self.assertEqual(result["state"], "captured")
        self.assertIsNone(result["pitch"])
        self.assertIn({"pitch": 42, "label": "Closed Hat", "count": 8}, result["lanes"])
        self.assertEqual(self.host.track.clip_slots[0].duplicates, 0)

    def test_explicit_source_id_is_supported_but_stale_id_refused(self):
        self.assertRaisesRegex(RuntimeError, "stale", self.host.call, "capture", source={"id": 999})
        result = self.host.call("capture", source={"id": self.host.track.clip_slots[0].clip._live_ptr})
        self.assertEqual(result["state"], "captured")

    def test_create_preserves_original_and_every_unselected_note_attribute(self):
        source = self.host.track.clip_slots[0].clip
        original = runtime._tembro_clip_content(source)
        result = self.host.create()
        self.assertEqual(result["state"], "candidate")
        self.assertEqual(runtime._tembro_clip_content(source), original)
        candidate = self.host.candidate()
        self.assertEqual(candidate.removals, [(1002, 1004, 1006, 1008)])
        self.assertEqual([n.pitch for n in candidate.notes], [42, 42, 42, 42, 36, 38])
        for n in candidate.notes:
            original_row = next(n0 for n0 in original["notes"] if n0[0] == n.note_id - 1000)
            self.assertEqual(tuple(getattr(n, f) for f in runtime.TEMBRO_VARIATION_NOTE_FIELDS[1:]), original_row[1:])
        self.assertFalse(candidate.is_triggered)

    def test_thin_only_owned_selected_pitch_and_preserves_ids(self):
        self.host.create()
        self.host.mutate("thin")
        self.assertEqual([n.note_id for n in self.host.candidate().notes], [1001, 1005, 1020, 1021])

    def test_every_mutating_action_requires_signature(self):
        self.host.create()
        for action in ("create", "thin", "audition_source", "audition_candidate", "keep", "discard"):
            with self.subTest(action=action), self.assertRaisesRegex(RuntimeError, "expected_set_signature"):
                self.host.call(action)

    def test_changed_signature_refuses_before_mutation(self):
        self.host.call("capture")
        self.assertRaisesRegex(RuntimeError, "Set changed", self.host.call, "create", pitch=42, expected_set_signature="wrong")
        self.assertFalse(self.host.track.clip_slots[1].has_clip)

    def test_intervening_source_edits_with_same_signature_refuse_create(self):
        self.host.call("capture")
        self.host.track.clip_slots[0].clip.notes[0].release_velocity += 0.001
        self.assertRaisesRegex(RuntimeError, "content changed", self.host.mutate, "create", pitch=42)
        self.assertFalse(self.host.track.clip_slots[1].has_clip)

    def test_every_note_field_guards_keep_discard_and_thin(self):
        for field in runtime.TEMBRO_VARIATION_NOTE_FIELDS:
            for action in ("thin", "keep", "discard"):
                with self.subTest(field=field, action=action):
                    host = Host()
                    host.create()
                    n = host.candidate().notes[0]
                    setattr(n, field, not n.mute if field == "mute" else getattr(n, field) + 1)
                    self.assertRaisesRegex(RuntimeError, "content changed", host.mutate, action)
                    self.assertEqual(host.track.clip_slots[1].deletes, 0)

    def test_candidate_replacement_at_identical_path_and_id_refuses_delete(self):
        self.host.create()
        previous = self.host.candidate()
        replacement = copy.deepcopy(previous)
        self.host.track.clip_slots[1].clip = replacement
        # Includes an ID-recycling simulation: equality of pointers alone is not
        # ownership. Real retained wrappers must still refer to the same object.
        self.assertRaisesRegex(RuntimeError, "identity changed", self.host.mutate, "discard")
        self.assertIs(self.host.candidate(), replacement)

    def test_source_replacement_refuses_mutation(self):
        self.host.create()
        self.host.track.clip_slots[0].clip = Clip()
        self.assertRaisesRegex(RuntimeError, "identity changed", self.host.mutate, "thin")

    def test_keep_retains_exact_candidate_without_a_live_write(self):
        self.host.create()
        candidate = self.host.candidate()
        before = runtime._tembro_clip_content(candidate)
        result = self.host.mutate("keep")
        self.assertEqual(result["state"], "kept")
        self.assertIs(self.host.candidate(), candidate)
        self.assertEqual(runtime._tembro_clip_content(candidate), before)
        self.assertEqual(len(candidate.removals), 1)
        self.assertEqual(candidate.fires, 0)
        self.assertRaisesRegex(RuntimeError, "no owned candidate", self.host.mutate, "discard")

    def test_discard_deletes_only_unchanged_owned_candidate(self):
        self.host.create()
        source = self.host.track.clip_slots[0].clip
        # Exercise the compare-and-delete primitive against a fully observable
        # fake host. The shipped runtime gate remains false for real Live.
        with patch.object(runtime, "TEMBRO_VARIATION_NOTE_EXPRESSION_GUARD", True):
            result = self.host.mutate("discard")
        self.assertEqual(result["state"], "discarded")
        self.assertEqual(self.host.track.clip_slots[1].deletes, 1)
        self.assertIs(self.host.track.clip_slots[0].clip, source)
        self.assertTrue(self.host.call("status")["verified"])

    def test_clip_metadata_changes_cannot_be_adopted_by_status(self):
        self.host.create()
        self.host.candidate().start_marker += 0.1
        result = self.host.call("status")
        self.assertFalse(result["verified"])
        self.assertEqual(result["state"], "conflict")
        self.assertRaisesRegex(RuntimeError, "content changed", self.host.mutate, "discard")

    def test_extended_note_api_missing_fields_fail_closed(self):
        del self.host.track.clip_slots[0].clip.notes[0].release_velocity
        self.assertRaisesRegex(RuntimeError, "incomplete extended", self.host.call, "capture")

    def test_envelopes_grooves_recording_frozen_and_mapping_fail_closed(self):
        for obj, prop in (("clip", "has_envelopes"), ("clip", "has_groove"), ("clip", "is_recording"), ("track", "is_frozen"), ("song", "record_mode")):
            with self.subTest(prop=prop):
                host = Host()
                target = host.track.clip_slots[0].clip if obj == "clip" else host.track if obj == "track" else host.song()
                setattr(target, prop, True)
                self.assertRaises(RuntimeError, host.call, "capture")
        self.host.track.devices = []
        self.assertRaisesRegex(RuntimeError, "mapping", self.host.call, "capture")

    def test_mapping_changed_between_capture_and_create_refuses(self):
        self.host.call("capture")
        self.host.track.devices[0].drum_pads[0].name = "Changed sound"
        self.assertRaisesRegex(RuntimeError, "mapping changed", self.host.mutate, "create", pitch=42)

    def test_empty_destination_is_chosen_at_create_without_overwriting(self):
        self.host.call("capture")
        user_clip = Clip()
        self.host.track.clip_slots[1].clip = user_clip
        self.host.mutate("create", pitch=42)
        self.assertIs(self.host.track.clip_slots[1].clip, user_clip)
        self.assertTrue(self.host.track.clip_slots[2].has_clip)

    def test_no_empty_destination_does_not_create_scene(self):
        for slot in self.host.track.clip_slots[1:]:
            slot.clip = Clip()
        self.host.call("capture")
        self.assertRaisesRegex(RuntimeError, "no fresh empty", self.host.mutate, "create", pitch=42)

    def test_explicit_audition_fires_once_then_status_polls_quantization(self):
        self.host.create()
        result = self.host.mutate("audition_candidate")
        self.assertTrue(result["audition"]["fire_sent"])
        self.assertTrue(result["requires_readback"])
        self.host.call("status")
        self.assertEqual(self.host.candidate().fires, 1)
        self.assertRaisesRegex(RuntimeError, "launch pending", self.host.mutate, "audition_candidate")
        self.assertEqual(self.host.candidate().fires, 1)

    def test_discard_will_not_delete_playing_or_triggered_clip(self):
        self.host.create()
        self.host.mutate("audition_candidate")
        with patch.object(runtime, "TEMBRO_VARIATION_NOTE_EXPRESSION_GUARD", True):
            self.assertRaisesRegex(RuntimeError, "playing or pending", self.host.mutate, "discard")

    def test_real_runtime_discard_fails_closed_until_expression_guard_exists(self):
        result = self.host.create()
        self.assertFalse(result["can_discard"])
        self.assertFalse(result["capabilities"]["note_expression_guard"])
        self.assertRaisesRegex(RuntimeError, "discard unavailable", self.host.mutate, "discard")
        self.assertIsNotNone(self.host.candidate())
        self.assertEqual(self.host.track.clip_slots[1].deletes, 0)

    def test_response_contains_all_raw_notes_for_independent_readback(self):
        self.host.track.clip_slots[0].clip.notes = [note(i) for i in range(1, 350)]
        result = self.host.create()
        self.assertEqual(len(result["source"]["notes"]), 349)
        self.assertFalse(result["source"]["truncated"])
        self.assertEqual(set(result["candidate"]["notes"][0]), set(runtime.TEMBRO_VARIATION_NOTE_FIELDS))
        self.assertIs(self.host._objects[result["source"]["id"]], self.host.track.clip_slots[0].clip)
        self.assertIs(self.host._objects[result["candidate"]["id"]], self.host.candidate())

    def test_session_owner_cannot_recover_or_mutate_other_owner(self):
        self.host.create()
        self.host.owner = "another-owner-session-0002"
        self.assertRaisesRegex(RuntimeError, "capture required", self.host.mutate, "discard")

    def test_partial_note_write_does_not_refresh_guard_to_unknown_state(self):
        self.host.create()
        candidate = self.host.candidate()
        def partial(ids):
            candidate.notes = candidate.notes[1:]
            raise RuntimeError("sent operation failed")
        candidate.remove_notes_by_id = partial
        self.assertRaisesRegex(RuntimeError, "sent operation", self.host.mutate, "thin")
        self.assertFalse(self.host.call("status")["verified"])
        self.assertRaisesRegex(RuntimeError, "content changed", self.host.mutate, "discard")


if __name__ == "__main__":
    unittest.main()
