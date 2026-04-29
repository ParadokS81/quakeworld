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
> - **Pass 3 (classifier + bucket taxonomy refinements + capture/swap pipeline + self-knowledge surface): COMPLETE 2026-04-29.** Five sub-questions ratified and drained into architecture spec body. (3.1) Configs-vs-assets divergence axis -- shared role registry + shared manifest entry shape + role-keyed retention reaffirmed; catalog-metadata-divergence and standalone-shareable-config dual lifecycle pushed to Arc H carry-forwards. (3.2) Bucket six (user-private) collapsed to single flavor (user-marked private) + primary profile concept + clone-modal-as-V1-selector-primitive (five consumers). (3.3) Bucket seven (user-library) V1-ratified: maps + locs + mod-content roles, profile-overrides-library precedence, gamedir-gated materialization, mod-cache-as-inbox / library-as-kept relationship. (3.4) Manifest publish rule (recognized-role profile-content only); five-case watcher dispatch (Case 5 user-private IGNORE); capture/swap two-stage pipeline with `.pending-swap.json` notebook + three swap triggers + Defenses 1-4 against partial-file capture; cleanup notification UX; auto-mode opt-in default OFF; classifier shared between Arc D + Arc E; `link()`-based inode-share at Stage 2. (3.5) Slipgate self-knowledge surface single-class reframed; per-table cadence (8 tables); delta-sync protocol shape; bundled baselines; Knowledge UI minimum; user-override mechanism; two-growth-axes principle; hub-as-gravitational-center triangle + manifest-references-hub-unknown-SHAs placeholder pattern + retroactive enrichment + no-P2P invariant + library separate-catalog-distribution path. Pass 3 brainstorm minutes captured at `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`. Carry-forwards into Pass 4 / 5 / 6 / Arc H / qw-oracle scope listed below.
> - **Pass 4 (watcher contract refinements): scope shrunk by Pass 3.4.** Capture/swap pipeline + Defenses + cleanup UX all landed in Pass 3.4. Pass 4 now carries only refinements: debounce-window tuning + per-extension integrity-check registry growth as Layer 1 grows. Likely a short pass.
> - **Pass 5 (launch UX + runtime swap classes + manifest backup UX): NOT YET STARTED.** Class 1 / Class 2 / Class 3 swap taxonomy (Pass 1 anchor item 5), mailslot ruleset-gating verification against ezQuake source via qw-oracle, multi-instance launch UX, manifest backup state surface ("last backed up: N days ago, K locations").
> - **Pass 6 (cloud catalog data shape, Arc H pre-implementation brainstorm): NOT YET STARTED.** Standalone-shareable-config dual lifecycle (`spec.cfg` / `demoviewer.cfg` / weapon-script / frag-message / alias bundles); catalog-metadata-divergence configs-vs-assets (two metadata schemas at the catalog layer); library separate catalog-distribution path; submission-flow shape; moderation pipeline.
> - **L1-alpha / -beta / -gamma / -delta tracks (qw-oracle scope, NOT slipgate Managed Mode arcs)** -- ecosystem-tools registry, cross-format binary fingerprinting (PE / AppImage / ELF / Mach-O), engine helpdoc / data-file recognition, stock asset catalog. Each track is its own qw-oracle-side arc with its own brainstorm + spec + plan. None gates V1; each track-arc lands more Layer 1 data via delta-sync. Tracked in HANDOVER under qw-oracle backlog.

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

**Key design decisions (Pass 1 + Pass 2 + Pass 3 ratified):**
- Manifests are JSON, KB-scale, canonicalized for deterministic SHA, version-stamped with `parent_manifest_sha`, schema_version field for future migration
- Materializer modes (Pass 1): `hardlink` (active-tree, single-volume by construction) and `copy` (lossless export). `hardlink_preferred` middle case dropped.
- Atomic materialization (Pass 2.4): build-new-and-swap (temp tree + atomic rename), trust-existing-tree fast path, watcher self-skip via hash, UI busy-state pattern as primary serializer
- **Private-file preservation pre-swap (Pass 3.2):** before atomic rename, materializer copies `private.json` paths from live tree into temp tree -- private files survive rematerialization
- Tree path: `<data-root>/profiles/<uuid>/tree/`
- **Three-role profile pointer (Pass 3.2):** `<data-root>/profile-roles.json` carries `primary_profile_id` + `active_profile_id` + `active_since` (supersedes `active-profile.json`). Primary is durable; active is UI focus; both are independent of launched-state.
- **Manifest publish rule (Pass 3.4):** entries are recognized-role profile-content only; user-content / library / private structurally outside.
- Profile manifests retained as historical chain under `manifest-history/<timestamp>-<sha>.json` (full manifests, no deltas) -- drives Arc G
- Registry-based role taxonomy refreshable from catalog (no hardcoded enum)
- **Library manifest at `<data-root>/library/manifest.json` (Pass 3.3):** structurally same schema as profile manifest; library-prefixed roles (`library:map` / `library:loc` / `library:mod-content`); no `declared_gamedirs` field; materializes into each profile's tree per profile's `declared_gamedirs`; profile-overrides-library precedence.

**Implementation cost estimate:** 4-6 days for profile substrate + 1-2 days for library manifest + materializer extension. The materializer's atomic-swap + trust-existing-tree + private preservation + library-overlay logic + UI busy-state plumbing is the meaty part. Manifest CRUD + validation + corruption recovery is straightforward but needs the migration-registry framing.

**No open questions remaining for this arc** -- Pass 2 + Pass 3 ratified the manifest schema, atomic materialization semantics, history retention, profile-roles primitive, library manifest, and publish rule. Implementation can proceed when sequenced.

---

### Arc C -- Profile UI (split: C-minimal + C-full)

**Status:** Not started.

**Scope:**

**C-minimal (V1):**
- Profiles tab in MyQuake (sibling Domain to Clients/Configs/etc.)
- List of profiles with primary + active markers (Pass 3.2: primary star icon, active highlight; surfaces "Profile: X star primary | Active: Y" when they differ)
- Create profile button (basic -- fork from active or fork from primary or import from elsewhere). Uses the **clone modal as V1 selector primitive** (Pass 3.2): one UI primitive shared with Pre-publish review, Selective import (Arc C-full), Pre-extraction overview (Arc D), and Export (Arc F).
- Switch profile button (with active-process check, like swap_active_version)
- "Make this primary" action with confirmation (Pass 3.2)
- Delete profile button -- prompt UX with refcount-derived "N assets unique to this profile" + orphaned-private retention (Pass 3.2)
- Active + primary display in Status bar / app chrome

**C-full (V1+):**
- Profile detail view: browse the manifest as an abstraction (assets organized by role + category, source, modification time)
- Side-by-side profile diff (the "config compare at quakedir level" feature)
- Per-row actions: "merge this entry into another profile," "fork from this state," "view this asset's history"
- **Selective import from another profile uses the modal-as-selector primitive (Pass 3.2):** "Try Milton's visuals only" drives `merge(into=mine, from=milton, selector=<modal-output>)`. Same UI grammar as Clone, Pre-publish review, Pre-extraction overview, Export.
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

**Key design decisions (Pass 0 + Pass 3.4):**
- **Non-destructive:** copy, never move. Source dir untouched. Reversible.
- Active-config-aware: only extract assets the user's chain actually loads at runtime (with conditional/alias-reachable as user-tickable)
- Pre-extraction overview is non-negotiable. **Pre-extraction overview is the modal-as-selector primitive** (Pass 3.2 cross-link) -- same UI grammar as Clone, Pre-publish review, Selective import, Export.
- Config rewrite shows a diff to user; per-line accept/decline
- Stock pak verification against catalog SHA list (refuse if no match -- copyright safety)
- **Classifier shared with Arc E (Pass 3.4 invariant):** Arc D and Arc E consume the same `classify(path, bytes) -> ClassifierOutput` function. Co-design constraint, not co-design suggestion.
- **Capture/swap pipeline reference:** migration's extract step uses `register` with `link()`-based inode-share (Pass 3.4 same primitive Stage 2 of the watcher uses).
- **Maps and locs default to library, not user-asset (Pass 3.3):** existing maps + locs in source dir classify as `library:map` and `library:loc` at migration time. User can override individual entries via the modal.
- **Migration sets primary (Pass 3.2):** the migrated profile becomes the user's primary by definition (their existing dir is their natural anchor).

**Implementation cost estimate:** 1 week+ (the largest single arc -- the classifier work is meaty; the UI for pre-extraction overview is rich; library-vs-profile classification adds a step). Cost partially shared with Arc E (classifier) and Arc B (modal primitive).

**What's reusable:**
- Config-chain parser (existing in slipgate)
- Asset bundle classifier (Phase 2d-bundle for ezQuake + FTE -- TAIL-1 wiring shipped 2026-04-28 in commit `6d6cd1c`)
- `weapon_classifier`, `weapon_triggers`, bind/alias classification (existing)
- ezquake `read_exe_version`, `read_pe_strings` (Phase 3.5b)

**Open questions for arc brainstorm:**
- Trigger-conditional asset handling: include-by-default, opt-out, or always-prompt?
- Stock pak verification: blocking (refuse migration) vs warning (allow user to override)?
- Multi-engine quake dirs (user has both ezQuake and FTE in same dir): one profile or two?

---

### Arc E -- Filesystem watcher + classifier + mod-fingerprint registry

**Status:** Not started. Co-design with Arc D.

**Scope:** Foreground filesystem watcher on the active profile's tree, organized as a **two-stage capture/swap pipeline** (Pass 3.4 ratified -- supersedes earlier register-on-event flow).

**Stage 1 -- observe (always running while slipgate is open).** Five-case dispatch:
1. Tracked + matches engine-runtime allowlist -> IGNORE.
2. Tracked + real edit -> record `(path, size, mtime)` in `<data-root>/.pending-swap.json`.
3. Untracked + new file -> record in `.pending-swap.json` with tentative classifier result.
4. Tracked + deleted -> surface at next cleanup notification.
5. Untracked + path in `private.json` -> IGNORE (Pass 3.2 + 3.4).

NO bytes read, NO hashing, NO filesystem mutation during Stage 1. The watcher is a notebook.

**Stage 2 -- process at safe moment.** Three triggers fire Stage 2: engine-exit (auto), user-invoked Cleanup button, idle-nudge. For each entry the user opts to keep: stable-mtime check, hash, integrity check, `link(tree_path, blob_path)` to share inode, update sidecar + refcount, write manifest entry (library / profile / `private.json` per user choice). Discard route unlinks; "Keep without warehousing" leaves tree alone.

**Key design decisions (Pass 0 + Pass 3.4):**
- Foreground-only for V1 (Pass 1 confirmed). Pass 4 may revisit background-service if real demand emerges.
- **Defenses against partial-file capture (Pass 3.4):**
  - Defense 1: never process during engine session (eliminates the failure class structurally).
  - Defense 2: stable-mtime check before hashing (default 5s, tuneable).
  - Defense 3: per-extension integrity-check table (declarative rules: magic bytes + offset/size sanity for `.bsp` / `.wav` / `.pak` / `.tga` / `.png`). Bundled with slipgate; refreshable via self-knowledge surface.
  - Defense 4: mod-fingerprint partial detection ("looks like partial CTF: 47 of 95 expected files").
- **Cleanup notification UX (Pass 3.4):** unified surface for pending swaps + classifications + promotions. Per-entry actions: Add to library / Add to active profile / Promote to mod-cache / Mark as private / Discard. Bulk actions per category. "Apply selected" runs Stage-2 processing.
- **Auto-mode opt-in (Pass 3.4):** default OFF. Cleanup-notification UX is the default flow. Opt-in routes high-confidence + integrity-pass entries to classifier-determined destination automatically.
- **Classifier shared with Arc D (Pass 3.4 invariant):** Arc D and Arc E consume the same `classify(path, bytes) -> ClassifierOutput` function.
- 10-second debounce for configs (coalesces save-bursts into single record / single manifest version downstream).
- Engine-runtime allowlist per-engine (ezQuake / FTE / etc.). Bundled with slipgate; refreshable via self-knowledge surface.
- Mod-fingerprint registry: bundled-with-slipgate baseline + on-sign-in + on-demand refresh from catalog (Pass 3.5 self-knowledge surface).

**Implementation cost estimate:** 4-5 days (uses Arc D's classifier; mostly plumbing + policy + cleanup-notification UX).

**What's reusable:**
- `notify-debouncer-mini` already used by config watcher
- Existing watcher patterns from Phase 3 / 3.5

**Open questions for arc brainstorm (Pass 4 refinement scope only):**
- Debounce-window tuning (10s default may be wrong; measure under real edit patterns).
- Per-extension integrity-check rule shape (declarative DSL? Embedded JSON? Lua-style? Tracked under self-knowledge surface).

---

### Arc F -- Lossless export

**Status:** Not started. Small.

**Scope:** Export-to-portable-dir flow. UI button on a profile: "Export as portable Quake dir." User picks target path. Slipgate runs `materialize(profile, target=<path>, mode=copy_only)`. Result: standalone quake dir at the chosen path, fully functional with the user's engine, survives slipgate uninstall.

**Key design decisions (Pass 0 + Pass 3.2 + 3.4):**
- `copy_only` mode is mandatory (hardlinks would break on slipgate uninstall)
- Lossless export is a load-bearing product property -- protect by automated tests that verify the export tree boots an engine without slipgate present
- **Export uses the modal-as-selector primitive (Pass 3.2):** export is the fifth consumer of the clone modal. Defaults: stock + profile content + library content ON; user-content + private OFF. User can override individual entries.

**Implementation cost estimate:** 1-2 days (mostly UI + tests, since `materialize` already supports `copy_only`; modal primitive is shared with Arc B / C-minimal / D).

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

**Key design decisions (Pass 0 + Pass 3.5):**
- SHA256 is the join key with the catalog
- Stock paks NEVER cloud-served (copyright); verified locally only
- Submission-time normalization at catalog (image metadata stripping, audio canonicalization)
- Perceptual hashing as moderation aid only, not identity
- Bandwidth scales with novel-assets-per-profile, not total-assets-per-profile
- **Hub as gravitational center (Pass 3.5):** three-way data flow -- app -> hub (submission candidates), hub -> app (delta-sync refresh), app -> app (manifests with SHA references).
- **No P2P (Pass 3.5):** bytes flow only when the hub validates and serves them. Recipients can never download a hub-unknown SHA directly.
- **Manifests carry placeholders for hub-unknown SHAs (Pass 3.5):** "greyed-out until validated" UX; "Notify me when this becomes available" workflow.
- **Retroactive metadata enrichment (Pass 3.5):** when hub catches up via delta-sync, rich UI activates retroactively for users whose imported manifests already reference newly-known SHAs.
- **Library has a separate catalog-distribution path (Pass 3.3):** library content does NOT travel with profile manifests; library has its own publish/share path, catalog-distributed-as-asset-bundle.

**Pass 6 / Arc H pre-implementation brainstorm scope (carry-forwards from Pass 3):**
- **Standalone-shareable-config dual lifecycle:** `spec.cfg`, `demoviewer.cfg`, weapon-script bundles, frag-message packs, alias bundles. Catalog-distributed like assets (author, license, curated category, browsable, downloadable a la carte) but config-shaped at consumption (text, editable, often customized after download). Identity pinned at download SHA; per-user edits create downstream SHAs with `added_via: catalog-download:<asset-handle>`.
- **Catalog-metadata-divergence configs-vs-assets:** configs intrinsically thin at catalog (no author/license/curation across users); assets rich (author, license, curated category, perceptual-hash neighbors, moderation history). Two metadata schemas at the catalog layer.
- **Library separate-catalog-distribution path:** what does "share my map collection" / "import this curated loc set" look like as a catalog primitive distinct from "share my profile"?

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

## Status (as of 2026-04-29)

| Item | Status |
|---|---|
| Vision spec | [OK] Drafted + Pass 1/2/3 status notes drained |
| Architecture spec | [OK] Drafted + Pass 1/2/3 fully drained into body |
| Roadmap (this doc) | [OK] Drafted + Pass 1/2/3 progress block updated |
| TAIL-1: FTE asset bundle wiring | [OK] Shipped 2026-04-28 (commit 6d6cd1c) |
| Brainstorm Pass 1 (substrate + storage) | [OK] Complete 2026-04-28 |
| Brainstorm Pass 2 (manifest + materializer + gamedirs + history) | [OK] Complete 2026-04-28 |
| Brainstorm Pass 3 (classifier + buckets + capture/swap + self-knowledge) | [OK] Complete 2026-04-29 |
| Brainstorm Pass 4 (watcher refinements only -- scope shrunk by 3.4) | Not yet started |
| Brainstorm Pass 5 (launch UX + runtime swap classes + manifest backup UX) | Not yet started |
| Brainstorm Pass 6 (Arc H pre-implementation -- catalog data shape) | Not yet started |
| Arc A: Asset warehouse substrate | Not started |
| Arc B: Profile manifest + materializer | Not started |
| Arc C-minimal: Profile UI | Not started |
| Arc D: Migration on-ramp + classifier | Not started; co-brainstorm with E |
| Arc E: Filesystem watcher | Not started; co-brainstorm with D |
| Arc F: Lossless export | Not started |
| Arc G: Version history | Not started |
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
