# Drum production system

Use this reference after the groove and form hypothesis exists. Device availability
and readback in the current Set outrank any preferred chain below.

## Routing

Group or bus drum roles when Live and the available tools support it safely. A useful
conceptual routing tree is:

- foundation bus: kick and low support, mostly dry;
- body bus: clap/snare/toms and core percussion;
- tops bus: hats, shaker, ride, bright percussion;
- transition bus: crash, reverse, noise, impacts;
- drum master bus: conservative glue and shared tone.

If group creation or routing is unavailable, approximate the system with consistent
per-track chains and shared return tracks. Never invent successful routing: inspect
input/output properties and read them back.

## Processing order and intent

Choose only stages that solve an audible or structural problem.

1. **Source shaping:** sample/rack tuning, start, length, decay, pitch envelope.
2. **Corrective tone:** remove rumble, harsh resonance, or unnecessary low end.
3. **Dynamics:** transient control or compression for a stated purpose.
4. **Saturation:** add harmonics/body; compensate output before comparison.
5. **Bus glue:** gentle shared motion, not rescue processing.
6. **Spatial effects:** usually returns; inserts only when the role needs commitment.

Parallel saturation is preferable when full-series drive destroys attack. Keep kick
sub energy mono and effects returns filtered so reverb/delay do not refill intentional
low-end gaps.

## Logical automation targets

Automate parameters whose motion changes musical expectation:

- closed/open-hat decay: shorten before a tight drop; lengthen through a build;
- ride/crash decay or sample length: bloom at macro arrivals, clear before the kick;
- drum-rack macro controlling brightness or decay across related voices;
- filter cutoff/resonance: spectral reveal or withdrawal over 8/16/32 bars;
- saturation drive with output compensation: rising density without fake loudness;
- reverb send: throw the final clap/fill hit, then return dry on the downbeat;
- delay send/feedback: isolated rhythmic tail, never continuous low-end fog;
- room size/decay: widen breaks, contract before impact;
- transient amount/compressor threshold: section contrast, used conservatively;
- shaker/hat velocity or device gain: gradual lift that culminates at a variation.

Prefer one or two coordinated automation stories per section. Too many simultaneous
ramps erase causality and make later revision impossible.

## Phrase-synchronous gestures

- 8 bars: small hat-decay lift, one filtered fill, final-hit reverb throw.
- 16 bars: tops bus brightness ramp, percussion send growth, progressive ghost density.
- 32 bars: broad spectral opening, bus drive evolution, complete spatial transition.

End a ramp on the event it explains. After the landing, reset or establish the new
state deliberately; do not leave a parameter at an accidental extreme.

## Transitions and FX

- Reverse: derive from a crash/clap/impact when possible so the timbre predicts the hit.
- Crash: reserve for meaningful arrivals; layer only if body and air have distinct jobs.
- Noise rise/downlift: filter and automate gain; remove lows; stop exactly at impact.
- Fill: transform an existing role before importing unrelated material.
- Silence: mute kick, bass, or tops for a musically counted gap; verify the gap survives.
- Reverb throw: one selected hit into a filtered return, followed by dry downbeat space.

Transitions should spend energy, not add permanent density.

## Verification

After each persistent mutation, re-read the Set and affected object. For MIDI, use
exact clip-note readback. For device parameters and automation, inspect parameter
values and envelopes. For routing, inspect the actual targets. For sonic judgements,
capture real audio and compare level-matched sections; otherwise describe only the
programmed state, not what was supposedly heard.
