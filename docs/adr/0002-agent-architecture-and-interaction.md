# ADR-0002 — Agent architecture, UX and interaction

- **Status:** Proposed
- **Date:** 2026-09-02
- **Deciders:** Stefano (owner); Marco (collaborator)
- **Depends on:** ADR-0001 (library as the product, agent as the editor; an
  *edit* is the priced unit).
- **Research:** three web-research passes (R5 agentic patterns, R6 interaction
  patterns in creative tools, R7 delivery architecture and portability) on
  2026-09-02, plus a survey of the current code. Sources at the end.

## Context

What runs today, with the numbers that matter (file references are to `main`
at 5ffd552):

- **Device** (`devices/Tembro/`): a `jweb` page with an auth card (email +
  access code, `tembro_ui.html:388`) and a chat card: composer, a rail of four
  skill buttons from the server's menu (`:437`, `:617`), a collapsible
  "Liveworks" trace of every tool call (`:423-435`), a spinner with rotating
  "studio thoughts" and a Stop button (`:438-441`). State arrives from node as
  idle / working / success / error (`code/tembro_main.js:53-58`).
- **Turn** (`code/agent_loop.js:315`): list MCP tools → 35-name allowlist →
  `POST /v0/agent` → execute each returned call locally, one at a time → send
  results back with a continuation token → repeat until `kind: "final"`. No
  streaming; plain JSON round-trips with 300 s per request (`code/api.js:162`).
  Caps: 72 local steps as a safety net (`agent_loop.js`; 264 when written), soft/hard turn timeouts 840 s /
  900 s (`tembro_main.js:127-128`).
- **Server** (`server/src/app.ts`): `MAX_AGENT_STEPS = AGENT_STEP_BUDGET` = 64 (256 when
  written; lowered in ADR-0001 A1 from measured cost); reasoning
  effort hardcoded `"high"` at `:564` and `:653`; a turn ends only when the
  model returns no tool calls (`:513-521`) — there is no explicit completion
  signal; credits charged on start, refunded on provider error; every model
  call is metered (`:454-470`, PR #39). Model `gpt-5.6-sol`
  (`server/wrangler.jsonc:24`), `parallel_tool_calls: false`.
- **Session**: `~/.tembro/session.json` is read once when the device
  constructs `TembroApi` (`tembro_main.js:44`); without it the auth card
  blocks everything.
- **Drum library** (`drum-library/`, PR #40): three 128-bar arrangements
  (techno, disco, house) as `.mid` at PPQ 480 with `manifest.json` and
  per-genre metadata (sections, validation). **Nothing in `devices/` or
  `server/src/` reads it.**

The observed failures follow from this shape: a turn is an open-ended ReAct
loop with a 256-step ceiling and maximal reasoning on every step, so it runs
for minutes and "done" is an absence of tool calls rather than a statement;
the only fast path (the library) is not wired; and the first screen a musician
meets is a login wall (issue #45).

The research is unusually consistent. Anthropic: use predefined workflows for
well-defined tasks, agents only for open-ended ones, always with a step cap and
checkpoints [R5]. OpenAI: end the loop on a *final-output tool*, spend `high`
effort only where it measurably helps, cap turns and return partial results
[R5]. Every creative tool that ships generative AI does it with variations to
pick from, non-destructive placement, a few intent controls and a regenerate
button — Photoshop, Canva, Logic Session Players, Splice Create, XO,
Patternarium [R6]. NN/g's limits (0.1 s instantaneous, 1 s flow, 10 s
attention) and HAX guidelines G7–G11 fix what the waiting UI must show [R5,
R6]. Cloudflare's static assets are served from cache without invoking the
Worker, at no per-request cost; a single Worker request keeps running while the
client stays connected but `waitUntil` gives only 30 s after the response [R7].

## Decision 1 — Two paths, never one loop

**The button path is a deterministic workflow with no LLM in it.** Genre or
"like my Set" → `GET /v0/drums/{id}.json` (notes already in the
`add_new_notes` dictionary shape) → one `add_new_notes` call per clip from a
`deferlow`-guarded path → readback → fire. Target: audible in ≤ 3 s on a warm
cache, ≤ 0.1 s for a repeat press of a cached pack [R7: LOM Clip, Adam Murray's
3,434-notes-in-one-call demonstration; NN/g limits].

**The agent path is a bounded edit.** It starts from the result of the button
(or a selected clip), not from a blank chat. It is what ADR-0001 sells as an
*edit*. Anthropic's "workflows before agents" and OpenAI's "maximize a single
agent first" both say: put the well-defined 80% in code [R5].

We deliberately do **not** keep chat as the front door. NN/g's "articulation
barrier" (about half of users cannot specify intent well enough for a prompt
UI) is the tester who could not get in [R6].

## Decision 2 — Shape of an agent turn

1. **Step budget by task class**, enforced by the harness, stated in the prompt:
   *edit* ≤ 12 tool steps, *generate-new* ≤ 30, *full arrangement* ≤ 60. The
   256 / 264 ceilings go away. On exhaustion the turn returns a **partial**
   structured result, never silence [R5: OpenAI exit conditions; Claude Agent
   SDK `maxTurns` partial marking; GPT-5 prompting guide tool-call budget].
2. **Effort routing.** One planning call at `high` returns a short plan
   (what changes, in which clips, how many bars); execution steps run at
   `low`, chained with `previous_response_id` behind a stable cached prefix
   (LOM reference and knowledge first, Live context last) [R5: reasoning
   best practices for the planner/executor split; latest-model guide for
   effort levels; prompt caching]. This is also what makes the $0.15-per-edit
   assumption in ADR-0001 conservative.
3. **Completion is a tool, not an absence.** A `finish_turn` final-output tool
   with a strict schema `{status: done | partial | blocked, changed: [{clip,
   bars, what}], next_suggestion}`. A `response.completed` without it is a
   harness error, not a success [R5: OpenAI guide; Structured Outputs].
   "Done" when the user asked to hear something means the scene is firing and
   `is_playing` was read back true (roadmap item 7, now a rule).
4. **Readback is mandatory.** Every mutation is followed by a read of the
   affected clip; the turn's success is graded on Live's state, not on the
   model's text [R5: Anthropic evals — grade the final environment state;
   ReAct grounding]. The Remote Script semaphore already serialises calls;
   `parallel_tool_calls: false` stays.
5. **Fewer, higher tools.** The 35-name allowlist shrinks below 20 exposed
   functions, with a consolidated `drum_pattern_write(clip, role_notes)` that
   maps roles to the loaded kit's pads instead of raw `live_get / live_set`
   chains; read tools carry `readOnlyHint`, mutations `destructiveHint` [R5:
   Anthropic "Writing tools for agents"; OpenAI function-calling guidance;
   MCP tool annotations].
6. **Transport.** One streamed Worker request per edit, capped at 60 s wall
   time; the device shows the stream. Anything designed to run longer (the
   offline generator, #41) is not an edit and runs as a Cloudflare Workflow
   or outside Live entirely [R7: Workers limits — unlimited wall time while
   connected, `waitUntil` 30 s; Workflows — unlimited step wall time].

## Decision 3 — What the device shows

The default view is a **result, not a conversation**:

1. **Style buttons** (genre chips + "like my Set", which reads tempo, kit and
   existing clips) → the pick is placed and playing. HAX G7 "efficient
   invocation"; Splice Create's 12-style → instant stack; EZdrummer's
   Bandmate [R6].
2. **A variations strip of three**: the placed pick plus two alternates, each
   auditionable before commit by tapping it (swap in place, same slot).
   Photoshop and Canva ship 3–4 variations; HAX G10: "3–4 suggestions instead
   of autocompleting" [R6]. Pros compare; amateurs never touch it.
3. **Two intent controls, Complexity and Intensity**, plus Fills and Swing,
   re-rendering the current pattern from the library's metadata without the
   LLM. Logic's Session Player Drummer is the analogue: its controls "are now
   simple sliders" where the old Drummer had an XY pad [R6]. Live 12's own
   MIDI Tools expose Density / Accent the same way.
4. **Per-element Regenerate and Lock** (kick / snare / hats) and a whole-pattern
   Reroll: Splice's per-layer refresh vs stack refresh; Playbox per-page dice
   [R6].
5. **Non-destructive by construction**: every placement is a new clip in a new
   slot; an Undo button calls `Song.undo` once and shows what reverted; the
   readback (clip name, bars, note count) is visible [R6: Photoshop
   generative layer; PAIR "return control to users"; HAX G8 / G9].
6. **The agent as follow-up, from the result.** Chips on the placed clip
   ("busier hats", "half-time the bridge", "fit my kit"), free text last. While
   it runs: a one-line preamble per step ("Adding hats, bars 9–16"), a counter
   "step 3 / 12", the existing Liveworks trace collapsed, and Cancel. Thumbs on
   each variation feed a Patternarium-style ranking of the library [R5:
   GPT-5 tool preambles; NN/g progress indicators; R6: Figma Make
   point-and-edit; HAX G11 / G15].

Chat remains reachable (a text field under the chips) but is never the first
screen and never blocks the button path.

## Decision 4 — Onboarding without a wall

1. **The device works on first open.** No email, no code, no card: a
   device-generated `instance_id` opens the free tier from ADR-0001 (20 library
   placements + 12 edits, no expiry). The two counters are visible in the
   device next to the button — "placements left / edits left" — so the end is
   never a surprise. NN/g: users must be "highly motivated" to pay the wall's cost
   "over the tempting alternative of deleting the app" — forego it, or push it
   to the point where users are convinced;
   Baymard 2025: 18% abandon at forced account creation; Isotonik and Fors
   ship M4L devices with no activation at all [R6].
2. **Licence entry is inside the device, email-only.** After purchase the
   Lemon Squeezy licence key is pasted or arrives by magic link; no browser
   OAuth from a `jweb` view. `~/.tembro/session.json` is re-read on every
   request that gets a 401, not only at construction.
3. **Account, if ever, after the first success** ("keep your beats across
   machines?") — the reciprocity principle [R6: NN/g login walls; PAIR
   feedback and control]. `BETA_ACCESS_CODE` and the shared-code flow are
   removed once this lands (supersedes the open-beta flag introduced for
   issue #45).
4. **The Discord invite follows the same rule.** It appears twice at most: a
   chip after the first placement that plays ("this worked? come say so") and
   a panel when the counters reach zero or the user marks the track done
   ("finished a track — post it, get the next one"). Never on first open, never
   as a modal, dismissable with one click; the URL comes from a Worker variable
   returned by `/v0/skills`-style config, not hard-coded in `tembro_ui.html`.

## Decision 5 — Where the library lives and how it travels

1. **Storage:** the built catalogue (`.mid` + one JSON per arrangement in
   `add_new_notes` shape) ships as **Workers Static Assets**, immutable and
   versioned per deploy; **D1 keeps only the searchable index** (genre, tempo,
   bars, sections, tags, licence, ranking). Static assets are served from
   Cloudflare's cache without invoking the Worker and requests are free and
   unlimited; D1 rows cap at 2 MB, fine for JSON, wrong for MIDI blobs
   [R7]. R2 only if the catalogue passes 100k files or a 25 MiB file.
2. **Device cache:** `node.script` has full file-system access; the last-used
   packs are cached under `~/.tembro/library/` so repeat presses and offline
   sessions are instantaneous [R7: node.script reference].
3. **Interchange format:** SMF type 0, one track, channel 10, GM percussion
   numbers (36 kick, 38 snare, 42 / 46 hats, 49 crash, 51 ride) **plus a JSON
   sidecar** with role-based notes and a `pad_map` for the Drum Rack. The JSON
   is the source of truth for the LOM path (probability, velocity deviation
   and note IDs have no SMF equivalent); the `.mid` is the portable artefact
   both Live and Bitwig import from their browsers [R7: Ableton manual; Bitwig
   browsers].
   This is issue #43, confirmed.
4. **Path to Bitwig:** the same catalogue plus a thin Java controller
   extension writing with `createLauncherCursorClip` / `setStep`;
   arrangement-clip writing must be verified against the in-app Javadoc
   first. **Not** a JUCE VST3 drag-drop plugin first: it adds JUCE licensing,
   Developer ID notarisation and known Live / Bitwig drop quirks [R7]. Reaper
   (`MIDI_InsertNote`) and FL (`flpianoroll`) are cheap later; Logic only via
   `.mid` import.

## Decision 6 — How we know it works

A fixed set of **20–50 tasks drawn from real failures**, graded on the Live
Set after the turn (clip exists, bar count, notes on the right pads, scene
playing when asked), reporting pass^k for reliability, run before any change
to prompts, budgets or the tool set [R5: Anthropic "Demystifying evals"]. The
turn log (`tools/tembro_turn_log.py`, D1) is the input; the metered cost per
edit feeds ADR-0001's allowance.

## Consequences

Ordered so each step unblocks the next; issue numbers where one exists.

1. **Library wiring (#42, #41):** `tools/build_library.py` emits, per
   arrangement, a JSON in `add_new_notes` shape with `sections`, `pad_map`,
   `license`; `server/wrangler.jsonc` gains an `assets` binding for
   `drum-library/dist/`; new routes `GET /v0/drums` (index from D1) and the
   static `/library/{id}.json`; `devices/Tembro/code/api.js` fetches and
   caches; `code/lom_bridge.js` gets `placeArrangement(json)` = create clip +
   one `add_new_notes` + readback, behind `deferlow`.
2. **Device UI (#42, #45):** `tembro_ui.html` reorders to style buttons →
   variations strip → intent controls → result with chips; the auth card
   becomes a licence field in settings; the composer moves under the result.
3. **Agent loop (#44):** `server/src/app.ts` replaces `MAX_AGENT_STEPS` with a
   per-skill budget table and takes `reasoning_effort` from the task class
   (plan `high`, execute `low`); `server/src/llm.ts` adds the `finish_turn`
   tool with a strict schema and the preamble instruction; the client loop
   (`agent_loop.js`) drops its 264 cap in favour of the server budget and
   renders `partial` and `blocked` as first-class states; `tembro_main.js`
   turn timeouts drop from 840 / 900 s to 90 s.
4. **Tool set:** `agent_loop.js` allowlist trimmed and `drum_pattern_write`
   added on the device side (role → pad mapping done locally, one LOM
   mutation); annotations added to the MCP tool descriptions.
5. **Onboarding (#45):** `POST /v0/auth/free` with `instance_id` replaces the
   access-code path and grants `FREE_PLACEMENTS` (20) and `FREE_EDITS` (12)
   once per instance, no expiry; the device shows both counters; the Discord
   invite chip/panel wired to first success and to counters-at-zero, URL from
   a `DISCORD_INVITE_URL` Worker variable; `session.json` reloaded on 401;
   `BETA_ACCESS_CODE` and `BETA_OPEN_ACCESS` retired (the open-beta change of
   2026-09-01 becomes unnecessary and should not be deployed).
6. **Evals:** `server/test/` gains a Live-state task suite runnable against a
   disposable Set; CI keeps the current unit tests.
7. **Skills menu:** `server/src/skills.ts` profiles gain `stepBudget` and
   `planEffort` / `executeEffort` next to the per-outcome price from ADR-0001.
8. **Docs:** `docs/0.1.3-roadmap.md` items 3 (step feed) and 7 (closure rules)
   are absorbed here; `docs/product-vision.md` "prompt box, status line,
   credits" UX contract is superseded by Decision 3.

Deferred: Cloudflare Workflows for long turns (no edit needs them); a Windows
build; the Bitwig extension until the Live loop is proven; any local model in
the device (Magenta's precedent shows it is possible, but the library makes it
unnecessary for the button path).

## Open questions — what would change this decision

- **Measured edit latency.** If plan-at-`high` + execute-at-`low` still takes
  > 60 s for a 12-step edit, the plan call moves to `medium` and the budget
  to 8 before anything else changes.
- **Quality of `low`-effort execution.** If the eval suite shows execution
  errors rise above the `high` baseline, keep `high` for `drum_pattern_write`
  only (the one step that writes notes).
- **Library metadata sufficiency.** If Complexity / Intensity cannot be
  rendered from section metadata alone, the generator (#41) must emit
  per-arrangement density variants rather than the device re-rendering.
- **Live 12 `add_new_notes` throughput on a 128-bar arrangement** is
  demonstrated, not measured on our kits; if a placement exceeds 3 s, split
  by section.
- **Bitwig arrangement writing** is unverified; if the controller API cannot
  write arrangement clips, Bitwig gets the launcher-clip path plus `.mid` drag.

## Sources

Access date 2026-09-02 for all. "(2ary)" = primary page unreachable, figure
from a secondary source; "(unverified)" = search snippet only.

### R5 — Agentic design patterns

- Anthropic, *Building effective agents* — https://www.anthropic.com/engineering/building-effective-agents — workflows for well-defined tasks, agents for open-ended ones, stopping conditions and checkpoints.
- Anthropic, *Writing tools for agents* — https://www.anthropic.com/engineering/writing-tools-for-agents — consolidate tools, return high-signal information.
- Anthropic, *Effective context engineering* — https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — smallest set of high-signal tokens.
- Anthropic, *Demystifying evals for AI agents* — https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — grade final environment state; 20–50 tasks from real failures; pass@k vs pass^k.
- Claude Agent SDK subagents — https://code.claude.com/docs/en/agent-sdk/subagents — `maxTurns` marks output partial and resumable.
- OpenAI, *A practical guide to building agents* — https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf — exit conditions: final-output tool, no tool calls, error, max turns.
- OpenAI Agents SDK, running agents — https://openai.github.io/openai-agents-python/running_agents/ — `max_turns`.
- OpenAI reasoning best practices — https://developers.openai.com/api/docs/guides/reasoning-best-practices — reasoning models for planning, GPT series for execution, `previous_response_id`; latest-model guide — https://developers.openai.com/api/docs/guides/latest-model — effort levels; GPT-5 prompting guide — https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide — tool-call budgets in prompt, tool preambles.
- OpenAI streaming — https://developers.openai.com/api/docs/guides/streaming-responses ; background mode — https://developers.openai.com/api/docs/guides/background ; prompt caching — https://developers.openai.com/api/docs/guides/prompt-caching ; function calling — https://developers.openai.com/api/docs/guides/function-calling — under 20 functions, `strict`, `parallel_tool_calls: false`.
- MCP tools spec — https://modelcontextprotocol.io/specification/2025-06-18/server/tools ; annotations — https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/ ; progress — https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/progress ; elicitation — https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation .
- ReAct — https://arxiv.org/abs/2210.03629 ; Plan-and-Solve — https://arxiv.org/abs/2305.04091 ; Reflexion — https://arxiv.org/abs/2303.11366 ; Self-consistency — https://arxiv.org/abs/2203.11171 .
- NN/g response-time limits — https://www.nngroup.com/articles/response-times-3-important-limits/ ; progress indicators — https://www.nngroup.com/articles/progress-indicators/ .
- Microsoft HAX guidelines — https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/ (G1–G18; CHI'19 paper table).

### R6 — Interaction patterns in creative tools

- Photoshop Generative Fill: three variations, generative layer — https://www.elegantthemes.com/blog/design/photoshop-ai (2ary; helpx.adobe.com timed out).
- Canva Magic Edit: four variations — https://www.kimp.io/canva-magic-studio (2ary; canva.com 403).
- Figma Make point-and-edit — https://help.figma.com/hc/en-us/articles/31304412302231 .
- Ableton Live 12 MIDI Tools (Generate / Apply, Density, Accent, undo) — https://www.ableton.com/en/live-manual/12/midi-tools/ .
- Ableton Move review — https://www.soundonsound.com/reviews/ableton-move .
- Logic Pro Session Players (Complexity / Intensity sliders, Details, Manual grid, convert to MIDI) — https://www.soundonsound.com/techniques/logic-pro-session-players ; Apple guide https://support.apple.com/guide/logicpro/lgcp74b34026 (truncated).
- Splice Create / Stacks (12 styles, per-layer refresh, `.als` export) — https://support.splice.com/en/articles/8652645 ; https://splice.com/blog/introducing-create-a-stack .
- XLN XO (similarity map, audition in context) — https://www.xlnaudio.com/products/xo .
- Sonic Charge Patternarium (community vote, evolutionary breeding) — Audiofanzine article n.6933 (article URL not retrieved; soniccharge.com/patternarium is a loader page) *(unverified)*.
- Toontrack EZdrummer 3 (Bandmate, Tap2Find, Grid Editor) — https://www.toontrack.com/product/ezdrummer-3 .
- NI Playbox dice — https://www.native-instruments.com/en/press-area/music-production/playbox/ (unverified).
- Suno Studio take lanes — https://help.suno.com/en/articles/13670529 .
- NN/g "AI: first new UI paradigm" (articulation barrier, hybrid UI) — https://www.nngroup.com/articles/ai-paradigm/ ; Generative UI — https://www.nngroup.com/articles/generative-ui/ ; Login walls — https://www.nngroup.com/articles/login-walls/ .
- Google PAIR feedback + controls — https://pair.withgoogle.com/chapter/feedback-controls/ ; errors — https://pair.withgoogle.com/chapter/errors-failing/ .
- Shape of AI pattern catalogue — https://www.shapeof.ai ; Vercel AI SDK generative UI — https://vercel.com/blog/ai-sdk-3-generative-ui .
- Baymard 2025 checkout (18% abandon on forced account) — https://baymard.com/blog/current-state-of-checkout-ux ; Spool "$300M button" — https://articles.centercentre.com/three_hund_million_button/ .
- M4L activation practice (Isotonik / Fors none; Stepic 3 seats) — https://www.kvraudio.com/forum/viewtopic.php?t=571827&start=15 (forum, anecdotal); https://isotonikstudios.com/product-category/free/ (403 on fetch).

### R7 — Delivery architecture and portability

- Cycling '74 `node.script` — https://docs.cycling74.com/reference/node.script ; Node for Max index — https://docs.cycling74.com/max8/vignettes/00_N4M_index ; projects and devices — https://docs.cycling74.com/legacy/max8/vignettes/03_n4m_projects_devices ; npm — https://docs.cycling74.com/legacy/max8/vignettes/02_n4m_usingnpm ; bundling thread — https://cycling74.com/forums/node-for-max-bundling-in-collectives-standalones-and-max-for-live-devices ; unsigned externals — https://cycling74.com/articles/using-unsigned-max-externals-on-mac-os-10-15-catalina .
- LOM Clip (`add_new_notes`, `apply_note_modifications`, `get_notes_extended`) — https://docs.cycling74.com/apiref/lom/clip/ ; Live API overview (no mutations from notifications) — https://docs.cycling74.com/max8/vignettes/live_api_overview ; Adam Murray, generating MIDI clips (3,434 notes in one call) — https://adammurray.link/max-for-live/js-in-live/generating-midi-clips/ .
- Cloudflare Workers Static Assets — https://developers.cloudflare.com/workers/static-assets/ ; billing — https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ ; Workers limits — https://developers.cloudflare.com/workers/platform/limits/ ; storage options — https://developers.cloudflare.com/workers/platform/storage-options/ ; KV limits — https://developers.cloudflare.com/kv/platform/limits/ ; D1 limits — https://developers.cloudflare.com/d1/platform/limits/ ; D1 read replication — https://developers.cloudflare.com/d1/best-practices/read-replication/ ; R2 limits — https://developers.cloudflare.com/r2/platform/limits/ ; Workflows limits — https://developers.cloudflare.com/workflows/reference/limits/ ; AI Gateway caching — https://developers.cloudflare.com/ai-gateway/features/caching/ ; Durable Objects limits (docs source, partially verified) — https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/limits.mdx .
- Ableton manual, importing MIDI files — https://www.ableton.com/en/manual/managing-files-and-sets/ ; Bitwig browsers (`.mid` under Note Clips) — https://www.bitwig.com/userguide/latest/browsers/ .
- Bitwig Controller API (`createLauncherCursorClip`, `setStep`) — https://www.kvraudio.com/forum/viewtopic.php?t=545154 ; https://www.kvraudio.com/forum/viewtopic.php?t=592244 ; https://github.com/bitwig/bitwig-extensions .
- Reaper ReaScript `MIDI_InsertNote` — https://www.reaper.fm/sdk/reascript/reascripthelp.html ; FL Studio piano-roll scripting — https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/pianoroll_scripting_api.htm ; Logic Scripter limitation — https://www.logicprohelp.com/forums/topic/152364-any-way-to-insert-midi-generated-by-scripter-as-an-event-in-a-midi-region/ (403 on fetch, *unverified*).
- JUCE drag-drop MIDI to DAW — https://forum.juce.com/t/performexternaldragdropoffiles-not-working-in-ableton/42675 ; https://forum.juce.com/t/can-one-drag-and-drop-midi-from-a-juce-plug-in-to-the-daw-timeline/27816 .
- Magenta Studio 2.0 runs offline inside M4L — https://magenta.tensorflow.org/studio-announce-2 .
