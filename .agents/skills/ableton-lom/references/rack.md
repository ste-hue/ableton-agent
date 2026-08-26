# Rack Device Classes Reference

This document covers Instrument Racks, Audio Effect Racks, MIDI Effect Racks, and Drum Racks.

## Table of Contents
- [RackDevice Class](#rackdevice-class)
- [RackDevice.View Class](#rackdeviceview-class)
- [Chain Class](#chain-class)
- [ChainMixerDevice Class](#chainmixerdevice-class)
- [DrumPad Class](#drumpad-class)
- [DrumChain Class](#drumchain-class)
- [Common Patterns](#common-patterns)

---

## RackDevice Class

This class represents a Live Rack Device. A RackDevice is a type of Device, inheriting all Device properties and methods.

**Canonical Path:** `live_set tracks N devices M` (when device is a Rack)

### Inherited from Device

RackDevice inherits all properties and methods from the Device class:

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `can_have_chains` | bool | R | No | Always 1 for Rack devices |
| `can_have_drum_pads` | bool | R | No | 1 for Drum Racks, 0 otherwise |
| `class_display_name` | symbol | R | No | Original device name (e.g., "Instrument Rack") |
| `class_name` | symbol | R | No | Live device type identifier |
| `is_active` | bool | R | Yes | 0 if device or enclosing Rack is off |
| `name` | symbol | R/W | Yes | Title bar display string |
| `type` | int | R | No | Device classification: 0=undefined, 1=instrument, 2=audio_effect, 4=midi_effect |
| `latency_in_samples` | int | R | Yes | Device latency measured in samples |
| `latency_in_ms` | float | R | Yes | Device latency measured in milliseconds |
| `can_compare_ab` | bool | R | No | Supports AB Compare feature (since 12.3) |
| `is_using_compare_preset_b` | bool | R/W | Yes | AB preset B status (since 12.3) |

**Inherited Children:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `parameters` | list[DeviceParameter] | R | Yes | Only automatable parameters are accessible |
| `view` | RackDevice.View | R | No | View aspects of the device |

**Inherited Methods:**

- `store_chosen_bank(script_index, bank_index)` - Hardware control surface related
- `save_preset_to_compare_ab_slot()` - Saves state to alternate AB slot (since 12.3)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `can_show_chains` | bool | R | No | 1 = the Rack contains an instrument device that is capable of showing its chains in Session View |
| `has_drum_pads` | bool | R | Yes | 1 = the device is a Drum Rack with pads. A nested Drum Rack is a Drum Rack without pads. Only available for Drum Racks |
| `has_macro_mappings` | bool | R | Yes | 1 = any of a Rack's Macros are mapped to a parameter |
| `is_showing_chains` | bool | R/W | Yes | 1 = the Rack contains an instrument device that is showing its chains in Session View |
| `selected_variation_index` | int | R/W | No | Get/set currently selected variation (since 11.0) |
| `variation_count` | int | R | Yes | Number of stored macro variations (since 11.0) |
| `visible_macro_count` | int | R | Yes | The number of currently visible macros |

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `chain_selector` | DeviceParameter | R | No | Convenience accessor for the Rack's chain selector |
| `chains` | list[Chain] | R | Yes | The Rack's chains |
| `drum_pads` | list[DrumPad] | R | Yes | All 128 DrumPads for topmost Drum Rack; inner Drum Racks return a list of 0 entries |
| `return_chains` | list[Chain] | R | Yes | The Rack's return chains |
| `visible_drum_pads` | list[DrumPad] | R | Yes | All 16 visible DrumPads for topmost Drum Rack; inner Drum Racks return a list of 0 entries |

### Methods

#### `copy_pad(source_index, destination_index)`
Copies all content of a Drum Rack pad from a source pad to a destination pad. The source_index and destination_index refer to pad indices inside a Drum Rack.
- **Parameters:**
  - `source_index` (int): Index of the source pad
  - `destination_index` (int): Index of the destination pad
```python
rack.copy_pad(36, 48)  # Copy pad at index 36 to pad at index 48
```

#### `add_macro()` (since 11.0)
Increases visible macro controls.
```python
rack.add_macro()
```

#### `remove_macro()` (since 11.0)
Decreases visible macro controls.
```python
rack.remove_macro()
```

#### `randomize_macros()` (since 11.0)
Randomizes eligible macro control values.
```python
rack.randomize_macros()
```

#### `store_variation()` (since 11.0)
Stores a new variation snapshot of mapped macros.
```python
rack.store_variation()
```

#### `recall_selected_variation()` (since 11.0)
Activates the currently selected variation.
```python
rack.selected_variation_index = 2
rack.recall_selected_variation()
```

#### `recall_last_used_variation()` (since 11.0)
Activates the most recently recalled variation.
```python
rack.recall_last_used_variation()
```

#### `delete_selected_variation()` (since 11.0)
Removes the selected variation. No-op if none selected.
```python
rack.delete_selected_variation()
```

#### `insert_chain(index)` (since 12.3)
Inserts a new chain at the specified index, or at the end if index not specified. For Drum Racks, new chains initialize with "All Notes" setting.
- **Parameters:**
  - `index` (int, optional): Position to insert the chain. Defaults to end of list.
```python
rack.insert_chain(0)   # Insert at beginning
rack.insert_chain(-1)  # Insert at end
rack.insert_chain()    # Insert at end (default)
```

---

## RackDevice.View Class

Represents the view aspects of a Rack Device. A RackDevice.View is a type of Device.View, inheriting all parent properties.

**Canonical Path:** `live_set tracks N devices M view` (when device is a Rack)

### Inherited from Device.View

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_collapsed` | bool | R/W | Yes | 1 = the device is shown collapsed in the device chain |

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_chain` | Chain | R | Yes | Currently selected chain within the rack device |
| `selected_drum_pad` | DrumPad | R | Yes | Currently selected Drum Rack pad. Only available for Drum Racks |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `drum_pads_scroll_position` | int | R | Yes | Lowest row of pads visible, range: 0 - 28. Only available for Drum Racks |
| `is_showing_chain_devices` | bool | R | Yes | 1 = the devices in the currently selected chain are visible |

### Example
```python
rack_view = rack.view

# Get selected chain
selected = rack_view.selected_chain
print(f"Selected chain: {selected.name}")

# For Drum Racks, get selected pad
if rack.has_drum_pads:
    pad = rack_view.selected_drum_pad
    print(f"Selected pad: {pad.name} (note {pad.note})")
    print(f"Scroll position: {rack_view.drum_pads_scroll_position}")
```

---

## Chain Class

This class represents a group device chain in Live.

**Canonical Paths:**
- `live_set tracks N devices M chains L`
- `live_set tracks N devices M return_chains L`
- `live_set tracks N devices M chains L devices K chains P ...`
- `live_set tracks N devices M return_chains L devices K chains P ...`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `color` | int | R/W | Yes | The RGB value of the chain's color in the form 0x00rrggbb or (2^16 * red) + (2^8 * green) + blue, where each color component is 0-255. Nearest color from chooser applied when setting |
| `color_index` | long | R/W | Yes | Numerical identifier for the chain's color assignment |
| `has_audio_input` | bool | R | No | Indicates audio input capability presence |
| `has_audio_output` | bool | R | No | Indicates audio output capability presence |
| `has_midi_input` | bool | R | No | Indicates MIDI input capability presence |
| `has_midi_output` | bool | R | No | Indicates MIDI output capability presence |
| `is_auto_colored` | bool | R/W | Yes | 1 = the chain will always have the color of the containing track or chain |
| `mute` | bool | R/W | Yes | 1 = muted (Chain Activator off) |
| `muted_via_solo` | bool | R | Yes | 1 = muted due to another chain being soloed |
| `name` | unicode | R/W | Yes | Text identifier for the chain |
| `solo` | bool | R/W | Yes | 1 = soloed (Solo switch on). Does not automatically turn Solo off in other chains |

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `devices` | list[Device] | R | Yes | Devices in this chain |
| `mixer_device` | ChainMixerDevice | R | No | Chain's mixer device controls |

### Methods

#### `delete_device(index)`
Removes device at specified position within the chain.
- **Parameters:**
  - `index` (int): Position of the device to remove
```python
chain.delete_device(0)
```

#### `insert_device(device_name, target_index)` (since 12.3)
Attempts device insertion by name at target position (or end if unspecified). Only native Live devices are supported (not Max for Live or plugins). Throws error if device name is invalid. Respects device type constraints (e.g., MIDI effects cannot follow instruments).
- **Parameters:**
  - `device_name` (symbol): Name of the native Live device to insert
  - `target_index` (int, optional): Position to insert the device. Defaults to end of chain.
```python
chain.insert_device("Compressor")
chain.insert_device("Auto Filter", 0)
```

---

## ChainMixerDevice Class

This class represents a chain's mixer device in Live.

**Canonical Paths:**
- `live_set tracks N devices M chains L mixer_device`
- `live_set tracks N devices M return_chains L mixer_device`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `chain_activator` | DeviceParameter | R | No | Activation control for the chain |
| `panning` | DeviceParameter | R | No | Pan control (in Audio Effect Racks and Instrument Racks only) |
| `sends` | list[DeviceParameter] | R | Yes | Send controls (in Audio Effect Racks and Instrument Racks only). For Drum Racks, this returns an empty list |
| `volume` | DeviceParameter | R | No | Volume control (in Audio Effect Racks and Instrument Racks only) |

### Example
```python
chain = rack.chains[0]
mixer = chain.mixer_device

# Adjust volume (Audio/Instrument Racks only)
mixer.volume.value = 0.8

# Adjust pan (Audio/Instrument Racks only)
mixer.panning.value = -0.5  # Slightly left

# Toggle chain activator
mixer.chain_activator.value = 1.0  # On
mixer.chain_activator.value = 0.0  # Off

# Adjust sends (Audio/Instrument Racks only)
for send in mixer.sends:
    send.value = 0.25
```

---

## DrumPad Class

This class represents a Drum Rack pad in Live.

**Canonical Path:** `live_set tracks N devices M drum_pads L`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R | Yes | Pad name |
| `note` | int | R | No | MIDI note number (0-127) |
| `mute` | bool | R/W | Yes | 1 = muted |
| `solo` | bool | R/W | Yes | 1 = soloed (Solo switch on). Does not automatically turn Solo off in other chains |

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `chains` | list[Chain] | R | Yes | Chains within the pad |

### Methods

#### `delete_all_chains()`
Removes all chains from the drum pad.
```python
drum_pad.delete_all_chains()
```

### Example: Iterate Drum Pads
```python
drum_rack = track.devices[0]
if drum_rack.has_drum_pads:
    for pad in drum_rack.drum_pads:
        if pad.chains:  # Pad has content
            print(f"Note {pad.note}: {pad.name}")
```

### Example: Work with Visible Pads
```python
# visible_drum_pads gives the 16 currently visible pads
for pad in drum_rack.visible_drum_pads:
    print(f"Visible pad: {pad.name} (note {pad.note})")
```

---

## DrumChain Class

This class represents a Drum Rack device chain in Live. A DrumChain is a type of Chain, inheriting all Chain properties and methods.

**Canonical Path:** `live_set tracks N devices M drum_pads L chains K`

### Additional Properties (beyond Chain)

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `in_note` | int | R/W | Yes | Get/set the MIDI note that will trigger this chain. The value -1 corresponds to the "All Notes" setting in the UI (since 12.3) |
| `out_note` | int | R/W | Yes | Get/set the MIDI note sent to the devices in the chain |
| `choke_group` | int | R/W | Yes | Get/set the chain's choke group |

### Example: Set Choke Group
```python
# Make hi-hats choke each other
for pad in drum_rack.drum_pads:
    if "Hat" in pad.name:
        for chain in pad.chains:
            chain.choke_group = 1
```

### Example: Configure Note Routing
```python
# Set up note routing for a drum chain
drum_chain = drum_pad.chains[0]

# Set input note (-1 for "All Notes")
drum_chain.in_note = -1

# Set output note
drum_chain.out_note = 60  # C3
```

---

## Common Patterns

### Create and Configure a Rack
```python
def get_rack_info(rack):
    """Get comprehensive rack information."""
    info = {
        "name": rack.name,
        "class_name": rack.class_display_name,
        "is_drum_rack": rack.has_drum_pads,
        "chain_count": len(rack.chains),
        "return_chain_count": len(rack.return_chains),
        "macro_count": rack.visible_macro_count,
        "has_macro_mappings": rack.has_macro_mappings,
        "variation_count": rack.variation_count,
        "chains": []
    }

    for chain in rack.chains:
        chain_info = {
            "name": chain.name,
            "color": chain.color,
            "mute": chain.mute,
            "solo": chain.solo,
            "device_count": len(chain.devices),
            "devices": [d.name for d in chain.devices]
        }
        info["chains"].append(chain_info)

    return info
```

### Work with Drum Rack Pads
```python
def find_pad_by_note(drum_rack, note):
    """Find a drum pad by MIDI note number."""
    for pad in drum_rack.drum_pads:
        if pad.note == note:
            return pad
    return None

def get_occupied_pads(drum_rack):
    """Get all pads that have content."""
    return [pad for pad in drum_rack.drum_pads if pad.chains]

# Usage
kick_pad = find_pad_by_note(drum_rack, 36)  # C1
if kick_pad:
    kick_pad.solo = True
```

### Manage Macro Variations
```python
def save_and_recall_macros(rack):
    """Example of working with macro variations."""
    # Store current state
    rack.store_variation()
    print(f"Stored variation. Total: {rack.variation_count}")

    # Randomize macros
    rack.randomize_macros()

    # Store randomized state
    rack.store_variation()

    # Recall first variation
    rack.selected_variation_index = 0
    rack.recall_selected_variation()
```

### Navigate Nested Racks
```python
def find_all_devices_recursive(device, depth=0):
    """Recursively find all devices including those in racks."""
    devices = []

    devices.append({
        "depth": depth,
        "name": device.name,
        "class": device.class_display_name
    })

    if device.can_have_chains:
        for chain in device.chains:
            for nested_device in chain.devices:
                devices.extend(find_all_devices_recursive(nested_device, depth + 1))

    return devices

# Usage
for track in song.tracks:
    for device in track.devices:
        all_devices = find_all_devices_recursive(device)
        for d in all_devices:
            print(f"{'  ' * d['depth']}{d['name']} ({d['class']})")
```

### Copy Drum Pad with Sample
```python
def duplicate_drum_sound(rack, source_note, dest_note):
    """Copy a drum pad's content to another pad."""
    # Find source and destination indices
    source_idx = None
    dest_idx = None

    for i, pad in enumerate(rack.drum_pads):
        if pad.note == source_note:
            source_idx = i
        if pad.note == dest_note:
            dest_idx = i

    if source_idx is not None and dest_idx is not None:
        rack.copy_pad(source_idx, dest_idx)
        return True
    return False

# Usage
duplicate_drum_sound(drum_rack, 36, 48)  # Copy C1 to C2
```

### Work with Chain Selection
```python
def select_and_show_chain(rack, chain_index):
    """Select a chain and show its devices."""
    if chain_index < len(rack.chains):
        # Access view to see selection state
        view = rack.view

        # Check if chain devices are visible
        if view.is_showing_chain_devices:
            selected = view.selected_chain
            print(f"Currently selected: {selected.name}")

        # For Drum Racks, check selected pad
        if rack.has_drum_pads:
            pad = view.selected_drum_pad
            print(f"Selected pad: {pad.name}")
            print(f"Scroll position: {view.drum_pads_scroll_position}")
```

### Insert New Chain with Device (since 12.3)
```python
def add_chain_with_device(rack, device_name, chain_name="New Chain"):
    """Add a new chain to a rack with a device."""
    # Insert chain at end
    rack.insert_chain()

    # Get the newly created chain (last in list)
    new_chain = rack.chains[-1]
    new_chain.name = chain_name

    # Insert a device into the chain
    new_chain.insert_device(device_name)

    return new_chain

# Usage
new_chain = add_chain_with_device(rack, "Compressor", "Compressed Chain")
```
