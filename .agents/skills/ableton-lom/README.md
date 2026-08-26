# Ableton Live Object Model (LOM) Skill

A comprehensive API reference skill for [Claude Code](https://claude.ai/code) that documents the Ableton Live Object Model (LOM) API surface for Remote Script development.

Covers the **Cycling '74 Live 12.3.x LOM reference** at the object/member level: all official LOM object pages/root paths and their documented children, properties, and functions are represented, with common Remote Script patterns and examples. This is not a verbatim mirror of every paragraph from the Cycling '74 docs.

## Installation

```bash
npx skills add mikecfisher/ableton-lom-skill
```

## What's Included

| Reference | Description |
|-----------|-------------|
| `song.md` | Song, transport, tempo, loops, cue points, time signatures |
| `track.md` | Track, MixerDevice, routing, meters, TakeLane |
| `clip.md` | Clip, MIDI notes, warping, automation, playback |
| `device.md` | Device, DeviceParameter, automation states |
| `specialized-devices.md` | Simpler, Wavetable, Looper, Compressor, EQ8, Drift, Meld, etc. |
| `rack.md` | RackDevice, Chain, DrumPad, DrumChain, macros, variations |
| `session.md` | Scene, ClipSlot, launching, recording |
| `views.md` | Application.View, Song.View, Track.View, Clip.View, Device.View |
| `browser.md` | Browser navigation, loading instruments/effects/samples |
| `control-surface.md` | ControlSurface, MIDI controls, SysEx, grab/release APIs |
| `grooves-tuning.md` | GroovePool, Groove, TuningSystem |
| `lom-coverage.md` | Official Cycling '74 LOM object coverage checklist |

## Usage

Once installed, Claude Code will automatically use this skill when working with:

- Ableton Live Remote Scripts
- Control surface development
- MCP servers for Ableton
- Any Python code interfacing with Live's internal API

## Example

```python
from _Framework.ControlSurface import ControlSurface

class MyScript(ControlSurface):
    def __init__(self, c_instance):
        ControlSurface.__init__(self, c_instance)
        self._song = self.song()

        # Access tempo
        self._song.tempo = 120.0

        # Create a MIDI track
        self._song.create_midi_track(-1)

        # Fire a clip
        track = self._song.tracks[0]
        track.clip_slots[0].fire()
```

## API Coverage

Coverage is audited against [Cycling '74's LOM index](https://docs.cycling74.com/apiref/lom/):

- **45 official LOM API objects/root paths** mapped to skill reference files, including `this_device`
- **0 missing API member names** in the latest local audit (`scripts/audit_lom_coverage.py`)
- Children, properties, and functions documented with types, access modes, observable status, parameters, and return types where available
- Common Remote Script patterns and code examples throughout

See [`references/lom-coverage.md`](references/lom-coverage.md) for the object-by-object coverage map.

## Sources

Documentation compiled from [Cycling '74's Live Object Model reference](https://docs.cycling74.com/apiref/lom/) for Max for Live, which currently covers Live 12.3.x. Additional Remote Script/Python usage notes and examples are included where useful.

## License

MIT
