"""Fixed main-thread operations, embedded into the pinned Remote Script at build time.

No arbitrary code, note insertion, source mutation, or background Live API access.
The bridge's existing runtime fingerprint includes these top-level functions.
"""

import hashlib
import json

TEMBRO_VARIATION_PROTOCOL = "tembro.clip-variation.v1"
TEMBRO_VARIATION_NOTE_FIELDS = (
    "note_id", "pitch", "start_time", "duration", "velocity", "mute",
    "probability", "velocity_deviation", "release_velocity",
)
TEMBRO_VARIATION_CLIP_FIELDS = (
    "name", "color", "color_index", "is_midi_clip", "is_audio_clip",
    "is_session_clip", "is_arrangement_clip", "is_take_lane_clip", "muted",
    "length", "looping", "loop_start", "loop_end", "start_marker", "end_marker",
    "signature_numerator", "signature_denominator", "launch_mode",
    "launch_quantization", "legato", "velocity_amount", "has_envelopes", "has_groove",
)
TEMBRO_VARIATION_ACTIONS = (
    "capture", "create", "thin", "audition_source", "audition_candidate",
    "keep", "discard", "status",
)
TEMBRO_VARIATION_MAX_OWNERS = 32
TEMBRO_VARIATION_MAX_NOTES = 4096
# The documented LOM does not expose full per-note expression envelopes. This
# remains false until an independently verified runtime API can fingerprint them.
# It is a source-level gate, never a client parameter or environment override.
TEMBRO_VARIATION_NOTE_EXPRESSION_GUARD = False


class _TembroVariationResult(dict):
    """Bounded plain response; bypass generic LOM encoder's 200-item truncation."""

    pass


def _tembro_require(condition, message):
    if not condition:
        raise RuntimeError("Tembro variation: " + message)


def _tembro_scalar(value):
    _tembro_require(isinstance(value, (str, int, float, bool)), "unsupported content attribute")
    if isinstance(value, float):
        _tembro_require(value == value and abs(value) != float("inf"), "non-finite content attribute")
    return value


def _tembro_digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()


def _tembro_same(host, current, held):
    # A canonical path identifies a position, not its occupant. Never use the
    # upstream path-based _same_live_object for ownership or deletion checks.
    try:
        return host._object_id(current) == host._object_id(held) and (current is held or current == held)
    except Exception:
        return False


def _tembro_notes(clip):
    _tembro_require(callable(getattr(clip, "get_all_notes_extended", None)), "extended notes unavailable")
    notes = list(clip.get_all_notes_extended())
    _tembro_require(len(notes) <= TEMBRO_VARIATION_MAX_NOTES, "clip exceeds guarded note limit")
    result = []
    for note in notes:
        try:
            row = tuple(_tembro_scalar(getattr(note, field)) for field in TEMBRO_VARIATION_NOTE_FIELDS)
        except (AttributeError, KeyError):
            raise RuntimeError("Tembro variation: incomplete extended note attributes")
        _tembro_require(type(row[0]) is int and row[0] > 0, "invalid note ID")
        _tembro_require(type(row[1]) is int and 0 <= row[1] <= 127, "invalid note pitch")
        _tembro_require(all(type(row[i]) in (int, float) for i in (2, 3, 4, 6, 7, 8)), "incomplete numeric note attributes")
        _tembro_require(type(row[5]) in (bool, int) and row[5] in (False, True), "invalid note mute attribute")
        result.append(row)
    result.sort(key=lambda row: row[0])
    _tembro_require(len(set(row[0] for row in result)) == len(result), "duplicate note IDs")
    return tuple(result)


def _tembro_clip_content(clip):
    try:
        metadata = dict((field, _tembro_scalar(getattr(clip, field))) for field in TEMBRO_VARIATION_CLIP_FIELDS)
        _tembro_require(not clip.is_recording and not clip.is_overdubbing and not clip.will_record_on_start, "recording or record-ready clip")
    except AttributeError:
        raise RuntimeError("Tembro variation: incomplete clip metadata")
    _tembro_require(metadata["is_midi_clip"] and metadata["is_session_clip"] and not metadata["is_arrangement_clip"] and not metadata["is_take_lane_clip"], "only Session MIDI clips supported")
    _tembro_require(not metadata["has_envelopes"], "clip automation cannot be fully fingerprinted")
    _tembro_require(not metadata["has_groove"], "groove content cannot be fully fingerprinted")
    return {"metadata": metadata, "notes": _tembro_notes(clip)}


def _tembro_track_safe(host, track):
    song = host.song()
    try:
        _tembro_require(not song.record_mode and not song.session_record, "recording is active")
        _tembro_require(track.has_midi_input and not track.is_frozen, "track is frozen or not MIDI")
    except AttributeError:
        raise RuntimeError("Tembro variation: incomplete recording/frozen-track metadata")
    for slot in track.clip_slots:
        _tembro_require(not slot.is_recording, "track is recording")


def _tembro_mapping(host, track):
    mappings = {}
    # Deliberately restricted to top-level Drum Racks; no guessed GM map and no
    # ambiguity introduced by searching through arbitrary instrument chains.
    for rack in track.devices:
        if not getattr(rack, "can_have_drum_pads", False) or not getattr(rack, "has_drum_pads", False):
            continue
        for pad in rack.drum_pads:
            chains = list(pad.chains)
            if not chains:
                continue
            pitch = int(pad.note)
            entry = {"rack_id": host._object_id(rack), "pad_id": host._object_id(pad),
                     "name": str(pad.name), "chain_ids": [host._object_id(chain) for chain in chains]}
            # More than one rack routing this pitch is intentionally unsupported.
            if pitch in mappings:
                mappings[pitch] = None
            else:
                mappings[pitch] = entry
    return dict((pitch, value) for pitch, value in mappings.items() if value is not None)


def _tembro_locate(host, source):
    song = host.song()
    if source is None:
        selected = song.view.highlighted_clip_slot
        _tembro_require(selected is not None and selected.has_clip, "select an occupied Session clip slot")
        source_id = host._object_id(selected.clip)
    else:
        _tembro_require(isinstance(source, dict) and set(source) == {"id"} and type(source["id"]) is int, "source must contain only an integer ID")
        source_id = source["id"]
    found = []
    for track_index, track in enumerate(song.tracks):
        for slot_index, slot in enumerate(track.clip_slots):
            if slot.has_clip and host._object_id(slot.clip) == source_id:
                found.append((track, slot, slot.clip, track_index, slot_index))
    _tembro_require(len(found) == 1, "source ID is stale or not a unique Session clip")
    return found[0]


def _tembro_hold(host, track, slot, clip, track_index, slot_index):
    # Public IDs must also enter the existing bridge registry so the controller's
    # independent live_clip_notes({ref:{id}}) can resolve this exact object.
    host._remember_object(host._object_id(clip), clip)
    return {"track": track, "slot": slot, "clip": clip, "track_index": track_index,
            "slot_index": slot_index, "id": host._object_id(clip), "track_name": str(track.name),
            "content": _tembro_clip_content(clip)}


def _tembro_check_held(host, held):
    tracks = list(host.song().tracks)
    ti, si = held["track_index"], held["slot_index"]
    _tembro_require(ti < len(tracks) and _tembro_same(host, tracks[ti], held["track"]), "track identity changed")
    slots = list(tracks[ti].clip_slots)
    _tembro_require(si < len(slots) and _tembro_same(host, slots[si], held["slot"]), "slot identity changed")
    slot = slots[si]
    _tembro_require(slot.has_clip and _tembro_same(host, slot.clip, held["clip"]), "clip identity changed")
    _tembro_track_safe(host, tracks[ti])
    content = _tembro_clip_content(slot.clip)
    _tembro_require(content == held["content"], "clip content changed since last verified operation")
    return content


def _tembro_check(host, state):
    _tembro_require(_tembro_same(host, host.song(), state["song"]), "Live Set identity changed")
    _tembro_check_held(host, state["source"])
    _tembro_require(_tembro_mapping(host, state["source"]["track"]) == state["mappings"], "drum mapping changed")
    if state.get("candidate") and state["state"] != "discarded":
        _tembro_check_held(host, state["candidate"])


def _tembro_public_clip(host, held, pitch):
    if held is None:
        return None
    content = held["content"]
    notes = content["notes"]
    return {"id": held["id"],
            "path": "live_set tracks %s clip_slots %s clip" % (held["track_index"], held["slot_index"]),
            "name": content["metadata"]["name"], "track_name": held["track_name"],
            "note_count": len(notes), "lane_note_count": sum(row[1] == pitch for row in notes) if pitch is not None else None,
            "notes": [dict(zip(TEMBRO_VARIATION_NOTE_FIELDS, row)) for row in notes],
            "metadata": dict(content["metadata"]), "truncated": False,
            "content_sha256": _tembro_digest(content)}


def _tembro_response(host, owner, action, state, conflicts=None):
    conflicts = conflicts or []
    source = state.get("source")
    pitch = state.get("pitch")
    lanes = []
    if source:
        for lane_pitch, mapping in sorted(state["mappings"].items()):
            count = sum(row[1] == lane_pitch for row in source["content"]["notes"])
            if count:
                lanes.append({"pitch": lane_pitch, "label": mapping["name"], "count": count})
    audition = None
    if state.get("audition") and not conflicts:
        target = state["audition"]
        clip = state[target]["clip"]
        audition = {"target": target, "playing": bool(clip.is_playing), "triggered": bool(clip.is_triggered),
                    "fire_sent": action.startswith("audition_")}
    return {"protocol": TEMBRO_VARIATION_PROTOCOL, "action": action, "owner_id": owner,
            "state": "conflict" if conflicts else state["state"], "verified": not bool(conflicts),
            "host_observed": True, "set_signature": host._set_signature(),
            "source": _tembro_public_clip(host, source, pitch),
            "candidate": _tembro_public_clip(host, state.get("candidate"), pitch),
            "pitch": pitch, "lanes": lanes, "mapping": state.get("mappings", {}).get(pitch),
            "audition": audition, "conflicts": conflicts,
            "can_discard": bool(TEMBRO_VARIATION_NOTE_EXPRESSION_GUARD and state["state"] == "candidate" and not conflicts),
            "discard_reason": None if TEMBRO_VARIATION_NOTE_EXPRESSION_GUARD else "Per-note expression content cannot be verified by this runtime; retain or delete the candidate manually in Live.",
            "requires_readback": action not in ("capture", "status"),
            "capabilities": {"atomic_guards": True, "raw_duplication": True,
                             "extended_note_fields": list(TEMBRO_VARIATION_NOTE_FIELDS),
                             "clip_metadata_fields": list(TEMBRO_VARIATION_CLIP_FIELDS),
                             "automation": False, "groove": False, "note_expression_guard": TEMBRO_VARIATION_NOTE_EXPRESSION_GUARD,
                             "verification_scope": "extended_notes_and_listed_clip_metadata"}}


def _tembro_remove_half(held, pitch):
    notes = held["content"]["notes"]
    lane = sorted((row for row in notes if row[1] == pitch), key=lambda row: (row[2], row[0]))
    _tembro_require(len(lane) >= 2, "selected lane needs at least two notes")
    removed = set(row[0] for row in lane[1::2])
    expected = {"metadata": dict(held["content"]["metadata"]),
                "notes": tuple(row for row in notes if row[0] not in removed)}
    _tembro_require(callable(getattr(held["clip"], "remove_notes_by_id", None)), "remove-by-ID unavailable")
    # Store the expected result before the call: failure may mean partial change,
    # so later status must compare against intent, never adopt unknown contents.
    held["content"] = expected
    held["clip"].remove_notes_by_id(tuple(sorted(removed)))
    _tembro_require(_tembro_clip_content(held["clip"]) == expected, "note removal readback mismatch; do not retry")


def _tembro_clip_variation(host, params):
    action = params.get("action")
    owner = params.get("owner_id")
    _tembro_require(action in TEMBRO_VARIATION_ACTIONS, "unsupported action")
    _tembro_require(isinstance(owner, str) and 16 <= len(owner) <= 128 and all(c.isalnum() or c in "-_" for c in owner), "invalid session owner ID")
    allowed = {"action", "owner_id", "timeout", "expected_set_signature"}
    if action == "capture":
        allowed.add("source")
    if action == "create":
        allowed.add("pitch")
    _tembro_require(not set(params).difference(allowed), "unexpected action arguments")
    if action not in ("capture", "status"):
        _tembro_require(isinstance(params.get("expected_set_signature"), str) and bool(params["expected_set_signature"]), "expected_set_signature required")
        host._check_expected_set_signature(params)
    states = getattr(host, "_tembro_variations", None)
    if states is None:
        states = {}
        host._tembro_variations = states
    state = states.get(owner)
    if action == "capture":
        _tembro_require(not state or state["state"] in ("captured", "kept", "discarded"), "candidate still owned; keep or discard before recapturing")
        _tembro_require(owner in states or len(states) < TEMBRO_VARIATION_MAX_OWNERS, "owner session limit reached; reload only with user permission")
        track, slot, clip, ti, si = _tembro_locate(host, params.get("source"))
        _tembro_track_safe(host, track)
        source = _tembro_hold(host, track, slot, clip, ti, si)
        mappings = _tembro_mapping(host, track)
        _tembro_require(any(row[1] in mappings for row in source["content"]["notes"]), "no occupied Drum Rack mapping for clip notes")
        state = {"song": host.song(), "source": source, "candidate": None, "mappings": mappings,
                 "state": "captured", "pitch": None, "audition": None}
        states[owner] = state
        return _tembro_response(host, owner, action, state)
    _tembro_require(state is not None, "capture required for this owner session")
    if action == "status":
        try:
            _tembro_require(state["state"] in ("captured", "candidate", "kept", "discarded"), "operation outcome incomplete; preserve clips for manual recovery")
            _tembro_check(host, state)
            if state["state"] == "discarded":
                _tembro_require(not state["candidate"]["slot"].has_clip, "discarded slot was filled after deletion")
            return _tembro_response(host, owner, action, state)
        except Exception as exc:
            return _tembro_response(host, owner, action, state, [str(exc)])
    _tembro_check(host, state)
    if action == "create":
        _tembro_require(state["state"] == "captured" and state["candidate"] is None, "candidate already created; do not retry")
        pitch = params.get("pitch")
        _tembro_require(type(pitch) is int and 0 <= pitch <= 127 and pitch in state["mappings"], "select an explicitly mapped pitch")
        _tembro_require(sum(row[1] == pitch for row in state["source"]["content"]["notes"]) >= 2, "selected lane needs at least two notes")
        source = state["source"]
        track = source["track"]
        empty = [(i, slot) for i, slot in enumerate(track.clip_slots) if not slot.has_clip and not slot.is_recording and not slot.is_triggered and not slot.is_group_slot]
        _tembro_require(bool(empty), "no fresh empty slot on source track")
        index, destination = empty[0]
        _tembro_require(callable(getattr(source["slot"], "duplicate_clip_to", None)), "raw clip duplication unavailable")
        _tembro_require(not destination.has_clip, "destination is no longer empty")
        state["state"] = "creating"
        state["pitch"] = pitch
        source["slot"].duplicate_clip_to(destination)
        _tembro_require(destination.has_clip, "duplicate readback missing; do not retry")
        candidate = _tembro_hold(host, track, destination, destination.clip, source["track_index"], index)
        state["candidate"] = candidate
        _tembro_require(not _tembro_same(host, candidate["clip"], source["clip"]), "duplicate identity invalid")
        # Live may assign fresh note IDs; require every other raw field to match.
        old = source["content"]
        new = candidate["content"]
        _tembro_require(old["metadata"] == new["metadata"] and sorted(row[1:] for row in old["notes"]) == sorted(row[1:] for row in new["notes"]), "duplicate content readback mismatch; preserve clip for manual recovery")
        _tembro_remove_half(candidate, pitch)
        state["state"] = "candidate"
    elif action == "thin":
        _tembro_require(state["state"] == "candidate", "no mutable owned candidate")
        _tembro_remove_half(state["candidate"], state["pitch"])
    elif action in ("audition_source", "audition_candidate"):
        _tembro_require(state["state"] == "candidate", "audition requires an owned candidate")
        target = "source" if action == "audition_source" else "candidate"
        clip = state[target]["clip"]
        _tembro_require(not clip.is_triggered, "clip launch pending; poll status, never fire twice")
        _tembro_require(clip.launch_mode == 0, "audition requires Trigger launch mode")
        state["audition"] = target
        clip.fire()
    elif action == "keep":
        _tembro_require(state["state"] == "candidate", "no candidate to keep")
        # Keeping means relinquishing the already verified duplicate. No copy,
        # overwrite, rename, implicit launch, or source replacement is performed.
        state["state"] = "kept"
    elif action == "discard":
        _tembro_require(state["state"] == "candidate", "no owned candidate to discard")
        _tembro_require(TEMBRO_VARIATION_NOTE_EXPRESSION_GUARD, "discard unavailable: per-note expression content cannot be verified; candidate retained for manual deletion in Live")
        candidate = state["candidate"]
        _tembro_require(not candidate["clip"].is_playing and not candidate["clip"].is_triggered, "candidate is playing or pending; stop and verify before discard")
        state["state"] = "discarding"
        candidate["slot"].delete_clip()
        _tembro_require(not candidate["slot"].has_clip, "delete readback mismatch; do not retry")
        state["state"] = "discarded"
        state["audition"] = None
    return _tembro_response(host, owner, action, state)
