# Chordarium 0.3.1 — paid installer, first activation, online demo

## Final decision

Stefano's final confirmation on 2026-09-12 retains the first activation with a
license key. The free demo remains online, and the installer is delivered after
payment. This supersedes the earlier proposal to remove native activation.

- Demo: https://chordarium.com, five seeds and previews, no MIDI export.
- Purchase: €89 list, LAUNCH59 deducts €30, checkout €59 before applicable taxes.
- Native installer: delivered only through a paid Lemon Squeezy customer order.
- First use: paste the key from the receipt or customer order into the dedicated
  **Activate Chordarium** dialog. Activation enables export, MAIN/card drag and
  live MIDI; the plug-in does not consume web credits.
- MIDI out drives Serum or another receiving instrument. DAW Sync follows host
  BPM, timeline and Play/Stop; disabling it permits manual tempo. The setting
  persists per DAW instance. The internal piano previews through system audio.
- No public binary on GitHub Releases. No free public installer link.
- gettembro.com/chordarium: Buy VST €59 + Try online demo.
- /chordarium/download: redirects to authenticated Lemon Squeezy My Orders.

## Release evidence

0.3.1 is being rebuilt and notarized with first activation and the revised MIDI
playback and DAW Sync behavior.
Source SHA, installer SHA-256, Apple submission and exact delivery-file readback
must be filled from completed checks before launch. Unknown values remain null
in products.json. Earlier 0.3.1 candidates do not establish the final artifact's
provenance. The previous 0.3.0 installer is not the current release target.

## Publication authorization

Stefano authorized PR #76 merge, deployment from the Mac, and recording approval
and final evidence in #70. That one-time local deployment exception remains valid;
the default production policy is still a protected manual GitHub workflow.
GitHub production environment/token are not yet configured. No D1 migrations.
The product-flow correction narrows delivery to paid orders and supersedes the
earlier public-release authorization. The latest activation confirmation must also
be reflected in the store description, receipt and release evidence.

The source changes are in ChordBloom-v1 PR #28. The website is in ableton-agent
PR #76. Both are drafts until final release checks and delivery verification.
The previous native foundation (0.3.0) passed Mac and Linux CI run 34688435075;
that run does not by itself verify the changed 0.3.1 package.

## Deploy sequence

Verify the exact 0.3.1 file listed and downloaded from Lemon Squeezy; update the
product description and receipt copy to explain first activation in the dedicated
dialog. Verify real-key activation, MAIN/card export and drag, MIDI out to a
receiving instrument, and DAW Sync on/off before presenting these as released.
Then deploy tembro-api, verify the query-bearing product page, deploy the legacy
exact-route shim, and check page/buy/orders redirects and unrelated product routes.
Record deployment IDs and final HTTP evidence in #70. The source and package
must continue to be described as prepared until these checks actually complete.
