# Device UI specification

Recommended device width: 1100 px, height: 420 px.

## Header

- RUDIMENT logotype
- connection indicator (`READY`, `NO PAYLOAD`, `LOADING`, `DONE`, `ERROR`)
- generated seed and total bars

## Left: musical payload

- style, BPM and arrangement length
- enabled kit-family pills
- fill genome and Pausona summary
- `READ PAYLOAD` file chooser

## Center: track plan

One row per enabled family, including Shaker as an independent seventh track:

- track name
- MIDI note/pad mapping
- note count
- selected native device
- mapping validation indicator

## Right: Live destination

- start beat (default `0`)
- device profile
- replace tracks carrying the same Rudiment ID
- **LOAD ARRANGEMENT** primary button
- progress bar and operation log

The button must remain disabled until every note is within MIDI 0–127, every
track has a unique family key, and the payload schema is supported.
