# Official LOM Coverage Checklist

This checklist maps the Cycling '74 Live Object Model index (Live 12.3.x) to this skill's reference files. It is intended as an audit aid: every official API object/root path listed at <https://docs.cycling74.com/apiref/lom/> has an explicit home in the skill.

| Official LOM object | Skill reference |
|---|---|
| Application | `references/views.md` |
| Application.View | `references/views.md` |
| Chain | `references/rack.md`, `references/device.md`, `references/specialized-devices.md` |
| ChainMixerDevice | `references/rack.md`, `references/device.md`, `references/specialized-devices.md` |
| Clip | `references/clip.md` |
| Clip.View | `references/clip.md`, `references/views.md` |
| ClipSlot | `references/clip.md`, `references/session.md` |
| CompressorDevice | `references/specialized-devices.md`, `references/device.md` |
| ControlSurface | `references/control-surface.md` |
| CuePoint | `references/song.md`, `references/session.md` |
| Device | `references/device.md` |
| Device.View | `references/device.md`, `references/views.md` |
| DeviceIO | `references/device.md`, `references/specialized-devices.md` |
| DeviceParameter | `references/device.md` |
| DriftDevice | `references/specialized-devices.md`, `references/device.md` |
| DrumCellDevice | `references/specialized-devices.md`, `references/device.md` |
| DrumChain | `references/rack.md`, `references/device.md`, `references/specialized-devices.md` |
| DrumPad | `references/rack.md`, `references/device.md`, `references/specialized-devices.md` |
| Eq8Device | `references/specialized-devices.md`, `references/device.md` |
| Eq8Device.View | `references/specialized-devices.md`, `references/views.md`, `references/device.md` |
| Groove | `references/grooves-tuning.md`, `references/song.md` |
| GroovePool | `references/grooves-tuning.md`, `references/song.md` |
| HybridReverbDevice | `references/specialized-devices.md`, `references/device.md` |
| LooperDevice | `references/specialized-devices.md`, `references/device.md` |
| MaxDevice | `references/device.md`, `references/specialized-devices.md` |
| MeldDevice | `references/specialized-devices.md`, `references/device.md` |
| MixerDevice | `references/track.md`, `references/device.md` |
| PluginDevice | `references/device.md`, `references/specialized-devices.md` |
| RackDevice | `references/rack.md`, `references/device.md`, `references/specialized-devices.md` |
| RackDevice.View | `references/rack.md`, `references/views.md`, `references/device.md` |
| RoarDevice | `references/specialized-devices.md`, `references/device.md` |
| Sample | `references/specialized-devices.md` |
| Scene | `references/session.md` |
| ShifterDevice | `references/specialized-devices.md`, `references/device.md` |
| SimplerDevice | `references/specialized-devices.md`, `references/device.md` |
| SimplerDevice.View | `references/specialized-devices.md`, `references/views.md`, `references/device.md` |
| Song | `references/song.md` |
| Song.View | `references/song.md`, `references/views.md` |
| SpectralResonatorDevice | `references/specialized-devices.md`, `references/device.md` |
| TakeLane | `references/track.md` |
| this_device | `SKILL.md` canonical path note; resolves to the containing `Device`, documented in `references/device.md` |
| Track | `references/track.md` |
| Track.View | `references/track.md`, `references/views.md` |
| TuningSystem | `references/grooves-tuning.md`, `references/song.md` |
| WavetableDevice | `references/specialized-devices.md`, `references/device.md` |

## Verification command

A local audit fetched the official LOM index and each object page, extracted every official child/property/function heading, and verified that every extracted API member name appears in the skill documentation. Result: **0 missing names across 45 official LOM pages**.

Last run in this working tree:

```bash
$ python3 scripts/audit_lom_coverage.py
{
  "official_pages": 45,
  "missing_member_names": []
}
```
