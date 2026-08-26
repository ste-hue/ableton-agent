# Clip Class Reference

The Clip class represents audio or MIDI clips in Ableton Live. Clips can exist in either Session View (in clip slots) or Arrangement View (on the timeline).

**Note on Time Values:** Time values for MIDI clips and warped audio clips are in beats. For unwarped audio clips, time values are in seconds.

**Canonical Paths:**
- Session View: `live_set tracks N clip_slots M clip`
- Arrangement View: `live_set tracks N arrangement_clips M`

## Table of Contents
- [Children](#children)
- [Basic Properties](#basic-properties)
- [Loop & Position Properties](#loop--position-properties)
- [Playback Properties](#playback-properties)
- [Launch Properties](#launch-properties)
- [Groove Properties](#groove-properties)
- [Audio Clip Properties](#audio-clip-properties)
- [MIDI Note Methods](#midi-note-methods)
- [Audio Warp Methods](#audio-warp-methods)
- [Playback Methods](#playback-methods)
- [Automation Methods](#automation-methods)
- [Other Methods](#other-methods)
- [Clip.View Class](#clipview-class)
- [ClipSlot Class](#clipslot-class)
- [Quantization Values Reference](#quantization-values-reference)

---

## Children

| Child | Type | Access | Description |
|-------|------|--------|-------------|
| `view` | Clip.View | R | The view aspects of the clip |

---

## Basic Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R/W | Yes | Clip name |
| `color` | int | R/W | Yes | RGB value in format 0x00rrggbb; nearest color selected when set |
| `color_index` | int | R/W | Yes | Clip's color index |
| `is_audio_clip` | bool | R | No | 1 for audio clips, 0 for MIDI clips |
| `is_midi_clip` | bool | R | No | 1 for MIDI clips, 0 for audio clips (inverse of is_audio_clip) |
| `is_session_clip` | bool | R | No | 1 if clip is in Session View |
| `is_arrangement_clip` | bool | R | No | 1 if clip is in Arrangement View |
| `is_take_lane_clip` | bool | R | No | 1 if clip is on a Take Lane |
| `muted` | bool | R/W | Yes | 1 = muted (Clip Activator is off) |
| `length` | float | R | No | Loop length in beats (if looped) or distance from start to end marker |
| `signature_numerator` | int | R/W | Yes | Time signature numerator |
| `signature_denominator` | int | R/W | Yes | Time signature denominator |
| `has_envelopes` | bool | R | Yes | Whether clip contains automation envelopes |
| `notes` | bang | - | Yes | Observer sends bang when the list of notes changes (MIDI clips) |

---

## Loop & Position Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `looping` | bool | R/W | Yes | 1 if clip is looped (unwarped audio cannot loop) |
| `loop_start` | float | R/W | Yes | Loop start (if looped) or clip start (if unlooped) in beats |
| `loop_end` | float | R/W | Yes | Loop end (if looped) or clip end (if unlooped) in beats |
| `position` | float | R/W | Yes | Loop position; equals loop_start but unlike loop_start, setting this preserves the loop length |
| `start_marker` | float | R/W | Yes | Start marker of the clip in beats, independent of loop state |
| `end_marker` | float | R/W | Yes | End marker of the clip in beats, independent of loop state |
| `start_time` | float | R | Yes | Start time relative to global song time in beats |
| `end_time` | float | R | Yes | Loop end (if looped) or end marker; rightmost edge for arrangement clips |
| `playing_position` | float | R | Yes | Current playback position in beats (or seconds for unwarped audio) |
| `loop_jump` | bang | - | Yes | Observer sends bang when play position crosses loop start marker |

---

## Playback Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_playing` | bool | R/W | No | 1 if clip is playing or recording |
| `is_recording` | bool | R | Yes | 1 if clip is currently recording |
| `is_triggered` | bool | R | No | 1 if Clip Launch button is blinking |
| `is_overdubbing` | bool | R | Yes | 1 if clip is currently overdubbing |
| `will_record_on_start` | bool | R | No | 1 for triggered MIDI clips with armed track and Arrangement Overdub on |
| `playing_status` | bang | - | Yes | Observer sends bang when playing or trigger status changes |

---

## Launch Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `launch_mode` | int | R/W | Yes | Launch mode index (see values below); Live 11.0+ |
| `launch_quantization` | int | R/W | Yes | Quantization index 0-14 (see Quantization Values Reference); Live 11.0+ |
| `legato` | bool | R/W | Yes | 1 = Legato Mode switch in clip's Launch settings is on; Live 11.0+ |
| `velocity_amount` | float | R/W | Yes | How much triggering note velocity affects clip volume (0.0-1.0); Live 11.0+ |

### Launch Mode Values
```
0 = Trigger
1 = Gate
2 = Toggle
3 = Repeat
```

---

## Groove Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `groove` | Groove | R/W | Yes | Get/set/observe the groove associated with this clip; Live 11.0+ |
| `has_groove` | bool | R | No | Returns true if a groove is associated with the clip |

---

## Audio Clip Properties

These properties only apply to audio clips.

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `file_path` | symbol | R | No | Location of the audio file represented by the clip |
| `gain` | float | R/W | Yes | Clip gain (0.0 to 1.0 range) |
| `gain_display_string` | symbol | R | No | Gain as formatted string (e.g., "1.3 dB") |
| `pitch_coarse` | int | R/W | Yes | Transpose in semitones (-48 to 48) |
| `pitch_fine` | float | R/W | Yes | Detune in cents (-50 to 49) |
| `warping` | bool | R/W | Yes | 1 if Warp switch is enabled |
| `warp_mode` | int | R/W | Yes | Warp mode index (see values below) |
| `available_warp_modes` | list | R | No | List of indexes of Warp Modes available for this clip |
| `warp_markers` | dict | R | Yes | The clip's Warp Markers as a dictionary |
| `ram_mode` | bool | R/W | Yes | 1 if RAM switch is enabled |
| `sample_length` | int | R | No | Sample length in samples |
| `sample_rate` | float | R | No | Sample rate of the audio file |

### Warp Mode Values
```
0 = Beats
1 = Tones
2 = Texture
3 = Re-Pitch
4 = Complex
5 = REX
6 = Complex Pro
```

---

## MIDI Note Methods

### Note Data Format

Notes are represented as dictionaries with these keys:
- `note_id`: Unique identifier (returned by getters, not set when adding)
- `pitch`: MIDI pitch (0-127, where 60 = C3)
- `start_time`: Position in beats (absolute clip beat time)
- `duration`: Length in beats
- `velocity`: Note velocity (0-127, default 100)
- `mute`: Muted/deactivated state (default 0/False)
- `probability`: Note probability (0.0-1.0, default 1.0)
- `velocity_deviation`: Velocity randomization (-127.0 to 127.0, default 0.0)
- `release_velocity`: Release velocity (default 64)

### `add_new_notes(notes_dict)` -> list[note_id] (Live 11.0+)
Add notes to the clip. Returns list of note IDs.
```python
notes = {
    "notes": [
        {"pitch": 60, "start_time": 0.0, "duration": 0.5, "velocity": 100},
        {"pitch": 64, "start_time": 0.5, "duration": 0.5, "velocity": 100},
        {"pitch": 67, "start_time": 1.0, "duration": 0.5, "velocity": 100}
    ]
}
note_ids = clip.add_new_notes(notes)
```

### `get_all_notes_extended(options=None)` -> list[dict] (Live 11.1+)
Get all notes in the clip regardless of position.
```python
# Get all properties
notes = clip.get_all_notes_extended()

# Get specific properties only
notes = clip.get_all_notes_extended({"return": ["pitch", "start_time", "duration"]})
```

### `get_notes_extended(from_pitch, pitch_span, from_time, time_span)` -> list[dict] (Live 11.0+)
Get notes within a pitch/time region.
```python
# Get all notes from C3 to C4, beats 0-4
notes = clip.get_notes_extended(48, 12, 0.0, 4.0)

# Or as dictionary
notes = clip.get_notes_extended({
    "from_pitch": 48,
    "pitch_span": 12,
    "from_time": 0.0,
    "time_span": 4.0
})
```

### `get_notes_by_id(note_ids)` -> list[dict] (Live 11.0+)
Get specific notes by their IDs.
```python
notes = clip.get_notes_by_id([1, 2, 3])
# Or with specific return properties
notes = clip.get_notes_by_id({"note_ids": [1, 2, 3], "return": ["pitch", "velocity"]})
```

### `get_selected_notes_extended(options=None)` -> list[dict] (Live 11.0+)
Get currently selected notes.
```python
selected = clip.get_selected_notes_extended()
```

### `apply_note_modifications(notes_dict)` (Live 11.0+)
Modify existing notes. Replaces the remove/add workflow for editing notes.
```python
# Get notes, modify, and apply
notes = clip.get_notes_extended(0, 128, 0.0, 4.0)
for note in notes["notes"]:
    note["velocity"] = min(127, note["velocity"] + 10)
clip.apply_note_modifications(notes)
```

### `remove_notes_by_id(note_ids)` (Live 11.0+)
Delete notes by their IDs.
```python
clip.remove_notes_by_id([1, 2, 3])
```

### `remove_notes_extended(from_pitch, pitch_span, from_time, time_span)` (Live 11.0+)
Delete notes within a pitch/time region.
```python
clip.remove_notes_extended(0, 128, 0.0, 4.0)  # Remove all notes in first 4 beats
```

### `duplicate_notes_by_id(note_ids_or_dict)` (Live 11.1.2+)
Duplicate notes, optionally with transposition.
```python
# Simple duplication
clip.duplicate_notes_by_id([1, 2, 3])

# With destination and transposition
clip.duplicate_notes_by_id({
    "note_ids": [1, 2, 3],
    "destination_time": 4.0,
    "transposition_amount": 12  # Up one octave
})
```

### `duplicate_region(region_start, region_length, destination_time, pitch=-1, transposition_amount=0)`
Duplicate notes in a region.
```python
# Duplicate beats 0-4 to beat 4
clip.duplicate_region(0.0, 4.0, 4.0)

# Duplicate with transposition
clip.duplicate_region(0.0, 4.0, 4.0, -1, 12)  # -1 = all pitches
```

### Note Selection Methods

```python
clip.select_all_notes()             # Select all notes in the clip
clip.deselect_all_notes()           # Deselect all notes
clip.select_notes_by_id([1, 2, 3])  # Select specific notes by ID (Live 11.0.6+)
```

### Quantize Methods

```python
# Quantize all notes (uses song's swing amount)
clip.quantize(grid, amount)  # grid = quantization index, amount = 0.0-1.0

# Quantize specific pitch only
clip.quantize_pitch(60, grid, amount)  # Only C4 notes
```

### `duplicate_loop()`
Makes loop 2x longer and duplicates notes and envelopes.

---

## Audio Warp Methods

### `add_warp_marker(marker_dict)`
Add a warp marker to the audio clip. Constraints:
- Sample time must be in range [0, sample_length]
- Sample time must be between adjacent markers
- Resulting BPM must be in range [5, 999]

```python
clip.add_warp_marker({"beat_time": 4.0})
# Or with sample time
clip.add_warp_marker({"beat_time": 4.0, "sample_time": 88200})
```

### `move_warp_marker(beat_time, beat_time_distance)`
Relocate a warp marker by a specified distance.
```python
clip.move_warp_marker(4.0, 0.5)  # Move marker at beat 4 by 0.5 beats
```

### `remove_warp_marker(beat_time)`
Remove warp marker at the specified position.
```python
clip.remove_warp_marker(4.0)
```

---

## Playback Methods

### `fire()`
Equivalent to pressing the Clip Launch button.
```python
clip.fire()
```

### `stop()`
Stop clip playback (only effective if clip is currently playing).
```python
clip.stop()
```

### `set_fire_button_state(state)`
Simulate holding the launch button (1=press, 0=release).
```python
clip.set_fire_button_state(1)  # Press
# ... some time later
clip.set_fire_button_state(0)  # Release
```

### `move_playing_pos(beats)`
Jump by a relative amount in beats (unquantized). Negative values allowed.
```python
clip.move_playing_pos(4.0)   # Jump forward 4 beats
clip.move_playing_pos(-2.0)  # Jump backward 2 beats
```

### `scrub(beat_time)`
Scrub to absolute time. Respects Global Quantization.
```python
clip.scrub(8.0)  # Scrub to beat 8
```

### `stop_scrub()`
Stop an active scrub operation.

---

## Automation Methods

### `clear_all_envelopes()`
Remove all automation envelopes in the clip.

### `clear_envelope(device_parameter)`
Remove automation for a specific parameter.
```python
clip.clear_envelope(device.parameters[0])
```

---

## Other Methods

### `crop()`
If looped: removes region outside the loop. Otherwise: removes region outside the start/end markers.

---

## Clip.View Class

**Canonical Path:** `live_set tracks N clip_slots M clip view`

Represents the view aspects of a Clip.

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `grid_quantization` | int | R/W | No | Get/set the grid quantization |
| `grid_is_triplet` | bool | R/W | No | Get/set whether the clip is displayed with a triplet grid |

### Methods

#### `show_envelope()`
Show the Envelopes box in clip view.

#### `hide_envelope()`
Hide the Envelopes box.

#### `select_envelope_parameter(device_parameter)`
Select the specified device parameter in the Envelopes box.
```python
clip.view.select_envelope_parameter(device.parameters[0])
```

#### `show_loop()`
If the clip is visible in Live's Detail View, make the current loop visible there.

---

## ClipSlot Class

**Canonical Path:** `live_set tracks N clip_slots M`

Represents an entry in Live's Session View matrix.

### Children

| Child | Type | Access | Description |
|-------|------|--------|-------------|
| `clip` | Clip | R | The contained Clip object (id 0 if slot is empty) |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `color` | int | R | Yes | Color of first clip in Group Track (for Group Track slots) |
| `color_index` | int | R | Yes | Color index of first clip in Group Track (for Group Track slots) |
| `controls_other_clips` | bool | R | Yes | 1 for Group Track slot with non-deactivated clips in group |
| `has_clip` | bool | R | Yes | 1 = a clip exists in this clip slot |
| `has_stop_button` | bool | R/W | Yes | 1 = this clip stops its track (or tracks within Group Track) |
| `is_group_slot` | bool | R | No | 1 = this clip slot is a Group Track slot |
| `is_playing` | bool | R | No | 1 = playing_status != 0 |
| `is_recording` | bool | R | No | 1 = playing_status == 2 |
| `is_triggered` | bool | R | Yes | 1 = clip slot or contained clip button is blinking |
| `playing_status` | int | R | Yes | 0=stopped, 1=playing, 2=recording (Group Track slots only) |
| `will_record_on_start` | bool | R | No | 1 = clip slot will record on start |

### Methods

#### `create_clip(length)`
Create an empty MIDI clip in the slot. Length is given in beats and must be greater than 0.0. Can only be called on empty clip slots in MIDI tracks.
```python
clip_slot.create_clip(4.0)  # Create 4-beat clip
```

#### `create_audio_clip(path)`
Create an audio clip from a file. Given an absolute path to a valid audio file in a supported format, creates an audio clip that references the file. Throws an error if the clip slot doesn't belong to an audio track or if the track is frozen.
```python
clip_slot.create_audio_clip("/path/to/audio.wav")
```

#### `delete_clip()`
Delete the contained clip.

#### `duplicate_clip_to(target_clip_slot)`
Duplicate the slot's clip to another clip slot, overriding the target clip slot's clip if it's not empty.
```python
source_slot.duplicate_clip_to(target_slot)
```

#### `fire(record_length=None, launch_quantization=None)`
Fire the clip slot. Supports optional recording parameters.
```python
clip_slot.fire()
# Or with recording length
clip_slot.fire(4.0)  # Record for 4 beats
```

#### `set_fire_button_state(state)`
Simulate holding the fire button (1=press, 0=release). Button remains pressed until state changes or slot stops.

#### `stop()`
Stop playing or recording clips in this track or the tracks within the group.

---

## Quantization Values Reference

### Launch/Clip Trigger Quantization (0-14)
```
0  = Global (uses Song's clip_trigger_quantization)
1  = None
2  = 8 Bars
3  = 4 Bars
4  = 2 Bars
5  = 1 Bar
6  = 1/2
7  = 1/2T (triplet)
8  = 1/4
9  = 1/4T (triplet)
10 = 1/8
11 = 1/8T (triplet)
12 = 1/16
13 = 1/16T (triplet)
14 = 1/32
```

### MIDI Recording Quantization (0-8)
```
0 = None
1 = 1/4
2 = 1/8
3 = 1/8T (triplet)
4 = 1/8 + 1/8T
5 = 1/16
6 = 1/16T (triplet)
7 = 1/16 + 1/16T
8 = 1/32
```

---

## Working with MIDI Notes - Complete Example

```python
def create_chord_clip(self, track_index, slot_index):
    """Create a clip with a simple chord progression."""
    track = self._song.tracks[track_index]
    slot = track.clip_slots[slot_index]

    # Create empty clip if needed
    if not slot.has_clip:
        slot.create_clip(4.0)  # 4 beats

    clip = slot.clip
    clip.name = "Chord Progression"

    # Clear existing notes
    clip.remove_notes_extended(0, 128, 0.0, clip.length)

    # C major chord at beat 0
    c_major = [
        {"pitch": 60, "start_time": 0.0, "duration": 1.0, "velocity": 100},
        {"pitch": 64, "start_time": 0.0, "duration": 1.0, "velocity": 90},
        {"pitch": 67, "start_time": 0.0, "duration": 1.0, "velocity": 80}
    ]

    # G major chord at beat 2
    g_major = [
        {"pitch": 55, "start_time": 2.0, "duration": 1.0, "velocity": 100},
        {"pitch": 59, "start_time": 2.0, "duration": 1.0, "velocity": 90},
        {"pitch": 62, "start_time": 2.0, "duration": 1.0, "velocity": 80}
    ]

    # Add all notes
    all_notes = {"notes": c_major + g_major}
    note_ids = clip.add_new_notes(all_notes)

    return {"clip_name": clip.name, "note_count": len(note_ids)}
```
