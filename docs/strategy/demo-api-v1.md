# Proposed demo API v1

Companion to the [ecosystem implementation plan](2026-09-24-protected-plugin-demos.md).
Status: design contract, not a deployed API. Endpoint names below are proposed.
Start with Rudiment; add product-specific schemas rather than forcing Chordarium
controls into the drum schema. No payment, credit ledger, or DAW APIs belong here.

## Public and private assets

The public demo can serve its UI, generic player, licensed preview sounds and a
small curated set of musical examples. Treat all of these as downloadable.
The generation engine, full pattern/voicing libraries and provider credentials
exist only in the private runtime. Their absence must be verified in the emitted
public artifact, not merely in the source directory selected for publication.

## Session

`POST /api/demo/v1/sessions`

Request: `{ "product": "rudiment", "turnstileToken": "..." }`.
The server validates the token through Siteverify, including hostname and action,
then issues a short-lived opaque session in an `HttpOnly; Secure; SameSite=Strict`
host-only cookie. Same-origin is the initial deployment assumption. Bind the
session to the product and server-side demo policy; do not accept a client tier.
The response includes expiry and available public controls, never the token.

Proposed pilot settings: 30-minute session, ten completed generation allowances,
one in-flight generation per session, and a burst limiter. These values are
tunable product decisions and have not been configured. New-session creation
also needs abuse controls; a fresh anonymous session is not a new verified person.
Set `Cache-Control: no-store` on session and generation responses.

First Play uses a curated example and does not depend on session issuance.
Siteverify failure leaves that example available but grants no generation session.

## Generate

`POST /api/demo/v1/generations`

Required session cookie and `Idempotency-Key` header. Require JSON, check the
first-party Origin and CSRF protection, reject unexpected fields, and apply a
small request-size limit before expensive parsing or generation.

Illustrative request shape, not current engine configuration:

```json
{
  "product": "rudiment",
  "controls": {
    "styleId": "house",
    "bars": 8,
    "tempo": 120,
    "density": 0.5
  }
}
```

The adapter maps public controls to validated engine configuration. Publish only
style IDs and ranges actually supported by the selected engine revision. Choose
the seed server-side; don't expose bulk seed enumeration, internal presets, raw
engine configuration, arbitrary code, user-supplied URLs or debug options.
Hiding a seed is not the security boundary; keeping the engine private is.

For the first pilot, propose 4/8-bar clips and at most a 16 KiB request body. Fix
tempo/density ranges and event/response limits after measuring representative
output. Reject unsupported choices rather than silently changing their meaning.

The response contains only:

- an opaque generation ID, contract version, product and server request ID;
- tempo, time signature, length and timing resolution;
- public instrument/preview identifiers;
- notes with pitch, start tick, duration tick, velocity and channel as required;
- remaining session allowance and expiry.

Use explicit integer timing units derived from the canonical renderer. Preserve
musical timing/velocity; do not quantize away the quality being demonstrated. An
allowlisted projection strips private arrangement annotations, rule explanations,
internal library IDs and engine diagnostics. Compare that projection to canonical
fixtures. The browser can reconstruct MIDI from these notes even without an export
button; the product promise must not suggest otherwise.

## Request accounting and isolation

1. Validate origin, session, product, body and controls before engine execution.
2. Atomically reserve a session allowance, global generation allowance and
   concurrency slot. Use authoritative accounting, not isolate globals or an
   eventually consistent edge rate-limit counter.
3. Bind the idempotency key to session, product and normalized request hash. A
   duplicate returns the same result without generating again or charging twice;
   a reused key with different controls returns `409`.
4. Execute with request-local configuration and random state. Shared immutable
   tables are acceptable. Shared mutable `cfg`, seed or generated-note arrays are
   not. No browser session may select a filesystem path or engine version.
5. Validate and bound the result, then store the completion and release the slot.
   Keep reservations crash-safe and expire abandoned slots. Refund a user allowance
   for a proven internal failure, while conservatively retaining consumed work in
   the global budget. Do not turn automatic refunds into unlimited expensive retries.
6. Retain bounded idempotency results through session expiry; specify retention in
   implementation. Avoid durable user-project storage for the pilot.

No cross-user response cache initially. If later needed, key it by normalized
configuration, seed, engine version and policy, with authorization/quota decisions
independent of cache hits. Caching must never return another user's private work.

## Errors and playback

| Status | Meaning | Browser behavior |
| --- | --- | --- |
| `400` / `413` | Unsupported or oversized input | Show a useful validation message; do not retry automatically |
| `401` / `403` | Missing/expired session or rejected request | Keep current playback; offer session refresh when appropriate |
| `409` | Conflicting idempotency key or generation already in flight | Preserve current result; do not start parallel work |
| `429` | Session/burst/global allowance exhausted | Respect `Retry-After` where meaningful; keep curated examples and purchase links usable |
| `503` | Generation paused or backend unavailable | Keep current notes; offer curated fallback and a deliberate retry |

Use stable public error codes and opaque request IDs. Do not serialize exceptions,
stack traces or engine state into a response. Discard stale UI responses using a
monotonic client request sequence. A server timeout or a user pressing Stop must
never trigger a half-applied phrase or stop a currently scheduled phrase unexpectedly.

## Acceptance evidence

The first implementation PR must show real canonical-engine parity, actual Worker
runtime measurements, concurrent-request isolation, bounded payload rejection,
atomic/replayed quota behavior, session and CSRF checks, and artifact separation.
Stubs demonstrate transport only and do not close the musical or security gates.
Attach the source revision, public asset manifest and test results to the release
record. Deployment still follows the central repository's production gate.
