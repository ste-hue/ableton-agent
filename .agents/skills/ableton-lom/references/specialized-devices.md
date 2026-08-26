# Specialized Device Classes Reference

These classes extend the base Device class with additional properties and methods specific to each device type. All specialized devices inherit all properties, children, and methods from the base Device class.

## Table of Contents
- [SimplerDevice](#simplerdevice)
- [Sample Class](#sample-class)
- [WavetableDevice](#wavetabledevice)
- [LooperDevice](#looperdevice)
- [CompressorDevice](#compressordevice)
- [Eq8Device](#eq8device)
- [HybridReverbDevice](#hybridreverbdevice)
- [DriftDevice](#driftdevice)
- [MeldDevice](#melddevice)
- [RoarDevice](#roardevice)
- [ShifterDevice](#shifterdevice)
- [SpectralResonatorDevice](#spectralresonatordevice)
- [DrumCellDevice](#drumcelldevice)
- [PluginDevice](#plugindevice)
- [MaxDevice](#maxdevice)
- [DeviceIO Class](#deviceio-class)
- [RackDevice](#rackdevice)
- [Chain Class](#chain-class)
- [DrumChain Class](#drumchain-class)
- [ChainMixerDevice](#chainmixerdevice)
- [DrumPad Class](#drumpad-class)

---

## SimplerDevice

This class represents an instance of Simpler in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Simpler)

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `sample` | Sample | R | Yes | The sample currently loaded into Simpler |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `can_warp_as` | bool | R | Yes | 1 = warp_as is available |
| `can_warp_double` | bool | R | Yes | 1 = warp_double is available |
| `can_warp_half` | bool | R | Yes | 1 = warp_half is available |
| `multi_sample_mode` | bool | R | Yes | 1 = Simpler is in multisample mode |
| `pad_slicing` | bool | R/W | Yes | 1 = slices can be added in Slicing Mode by playing notes which are not yet assigned to existing slices |
| `playback_mode` | int | R/W | Yes | 0=Classic, 1=One-Shot, 2=Slicing |
| `playing_position` | float | R | Yes | The current playing position in the sample, expressed as a value between 0.0 and 1.0 |
| `playing_position_enabled` | bool | R | Yes | 1 = Simpler is playing back the sample and showing the playing position |
| `retrigger` | bool | R/W | Yes | 1 = Retrigger is enabled in Simpler |
| `slicing_playback_mode` | int | R/W | Yes | 0=Mono, 1=Poly, 2=Thru |
| `voices` | int | R/W | Yes | Get/set the number of Voices |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `crop()` | None | None | Crop the loaded sample to the active region between the start and end markers |
| `guess_playback_length()` | None | float | Returns estimated beat time for active region between markers |
| `reverse()` | None | None | Reverse the loaded sample |
| `warp_as(beats)` | beats [int] | None | Warp active region to specified beat count |
| `warp_double()` | None | None | Double the playback tempo of the active region between the start and end markers |
| `warp_half()` | None | None | Halve the playback tempo for the active region between the start and end markers |

### SimplerDevice.View

Represents the view aspects of a SimplerDevice. Inherits all properties from Device.View.

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_slice` | int | R | Yes | The currently selected slice, identified by its slice time |

---

## Sample Class

This class represents a sample file loaded into Simpler or other sampling devices.

**Canonical Path:** `live_set tracks N devices M sample`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `file_path` | unicode | R | Yes | Path of the sample file |
| `length` | int | R | No | Length of the sample file in sample frames |
| `sample_rate` | int | R | No | Sample rate of the loaded audio (since Live 11.0) |
| `start_marker` | int | R/W | Yes | Position of the sample's start marker |
| `end_marker` | int | R/W | Yes | Position of the sample's end marker |
| `gain` | float | R/W | Yes | Sample gain |
| `warping` | bool | R/W | Yes | 1 = warping is enabled |
| `warp_mode` | int | R/W | Yes | 0=Beats, 1=Tones, 2=Texture, 3=Re-Pitch, 4=Complex, 6=Complex Pro |
| `warp_markers` | dict | R | Yes | Warp Markers as a dict; includes hidden shadow marker (since Live 11.0) |
| `slices` | list[int] | R | Yes | Positions of all playable slices in sample, in sample frames (since Live 11.0) |
| `slicing_style` | int | R/W | Yes | 0=Transient, 1=Beat, 2=Region, 3=Manual |
| `slicing_sensitivity` | float | R/W | Yes | Sensitivity value (0.0-1.0) |
| `slicing_beat_division` | int | R/W | Yes | Beat division (0=1/16 through 10=4 Bars) |
| `slicing_region_count` | int | R/W | Yes | Number of slice regions in Region Slicing Mode |

### Warp Mode Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `beats_granulation_resolution` | int | R/W | Yes | Which divisions to preserve in the sample in Beats Mode (0=1 Bar through 6=Transients) |
| `beats_transient_envelope` | float | R/W | Yes | Duration of a volume fade applied to each segment in Beats Mode (0-100) |
| `beats_transient_loop_mode` | int | R/W | Yes | Transient Loop Mode: 0=Off, 1=Forward, 2=Back-and-Forth |
| `tones_grain_size` | float | R/W | Yes | Grain Size parameter in Tones Mode |
| `texture_flux` | float | R/W | Yes | Flux parameter in Texture Mode |
| `texture_grain_size` | float | R/W | Yes | Grain Size parameter in Texture Mode |
| `complex_pro_envelope` | float | R/W | Yes | Envelope parameter in Complex Pro Mode |
| `complex_pro_formants` | float | R/W | Yes | Formants parameter in Complex Pro Mode |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `gain_display_string()` | None | list[symbol] | Sample's gain value as a string, e.g. "0.0 dB" |
| `insert_slice(slice_time)` | slice_time [int] | None | Insert a new slice at the specified time if there is none |
| `move_slice(source_time, destination_time)` | source_time [int], destination_time [int] | None | Move an existing slice to a specified time |
| `remove_slice(slice_time)` | slice_time [int] | None | Remove a slice at the specified time if it exists |
| `clear_slices()` | None | None | Clear all slices created in Manual Slicing Mode |
| `reset_slices()` | None | None | Reset all edited slices to their original positions |

---

## WavetableDevice

This class represents a Wavetable instrument in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Wavetable)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `filter_routing` | int | R/W | Yes | Access to the current filter routing. 0=Serial, 1=Parallel, 2=Split |
| `mono_poly` | int | R/W | Yes | Access to Wavetable's Poly/Mono switch. 0=Mono, 1=Poly |
| `poly_voices` | int | R/W | Yes | The current number of polyphonic voices |
| `unison_mode` | int | R/W | Yes | 0=None, 1=Classic, 2=Shimmer, 3=Noise, 4=Phase Sync, 5=Position Spread, 6=Random Note |
| `unison_voice_count` | int | R/W | Yes | Access to the number of unison voices |
| `oscillator_1_effect_mode` | int | R/W | Yes | Access to oscillator 1's effect mode. 0=None, 1=FM, 2=Classic, 3=Modern |
| `oscillator_2_effect_mode` | int | R/W | Yes | Access to oscillator 2's effect mode. 0=None, 1=FM, 2=Classic, 3=Modern |
| `oscillator_1_wavetable_category` | int | R/W | Yes | Oscillator 1's wavetable category selector |
| `oscillator_2_wavetable_category` | int | R/W | Yes | Oscillator 2's wavetable category selector |
| `oscillator_1_wavetable_index` | int | R/W | Yes | Oscillator 1's wavetable index selector |
| `oscillator_2_wavetable_index` | int | R/W | Yes | Oscillator 2's wavetable index selector |
| `oscillator_wavetable_categories` | StringVector | R | No | List of the names of the available wavetable categories |
| `oscillator_1_wavetables` | StringVector | R | Yes | List of names of the wavetables currently available for oscillator 1 |
| `oscillator_2_wavetables` | StringVector | R | Yes | List of names of the wavetables currently available for oscillator 2 |
| `visible_modulation_target_names` | StringVector | R | Yes | List of the names of modulation targets currently visible in the modulation matrix |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `add_parameter_to_modulation_matrix(parameter_to_add)` | parameter_to_add [DeviceParameter] | None | Add an instrument parameter to the modulation matrix. Only works for parameters that can be modulated |
| `get_modulation_target_parameter_name(index)` | index [int] | symbol | Return the modulation target parameter name at index in the modulation matrix |
| `get_modulation_value(modulation_target_index, modulation_source_index)` | modulation_target_index [int], modulation_source_index [int] | number | Return the amount of modulation of the parameter at modulation_target_index by the modulation source |
| `set_modulation_value(modulation_target_index, modulation_source_index)` | modulation_target_index [int], modulation_source_index [int] | None | Set the amount of modulation of the parameter at modulation_target_index |
| `is_parameter_modulatable(parameter)` | parameter [DeviceParameter] | bool | Returns 1 if the parameter can be modulated, 0 otherwise |

---

## LooperDevice

This class represents an instance of a Looper device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Looper)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `loop_length` | float | R | Yes | The length of Looper's buffer |
| `tempo` | float | R | Yes | The tempo of Looper's buffer |
| `overdub_after_record` | bool | R/W | Yes | 1=switch to overdub mode after recording, 0=switch to playback |
| `record_length_index` | int | R/W | Yes | Access to the Record Length chooser entry index |
| `record_length_list` | StringVector | R | No | Access to the list of Record Length chooser entry strings |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `record()` | None | None | Record incoming audio |
| `overdub()` | None | None | Play back while adding additional layers of incoming audio |
| `play()` | None | None | Play back without overdubbing |
| `stop()` | None | None | Stop Looper's playback |
| `clear()` | None | None | Erase Looper's recorded content |
| `undo()` | None | None | Erases recorded material since last overdub activation; calling again restores erased content |
| `double_speed()` | None | None | Double the speed of Looper's playback |
| `half_speed()` | None | None | Halve the speed of Looper's playback |
| `double_length()` | None | None | Double the length of Looper's buffer |
| `half_length()` | None | None | Halve the length of Looper's buffer |
| `export_to_clip_slot(clip_slot)` | clip_slot [ClipSlot] | None | Exports buffer to empty clip slot on non-frozen audio track; requires fixed-length content |

---

## CompressorDevice

This class represents an instance of a Compressor device in Live with sidechain routing capabilities.

**Canonical Path:** `live_set tracks N devices M` (when device is Compressor)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `input_routing_type` | dict | R/W | Yes | The currently selected source type for the compressor's input routing in the sidechain. Contains `display_name` [symbol] and `identifier` [symbol] |
| `input_routing_channel` | dict | R/W | Yes | The currently selected source channel for the compressor's input routing in the sidechain. Contains `display_name` [symbol] and `identifier` [symbol] |
| `available_input_routing_types` | dict | R | Yes | The list of available source types for the compressor's input routing in the sidechain. Contains list of dictionaries with type information |
| `available_input_routing_channels` | dict | R | Yes | The list of available source channels for the compressor's input routing in the sidechain. Contains list of dictionaries with channel information |

---

## Eq8Device

This class represents an instance of an EQ Eight device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is EQ Eight)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `global_mode` | int | R/W | Yes | Access to EQ Eight's global mode: 0=Stereo, 1=L/R, 2=M/S |
| `edit_mode` | bool | R/W | Yes | Toggles the channel currently available for editing. Values depend on global_mode: L/R mode (0=L, 1=R), M/S mode (0=M, 1=S), Stereo mode (0=A, 1=B inactive) |
| `oversample` | bool | R/W | Yes | Oversampling parameter: 0=Off, 1=On |

### Eq8Device.View

Represents the view aspects of an Eq8Device. Inherits all properties from Device.View.

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_band` | int | R/W | Yes | The index of the currently selected filter band |

---

## HybridReverbDevice

This class represents an instance of a Hybrid Reverb device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Hybrid Reverb)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `ir_category_index` | int | R/W | Yes | The index of the selected impulse response category |
| `ir_category_list` | StringVector | R | No | The list of impulse response categories |
| `ir_file_index` | int | R/W | Yes | The index of the selected impulse response file from the current category |
| `ir_file_list` | StringVector | R | Yes | The list of impulse response files from the selected category |
| `ir_attack_time` | float | R/W | Yes | The attack time of the amplitude envelope for the impulse response, in seconds |
| `ir_decay_time` | float | R/W | Yes | The decay time of the amplitude envelope for the impulse response, in seconds |
| `ir_size_factor` | float | R/W | Yes | The relative size of the impulse response (0.0-1.0) |
| `ir_time_shaping_on` | bool | R/W | Yes | Activates transformation of the selected impulse response using an amplitude envelope and size parameter (1=enabled) |

---

## DriftDevice

This class represents an instance of a Drift device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Drift)

### Properties - Modulation Matrix Filter Sources

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `mod_matrix_filter_source_1_index` | int | R/W | Yes | The index of the available sources for modulating the Filter Frequency for the first modulation slot |
| `mod_matrix_filter_source_1_list` | StringVector | R | No | The list of the available sources for modulating the Filter Frequency for the first modulation slot |
| `mod_matrix_filter_source_2_index` | int | R/W | Yes | The index of the available sources for modulating the Filter Frequency for the second modulation slot |
| `mod_matrix_filter_source_2_list` | StringVector | R | No | The list of the available sources for modulating the Filter Frequency for the second modulation slot |

### Properties - Modulation Matrix Pitch Sources

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `mod_matrix_pitch_source_1_index` | int | R/W | Yes | The index of the available sources for modulating the Pitch for the first modulation slot |
| `mod_matrix_pitch_source_1_list` | StringVector | R | No | The list of the available sources for modulating the Pitch for the first modulation slot |
| `mod_matrix_pitch_source_2_index` | int | R/W | Yes | The index of the available sources for modulating the Pitch for the second modulation slot |
| `mod_matrix_pitch_source_2_list` | StringVector | R | No | The list of the available sources for modulating the Pitch for the second modulation slot |

### Properties - Modulation Matrix LFO and Shape

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `mod_matrix_lfo_source_index` | int | R/W | Yes | The index of the available sources for modulating the LFO Amount |
| `mod_matrix_lfo_source_list` | StringVector | R | No | The list of the available sources for modulating the LFO Amount |
| `mod_matrix_shape_source_index` | int | R/W | Yes | The index of the available sources for modulating Shape |
| `mod_matrix_shape_source_list` | StringVector | R | No | The list of the available sources for modulating Shape |

### Properties - Modulation Matrix Custom Sources and Targets

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `mod_matrix_source_1_index` | int | R/W | Yes | The index of the available sources for the first custom modulation slot |
| `mod_matrix_source_1_list` | StringVector | R | No | The list of the available sources for the first custom modulation slot |
| `mod_matrix_source_2_index` | int | R/W | Yes | The index of the available sources for the second custom modulation slot |
| `mod_matrix_source_2_list` | StringVector | R | No | The list of the available sources for the second custom modulation slot |
| `mod_matrix_source_3_index` | int | R/W | Yes | The index of the available sources for the third custom modulation slot |
| `mod_matrix_source_3_list` | StringVector | R | No | The list of the available sources for the third custom modulation slot |
| `mod_matrix_target_1_index` | int | R/W | Yes | The index of the available targets for the first custom modulation slot |
| `mod_matrix_target_1_list` | StringVector | R | No | The list of the available targets for the first custom modulation slot |
| `mod_matrix_target_2_index` | int | R/W | Yes | The index of the available targets for the second custom modulation slot |
| `mod_matrix_target_2_list` | StringVector | R | No | The list of the available targets for the second custom modulation slot |
| `mod_matrix_target_3_index` | int | R/W | Yes | The index of the available targets for the third custom modulation slot |
| `mod_matrix_target_3_list` | StringVector | R | No | The list of the available targets for the third custom modulation slot |

### Properties - Voice and MIDI Parameters

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `pitch_bend_range` | int | R/W | Yes | The amount for the MIDI Pitch Bend range in semitones |
| `voice_count_index` | int | R/W | Yes | The index of the voice count parameter |
| `voice_count_list` | StringVector | R | No | The list of available voice count settings |
| `voice_mode_index` | int | R/W | Yes | The index of the voice mode utilized by Drift |
| `voice_mode_list` | StringVector | R | No | The list of available voice modes |

---

## MeldDevice

This class represents an instance of a Meld device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Meld)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_engine` | int | R/W | Yes | Meld's oscillator engine selector: 0=Engine A, 1=Engine B |
| `mono_poly` | int | R/W | Yes | Selects the polyphony mode: 0=mono, 1=poly |
| `poly_voices` | int | R/W | Yes | Polyphony voice count: 0=two, 1=three, 2=four, 3=five, 4=six, 5=eight, 6=twelve |
| `unison_voices` | int | R/W | Yes | Unison voice count: 0=off, 1=two, 2=three, 3=four |

---

## RoarDevice

This class represents an instance of a Roar device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Roar)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `routing_mode_index` | int | R/W | Yes | The index of the routing mode utilized by Roar |
| `routing_mode_list` | StringVector | R | No | The list of available routing modes |
| `env_listen` | bool | R/W | Yes | Get, set and observe the Envelope Input Listen toggle |

---

## ShifterDevice

This class represents an instance of the Shifter audio effect in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Shifter)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `pitch_mode_index` | int | R/W | Yes | The current pitch mode index: 0=Internal, 1=MIDI |
| `pitch_bend_range` | int | R/W | Yes | The pitch bend range used in MIDI Pitch Mode |

---

## SpectralResonatorDevice

This class represents an instance of a Spectral Resonator device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Spectral Resonator)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `frequency_dial_mode` | int | R/W | Yes | Get, set and observe the Freq control's mode. 0=Hertz, 1=MIDI note values |
| `midi_gate` | int | R/W | Yes | Get, set and observe the MIDI gate switch's state. 0=Off, 1=On |
| `mod_mode` | int | R/W | Yes | Get, set and observe the Modulation Mode. 0=None, 1=Chorus, 2=Wander, 3=Granular |
| `mono_poly` | int | R/W | Yes | Get, set and observe the Mono/Poly switch's state. 0=Mono, 1=Poly |
| `pitch_mode` | int | R/W | Yes | Get, set and observe the Pitch Mode. 0=Internal, 1=MIDI |
| `pitch_bend_range` | int | R/W | Yes | Get, set and observe the Pitch Bend Range |
| `polyphony` | int | R/W | Yes | Get, set and observe the Polyphony. 0=2, 1=4, 2=8, 3=16 voices |

---

## DrumCellDevice

This class represents an instance of a Drum Sampler device within a Drum Rack in Live.

**Canonical Path:** `live_set tracks N devices M drum_pads L chains M devices N` (when device is Drum Sampler)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `gain` | float | R/W | Yes | The sample gain, as normalized value |

---

## PluginDevice

This class represents a VST/AU plug-in device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is a plug-in)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `presets` | StringVector | R | Yes | Get the list of the plug-in's presets |
| `selected_preset_index` | int | R/W | Yes | Get/set the index of the currently selected preset |

### Example

```python
# List presets
for i, preset in enumerate(plugin.presets):
    print(f"{i}: {preset}")

# Change preset
plugin.selected_preset_index = 5
```

---

## MaxDevice

This class represents a Max for Live device in Live.

**Canonical Path:** `live_set tracks N devices M` (when device is Max for Live)

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `audio_inputs` | list[DeviceIO] | R | Yes | List of the audio inputs that the MaxDevice offers |
| `audio_outputs` | list[DeviceIO] | R | Yes | List of the audio outputs that the MaxDevice offers |
| `midi_inputs` | list[DeviceIO] | R | Yes | List of the MIDI inputs that the MaxDevice offers (since Live 11.0) |
| `midi_outputs` | list[DeviceIO] | R | Yes | List of the MIDI outputs that the MaxDevice offers (since Live 11.0) |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `get_bank_count()` | None | int | Returns the number of parameter banks |
| `get_bank_name(bank_index)` | bank_index [int] | list[symbol] | Retrieves the name of the parameter bank at the specified index |
| `get_bank_parameters(bank_index)` | bank_index [int] | list[int] | The indices of the parameters contained in the bank specified by bank_index. Empty slots are marked as -1. Bank index -1 refers to the 'Best of' bank |

---

## DeviceIO Class

This class represents an input or output bus of a Max for Live device.

**Canonical Path:** `live_set tracks N devices M audio_inputs L` (or audio_outputs, midi_inputs, midi_outputs)

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `routing_type` | dict | R/W | Yes | The current routing type for this input/output bus. Contains `display_name` [symbol] and `identifier` [symbol] |
| `routing_channel` | dict | R/W | Yes | The current routing channel for this input/output bus. Contains `display_name` [symbol] and `identifier` [symbol] |
| `available_routing_types` | dict | R | Yes | The available types for this input/output bus. Contains list of dictionaries with `display_name` and `identifier` keys |
| `available_routing_channels` | dict | R | Yes | The available channels for this input/output bus. Contains list of dictionaries with `display_name` and `identifier` keys |
| `default_external_routing_channel_is_none` | bool | R/W | No | 1 = the default routing channel for External routing types is none (since Live 11.0) |

---

## RackDevice

This class represents a Live Rack Device (Audio Effect Rack, Instrument Rack, MIDI Effect Rack, or Drum Rack).

**Canonical Path:** `live_set tracks N devices M` (when device is a Rack)

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `chain_selector` | DeviceParameter | R | No | Convenience accessor for the Rack's chain selector |
| `chains` | list[Chain] | R | Yes | The Rack's chains |
| `drum_pads` | list[DrumPad] | R | Yes | All 128 Drum Pads for the topmost Drum Rack. Inner Drum Racks return a list of 0 entries |
| `return_chains` | list[Chain] | R | Yes | The Rack's return chains |
| `visible_drum_pads` | list[DrumPad] | R | Yes | All 16 visible DrumPads for the topmost Drum Rack. Inner Drum Racks return a list of 0 entries |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `can_show_chains` | bool | R | No | 1 = The Rack contains an instrument device that is capable of showing its chains in Session View |
| `has_drum_pads` | bool | R | Yes | 1 = the device is a Drum Rack with pads. A nested Drum Rack is a Drum Rack without pads. Only available for Drum Racks |
| `has_macro_mappings` | bool | R | Yes | 1 = any of a Rack's Macros are mapped to a parameter |
| `is_showing_chains` | bool | R/W | Yes | 1 = The Rack contains an instrument device that is showing its chains in Session View |
| `variation_count` | int | R | Yes | The number of currently stored macro variations (since Live 11.0) |
| `selected_variation_index` | int | R/W | No | Get/set the currently selected variation (since Live 11.0) |
| `visible_macro_count` | int | R | Yes | The number of currently visible macros |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `copy_pad(source_index, destination_index)` | source_index [int], destination_index [int] | None | Copies all content of a Drum Rack pad from a source pad to a destination pad |
| `add_macro()` | None | None | Increases the number of visible macro controls (since Live 11.0) |
| `remove_macro()` | None | None | Decreases the number of visible macro controls (since Live 11.0) |
| `insert_chain(index)` | index [int] (optional) | None | Attempts to insert a new chain at the given index, or at the end of the chain list if no index is provided (since Live 12.3) |
| `randomize_macros()` | None | None | Randomizes the values of eligible macro controls (since Live 11.0) |
| `store_variation()` | None | None | Stores a new variation of the values of all currently mapped macros (since Live 11.0) |
| `recall_selected_variation()` | None | None | Recalls the currently selected macro variation (since Live 11.0) |
| `recall_last_used_variation()` | None | None | Recalls the macro variation that was recalled most recently (since Live 11.0) |
| `delete_selected_variation()` | None | None | Deletes the currently selected macro variation. Does nothing if there is no selected variation (since Live 11.0) |

### RackDevice.View

Represents the view aspects of a Rack Device. Inherits all properties from Device.View.

#### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `selected_drum_pad` | DrumPad | R | Yes | Currently selected Drum Rack pad (Drum Racks only) |
| `selected_chain` | Chain | R | Yes | Currently active chain within the rack |

#### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `drum_pads_scroll_position` | int | R/W | Yes | Lowest row of pads visible (range: 0-28, Drum Racks only) |
| `is_showing_chain_devices` | bool | R | Yes | 1 = devices in the currently selected chain are visible |

---

## Chain Class

This class represents a chain within a Rack Device.

**Canonical Path:** `live_set tracks N devices M chains L`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `devices` | list[Device] | R | Yes | Devices contained in the chain |
| `mixer_device` | ChainMixerDevice | R | No | The chain's mixer device |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `color` | int | R/W | Yes | RGB value of the chain's color in the form 0x00rrggbb (calculated as 2^16 x red + 2^8 x green + blue, where values range 0-255) |
| `color_index` | long | R/W | Yes | Numeric index representing the chain's color selection |
| `is_auto_colored` | bool | R/W | Yes | When enabled, chain inherits the color of its parent track or chain |
| `has_audio_input` | bool | R | No | Indicates presence of audio input capability |
| `has_audio_output` | bool | R | No | Indicates presence of audio output capability |
| `has_midi_input` | bool | R | No | Indicates presence of MIDI input capability |
| `has_midi_output` | bool | R | No | Indicates presence of MIDI output capability |
| `mute` | bool | R/W | Yes | 1 = muted (Chain Activator off) |
| `muted_via_solo` | bool | R | Yes | Reflects mute state resulting from another chain being soloed |
| `name` | unicode | R/W | Yes | Human-readable chain identifier |
| `solo` | bool | R/W | Yes | 1 = soloed (Solo switch on) without affecting other chains |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `delete_device(index)` | index [int] | None | Remove device at specified position |
| `insert_device(device_name, target_index)` | device_name [symbol], target_index [int] (optional) | None | Attempts to insert the device specified by device_name at the given index; applies Live naming conventions (since Live 12.3) |

---

## DrumChain Class

This class represents a Drum Rack device chain in Live. It is a subclass of Chain with additional drum-specific properties.

**Canonical Path:** `live_set tracks N devices M drum_pads L chains M`

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `in_note` | int | R/W | Yes | Get/set the MIDI note that will trigger this chain. The value -1 corresponds to the 'All Notes' setting in the UI (since Live 12.3) |
| `out_note` | int | R/W | Yes | Determines the MIDI note sent to the devices in the chain |
| `choke_group` | int | R/W | Yes | Get/set the chain's choke group |

**Note:** DrumChain inherits all properties, methods, and children from the Chain class.

---

## ChainMixerDevice

This class represents a chain's mixer device in Live.

**Canonical Path:** `live_set tracks N devices M chains L mixer_device`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `sends` | list[DeviceParameter] | R | Yes | Send controls (Audio Effect Racks and Instrument Racks only; empty for Drum Racks) |
| `chain_activator` | DeviceParameter | R | No | Enables/disables the chain |
| `panning` | DeviceParameter | R | No | Panning control (Audio Effect Racks and Instrument Racks only) |
| `volume` | DeviceParameter | R | No | Volume control (Audio Effect Racks and Instrument Racks only) |

---

## DrumPad Class

This class represents a Drum Rack pad in Live.

**Canonical Path:** `live_set tracks N devices M drum_pads L`

### Children

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `chains` | list[Chain] | R | Yes | Chains contained in the drum pad |

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `mute` | bool | R/W | Yes | 1 = muted |
| `name` | symbol | R | Yes | Name of the drum pad |
| `note` | int | R | No | MIDI note number assigned to this pad |
| `solo` | bool | R/W | Yes | 1 = soloed (Solo switch on). Does not automatically turn Solo off in other chains |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `delete_all_chains()` | None | None | Deletes all chains from the drum pad |

---

## Device.View (Base Class)

Base view class for all device views. All specialized Device.View classes inherit these properties.

**Canonical Path:** `live_set tracks N devices M view`

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `is_collapsed` | bool | R/W | Yes | 1 = the device is shown collapsed in the device chain |
