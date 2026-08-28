# LOM capability map — what a musician can ask for

Deep-read synthesis of the `ableton-lom` skill references (all 6,015 lines), cross-checked
against the actual MCP tool schemas in `.venv/.../server.py`, the Remote Script bridge, and
the official LOM docs (https://docs.cycling74.com/apiref/lom/). Produced 2026-08-28 to
ground the superwhisper "Ableton ITA" voice mode; also the source of truth for the planned
LOM-tracer M4L device.

Verdicts: **POSSIBLE** / **PARTIAL** (works with the stated caveat) / **IMPOSSIBLE** (LOM
itself has no path — not a docs gap; the coverage audit mirrors all 45 official LOM pages).

## Transport & global

- Tempo (20–999 BPM), tap tempo, metronome, time signature — POSSIBLE. Count-in duration is read-only.
- Play/stop/continue, seek, session vs arrangement playback, `back_to_arranger` (global & per-track) — POSSIBLE.
- Arrangement loop region (`loop`, `loop_start`, `loop_length`) — POSSIBLE.
- Locators/cue points — PARTIAL: create/toggle only at the current playhead (`set_or_delete_cue`); `CuePoint.time` read-only. Rename & jump: POSSIBLE.
- Global launch quantization (14 values), MIDI record quantization — POSSIBLE.
- Swing — PARTIAL: `swing_amount` affects only record-quantize and explicit `quantize` calls, not global playback.
- Groove pool — PARTIAL: edit existing grooves (timing/velocity/random/base grid) and assign to clips; cannot create/import/extract grooves.
- Song scale/key (Live 12): `root_note`, `scale_name`, `scale_mode` — POSSIBLE (`scale_intervals` read-only). Per-clip scale: unverified, probe at runtime.
- Tuning — PARTIAL: modify the active tuning only; cannot load .ascl/.tun.
- Link / tempo follower toggles — POSSIBLE.

## Tracks

- Create MIDI/audio track at index, return track (end only); delete, duplicate; rename, color (snaps to palette) — POSSIBLE.
- Arm, mute, solo (solo bypasses exclusive logic); volume/pan/sends/activator/crossfade assign — POSSIBLE (normalized values, not dB — read `display_value` to confirm).
- I/O routing incl. Resampling, Ext. In, track-to-track — POSSIBLE, only from `available_*_routing_types/channels` entries.
- Monitoring In/Auto/Off — PARTIAL: `current_monitoring_state` absent from the reference; probe first.
- Freeze/unfreeze/flatten — IMPOSSIBLE (`is_frozen` read-only).
- Group tracks: read/fold only; create/ungroup/add — IMPOSSIBLE. Reorder tracks — IMPOSSIBLE (only devices can be moved).
- Take lanes: create lane + clips — POSSIBLE; comping — IMPOSSIBLE.
- Master: volume/cue/crossfader — POSSIBLE; master mute/solo/routing — IMPOSSIBLE.

## Recording (largely POSSIBLE — a common misconception)

- Audio from mic/input into a Session slot: arm audio track + set input routing + fire empty slot; `fire(record_length)` records N beats then plays — POSSIBLE.
- MIDI from a keyboard: same on armed MIDI track — POSSIBLE.
- `trigger_session_record(length)`, session overdub, `session_record_status` — POSSIBLE.
- Arrangement record (`record_mode`), overdub, punch in/out — POSSIBLE.
- Automation recording (`session_automation_record`), `re_enable_automation()` — POSSIBLE.
- Capture MIDI (`capture_midi`, gated by `can_capture_midi`) — POSSIBLE.
- Resampling — POSSIBLE (input routing = Resampling, record).
- Real constraints: audio interface/preferences not settable via LOM; recording is wall-clock real time; recorded file name/location not controllable; frozen/recording tracks refuse new clips.

## MIDI clips

- Create in slot or Arrangement, delete, duplicate (to slot / to arrangement position; occupied slot is overwritten) — POSSIBLE.
- Notes add/read/update/remove with pitch, start, duration, velocity, mute, **probability**, **velocity_deviation**, release_velocity — POSSIBLE. (Add schema: pitch/start/duration/velocity/mute; probability etc. via update.)
- Quantize (whole clip or single pitch, strength 0–1), transpose, duplicate region/loop — POSSIBLE.
- Loop on/off, loop points, start/end markers, crop; `length` itself read-only (move loop end) — POSSIBLE.
- Name, color, clip mute, launch mode, per-clip launch quantization, legato, vel→vol, per-clip time signature, per-clip groove — POSSIBLE.
- **Follow actions — IMPOSSIBLE** (not in the LOM at all).
- Move clip to another slot — PARTIAL (duplicate + delete).

## Audio clips

- Create from a file on disk (session slot or arrangement beat position; absolute path) — POSSIBLE.
- Warp on/off, warp mode (from `available_warp_modes`), warp markers add/move/remove — POSSIBLE. Auto-warp / "set 1.1.1 here" — IMPOSSIBLE (emulate with markers).
- Gain (dB string readable), transpose ±48 st, detune ±50 ct — POSSIBLE.
- Unwarped clips: no loop; times in seconds.
- **Reverse — IMPOSSIBLE** at clip level (only `Simpler.reverse()`); slicing — only via Simpler (Transient/Beat/Region/Manual, sensitivity, division, insert/move/clear slices); "slice to new MIDI track" — not exposed.
- Replace a clip's sample — IMPOSSIBLE (`file_path` read-only); make a new clip.

## Scenes

- Create/duplicate/delete, fire (force-legato option), rename, color — POSSIBLE.
- Per-scene tempo & time signature (with their `*_enabled` flags) — POSSIBLE.
- Capture playing clips into new scene — POSSIBLE. Reorder — IMPOSSIBLE (duplicate+delete).

## Arrangement

- Duplicate session clip to arrangement time, create clips directly, edit/delete arrangement clips — POSSIBLE.
- Move/nudge an arrangement clip — PARTIAL (duplicate to new time + delete).
- Split/join/consolidate — IMPOSSIBLE.
- Read song length, position (bars.beats or SMPTE) — POSSIBLE.

## Automation & envelopes

- Clip envelopes on device params and mixer params (volume/pan/sends/activator): read, insert steps, delete range, clear — POSSIBLE (dedicated MCP tools; also velocity→envelope mapping).
- MIDI CC / pitch-bend clip envelopes — do not promise (no documented target).
- Drawing arrangement automation lanes — IMPOSSIBLE; record it live or use clip envelopes on arrangement clips.

## Browser & loading sounds

- Roots: instruments, audio_effects, midi_effects, drums, samples, sounds, packs, plugins, user_library, user_folders, current_project (default set); `max_for_live` and `clips` only if explicitly named in `roots`.
- Search = literal name/path substring scoring — **no semantic search**; "warm 80s pad" must become concrete device/preset names or alternatives to try.
- Load onto a specific track (`target_track`) — POSSIBLE. Third-party VST/AU — POSSIBLE via browser root `plugins` only. M4L devices (e.g. Magenta Studio) — POSSIBLE via `live_load_device` / browser.
- Native Live device by name at a chain position — POSSIBLE (`insert_device`, Live 12.3+, native only); otherwise load-then-`Song.move_device`.
- Preview/audition before loading — POSSIBLE (`live_browser_preview`; keeps playing until stopped).
- Hot-swap — PARTIAL: UI mode via `toggle_browse()` after selecting the device; fragile, prefer fresh loads.
- `find_similar_sounds` — Live 12+ local analysis DB, samples/sounds browsing aid only.
- Load a Set / install packs / rescan plugins / create browser folders — IMPOSSIBLE.

## Devices

- Enumerate (name, class_name, type), delete, rename, move/reorder anywhere (incl. across tracks/into racks via `Song.move_device`) — POSSIBLE. Duplicate a device — IMPOSSIBLE (re-create + copy params).
- On/off — PARTIAL: `is_active` read-only; set the "Device On" parameter instead.
- Parameters: list/get/set every *automatable* param (min/max/quantized; enum via `value_items` index) — POSSIBLE. Set-by-display-string ("800 Hz", "-6 dB") — PARTIAL: write normalized value, verify via `display_value`.
- Hidden VST/AU params, plugin Configure mode, plugin GUIs — IMPOSSIBLE. Plugin's own preset list: readable + `selected_preset_index` settable.
- Save presets to User Library — IMPOSSIBLE (A/B compare slot and rack macro variations are the near-substitutes).

## Racks & specialized devices

- Rack macros = normal parameters; add/remove macro, `randomize_macros()`, macro **variations** (store/recall/delete) — POSSIBLE. Mapping macros to params — IMPOSSIBLE (existence readable only).
- Chains: list/rename/color/mute/solo, chain mixer, `insert_chain`, `chain.insert_device` (12.3+, native only), chain selector — POSSIBLE. Group existing devices into a rack — IMPOSSIBLE (load empty rack + move_device).
- Deep dedicated classes: **Simpler** (playback modes, slicing, crop/reverse/warp, sample markers), **Drum Rack** (128 pads, choke groups, in/out notes, copy_pad; pad devices via chain), **Wavetable** (wavetable selection, mod matrix read/write), **Compressor** (real sidechain routing — the only device with it), **EQ Eight** (bands are generic params + global mode), **Hybrid Reverb** (IR selection), **Looper** (transport, `export_to_clip_slot`), Drift/Meld/Roar/Shifter/Spectral Resonator.
- Everything else (Operator, Analog, Sampler multisample, classic FX): all knobs settable as generic params; structural editing (Sampler zones) — IMPOSSIBLE.
- M4L devices: params + banks + device-level audio/MIDI routing — POSSIBLE; anything only in their UI — IMPOSSIBLE via LOM.

## Hard limits (the honest "no" list)

Save / Save As / open set / new set; export/render/bounce audio or MIDI; freeze/flatten/
consolidate; import a MIDI file into a clip; follow actions; group/reorder tracks; move
arrangement clips (only dup+delete); destructive sample editing; macro mapping; preset
saving; plugin GUI interaction & unexposed params; semantic browser search; groove
creation/extraction; Live Preferences; count-in setting. Modal dialogs can be read and a
button pressed, but per project rules they are blockers, not tools.

## Project-rule constraints that shape requests (AGENTS.md)

Stock/native preferred (third-party only when named); disposable unsaved Sets, existing
projects only on explicit request; saving is always the user's manual gesture (fixed naming
convention under `~/Music/Ableton/Projects/`); one driver, sequential calls, preflight +
signature guard + readback per mutation; prefer variations (duplicate, undo) over
destruction; "fammi sentire" → fire, verify, stop on request.
