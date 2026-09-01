# Musical memory — architectural contract

Status: **north star — post-launch (V1) retention layer. Not a launch prerequisite.**
Decision 2026-08-30: V0 ships the base product first (see `docs/product-vision.md`,
"V0 → V1 sequence"); no ontology, lineage, or multi-embedding retrieval is
implemented before V0 is in users' hands. Return to this document once real usage
shows what users actually want to remember. Grounded in the verified LOM
capabilities and limits in `docs/lom-capability-map.md`.

Guiding principle: **JSON/MIDI is canonical data. Embeddings are a derived index.**
All embeddings can be deleted tomorrow, regenerated with a better model, and nothing
is lost.

## 1. Musical Object Model (MOM)

A user-owned tree of typed, individually addressable objects:

```
User
 └── Project
      ├── Track
      │    ├── DeviceChain
      │    ├── Clip
      │    │    ├── ChordProgression
      │    │    ├── Bassline
      │    │    ├── Melody
      │    │    └── DrumPattern
      │    └── Automation
      ├── Section            (Intro / Drop / Breakdown / …)
      └── Generation         (prompt, context, operations, provenance)
```

### 1.1 Common envelope

Every object has:

| Field | Meaning |
| --- | --- |
| `id` | UUID, stable forever (`obj_…`, `gen_…`, `proj_…`) |
| `type` | one of the types below |
| `project_id` | owning project |
| `user_id` | owning user (all retrieval is scoped by this, always) |
| `created_at` / `updated_at` | timestamps |
| `tags` | free semantic tags, user- or agent-assigned (`["broken","dark","syncopated"]`) |
| `data` | type-specific canonical payload (JSONB) |
| `source` | provenance: `{created_by: "agent"|"user"|"import", generation_id?}` |
| `status` | `active` / `abandoned` / `kept` / `superseded_by:<id>` |
| `features` | derived musical features (see §3), regenerable |

Example:

```json
{
  "id": "obj_8f21",
  "type": "drum_pattern",
  "project_id": "project_32",
  "tempo": 132,
  "bars": 4,
  "tags": ["broken", "dark", "syncopated"],
  "notes": [...],
  "source": { "created_by": "agent", "generation_id": "gen_921" }
}
```

### 1.2 Object types (v1)

- **Project** — maps to one Live Set lineage. Since the LOM cannot read a Set's
  save path reliably as identity (and we work in unsaved Sets), project identity
  is *ours*: created explicitly at first snapshot, matched heuristically after
  (name, structure), confirmed by the user when ambiguous.
- **Track** — name, type (midi/audio/return/master), color, role guess
  (drums/bass/harmony/lead/fx), reference to DeviceChain.
- **DeviceChain** — ordered list of `{class_name, name, preset_hint, key_params}`.
  Not a full device dump: enough to answer "what synth was I using" and to
  approximately re-create the chain (native devices are re-insertable via LOM;
  third-party plugins recorded but reconstruction is best-effort).
- **Clip** — container: name, slot/arrangement position, length, loop points,
  clip-level groove/quantization; parent of musical content objects.
- **DrumPattern / Bassline / Melody / ChordProgression** — the heart of the model.
  Canonical `notes` array exactly as the LOM exposes them
  (`pitch, start, duration, velocity, mute, probability, velocity_deviation`),
  plus `tempo`, `bars`, `time_signature`, `key`/`scale` when known. A clip on a
  drum rack becomes a DrumPattern; a monophonic low-register clip a Bassline;
  classification is a tagger, not a format — the notes are always the truth.
- **ChordProgression** additionally stores the analyzed sequence
  (`[{beat, chord: "Fm7", function: "i7"}]`) as derived data alongside the notes.
- **Automation** — clip-envelope breakpoints per parameter (LOM exposes clip
  envelopes read/write; arrangement automation lanes are not writable, so they are
  out of scope for reconstruction and only optionally captured).
- **Section** — a user/agent-labeled span of the arrangement or a scene grouping
  ("intro", "drop"). Cheap, label-first; no audio analysis required in v1.
- **Generation** — the audit record of one agent operation: `prompt` (user words),
  `context` (which objects were retrieved into the model's context), `operations`
  (the LOM mutations performed, with the signature-guard evidence), `provenance`
  (model used, skill invoked), `outcome` (objects created/modified, and later:
  kept or abandoned). Generations are what make "things I tend to approve"
  answerable.

### 1.3 Relationships

Typed edges, not implicit joins: `derived_from` (variation lineage),
`adapted_from` (cross-project reuse), `plays_with` (user confirmed these work
together), `abandoned_in_favor_of`. Lineage is what turns memory into taste.

## 2. Lifecycle

```
Ableton (LOM, read)                      ← musical reality
   │  snapshot: structured read of Set / selection / changed clips
   ▼
Snapshot (raw, complete)                 → R2 (blob, immutable)
   │  decomposition: split into MOM objects, diff against previous state
   ▼
Objects (canonical JSONB)                → Postgres
   │  feature extraction (deterministic, §3) + text rendering + embedding
   ▼
Features + embeddings (derived)          → Postgres (pgvector)
   │  retrieval: filters + multi-signal ranking (§4)
   ▼
Candidates (≤ 5–10 objects)              → LLM context
   │  reasoning, planning
   ▼
Plan of LOM operations
   │  execution via M4L / bridge, signature-guarded, readback-verified
   ▼
Ableton (LOM, write)                     ← reconstruction
   │
   └── Generation record written back    → Postgres (closes the loop)
```

Reconstruction constraints (from the capability map — these shape the whole model):

- **MIDI-file import is not exposed through our LOM action surface.** Agent
  reconstruction therefore writes canonical note data directly through LOM
  note operations into a new clip. The canonical `notes` array must be
  LOM-shaped, losslessly.
- **No save/export/render via LOM.** Snapshots are read-side only; the user's
  `.als` remains theirs and untouched.
- Adaptation on the way in (transpose to the current Set's key, retime to its
  tempo/signature) is a pure function on the canonical notes, done before writing.
- Every write follows the existing hard rules: preflight, `expected_set_signature`,
  readback (`live_clip_notes` exact), one call in flight.

Snapshot triggers (v1): explicitly after each agent mutation (we already read back
anyway — persist it), on session start, and on user request ("remember this").
No background polling of Live.

## 3. Features and embeddings

Text embeddings alone do not "understand music". Each content object gets:

**Deterministic features** (computed from notes, no model, always reproducible):
interval contour, pitch-class distribution, rhythmic onset vector, syncopation
score, note density, register, repetition score, velocity distribution, duration,
BPM, key/chord function where derivable, groove deviation.

**Text renderings** (inputs to embedding, stored so they can be re-rendered):

- *semantic*: `"dark hypnotic rolling bassline with restrained movement"` —
  from tags + features + generation prompt.
- *musical structure*: `"132 BPM, F minor, 16th-note syncopation, low register,
  4 bars, repetition 0.82, density 0.41"` — from features only.

**Embeddings** (pgvector columns, one per aspect, nullable):
`semantic`, `harmonic`, `rhythmic`, and later `production` (device-chain aspect).
Model name + version stored per embedding; a re-embedding job is a first-class,
boring operation.

## 4. Retrieval

A query resolves to: **hard filters** (always `user_id`; then `type`, BPM/key
ranges, project, date range, status) → **candidate scoring**:

```
score = w1 · semantic similarity
      + w2 · rhythmic similarity
      + w3 · harmonic similarity
      + w4 · metadata compatibility (BPM/key distance to current Set)
      + w5 · user preference (kept/abandoned history, plays_with edges)
```

Weights are illustrative (e.g. 0.35/0.25/0.20/0.10/0.10) and per-query-intent:
"that hypnotic bass" is semantic-heavy; "something that fits *this*" is
rhythmic/harmonic-heavy with the current selection as the query object.
The LLM receives ≤ 5–10 candidates with their features, never the corpus.

**Reference by pointing**: current selection → LOM read → transient object
representation → same retrieval path, with the selection as query vector source.

## 5. Ownership and export

- The user owns everything. **Export Library** produces, at any time: all objects
  as JSON, all note content additionally as standard MIDI files, all metadata,
  generations, and (optionally) embeddings. Delivered as an archive from R2.
- Delete means delete: objects, features, embeddings, snapshots, generations.
  Billing records (credit ledger) are retained as required, detached from
  musical content.
- Musical content leaves the user's machine only to our backend and, as selected
  retrieval context, to the LLM provider. No training on user corpora. Per-user
  isolation is a hard invariant (`user_id` in every query path).

## 6. The 18 queries this system must resolve

Acceptance contract: the schema + retrieval design is right when each of these can
be answered by filters + ranking + ≤10 candidates handed to the LLM.

1. "Find that hypnotic bassline I made, fairly minimal." — semantic + type filter.
2. "Bring the groove from *Night 14* here." — project name → DrumPattern → adapt (tempo) → reconstruct.
3. "Take the bass from that dark track we made in June and adapt it to this one." — date + tag filters, adapt (key/tempo), reconstruct.
4. "Make me something like my May tracks but faster." — date range → corpus features as style context for generation.
5. "What was that synth I kept using last year?" — DeviceChain aggregation by frequency over a date range.
6. "Three variations of this bassline in the style of things I tend to approve." — selection + kept-history preference signal.
7. "Does this sound too similar to something I've already made?" — selection → similarity above threshold → show matches.
8. "Play me the ideas I abandoned that could work in this track." — `status=abandoned` + compatibility with current Set.
9. "Find something I made that would sit well with *this*." — reference by pointing, rhythmic/harmonic-weighted.
10. "Which of my drum patterns are around 130 BPM and in a broken style?" — metadata + tag filter, no LLM needed.
11. "Show me every chord progression I've written in F minor." — key filter on ChordProgression.
12. "What did we do in this project last session?" — Generation log by project, chronological.
13. "Undo territory: which versions of this clip existed before?" — `derived_from` lineage walk.
14. "Which basslines did I keep vs. abandon, and what's different about the keepers?" — status split + feature comparison (LLM explains).
15. "Reuse the drum-and-bass pairing that worked in *Stanza*." — `plays_with` edge retrieval, two-object reconstruction.
16. "What tempo and key do I gravitate to?" — corpus aggregation, pure SQL.
17. "Have I ever automated a filter like this before?" — Automation objects by parameter class + shape similarity.
18. "Give me everything from this project as MIDI." — Export path, per-project.

Queries 10, 11, 12, 16, 18 must not require an embedding at all — they are the
test that the relational spine is right, not just the vector index.

## 7. Open questions (to settle before schema freeze)

- Project identity across unsaved Sets: how aggressive can matching be before it
  needs user confirmation?
- Classification thresholds (bassline vs. melody) — tagger heuristics vs. asking
  the model vs. asking the user.
- Snapshot retention: every snapshot forever in R2, or prune superseded ones?
- Embedding model choice per aspect (semantic vs. structural renderings may want
  different models) — deferred by design; the renderings are the stable interface.
- Whether Section detection ever becomes automatic (audio analysis on Cloud Run)
  or stays label-first.
