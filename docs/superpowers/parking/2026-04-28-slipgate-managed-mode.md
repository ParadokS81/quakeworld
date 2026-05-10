# Slipgate Managed Mode pivot -- multi-arc project opened

**Added:** 2026-04-28. **Updated:** 2026-05-11 (Pass 6 complete; ALL brainstorm passes 1-6 now CLOSED; ready for arc-planner handoff to Arc A).

**Status:** All brainstorm passes (1 through 6) COMPLETE and drained into architecture spec body. Pre-arc tail item TAIL-1 (FTE asset bundle wiring) shipped 2026-04-28 (commit `6d6cd1c`). **Next session: arc-planner for Arc A (asset warehouse substrate)** -- first implementation arc, smallest scope (1-2 days), good shape to validate the arc-planner / arc-orchestrator / arc-executor workflow before bigger arcs ship.

**Verification first:** Confirm the three new docs exist:
```
ls docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md
ls docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md
ls docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md
```

### What changed

The architecture for slipgate's product positioning shifted during the conversation immediately following the Phase 3.5b ship. The companion-app framing ("slipgate analyses + manages your existing quake dir") collapsed into slipgate-IS-quakedir ("the data warehouse IS your Quake install").

This collapse was driven by the operator's empirical observation that a minimum viable Quake install is just `id1/pak0.pak` + `id1/pak1.pak` + a client. Everything else is content layered on top -- and that content is precisely what the data warehouse pattern (shipped in Phase 3.5b for binaries) generalizes to handle.

The architecture is structurally identical to Git, NixOS, OSTree: content-addressed blobs (sha256-keyed) + per-thing manifests + materialization-as-view. Profiles become manifests; switching profiles becomes selecting which manifest to materialize against the engine's `-basedir`. Edits become register-new-blob + manifest-update. History falls out for free. Lossless export ("walk away with a portable Quake dir") falls out for free. Side-by-side profile diff (the "config compare at quakedir level") falls out for free.

### Project structure

The pivot is a project, not a feature. Three foundational docs capture the design:

1. **Vision** (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`) -- product positioning, two-mode framing (Light vs Managed), load-bearing properties (lossless export pledge, non-destructive migration, SHA256 governance, web/desktop split), what this is and isn't, end-to-end scenarios.

2. **Architecture** (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`) -- data model, storage layout, content taxonomy (5 buckets: stock / user-asset / user-content / cache-ephemera / engine-runtime), six primitive operations (register/materialize/swap/export/fork/merge), filesystem watcher contract (4-case dispatch), engine integration, SHA256 governance, cloud catalog interaction, migration algorithm.

3. **Roadmap** (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`) -- eight implementation arcs (A-H), dependency graph, V1 vs V1+ scope, per-arc summaries, recommended next-session sequence, timeline expectation.

### Implementation arcs

- **Arc A** -- Asset warehouse substrate (parallel to binary warehouse). 1-2 days.
- **Arc B** -- Profile manifest + materializer (hardlink-or-copy + cross-volume fallback). 4-6 days.
- **Arc C-minimal** -- Profile switch UI (V1). 2-3 days.
- **Arc D** -- Migration on-ramp + clean-room extractor + config sanitization. 1 week+ (largest arc).
- **Arc E** -- Filesystem watcher + classifier + mod-fingerprint registry. 4-5 days.
- **Arc F** -- Lossless export. 1-2 days. (V1+)
- **Arc G** -- Version history (per-config IDE-shaped restore). 3-4 days. (V1+)
- **Arc C-full** -- Full profile UI (browse, side-by-side diff, fork, history view). 1 week+. (V1+)
- **Arc H** -- Cloud catalog hookup. 1 week+. (V1+)

V1 = A+B+D+E+C-minimal (working Managed mode end-to-end). Operator estimate: ~1 week of focused implementation.

### Pre-arc tail (TAIL-1)

The existing HANDOVER entry "FTE asset bundle consumer wiring" was promoted from low-pressure to load-bearing because Arc D's clean-room migration classifier needs FTE-aware path/asset rules. **SHIPPED 2026-04-28** in commit `6d6cd1c` (`feat(slipgate): TAIL-1 FTE asset bundle wiring + Phase 3.5b doc catchup`). No remaining pre-arc work.

### Brainstorm Pass 1 outcomes (drained 2026-04-28)

Six sub-questions resolved + bonuses. Drained into architecture spec body. Highlights:
- SHA-only unified blob store under `<data-root>/blobs/<sha[:2]>/<sha>.bin` (two-char fanout)
- Per-blob `<sha>.meta.json` sidecars; `.refcounts.json` index for GC
- Single-process invariant (Tauri single-instance + `<data-root>/.lock` + global async mutex)
- Manifest-as-truth GC with tree-consistency-at-rematerialization
- Materializer modes simplified to `hardlink` (active) and `copy` (export); no fallback middle case
- Lossless-export pledge tests (1+2 in CI from Arc A/B, test 3 from Arc F)
- Active-vs-launched profile distinction + export-anything primitive generalization

### Brainstorm Pass 2 outcomes (drained 2026-04-28)

Five sub-passes resolved (manifest schema, entry shape, declared_gamedirs, atomic materialization, history retention). Drained into architecture spec body. Highlights:
- Manifest schema: `id` (uuid, immutable) + `name` (mutable label) + `schema_version: 1`; canonicalized JSON for SHA computation; atomic write (temp+rename+fsync) + creation-backup + corruption recovery sequence (history -> tree-rebuild)
- Entry shape: required `sha256`+`target_path`+`role`; optional `size`+`added_via`; `selectable_subsets` and `engine_compatibility` dropped (computed at runtime from Layer 1 + role field)
- Role taxonomy is registry-based (refreshable from catalog), not hardcoded
- declared_gamedirs ordered (first = primary), picker only when 2+ declared, KTX correction (server-side, runs in qw/)
- Atomic materialization: build-new-and-swap, trust-existing-tree fast path, watcher self-skip via hash, single mutex + UI busy-state pattern
- History retention: living-file-vs-immutable-artifact principle (configs 500/profile, assets 10 snapshots/asset, checkpoints exempt from prune); two save paths (watcher debounce vs internal save button); full-manifest storage

**Pass 2 surfaced principles (load-bearing for later passes):**
- Manifest is unfiltered snapshot at publish; filtering happens at consumption (import modal)
- Configs are living files; assets are immutable artifacts (drives retention + Pass 3 bucket work)
- Seventh content-taxonomy bucket candidate: `user-library` for shared base content (maps, locs)
- Slipgate self-knowledge surface (cross-cutting bundled-and-refreshable knowledge tables -- placeholder section in architecture spec; accretes Passes 3-6)

### Brainstorm Pass 3 outcomes (drained 2026-04-29)

Five sub-questions ratified. Drained into architecture spec body, vision spec anchor block, and roadmap per-arc summaries. Pass 3 brainstorm minutes captured at `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`.

- **3.1 Configs-vs-assets divergence axis.** Shared role registry across configs and assets (`asset-roles.json`); shared manifest entry shape (`{sha256, target_path, role, size?, added_via?}`); role-keyed retention policy; hub-knowledge-richness orthogonal to living-vs-immutable axis. Catalog-metadata-divergence + standalone-shareable-config dual lifecycle pushed to Arc H pre-implementation brainstorm (Pass 6).
- **3.2 Bucket six (user-private) + primary profile + clone-modal-as-V1-selector-primitive.** Bucket 6 single-flavor (user-marked private only); `private.json` schema with explicit-paths-no-glob; right-click "Mark as private" gesture; watcher Case 5 IGNORE; rematerialization preservation via atomic-swap pre-step. Primary profile concept added at data-root level (`profile-roles.json` supersedes `active-profile.json`); set on first creation; "Make this primary" action with confirmation; primary unlocks default fork target, default launch fallback, mental-model anchor; primary does NOT change GC or retention. Clone modal collapses earlier deferred selector-DSL: UI is the grammar; modal output is the typed manifest-entry set. Five consumers (clone, pre-publish review, selective import, pre-extraction overview, export).
- **3.3 Bucket seven (user-library) V1-ratified.** Maps + locs + mod-content roles (`library:map` / `library:loc` / `library:mod-content`). Storage at `<data-root>/library/manifest.json`; same schema as profile manifest minus `declared_gamedirs`; library has NO tree subdir (entries materialize INTO each profile's tree per `declared_gamedirs`). Profile-overrides-library precedence resolves per-profile loc variation cleanly. Bucket 4 (mod-cache) is the inbox; bucket 7 is kept; promotion gestures move entries between them, with `declared_gamedirs` extension prompt. Library has separate catalog-distribution path (NOT bundled-into-profile-manifests). Hub-side analytics fall out of SHA frequency aggregates for free.
- **3.4 Classifier rules + capture/swap pipeline + manifest publish rule.** Manifest publish rule: entry iff role recognized AND not user-content-roles AND not library-roles AND path not in private.json. Watcher reframed as two-stage capture/swap pipeline: Stage 1 observes (immediate, free, safe during engine session; writes to `.pending-swap.json`); Stage 2 processes at safe moment (engine-exit auto / user-invoked / idle-nudge). Defenses 1-4 against partial-file capture (never-during-session, stable-mtime, declarative integrity-check table, mod-fingerprint partial detection). Cleanup notification UX. Auto-mode opt-in default OFF. Classifier shared with Arc D (co-design constraint, not suggestion). `register` extended with `link()`-based inode-share at Stage 2 (one directory-entry addition per kept file, effectively zero disk write).
- **3.5 Slipgate self-knowledge surface single-class reframed.** Earlier two-class proposal collapsed; most "code-bundled" tables are pure data with stable consumption contracts. Schema is the only oracle <-> slipgate coupling event. Per-table cadence (8 tables, mix of bundled + on-sign-in + lazy + on-demand). Delta-sync protocol shape (added / mutated / retired tombstones; per-table independent version stamps). Bundled baselines keep slipgate fully functional offline. "What slipgate knows" UI minimum at Settings -> Knowledge. User-override mechanism at `<data-root>/overrides/<table>.json`. Two-growth-axes principle (code grows recognition vocabulary; catalog grows asset corpus + taxonomies). Hub-as-gravitational-center triangle. Manifest-references-hub-unknown-SHAs placeholder pattern (no P2P; bytes only flow when hub serves). Retroactive metadata enrichment when hub catches up.

**Pass 3 carry-forwards (split out as separate HANDOVER entries):**
- Arc H pre-implementation brainstorm (Pass 6) -- standalone-shareable-config dual lifecycle + catalog-metadata-divergence configs-vs-assets + library separate-catalog-distribution path. Tracked in this Managed Mode entry's "next session" sequence.
- L1-alpha / -beta / -gamma / -delta tracks -- four separate qw-oracle backlog entries (see "Layer 1 expansion tracks" section in the index above). qw-oracle scope, NOT Managed Mode arcs; none gates V1.

### Items superseded by this pivot (cleanup at docs-check)

These existing HANDOVER entries are superseded but left in place for context:

- "Add Quake Client / MyQuake unification" -- Phase 3.5b shipped
- "Canonical-mode default for warehoused clients" -- resolved by Phase 3.5b's canonical-only design
- "Tier 3 future arcs (clean-room migration + asset warehouse + bundle install)" -- folded into Managed Mode roadmap as Arcs A/B/D/E/F/G
- "Player profiles (bundle-shaped, share-via-hashlist)" -- folded into Managed Mode roadmap as Arcs B+H
- "FTE asset bundle consumer wiring" -- shipped as TAIL-1 (`6d6cd1c`)

Docs-check at next session wrap-up should evaluate each for clean deletion.

### Recommended next-session sequence

All brainstorm passes (1-6) closed. Implementation begins.

1. **arc-planner for Arc A (asset warehouse substrate)** -- 1-2 days estimated. First implementation arc; smallest scope; validates the arc-planner / arc-orchestrator / arc-executor workflow before bigger arcs.
2. arc-planner for Arc B (profile manifest + materializer + library manifest + private preservation) -- 4-6 days + 1-2 days for library.
3. arc-planner for Arc D + Arc E in tandem (classifier shared; capture/swap pipeline shipped together).
4. arc-planner for Arc C-minimal (Profiles tab + clone modal as V1 selector primitive + Make-this-primary + delete prompt UX) -- 2-3 days. V1 ships.
5. F / G / C-full / H follow as time and demand allow.

### Brainstorm Pass 6 outcomes (drained 2026-05-11)

Four sub-questions resolved. Drained into architecture spec body (`Cloud catalog interaction -- Catalog data shape` subsection + new `Bundles in slipgate-app` top-level section + Open architectural questions Pass 6 status block + tenth-table candidate carry-forward). Pass 6 brainstorm minutes captured at `docs/superpowers/specs/2026-05-11-slipgate-managed-mode-pass6-ratifications.md`.

- **6.1 Standalone-shareable-config dual lifecycle.** Catalog stores SHAs, "you got a copy, it's yours" (flavor 1 of 3); subscribe + fork flavors deferred to V1+. All configs (not just config.cfg) get the Pass 2.5 500-version history ring. Two-tier delete UX. Provenance lives in version history (no `added_via` field on manifest entry); recognition at display time via hub lookup. Bundles ARE manifests (single primitive at all sizes -- profile, bundle, single-asset). Tags + versioning fall out of name + publisher + publish-order. Follow is post-hub-V1 (Hub V2 territory).
- **6.2 Bundle lifecycle in slipgate-app (NEW sub-question).** Surfaced when 6.3 framing failed (operator had no mental model for hypothetical hub UI). Bundles are first-class objects in slipgate-app with their own UI surface ("Bundles" left-side entry). Browse pattern mirrors the rest of slipgate. Local download log carries per-file bundle lineage without polluting shared manifest schema. Apply-to-profile distributes files into natural domains via the clone-modal-as-V1-selector-primitive.
- **6.3 Catalog metadata divergence (reframed via collapse).** Pass 3.1's "configs thin / assets rich" framing replaced by single-schema-with-optional-fields. Mandatory at publish: name + publisher + per-file (sha + role + target_path). Author / description / license / version / engine_compat all optional and gracefully missing. Rich asset metadata (BSP details, image dims, perceptual hash) is derived/layered, not part of catalog schema. Engine compat is user-tagged, not auto-derived. Pre-seeded popular-asset details = new self-knowledge surface table candidate (V1+; tenth table).
- **6.4 Library separate-catalog-distribution path.** Collapsed via 6.1e: library uses the same bundle-as-manifest primitive with `library:*` roles. No separate library-distribution mechanism needed.

**Pass 6 carry-forwards (V1+ refinements within Arc H):**
- Per-asset-type detail views (BSP parser, image preview, sound waveform). UI design work alongside Arc H V1.
- Pre-seeded popular-asset details table (10th self-knowledge surface table; V1+).
- Config converter cvar carry-over detection as engine-tag enrichment for configs (V1+).
- Hub-side bundle-aware UX (subscription state + notification + diff display) for Hub V2 follow feature.
- Local download log UX design (data model locked, render is open).
- Bundle apply selector defaults (which roles default-on / default-off at apply time; V1+ tuning).

### Pressure

High. This is the new main arc. All other slipgate-side work (binary version diff viewer Phase 4/5, retired-cvars stale-warning UX, etc.) is deferred until V1 ships or until the new arc creates demand for them.

### Related

- **Vision:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
- **Architecture:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
- **Roadmap:** `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
- **Memory:** `project_slipgate_tier_ladder.md` -- the four-tier intuition the two-mode framing distills
- **Phase 3.5b plan:** `docs/superpowers/plans/2026-04-26-add-quake-client.md` -- binary half of the warehouse substrate



---
