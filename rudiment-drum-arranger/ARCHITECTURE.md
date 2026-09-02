# Architecture notes

Generation follows one direction of authority:

`Narrative form → core groove DNA → add/subtract layers → fill genealogy → tom/rim and rudiment detail → timing → kit policy → MIDI tracks`

The preview synth and export renderer consume the generated tracks. They never
modify the composition. The Ableton/MCP adapter is similarly downstream and is
kept inactive until a connected implementation is supplied.

## Safe iteration points

- Add styles and archetypes in `core-config.js`.
- Change song form and pattern rendering in `arrangement-engine.js`.
- Add fill families only through `makeFillGenome`; keep derivation measure-based.
- Add rudiments only inside the section theory budget.
- Add preview timbres without changing MIDI roles or timing.
- Implement Ableton behavior behind `AbletonMcpAdapter`, not in the engine.

