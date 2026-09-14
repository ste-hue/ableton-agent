"use strict";

const vm = require("node:vm");

// Requests are data, never executable fragments. The provider verifies bundle
// bytes before reaching here; node:vm is not a sandbox for untrusted source.
const generate = new vm.Script(`
  if (HouseEngine.version !== 23 || HouseArranger.version !== 6 ||
      HouseEngine.SCALER_SETS.length !== 0 ||
      typeof SCALER_LIBRARY !== 'undefined' || typeof SCALER_CHORD_SETS !== 'undefined') {
    throw new Error('Unexpected Chordarium engine exports or embedded catalogs');
  }
  const request = JSON.parse(requestJson);
  const config = HouseEngine.config(request.config);
  const phrase = HouseEngine.generate(null, config, { rhythm: 0, harmony: 0, voicing: 0 });
  const section = request.section === 'phrase' ? null :
    HouseArranger.derive(phrase, config, request.section, 0, config.length);
  resultJson = JSON.stringify({
    config, events: section ? section.events : phrase.events, harmony: phrase.harmony.events
  });
`, { filename: "chordarium-compose.js" });

function runEngine(bundle, request, { initializeTimeoutMs = 1000, generateTimeoutMs = 1000 } = {}) {
  const context = vm.createContext({ requestJson: JSON.stringify(request) }, {
    codeGeneration: { strings: false, wasm: false },
  });
  new vm.Script(bundle, { filename: "chordarium-engine.generated.js" })
    .runInContext(context, { timeout: initializeTimeoutMs });
  generate.runInContext(context, { timeout: generateTimeoutMs });
  return JSON.parse(context.resultJson);
}

module.exports = { runEngine };
