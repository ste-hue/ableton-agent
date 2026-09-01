# PADREMAP scan schema

Pass one JSON object to `scripts/padremap_cache.py merge SCAN.json`:

```json
{
  "preset_id": "909-core-kit",
  "display_name": "909 Core Kit",
  "browser_query": "909 Core Kit",
  "browser_uri": "query:Drums#FileId_5447",
  "preset_sha256": "64 lowercase hexadecimal characters",
  "live_version": "12.3.2",
  "scanned_at": "2026-09-01T12:00:00Z",
  "verification_source": "live-lom",
  "pads": {
    "36": {
      "name": "Bass Drum",
      "chains": [
        {"name": "Bass Drum", "in_note": 36, "out_note": 60, "choke_group": 0}
      ]
    }
  }
}
```

Rules enforced by the merger:

- preset ID uses lowercase letters, digits, and hyphens;
- preset SHA-256 is mandatory and identifies the actual installed `.adg`;
- Live version, browser identity, scan timestamp, and `live-lom` source are
  mandatory;
- pad keys equal their embedded MIDI routing and are unique integers 0–127;
- every stored pad has at least one chain;
- chain input equals the pad note or is `-1` (`All Notes` in Live 12.3+);
- `mapping_sha256` is calculated from canonical pad JSON and cannot be supplied
  by the caller.
- semantic `roles` are derived deterministically from pad and chain names by the
  merger; callers do not supply or override them.

The cache stores history per preset hash, so upgrading a preset creates a new
version instead of silently overwriting the old map.

Before MIDI placement, compare each source pitch's declared role with the roles
on the cached target pad. Preserve a pitch when the role still matches. Otherwise
route to a target pad carrying the same role; prefer the nearest pitch and then
the lowest MIDI number for deterministic ties. Abort when no compatible target
exists. A remap changes pitch only, never the number or timing of events.
