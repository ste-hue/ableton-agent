# Chordarium 0.3.2 — paid installer, first activation, online demo

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

The final source is merged on main:
`a866abf45f2f8ae6750923d33e4f63c1d1e0b4fb` (PR #28, containing PRs #25 and #29).
Its tree matches the reviewed freeze `5ed76e2f85e727c8c9c26a5360962241b43d4806`.
CMake was rerun after switching to main; all three universal formats were rebuilt
with visible build ID `a866abf4`. The working tree is clean.

- 74 JavaScript tests pass; demo build matches committed dist without regenerated fixtures.
- All 3 native CTest suites pass on the final main build; Intel processor tests
  under Rosetta report 0 failures.
- Independent overlap/seek review confirms balanced note-off events, including
  tolerated PPQ jitter at an event boundary.
- Final Mac/Linux CI: https://github.com/ste-hue/ChordBloom-v1/actions/runs/34697117900
- GitHub Pages final-main run 34697091838 succeeded; the live online demo hash is
  `9fa1cec71197d0aef76d0c98544b5ff94c68f6bfa823410e05cffbfa65b2242b`.

Final notarization is complete. The existing ste-hue profile authenticated on
retry outside the sandbox; no credentials were recreated. Apple accepted VST3
`7a7a4558-f48b-4c01-8d5e-a22451c893fe`, AU
`e494f07c-630c-4c4e-b2a0-6f72f1e2205d`, standalone
`0881b277-f4eb-49bb-b927-6772081789b9`, and the signed installer
`2b634ca8-ca97-432e-bff2-e5d50c0f624c`.

- Installer: `Chordarium-0.3.2-macOS-universal.pkg`, 22,828,482 bytes.
- SHA-256: `042d9470d1d486ac2a32fb513ce4325fc55ed091a86b0af96b94f27dccf6550e`.
- Gatekeeper: accepted, Notarized Developer ID; installer staple validates.
- Fresh PKG expansion: all three bundles retain strict signatures, valid tickets,
  version 0.3.2, arm64 + x86_64 and build ID a866abf4.
- Final Mac/Linux CI run 34697117900 succeeded on the exact source commit.
- Customer files and release evidence are prepared in
  `~/Downloads/Chordarium-0.3.2-a866abf4/`; exact Lemon Squeezy delivery is pending.
- Live API confirms the license term is one year. The purchase copy explicitly
  states that term; this is a single payment, not an automatic subscription.

Actual purchased-key activation, Ableton/Serum routing and physical drag acceptance
remain unobserved.

## Publication authorization

Stefano authorized PR #76 merge, deployment from the Mac, and recording approval
and final evidence in #70. That one-time local deployment exception remains valid;
the default production policy is still a protected manual GitHub workflow.
GitHub production environment/token are not yet configured. No D1 migrations.
The product-flow correction narrows delivery to paid orders and supersedes the
earlier public-release authorization. The latest activation confirmation must also
be reflected in the store description, receipt and release evidence.

The source changes are in ChordBloom-v1 PR #28. The website is in ableton-agent
PR #76. Source PR #28 is merged; website PR #76 remains a draft until final package and delivery verification.
The previous native foundation (0.3.0) passed Mac and Linux CI run 34688435075;
that run does not by itself verify the changed 0.3.2 package.

## Deploy sequence

Verify the exact 0.3.2 file listed and downloaded from Lemon Squeezy; update the
product description and receipt copy to explain first activation in the dedicated
dialog. Verify real-key activation, MAIN/card export and drag, MIDI out to a
receiving instrument, and DAW Sync on/off before presenting these as released.
Then deploy tembro-api, verify the query-bearing product page, deploy the legacy
exact-route shim, and check page/buy/orders redirects and unrelated product routes.
Record deployment IDs and final HTTP evidence in #70. The source and package
must continue to be described as prepared until these checks actually complete.
