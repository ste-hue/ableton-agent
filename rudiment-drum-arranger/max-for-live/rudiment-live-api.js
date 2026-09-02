autowatch = 1;
inlets = 1;
outlets = 2;

var payload = null;
var payloadPath = "";
var startBeat = 0;
var replaceExisting = 0;
var profileName = "Live Core";

function status(kind, message, extra) {
  outlet(0, "status", kind, message, extra || "");
}

function read_payload(path) {
  try {
    var file = new File(path, "read");
    if (!file.isopen) throw new Error("Cannot open payload");
    var text = "";
    while (file.position < file.eof) text += file.readline(32768);
    file.close();
    payload = JSON.parse(text);
    validatePayload(payload);
    payloadPath = path;
    status("ready", "Payload validated", payload.id);
  } catch (error) {
    payload = null;
    status("error", error.message);
  }
}

function start_beat(value) { startBeat = Math.max(0, Number(value) || 0); }
function replace_existing(value) { replaceExisting = value ? 1 : 0; }
function device_profile(value) { profileName = String(value || "Live Core"); }

function validatePayload(value) {
  if (!value || value.schema !== "rudiment.live-arrangement/v1") throw new Error("Unsupported Rudiment payload");
  if (!value.arrangement || !Array.isArray(value.arrangement.tracks)) throw new Error("Missing track plan");
  if (!value.arrangement.tracks.length) throw new Error("No enabled kit families");
  var keys = {};
  value.arrangement.tracks.forEach(function (track) {
    if (keys[track.family]) throw new Error("Duplicate family: " + track.family);
    keys[track.family] = true;
    if (!Array.isArray(track.notes)) throw new Error("Missing notes for " + track.family);
    track.notes.forEach(function (note) {
      if (note.pitch < 0 || note.pitch > 127) throw new Error("Invalid MIDI pitch in " + track.family);
      if (note.start < 0 || note.duration <= 0) throw new Error("Invalid note timing in " + track.family);
    });
  });
  return true;
}

function trackCount(song) {
  var raw = song.get("tracks");
  return Math.max(0, Math.floor((raw.length - 1) / 2));
}

function lastTrackIndex(song) { return Math.max(0, trackCount(song) - 1); }

function arrangementClip(track, beforeIds) {
  var after = track.get("arrangement_clips");
  var before = {};
  for (var i = 1; i < beforeIds.length; i += 2) before[beforeIds[i]] = true;
  for (var j = 1; j < after.length; j += 2) {
    if (!before[after[j]]) return new LiveAPI(null, after[j]);
  }
  throw new Error("Live did not return the new Arrangement clip");
}

function noteDictionary(notes) {
  var dict = new Dict("rudiment_notes_" + Date.now());
  var rows = notes.map(function (note) {
    return {
      pitch: Math.round(note.pitch),
      start_time: Number(note.start),
      duration: Number(note.duration),
      velocity: Math.max(1, Math.min(127, Math.round(note.velocity))),
      mute: 0,
      probability: 1.0
    };
  });
  dict.setparse("notes", JSON.stringify(rows));
  return dict;
}

function addTrack(song, plan, arrangementLength) {
  song.call("create_midi_track", -1);
  var index = lastTrackIndex(song);
  var track = new LiveAPI(null, "live_set tracks " + index);
  track.set("name", "RUDIMENT · " + plan.label);
  track.set("color", plan.color || 14614351);

  if (plan.nativeDevice) {
    try { track.call("insert_device", plan.nativeDevice); }
    catch (error) { status("warning", "Device not inserted", plan.nativeDevice); }
  }

  var before = track.get("arrangement_clips");
  track.call("create_midi_clip", startBeat, arrangementLength);
  var clip = arrangementClip(track, before);
  clip.set("name", payload.name + " · " + plan.label);
  var notes = noteDictionary(plan.notes);
  clip.call("add_new_notes", "dictionary", notes.name);
  return track;
}

function load_arrangement() {
  if (!payload) { status("error", "Read a valid payload first"); return; }
  try {
    validatePayload(payload);
    var song = new LiveAPI(null, "live_set");
    song.set("tempo", payload.tempo);
    status("loading", "Creating tracks", profileName);
    var plans = payload.arrangement.tracks;
    for (var i = 0; i < plans.length; i++) {
      addTrack(song, plans[i], payload.arrangement.lengthBeats);
      outlet(1, (i + 1) / plans.length);
    }
    song.set("back_to_arranger", 0);
    status("done", "Arrangement loaded", plans.length + " tracks");
  } catch (error) {
    status("error", error.message);
  }
}

function bang() {
  status(payload ? "ready" : "empty", payload ? payload.name : "No payload loaded", payloadPath);
}
