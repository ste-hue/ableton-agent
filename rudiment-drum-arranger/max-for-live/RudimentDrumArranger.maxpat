{
  "patcher": {
    "fileversion": 1,
    "appversion": { "major": 8, "minor": 6, "revision": 5, "architecture": "x64", "modernui": 1 },
    "classnamespace": "box",
    "rect": [80.0, 80.0, 1120.0, 460.0],
    "openinpresentation": 1,
    "default_fontname": "Arial",
    "default_fontsize": 12.0,
    "boxes": [
      { "box": { "id": "title", "maxclass": "comment", "text": "RUDIMENT  /  OFFLINE DRUM ARRANGER", "fontsize": 20.0, "presentation": 1, "presentation_rect": [22.0, 18.0, 430.0, 28.0] } },
      { "box": { "id": "subtitle", "maxclass": "comment", "text": "Narrative → Groove DNA → Fill Genome → Arrangement", "presentation": 1, "presentation_rect": [23.0, 48.0, 440.0, 20.0] } },
      { "box": { "id": "generate", "maxclass": "textbutton", "text": "GENERATE", "texton": "GENERATE", "presentation": 1, "presentation_rect": [22.0, 92.0, 210.0, 48.0] } },
      { "box": { "id": "genmsg", "maxclass": "message", "text": "generate" } },
      { "box": { "id": "load", "maxclass": "textbutton", "text": "LOAD ARRANGEMENT", "texton": "LOAD ARRANGEMENT", "presentation": 1, "presentation_rect": [246.0, 92.0, 250.0, 48.0] } },
      { "box": { "id": "loadmsg", "maxclass": "message", "text": "load_arrangement" } },
      { "box": { "id": "bpm", "maxclass": "live.numbox", "parameter_enable": 1, "presentation": 1, "presentation_rect": [22.0, 184.0, 78.0, 34.0], "saved_attribute_attributes": { "valueof": { "parameter_longname": "Tempo", "parameter_shortname": "BPM", "parameter_mmin": 60.0, "parameter_mmax": 200.0, "parameter_initial": [128.0], "parameter_type": 0 } } } },
      { "box": { "id": "bpmprepend", "maxclass": "newobj", "text": "prepend set bpm" } },
      { "box": { "id": "variation", "maxclass": "live.dial", "parameter_enable": 1, "presentation": 1, "presentation_rect": [132.0, 174.0, 62.0, 62.0], "saved_attribute_attributes": { "valueof": { "parameter_longname": "Variation", "parameter_mmin": 0.0, "parameter_mmax": 100.0, "parameter_initial": [32.0], "parameter_type": 0 } } } },
      { "box": { "id": "varprepend", "maxclass": "newobj", "text": "prepend set variation" } },
      { "box": { "id": "fill", "maxclass": "live.dial", "parameter_enable": 1, "presentation": 1, "presentation_rect": [216.0, 174.0, 62.0, 62.0], "saved_attribute_attributes": { "valueof": { "parameter_longname": "Fill Development", "parameter_mmin": 0.0, "parameter_mmax": 100.0, "parameter_initial": [38.0], "parameter_type": 0 } } } },
      { "box": { "id": "fillprepend", "maxclass": "newobj", "text": "prepend set fill" } },
      { "box": { "id": "status", "maxclass": "comment", "text": "OFFLINE ENGINE", "presentation": 1, "presentation_rect": [22.0, 278.0, 474.0, 22.0] } },
      { "box": { "id": "node", "maxclass": "newobj", "text": "node.script rudiment-node-engine.js @autostart 1 @watch 1", "numinlets": 1, "numoutlets": 2 } },
      { "box": { "id": "route", "maxclass": "newobj", "text": "route payload status summary config seed" } },
      { "box": { "id": "readprepend", "maxclass": "newobj", "text": "prepend read_payload" } },
      { "box": { "id": "liveapi", "maxclass": "newobj", "text": "js rudiment-live-api.js", "numinlets": 1, "numoutlets": 2 } },
      { "box": { "id": "thisdevice", "maxclass": "newobj", "text": "live.thisdevice" } },
      { "box": { "id": "midiin", "maxclass": "newobj", "text": "midiin" } },
      { "box": { "id": "midiout", "maxclass": "newobj", "text": "midiout" } }
    ],
    "lines": [
      { "patchline": { "source": ["generate", 0], "destination": ["genmsg", 0] } },
      { "patchline": { "source": ["genmsg", 0], "destination": ["node", 0] } },
      { "patchline": { "source": ["load", 0], "destination": ["loadmsg", 0] } },
      { "patchline": { "source": ["loadmsg", 0], "destination": ["liveapi", 0] } },
      { "patchline": { "source": ["bpm", 0], "destination": ["bpmprepend", 0] } },
      { "patchline": { "source": ["bpmprepend", 0], "destination": ["node", 0] } },
      { "patchline": { "source": ["variation", 0], "destination": ["varprepend", 0] } },
      { "patchline": { "source": ["varprepend", 0], "destination": ["node", 0] } },
      { "patchline": { "source": ["fill", 0], "destination": ["fillprepend", 0] } },
      { "patchline": { "source": ["fillprepend", 0], "destination": ["node", 0] } },
      { "patchline": { "source": ["node", 0], "destination": ["route", 0] } },
      { "patchline": { "source": ["route", 0], "destination": ["readprepend", 0] } },
      { "patchline": { "source": ["readprepend", 0], "destination": ["liveapi", 0] } },
      { "patchline": { "source": ["route", 1], "destination": ["status", 0] } },
      { "patchline": { "source": ["midiin", 0], "destination": ["midiout", 0] } },
      { "patchline": { "source": ["thisdevice", 0], "destination": ["node", 0] } }
    ]
  }
}

