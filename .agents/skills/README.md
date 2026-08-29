# Skills

Host-neutral capability files. Claude Code loads them through its skill
mechanism; any other agent (Codex, or a future one) can simply read them —
they are Markdown with no host-specific machinery, which is why they live in
`.agents/` rather than in `.claude/`.

| Skill | Covers |
|---|---|
| `ableton-lom` | What exists in the Live Object Model: objects, properties, methods |
| `beat-making` | Rhythm: groove dimensions, drum-map constraints, the pattern compiler |
| `harmony-melody` | Pitched material: harmonic function, voice leading, register, contour |
| `song-from-scratch` | The macro loop: brief → hypothesis → realize → mutate → compare → recipe |

`AGENTS.md` holds the operating rules and applies to every session regardless
of host. These skills sit on top of it: the rules say what is safe, the skills
say what is possible.

## The design principle

Each musical skill is built in three layers, and the separation is deliberate:

1. **Constraints** — what must be true for MIDI and Live to work at all. Note
   numbers, registers where frequencies turn to mud, the fact that a MIDI
   track without an instrument is silent. Not negotiable, not aesthetic.
2. **Musical primitives** — the dimensions music actually moves in:
   syncopation, density, accent hierarchy, microtiming, harmonic function,
   tension, voice leading, contour, silence. Concepts, not settings.
3. **Creative policy** — how to work: hypothesize, realize a little, listen,
   mutate one dimension, compare, keep what survives.

What these skills deliberately do **not** contain is recipes. There is no file
that says "boom bap = 90 BPM + this kick pattern + swing 56". That kind of
knowledge produces recognizable competence and mediocre music: an agent that
pattern-matches a genre name to a canonical grid can never answer a brief like
*"hip hop but not nostalgic boom bap"*, which is exactly the kind of brief
worth answering.

Style knowledge lives in `beat-making/references/style-priors.md` as what each
style *values* — pocket, interplay, emptiness, hypnosis, interlocking roles.
Above it stands the rule repeated in every skill:

> Stylistic conventions are historical priors, not composition instructions.
> Follow them, bend them, combine them or violate them deliberately — but do
> not reproduce a canonical pattern unless asked for exactly that.

## Probabilistic composition, deterministic execution

`beat-making/scripts/groove.py` compiles a compact pattern grid into the MIDI
note array. It makes no musical decisions whatsoever: it renders whatever the
agent invents, and renders it identically every time (humanization is seeded).

That split is the whole architecture of this project in miniature — the same
one behind recipes and the trace. The model is free to be creative and
surprising; everything downstream of the idea is exact, inspectable and
reproducible.
