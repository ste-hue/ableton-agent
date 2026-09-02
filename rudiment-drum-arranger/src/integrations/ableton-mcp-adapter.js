/**
 * Boundary for a future Ableton Live / MCP integration.
 *
 * The browser app deliberately has no transport or filesystem authority in
 * Ableton. An MCP implementation can replace this adapter without coupling
 * Live-specific concerns to the musical engines.
 */
const AbletonMcpAdapter = Object.freeze({
  status: "placeholder",
  capabilities: [
    "inspect-drum-rack",
    "place-clips-in-arrangement-view",
    "apply-stock-groove-to-eligible-non-kick-tracks",
  ],
  async inspectDrumRack() {
    throw new Error("Ableton/MCP adapter is not connected.");
  },
  async placeArrangement() {
    throw new Error("Ableton/MCP adapter is not connected.");
  },
  buildLivePayload(config, arrangement) {
    const familyByLabel = Object.fromEntries(
      Object.entries(KIT_DEFS).map(([key, definition]) => [definition.label, key]),
    );
    const colorByFamily = {
      kick: 0xdfff4f,
      snare: 0xff7658,
      hats: 0x64e4d1,
      shaker: 0xb5eadf,
      perc: 0x9b86ff,
      toms: 0xffad58,
      cymbals: 0xf4f3ee,
    };
    const deviceByFamily = Object.fromEntries(
      Object.keys(KIT_DEFS).map((key) => [key, "Drum Rack"]),
    );
    return {
      schema: "rudiment.live-arrangement/v1",
      id: `rudiment-${config.seed}`,
      name: `Rudiment ${config.style} ${config.seed}`,
      seed: config.seed,
      tempo: config.bpm,
      deviceProfile: config.device,
      musicalGrammar: arrangement.patternGrammar,
      arrangement: {
        startBeat: 0,
        lengthBeats: arrangement.totalBars * 4,
        tracks: arrangement.tracks.map((track) => {
          const label = track.name.replace("DRUMS — ", "");
          const family = familyByLabel[label];
          if (!family) throw new Error(`Unknown kit family: ${label}`);
          return {
            family,
            label,
            color: colorByFamily[family],
            nativeDevice: deviceByFamily[family],
            notes: track.notes.map((note) => ({
              pitch: note.note,
              start: note.tick / PPQ,
              duration: note.duration / PPQ,
              velocity: note.velocity,
            })),
          };
        }),
      },
    };
  },
});
