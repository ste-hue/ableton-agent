# View Classes Reference

View classes provide access to UI state and navigation within Live.

## Table of Contents
- [Application Class](#application-class)
- [Application.View Class](#applicationview-class)
- [Song.View Class](#songview-class)
- [Track.View Class](#trackview-class)
- [Clip.View Class](#clipview-class)
- [Device.View Class](#deviceview-class)
- [RackDevice.View Class](#rackdeviceview-class)
- [Eq8Device.View Class](#eq8deviceview-class)
- [SimplerDevice.View Class](#simplerdeviceview-class)
- [Common Patterns](#common-patterns)

---

## Application Class

Access via `self.application()` in a ControlSurface.

**Canonical Path:** `live_app`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `current_dialog_button_count` | int | R | No | The number of buttons in the current message box |
| `current_dialog_message` | symbol | R | No | The text of the current message box (empty if no message box is currently shown) |
| `open_dialog_count` | int | R | Yes | The number of dialog boxes shown |
| `average_process_usage` | float | R | Yes | Reports Live's average CPU load (audio processing load, not overall CPU usage) |
| `peak_process_usage` | float | R | Yes | Reports Live's peak CPU load (audio processing load, not overall CPU usage) |

### Methods

#### `get_document()` -> Song
Returns the current Live Set.
```python
song = app.get_document()
```

#### `get_major_version()` -> int
Returns the major version number (e.g., the 12 in Live 12.1.2).
```python
major = app.get_major_version()  # e.g., 12
```

#### `get_minor_version()` -> int
Returns the minor version number (e.g., the 1 in Live 12.1.2).
```python
minor = app.get_minor_version()  # e.g., 1
```

#### `get_bugfix_version()` -> int
Returns the bugfix version number (e.g., the 2 in Live 12.1.2).
```python
bugfix = app.get_bugfix_version()  # e.g., 2
```

#### `get_version_string()` -> str
Returns the version string (e.g., "12.1.2").
```python
version = app.get_version_string()  # e.g., "12.1.2"
```

#### `press_current_dialog_button(index)`
Press the button with the given index in the current dialog box.
```python
if app.open_dialog_count > 0:
    app.press_current_dialog_button(0)  # Press first button
```

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `view` | Application.View | R | No | View aspects of the application |
| `control_surfaces` | list[ControlSurface] | R | Yes | A list of the control surfaces currently selected in Live's Preferences. Returns id 0 if none selected or script inactive. |

---

## Application.View Class

Access via `self.application().view`.

**Canonical Path:** `live_app view`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `browse_mode` | bool | R | Yes | Indicates whether Hot-Swap Mode is active for any target (1 = active) |
| `focused_document_view` | unicode | R | Yes | The name of the currently visible view in the focused Live window ("Session" or "Arranger") |

### Methods

#### `available_main_views()` -> list[symbol]
Returns a constant list of view names to be used as an argument when calling other functions: Browser, Arranger, Session, Detail, Detail/Clip, Detail/DeviceChain.
```python
views = app.view.available_main_views()
# Returns: ['Browser', 'Arranger', 'Session', 'Detail', 'Detail/Clip', 'Detail/DeviceChain']
```

#### `show_view(view_name)`
Displays the named view.
```python
app.view.show_view("Session")
app.view.show_view("Arranger")
app.view.show_view("Browser")
app.view.show_view("Detail")
app.view.show_view("Detail/Clip")
app.view.show_view("Detail/DeviceChain")
```

#### `hide_view(view_name)`
Hides the named view. You can also pass an empty view_name `" "` which refers to the Arrangement or Session View (whichever is visible in the main window).
```python
app.view.hide_view("Browser")
app.view.hide_view(" ")  # Hide current main view (Session or Arranger)
```

#### `focus_view(view_name)`
Shows the named view and focuses on it. You can also pass an empty view_name `" "` which refers to the Arrangement or Session View (whichever is visible in the main window).
```python
app.view.focus_view("Session")
app.view.focus_view(" ")  # Focus current main view
```

#### `is_view_visible(view_name)` -> bool
Reports whether a specified view is currently visible.
```python
if app.view.is_view_visible("Browser"):
    app.view.hide_view("Browser")
```

#### `toggle_browse()`
Displays the device chain and the browser and activates Hot-Swap Mode for the selected device. Calling this function again deactivates Hot-Swap Mode.
```python
app.view.toggle_browse()
```

#### `scroll_view(direction, view_name, modifier_pressed)`
Scrolls the specified view.

**Parameters:**
- `direction` (int): 0=up, 1=down, 2=left, 3=right
- `view_name` (str): One of "Arranger", "Browser", "Session", "Detail/DeviceChain"
- `modifier_pressed` (bool): Modifier key state

**Modifier Behavior (Arranger only):** When modifier_pressed is True with left/right directions, the selected time region's size adjusts instead of moving the cursor position.

**Note:** Only the Arranger, Browser, Session, and Detail/DeviceChain views can be scrolled. Not all views support scrolling in every direction.

```python
app.view.scroll_view(1, "Session", False)  # Scroll down
app.view.scroll_view(3, "Arranger", False)  # Scroll right
app.view.scroll_view(2, "Browser", False)   # Scroll left
app.view.scroll_view(0, "Detail/DeviceChain", False)  # Scroll up
```

#### `zoom_view(direction, view_name, modifier_pressed)`
Zooms the Arrangement or Session views. Only the Arrangement and Session Views can be zoomed.

**Parameters:**
- `direction` (int): 0=up, 1=down, 2=left, 3=right
- `view_name` (str): "Arranger" or "Session"
- `modifier_pressed` (bool): Modifier key state

**Modifier Behavior (Arranger only):**
- With modifier + left/right: Modifies the selected time region's size
- With modifier + up/down: Changes only the highlighted track's height
- Without modifier + up/down: Changes the height of all tracks

**Session View:** For Session View, the behavior of zoom_view is identical to scroll_view.

```python
app.view.zoom_view(0, "Arranger", False)  # Zoom in vertical (all tracks)
app.view.zoom_view(2, "Arranger", False)  # Zoom in horizontal
app.view.zoom_view(1, "Arranger", True)   # Zoom out vertical (highlighted track only)
app.view.zoom_view(0, "Session", False)   # Zoom Session (same as scroll)
```

---

## Song.View Class

Access via `self.song().view` or `self._song.view`.

**Canonical Path:** `live_set view`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `draw_mode` | bool | R/W | Yes | Reflects the state of the envelope/automation Draw Mode Switch in the transport bar, as toggled with Cmd/Ctrl-B. 0 = breakpoint editing (shows arrow), 1 = drawing (shows pencil) |
| `follow_song` | bool | R/W | Yes | Reflects the state of the Follow switch in the transport bar as toggled with Cmd/Ctrl-F. 0 = don't follow playback position, 1 = follow playback position |

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `detail_clip` | Clip | R/W | Yes | The clip currently displayed in the Live application's Detail View |
| `highlighted_clip_slot` | ClipSlot | R/W | No | The slot highlighted in the Session View |
| `selected_chain` | Chain | R/W | Yes | The highlighted chain, or id 0 if none |
| `selected_parameter` | DeviceParameter | R | Yes | The selected parameter, or id 0 if none |
| `selected_scene` | Scene | R/W | Yes | The currently selected scene |
| `selected_track` | Track | R/W | Yes | The currently selected track |

### Methods

#### `select_device(device)`
Selects the given device object in its track. The track containing the device will not be shown automatically, and the device gets the appointed device (blue hand) only if its track is selected.
```python
device = track.devices[0]
song.view.select_device(device)
```

### Example: Navigate to Clip
```python
def show_clip_in_detail(song, track_idx, slot_idx):
    """Show a specific clip in Detail View."""
    track = song.tracks[track_idx]
    slot = track.clip_slots[slot_idx]

    if slot.has_clip:
        song.view.detail_clip = slot.clip
        # Optionally show the clip view
        app = self.application()
        app.view.show_view("Detail/Clip")
```

### Example: Select Track and Scene
```python
def select_cell(song, track_idx, scene_idx):
    """Select a specific cell in Session View."""
    song.view.selected_track = song.tracks[track_idx]
    song.view.selected_scene = song.scenes[scene_idx]
    song.view.highlighted_clip_slot = song.tracks[track_idx].clip_slots[scene_idx]
```

---

## Track.View Class

Access via `track.view`.

**Canonical Path:** `live_set tracks N view`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `device_insert_mode` | int | R/W | Yes | Determines where a device will be inserted when loaded from the browser. 0 = add device at the end, 1 = add device to the left of the selected device, 2 = add device to the right of the selected device |
| `is_collapsed` | bool | R/W | Yes | In Arrangement View: 1 = track collapsed, 0 = track opened |

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_device` | Device | R | Yes | The selected device or the first selected device (in case of multi/group selection) |

### Methods

#### `select_instrument()` -> bool
Selects track's instrument or first device, makes it visible and focuses on it. Returns 0 when no devices are available for selection.
```python
if track.view.select_instrument():
    self.log_message("Instrument selected")
else:
    self.log_message("No instrument on track")
```

---

## Clip.View Class

Access via `clip.view`.

**Canonical Path:** `live_set tracks N clip_slots M clip view`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `grid_quantization` | int | R/W | No | Get/set the grid quantization. Values correspond to RecordingQuantization enum |
| `grid_is_triplet` | bool | R/W | No | Get/set whether the clip is displayed with a triplet grid |

### Methods

#### `show_envelope()`
Show the Envelopes box in clip view.

#### `hide_envelope()`
Hide the Envelopes box.

#### `select_envelope_parameter(parameter)`
Select the specified device parameter in the Envelopes box.
```python
clip.view.select_envelope_parameter(device.parameters[0])
```

#### `show_loop()`
If the clip is visible in Live's Detail View, this function will make the current loop visible there.
```python
if clip == song.view.detail_clip:
    clip.view.show_loop()
```

---

## Device.View Class

Access via `device.view`.

**Canonical Paths:**
- `live_set tracks N devices M view`
- `live_set tracks N devices M chains L devices K view`
- `live_set tracks N devices M return_chains L devices K view`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_collapsed` | bool | R/W | Yes | 1 = the device is shown collapsed in the device chain |

```python
device.view.is_collapsed = True   # Collapse
device.view.is_collapsed = False  # Expand
```

---

## RackDevice.View Class

Access via `rack_device.view`.

**Inherits from:** Device.View

RackDevice.View extends Device.View with rack-specific properties.

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_collapsed` | bool | R/W | Yes | *(Inherited from Device.View)* 1 = the device is shown collapsed in the device chain |
| `drum_pads_scroll_position` | int | R/W | Yes | Lowest row of pads visible, range: 0-28. Only available for Drum Racks |
| `is_showing_chain_devices` | bool | R/W | Yes | 1 = the devices in the currently selected chain are visible |

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_drum_pad` | DrumPad | R/W | Yes | Currently selected Drum Rack pad. Only available for Drum Racks |
| `selected_chain` | Chain | R/W | Yes | Currently selected chain |

---

## Eq8Device.View Class

Access via `eq8_device.view`.

**Inherits from:** Device.View

**Canonical Path:** `live_set tracks N devices M view` (when device is EQ Eight)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_collapsed` | bool | R/W | Yes | *(Inherited from Device.View)* 1 = the device is shown collapsed in the device chain |
| `selected_band` | int | R/W | Yes | The index of the currently selected filter band |

### Example
```python
eq8 = track.devices[0]  # Assuming EQ Eight
eq8.view.selected_band = 3  # Select band 4 (0-indexed)
```

---

## SimplerDevice.View Class

Access via `simpler_device.view`.

**Inherits from:** Device.View

**Canonical Path:** `live_set tracks N devices M view` (when device is Simpler)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_collapsed` | bool | R/W | Yes | *(Inherited from Device.View)* 1 = the device is shown collapsed in the device chain |
| `selected_slice` | int | R/W | Yes | The currently selected slice, identified by its slice time |

### Example
```python
simpler = track.devices[0]  # Assuming Simpler in Slicing mode
simpler.view.selected_slice = 4  # Select slice by time value
```

---

## Common Patterns

### Toggle Session/Arrangement View
```python
def toggle_main_view(app):
    """Switch between Session and Arrangement views."""
    if app.view.focused_document_view == "Session":
        app.view.focus_view("Arranger")
    else:
        app.view.focus_view("Session")
```

### Show Device and Parameter
```python
def show_device_parameter(song, app, device, param_index):
    """Navigate to a specific device parameter."""
    # Select the device
    song.view.select_device(device)

    # Show device chain
    app.view.show_view("Detail/DeviceChain")

    # Expand device if collapsed
    device.view.is_collapsed = False
```

### Follow Selection
```python
def get_current_selection(song):
    """Get the current selection state."""
    return {
        "track": song.view.selected_track.name if song.view.selected_track else None,
        "scene": song.view.selected_scene.name if song.view.selected_scene else None,
        "device": song.view.selected_track.view.selected_device.name if song.view.selected_track and song.view.selected_track.view.selected_device else None,
        "clip": song.view.detail_clip.name if song.view.detail_clip else None
    }
```

### Session View Grid Navigation
```python
class SessionNavigator:
    """Navigate Session View grid."""

    def __init__(self, song, app):
        self.song = song
        self.app = app
        self.track_offset = 0
        self.scene_offset = 0

    def move_right(self):
        max_track = len(self.song.tracks) - 1
        if self.track_offset < max_track:
            self.track_offset += 1
            self._update_selection()

    def move_left(self):
        if self.track_offset > 0:
            self.track_offset -= 1
            self._update_selection()

    def move_down(self):
        max_scene = len(self.song.scenes) - 1
        if self.scene_offset < max_scene:
            self.scene_offset += 1
            self._update_selection()

    def move_up(self):
        if self.scene_offset > 0:
            self.scene_offset -= 1
            self._update_selection()

    def _update_selection(self):
        self.song.view.selected_track = self.song.tracks[self.track_offset]
        self.song.view.selected_scene = self.song.scenes[self.scene_offset]

    def launch_selected(self):
        track = self.song.tracks[self.track_offset]
        slot = track.clip_slots[self.scene_offset]
        slot.fire()
```

### View State Snapshot
```python
def save_view_state(song, app):
    """Save current view state for later restoration."""
    return {
        "focused_view": app.view.focused_document_view,
        "selected_track_idx": list(song.tracks).index(song.view.selected_track) if song.view.selected_track in song.tracks else None,
        "selected_scene_idx": list(song.scenes).index(song.view.selected_scene) if song.view.selected_scene else None,
        "detail_clip": song.view.detail_clip,
        "follow_song": song.view.follow_song,
        "draw_mode": song.view.draw_mode
    }

def restore_view_state(song, app, state):
    """Restore a previously saved view state."""
    if state["selected_track_idx"] is not None:
        song.view.selected_track = song.tracks[state["selected_track_idx"]]
    if state["selected_scene_idx"] is not None:
        song.view.selected_scene = song.scenes[state["selected_scene_idx"]]
    if state["detail_clip"]:
        song.view.detail_clip = state["detail_clip"]
    song.view.follow_song = state["follow_song"]
    song.view.draw_mode = state["draw_mode"]
    app.view.focus_view(state["focused_view"])
```

### Scroll and Zoom Direction Constants
```python
# Direction constants for scroll_view() and zoom_view()
DIRECTION_UP = 0
DIRECTION_DOWN = 1
DIRECTION_LEFT = 2
DIRECTION_RIGHT = 3

# Supported views for scroll_view()
SCROLLABLE_VIEWS = ["Arranger", "Browser", "Session", "Detail/DeviceChain"]

# Supported views for zoom_view()
ZOOMABLE_VIEWS = ["Arranger", "Session"]
```
