# Product Catalog Implementation Plan

> **For agentic workers:** Execute the scoped website changes with independent review before publication.

**Goal:** Make Tembro a clear plugin menu with working discover, demo, checkout and existing-order download paths.

**Architecture:** Keep the existing Hono storefront and fixed product routes. Update server-rendered presentation without new dependencies or browser scripts; redirect the retired public credit landing page to the catalog while preserving all existing service APIs.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, Node test runner.

**Spec:** Stefano’s approved combined Minimalist / Hacker Terminal / Kawaii / Matte Monochrome style; two clear product actions; no public Tembro Credits offer. Ownership recorded in central issue #77.

## Constraints

- Preserve immutable Chordarium 0.3.2 and all installer, store, license, billing and D1 state.
- Chordarium demo remains five replayable examples, without MIDI export.
- Purchase routes use the existing Lemon Squeezy checkout; paid downloads require the customer order.
- Atlas remains a free checkout. Rudiment remains coming soon without a download button.

## Steps

- [x] Update `server/test/storefront.test.ts` to exercise catalog discovery and acquisition links, no visible credits on all product pages, and `/tembro` redirect with legacy API availability. Run the focused suite and observe failures.
- [x] Update `server/src/storefront.ts`: cohesive matte monochrome layout, restrained mint/lilac accents, illustrated musical identity, explicit product actions and an existing-order link. Preserve detailed installation information.
- [x] Update `server/src/storefront-routes.ts` and `server/src/app.ts`: serve `/tembro` and `/tembro/` as temporary redirects to `/#products`, rejecting unsupported methods; preserve service APIs.
- [x] Update `.github/workflows/cloudflare-production.yml` for the retirement redirect and catalog acquisition links.
- [x] Run server tests and typecheck. Inspect local desktop and mobile pages and their navigation. Review actual diff independently.
- [ ] Merge reviewed PR; publish production and verify catalog, product pages, demo, checkout destinations, order download, retired route and health. Record exact source/deployment evidence in #70.

Validation before publication: 56/56 server tests; TypeScript check; Cloudflare dry-run; independent review; desktop and 390px viewport browser checks passed. Demo QA independently verified the feature dialog, sixth-generation dialog, keyboard focus, all five seeds after the limit, and persistence after reload. ChordBloom commit: `07b30d81b1aed4cc184b1deea890958761a3da1d`, 77/77 tests. Live publication evidence belongs in central issue #70.
