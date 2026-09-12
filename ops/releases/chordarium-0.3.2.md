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
- The three current Lemon Squeezy customer files were downloaded and verified
  byte for byte against the notarized release. Obsolete files were removed only
  after verifying the replacements and Stefano confirmed the effect on past orders.
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

ChordBloom-v1 PR #28 and website PR #76 are both merged. The production website
uses main `4c863628d01ee44059b8a2464ec24f127c95ca50`, whose tree matches the
validated PR head `9ce56ee174c0e011c946ce1fbb7bf5acc71103d0`. All 58 server
tests and Cloudflare CI run 34698298110 passed before publication.

## Verified delivery and publication

[Machine-readable evidence](chordarium-0.3.2-evidence.json) records the exact
customer downloads, notarization submissions and production HTTP results.

| Lemon Squeezy file | File ID | Bytes |
| --- | --- | ---: |
| Chordarium-0.3.2-macOS-universal.pkg | 697341 | 22,828,482 |
| INSTALL.txt | 697342 | 2,692 |
| SHA256SUMS.txt | 697343 | 103 |

All three SHA-256 values match the frozen customer files. The API confirms the
0.3.2 description, €89 list price, key generation and one-year term. After saving
and reloading the product UI, the confirmation modal and receipt retain the new
activation instructions and **Download & license key** button to My Orders.
LAUNCH59 remains a published, fixed €30 discount without an expiry or usage limit.

The protected manual GitHub production workflow remains the default. Stefano's
explicit one-time Mac exception was used here. No D1 migration was applied.

| Worker | Deployment ID | Version ID |
| --- | --- | --- |
| tembro-api | f9ebb6bd-d267-430e-b8b1-4b2b32180a08 | d137e5b3-7a20-4d20-9a21-1b79f96dec11 |
| tembro-chordarium-link | c5a64b4e-eaf9-499a-930d-6eac021829be | 55d88989-ab12-4396-9728-49a6fb8cbf26 |

The main Worker was deployed first, followed by the query-bearing page smoke test,
then the exact-route shim. All 11 final HTTP observations passed: catalog,
Chordarium, Atlas, Tembro and health return 200; the product trailing slash returns
308 preserving its query; HEAD returns 200 with no body; POST returns 405 with
GET/HEAD allowed; purchase redirects to LAUNCH59 checkout; customer downloads
redirect to My Orders; Atlas download redirects to its email-capture checkout.

## Remaining acceptance

This verifies published artifacts, stored copy and public routing. It does not
claim a newly purchased order, fresh installation, real-key activation, physical
MIDI drag or Ableton/Serum playback was observed. The next acceptance action is to
install the exact customer PKG, ensure no old per-user plugin hides it, verify the
visible **0.3.2 · a866abf4** build, and run that DAW trial.
