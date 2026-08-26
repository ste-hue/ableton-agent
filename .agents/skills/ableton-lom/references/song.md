# Song Class Reference

The Song class represents a Live Set. Access via `self.song()` or `self._song`.

**Canonical Path:** `live_set`

## Table of Contents
- [Transport Properties](#transport-properties)
- [Time & Loop Properties](#time--loop-properties)
- [Recording Properties](#recording-properties)
- [Scale & Tuning Properties](#scale--tuning-properties)
- [Other Properties](#other-properties)
- [Child Collections](#child-collections)
- [Transport Methods](#transport-methods)
- [Track Management Methods](#track-management-methods)
- [Scene Management Methods](#scene-management-methods)
- [Navigation Methods](#navigation-methods)
- [Cue Point Methods](#cue-point-methods)
- [Device Methods](#device-methods)
- [Recording & Automation Methods](#recording--automation-methods)
- [Utility Methods](#utility-methods)
- [Song.View Class](#songview-class)
- [CuePoint Class](#cuepoint-class)
- [GroovePool Class](#groovepool-class)
- [Groove Class](#groove-class)
- [TuningSystem Class](#tuningsystem-class)

---

## Transport Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `tempo` | float | R/W | Yes | Current tempo in BPM (20.0 - 999.0). May be automated. |
| `is_playing` | bool | R/W | Yes | Transport running state |
| `metronome` | bool | R/W | Yes | Metronome enabled state |
| `nudge_down` | bool | R/W | Yes | Tempo Nudge Down button pressed state |
| `nudge_up` | bool | R/W | Yes | Tempo Nudge Up button pressed state |
| `current_song_time` | float | R/W | Yes | Playing position in beats |
| `start_time` | float | R/W | Yes | Playback start position in beats |
| `song_length` | float | R | Yes | Total song length in beats (a little more than last_event_time) |
| `last_event_time` | float | R | No | Beat time of the last event in the arrangement |

## Time & Loop Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `signature_numerator` | int | R/W | Yes | Time signature numerator |
| `signature_denominator` | int | R/W | Yes | Time signature denominator |
| `loop` | bool | R/W | Yes | Arrangement loop enabled state |
| `loop_start` | float | R/W | Yes | Arrangement loop start position in beats |
| `loop_length` | float | R/W | Yes | Arrangement loop length in beats |
| `clip_trigger_quantization` | int | R/W | Yes | Quantization setting (0=None through 13=1/32) |
| `midi_recording_quantization` | int | R/W | Yes | Record quantization value (0=None through 8=1/32) |
| `swing_amount` | float | R/W | Yes | Swing amount (0.0 - 1.0). Affects MIDI Recording Quantization and Clip.quantize calls. |
| `groove_amount` | float | R/W | Yes | Groove pool amount (0.0 - 1.0) |

### Clip Trigger Quantization Values
```
0 = None           5 = 1/2           10 = 1/8 Triplet
1 = 8 Bars         6 = 1/2 Triplet   11 = 1/16
2 = 4 Bars         7 = 1/4           12 = 1/16 Triplet
3 = 2 Bars         8 = 1/4 Triplet   13 = 1/32
4 = 1 Bar          9 = 1/8
```

### MIDI Recording Quantization Values
```
0 = None           3 = 1/8 Triplet       6 = 1/16 Triplet
1 = 1/4            4 = 1/8 + 1/8T        7 = 1/16 + 1/16T
2 = 1/8            5 = 1/16              8 = 1/32
```

## Recording Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `record_mode` | bool | R/W | Yes | Arrangement Record button state |
| `session_record` | bool | R/W | Yes | Session Overdub button state |
| `session_record_status` | int | R | Yes | Session Record button state |
| `session_automation_record` | bool | R/W | Yes | Automation Arm button state |
| `arrangement_overdub` | bool | R/W | Yes | State of MIDI Arrangement Overdub button |
| `overdub` | bool | R/W | Yes | MIDI Arrangement Overdub enabled state |
| `punch_in` | bool | R/W | Yes | Punch-In button enabled state |
| `punch_out` | bool | R/W | Yes | Punch-Out button enabled state |
| `back_to_arranger` | bool | R/W | Yes | Transport bar button indicating playback differs from arrangement |
| `re_enable_automation_enabled` | bool | R | Yes | Re-Enable Automation button state |
| `can_capture_midi` | bool | R | Yes | Whether recently played MIDI material can be captured |
| `count_in_duration` | int | R | Yes | Metronome count-in duration index (0=None, 1=1 Bar, 2=2 Bars, 3=4 Bars) |
| `is_counting_in` | bool | R | Yes | Metronome count-in in progress |

## Scale & Tuning Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `root_note` | int | R/W | Yes | Scale root note (0=C through 11=B) |
| `scale_name` | unicode | R/W | Yes | Current scale name from chooser |
| `scale_intervals` | list | R | Yes | Integer list representing current scale intervals |
| `scale_mode` | bool | R/W | Yes | Scale Mode highlighting and editing state |

## Other Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R | No | Current Live Set name; empty if unsaved |
| `file_path` | symbol | R | No | OS-native Live Set file path; empty if unsaved |
| `exclusive_arm` | bool | R | No | Exclusive Arm preference status |
| `exclusive_solo` | bool | R | No | Exclusive Solo preference status |
| `select_on_launch` | bool | R | No | "Select on Launch" preference status |
| `is_ableton_link_enabled` | bool | R/W | Yes | Ableton Link toggle state |
| `is_ableton_link_start_stop_sync_enabled` | bool | R/W | Yes | Link Start Stop Sync state |
| `can_undo` | bool | R | No | Undo history availability |
| `can_redo` | bool | R | No | Redo history availability |
| `can_jump_to_next_cue` | bool | R | Yes | Whether a cue point exists to the right |
| `can_jump_to_prev_cue` | bool | R | Yes | Whether a cue point exists to the left |
| `tempo_follower_enabled` | bool | R/W | Yes | Tempo Follower controls tempo |
| `appointed_device` | Device | R | Yes | The appointed device for control surfaces (marked by blue hand) |

## Child Collections

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `tracks` | list[Track] | R | Yes | All tracks (audio, MIDI, group) |
| `return_tracks` | list[Track] | R | Yes | Return track collection |
| `visible_tracks` | list[Track] | R | Yes | Tracks not part of a folded group |
| `master_track` | Track | R | No | Master output track |
| `scenes` | list[Scene] | R | Yes | Scene collection |
| `cue_points` | list[CuePoint] | R | Yes | Arrangement markers |
| `groove_pool` | GroovePool | R | No | Live's groove pool (since Live 11.0) |
| `tuning_system` | TuningSystem | R | Yes | Active tuning system |
| `view` | Song.View | R | No | Song view object |

---

## Transport Methods

### `start_playing()`
Start playback from insert marker.
```python
self._song.start_playing()
```

### `stop_playing()`
Stop playback.
```python
self._song.stop_playing()
```

### `continue_playing()`
Resume playback from current position.
```python
self._song.continue_playing()
```

### `stop_all_clips(quantized=1)`
Stop all clips. Set `quantized=0` for immediate stop.
```python
self._song.stop_all_clips()   # Quantized
self._song.stop_all_clips(0)  # Immediate
```

### `play_selection()`
Play arrangement selection if available, otherwise do nothing.

### `tap_tempo()`
Tap tempo - tempo is calculated from interval between calls.
```python
# Call repeatedly to tap tempo
self._song.tap_tempo()
```

## Track Management Methods

### `create_midi_track(index)`
Add MIDI track at specified index (-1 for end).
```python
self._song.create_midi_track(-1)  # Add at end
self._song.create_midi_track(0)   # Add at beginning
```

### `create_audio_track(index)`
Add audio track at specified index (-1 for end).
```python
self._song.create_audio_track(-1)  # Add at end
```

### `create_return_track()`
Add return track at end.
```python
self._song.create_return_track()
```

### `delete_track(index)`
Remove track at index.
```python
self._song.delete_track(2)  # Delete track at index 2
```

### `delete_return_track(index)`
Remove return track at index.
```python
self._song.delete_return_track(0)  # Delete first return track
```

### `duplicate_track(index)`
Copy track at index.
```python
self._song.duplicate_track(0)  # Duplicate first track
```

## Scene Management Methods

### `create_scene(index)` → Scene
Create scene at index (-1 for end). Returns the new Scene.
```python
new_scene = self._song.create_scene(-1)
```

### `delete_scene(index)`
Remove scene at index.
```python
self._song.delete_scene(0)  # Delete first scene
```

### `duplicate_scene(index)`
Copy scene at index.
```python
self._song.duplicate_scene(0)  # Duplicate first scene
```

### `capture_and_insert_scene()`
Capture the currently playing clips and insert them as a new scene below the selected scene.
```python
self._song.capture_and_insert_scene()
```

## Navigation Methods

### `jump_by(beats)`
Jump relative to current position.
```python
self._song.jump_by(4.0)   # Jump forward 4 beats
self._song.jump_by(-4.0)  # Jump back 4 beats
```

### `scrub_by(beats)`
Scrub relative to current position (currently same as jump_by).
```python
self._song.scrub_by(1.0)  # Scrub forward 1 beat
```

### `get_current_beats_song_time()` → symbol
Return current position as "bars.beats.sixteenths.ticks".
```python
position = self._song.get_current_beats_song_time()
# Returns e.g. "4.2.1.0"
```

### `get_beats_loop_start()` → symbol
Return loop start as "bars.beats.sixteenths.ticks".

### `get_beats_loop_length()` → symbol
Return loop length as "bars.beats.sixteenths.ticks".

### `get_current_smpte_song_time(format)` → symbol
Return position as "hours:min:sec" in specified timecode format (0-5).
```python
smpte = self._song.get_current_smpte_song_time(0)
# Returns e.g. "00:01:23"
```

## Cue Point Methods

### `jump_to_next_cue()`
Jump to next cue point to the right.
```python
if self._song.can_jump_to_next_cue:
    self._song.jump_to_next_cue()
```

### `jump_to_prev_cue()`
Jump to next cue point to the left.
```python
if self._song.can_jump_to_prev_cue:
    self._song.jump_to_prev_cue()
```

### `set_or_delete_cue()`
Toggle cue point at current position.
```python
self._song.set_or_delete_cue()
```

### `is_cue_point_selected()` → bool
Check if playhead is at a cue point.
```python
at_cue = self._song.is_cue_point_selected()
```

## Device Methods

### `find_device_position(device, target, target_position)` → int
Find the closest insertable device position in target chain.
```python
position = self._song.find_device_position(device, target_track, 0)
```

### `move_device(device, target, target_position)` → int
Relocate device to target chain at specified position.
```python
self._song.move_device(device, target_track, 2)
```

## Recording & Automation Methods

### `trigger_session_record(record_length=None)`
Start session recording with optional duration.
```python
self._song.trigger_session_record()      # Record until stopped
self._song.trigger_session_record(4.0)   # Record for 4 beats
```

### `capture_midi(destination=0)`
Capture recent MIDI into a clip.
- `destination=0`: Auto
- `destination=1`: Session
- `destination=2`: Arrangement
```python
if self._song.can_capture_midi:
    self._song.capture_midi(0)  # Auto destination
```

### `re_enable_automation()`
Trigger 'Re-Enable Automation', re-activating automation in all running Session clips.
```python
self._song.re_enable_automation()
```

## Utility Methods

### `undo()`
Undo last operation.
```python
if self._song.can_undo:
    self._song.undo()
```

### `redo()`
Redo last undone operation.
```python
if self._song.can_redo:
    self._song.redo()
```

### `force_link_beat_time()`
Jump Link timeline to current beat time.
```python
self._song.force_link_beat_time()
```

---

## Song.View Class

The Song.View class represents the view aspects of a Live document: the Session and Arrangement Views.

**Canonical Path:** `live_set view`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `detail_clip` | Clip | R | Yes | The clip currently displayed in Detail View |
| `highlighted_clip_slot` | ClipSlot | R | No | The slot highlighted in Session View |
| `selected_chain` | Chain | R | Yes | The highlighted chain, or 'id 0' if none |
| `selected_parameter` | DeviceParameter | R | Yes | The selected parameter, or 'id 0' if none |
| `selected_scene` | Scene | R | Yes | The currently selected scene |
| `selected_track` | Track | R | Yes | The currently selected track |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `draw_mode` | bool | R/W | Yes | Draw Mode state in transport bar (Cmd/Ctrl-B). 0=breakpoint editing (arrow), 1=drawing (pencil) |
| `follow_song` | bool | R/W | Yes | Follow switch state in transport bar (Cmd/Ctrl-F). 0=don't follow, 1=follow playback position |

### Methods

#### `select_device(device)`
Selects the given device object in its track. The containing track won't display automatically. Device selection (blue hand icon) requires the track to also be selected.
```python
self._song.view.select_device(device)
```

---

## CuePoint Class

Represents a locator/marker in the Arrangement View.

**Canonical Path:** `live_set cue_points N`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R/W | Yes | Cue point name |
| `time` | float | R | Yes | Arrangement position of the marker in beats |

### Methods

#### `jump()`
Set current Arrangement playback position to this marker, quantized if song is playing.
```python
cue_point = self._song.cue_points[0]
cue_point.jump()
```

---

## GroovePool Class

Represents the groove pool in Live. Provides access to the current set's list of grooves.

**Canonical Path:** `live_set groove_pool`

**Available since Live 11.0**

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `grooves` | list[Groove] | R | Yes | List of grooves in the groove pool from top to bottom |

---

## Groove Class

Represents a groove in Live.

**Canonical Paths:**
- `live_set groove_pool grooves N`
- `live_set tracks N clip_slots M clip groove`

**Available since Live 11.0**

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `base` | int | R/W | No | Groove's base grid setting |
| `name` | symbol | R/W | Yes | Name of the groove |
| `quantization_amount` | float | R/W | Yes | Groove's quantization amount |
| `random_amount` | float | R/W | Yes | Groove's random amount |
| `timing_amount` | float | R/W | Yes | Groove's timing amount |
| `velocity_amount` | float | R/W | Yes | Groove's velocity amount |

### Groove Base Values
```
0 = 1/4
1 = 1/8
2 = 1/8 Triplet
3 = 1/16
4 = 1/16 Triplet
5 = 1/32
```

---

## TuningSystem Class

Represents a tuning system in Live.

**Canonical Path:** `live_set tuning_system`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R/W | Yes | Name of the currently active tuning system |
| `pseudo_octave_in_cents` | float | R | No | The pseudo octave in cents of the currently active tuning system |
| `lowest_note` | dictionary | R/W | Yes | The note index within the pseudo octave and octave of the lowest note |
| `highest_note` | dictionary | R/W | Yes | The note index within the pseudo octave and octave of the highest note |
| `reference_pitch` | dictionary | R/W | Yes | The reference pitch of the current tuning system |
| `note_tunings` | dictionary | R/W | Yes | The relative note tunings in cents (single-element dictionary holding an array) |
