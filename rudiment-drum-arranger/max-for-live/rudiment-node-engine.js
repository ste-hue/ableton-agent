const maxApi = require("max-api");
const fs = require("fs");
const os = require("os");
const path = require("path");
const engine = require("./rudiment-engine-bundle.js");

let config = engine.getConfig();
const payloadPath = path.join(os.tmpdir(), "rudiment-live-arrangement.json");

function publishConfig() {
  maxApi.outlet("config", JSON.stringify(config));
}

maxApi.addHandler("set", (key, value) => {
  const numeric = ["bpm", "swing", "fill", "variation", "seed", "pausonaLength"];
  config = engine.configure({ [key]: numeric.includes(key) ? Number(value) : value });
  publishConfig();
});

maxApi.addHandler("kit", (family, enabled) => {
  config = engine.configure({ kit: { [family]: Boolean(Number(enabled)) } });
  publishConfig();
});

maxApi.addHandler("new_seed", () => {
  let seed;
  do seed = Math.floor(Math.random() * 999999999) + 1;
  while (seed === config.seed);
  config = engine.configure({ seed });
  maxApi.outlet("seed", seed);
});

maxApi.addHandler("generate", () => {
  try {
    let seed;
    do seed = Math.floor(Math.random() * 999999999) + 1;
    while (seed === config.seed);
    config = engine.configure({ seed });
    const payload = engine.generatePayload();
    fs.writeFileSync(payloadPath, JSON.stringify(payload));
    maxApi.outlet("payload", payloadPath);
    maxApi.outlet("summary", payload.seed, payload.arrangement.lengthBeats / 4, payload.arrangement.tracks.length);
    maxApi.outlet("status", "READY TO LOAD");
  } catch (error) {
    maxApi.outlet("status", "ERROR", error.message);
  }
});

maxApi.addHandler("get_config", publishConfig);
maxApi.outlet("status", "OFFLINE ENGINE READY");

