# Control Surface Reference

This document covers the ControlSurface class for interacting with hardware controllers and control surfaces in Ableton Live.

## Table of Contents
- [ControlSurface Class](#controlsurface-class)
- [Accessing Control Surfaces](#accessing-control-surfaces)
- [Common Patterns](#common-patterns)

---

## ControlSurface Class

The ControlSurface class represents a software layer between the Live API and Max for Live, enabling interaction with hardware control surfaces (Push, Launchpad, etc.) and their individual controls. Individual controls on the surface can be grabbed and released via Max for Live to obtain and give back exclusive control.

There is also a dedicated MaxForLive control surface that allows developers to set up entirely custom control surfaces by adding and grabbing arbitrary controls through the `register_midi_control` function.

**Canonical Path:** `control_surfaces N`

A ControlSurface can be reached either directly by the root path `control_surfaces N` (where N is the index) or by getting it from the `control_surfaces` list on the Application object.

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `pad_layout` | symbol | R | Yes | The active pad layout. On Push 2 and 3, the layout can be changed with the Note and Session buttons. Which variants are selectable with the Layout button depends on the loaded instrument. |

#### pad_layout Values

The `pad_layout` property returns one of the following symbols depending on the current mode:

**Melodic Mode** (when the device chain is empty or an Instrument is loaded):
| Symbol | Description |
|--------|-------------|
| `note.melodic.64_notes` | 64 Notes layout |
| `note.melodic.64_notes_and_macro_variations` | 64 Notes + Macro Variations layout |
| `note.melodic.sequencer` | Sequencer layout |
| `note.melodic.sequencer_and_32_notes` | Sequencer + 32 Notes layout |

**Drums Mode** (when a Drum Rack is loaded):
| Symbol | Description |
|--------|-------------|
| `note.drums.macro_variations` | Macro Variations layout |
| `note.drums.64_pads` | 64 Pads layout |
| `note.drums.loop_selector` | Loop Selector layout |
| `note.drums.16_velocities` | 16 Velocities layout |
| `note.drums.16_pitches` | 16 Pitches layout |

**Session Mode** (when the Session button was pressed):
| Symbol | Description |
|--------|-------------|
| `session` | Session view is active |

### Methods

#### `get_control(name)`
Returns the control with the given name.

**Parameters:**
- `name` (symbol): The name of the control to retrieve

**Returns:** Control object with the specified name

```python
control = surface.get_control("Session_Button")
```

#### `get_control_names()`
Returns the list of all control names.

**Returns:** list of symbols (control names)

```python
names = surface.get_control_names()
for name in names:
    print(name)
```

#### `grab_control(control)`
Take ownership of the control. This releases all standard functionality of the control, so that it can be used exclusively via Max for Live.

**Parameters:**
- `control` (control object): The control object to grab (obtained from `get_control()`)

```python
control = surface.get_control("Session_Button")
surface.grab_control(control)
# Control is now exclusive to your Max for Live device
```

#### `release_control(control)`
Re-establishes the standard functionality for the control.

**Parameters:**
- `control` (control object): The control object to release

```python
control = surface.get_control("Session_Button")
surface.release_control(control)
# Control resumes normal behavior
```

#### `grab_midi()`
Forward MIDI messages received by the control surface script from the control surface to Max for Live.

**Note:** The control surface script will only receive those channel messages from Live's engine that it explicitly requests. Real-time messages (like Push's pads in Note mode) may bypass the script entirely. For track message handling, consider using objects like `midiin` rather than relying solely on the API object.

```python
surface.grab_midi()
# All MIDI from this surface now goes to Max for Live
```

#### `release_midi()`
Stop forwarding MIDI messages received from the control surface to Max for Live.

```python
surface.release_midi()
# Surface resumes normal operation
```

#### `send_midi(midi_message)`
Send midi_message to the control surface.

**Parameters:**
- `midi_message` (list of int): The MIDI message bytes to send

```python
# Send Note On: channel 1, note 60, velocity 127
surface.send_midi((144, 60, 127))

# Send CC: channel 1, CC 10, value 64
surface.send_midi((176, 10, 64))
```

#### `send_receive_sysex(sysex_message, timeout)`
Send sysex_message to the control surface and await a response. Default timeout value is 0.2.

**Parameters:**
- `sysex_message` (list of int): The SysEx message bytes to send
- `timeout` (symbol, int): Timeout in seconds to wait for a response. Default is 0.2.

```python
# Query device identity
sysex = (0xF0, 0x7E, 0x00, 0x06, 0x01, 0xF7)
response = surface.send_receive_sysex(sysex)

# With custom timeout
response = surface.send_receive_sysex(sysex, timeout=0.5)
```

#### `register_midi_control(name, status, number)`
(MaxForLive control surface only) Register a MIDI control defined by status and number. Supported status codes are 144 (note on), 176 (continuous control) and 224 (pitchbend). Returns the LOM ID associated with the control.

**Parameters:**
- `name` (symbol): The name to assign to the control
- `status` (int): MIDI status byte (144 = note on, 176 = continuous control, 224 = pitchbend)
- `number` (int): MIDI note number or CC number

**Returns:** LOM ID for the registered control

```python
# Register a button on note 36
surface.register_midi_control("MyButton", 144, 36)

# Register a knob on CC 21
surface.register_midi_control("MyKnob", 176, 21)

# Register pitchbend control
surface.register_midi_control("Pitchbend", 224, 0)
```

---

## Accessing Control Surfaces

Control surfaces are accessed through the Application object's `control_surfaces` property.

### Application.control_surfaces

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `control_surfaces` | list of ControlSurface | R | Yes | A list of the control surfaces currently selected in Live's Preferences. If None is selected in any of the slots or the script is inactive (e.g. when Push2 is selected, but no Push is connected), id 0 will be returned at those indices. |

**Canonical Path:** `live_app` (for Application)

```python
# Access via Application
app = Live.Application.get_application()
surfaces = app.control_surfaces

# Access specific surface by index
surface = app.control_surfaces[0]

# Or via canonical path
# control_surfaces 0
```

---

## Common Patterns

### Grab and Release a Control
```python
def use_control_temporarily(surface, control_name, callback):
    """Grab a control, use it, then release."""
    control = surface.get_control(control_name)
    if control:
        surface.grab_control(control)
        try:
            callback(control)
        finally:
            surface.release_control(control)
```

### List All Available Controls
```python
def list_surface_controls(surface):
    """Print all available controls on a surface."""
    names = surface.get_control_names()
    for name in names:
        print(f"Control: {name}")
    return names
```

### Send MIDI Note with Velocity
```python
def send_note(surface, note, velocity, channel=0):
    """Send a note on/off message to the surface."""
    status = 144 + channel  # Note On
    surface.send_midi((status, note, velocity))

# Light up pad at note 36 with velocity 127
send_note(surface, 36, 127)

# Turn off the pad
send_note(surface, 36, 0)
```

### Send CC Message
```python
def send_cc(surface, cc_number, value, channel=0):
    """Send a CC message to the surface."""
    status = 176 + channel  # CC
    surface.send_midi((status, cc_number, value))

# Set CC 10 (pan) to center
send_cc(surface, 10, 64)
```

### Grab Full MIDI Control
```python
class SurfaceMidiHandler:
    """Handle MIDI from a grabbed control surface."""

    def __init__(self, surface):
        self.surface = surface
        self.active = False

    def start(self):
        """Grab all MIDI from the surface."""
        self.surface.grab_midi()
        self.active = True

    def stop(self):
        """Release MIDI back to the surface."""
        self.surface.release_midi()
        self.active = False

    def send(self, status, data1, data2):
        """Send a MIDI message to the surface."""
        if self.active:
            self.surface.send_midi((status, data1, data2))
```

### Register Custom MIDI Controls (MaxForLive Surface)
```python
def setup_custom_controls(surface):
    """Register custom MIDI controls for MaxForLive surface."""
    # Register note buttons (drum pads)
    for i in range(16):
        note = 36 + i
        surface.register_midi_control(f"Pad_{i}", 144, note)

    # Register CC knobs
    for i in range(8):
        cc = 21 + i
        surface.register_midi_control(f"Knob_{i}", 176, cc)

    # Register pitchbend
    surface.register_midi_control("Pitchbend", 224, 0)
```

### Send SysEx Identity Request
```python
def query_device_identity(surface):
    """Send a Universal SysEx identity request."""
    identity_request = (0xF0, 0x7E, 0x00, 0x06, 0x01, 0xF7)
    response = surface.send_receive_sysex(identity_request, timeout=0.5)
    return response
```

### Control Surface Context Manager
```python
class GrabbedControl:
    """Context manager for temporarily grabbing a control."""

    def __init__(self, surface, control_name):
        self.surface = surface
        self.control_name = control_name
        self.control = None

    def __enter__(self):
        self.control = self.surface.get_control(self.control_name)
        if self.control:
            self.surface.grab_control(self.control)
        return self.control

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.control:
            self.surface.release_control(self.control)
        return False

# Usage
with GrabbedControl(surface, "Session_Button") as button:
    if button:
        # Button is grabbed, do something
        pass
# Button is automatically released
```

### Iterate Over All Control Surfaces
```python
def find_surface_by_type(app, surface_type):
    """Find a control surface by type name."""
    for i, surface in enumerate(app.control_surfaces):
        if surface and surface_type.lower() in str(type(surface)).lower():
            return surface, i
    return None, -1

# Find Push
push, index = find_surface_by_type(app, "Push")
if push:
    print(f"Found Push at index {index}")
```

### Check for Disconnected Surfaces
```python
def get_active_surfaces(app):
    """Get only active (connected) control surfaces."""
    active = []
    for i, surface in enumerate(app.control_surfaces):
        # Disconnected surfaces return id 0
        if surface and hasattr(surface, '_live_ptr') and surface._live_ptr != 0:
            active.append((i, surface))
    return active
```

### Monitor Pad Layout Changes (Push)
```python
def on_pad_layout_changed():
    """Callback when pad layout changes on Push."""
    layout = surface.pad_layout
    print(f"Pad layout changed to: {layout}")

    if layout == "session":
        print("Session mode active")
    elif layout.startswith("note.melodic"):
        print("Melodic mode active")
    elif layout.startswith("note.drums"):
        print("Drums mode active")

# Add listener for pad_layout changes
surface.add_pad_layout_listener(on_pad_layout_changed)
```
