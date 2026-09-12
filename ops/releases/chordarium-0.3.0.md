# Chordarium 0.3.0: public Mac download

Prepared 2026-09-12 for Stefano's request: public download on gettembro.com,
with a separate €59 license button (list €89, LAUNCH59 deducts €30).

## Immutable package evidence

- Source repository: `ste-hue/ChordBloom-v1`.
- Exact binary source commit: `31c685614538d0ed0fc97ab14a6f40a6a1dcac72`.
- Source branch: `release/chordarium-0.3.0`; documentation-only head `e276fbb`.
- Source tag: pending release approval; intended `chordarium-v0.3.0` at the exact binary source commit.
- Public distribution repository: `ste-hue/tembro-releases`.
- Public release/tag: pending approval; intended `chordarium-v0.3.0`.
- Public channel: macOS 11+, arm64 and x86_64, VST3/AU/standalone.
- Customer ZIP: `Chordarium-0.3.0-macOS-download.zip`.
- ZIP SHA-256: `90d82f0c1a8749112a82d9e726e419c3baad0b8f8f7493f34536c6d3e22c7a60`.
- Enclosed installer: `Chordarium-0.3.0-macOS-universal.pkg`.
- Installer SHA-256: `6ba8b54f391efff8f090f5d62998eaca43981db802b8bce45f755a8325643b4b`.
- Signing identity: Developer ID Application / Installer, STEFANO DELLA PIETRA (`6GK4ZCNTUX`).
- Apple installer submission: `6054bd85-92c9-461b-8f19-379f18a3f022`, Accepted, zero issues.
- Stapling and Gatekeeper validation passed on freshly extracted ZIP and PKG payloads.
- Mac native tests: 3/3 on arm64 and under Rosetta; AU validation passed on both.
- Web/source tests: 56/56 locally. Remote plugin CI run: https://github.com/ste-hue/ChordBloom-v1/actions/runs/34688435075 (in progress at this observation; head `e276fbb`, documentation only after the binary source commit).
- Detailed signature and bundle submission evidence: source `docs/NOTARIZATION-HANDOFF.md`.

## Website contract

- `/chordarium`: HTML product/download/install page, including tracked URLs.
- `/chordarium/download`: 302 to the published customer ZIP in `tembro-releases`.
- `/chordarium/buy`: 302 to the Chordarium checkout with `LAUNCH59` applied.
- All three routes: GET/HEAD only; canonical trailing slash redirects retain the query;
  incoming query parameters cannot override checkout discount or artifact destination.
- Browser experience stays the five-seed demo at chordarium.com, without MIDI export.
- Logic uses MIDI drag/file export; this AU is an instrument, not a MIDI FX component.
- Generation/preview are free; live MIDI and export need a one-year plug-in license.
- No Windows/Linux customer package is published by this change.

## Observed commerce state (2026-09-12)

Lemon Squeezy product `1353284`, variant `2113530`, price €89 and fixed €30
LAUNCH59 discount are live. API lists exactly three published files:
`697103` installer (22,779,962 bytes), `697108` INSTALL.txt, `697109` SHA256SUMS.txt.
No old unsigned test file was listed. The file was downloaded from the Lemon Squeezy
API-provided customer download URL, and its full SHA-256 matched the installer hash
above. The downloaded file also passed stapler and Gatekeeper checks. This verifies
the stored delivery file; a fresh order/receipt walkthrough is still outstanding.

Product description still contains outdated claims excluding live MIDI and DAW sync.
The corrected copy is supplied in the local upload handoff. Dashboard edit required.
The native client validates licenses without creating activation instances; the nominal
five-activation limit is not enforced. Fresh-account installation, real-key activation
and a manual DAW drag/routing test remain human acceptance checks.

## Deployment prerequisites

The local preparation passes 58 server tests, typecheck and both Worker dry-runs.
Cloudflare CI is green: https://github.com/ste-hue/ableton-agent/actions/runs/34688465067.
Desktop (1280px) and mobile (390px) previews have no horizontal overflow, broken
images or missing local anchors; both were visually inspected.
Source PR: https://github.com/ste-hue/ChordBloom-v1/pull/28.
Storefront PR: https://github.com/ste-hue/ableton-agent/pull/76.
Before any Worker upload, the production workflow downloads the anonymous public
ZIP and requires the exact SHA-256. After upload it checks routes and other products.

At preparation time GitHub environment `production` returned 404 and no repository
Cloudflare token was listed. Local Wrangler OAuth is available, but the repository
policy calls for manual GitHub deployment with a protected production environment.
A local deployment therefore needs Stefano's explicit exception to that policy,
or the environment/token must first be configured. Do not copy local OAuth tokens
into GitHub secrets as a substitute for a scoped deployment token.

Publish the artifact before deploying tembro-api, smoke-test the query-bearing page,
then deploy the exact-route shim and run the complete smoke test. Record release
approval and deployment evidence in launch control #70 when Stefano authorizes that
record. The package and the website are prepared; this document does not assert
that either the public release or the new website is deployed.
