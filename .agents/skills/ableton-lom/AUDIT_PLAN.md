# Ableton LOM Skill Audit & Gap Analysis

**Audit Date:** 2026-01-25
**Official Docs Version:** Live 12.3b9
**Skill Target Version:** Live 12.3

---

## Executive Summary

This audit compares the skill's documentation against the official Cycling '74 Live Object Model documentation. The skill has good coverage of core classes but has several gaps in:

1. **Missing classes** - ControlSurface, Browser (official API)
2. **Incomplete property coverage** - Several observable flags missing
3. **Missing functions** - Some class methods not documented
4. **Accuracy issues** - Some access modes incorrectly documented

---

## Gap Analysis by Class

### 1. Application Class (HIGH PRIORITY)

**Location:** `references/views.md` (Application section)

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Child | `control_surfaces` - list of ControlSurface | read-only, observable |
| Missing Observable | `open_dialog_count` not marked observable | Should be observable |
| Missing Property | `average_process_usage` | float, read-only, observable |
| Missing Property | `peak_process_usage` | float, read-only, observable |

**Recommendation:** Create dedicated `references/application.md` with complete Application class.

---

### 2. ControlSurface Class (NEW CLASS NEEDED)

**Location:** Not documented in skill

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Class | Entire ControlSurface class | Canonical path: `control_surfaces N` |
| Missing Property | `pad_layout` | symbol, read-only, observable |
| Missing Functions | `get_control`, `get_control_names`, `grab_control`, `grab_midi`, `register_midi_control`, `release_control`, `release_midi`, `send_midi`, `send_receive_sysex` | All documented |

**Recommendation:** Create `references/control-surface.md`.

---

### 3. Song Class (MEDIUM PRIORITY)

**Location:** `references/song.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Property | `visible_tracks` | list of Track, read-only, observable |
| Incomplete Function List | Only ~20 functions documented | 34 total functions |
| Missing Function | `find_device_position(device, target, target_position)` | Returns int |
| Missing Function | `move_device(device, target, target_position)` | Returns int |

**Recommendation:** Add missing properties and complete function list.

---

### 4. Track Class (LOW PRIORITY)

**Location:** `references/track.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Observable Accuracy | `fold_state` marked R/W but not observable | Correct per docs |
| Coverage | Good - most properties documented | ✓ |

**Recommendation:** Minor corrections to observable flags.

---

### 5. Clip Class (MEDIUM PRIORITY)

**Location:** `references/clip.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Property | `notes` (bang) | read-only, observable - bangs when notes change |
| Observable Mismatch | `is_playing` marked observable | Official says read-write but NOT observable |
| Observable Mismatch | `has_envelopes` not marked observable | Should be observable |
| Observable Mismatch | `end_time` not marked observable | Should be observable |
| Observable Mismatch | `start_time` not marked observable | Should be observable |

**Recommendation:** Fix observable flags and add `notes` bang property.

---

### 6. ClipSlot Class (MEDIUM PRIORITY)

**Location:** `references/session.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Access Mode Error | `has_stop_button` marked R/W | Should be read-only (no observable) |
| Missing Detail | `color` and `color_index` are for Group Track slots only | Add note |

**Recommendation:** Fix access modes and add clarifying notes.

---

### 7. Device Class (LOW PRIORITY)

**Location:** `references/device.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Observable | `parameters` child not marked observable | Should be observable |
| Coverage | Good - all properties documented | ✓ |

**Recommendation:** Add observable flag to parameters child.

---

### 8. DeviceParameter Class (LOW PRIORITY)

**Location:** `references/device.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Function | `__str__()` | Returns symbol - string representation |
| Missing Property Detail | `display_value` | Marked read-write in official docs |
| Coverage | Good overall | ✓ |

**Recommendation:** Add missing function and verify access modes.

---

### 9. Specialized Devices (HIGH PRIORITY)

**Location:** `references/specialized-devices.md`

#### SimplerDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Observable | `multi_sample_mode` | Should be observable |
| Missing Observable | `can_warp_as`, `can_warp_double`, `can_warp_half` | All observable |
| Missing Observable | `playing_position`, `playing_position_enabled` | Both observable |

#### Sample Class
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good - comprehensive | ✓ |

#### WavetableDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Methods | Full modulation matrix API | `add_parameter_to_modulation_matrix`, etc. |
| Coverage | Partial | Needs expansion |

#### LooperDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good | ✓ |

#### CompressorDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Basic sidechain routing only | May need expansion |

#### Eq8Device
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing View | `Eq8Device.View.selected_band` | int, R/W, observable |

#### HybridReverbDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good | ✓ |

#### DriftDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Properties | Full mod matrix property list | Need to verify against official |

#### PluginDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Basic | May need expansion |

#### MaxDevice
| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good | ✓ |

**Recommendation:** Update observable flags and expand WavetableDevice/DriftDevice sections.

---

### 10. RackDevice Class (LOW PRIORITY)

**Location:** `references/rack.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing View | `RackDevice.View.is_showing_chains` | Already in main class? Verify |
| Coverage | Good | ✓ |

**Recommendation:** Verify view class properties.

---

### 11. Chain Class (LOW PRIORITY)

**Location:** `references/rack.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Observable | `muted_via_solo` | Should be observable in skill |
| Coverage | Good | ✓ |

**Recommendation:** Add observable flag.

---

### 12. DrumChain Class (LOW PRIORITY)

**Location:** `references/rack.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good - all 3 unique properties documented | ✓ |

---

### 13. DrumPad Class (LOW PRIORITY)

**Location:** `references/rack.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good | ✓ |

---

### 14. ChainMixerDevice Class (LOW PRIORITY)

**Location:** `references/rack.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Observable | `sends` not marked observable | Should be observable |
| Coverage | Good | ✓ |

---

### 15. MixerDevice Class (LOW PRIORITY)

**Location:** `references/track.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Observable | `sends` not marked observable | Should be observable |
| Missing Property | `panning_mode` | int, R/W, observable (0=Stereo, 1=Split Stereo) |
| Coverage | Good overall | ✓ |

**Recommendation:** Add observable flag and panning_mode.

---

### 16. Scene Class (LOW PRIORITY)

**Location:** `references/session.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Child | `clip_slots` not marked observable | Should be observable |
| Coverage | Good | ✓ |

---

### 17. CuePoint Class (LOW PRIORITY)

**Location:** `references/song.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good | ✓ |

---

### 18. TakeLane Class (LOW PRIORITY)

**Location:** `references/track.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Observable | `arrangement_clips` not marked observable | Should be observable |
| Coverage | Good | ✓ |

---

### 19. GroovePool & Groove Classes (MEDIUM PRIORITY)

**Location:** `references/grooves-tuning.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Missing Observable | `grooves` not marked observable on GroovePool | Should be observable |
| Coverage | Good | ✓ |

---

### 20. TuningSystem Class (MEDIUM PRIORITY)

**Location:** `references/grooves-tuning.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Coverage | Good | Verify against official |

---

### 21. Browser & BrowserItem Classes (HIGH PRIORITY)

**Location:** `references/browser.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Not Verified | Browser class not in official LOM docs | May be internal API |
| Missing Methods | Full method signatures | Need official verification |

**Recommendation:** Verify Browser API against actual behavior; note if unofficial.

---

### 22. View Classes (MEDIUM PRIORITY)

**Location:** `references/views.md`

| Gap Type | Detail | Official Docs |
|----------|--------|---------------|
| Application.View | Need to verify all methods | 404 on direct URL |
| Song.View | Need to verify all properties | 404 on direct URL |
| Track.View | Coverage good | ✓ |
| Clip.View | Coverage good | ✓ |
| Device.View | Coverage good | ✓ |
| Eq8Device.View | Missing `selected_band` | int, R/W, observable |
| SimplerDevice.View | Missing `selected_slice` | int, R/W, observable |

**Recommendation:** Add specialized device view classes.

---

## Implementation Plan

### Phase 1: High Priority (Parallel Agents)

**Agent 1: Create ControlSurface Reference**
- Create `references/control-surface.md`
- Document all properties, methods, pad_layout values
- Add code examples for grab_control/release_control patterns

**Agent 2: Update Application Class**
- Add `control_surfaces` child to documentation
- Add `average_process_usage` and `peak_process_usage` properties
- Fix observable flags
- Consider creating dedicated `references/application.md`

**Agent 3: Update Specialized Devices**
- Fix all observable flags in SimplerDevice
- Add Eq8Device.View and SimplerDevice.View sections
- Expand WavetableDevice modulation matrix API
- Expand DriftDevice mod matrix properties

**Agent 4: Verify Browser API**
- Document that Browser may be unofficial/internal API
- Add appropriate caveats to browser.md
- Verify methods against actual behavior

### Phase 2: Medium Priority (Parallel Agents)

**Agent 5: Update Song Class**
- Add `visible_tracks` property
- Add missing functions: `find_device_position`, `move_device`
- Complete the full 34-function list

**Agent 6: Fix Clip Class**
- Add `notes` bang property
- Fix all observable flags
- Verify is_playing access mode

**Agent 7: Fix ClipSlot Class**
- Fix `has_stop_button` access mode
- Add notes about Group Track slot behavior
- Update color/color_index documentation

**Agent 8: Update View Classes**
- Add Eq8Device.View section with selected_band
- Add SimplerDevice.View section with selected_slice
- Verify Application.View and Song.View methods

### Phase 3: Low Priority (Parallel Agents)

**Agent 9: Fix Observable Flags Across All Files**
- MixerDevice.sends
- ChainMixerDevice.sends
- Device.parameters
- Scene.clip_slots
- TakeLane.arrangement_clips
- GroovePool.grooves

**Agent 10: Minor Corrections**
- Track class observable flags
- Chain.muted_via_solo observable
- DeviceParameter.__str__() method
- MixerDevice.panning_mode property

---

## Priority Summary

| Priority | Classes/Changes | Agent Count |
|----------|----------------|-------------|
| HIGH | ControlSurface (new), Application, Specialized Devices, Browser verification | 4 agents |
| MEDIUM | Song, Clip, ClipSlot, View classes, GroovePool/Groove | 4 agents |
| LOW | Observable flags, minor corrections | 2 agents |

---

## Success Criteria

1. **100% Class Coverage** - All LOM classes documented
2. **100% Property Accuracy** - Correct types, access modes, observable flags
3. **100% Function Coverage** - All methods with parameters and return types
4. **Verified Against Official Docs** - Every property cross-referenced
5. **Clear Unofficial API Markers** - Browser and other unofficial APIs noted

---

## Notes

- Some official doc URLs returned 404 (Application.View, Song.View, SongView, ApplicationView)
- These view classes are documented as sub-objects of their parent classes
- Browser class may not be in official LOM docs but is accessible via Python API
- The skill should note which APIs are officially documented vs discovered/unofficial
