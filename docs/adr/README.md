# Architecture Decision Records

Decisions that shape the product or its architecture are recorded here, one file
per decision, so that the reasoning survives the session that produced it.
Until now decisions lived as dated headers inside `docs/product-vision.md` and
`docs/product-analysis.md`; those remain valid unless an ADR says it supersedes them.

## Convention

- File name: `NNNN-short-slug.md`, numbered sequentially, never reused.
- Language: English (the code and the rest of `docs/` are English; the musical
  knowledge base in `knowledge/` stays Italian).
- Status line: `Proposed` → `Accepted` → (`Superseded by ADR-NNNN` | `Deprecated`).
  A PR that opens an ADR leaves it `Proposed`; merging it after review makes it `Accepted`.
- Sections, in order: Status, Context, Decision (one per numbered sub-decision when
  the record bundles linked decisions), Consequences, Open questions, Sources.
- Every external number carries a URL and the date it was read. Figures that could
  not be verified against a primary source are marked *(unverified)*.
- An ADR records a decision, not a survey: options are short, the decision says
  what we do and what we deliberately do not do.
- Changing a decision means a new ADR that names the one it supersedes; do not edit
  the old record beyond its status line.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-product-shape-and-monetization.md) | Product shape, target user, monetization and channel | Proposed |
| [0002](0002-agent-architecture-and-interaction.md) | Agent architecture, UX and interaction | Proposed |
| [0003](0003-studio-partner-interaction.md) | Studio partnership and bounded musical interaction | Proposed |
| [0004](0004-shared-musical-engines.md) | Shared musical engines | Proposed |
