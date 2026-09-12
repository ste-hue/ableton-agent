# Chordarium 0.3.3 — customer files verified, copy reconciliation pending

## Verified delivery and remaining inconsistency

Stefano uploaded the replacement files. At **2026-09-12T16:20:28.178Z**, Lemon
Squeezy product **1353284**, variant **2113530**, exposes exactly three published
files. The installer metadata reports version **0.3.3**. Downloaded customer files
and the local originals were independently rehashed; all sizes and hashes match.
The previous files are absent from the observed product file list.

The files are current, but the product description still says **Chordarium 0.3.2**
and **one-year plugin license**. The observed variant has license-length
`unlimited: true` with stored numeric fields `value: 1`, `unit: years`.
The public checkout likewise retained the old description; the observed base price
is **EUR 89**. These observations require copy and business-record reconciliation;
they do not authorize choosing or changing the license term.

The current `ops/products.json` releaseTarget and existing website pointers remain
unchanged in this evidence-only change. The website has not been deployed as 0.3.3.
Do not treat those older pointers as evidence against the verified customer files
recorded here. [Machine-readable evidence](chordarium-0.3.3-evidence.json) preserves
both the actual delivery and the unresolved differences.

## Immutable release

- Source: `8654eff73acec20245efe57182b06d8f8c00c7d5` on ChordBloom-v1 main.
- Visible version/build: **0.3.3 · 8654eff7**.
- Source pull request: https://github.com/ste-hue/ChordBloom-v1/pull/31
- Artifact verification time: `2026-09-12T16:13:09.453140+00:00`.
- Local release: `/Users/stefanodellapietra/Downloads/Chordarium-0.3.3-8654eff7/`.

The release fixes native Visit Tembro and footer links, opening the system browser
without navigating away from the composer, and restores the existing Chordarium
flower mark in About. Engine and MIDI behavior are preserved.

| Customer file | Lemon Squeezy ID | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Chordarium-0.3.3-macOS-universal.pkg | 697484 | 22,827,797 | `15ceac964a53f5370675c3ba5ab5d18894f538fdeb82d182e888aad0a21cf5f5` |
| INSTALL.txt | 697482 | 2,480 | `174cb8cc0792779f07005a90ee4e9613f565a3ec7adfda712b1f132c42f1a0bf` |
| SHA256SUMS.txt | 697483 | 103 | `621ee349310770a47984ea856f1bd002ddaf48b2a145c57e784c137d762c8668` |

## Apple and tests

The release manifest records Accepted submissions for the three bundles and installer:

| Artifact | Apple submission |
| --- | --- |
| Chordarium.vst3 | `88dbc45b-9225-4250-9c3a-60623c25e9d9` |
| Chordarium.component | `e872bcfd-d9ae-4b0b-900a-e8b3aaed6556` |
| Chordarium.app | `34aab596-21d6-4a18-a57c-874ce055d876` |
| Chordarium-0.3.3-macOS-universal.pkg | `ef9a7735-1b29-4baf-888b-6006af3c2700` |

The installer has a validated staple and Gatekeeper reports Notarized Developer ID.
Its expanded payload matches the signed source payload and contains version 0.3.3,
build 8654eff7, both arm64 and x86_64, strict signatures and valid tickets for VST3,
Audio Unit and standalone. Installation paths remain the system plug-in folders
and /Applications. Raw logs and the original manifest remain in the local release
directory; signing credentials and customer license keys are not part of this record.

The manifest records **83 JavaScript tests**, **3 native CTest suites**, and
**0 Rosetta processor failures**. Native link behavior was confirmed by the user on
preview build ed019083; that is not final 0.3.3 artifact acceptance.

## Known limitations and next action

- Final 0.3.3 Ableton acceptance, routed MIDI, Stop and project save/reopen remain
  unobserved. The earlier [0.3.2 Ableton report](https://github.com/ste-hue/ChordBloom-v1/issues/23#issuecomment-5646807543)
  confirms load, MIDI drag and tempo-toggle behavior only for that prior release.
- The host BPM field displays excessive floating-point decimals. Musical tempo
  retains its precision. [ChordBloom PR #32](https://github.com/ste-hue/ChordBloom-v1/pull/32)
  prepares a display-only correction; it is **not included in this installer** and
  remains a separate pending change.
- The observed variant reports `activationLimit: 5`, `unlimited: false`. The native
  plug-in uses `/v1/licenses/validate`; it does not register or count device
  activations, so a five-device cap is **not enforced by the plug-in**. Source:
  [License.cpp at the released commit](https://github.com/ste-hue/ChordBloom-v1/blob/8654eff73acec20245efe57182b06d8f8c00c7d5/plugin/Source/License.cpp).
- Customer-facing release/license wording and the central desired-state business
  record must be reconciled before the matching website update is published.

The local prepared public-version edits passed all 56 server tests and TypeScript,
but are left uncommitted and outside this evidence PR. No Cloudflare deployment,
releaseTarget change, price change or license-term mutation is performed here.

Next action: confirm the intended commercial terms, reconcile product/checkout
wording and business records with the observed variant, then publish matching
website version labels. Linux agents can separately continue PR #32; any native
update needs a new immutable Mac build, signature and notarization.
