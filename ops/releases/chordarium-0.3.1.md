# Chordarium 0.3.1 — paid complete installer, online demo

## Final decision

Stefano's latest explicit instruction on 2026-09-12 supersedes earlier choices:
“non downloadi...lo provi online chordarium.com...se scarichi hai pagato e hai tutto”.

- Demo: https://chordarium.com, five seeds and previews, no MIDI export.
- Purchase: €89 list, LAUNCH59 deducts €30, checkout €59 before applicable taxes.
- Native installer: delivered only through a paid Lemon Squeezy customer order.
- Native features: export, drag and live MIDI included without activation, credits,
  license-key entry, Keychain access or online license validation.
- No public binary on GitHub Releases. No free public installer link.
- gettembro.com/chordarium: Buy VST €59 + Try online demo.
- /chordarium/download: redirects to authenticated Lemon Squeezy My Orders.

## Release evidence

0.3.1 is being rebuilt and notarized after the native access behavior changed.
Source SHA, installer SHA-256, Apple submission and exact delivery-file readback
must be filled from completed checks before launch. Unknown values remain null
in products.json. The previous 0.3.0 installer is not the complete edition.

## Publication authorization

Stefano authorized PR #76 merge, deployment from the Mac, and recording approval
and final evidence in #70. That one-time local deployment exception remains valid;
the default production policy is still a protected manual GitHub workflow.
GitHub production environment/token are not yet configured. No D1 migrations.
The later product-flow correction narrows delivery to paid orders and supersedes
the earlier public-release authorization.

The source changes are in ChordBloom-v1 PR #28. The website is in ableton-agent
PR #76. Both are drafts until final release checks and delivery verification.
The previous native foundation (0.3.0) passed Mac and Linux CI run 34688435075;
that run does not by itself verify the changed 0.3.1 package.

## Deploy sequence

Verify the exact 0.3.1 file listed and downloaded from Lemon Squeezy; update the
product description and receipt copy to remove the old activation instructions.
Then deploy tembro-api, verify the query-bearing product page, deploy the legacy
exact-route shim, and check page/buy/orders redirects and unrelated product routes.
Record deployment IDs and final HTTP evidence in #70. The source and package
must continue to be described as prepared until these checks actually complete.
