# Tembro launch control

This directory is the reviewed desired state for Tembro products and Cloudflare
services. It is deliberately separate from observed production state.

## Evidence order

1. Live HTTP checks, GitHub workflow/PR state, Cloudflare deployment IDs, and the
   exact Lemon Squeezy customer files.
2. Immutable source SHA, workflow run, artifact SHA-256, signing identity, and
   notarization submission IDs.
3. Reviewed values in `products.json`.
4. Issues and handoff summaries.

A summary saying “deployed” or “uploaded” never closes a launch gate by itself.
Unknown values stay `null`.

## Cloudflare production

The production workflow is intentionally manual. Create the GitHub environment
`production`, protect it with a required reviewer, and add one environment secret:
`CLOUDFLARE_API_TOKEN`. Scope the token to this Cloudflare account and the
`gettembro.com` zone, with only the Worker script and Worker route permissions
needed by Wrangler.

The workflow deploys in this order:

1. Validate and dry-run both Workers.
2. Deploy `tembro-api`.
3. Prove the query-bearing Chordarium page and buy route.
4. Deploy `tembro-chordarium-link`.
5. Prove the storefront, exact route contract, health endpoint, checkout target,
   and Atlas email-capture destination.

It never applies D1 migrations. A database migration is a separate, explicit
operation with its own backup and rollback evidence. Keep production manual until
at least two clean runs have been reviewed.

Cloudflare setup references:

- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/workers/versions-and-deployments/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/

## Confirmed Chordarium journey

- The free demo is only at https://chordarium.com: five seeds, no MIDI exports.
- https://gettembro.com/chordarium presents the product and the €59 launch checkout
  (€89 list less the fixed €30 LAUNCH59 discount).
- The installer and license key are delivered through the paid Lemon Squeezy order.
  There is no public binary download. First activation happens in the dedicated
  **Activate Chordarium** dialog and enables the MIDI features.
- DAW Sync follows host BPM, timeline and Play/Stop; disabling it enables manual
  tempo. MIDI out drives a receiving instrument, while the internal piano previews
  through system audio. MAIN and cards can be dragged or exported as MIDI.
- The current target is 0.3.1. Its final source, installer hash, notarization and
  delivery evidence remain pending; see [the release record](releases/chordarium-0.3.1.md).

## Outstanding launch checks and decisions

- Confirm the exact Chordarium file delivered by Lemon Squeezy matches the recorded
  SHA-256, then complete a fresh install, real-key activation, and Ableton drag test.
- Reconcile the external Lemon Squeezy reference `104263`; do not assign it a type
  until confirmed.
- Confirm commercial redistribution rights for the Scaler-derived corpus and the
  JUCE licensing basis before commercial launch.
