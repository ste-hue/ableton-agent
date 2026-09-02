# Rudiment Drum Arranger — Max for Live source

This folder contains a fully local Max for Live implementation. The musical
engine runs inside `node.script`; LiveAPI writes the result into the open Live
Set. No browser, web server, MCP server or internet connection is required.

## LOAD ARRANGEMENT workflow

1. Open `RudimentDrumArranger.maxpat` in Max from a Max MIDI Effect.
2. Press **GENERATE**. The bundled engine creates a new seed and a local payload.
3. Press **LOAD ARRANGEMENT**.

The adapter creates one MIDI track for every enabled kit family, inserts an
Arrangement View clip at beat zero, writes the notes with their exact MIDI
pitch/velocity/duration, and attempts to insert the configured native Live
device.

## Device boundary

Live 12.3+ can insert native Live devices by their UI name. The API cannot
insert plug-ins or another Max for Live device. Consequently `device-profiles.json`
contains native-device defaults and an explicit fallback. Samples/presets may
still be selected manually after track creation.

## Building the AMXD

Open `RudimentDrumArranger.maxpat` in Max, verify the included files are in the
same project/search path, then use **Save As…** from the Max for Live editor to
create `Rudiment Drum Arranger.amxd`. AMXD files must be created by Max itself.

Required messages to the JS object:

- `read_payload <absolute-json-path>`
- `load_arrangement`
- `start_beat <number>`
- `replace_existing <0|1>`
- `device_profile <profile-name>`

Outlet 0 emits status dictionaries; outlet 1 emits progress from 0 to 1.
