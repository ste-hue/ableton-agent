# Session View Reference

This document covers Scene, ClipSlot, and CuePoint classes for Session View and Arrangement control.

## Table of Contents
- [Scene Class](#scene-class)
- [ClipSlot Class](#clipslot-class)
- [CuePoint Class](#cuepoint-class)
- [Common Patterns](#common-patterns)

---

## Scene Class

This class represents a series of clip slots in Live's Session View matrix.

**Canonical Path:** `live_set scenes N`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `color` | int | R/W | Yes | RGB value of the scene's color in the form 0x00rrggbb. When setting, the nearest color from the Scene color chooser is applied |
| `color_index` | long | R/W | Yes | Index value for the scene's color selection |
| `is_empty` | bool | R | No | Returns 1 if no clip slots contain content |
| `is_triggered` | bool | R | Yes | Returns 1 when scene is actively blinking |
| `name` | symbol | R/W | Yes | Scene's display name |
| `tempo` | float | R/W | Yes | Scene's tempo, returns -1 if disabled |
| `tempo_enabled` | bool | R/W | Yes | Activates/deactivates scene-specific tempo override |
| `time_signature_denominator` | int | R/W | Yes | Bottom number of time signature, returns -1 if disabled |
| `time_signature_enabled` | bool | R/W | Yes | Activates/deactivates scene-specific time signature |
| `time_signature_numerator` | int | R/W | Yes | Top number of time signature, returns -1 if disabled |

### Children

| Child | Type | Access | Observable | Description |
|-------|------|--------|------------|-------------|
| `clip_slots` | list[ClipSlot] | R | Yes | List of ClipSlot objects in this scene |

### Methods

#### `fire(force_legato, can_select_scene_on_launch)`
Launch all clip slots in the scene and select it. Starts recording of armed and empty tracks within a Group Track in this scene if Preferences > Launch > Start Recording on Scene Launch is ON.
- **force_legato** (bool, optional, default=0): When set to 1, triggers legato mode regardless of launch settings
- **can_select_scene_on_launch** (bool, optional, default=1): When set to 0, fires without selecting the scene

```python
scene.fire()  # Normal launch
scene.fire(1)  # Force legato mode
scene.fire(0, 0)  # Don't select scene after launch
```

#### `fire_as_selected(force_legato)`
Fire the selected scene, then select the next scene. Function location is irrelevant (can be called from any scene object).
- **force_legato** (bool, optional, default=0): When set to 1, triggers legato mode

```python
scene.fire_as_selected()
scene.fire_as_selected(1)  # With legato
```

#### `set_fire_button_state(state)`
Simulates scene button press when state=1 until state=0 or scene stops.
- **state** (bool): 1 to press, 0 to release

```python
scene.set_fire_button_state(1)  # Press
# ... time passes
scene.set_fire_button_state(0)  # Release
```

### Example: Scene with Tempo Change
```python
scene = song.scenes[0]
scene.name = "Verse - 120 BPM"
scene.tempo_enabled = True
scene.tempo = 120.0
```

### Example: Scene with Time Signature
```python
scene = song.scenes[4]
scene.name = "Bridge - 6/8"
scene.time_signature_enabled = True
scene.time_signature_numerator = 6
scene.time_signature_denominator = 8
```

---

## ClipSlot Class

This class represents an entry in Live's Session View matrix. Properties like `playing_status`, `is_playing`, and `is_recording` describe Group Track clip slot states.

**Canonical Path:** `live_set tracks N clip_slots M`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `color` | long | R | Yes | The color of the first clip in the Group Track if the clip slot is a Group Track slot |
| `color_index` | long | R | Yes | Color index of first clip in Group Track slot |
| `controls_other_clips` | bool | R | Yes | Returns 1 for Group Track slots with non-deactivated clips in contained tracks |
| `has_clip` | bool | R | Yes | Returns 1 if a clip exists in this slot |
| `has_stop_button` | bool | R/W | Yes | Get/set whether this clip slot has a stop button that stops its track or Group Track tracks |
| `is_group_slot` | bool | R | No | Returns 1 if this slot belongs to a Group Track |
| `is_playing` | bool | R | No | Returns 1 if playing_status is not 0 |
| `is_recording` | bool | R | No | Returns 1 if playing_status equals 2 |
| `is_triggered` | bool | R | Yes | Returns 1 if clip slot button or contained clip button is blinking |
| `playing_status` | int | R | Yes | 0=stopped, 1=playing, 2=recording (for Group Track clips) |
| `will_record_on_start` | bool | R | No | Returns 1 if slot will record upon start |

### Children

| Child | Type | Access | Observable | Description |
|-------|------|--------|------------|-------------|
| `clip` | Clip | R | No | The clip in this slot (returns ID 0 if the slot is empty) |

### Methods

#### `create_audio_clip(path)`
Creates an audio clip referencing the file at the given path. Throws an error if the slot isn't on an audio track or if the track is frozen.
- **path** (string): Absolute file path to the audio file

```python
clip_slot.create_audio_clip("/path/to/audio.wav")
```

#### `create_clip(length)`
Create a MIDI clip of specified beat length. Can only be called on empty clip slots in MIDI tracks.
- **length** (float): Length in beats (must be > 0.0)

```python
clip_slot.create_clip(4.0)  # 4-beat clip
```

#### `delete_clip()`
Removes the contained clip.

```python
if clip_slot.has_clip:
    clip_slot.delete_clip()
```

#### `duplicate_clip_to(target_clip_slot)`
Copies this slot's clip to the target, overwriting any existing clip if present.
- **target_clip_slot** (ClipSlot): The destination clip slot

```python
source_slot = track.clip_slots[0]
target_slot = track.clip_slots[1]
source_slot.duplicate_clip_to(target_slot)
```

#### `fire(record_length, launch_quantization)`
Fires the clip or Stop Button. If the track is armed and the slot is empty, recording will start. Both parameters are optional.
- **record_length** (float, optional): Recording length in beats
- **launch_quantization** (int, optional): Quantization override value

```python
clip_slot.fire()  # Launch clip or stop button
clip_slot.fire(4.0)  # Record for 4 beats
clip_slot.fire(4.0, 4)  # Record 4 beats with quantization override
```

#### `set_fire_button_state(state)`
Simulates Clip Launch button press until state is set to 0 or slot is stopped.
- **state** (bool): 1 to press, 0 to release

```python
clip_slot.set_fire_button_state(1)  # Press
# ... time passes
clip_slot.set_fire_button_state(0)  # Release
```

#### `stop()`
Stops playing or recording in the track or Group Track. Callable on any slot of the track.

```python
clip_slot.stop()
```

---

## CuePoint Class

This class represents a locator/marker in Live's Arrangement View.

**Canonical Path:** `live_set cue_points N`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R/W | Yes | The name of the cue point/locator |
| `time` | float | R | Yes | Arrangement position of the marker in beats |

### Methods

#### `jump()`
Set the current Arrangement playback position to this marker. If the song is playing, the jump is quantized.

```python
cue_point = song.cue_points[0]
cue_point.jump()  # Jump to this marker position
```

### Example: Jump to Named Cue Point
```python
def jump_to_cue_point(song, name):
    """Find and jump to a cue point by name."""
    for cue in song.cue_points:
        if cue.name == name:
            cue.jump()
            return True
    return False

jump_to_cue_point(song, "Chorus")
```

### Example: List All Cue Points
```python
def get_cue_points_info(song):
    """Get info about all cue points in the song."""
    return [
        {
            "name": cue.name,
            "time": cue.time,
            "bars": cue.time / 4.0  # Assuming 4/4 time
        }
        for cue in song.cue_points
    ]
```

---

## Common Patterns

### Launch a Scene
```python
def launch_scene_by_name(song, name):
    """Find and launch a scene by name."""
    for scene in song.scenes:
        if scene.name == name:
            scene.fire()
            return True
    return False

launch_scene_by_name(song, "Chorus")
```

### Get All Playing Clips
```python
def get_playing_clips(song):
    """Return list of all currently playing clips."""
    playing = []
    for track in song.tracks:
        for slot in track.clip_slots:
            if slot.has_clip and slot.clip.is_playing:
                playing.append({
                    "track": track.name,
                    "clip": slot.clip.name,
                    "position": slot.clip.playing_position
                })
    return playing
```

### Create Clips Across a Scene
```python
def create_scene_clips(song, scene_index, length=4.0):
    """Create clips in all MIDI tracks for a scene."""
    scene = song.scenes[scene_index]
    for track in song.tracks:
        if track.has_midi_input:
            slot = track.clip_slots[scene_index]
            if not slot.has_clip:
                slot.create_clip(length)
```

### Stop All and Launch Scene
```python
def transition_to_scene(song, scene_index, quantized=True):
    """Stop all clips and launch a specific scene."""
    song.stop_all_clips(1 if quantized else 0)
    song.scenes[scene_index].fire()
```

### Monitor Clip Slot Changes
```python
def setup_clip_slot_listeners(self, track):
    """Add listeners to track clip slot changes."""
    for i, slot in enumerate(track.clip_slots):
        def on_has_clip_changed(index=i):
            slot = track.clip_slots[index]
            if slot.has_clip:
                self.log_message(f"Clip added to slot {index}")
            else:
                self.log_message(f"Clip removed from slot {index}")

        slot.add_has_clip_listener(on_has_clip_changed)
```

### Record into Empty Slot
```python
def record_into_first_empty_slot(track, length=4.0):
    """Find first empty slot and start recording."""
    for slot in track.clip_slots:
        if not slot.has_clip:
            slot.fire(length)  # Fire with record length
            return True
    return False
```

### Navigate Session View
```python
def get_session_grid(song, start_track=0, start_scene=0, width=8, height=8):
    """Get a grid of clip slot info for Session View display."""
    grid = []
    tracks = song.tracks[start_track:start_track + width]

    for scene_offset in range(height):
        scene_idx = start_scene + scene_offset
        if scene_idx >= len(song.scenes):
            break

        row = {
            "scene_index": scene_idx,
            "scene_name": song.scenes[scene_idx].name,
            "slots": []
        }

        for track in tracks:
            if scene_idx < len(track.clip_slots):
                slot = track.clip_slots[scene_idx]
                slot_info = {
                    "has_clip": slot.has_clip,
                    "is_playing": slot.is_playing,
                    "is_triggered": slot.is_triggered,
                    "is_recording": slot.is_recording
                }
                if slot.has_clip:
                    slot_info["clip_name"] = slot.clip.name
                    slot_info["clip_color"] = slot.clip.color
                row["slots"].append(slot_info)

        grid.append(row)

    return grid
```

### Scene Launch Queue
```python
class SceneLauncher:
    """Queue scenes to launch in sequence."""

    def __init__(self, song):
        self.song = song
        self.queue = []
        self.current_index = 0

    def add_to_queue(self, scene_index):
        self.queue.append(scene_index)

    def launch_next(self):
        if self.current_index < len(self.queue):
            scene_idx = self.queue[self.current_index]
            self.song.scenes[scene_idx].fire()
            self.current_index += 1
            return True
        return False

    def reset(self):
        self.current_index = 0
```

### Group Track Slot Handling
```python
def get_group_slot_clips(slot):
    """Get info about clips controlled by a group slot."""
    if not slot.is_group_slot:
        return None

    return {
        "controls_clips": slot.controls_other_clips,
        "is_triggered": slot.is_triggered,
        "playing_status": slot.playing_status
    }
```
