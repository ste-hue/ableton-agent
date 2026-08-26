# Device & DeviceParameter Reference

The Device class represents any MIDI or audio device in Live. This includes instruments, audio effects, MIDI effects, Racks, Max for Live devices, and third-party plugins.

**Canonical Path:** `live_set tracks N devices M`

## Table of Contents
- [Device Class](#device-class)
- [DeviceParameter Class](#deviceparameter-class)
- [Device.View Class](#deviceview-class)
- [DeviceIO Class](#deviceio-class)
- [Specialized Device Classes](#specialized-device-classes)
  - [PluginDevice](#plugindevice)
  - [MaxDevice](#maxdevice)
  - [RackDevice](#rackdevice)
  - [RackDevice.View](#rackdeviceview)
  - [SimplerDevice](#simplerdevice)
  - [SimplerDevice.View](#simplerdeviceview)
  - [WavetableDevice](#wavetabledevice)
  - [LooperDevice](#looperdevice)
  - [CompressorDevice](#compressordevice)
  - [Eq8Device](#eq8device)
  - [Eq8Device.View](#eq8deviceview)
  - [HybridReverbDevice](#hybridreverbdevice)
  - [DriftDevice](#driftdevice)
  - [MeldDevice](#melddevice)
  - [RoarDevice](#roardevice)
  - [ShifterDevice](#shifterdevice)
  - [SpectralResonatorDevice](#spectralresonatordevice)
  - [DrumCellDevice](#drumcelldevice)
- [Chain Class](#chain-class)
- [DrumChain Class](#drumchain-class)
- [DrumPad Class](#drumpad-class)
- [MixerDevice Class](#mixerdevice-class)
- [ChainMixerDevice Class](#chainmixerdevice-class)
- [Common Patterns](#common-patterns)

---

## Device Class

The base Device class represents a MIDI or audio device in Live.

**Canonical Paths:**
- `live_set tracks N devices M`
- `live_set tracks N devices M chains L devices K`
- `live_set tracks N devices M return_chains L devices K`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `parameters` | list of DeviceParameter | R | Yes | Only automatable parameters are accessible |
| `view` | Device.View | R | No | View aspects of the device |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R/W | Yes | The string shown in the title bar of the device |
| `class_name` | symbol | R | No | Live device type identifier (e.g., "Operator", "MidiChord", "Limiter", "MxDeviceAudioEffect", "PluginDevice") |
| `class_display_name` | symbol | R | No | Original device name (e.g., "Operator", "Auto Filter") |
| `type` | int | R | No | Device category: 0=undefined, 1=instrument, 2=audio_effect, 4=midi_effect |
| `is_active` | bool | R | Yes | 0 if the device itself or its enclosing Rack device is off |
| `can_have_chains` | bool | R | No | 0 for single device, 1 for Rack |
| `can_have_drum_pads` | bool | R | No | 1 if device is a Drum Rack, 0 otherwise |
| `latency_in_samples` | int | R | Yes | Device latency in samples |
| `latency_in_ms` | float | R | Yes | Device latency in milliseconds |
| `can_compare_ab` | bool | R | No | 1 for devices that support AB Compare (Live 12.3+) |
| `is_using_compare_preset_b` | bool | R | Yes | 1 if compare preset B is active (Live 12.3+) |

### Functions

#### `store_chosen_bank(script_index, bank_index)`
- **Parameters:** `script_index` [int], `bank_index` [int]
- **Description:** Hardware control surface utility for bank selection. This is related to hardware control surfaces and is usually not relevant for general scripting.

#### `save_preset_to_compare_ab_slot()` (Live 12.3+)
- **Description:** Persists the device state to the alternate AB comparison slot.
```python
if device.can_compare_ab:
    device.save_preset_to_compare_ab_slot()
```

---

## DeviceParameter Class

The DeviceParameter class represents an automatable parameter within a MIDI or audio device.

**Canonical Path:** `live_set tracks N devices M parameters L`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R | No | The short parameter name as shown in the (closed) automation chooser |
| `original_name` | symbol | R | No | The name of a Macro parameter before its assignment |
| `value` | float | R/W | Yes | The internal value between min and max |
| `display_value` | float | R | Yes | The value as visible in the GUI |
| `min` | float | R | No | Lowest allowed value |
| `max` | float | R | No | Largest allowed value |
| `default_value` | float | R | No | Default value (only accessible for non-quantized parameters) |
| `is_enabled` | bool | R | No | Indicates whether the parameter can be modified by users, automation, MIDI, or keystrokes |
| `is_quantized` | bool | R | No | 1 for booleans and enums, 0 for int/float parameters |
| `value_items` | StringVector | R | No | Lists all possible values for quantized parameters only |
| `automation_state` | int | R | Yes | 0=no automation, 1=automation active, 2=automation overridden |
| `state` | int | R | Yes | 0=active/changeable, 1=inactive but changeable, 2=cannot change |

### Functions

#### `str_for_value(value)` -> symbol
- **Parameters:** `value` [float]
- **Returns:** symbol
- **Description:** Returns the string representation of a numeric value.
```python
param = device.parameters[0]
display = param.str_for_value(param.value)  # e.g., "1.2 dB"
```

#### `re_enable_automation()`
- **Description:** Restores automation functionality for the parameter.
```python
param.re_enable_automation()
```

#### `__str__()` -> symbol
- **Returns:** symbol
- **Description:** Returns the string representation of the current parameter value.
```python
param = device.parameters[0]
print(str(param))  # e.g., "Filter Freq: 5.2 kHz"
```

---

## Device.View Class

Represents the view aspects of a Device.

**Canonical Paths:**
- `live_set tracks N devices M view`
- `live_set tracks N devices M chains L devices K view`
- `live_set tracks N devices M return_chains L devices K view`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_collapsed` | bool | R/W | Yes | 1 = the device is shown collapsed in the device chain |

```python
device.view.is_collapsed = True  # Collapse device
device.view.is_collapsed = False  # Expand device
```

---

## DeviceIO Class

Represents an input or output bus of a Live device.

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `available_routing_channels` | dict | R | Yes | Dictionary containing a list of channel dictionaries matching the structure of `routing_channel` |
| `available_routing_types` | dict | R | Yes | Dictionary containing a list of type dictionaries matching the structure of `routing_type` |
| `default_external_routing_channel_is_none` | bool | R/W | No | When 1, the default routing channel for External routing types is none (Live 11.0+) |
| `routing_channel` | dict | R/W | Yes | Current routing channel containing `display_name` [symbol] and `identifier` [symbol]. Can be set to any value from `available_routing_channels` |
| `routing_type` | dict | R/W | Yes | Current routing type containing `display_name` [symbol] and `identifier` [symbol]. Can be set to any value from `available_routing_types` |

---

## Specialized Device Classes

### PluginDevice

Represents a VST or AU plugin device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `presets` | StringVector | R | Yes | List of the plug-in's presets |
| `selected_preset_index` | int | R/W | Yes | Index of the currently selected preset |

```python
if device.class_name == "PluginDevice":
    print(f"Presets: {list(device.presets)}")
    print(f"Current preset: {device.selected_preset_index}")
    device.selected_preset_index = 2  # Change preset
```

---

### MaxDevice

Represents a Max for Live device. Inherits all properties, functions, and children from Device.

**Additional Children:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `audio_inputs` | list of DeviceIO | R | Yes | List of audio inputs the MaxDevice offers |
| `audio_outputs` | list of DeviceIO | R | Yes | List of audio outputs the MaxDevice offers |
| `midi_inputs` | list of DeviceIO | R | Yes | List of MIDI inputs the MaxDevice offers (Live 11.0+) |
| `midi_outputs` | list of DeviceIO | R | Yes | List of MIDI outputs the MaxDevice offers (Live 11.0+) |

**Additional Functions:**

#### `get_bank_count()` -> int
- **Returns:** Total number of parameter banks available

#### `get_bank_name(bank_index)` -> list of symbols
- **Parameters:** `bank_index` [int]
- **Returns:** Name associated with the specified parameter bank

#### `get_bank_parameters(bank_index)` -> list of ints
- **Parameters:** `bank_index` [int]
- **Returns:** Indices of parameters in the specified bank. Empty slots are marked as -1. Bank index -1 refers to the "Best of" bank.

---

### RackDevice

Represents a Live Rack Device (Instrument Rack, Audio Effect Rack, MIDI Effect Rack, or Drum Rack). Inherits all properties, functions, and children from Device.

**Additional Children:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `chain_selector` | DeviceParameter | R | No | Convenience accessor for the Rack's chain selector |
| `chains` | list of Chain | R | Yes | The Rack's chains |
| `drum_pads` | list of DrumPad | R | Yes | All 128 drum pads for topmost Drum Rack; nested racks return empty |
| `return_chains` | list of Chain | R | Yes | The Rack's return chains |
| `visible_drum_pads` | list of DrumPad | R | Yes | All 16 visible drum pads for topmost Drum Rack; nested racks return empty |

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `can_show_chains` | bool | R | No | Indicates if rack contains instrument capable of displaying chains in Session View |
| `has_drum_pads` | bool | R | Yes | 1 if device is Drum Rack with pads; nested racks lack pads |
| `has_macro_mappings` | bool | R | Yes | 1 if any of the Rack's Macros are mapped to a parameter |
| `is_showing_chains` | bool | R/W | Yes | Indicates if rack displays chains in Session View |
| `variation_count` | int | R | Yes | Count of stored macro variations (Live 11.0+) |
| `selected_variation_index` | int | R/W | No | Current selected macro variation (Live 11.0+) |
| `visible_macro_count` | int | R | Yes | Number of currently visible macros |

**Additional Functions:**

#### `copy_pad(source_index, destination_index)`
- **Parameters:** `source_index` [int], `destination_index` [int]
- **Description:** Copies all content from source pad to destination pad indices.

#### `add_macro()` (Live 11.0+)
- **Description:** Increases visible macro control count.

#### `remove_macro()` (Live 11.0+)
- **Description:** Decreases visible macro control count.

#### `insert_chain(index)` (Live 12.3+)
- **Parameters:** `index` [int] (optional)
- **Description:** Inserts a new chain at the specified index, or at the end if unspecified. Throws an error if insertion is impossible.

#### `randomize_macros()` (Live 11.0+)
- **Description:** Randomizes the values of eligible macro controls.

#### `store_variation()` (Live 11.0+)
- **Description:** Stores a new variation of the values of all currently mapped macros.

#### `recall_selected_variation()` (Live 11.0+)
- **Description:** Recalls the currently selected macro variation.

#### `recall_last_used_variation()` (Live 11.0+)
- **Description:** Recalls the macro variation that was recalled most recently.

#### `delete_selected_variation()` (Live 11.0+)
- **Description:** Deletes the selected macro variation; does nothing if none selected.

---

### RackDevice.View

Represents the view aspects of a Rack Device. Inherits all properties from Device.View.

**Canonical Path:** `live_set tracks N devices M view` (when device is a RackDevice)

**Additional Children:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_drum_pad` | DrumPad | R | Yes | Currently selected Drum Rack pad. Only available for Drum Racks |
| `selected_chain` | Chain | R | Yes | Currently selected chain |

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `drum_pads_scroll_position` | int | R/W | Yes | Lowest row of pads visible, range: 0-28. Only available for Drum Racks |
| `is_showing_chain_devices` | bool | R/W | Yes | 1 = the devices in the currently selected chain are visible |

---

### SimplerDevice

Represents a Simpler sampler device. Inherits all properties, functions, and children from Device.

**Additional Children:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `sample` | Sample | R | Yes | The sample currently loaded into Simpler |

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `can_warp_as` | bool | R | Yes | 1 if warp_as is available |
| `can_warp_double` | bool | R | Yes | 1 if warp_double is available |
| `can_warp_half` | bool | R | Yes | 1 if warp_half is available |
| `multi_sample_mode` | bool | R | Yes | 1 if Simpler is in multisample mode |
| `pad_slicing` | bool | R/W | Yes | 1 if slices can be added in Slicing Mode by playing notes not yet assigned |
| `playback_mode` | int | R/W | Yes | 0=Classic, 1=One-Shot, 2=Slicing |
| `playing_position` | float | R | Yes | Current playing position in sample (0.0 to 1.0) |
| `playing_position_enabled` | bool | R | Yes | Indicates if Simpler actively plays the sample and displays position |
| `retrigger` | bool | R/W | Yes | 1 if Retrigger is enabled |
| `slicing_playback_mode` | int | R/W | Yes | 0=Mono, 1=Poly, 2=Thru |
| `voices` | int | R/W | Yes | Number of polyphonic voices available |

**Additional Functions:**

#### `crop()`
- **Description:** Crop the loaded sample to the active region between the start and end markers.

#### `guess_playback_length()` -> float
- **Returns:** Estimated beat time for the playback length between start and end markers.

#### `reverse()`
- **Description:** Reverse the loaded sample.

#### `warp_as(beats)`
- **Parameters:** `beats` [int]
- **Description:** Warp the active region between the start and end markers as the specified number of beats.

#### `warp_double()`
- **Description:** Double the playback tempo of the active region.

#### `warp_half()`
- **Description:** Halve the playback tempo of the active region.

---

### SimplerDevice.View

Represents the view aspects of a SimplerDevice. Inherits all properties from Device.View.

**Canonical Path:** `live_set tracks N devices M view` (when device is a SimplerDevice)

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_slice` | int | R/W | Yes | The currently selected slice, identified by its slice time |

---

### WavetableDevice

Represents a Wavetable instrument device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `filter_routing` | int | R/W | Yes | 0=Serial, 1=Parallel, 2=Split |
| `mono_poly` | int | R/W | Yes | 0=Mono, 1=Poly |
| `oscillator_1_effect_mode` | int | R/W | Yes | 0=None, 1=Fm, 2=Classic, 3=Modern |
| `oscillator_2_effect_mode` | int | R/W | Yes | 0=None, 1=Fm, 2=Classic, 3=Modern |
| `oscillator_1_wavetable_category` | int | R/W | Yes | Oscillator 1's wavetable category selector |
| `oscillator_2_wavetable_category` | int | R/W | Yes | Oscillator 2's wavetable category selector |
| `oscillator_1_wavetable_index` | int | R/W | Yes | Oscillator 1's wavetable index selector |
| `oscillator_2_wavetable_index` | int | R/W | Yes | Oscillator 2's wavetable index selector |
| `oscillator_1_wavetables` | StringVector | R | Yes | List of available wavetable names for oscillator 1 (depends on category) |
| `oscillator_2_wavetables` | StringVector | R | Yes | List of available wavetable names for oscillator 2 (depends on category) |
| `oscillator_wavetable_categories` | StringVector | R | No | List of available wavetable category names |
| `poly_voices` | int | R/W | Yes | Current number of polyphonic voices |
| `unison_mode` | int | R/W | Yes | 0=None, 1=Classic, 2=Shimmer, 3=Noise, 4=Phase Sync, 5=Position Spread, 6=Random Note |
| `unison_voice_count` | int | R/W | Yes | Number of unison voices |
| `visible_modulation_target_names` | StringVector | R | Yes | List of modulation target names currently visible in the modulation matrix |

**Additional Functions:**

#### `add_parameter_to_modulation_matrix(parameter_to_add)`
- **Parameters:** `parameter_to_add` [DeviceParameter]
- **Description:** Add an instrument parameter to the modulation matrix. Only works for parameters that can be modulated.

#### `get_modulation_target_parameter_name(index)` -> symbol
- **Parameters:** `index` [int]
- **Returns:** The modulation target parameter name at the specified index in the modulation matrix.

#### `get_modulation_value(modulation_target_index, modulation_source_index)` -> float
- **Parameters:** `modulation_target_index` [int], `modulation_source_index` [int]
- **Returns:** The amount of modulation of the parameter at modulation_target_index by the modulation source.

#### `is_parameter_modulatable(parameter)` -> int
- **Parameters:** `parameter` [DeviceParameter]
- **Returns:** 1 if parameter can be modulated. Call this before add_parameter_to_modulation_matrix.

#### `set_modulation_value(modulation_target_index, modulation_source_index, value)`
- **Parameters:** `modulation_target_index` [int], `modulation_source_index` [int], `value` [float]
- **Description:** Set the amount of modulation of the parameter at modulation_target_index by the modulation source.

---

### LooperDevice

Represents a Looper device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `loop_length` | float | R | Yes | The length of Looper's buffer |
| `overdub_after_record` | bool | R/W | Yes | 1=switch to overdub after recording, 0=switch to playback |
| `record_length_index` | int | R/W | Yes | Index of Record Length chooser entry |
| `record_length_list` | StringVector | R | No | List of Record Length chooser entry strings |
| `tempo` | float | R | Yes | The tempo of Looper's buffer |

**Additional Functions:**

#### `clear()`
- **Description:** Erase Looper's recorded content.

#### `double_speed()`
- **Description:** Double the speed of Looper's playback.

#### `half_speed()`
- **Description:** Halve the speed of Looper's playback.

#### `double_length()`
- **Description:** Double the length of Looper's buffer.

#### `half_length()`
- **Description:** Halve the length of Looper's buffer.

#### `record()`
- **Description:** Record incoming audio.

#### `overdub()`
- **Description:** Play back while adding additional layers of incoming audio.

#### `play()`
- **Description:** Play back without overdubbing.

#### `stop()`
- **Description:** Stop Looper's playback.

#### `undo()`
- **Description:** Erases recent recordings; calling twice restores the erased content.

#### `export_to_clip_slot(clip_slot)`
- **Parameters:** `clip_slot` [ClipSlot]
- **Description:** Exports buffer content to an empty clip slot on a non-frozen audio track.

---

### CompressorDevice

Represents a Compressor device with sidechain routing capabilities. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `available_input_routing_channels` | dict | R | Yes | Dictionary containing list of source channels available for sidechain input routing |
| `available_input_routing_types` | dict | R | Yes | Dictionary containing list of source types available for sidechain input routing |
| `input_routing_channel` | dict | R/W | Yes | Current source channel for sidechain input routing (contains `display_name` and `identifier`) |
| `input_routing_type` | dict | R/W | Yes | Current source type for sidechain input routing (contains `display_name` and `identifier`) |

---

### Eq8Device

Represents an EQ Eight device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `edit_mode` | bool | R/W | Yes | Edit mode toggle. In L/R mode: 0=L, 1=R. In M/S mode: 0=M, 1=S. In Stereo mode: 0=A, 1=B (inactive) |
| `global_mode` | int | R/W | Yes | 0=Stereo, 1=L/R, 2=M/S |
| `oversample` | bool | R/W | Yes | 0=Off, 1=On |

---

### Eq8Device.View

Represents the view aspects of an Eq8Device. Inherits all properties from Device.View.

**Canonical Path:** `live_set tracks N devices M view` (when device is an Eq8Device)

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_band` | int | R/W | Yes | The index of the currently selected filter band |

---

### HybridReverbDevice

Represents a Hybrid Reverb device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `ir_attack_time` | float | R/W | Yes | Attack time of the amplitude envelope for the impulse response, in seconds |
| `ir_category_index` | int | R/W | Yes | Index of the selected impulse response category |
| `ir_category_list` | StringVector | R | No | List of impulse response categories |
| `ir_decay_time` | float | R/W | Yes | Decay time of the amplitude envelope for the impulse response, in seconds |
| `ir_file_index` | int | R/W | Yes | Index of the selected impulse response file from the current category |
| `ir_file_list` | StringVector | R | Yes | List of impulse response files from the selected category |
| `ir_size_factor` | float | R/W | Yes | Relative size of the impulse response (0.0 to 1.0) |
| `ir_time_shaping_on` | bool | R/W | Yes | 1=enables transformation using amplitude envelope and size parameters |

---

### DriftDevice

Represents a Drift synthesizer device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `mod_matrix_filter_source_1_index` | int | R/W | Yes | Index of available sources for Filter Frequency modulation slot 1 |
| `mod_matrix_filter_source_1_list` | StringVector | R | No | List of available sources for Filter Frequency modulation slot 1 |
| `mod_matrix_filter_source_2_index` | int | R/W | Yes | Index of available sources for Filter Frequency modulation slot 2 |
| `mod_matrix_filter_source_2_list` | StringVector | R | No | List of available sources for Filter Frequency modulation slot 2 |
| `mod_matrix_lfo_source_index` | int | R/W | Yes | Index of available sources for LFO Amount modulation |
| `mod_matrix_lfo_source_list` | StringVector | R | No | List of available sources for LFO Amount modulation |
| `mod_matrix_pitch_source_1_index` | int | R/W | Yes | Index for pitch modulation source 1 |
| `mod_matrix_pitch_source_1_list` | StringVector | R | No | List of pitch modulation sources (slot 1) |
| `mod_matrix_pitch_source_2_index` | int | R/W | Yes | Index for pitch modulation source 2 |
| `mod_matrix_pitch_source_2_list` | StringVector | R | No | List of pitch modulation sources (slot 2) |
| `mod_matrix_shape_source_index` | int | R/W | Yes | Index of available sources for Shape modulation |
| `mod_matrix_shape_source_list` | StringVector | R | No | List of available sources for Shape modulation |
| `mod_matrix_source_1_index` | int | R/W | Yes | Index for custom modulation slot 1 |
| `mod_matrix_source_1_list` | StringVector | R | No | List of sources for custom modulation slot 1 |
| `mod_matrix_source_2_index` | int | R/W | Yes | Index for custom modulation slot 2 |
| `mod_matrix_source_2_list` | StringVector | R | No | List of sources for custom modulation slot 2 |
| `mod_matrix_source_3_index` | int | R/W | Yes | Index for custom modulation slot 3 |
| `mod_matrix_source_3_list` | StringVector | R | No | List of sources for custom modulation slot 3 |
| `mod_matrix_target_1_index` | int | R/W | Yes | Index of available targets for custom modulation slot 1 |
| `mod_matrix_target_1_list` | StringVector | R | No | List of available targets for custom modulation slot 1 |
| `mod_matrix_target_2_index` | int | R/W | Yes | Index of available targets for custom modulation slot 2 |
| `mod_matrix_target_2_list` | StringVector | R | No | List of available targets for custom modulation slot 2 |
| `mod_matrix_target_3_index` | int | R/W | Yes | Index of available targets for custom modulation slot 3 |
| `mod_matrix_target_3_list` | StringVector | R | No | List of available targets for custom modulation slot 3 |
| `pitch_bend_range` | int | R/W | Yes | MIDI Pitch Bend range in semitones |
| `voice_count_index` | int | R/W | Yes | Index of the voice count parameter |
| `voice_count_list` | StringVector | R | No | List of available voice count settings |
| `voice_mode_index` | int | R/W | Yes | Index of the voice mode utilized by Drift |
| `voice_mode_list` | StringVector | R | No | List of available voice modes |

---

### MeldDevice

Represents a Meld synthesizer device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_engine` | int | R/W | Yes | 0=Engine A, 1=Engine B |
| `unison_voices` | int | R/W | Yes | 0=off, 1=two, 2=three, 3=four |
| `mono_poly` | int | R/W | Yes | 0=mono, 1=poly |
| `poly_voices` | int | R/W | Yes | 0=two, 1=three, 2=four, 3=five, 4=six, 5=eight, 6=twelve |

---

### RoarDevice

Represents a Roar distortion device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `routing_mode_index` | int | R/W | Yes | Index of the routing mode utilized by Roar |
| `routing_mode_list` | StringVector | R | No | List of available routing modes |
| `env_listen` | bool | R/W | Yes | Envelope Input Listen toggle |

---

### ShifterDevice

Represents a Shifter audio effect device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `pitch_bend_range` | int | R/W | Yes | Pitch bend range used in MIDI Pitch Mode |
| `pitch_mode_index` | int | R/W | Yes | 0=Internal, 1=MIDI |

---

### SpectralResonatorDevice

Represents a Spectral Resonator device. Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `frequency_dial_mode` | int | R/W | Yes | 0=Hertz, 1=MIDI note values |
| `midi_gate` | int | R/W | Yes | MIDI gate switch: 0=Off, 1=On |
| `mod_mode` | int | R/W | Yes | 0=None, 1=Chorus, 2=Wander, 3=Granular |
| `mono_poly` | int | R/W | Yes | 0=Mono, 1=Poly |
| `pitch_mode` | int | R/W | Yes | 0=Internal, 1=MIDI |
| `pitch_bend_range` | int | R/W | Yes | Pitch Bend Range control |
| `polyphony` | int | R/W | Yes | 0=2 voices, 1=4 voices, 2=8 voices, 3=16 voices |

---

### DrumCellDevice

Represents a Drum Sampler device (found in Drum Rack cells). Inherits all properties, functions, and children from Device.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `gain` | float | R/W | Yes | The sample gain, as normalized value |

---

## Chain Class

Represents a group device chain in a Rack.

**Canonical Paths:**
- `live_set tracks N devices M chains L`
- `live_set tracks N devices M return_chains L`
- `live_set tracks N devices M chains L devices K chains P ...`
- `live_set tracks N devices M return_chains L devices K chains P ...`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `devices` | list of Device | R | Yes | Devices in the chain |
| `mixer_device` | ChainMixerDevice | R | No | The chain's mixer device |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | unicode | R/W | Yes | Chain's display name |
| `color` | int | R/W | Yes | RGB value of the chain's color in the form 0x00rrggbb |
| `color_index` | long | R/W | Yes | Numeric identifier for the chain's color selection |
| `is_auto_colored` | bool | R/W | Yes | When enabled, chain inherits the color of its containing track or parent chain |
| `mute` | bool | R/W | Yes | 1 = muted (Chain Activator off) |
| `solo` | bool | R/W | Yes | 1 = soloed (Solo switch on). Does not automatically turn Solo off in other chains |
| `muted_via_solo` | bool | R | Yes | Reflects muted state caused by soloing another chain |
| `has_audio_input` | bool | R | No | Indicates whether the chain accepts audio |
| `has_audio_output` | bool | R | No | Indicates whether the chain produces audio |
| `has_midi_input` | bool | R | No | Indicates whether the chain accepts MIDI |
| `has_midi_output` | bool | R | No | Indicates whether the chain produces MIDI |

### Functions

#### `delete_device(index)`
- **Parameters:** `index` [int]
- **Description:** Removes the device at the specified index from the chain.

#### `insert_device(device_name, target_index)` (Live 12.3+)
- **Parameters:** `device_name` [symbol], `target_index` [int] (optional)
- **Description:** Inserts a native Live device by name at the given index. Omitting index places device at end. Only native devices are supported; Max for Live devices and plug-ins are not supported. Note that a MIDI effect cannot be inserted after an instrument.

---

## DrumChain Class

Represents a Drum Rack device chain in Live. Inherits all properties, functions, and children from Chain.

**Additional Properties:**

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `in_note` | int | R/W | Yes | MIDI note that will trigger this chain. Value -1 corresponds to "All Notes" setting (Live 12.3+) |
| `out_note` | int | R/W | Yes | MIDI note sent to the devices in the chain |
| `choke_group` | int | R/W | Yes | The chain's choke group |

---

## DrumPad Class

Represents a Drum Rack pad in Live.

**Canonical Path:** `live_set tracks N devices M drum_pads L`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `chains` | list of Chain | R | Yes | The chains contained in this drum pad |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `name` | symbol | R | Yes | Name of the drum pad |
| `note` | int | R | No | MIDI note number assigned to this pad |
| `mute` | bool | R/W | Yes | 1 = muted |
| `solo` | bool | R/W | Yes | 1 = soloed (Solo switch on). Does not automatically turn Solo off in other chains |

### Functions

#### `delete_all_chains()`
- **Description:** Deletes all chains from this drum pad.

---

## MixerDevice Class

Represents a track's mixer device, providing access to volume, panning, and other controls.

**Canonical Path:** `live_set tracks N mixer_device`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `sends` | list of DeviceParameter | R | Yes | One send per return track |
| `cue_volume` | DeviceParameter | R | No | Master track only |
| `crossfader` | DeviceParameter | R | No | Master track only |
| `left_split_stereo` | DeviceParameter | R | No | Track's Left Split Stereo Pan Parameter |
| `panning` | DeviceParameter | R | No | Standard pan control |
| `right_split_stereo` | DeviceParameter | R | No | Track's Right Split Stereo Pan Parameter |
| `song_tempo` | DeviceParameter | R | No | Master track only |
| `track_activator` | DeviceParameter | R | No | Enables/disables track |
| `volume` | DeviceParameter | R | No | Track volume control |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `crossfade_assign` | int | R/W | Yes | 0=A, 1=none, 2=B (not available on master track) |
| `panning_mode` | int | R/W | Yes | 0=Stereo, 1=Split Stereo |

---

## ChainMixerDevice Class

Represents a chain's mixer device within a Rack.

**Canonical Paths:**
- `live_set tracks N devices M chains L mixer_device`
- `live_set tracks N devices M return_chains L mixer_device`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `sends` | list of DeviceParameter | R | Yes | Available in Audio Effect and Instrument Racks only; empty for Drum Racks |
| `chain_activator` | DeviceParameter | R | No | Enables/disables the chain |
| `panning` | DeviceParameter | R | No | Audio Effect Racks and Instrument Racks only |
| `volume` | DeviceParameter | R | No | Audio Effect Racks and Instrument Racks only |

---

## Common Patterns

### Device Type Constants

```python
DEVICE_TYPE_UNDEFINED = 0
DEVICE_TYPE_INSTRUMENT = 1
DEVICE_TYPE_AUDIO_EFFECT = 2
DEVICE_TYPE_MIDI_EFFECT = 4

def is_instrument(device):
    return device.type == DEVICE_TYPE_INSTRUMENT

def is_audio_effect(device):
    return device.type == DEVICE_TYPE_AUDIO_EFFECT

def is_midi_effect(device):
    return device.type == DEVICE_TYPE_MIDI_EFFECT
```

### Iterate All Parameters

```python
device = track.devices[0]
for param in device.parameters:
    self.log_message(f"{param.name}: {param.value} ({param.min} - {param.max})")
```

### Find Parameter by Name

```python
def find_parameter(device, name):
    for param in device.parameters:
        if param.name.lower() == name.lower():
            return param
    return None

# Usage
cutoff = find_parameter(device, "Frequency")
if cutoff:
    cutoff.value = 5000.0
```

### Set Quantized Parameter

```python
# For on/off or enum parameters
param = device.parameters[0]
if param.is_quantized:
    # Use integer indices
    param.value = 1  # Second option
    # Check available values
    print(list(param.value_items))
```

### Normalize Parameter Value

```python
def set_normalized(param, normalized_value):
    """Set parameter using 0.0-1.0 range."""
    param.value = param.min + (normalized_value * (param.max - param.min))

def get_normalized(param):
    """Get parameter as 0.0-1.0 range."""
    return (param.value - param.min) / (param.max - param.min)

# Usage
set_normalized(volume_param, 0.75)  # 75% of range
```

### Monitor Parameter Changes

```python
def on_param_changed():
    self.log_message(f"Parameter changed: {param.value}")

param.add_value_listener(on_param_changed)

# Remember to remove listener when done
param.remove_value_listener(on_param_changed)
```

### Get All Device Info

```python
def get_device_info(device):
    return {
        "name": device.name,
        "class_name": device.class_name,
        "class_display_name": device.class_display_name,
        "type": ["undefined", "instrument", "audio_effect", None, "midi_effect"][device.type],
        "is_active": device.is_active,
        "can_have_chains": device.can_have_chains,
        "can_have_drum_pads": device.can_have_drum_pads,
        "parameter_count": len(device.parameters),
        "parameters": [
            {
                "name": p.name,
                "value": p.value,
                "min": p.min,
                "max": p.max,
                "is_quantized": p.is_quantized
            }
            for p in device.parameters
        ]
    }
```

### Working with Plugin Devices

```python
if device.class_name == "PluginDevice":
    plugin = device
    print(f"Presets: {list(plugin.presets)}")
    print(f"Current preset: {plugin.selected_preset_index}")
    plugin.selected_preset_index = 2  # Change preset
```

### Working with Rack Devices

```python
if device.can_have_chains:
    rack = device
    print(f"Chain count: {len(rack.chains)}")
    print(f"Visible macros: {rack.visible_macro_count}")

    # Access chain selector
    if rack.chain_selector:
        rack.chain_selector.value = 0

    # Iterate chains
    for chain in rack.chains:
        print(f"Chain: {chain.name}")
        for dev in chain.devices:
            print(f"  Device: {dev.name}")
```

### Working with Simpler

```python
if device.class_name == "OriginalSimpler":
    simpler = device

    # Check playback mode
    modes = ["Classic", "One-Shot", "Slicing"]
    print(f"Mode: {modes[simpler.playback_mode]}")

    # Change to slicing mode
    simpler.playback_mode = 2

    # Warp operations
    if simpler.can_warp_double:
        simpler.warp_double()
```

### Working with Wavetable

```python
if device.class_name == "InstrumentVector":
    wavetable = device

    # List wavetable categories
    print(f"Categories: {list(wavetable.oscillator_wavetable_categories)}")

    # Change oscillator 1 wavetable
    wavetable.oscillator_1_wavetable_category = 0
    wavetable.oscillator_1_wavetable_index = 2

    # Set unison
    wavetable.unison_mode = 1  # Classic
    wavetable.unison_voice_count = 4
```

### Working with Looper

```python
if device.class_name == "Looper":
    looper = device

    # Control looper
    looper.record()
    # ... recording happens ...
    looper.play()

    # Export to clip slot
    clip_slot = song.tracks[0].clip_slots[0]
    looper.export_to_clip_slot(clip_slot)
```

### Insert Native Device (Live 12.3+)

```python
# Insert at end of chain
track.insert_device("Compressor")

# Insert at specific position
track.insert_device("Auto Filter", 0)  # At beginning

# Available device names match class_display_name
# Examples: "Compressor", "Auto Filter", "EQ Eight", "Reverb", "Delay"
```
