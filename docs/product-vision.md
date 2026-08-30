# Liveworks — product vision and v1 architecture

Status: direction adopted, 2026-08-30. Supersedes the open positioning question in
`docs/product-analysis.md` (option (b), closed consumer product, is the chosen path —
but with a specific thesis). The architectural contract that must be written before
any code is `docs/musical-memory.md`.

## Thesis

"LLM inside Ableton" will rapidly become a commodity. The product is:

> **A music agent inside Ableton with a structured, queryable memory of everything
> you have ever created with it.**

Chat is the interface. The real asset is the **musical memory layer**.

Four levels of edge:

| Level | Capability | Defensibility |
| --- | --- | --- |
| 1 | Natural language → Ableton | Replicable |
| 2 | NL → reliable deterministic Ableton operations | Harder |
| 3 | Persistent structured musical memory | Much more interesting |
| 4 | Personal musical intelligence — the system learns the user's corpus and can retrieve, combine, compare and reason over it | **The target** |

After 18 months the value is not "Liveworks can create a bassline" (any model will).
It is: "Liveworks knows the 417 basslines *I* made, which ones I kept, in which
tracks, with which devices and grooves, and can bring one into the current session" —
and can say "you've already explored something very similar three times; want to see
those versions before generating another?" A creative memory system, not a chatbot.

Ethically clean: an Export Library gives the user JSON + MIDI + metadata +
(optionally) embeddings. No hostages.

## User experience (the test every component must pass)

The musician sees none of the architecture. They:

1. Buy
2. Download `liveworks.amxd`
3. Drag it into Ableton
4. Sign in
5. Talk

No API keys. No model picker. No vector database. No prompt engineering. No cloud
configuration. The UI is almost offensively simple: a prompt box, a status line, a
credit balance.

The killer interaction is **reference by pointing**: the device knows the current
selection in Live, so "this" resolves via LOM → object representation → memory
search. "Find something I made that would sit well with *this*."

Example queries the memory makes possible after months of use:

- "Make me something like my May tracks but faster."
- "What was that synth I kept using last year?"
- "Bring the groove from *Night 14* here."
- "Three variations of this bassline in the style of things I tend to approve."
- "Does this sound too similar to something I've already made?"
- "Play me the ideas I abandoned that could work in this track."

## v1 architecture

Cloudflare in front. PostgreSQL at the heart. Google/AI providers behind.

```
                    INTERNET
                       │
                Cloudflare Worker
             auth / API / rate limits
                 streaming chat
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
     PostgreSQL                    R2
   + pgvector                files / snapshots
     (JSONB)
          │
          ▼
      LLM Gateway
    ┌─────┼──────┐
    ▼     ▼      ▼
 Gemini  OpenAI  Anthropic
    │
 embeddings

                 USER'S MACHINE
                 Ableton Live ← Max for Live (HTML/JS UI) ← LOM bridge
                       │ HTTPS → api.liveworks.ai
```

One rule governs every technology choice: **each new technology must buy something
for the product.** Not Kubernetes to learn Kubernetes.

### Component responsibilities (the architectural rule)

```
Ableton          → musical reality
Postgres         → musical knowledge
R2 / Storage     → artifacts
LLM              → reasoning
M4L              → interface + execution
```

### Decisions and rationale

- **Cloudflare Workers as control plane.** The client is a plugin on users'
  machines worldwide making many small operations (auth → prompt → stream →
  retrieve → execute → save). Workers fits that surface: API, streaming,
  queues, Hyperdrive connection pooling. The `.amxd` talks to one hostname and
  never knows what's behind it.
- **PostgreSQL + pgvector as the single database.** The domain is intrinsically
  relational (user → projects → tracks → clips → musical_objects → generations),
  contains documents (`data JSONB`), and vectors (`embedding vector(...)`). One
  query can combine relational constraints + musical metadata + vector similarity.
  Not Firestore, not D1 as source of truth, not a separate vector DB.
  - Hosting: Cloud SQL Postgres via Hyperdrive (boring and solid) or Neon
    (serverless, edge-friendly driver, attractive for indie v1). AlloyDB only if
    retrieval outgrows Cloud SQL — a combine harvester for a lawn at 30 users.
  - Qdrant/Vectorize/Vertex Vector Search: only when Postgres is a proven
    bottleneck. The edge is musical memory, not an elegant Cloudflare topology.
- **R2 for blobs** (S3-compatible, no egress fees): project snapshots, MIDI/JSON
  exports, audio references, waveforms, analysis artifacts, backups.
  Boundary: *Postgres knows about things. R2 contains things.*
- **LLM Gateway**, not a single model. Internal verbs: `intent()`, `reason()`,
  `retrieve()`, `plan()`, `explain()`. "Kick down 2 dB" should resolve
  deterministically without a big model; "analyze my last five tracks and propose
  three directions" deserves the best one. AI cost optimized per operation,
  invisibly.
- **Cloud Run as compute plane**, not in the main request path: heavy audio
  analysis, Python, FFmpeg, Demucs, MIDI analysis, custom ML, long jobs,
  eventual GPU inference.
- **Credits, never tokens.** Tokens are infrastructure leakage. Show credits
  (e.g. Generate 1, Deep analysis 3) or a monthly plan with generous allowance.
  Lemon Squeezy is billing authority (usage-based subscriptions, usage records);
  the **credit ledger lives in our Postgres** — Lemon Squeezy is not the runtime
  accounting system.
- **Durable Objects: watch, not v1.** Later, one stateful Session object per Live
  session coordinating streaming, current selection, pending commands, agent
  state, multiple devices. First HTTP + streaming.

### Deliberately not used in v1

Kubernetes, microservices, dedicated vector DB, Kafka, elaborate agent frameworks,
BigQuery as operational DB, GraphQL, custom auth.

### Shape of the codebase

A TypeScript monorepo where possible. One Worker backend. One Postgres. One bucket.
One deployment pipeline.

Scaling posture: at 300 users almost nothing changes; at 30,000 we separate
services/retrieval/compute; at 300,000 we will have earned interesting problems.

## Why data model comes before code

Infrastructure can be changed. A wrong musical representation, after millions of
objects exist, is far more painful. Therefore the next artifact is **not code**: it
is `docs/musical-memory.md` — the Musical Object Model specification, the full
lifecycle (Ableton → snapshot → objects → embeddings → retrieval → LLM →
reconstruction), ownership/export, and the 18 acceptance queries the system must resolve.
That document is the architectural contract, before choosing schema or embedding
model.
