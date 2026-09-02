# ADR-0001 — Product shape, target user, monetization and channel

- **Status:** Proposed
- **Date:** 2026-09-02
- **Deciders:** Stefano (owner); Marco (collaborator, drum library and skills, PR #40)
- **Research:** four web-research passes (R1–R4) on 2026-09-01/02, summarised in
  the Sources appendix. Every figure below links to where it was read.

## Context

Tembro today is a Max for Live device with a chat box and four skill buttons; a
Cloudflare Worker runs an LLM agent (OpenAI Responses API, up to 256 tool steps
at reasoning effort "high") that reads and writes the Live Set. It is a free
beta, macOS only, downloaded from GitHub Releases, gated by email + access code,
metered in credits (100 on signup, 1–4 per turn by skill, `server/src/skills.ts`).

What the last two weeks showed:

- **The first external tester never got in** (issue #45): the access-code screen,
  a "connection failed", no path to value. The person is a musician, not a
  developer.
- **The agent makes good drums but takes ~5 minutes a turn**, spends most of it
  wandering, and never says "done" (issue #44). Under "full throttle" the user
  waits and does not know whether to wait.
- **Musicians want to choose.** Pros arrive with a palette and want three fast
  options they can pick from and tweak; amateurs want it decided and playing in
  ten seconds (`musicagent` field notes: "se lo fai col tuo synth, è tua", "già
  sai dove vai"; `ChordBloom`: "creating is free, taking it into the DAW costs a
  credit"). Neither wants to watch a chat think.
- **Drums are what the agent does best**, and drums are the part of a track that
  musicians most readily accept from outside — they keep melody, harmony and
  sound design for themselves.
- Issues #41–#45 already sketch the pivot: an offline generator that fills
  `drum-library/`, a MAKEDRUMS button that places a pre-generated arrangement in
  seconds, a DAW-portable MIDI format, bounded agent turns, login-free onboarding.

Earlier decisions this record touches: closed consumer product with a
subscription (`docs/product-analysis.md`, 2026-08-30), Lemon Squeezy as billing
authority (same), "credits, never tokens" (`docs/product-vision.md`), beta grant
100 and subscription target ~€12/mo with credits priced per composition weight
(`docs/0.1.3-roadmap.md` item 2). Those name one competitor (Studio Pilot) and
no price justification, channel, market size or beta→paid mechanics. This ADR
supplies them and records two linked decisions.

## Decision A — What the product is, and for whom

### Options considered

**(a) Chat agent only** (today). A general "AI in Ableton" copilot.
Every paid competitor in this slot — StudioPilot €23.99–€77.99/mo, LIA
€24.99–€199.99/mo, VIXSOUND $9–$79/mo — is a do-everything chat with no
independent reviews, and the free floor is already crowded (Magenta Studio,
`ableton-mcp` 2,951 GitHub stars, Producer Pal) [R1, R3]. Our own turns cost
minutes and the output cannot be auditioned before it lands.

**(b) Pre-generated drum library behind a button, no agent.** Instant, zero
marginal cost, portable MIDI. But a one-click black box is the least protectable
output for the user (US Copyright Office: prompts alone are not authorship;
human selection, arrangement and modification are) [R4], competes head-on with
Splice ($12.99/mo, MIDI patterns 1–3 credits) and stock content [R2, R4], and
throws away the one thing the agent is good at: editing *this* Set.

**(c) Library as the product, agent as the editor.** The button places a
curated, pre-generated drum arrangement as editable MIDI clips in seconds; the
agent is the follow-up ("more hats", "half-time the bridge", "fit my kit"),
bounded and priced as an edit. This is how every drum tool that actually sells
behaves — XO (€149), Atlas 2 ($99), Playbeat (€59), Microtonic + Patternarium
(€99, community-voted patterns): instant, editable, auditionable patterns, never
chat [R1]. It matches what producers say they want — 57.9% "AI as a tool", 8.8%
"full automation" (Sonarworks × SOS, n = 1,194) [R4] — and Ableton's own
editorial line — "the AI as a tool, but they're still sitting in the pilot's
seat" — and product direction (non-generative MIDI tools, Splice inside Live
12.3) [R4].

### Decision

**We build (c).** Tembro is a drum library you audition and place from inside
Live in seconds, with an agent that edits what you placed. Drums first; harmony
and melody skills stay in the code but leave the default UI until the drum
loop is proven.

**Target user: the Live Suite / Standard + Max for Live owner who chooses.**
Not a hedge — the market decides it for us: third-party M4L devices load only in
Suite or Standard + the M4L add-on (€149; Suite ≈ €599 and Standard ≈ €279
from search results); Intro and Lite cannot load them [R3]. Everyone who can
run Tembro has already spent roughly €430 or more on Live. That is
the prosumer/pro who wants options and control, not the curious amateur.

The amateur is served, not targeted: the default path is "press MAKEDRUMS, it
plays". The pro path is the same button plus choice and editing. The table is
the design rule for every surface:

| Moment | Amateur wants | Pro wants | Product answer |
|---|---|---|---|
| Genre / feel | decided for them | their own palette | genre buttons + "like my Set" (reads tempo, kit, existing clips) |
| Pattern | one that works, now | three to compare | always place a pick, offer the two alternates one click away |
| Sound | the kit that came with it | *their* kit, their mapping | role-based notes remapped to the loaded Drum Rack (issue #43) |
| Changes | "make it better" | precise, reversible | agent edits as one bounded turn, undo is Live's undo |
| Ownership | does not think about it | must be theirs | MIDI in their clips, editable, exportable; no audio we do not own |

**What we deliberately do not do:** general-purpose chat as the front door;
audio loops rendered from stock kits (Ableton EULA §5(3): stock materials may
not be distributed "as a sound library … sample-based product"; Loopmasters and
Cymatics kits carry the same "no isolation" clause) [R2] — the library is MIDI
only; a Windows build before the macOS loop is proven (no data on the producer
macOS/Windows split; open question, not a known small loss) [R3]; multi-DAW
before Live works (issue #43 keeps the format portable so that door stays open).

## Decision B — How it is paid for and where it is sold

### Options considered

| Option | Precedent | Why not alone |
|---|---|---|
| **Pure credits** (today) | Suno, Udio, Runway; 29% of SaaS use AI credits, growing 126% in 2025 | Loudest complaint in the category is credit burn on failed generations (Suno reviews); Cursor's 2025 credit switch triggered a public apology; no M4L product has ever sold this way [R1, R3, R4] |
| **Subscription only** (~€12/mo) | Category norm $10–20/mo with an allowance: Splice, LANDR, Suno, Udio | Zero-marginal-cost library would be rented, not owned; M4L buyers expect a licence; freemium converts 3–5% (OpenView) [R3, R4] |
| **One-off licence / packs only** | Every M4L channel: €19–€149; Toontrack ≈ €29 per song-structured MIDI pack; Unison $17 per genre; XO/Atlas/Playbeat €59–€149 | No recurring cover for inference; agent edits would be unlimited or absent [R1, R2, R3] |
| **Hybrid: licence + optional metered editor** | MIDI Agent $49 one-time + $20/mo Pro; 37% of SaaS now hybrid; Udio's non-expiring PAYG add-on | — this is the decision |

### Decision

1. **The device and the drum library are a perpetual licence, sold through
   Lemon Squeezy** (kept from 2026-08-30: 5% + $0.50 (+1.5% international,
   +0.5% on subscriptions), merchant of record with VAT and licence keys; Gumroad is 10% + $0.50 and 30% via Discover) [R3].
   List price **€59**, in the €59–€149 band where XO, Playbeat, Atlas and
   K-Devices sell, and above the Toontrack ≈ €29 "one pack" anchor because the
   licence carries the whole catalogue and the in-Live placement [R1, R2, R3].
   Library placements are unlimited and cost us ≈ $0.

2. **The agent editor is an optional subscription, "Tembro Editor", €12/mo**
   (kept from the roadmap), **including 40 edits a month**, plus **non-expiring
   top-ups (20 edits, €6)** for occasional users, the Udio pattern [R4]. An
   *edit* is one bounded agent turn (ADR-0002 defines the bound). Unused
   included edits do not roll over; top-ups never expire.

3. **Failed or rejected turns are never charged.** Provider failures already
   refund (`server/test/app.test.ts` "a provider failure refunds the agent
   turn"); this extends to turns the user discards within the same session.

4. **Credits stay the internal unit but are shown as "edits", never tokens**
   (confirms `docs/product-vision.md`). The per-skill multipliers in
   `server/src/skills.ts` become per-outcome prices: placement 0, edit 1,
   generate-new 2, full arrangement 4.

5. **Beta → paid: a free tier sized to one whole track, with no expiry.**
   Download is free and needs no account and no card. Every install gets
   **20 library placements and 12 edits**, enough to build and finish one
   track; there is no timer. When the counters are used up the library locks
   behind the licence and edits behind the subscription. The size is an
   outcome, not a duration: the person who reaches the end has a track and can
   say so (decided 2026-09-02: "deve poter fare un'intera traccia"). Time-boxed
   trials convert 8–25% versus 3–5% for perpetual freemium (OpenView/Lenny,
   1,000+ products) [R4]; a usage-capped tier sits between the two and we
   accept the lower bound because, at this stage, the free tier exists to
   produce finished tracks and testimonials, not revenue. The 100-credit beta
   grant and shared access code go away (supersedes roadmap item 2 and the
   current `BETA_GRANT_CREDITS` / `BETA_ACCESS_CODE` flow; see ADR-0002 for
   the login-free mechanics).

6. **Channel: our site + Lemon Squeezy for checkout; discovery elsewhere.**
   Lemon Squeezy has zero marketplace reach and no M4L device sells there yet
   [R3]. Reach comes from a maxforlive.com reference listing (commercial devices
   are listed as external links), YouTube demos, rekkerd / Sonic State / CDM /
   KVR news posts, r/ableton and the Cycling '74 forum — the channels every
   M4L vendor uses [R3]. Ableton Packs (partner-only, no public application)
   and Isotonik (unpublished revenue share) are deferred; if ever, as a
   one-off "lifetime + bring-your-own-key" SKU, since neither channel fits
   metered products [R3].

7. **Community: a Discord server, invited at two moments.** Stefano creates
   the server. The device offers the invite (a) at the first success — the
   first placement that plays — and (b) when a track is finished, i.e. when
   the free counters run out or the user marks the track done. Nothing is
   asked before value is shown (the Baymard/NN/g evidence in ADR-0002). The
   Discord is for community, support and promotion: testers post finished
   tracks, ask for help, and feedback and the library ranking signal (thumbs,
   "which one did you keep") are gathered there. It is not the release
   channel: a new version is announced by the device itself — the "update"
   pill that appears when `/v0/version` reports a newer `APP_VERSION` and
   opens `DOWNLOAD_URL` (already built, `tembro_main.js:373`). The invite is
   shown once per moment, never as a wall.

8. **The source repository goes private; the ADRs stay inside it.**
   `docs/product-analysis.md` chose "closed consumer product" on 2026-08-30 but
   the code stayed on a public repository. That ends: `ste-hue/ableton-agent`
   becomes private (0 forks, 0 stars at the time of the decision, 2026-09-02;
   collaborators keep access). The ADRs are working records that guide issues and PRs, not
   marketing; the public surface is the site and the download. Consequence:
   the DMG cannot stay on this repository's GitHub Releases (assets of a
   private repository require authentication) and moves to a public host
   before the flip — see Consequences.

### Amendment A1 (2026-09-02) — credit packs instead of a subscription; Terra; 64-step budget

Decided the same day as the ADR, after reading the per-call metering (`agent.usage`
events in production D1) against the current OpenAI price list (gpt-5.6-sol
$4 / $0.40 cached / $20 per M tokens; gpt-5.6-terra exactly half; gpt-5.6-luna
$0.20 / $0.02 / $1.20). Four fully-metered `song_from_scratch` turns on Sol:

| Rounds | Input tokens | cached | Output | Cost on Sol | Cost on Terra |
|---|---|---|---|---|---|
| 2 | 13k | 48% | 95 | $0.03 | $0.02 |
| 61 | 1.0M | 98.5% | 3.7k | $0.53 | $0.27 |
| 97 | 2.6M | 98.5% | 9.5k | $1.37 | $0.68 |
| 97 | 4.5M | 97.5% | 20k | $2.64 | $1.32 |

The cache does its job; cost scales with **rounds**, and 97-round turns were
already happening. At the then-configured 500 credits for €12 (€0.022 per
credit) a 4-credit composition cost 6–30× what it earned. This answers the
first open question below (measured cost per edit on Sol: $0.13–0.66 per
credit, above the $0.30 line) and changes point 2 of Decision B:

1. **Credits are sold as one-time, non-expiring packs, not a subscription:**
   **Starter €12 → 40 credits, Studio €29 → 120 credits.** Per-skill prices
   are unchanged (tweak 1, beat / harmony 2, arrangement 4), so a credit is
   worth ≈ €0.27 net after Lemon Squeezy fees. No pack under €12: the $0.50
   fixed fee is 13% of a €6 pack. The subscription is not ruled out — it can be
   added as a discounted recurring pack once repeat purchases exist — but with
   zero customers a second way to pay optimises retention we do not have yet.
   The "credit burn" objection to pure credits (Options considered) is met by
   what already ships: the cost estimate before sending, the refund on any
   turn the server cannot complete, and (with the library, point 1) a free
   deterministic path for drums.
2. **Default model is gpt-5.6-terra** (`LLM_MODEL`), half of Sol at every
   price point. Sol becomes an opt-in per turn at **×2 credits** (device toggle
   and server parameter: follow-up PR).
3. **One turn is bounded to 64 model rounds** (`AGENT_STEP_BUDGET`, stated to
   the model in the system prompt; the device's local cap is only a safety
   net). Measured: ≈ 60 cached rounds on Terra ≈ $0.30, i.e. the worst case for
   a 4-credit arrangement (€1.08 of revenue). A turn that hits the budget is
   still refunded (Decision B point 3); the metering tells us how often.
4. **Beta grant drops from 100 to 40 credits** — one Starter pack.

Implementation: `server/src/billing.ts` grants on paid `order_created`
webhooks by variant (`CREDIT_PACKS` = `"variantId:credits,…"`), idempotent per
order id; `subscription_payment_success` is no longer handled.

### Unit economics

€ and $ are treated at par (error < 15% at 2026 rates). Fees are Lemon Squeezy
5% + $0.50 (+0.5% on subscriptions).

| SKU | Price | Marginal cost to us | Fees | Gross margin |
|---|---|---|---|---|
| Library licence (perpetual) | €59 | ≈ €0 (D1 read + static MIDI; Workers paid plan $5/mo flat) | ≈ €3.45 | ≈ 94% |
| ~~Editor subscription, all 40 edits used~~ (superseded by A1) | €12/mo | 40 × $0.15 ≈ €6.00 | ≈ €1.16 | ≈ 40% worst case |
| Starter pack, 40 credits, worst case (10 arrangements × 64 rounds on Terra) | €12 | 10 × $0.30 ≈ €3.00 | ≈ €1.10 | ≈ 66% |
| Starter pack, typical mix (4 arrangements, 12 beats, 8 tweaks) | €12 | ≈ €1.20 + €1.80 + €0.40 ≈ €3.40 | ≈ €1.10 | ≈ 62% |
| Studio pack, 120 credits, worst case (30 arrangements) | €29 | ≈ €9.00 | ≈ €1.95 | ≈ 62% |
| Free tier, fully used (20 placements + 12 edits) | €0 | 12 × $0.15 ≈ €1.80 | — | acquisition cost |

At ≈ €1.80 per free user who finishes a track, one licence (€59 net ≈ €55.55)
pays for ≈ 30 free users who never buy, i.e. the free tier breaks even at
≈ 3% conversion to licence, or ≈ 15% to one month of Editor (€12 net ≈ €10.84
covers ≈ 6 free users). Both are inside
the ranges above; the number to watch is free users who spend all 12 edits
without ever placing a pattern (edit-only use is the expensive path).

Cost-per-edit note: a heavy cached turn on gpt-5.6-luna measured ≈ $0.015
(`docs/0.1.3-roadmap.md` item 2). The current model, gpt-5.6-sol, sits in the
Terra band (~10× Luna input price); **$0.15 per bounded edit is an assumption**
until the whole-turn metering shipped in PR #39 (`tembro_turn_log`) is read over
a week of real edits. If measured cost exceeds $0.15, the included allowance
drops before the price rises. The median gross-margin target for AI products is
50% (Growth Unhinged 2026, 230 companies) [R4]; the blend above clears it.

## Consequences

Concrete edits, in the order they unblock each other:

- **Issue #42 (MAKEDRUMS button)** becomes the primary surface and the product.
  Placement is free of credits; the button always places a pick and offers two
  alternates; placement writes MIDI clips, never audio.
- **Issue #41 (offline generator)** produces MIDI only, with a `license` field
  in `drum-library/metadata/*.json` ("royalty-free in compositions, no
  redistribution as MIDI/loops" — the norm across Splice, Loopmasters, Cymatics,
  Unison [R2]), sections and bar counts per arrangement, and aims at a curated
  catalogue of hundreds, not a Splice-scale million.
- **Issue #43 (portable format)** is confirmed: role-based notes + GM map is what
  Toontrack and Unison sell; it is also the Bitwig door.
- **Issue #44 (agent turns)** is re-scoped as the Editor tier: one edit = one
  bounded turn, drum-focused by default, explicit "done"; details in ADR-0002.
- **Issue #45 (onboarding)** is re-scoped to the free tier: no account before
  value, counters "placements left / edits left" visible in the device, the
  Discord invite at first success and at track finished, licence key only at
  purchase.
- **`server/src/skills.ts`**: `creditMultiplier` becomes a per-outcome price
  (placement 0, `clip_edit` 1, `beat_making` 2, `song_from_scratch` 4);
  `harmony_melody` stays defined but is not shown in the default device UI.
- **`server/src/site.ts`**: the credit menu becomes two SKUs (licence €59,
  Editor €12/mo + top-up); copy leads with "drums you audition and place in
  seconds, edited by an agent that knows your Set", not with "AI in Ableton".
- **`server/wrangler.jsonc`**: `BETA_GRANT_CREDITS` and `BETA_OPEN_ACCESS`
  are replaced by free-tier parameters (`FREE_PLACEMENTS` 20, `FREE_EDITS` 12)
  once ADR-0002's onboarding lands; `SUBSCRIPTION_GRANT_CREDITS` becomes 40;
  `DOWNLOAD_URL` stops pointing at this repository's GitHub Releases.
- **Repository private, in this order:** (1) publish the current DMG on a public
  host that needs no authentication (a separate public releases repository or
  Workers Static Assets — the DMG is < 0.5 MB); (2) update `DOWNLOAD_URL` and
  the install instructions and verify the new URL downloads without a session;
  (3) flip `ste-hue/ableton-agent` to private and confirm the collaborator
  still has access. Never in the reverse order: testers would lose the download.
- **Discord:** Stefano creates the server; the invite link becomes a Worker
  variable so the device never hard-codes it; the device shows it at the two
  moments in Decision B.7.
- **Superseded:** "closed consumer product with a subscription" as the only
  model (`docs/product-analysis.md`, 2026-08-30) → hybrid licence + subscription;
  "beta grant stays 100" (`docs/0.1.3-roadmap.md` item 2) → free tier of one
  track; "closed consumer product" on a public repository → closed product,
  private repository.
  **Confirmed:** Lemon Squeezy; credits-not-tokens; ~€12/mo for the metered tier.
- **Deferred:** Windows build; multi-DAW plugin; Ableton Packs / Isotonik;
  harmony/melody as a front-door skill; any audio content.

## Open questions — what would change this decision

- ~~**Measured cost per edit** on gpt-5.6-sol.~~ Answered in Amendment A1:
  $0.13–0.66 per credit on Sol, hence Terra + the 64-round budget. Next
  question: the **rate of budget-limited (refunded) arrangements** on Terra.
  Above 1 in 5, either the prompt must plan shorter turns or the arrangement
  skill moves to 6 credits.
- **Windows share of the addressable base.** No producer survey splits
  macOS/Windows [R3]. If a maxforlive.com listing shows > 40% Windows enquiries,
  the Windows build moves ahead of the Editor tier.
- **Library size that feels "enough".** If trial users exhaust the catalogue in
  a session, the generator (#41) needs a variation step per placement rather
  than a bigger static library.
- **Ableton's stance on AI devices.** Today: no policy, an editorial line of
  "AI as a tool" with the producer "in the pilot's seat" [R4]. A Packs-store AI policy either way would
  reopen the channel question.
- **Conversion after a finished track.** The free tier has no clock, so the
  measure is: of users who exhaust the counters, how many buy within 30 days.
  Below 5% after 200 finished tracks, the licence price is too high for the
  value shown — test €39 before changing the model. If many installs never
  reach a finished track, the problem is onboarding (#45), not price.
- **Free users who never finish and never join Discord.** If fewer than a
  quarter of first-success users take the invite, the invite moment or its
  wording is wrong; move it, do not add a second one.

## Sources

Access dates: 2026-09-01 unless marked 09-02. † = the vendor page returned 403
to fetches and the figure rests on search snippets or a secondary source.

### R1 — Direct competitors: AI-in-DAW assistants and drum tools

| Product | What | Price / model | Limits | Signal |
|---|---|---|---|---|
| StudioPilot — https://studiopilotmusic.com/app | Chat agent controlling Ableton, 200+ actions | €23.99 / €47.99 / €77.99 per month = 2,000 / 8,000 / 20,000 credits; DIY kit one-time (BYO Claude/Codex; price not on page, €29.99 *unverified*) | Ableton only, macOS + Win, no trial | No independent reviews found |
| StudioPilot.tech (unrelated company) — https://studiopilot.tech | Browser studio + VST3/AU plugin | Free 1,000 credits; $12 / $30 / $60 per month | Multi-DAW | No reviews found |
| LIA — https://liaplugin.com/pricing | Chat copilot, editable MIDI, Ableton bridge | Free web; €24.99 / €49.99 / €99.99 / €199.99 per month; €699 Founder one-time | Ableton bridge only | Marketing only |
| MIDI Agent — https://www.midiagent.com | VST3/AU/AAX prompt-to-MIDI, BYO API keys | $49 one-time (list $99) + optional Pro $20/mo = 500 generations | 10 DAWs | Closest hybrid template |
| VIXSOUND — https://vixsound.com/blog/best-ai-tools-for-ableton-2026 | Ableton chat assistant | $9–$79/mo *(unverified, self-published)* | Ableton only, Win beta | — |
| Feater (KVR thread) — https://www.kvraudio.com/forum/viewtopic.php?t=624994 ; free bridges of the same kind: LivePilot, AbletonMCP | Free/OSS MCP bridges | Free (needs Claude sub) | Python/Max setup | "It did find a notch in a vocal once in seconds" vs "exactly zero examples of what people call 'AI' that I will tolerate"; one user: "$9,99? $19,99? Something like this, one fee" (one-time) |
| Magenta Studio 2.0 — https://magenta.withgoogle.com/studio | M4L Generate/Continue/Groove/Drumify | Free, open source | Live 10.1+ Suite | "UX rough", Drumify "does nothing" reports *(unverified, Google Groups)* |
| XLN XO — https://www.xlnaudio.com/products/xo ; reviews https://www.kvraudio.com/product/xo-by-xln-audio/reviews | Drum sampler, similarity map, 240+ beat presets, MIDI drag-out | €149 list, €89.40 on sale at access date, perpetual | VST/AU/AAX | KVR 4.5/5 "breath of fresh air"; "pricy", "doesn't update" |
| Audiomodern Playbeat 3 | Generative groove sequencer, MIDI drag-out | €59 (2022 Attack review); ~$39–59 street *(unverified)* | VST/AU/AAX/iOS | "only random-sequence generator you need"; learning curve |
| Algonaut Atlas 2 (SOS/KVR, vendor 403) | AI sample map + kit builder + sequencer | $99, $19 upgrade, trial *(unverified)* | one-shots only | KVR 5/5: "within 1 minute… drum beats that sound brilliant" |
| Unison Drum Monkey — https://unison.audio/drum-monkey | ML drum-loop generator | $397 list, $297 sale, rent-to-own $14.99 × 22 | Mac/PC | KVR: "advertised EVERYWHERE… not all that" |
| Sonic Charge Microtonic + Patternarium — https://soniccharge.com/microtonic | Drum synth + free evolutionary pattern pool with voting | €99 perpetual | patterns need Microtonic | Long-lived cult product |
| WavTool — https://suno.com/blog/suno-acquires-wavtool | LLM-assisted browser DAW | Shut down (date *unverified*); acquisition announced by Suno 2025-06-30 | — | Cautionary tale |
| Suno — https://suno.com/pricing | Text-to-song; "Studio, now with MIDI" (Premier) | Pro $8/mo, Premier $24/mo (annual $76.80 / $230.40 per year); 2,500 / 10,000 credits | not in-DAW | MusicTech 6/10 (Jan 2026): "inconsistent… consume credits" |
| Udio — https://eesel.ai/blog/udio-pricing | Text-to-song | Free 100 cr; $10 / $30 per month; PAYG $3/100 cr *(secondary)* | not in-DAW | credits don't roll over |

### R2 — Marketplaces, pricing norms, licensing

| Marketplace | Model | Price | Licence |
|---|---|---|---|
| Splice — https://splice.com/plans ; https://support.splice.com/en/articles/8652592-splice-plans-faq | Subscription + rollover credits | Sounds+ $12.99 = 100 cr; Creator $19.99 = 200; Creator+ $39.99 = 500; 1 sample = 1 credit; MIDI/presets 1–3 credits | Royalty-free in works, no redistribution as loops — https://support.splice.com/en/articles/8652642-splice-sounds-licensing-faq |
| Loopcloud — https://www.loopcloud.com/cloud/subscriptions/plans | Subscription + points | €6.99 / €10.99 / €19.99 per month = 100 / 300 / 600 pts | no use "in isolation … as loops … within any competitive products" — https://help.loopmasters.com/hc/en-us/articles/7718315377044 † |
| NI Sounds.com | Subscription, $9.99/mo (2018) | Retired 2023-06-30 with 1.8M samples — https://community.native-instruments.com/discussion/15561 † | — |
| Cymatics — https://cymatics.fm/collections/midi | One-off packs | list $10–200, sold $3–47 | royalty-free, no resale, store-credit refunds |
| Unison — https://unison.audio/product/unison-drum-bass-midi-drum-collection/ | One-off packs | **$17 per genre MIDI drum collection** (a $7 starter pack was seen in search results, *unverified*) | "100% royalty free" |
| Toontrack — https://www.toontrack.com/product/drum-midi-6-pack/ | One-off | 6-pack **€119** ("bundle savings €55", i.e. ≈ €29 per Drum MIDI pack, implied) | Toontrack EULA |
| Ableton Packs — https://www.ableton.com/en/packs/ | One-off, Live-only | €19–€149 (Session Drums €79, Meld €99) | EULA below; refunds 14 days only if unauthorised — https://help.ableton.com/hc/en-us/articles/209776525 † |
| Gumroad — https://gumroad.com/pricing | Marketplace | 10% + $0.50 direct, 30% via Discover, MoR | seller sets licence |
| Sellfy — https://sellfy.com/pricing/ | SaaS storefront | $22 / $59 / $119 per month, 0% fee | seller sets licence |

Ableton EULA §5(3) — https://www.ableton.com/en/eula/ : stock materials "are not
to be resold, sublicensed, or otherwise distributed"; use "for the creation of
other sound packs … sample library, sample-based product … is prohibited";
isolated "sound samples, loops … must not be distributed or licensed or sold as
individually licensable content". Commercial-use help article (403†):
https://help.ableton.com/hc/en-us/articles/209768885 . Conclusion: audio loops
rendered from stock kits cannot be sold without written consent; MIDI we author
is ours.

### R3 — M4L channels and market size

| Channel | Fees / terms | Typical price | Notes |
|---|---|---|---|
| maxforlive.com — https://maxforlive.com/help.php † | Free directory; commercial devices listed as external links | free / PWYW dominant | not a store |
| Isotonik Studios — https://isotonikstudios.com/isotonik-collective/ † | Curated collective, revenue share not public | £10–£70 (e.g. Console x8056 $68, Optocomp $28.80 — https://elphnt.io/max-for-live-curated-collection/) | newsletter, 25% birthday sales — https://rekkerd.org/isotonik-studios-birthday-sale-max-for-live-devices-ableton-tools-sound-packs/ |
| Ableton Packs (M4L) — https://www.ableton.com/en/packs/#?item_type=max_for_live | Partner contract, no public application found | €19–€149, most €29–€59; Max for Cats Bundle €109 — https://www.ableton.com/en/packs/max-cats-bundle/ | one-off only |
| Direct shops — https://k-devices.com/products/ttap/ ; https://sonicbloom.net/products/max-for-cats-complete-collection/ | own WooCommerce/Gumroad | K-Devices TTAP €59, Phoenix Bundle (WOV + TTAP + Shaper 2) €99; Max for Cats Complete €199 | YouTube demos, rekkerd / Sonic State / CDM |
| Gumroad — https://gumroad.com/pricing | 10% + $0.50; 30% Discover; MoR since 2025-01-01 | $3–$40 long tail | where indie M4L lives |
| Lemon Squeezy — https://www.swell.is/content/lemon-squeezy-pricing ; https://dodopayments.com/blogs/lemonsqueezy-review | 5% + $0.50, +1.5% intl, +0.5% subs; merchant of record; licence keys | — | no M4L device found selling here; zero discovery |

Market size: Ableton "over 350 people" — https://www.ableton.com/en/about/ ;
revenue 2023 ≈ USD 75.8M (Tracxn, secondary, *unverified*); **no official user
count**; my derivation ≈ 250k licence transactions/yr, cumulative paid
Standard/Suite base plausibly 1–2M (low confidence). Suite share: no public
data. M4L requires Suite or Standard + add-on €149 / €79 crossgrade (add-on prices on the fetched page; Suite €599 / Standard €279 from search results, *unverified*) —
https://www.ableton.com/en/shop/ ; Intro/Lite cannot load third-party M4L —
https://help.ableton.com/hc/en-us/articles/360019145319 † . Share among DAW
users (pro-skewed Production Expert surveys): 7.5% (2023) → 5.9% (2024, 5,000+
resp.) — https://www.production-expert.com/production-expert-1/2024-daw-user-survey-the-results .
macOS/Windows split among producers: no survey found. AI devices already out:
`ahujasid/ableton-mcp` 2,951 stars (GitHub API), Producer Pal (Anthropic "Built
with Claude" honorable mention; star count and licence *unverified*) — https://cycling74.com/forums/producer-pal-mcp-server-running-in-node-for-max-to-control-ableton-live ;
complaints in that thread: one Windows 10 crash report and "mod matrix slots aren't exposed" — not price.

### R4 — Willingness to pay, conversion, rights (09-01/02)

Pricing: Suno Pro $8 / Premier $24 per month, 50 free credits/day, 2M paid
subscribers and $300M ARR (Feb 2026) — https://suno.com/pricing ;
https://techcrunch.com/2026/02/27/ .
Udio Standard $10 / Pro $30, PAYG $3/100 non-expiring — https://eesel.ai/blog/udio-pricing .
LANDR Studio "from $8.25/mo" annual *(unverified: no price rendered on the fetched page)* — https://www.landr.com/pricing/studio .
iZotope Ozone 12 Advanced $499 (Music Production Suite $799 *unverified*) —
https://www.izotope.com/en/products/ozone.html . Splice as in R2, plus gen-AI
tools (Variations, Craft, Magic Fit) inside the subscription with creator
compensation — https://musicrow.com/2026/04/splice-extends-creator-compensation-model-with-new-generative-ai-tools/ (2026-04). BandLab
Membership $14.95/mo *(unverified: no price on the fetched page)* — https://blog.bandlab.com/bandlab-membership . AIVA
€11 / €33 per month, Standard tier keeps copyright with AIVA *(unverified)*.
Peers: Midjourney $10–$120, Runway $12–$76, ElevenLabs $6–$990 credit tiers.

Conversion: freemium self-serve 3–5% good, 6–8% great; free trial 8–12% good,
15–25% great (1,000+ products) — https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion .
2026 (230 companies): hybrid
pricing 37%; 29% use AI credits; median AI gross-margin target 50% —
https://www.growthunhinged.com/p/the-state-of-b2b-monetization-in-2026 .
Credit models grew 126% in 2025 — https://blog.hubspot.com/website/why-ai-usage-based-pricing .
Against pure credits ("six fatal flaws", Cursor June 2025 backlash) —
https://www.softwarepricing.com/blog/credit-based-pricing-ai/ .

Spend and attitude: Sonarworks × Sound On Sound (n = 1,194, Feb 2026): 58% use
AI restoration, 38% mixing assistants, 20.9% composition tools; 57.9% see AI as
a tool, 8.8% want full automation; 77% fear loss of originality —
https://www.sonarworks.com/blog/research/future-music-production-human-producer-survey-2026 .
BPB 2023 (n = 1,533): 36.8% used AI; 33.6% "inspiration only". Annual dollar
spend per producer: no verified primary source.

Rights: US Copyright Office Part 2 (2025-01-29): prompts alone ≠ authorship;
human selection, arrangement or modification of AI output can be protected —
https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf .
Suno–WMG settled Nov 2025; UMG–Udio settled Oct 2025 (walled garden); Sony
still litigating — widely reported (Music Business Worldwide, Hollywood
Reporter); article-level URLs not retrieved, *unverified* here.
Spotify 2025-09-25: 75M spam tracks removed, DDEX AI-disclosure credits —
https://musically.com/2025/09/25 (429 on fetch, *unverified*). Ableton: no policy; two-part AI editorial,
"the AI as a tool, but they're still sitting in the pilot's seat" —
https://www.ableton.com/en/blog/ai-and-music-making-the-state-of-play/ .
