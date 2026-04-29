# Slipgate Managed Mode -- Arc Roadmap

> **Captured 2026-04-28** as the project-level plan for the Managed Mode arc. Companion to:
> - Vision: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
> - Architecture: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
>
> **Reading order:** Vision (why) -> Architecture (how) -> Roadmap (when, this doc).
>
> **Project framing:** This is a project, not a feature. Multi-arc work scoped at ~1 week of focused implementation per operator estimate (calibrated against Phase 3.5b's pace). Each arc gets its own brainstorm + spec + plan; this document captures the dependency graph, v1 scope, status, and per-arc summaries.

> **Update 2026-04-28 (pre-Pass-1 anchor):** Two roadmap-level decisions ratified during orchestrator briefing before the Arc A+B brainstorm Pass 1:
>
> - **Brainstorm scope covers the full surface.** With no production code and no users, design coherence requires committing to cross-arc contracts (Arcs A through H) up front. V1/V1+ remains the implementation-sequence axis (which arc ships first) but is no longer the design-scope axis (every arc's contract gets locked before any arc implements). The "co-brainstorm with Arc A+B" recommendation expands accordingly: 5-7 brainstorm passes covering substrate (A) + manifest/materializer (B) + classifier and bucket-six (D/E shared) + watcher contract (E) + cloud catalog data shape (H, just enough to lock A's blob layout) + UI primitives (C, just enough to constrain B's manifest).
> - **Arc H's catalog data shape is design-critical, not V1+ deferrable.** Cloud-SHA-lookup augments Arc E's classifier (architecture spec, decision 4); Arc H's data exchange format must be brainstormed alongside A/B/D/E so blob layouts and classifier interfaces don't paint into a corner. Arc H can still ship as a later implementation arc, but its data shape locks early.
>
> The dependency graph in this document remains accurate. The V1 vs V1+ split as an implementation-priority axis remains valid. The detailed body will be revised after brainstorm passes complete.

> **Brainstorm progress:**
> - **Pass 1 (substrate and storage): COMPLETE 2026-04-28.** Six sub-questions ratified and drained into architecture spec body. Decisions: SHA-only unified blob store with two-char fanout (`<data-root>/blobs/<sha[:2]>/<sha>.bin`); per-blob sidecar metadata (`<sha>.meta.json`); refcount index for GC; pure refactor of `version_warehouse.rs` into generic `content_warehouse.rs` with one-shot data migration; single-process invariant via Tauri single-instance plugin + `<data-root>/.lock` lockfile + single global async mutex; manifest-as-truth GC with tree-consistency-at-rematerialization; lossless-export pledge tests 1+2 in CI from Arc A/B, test 3 from Arc F. Bonus: export-anything-in-any-format primitive generalization, active-vs-launched profile distinction, manifest backup as first-class UX.
> - **Pass 2 (manifest schema + materializer mechanics + gamedirs + history retention): COMPLETE 2026-04-28.** Five sub-passes ratified and drained into architecture spec body. Decisions: manifest schema (id/name separation, schema_version, canonical-JSON SHA, atomic write + corruption recovery via creation-backup + history + tree-rebuild), entry shape (required sha256/target_path/role; optional size/added_via; registry-based role taxonomy refreshable from catalog; cross-platform path rules; reject duplicate target_paths at write; selectable_subsets dropped from V1; engine_compatibility field dropped -- runtime per-cvar warnings from Layer 1 instead), declared_gamedirs (ordered list, first = primary, picker only when 2+; KTX correction -- KTX is server-side, runs in qw/), atomic materialization (build-new-and-swap via temp tree + atomic rename, trust-existing-tree fast path, watcher self-skip via hash, single mutex + UI busy-state pattern), history retention (living-file-vs-immutable-artifact principle, 500 auto-versions/config, 10 snapshots/asset, checkpoints exempt from prune, two save paths external-watcher-debounce vs internal-save-button, full-manifest storage). Surfaced for Pass 3+: configs-as-living-files vs assets-as-immutable-artifacts (now a principle); seventh bucket candidate `user-library` for shared base content (maps, locs); slipgate self-knowledge surface (cross-cutting bundled-and-refreshable knowledge tables -- asset-roles registry, mod-fingerprint registry, engine-runtime allowlists, known-good stock pak SHAs, classifier heuristics, Layer 1 data); manifest-unfiltered-publish + import-time-filtering principle.
> - **Pass 3 (classifier + bucket taxonomy refinements): NOT YET STARTED.** Originally scoped as "classifier + sixth bucket (user-private)." Pass 2 expanded scope: also resolves seventh-bucket boundary (user-library for shared base content; what materialization shape -- auto-include-in-every-manifest, separate shared library, or inherit-from-base); configs-vs-art-as-assets distinction (authorship/credit/license metadata divergence); first concrete cut at the slipgate self-knowledge surface (which knowledge tables are V1 vs later); refined classifier rules for Arc D migration (maps/locs land in user-library, not user-asset).
> - **Passes 4-6 deferred** to later sessions: watcher contract (E / Pass 4), cloud catalog data shape (H / Pass 6), launch UX + runtime swap classes (C / Pass 5).

---

## TL;DR

**Eight implementation arcs (A through H)** ship Managed Mode end-to-end. Five are V1 (the minimum coherent product surface). Three are post-V1 polish/extension.

```
V1:
  A. Asset warehouse substrate
  B. Profile manifest + materializer
  D. Migration on-ramp (clean-room extractor + config sanitization)
  E. Filesystem watcher + classifier
  C-minimal. Profile switch UI

V1+ post-launch:
  F. Lossless export
  G. Version history (per-config IDE-shaped restore)
  C-full. Full profile UI (browse-as-abstraction, side-by-side diff, fork)
  H. Cloud catalog hookup
```

V1 = a user can install slipgate, opt into Managed mode, run migration on their existing dir, end up with a working slipgate-managed install + bundled showcase profile, switch between profiles, edit configs (auto-warehoused). End-to-end demonstrable.

V1+ adds the IDE-shaped editing experience, profile browsing/diffing/forking, and cloud catalog -- the social and UX-polish layer.

---

## Arc dependency graph

```
                         Phase 3.5b (SHIPPED)
                                │
                                ▼
                    A. Asset warehouse substrate
                                │
                                ▼
                B. Profile manifest + materializer
              ┌──────────┬──────┴──────┬─────────────┐
              │          │             │             │
              ▼          ▼             ▼             ▼
    C-minimal UI    D. Migration   F. Lossless   G. History
              │     + classifier    export        retention
              │       │   │
              │       │   └─────────────┐
              │       ▼                 ▼
              │   E. Watcher         (D's classifier
              │   (uses D's          IS E's classifier)
              │   classifier)
              │
              └────────────┬─────────────┐
                           ▼             ▼
                    C-full UI        H. Cloud catalog
                                     hookup
```

**Hard dependencies:**
- A -> everything (foundation)
- B -> C, D, F, G, H (manifest + materializer is the universal substrate)
- D <-> E (share classifier; co-designed)

**Co-developable:**
- A and B brainstorm together (substrate design pass)
- D and E brainstorm together (classifier shared between migration and watcher)
- F and G are small, can ship after B in any order

**Soft dependencies:**
- C-minimal needs B
- C-full benefits from F and G being shipped (history view + side-by-side compare are surfaces over G's data and B's manifests)
- H needs A, B, D, E (catalog interactions touch every layer)

---

## V1 scope (the minimum coherent product)

V1 is "Managed Mode end-to-end works for a single user." It does NOT include:
- Cloud catalog (offline-only)
- Side-by-side profile diff UI (data structure supports it; UI not built)
- IDE-shaped config history view (versioning happens; surface comes in V1+)
- Profile fork UI (data primitive exists; surface in V1+)

V1 DOES include:
- Asset warehouse parallel to binary warehouse
- Profile manifests with materialization
- Clean-room migration from external dir
- Filesystem watcher + classifier
- Basic profile switch UI

**V1 success criterion:** User installs slipgate, runs migration on their existing dir, ends up with their setup working in Managed mode, can switch to a bundled showcase profile and back. Edits config in slipgate or external editor; watcher absorbs the change. Engine launches against materialized tree without slipgate's involvement at launch time.

---

## Per-arc summaries

Each arc gets its own brainstorm + spec + plan when it's time to execute. The summaries below capture the scope and the key decisions inherited from this session's design conversation.

---

### Arc A -- Asset warehouse substrate

**Status:** Not started. First arc to brainstorm.

**Scope:** Generalize Phase 3.5b's binary warehouse pattern to assets. New parallel root `<data-root>/assets/` (or unified `<data-root>/blobs/` shared with binaries -- open question, see architecture spec). Same primitives: SHA256 keying, content-addressed storage, register/list/delete. Asset-classification metadata stored alongside the blob (optional `<data-root>/assets/by-category/` indexes).

**Key design decisions from this session:**
- Content-addressed storage is the universal primitive (D6+D10 generalized: any content type)
- Blob store unification (binaries + assets in one `<data-root>/blobs/`) recommended; needs ratification during arc brainstorm
- One-shot migration script for Phase 3.5b's `binaries/blobs/` data if unified

**Implementation cost estimate:** 1-2 days (small; mostly a refactor of binary warehouse code into a generic content-warehouse abstraction with binary and asset namespaces on top)

**What's reusable from Phase 3.5b:** ~90% of `version_warehouse.rs` patterns. `register_version_at` becomes `register_blob` with type-specific metadata.

---

### Arc B -- Profile manifest + materializer

**Status:** Not started.

**Scope:** Profile manifest schema (JSON), materializer that maps a manifest to a directory tree using hardlink-or-copy. `Profile` data type in store.ts. CRUD operations (`create_profile`, `update_manifest`, `delete_profile`). Active profile tracking. Tree validation (verify manifest matches materialized state).

**Key design decisions (Pass 1 + Pass 2 ratified):**
- Manifests are JSON, KB-scale, canonicalized for deterministic SHA, version-stamped with `parent_manifest_sha`, schema_version field for future migration
- Materializer modes (Pass 1): `hardlink` (active-tree, single-volume by construction) and `copy` (lossless export). `hardlink_preferred` middle case dropped.
- Atomic materialization (Pass 2.4): build-new-and-swap (temp tree + atomic rename), trust-existing-tree fast path, watcher self-skip via hash, UI busy-state pattern as primary serializer
- Tree path: `<data-root>/profiles/<uuid>/tree/`
- Active profile: `<data-root>/active-profile.json` pointer (uuid, mutable name separately tracked in manifest)
- Profile manifests retained as historical chain under `manifest-history/<timestamp>-<sha>.json` (full manifests, no deltas) -- drives Arc G
- Registry-based role taxonomy refreshable from catalog (no hardcoded enum)

**Implementation cost estimate:** 4-6 days. The materializer's atomic-swap + trust-existing-tree logic + UI busy-state plumbing is the meaty part. Manifest CRUD + validation + corruption recovery is straightforward but needs the migration-registry framing.

**No open questions remaining for this arc** -- Pass 2 ratified the manifest schema, atomic materialization semantics, and history retention. Implementation can proceed when sequenced.

---

### Arc C -- Profile UI (split: C-minimal + C-full)

**Status:** Not started.

**Scope:**

**C-minimal (V1):**
- Profiles tab in MyQuake (sibling Domain to Clients/Configs/etc.)
- List of profiles with active marker
- Create profile button (basic -- fork from active OR import from elsewhere)
- Switch profile button (with active-process check, like swap_active_version)
- Delete profile button
- Active profile display in Status bar / app chrome

**C-full (V1+):**
- Profile detail view: browse the manifest as an abstraction (assets organized by role + category, source, modification time)
- Side-by-side profile diff (the "config compare at quakedir level" feature)
- Per-row actions: "merge this entry into another profile," "fork from this state," "view this asset's history"
- Selective import view (tick subsets of an external profile to merge into current)
- Profile genealogy visualization (parent-child graph)

**Key design decisions from this session:**
- The Versions tab pattern from Phase 3.5b (action grammar: Switch / Delete / Add / Edit) extends naturally
- "Browse the quake dir is browsing an abstraction" -- UI shows profile contents semantically, not as a filesystem dump
- Side-by-side compare extends ConfigViewer's diff UX one layer up

**Implementation cost estimate:**
- C-minimal: 2-3 days
- C-full: 1 week+ (the polish surface; many sub-features)

---

### Arc D -- Migration on-ramp + clean-room extractor + config sanitization

**Status:** Not started. Co-design with Arc E.

**Scope:** Migration wizard that takes a user's existing Quake dir and produces a Managed-mode profile. Includes:
- Clean-room scanner (walk dir, hash everything, classify)
- Active-config-chain analyzer (trace what's loaded at runtime)
- Pak-vs-flatfile resolver (engine search-path semantics)
- Pre-extraction overview UI (line-by-line review)
- Config sanitization (rewrite path-binding cvars to slipgate-managed paths)
- Extractor (copy classified assets into warehouse, build manifest, materialize)
- Verification step (boot test against materialized tree)

**Key design decisions from this session:**
- **Non-destructive:** copy, never move. Source dir untouched. Reversible.
- Active-config-aware: only extract assets the user's chain actually loads at runtime (with conditional/alias-reachable as user-tickable)
- Pre-extraction overview is non-negotiable
- Config rewrite shows a diff to user; per-line accept/decline
- Stock pak verification against catalog SHA list (refuse if no match -- copyright safety)

**Implementation cost estimate:** 1 week+ (the largest single arc -- the classifier work is meaty; the UI for pre-extraction overview is rich)

**What's reusable:**
- Config-chain parser (existing in slipgate)
- Asset bundle classifier (Phase 2d-bundle for ezQuake; FTE-side wiring is HANDOVER follow-up that becomes load-bearing here)
- `weapon_classifier`, `weapon_triggers`, bind/alias classification (existing)
- ezquake `read_exe_version`, `read_pe_strings` (Phase 3.5b)

**Open questions for arc brainstorm:**
- Trigger-conditional asset handling: include-by-default, opt-out, or always-prompt?
- Stock pak verification: blocking (refuse migration) vs warning (allow user to override)?
- Multi-engine quake dirs (user has both ezQuake and FTE in same dir): one profile or two?

---

### Arc E -- Filesystem watcher + classifier + mod-fingerprint registry

**Status:** Not started. Co-design with Arc D.

**Scope:** Background filesystem watcher on the active profile's tree. Four-case dispatch:
1. Engine-runtime allowlist match -> ignore
2. Tracked file changed -> register-new-blob, update manifest, rematerialize
3. Untracked new file -> run classifier -> quarantine OR prompt
4. Tracked file deleted -> prompt user

Plus the classifier (shared with Arc D). Plus mod-fingerprint registry (community-curated, slipgate-bundled with optional cloud refresh).

**Key design decisions from this session:**
- Watcher has 10-second debouncing (coalesce save-bursts into single manifest version)
- Engine-runtime allowlist per-engine (ezQuake / FTE / etc. -- prevent infinite manifest churn)
- Mod fingerprints classify per-mod cache -> quarantined under `mod-cache/<mod>/`
- Demos auto-routed to `user-content/demos/` by source (recorded vs server-downloaded) and profile
- Foreground-only for V1 (slipgate must be open). Background service is post-V1.

**Implementation cost estimate:** 4-5 days (uses Arc D's classifier; mostly plumbing + policy).

**What's reusable:**
- `notify-debouncer-mini` already used by config watcher
- Existing watcher patterns from Phase 3 / 3.5

**Open questions for arc brainstorm:**
- Mod-fingerprint registry hosting (bundled? cloud-fetched? both?)
- Background service vs foreground-only for V1 (recommend foreground)
- Watcher behavior during materialization (suspend, or hash-comparison naturally skips)

---

### Arc F -- Lossless export

**Status:** Not started. Small.

**Scope:** Export-to-portable-dir flow. UI button on a profile: "Export as portable Quake dir." User picks target path. Slipgate runs `materialize(profile, target=<path>, mode=copy_only)`. Result: standalone quake dir at the chosen path, fully functional with the user's engine, survives slipgate uninstall.

**Key design decisions from this session:**
- `copy_only` mode is mandatory (hardlinks would break on slipgate uninstall)
- Lossless export is a load-bearing product property -- protect by automated tests that verify the export tree boots an engine without slipgate present

**Implementation cost estimate:** 1-2 days (mostly UI + tests, since `materialize` already supports `copy_only`).

---

### Arc G -- Version history (per-config IDE-shaped restore)

**Status:** Not started. Small.

**Scope:** Manifest history retention + History panel UX in ConfigViewer. Two retention policies (per-save for configs, snapshot-points for other assets). GC sweeps respecting retention policy. UI: history panel in ConfigViewer with timestamped versions, auto-summary, side-by-side diff, restore button.

**Key design decisions from this session:**
- Per-save retention for configs (small, high value)
- Snapshot-point retention for other assets (auto-snapshot at meaningful events + manual labeled snapshots)
- Restore is forward-linear (creates a new manifest version with old bytes), NOT a git-reset truncation
- Default ON for configs, opt-out per profile available
- Storage cost is trivial (KB-scale per version)

**Implementation cost estimate:** 3-4 days (most work is the History panel UI; data structure falls out of B's manifest versioning).

---

### Arc H -- Cloud catalog hookup

**Status:** Not started. Last arc; depends on everything else.

**Scope:** Auth (already shipped via Discord OAuth). Sync flow: hash list of warehoused blobs, check against catalog, surface known/unknown. Profile import: download manifest, fetch missing blobs, materialize. Profile export: upload manifest + novel blobs, get share URL/handle. Browse UI for community catalog.

**Key design decisions from this session:**
- SHA256 is the join key with the catalog
- Stock paks NEVER cloud-served (copyright); verified locally only
- Submission-time normalization at catalog (image metadata stripping, audio canonicalization)
- Perceptual hashing as moderation aid only, not identity
- Bandwidth scales with novel-assets-per-profile, not total-assets-per-profile

**Implementation cost estimate:** 1 week+ (catalog backend work + slipgate UI + auth integration + test of full upload/download cycle).

**What's reusable:**
- Discord OAuth flow (shipped)
- Firebase token bridge (shipped)
- `release_cache` patterns (Phase 3.5b)

**Open questions for arc brainstorm:**
- Catalog backend hosting (Firebase / dedicated server / hybrid?)
- Privacy: public-by-default vs friends-only vs private?
- Moderation pipeline: auto-accept SHA-deduped vs always-human-review?

---

## Pre-arc tail items (to wrap before Arc A starts)

These are tail items from the Phase 3.5b binary-management arc that double as foundation for Managed Mode and should be wrapped before pivoting full-time:

### TAIL-1: FTE asset bundle consumer wiring

**Source:** HANDOVER entry "FTE asset bundle consumer wiring" (added 2026-04-27)

**Why now:** Arc D's classifier needs FTE-aware asset/path rules to work for FTE users. Without it, migration fails for any user with FTE in their dir.

**Scope:** Wire `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json` (already produced by Phase 2d-bundle) into the asset classifier. Refactor `bundle.ts` to load both ezQuake and FTE bundles, dispatch by engine kind during classification.

**Estimated:** Half-day to one day.

**Status:** Pending.

---

## What we're NOT doing (deferred from current arc)

These were previously on the Phase 3.5b/4 backlog. The Managed Mode pivot supersedes most of them.

| Backlog item | Disposition under Managed Mode |
|---|---|
| **Phase 4/5 -- diff viewer between warehoused binary versions** | DEFERRED. Returns as profile-vs-profile diff in Arc C-full (better surface). |
| **Retired cvars / stale-warning UX** | DEFERRED. May resurface as part of config history (Arc G) -- show users which cvars they've set that are no longer valid in their current engine version. |
| **Cross-engine alias scaffolding (sub-threads #4 + #5)** | DEFERRED. Possibly relevant to ARC-D's config sanitization (cross-engine config translation). Re-evaluate during Arc D brainstorm. |
| **HTML dashboard (shelved)** | Stays shelved. |
| **Workstream B/C, sub-pattern 2b** | Deferred indefinitely; may be irrelevant under new framing. |
| **Slipgate SCHEMA.md follow-up** | Deferred. Will be revisited as schema evolves through Managed Mode. |
| **Phase 3.5a/3.5b** | SHIPPED. |
| **Canonical-mode default for warehoused clients** | RESOLVED via Phase 3.5b's canonical-only design. |
| **Tier 3 future arcs (asset warehouse, bundle install, clean-room migration)** | THIS IS NOW THE MAIN ARC. Folded into Managed Mode roadmap. |
| **Player profiles (bundle-shaped, share-via-hashlist)** | THIS IS NOW THE MAIN ARC. Folded as Arc B + Arc H. |
| **Tray menu launch** | DEFERRED. Plays well with the active-profile launcher concept; may resurface in Arc C-full polish. |
| **Feed tab future content** | Independent track; not blocked by Managed Mode. |
| **Screenshot POC graduation** | Independent track; orthogonal to Managed Mode. |

---

## Status (as of 2026-04-28 mid-session)

| Item | Status |
|---|---|
| Vision spec | [OK] Drafted |
| Architecture spec | [OK] Drafted |
| Roadmap (this doc) | [OK] Drafted |
| TAIL-1: FTE asset bundle wiring | ⏳ Pending |
| Arc A: Asset warehouse substrate | ⏳ Not started; next brainstorm |
| Arc B: Profile manifest + materializer | ⏳ Not started; co-brainstorm with A |
| Arc C-minimal: Profile UI | ⏳ Not started |
| Arc D: Migration on-ramp + classifier | ⏳ Not started; co-brainstorm with E |
| Arc E: Filesystem watcher | ⏳ Not started; co-brainstorm with D |
| Arc F: Lossless export | ⏳ Not started |
| Arc G: Version history | ⏳ Not started |
| Arc C-full: Full profile UI | ⏳ Not started; V1+ |
| Arc H: Cloud catalog hookup | ⏳ Not started; V1+ |

---

## Recommended next-session sequence

1. **Wrap TAIL-1** (FTE asset bundle wiring) -- half-day to one day. Closes the Phase 3.5b arc cleanly and unblocks Arc D's FTE classifier.

2. **Brainstorm Arc A + Arc B together** as one design session. They're tightly coupled (asset warehouse and profile manifest share the materializer primitive). Output: spec docs for both, ratification of open questions (blob store unification, manifest format, retention policy defaults).

3. **Write Arc A's plan, execute Arc A.** ~1-2 days. Substrate work; mostly a refactor of binary warehouse patterns.

4. **Write Arc B's plan, execute Arc B.** ~4-6 days. The materializer's hardlink-or-copy logic is the meaty piece.

5. **Brainstorm Arc D + Arc E together.** Classifier shared between migration and watcher; co-design.

6. **Write Arc D's plan, execute Arc D.** ~1 week. Classifier work + pre-extraction overview UI.

7. **Write Arc E's plan, execute Arc E.** ~4-5 days. Watcher + policy.

8. **Write Arc C-minimal's plan, execute.** ~2-3 days. Profile switch UI; just enough to demo end-to-end.

**At this point V1 is shipped.** A user can install slipgate, run migration, end up with a managed install + bundled showcase profile, switch profiles, edit configs.

9. Arcs F (export), G (history), C-full (UI polish), H (cloud catalog) follow as time and demand allow. Each is independently shippable.

---

## Timeline expectation

**Operator estimate (calibrated against Phase 3.5b's pace):** ~1 week of focused work to ship V1 (Arcs A + B + D + E + C-minimal).

**Conservative estimate (with brainstorming sessions, design iteration, polish):** 2-3 weeks for V1.

**V1+ (Arcs F, G, C-full, H):** Another 2-4 weeks beyond V1 for full feature surface.

The pace of Phase 3.5b suggests the operator's estimate is plausible. Phase 3.5b shipped ~12 hours of focused work for what was budgeted at ~12 hours. The substrate reuse from Phase 3.5b accelerates Arcs A and B significantly. The novel work (classifier, watcher, migration UX) is in Arcs D and E.

---

## Provenance

This roadmap was drafted in the same design conversation as the vision and architecture specs, on 2026-04-28. It captures the dependency analysis, V1/V1+ split, and arc summaries that emerged during the conversation. Open questions per arc are intentionally NOT resolved here -- they're the work of the per-arc brainstorming sessions.

Operator confirmed the pivot from Phase 4/5 (binary diff viewer) to Managed Mode in this session. Phase 3.5b's binary management remains valid as Light-mode functionality; nothing shipped is wasted.

---

## Related documents

- **Vision:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
- **Architecture:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
- **Phase 3.5b plan (parent):** `docs/superpowers/plans/2026-04-26-add-quake-client.md`
- **Phase 3.5a plan (parent):** `docs/superpowers/plans/2026-04-27-clients-as-myquake-domain.md`
- **Quake Dir Control multi-phase plan:** `docs/superpowers/plans/2026-04-26-quake-dir-control.md`
- **HANDOVER:** `HANDOVER.md` -- open follow-up items, including TAIL-1 (FTE asset bundle wiring)
- **Memory: tier ladder framing:** `project_slipgate_tier_ladder.md` -- the four-tier intuition that the two-mode framing now distills
