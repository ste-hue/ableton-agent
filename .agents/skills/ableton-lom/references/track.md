# Track Class Reference

The Track class represents a track in Live. It can be an audio track, a MIDI track, a return track, or the master track. The master track and at least one Audio or MIDI track will always be present.

**Canonical Path:** `live_set tracks N` or `live_set return_tracks N` or `live_set master_track`

## Table of Contents
- [Children](#children)
- [Basic Properties](#basic-properties)
- [Track Type Properties](#track-type-properties)
- [Routing Properties](#routing-properties)
- [Meter Properties](#meter-properties)
- [Session View Properties](#session-view-properties)
- [Group Track Properties](#group-track-properties)
- [Methods](#methods)
- [MixerDevice Class](#mixerdevice-class)
- [Track.View Class](#trackview-class)
- [TakeLane Class](#takelane-class)

---

## Children

| Child | Type | Access | Observable | Description |
|-------|------|--------|------------|-------------|
| `arrangement_clips` | list[Clip] | R | Yes | The list of this track's Arrangement View clip IDs (Available since Live 11.0) |
| `clip_slots` | list[ClipSlot] | R | Yes | Session view clip slots for this track |
| `devices` | list[Device] | R | Yes | Devices on this track (includes mixer device) |
| `group_track` | Track | R | No | Parent Group Track, or id 0 if ungrouped |
| `mixer_device` | MixerDevice | R | No | The track's mixer device |
| `take_lanes` | list[TakeLane] | R | Yes | The list of this track's take lanes |
| `view` | Track.View | R | No | View aspects of track |

---

## Basic Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R/W | Yes | Track name as shown in track header |
| `color` | int | R/W | Yes | RGB color value (0x00rrggbb format); snaps to nearest palette color |
| `color_index` | long | R/W | Yes | Track color index reference |
| `arm` | bool | R/W | Yes | Track armed for recording (not available on return/master tracks) |
| `can_be_armed` | bool | R | No | Returns 0 for return and master tracks |
| `implicit_arm` | bool | R/W | Yes | Secondary arm state (Push controller integration) |
| `mute` | bool | R/W | Yes | Mute state (not available on master track) |
| `solo` | bool | R/W | Yes | Solo state; bypasses exclusive solo logic when set (not available on master track) |
| `muted_via_solo` | bool | R | Yes | 1 if track is muted due to Solo on another track |
| `is_frozen` | bool | R | Yes | 1 if track is currently frozen |
| `can_be_frozen` | bool | R | No | 1 if track can be frozen |
| `performance_impact` | float | R | Yes | Track performance load metric |

## Track Type Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `has_audio_input` | bool | R | No | Returns 1 for audio tracks |
| `has_audio_output` | bool | R | No | Returns 1 for audio tracks and MIDI tracks with instruments |
| `has_midi_input` | bool | R | No | Returns 1 for MIDI tracks |
| `has_midi_output` | bool | R | No | Returns 1 for MIDI tracks without instruments and without audio effects |

## Routing Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `input_routing_type` | dict | R/W | Yes | Currently selected source type (`display_name`, `identifier`) |
| `input_routing_channel` | dict | R/W | Yes | Currently selected source channel (`display_name`, `identifier`) |
| `output_routing_type` | dict | R/W | Yes | Currently selected target type (`display_name`, `identifier`) (not available on master track) |
| `output_routing_channel` | dict | R/W | Yes | Currently selected target channel (`display_name`, `identifier`) (not available on master track) |
| `available_input_routing_types` | dict | R | Yes | Available source types for input routing (MIDI/audio tracks only) |
| `available_input_routing_channels` | dict | R | Yes | Available source channels for input routing (MIDI/audio tracks only) |
| `available_output_routing_types` | dict | R | Yes | Available target types for output routing (not available on master track) |
| `available_output_routing_channels` | dict | R | Yes | Available target channels for output routing (not available on master track) |

### Routing Example
```python
# Get available input routing types
for routing in track.available_input_routing_types:
    print(routing['display_name'], routing['identifier'])

# Set input routing
track.input_routing_type = track.available_input_routing_types[0]
```

## Meter Properties

All meter values range from 0.0 to 1.0.

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `input_meter_left` | float | R | Yes | Smoothed momentary peak value (left channel input) |
| `input_meter_right` | float | R | Yes | Smoothed momentary peak value (right channel input) |
| `input_meter_level` | float | R | Yes | Hold peak value of input meters (1-second hold time) |
| `output_meter_left` | float | R | Yes | Smoothed momentary peak value (left channel output) |
| `output_meter_right` | float | R | Yes | Smoothed momentary peak value (right channel output) |
| `output_meter_level` | float | R | Yes | Hold peak value of output meters (1-second hold time) |

## Session View Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `fired_slot_index` | int | R | Yes | Blinking clip slot index (-1=none, -2=Stop button fired) (not available on return/master tracks) |
| `playing_slot_index` | int | R | Yes | Currently playing slot index (0+ = slot index, -2=Clip Stop slot fired in Session View, -1=Arrangement recording with no Session clip playing) (not available on return/master tracks) |
| `back_to_arranger` | bool | R/W | Yes | Single Track Back to Arrangement button state. Setting to 0 makes Live go back to playing the track's arrangement content |

## Group Track Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_foldable` | bool | R | No | 1 if track can be folded (group tracks only) |
| `fold_state` | int | R/W | No | 0=tracks within the Group Track are visible, 1=Group Track is folded and the tracks within are hidden (only accessible if is_foldable=1) |
| `is_grouped` | bool | R | No | 1 if track is contained within a Group Track |
| `is_visible` | bool | R | No | 0 if track is hidden in a folded Group Track |
| `can_show_chains` | bool | R | No | 1 if track contains an Instrument Rack device that can show chains |
| `is_showing_chains` | bool | R/W | Yes | Instrument Rack chain visibility in Session View |
| `is_part_of_selection` | bool | R | No | Track selection status |

---

## Methods

### `stop_all_clips()`
Stops all playing and fired clips in track.
```python
track.stop_all_clips()
```

### `create_audio_clip(file_path, position)`
Creates an audio clip referencing the specified file at the given arrangement position.

**Parameters:**
- `file_path` (symbol): Absolute path to a valid audio file
- `position` (float): Position in beats (range: 0.0 to 1576800)

**Constraints:** Fails if track is non-audio, frozen, or recording.

```python
track.create_audio_clip("/path/to/audio.wav", 0.0)
```

### `create_midi_clip(start_time, length)`
Creates an empty MIDI clip in the arrangement view.

**Parameters:**
- `start_time` (float): Position in beats (range: 0.0 to 1576800)
- `length` (float): Duration in beats

**Constraints:** Fails if track is non-MIDI, frozen, or recording.

```python
track.create_midi_clip(0.0, 4.0)  # 4-beat clip at beginning
```

### `create_take_lane()`
Creates a take lane for the track.
```python
track.create_take_lane()
```

### `delete_clip(clip)`
Removes the specified clip from the track.
```python
track.delete_clip(clip)
```

### `delete_device(index)`
Removes the device at the specified index.

**Parameters:**
- `index` (int): Index of the device to remove

```python
track.delete_device(0)  # Remove first device
```

### `insert_device(device_name, target_index=None)`
*Available since Live 12.3*

Inserts a native Live device at the specified index or at the end of the device chain.

**Parameters:**
- `device_name` (symbol): Name of the native Live device to insert
- `target_index` (int, optional): Index at which to insert the device; if omitted, device is added at the end

```python
track.insert_device("Auto Filter")
track.insert_device("Compressor", 0)  # Insert at beginning
```

### `duplicate_clip_slot(index)`
Works like 'Duplicate' in the clip's context menu.

**Parameters:**
- `index` (int): Index of the clip slot to duplicate

```python
track.duplicate_clip_slot(0)
```

### `duplicate_clip_to_arrangement(clip, destination_time)`
Duplicates the specified clip to the arrangement at the given beat position.

**Parameters:**
- `clip`: The clip to duplicate
- `destination_time` (float): Destination position in beats

```python
track.duplicate_clip_to_arrangement(clip, 16.0)
```

### `jump_in_running_session_clip(beats)`
Modifies the playback position in the currently running Session clip by a relative amount.

**Parameters:**
- `beats` (float): Relative position adjustment in beats

```python
track.jump_in_running_session_clip(4.0)  # Jump forward 4 beats
```

---

## MixerDevice Class

The MixerDevice class represents a mixer device in Live. It provides access to volume, panning, and other DeviceParameter objects.

**Canonical Path:** `live_set tracks N mixer_device`

### Children

| Child | Type | Access | Observable | Description |
|-------|------|--------|------------|-------------|
| `volume` | DeviceParameter | R | No | Volume control |
| `panning` | DeviceParameter | R | No | Pan control |
| `left_split_stereo` | DeviceParameter | R | No | Track's Left Split Stereo Pan Parameter |
| `right_split_stereo` | DeviceParameter | R | No | Track's Right Split Stereo Pan Parameter |
| `track_activator` | DeviceParameter | R | No | Track on/off control |
| `sends` | list[DeviceParameter] | R | Yes | One send per return track |

### Master Track Only Children

| Child | Type | Access | Description |
|-------|------|--------|-------------|
| `crossfader` | DeviceParameter | R | Crossfader control |
| `cue_volume` | DeviceParameter | R | Cue volume control |
| `song_tempo` | DeviceParameter | R | Tempo control (as DeviceParameter) |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `crossfade_assign` | int | R/W | Yes | 0=A, 1=none, 2=B (not available on master track) |
| `panning_mode` | int | R/W | Yes | 0=Stereo, 1=Split Stereo |

### Example: Adjust Volume
```python
mixer = track.mixer_device
mixer.volume.value = 0.85  # Set volume (0.0 to 1.0)
print(mixer.volume.str_for_value(mixer.volume.value))  # Print dB value
```

### Example: Set Pan
```python
mixer = track.mixer_device
mixer.panning.value = 0.0  # Center
mixer.panning.value = -1.0  # Full left
mixer.panning.value = 1.0   # Full right
```

### Example: Adjust Sends
```python
mixer = track.mixer_device
for i, send in enumerate(mixer.sends):
    print(f"Send {i}: {send.value}")
    send.value = 0.5  # Set send level
```

---

## Track.View Class

Represents the view aspects of a track.

**Canonical Path:** `live_set tracks N view`

### Children

| Child | Type | Access | Observable | Description |
|-------|------|--------|------------|-------------|
| `selected_device` | Device | R | Yes | The selected device or the first selected device (in case of multi/group selection) |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `device_insert_mode` | int | R/W | Yes | Determines where a device will be inserted when loaded from the browser: 0=add device at end, 1=add device left of selected, 2=add device right of selected |
| `is_collapsed` | bool | R/W | Yes | In Arrangement View: 1=track collapsed, 0=track opened |

### Methods

#### `select_instrument()` -> bool
Selects the track's instrument or first device, makes it visible and focuses on it. Returns 0 if no devices available for selection.
```python
success = track.view.select_instrument()
```

---

## TakeLane Class

This class represents a take lane in Live. Tracks in Live can have take lanes in Arrangement View, which are used for comping.

**Canonical Path:** `live_set tracks N take_lanes M`

### Children

| Child | Type | Access | Observable | Description |
|-------|------|--------|------------|-------------|
| `arrangement_clips` | list[Clip] | R | Yes | The list of this take lane's Arrangement View clip IDs |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R/W | Yes | The name as shown in the take lane header |

### Methods

#### `create_audio_clip(file_path, start_time)`
Creates an audio clip from a valid audio file at the specified arrangement position.

**Parameters:**
- `file_path` (symbol): Absolute path to a valid audio file
- `start_time` (float): Position in beats (range: 0.0 to 1576800)

**Constraints:** Fails if track is non-audio, frozen, or recording.

#### `create_midi_clip(start_time, length)`
Creates an empty MIDI clip with the specified length at the given arrangement position.

**Parameters:**
- `start_time` (float): Position in beats (range: 0.0 to 1576800)
- `length` (float): Duration in beats

**Constraints:** Fails if track is non-MIDI, frozen, or recording.
