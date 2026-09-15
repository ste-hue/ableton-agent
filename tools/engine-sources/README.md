# Pinned source recovery

`rudiment-3dfc08d.bundle` preserves the source correction behind the generated
Rudiment 0.1.1 engine. It is a Git bundle, not a runtime dependency or customer
asset. The Rudiment GitHub repository remains archived; its unchanged main
revision is `e9fafb8d970f40fc8c3fd7147d6f550278aa9206`.

In a clone of that repository, restore the exact private source commit:

```sh
git bundle verify /path/to/ableton-agent/tools/engine-sources/rudiment-3dfc08d.bundle
git fetch /path/to/ableton-agent/tools/engine-sources/rudiment-3dfc08d.bundle refs/heads/feat/deterministic-engine-shuffle
git switch -c review/deterministic-engine-shuffle FETCH_HEAD
git rev-parse HEAD
npm run preflight
```

Expected HEAD: `3dfc08d51d040c5823408298797fffe5388c7469`. Read that commit's
`docs/adr/0006-runtime-independent-seeded-shuffle.md` for the two source changes
and deliberate golden-fixture update. It replaces random-comparator sorting
with seeded Fisher–Yates; it does not emulate a particular V8 sort algorithm.

Rebuild/check Tembro from that source using `tools/build_rudiment_engine.js`.
After changes, run `tools/check_tembro_engine_portability.js` on the supported
Node runtimes and compare every case and the aggregate hash. Source restoration
or verification does not authorize unarchiving or publishing Rudiment.
