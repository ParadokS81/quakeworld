# Slipgate Managed Mode -- Architecture

> **Captured 2026-04-28** alongside the vision spec (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`). This document defines the data model, storage layout, primitive operations, content taxonomy, watcher contract, SHA256 governance, and engine integration that the Managed Mode arc roadmap (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`) implements.
>
> **Reading order:** Read VISION first for the why. Read this for the how. Read ROADMAP for the when.

> **Update 2026-04-28 (pre-Pass-1 anchor):** Six decisions ratified during the orchestrator briefing extend this document before the Arc A+B brainstorm Pass 1. They are summarized below as anchor points; the body is being revised pass-by-pass to integrate them as brainstorm work crystallizes. Until each pass is drained, where the body and this anchor diverge, the anchor is authoritative.
>
> **Pass 1 status: COMPLETE 2026-04-28.** Substrate and storage decisions drained into body -- see Storage Layout (Unified blob store, Layout decisions ratified, Process model, Implementation note), Primitive operations (register/materialize/export updated), Primary/active/launched profiles (Pass 3.2 renamed and added the primary concept), Garbage collection (manifest-as-truth + refcount), Lossless-export pledge protection. Item 1 below is now in body; items 2-6 remain pending later passes.
>
> **Pass 2 status: COMPLETE 2026-04-28.** Manifest schema, materializer mechanics, gamedir handling, and history retention drained into body -- see Manifest as Profile (Pass 2 ratified schema, identity, validation, atomic write, declared_gamedirs), Primitive operations `materialize` (atomic swap + trust-existing-tree + UI busy-state + watcher self-skip), Versioning and history (living-file-vs-immutable-artifact principle + checkpoints + retention defaults), Slipgate self-knowledge surface (Pass 2 placeholder; since fully replaced by Pass 3.5 single-class reframe). Item 3 below is now in body. Items 2, 4, 5 remain pending Passes 3+.
>
> **Pass 3 status: COMPLETE 2026-04-29.** Five sub-questions ratified and drained into body: 3.1 configs-vs-assets divergence axis (reaffirmed Pass 2; Arc H carry-forwards surfaced), 3.2 bucket six (user-private) + primary profile + clone modal as V1 selector primitive, 3.3 bucket seven (user-library) + mod gamedirs + materialization precedence, 3.4 classifier rules + capture/swap pipeline + manifest publish rule, 3.5 slipgate self-knowledge surface (single-class reframed). See Storage Layout (`library/`, `profile-roles.json`, `.pending-swap.json`, `orphaned-private/` + `orphaned-profiles/`), Manifest as Profile (publish-rule four-condition filter), Primary, active, and launched profiles (primary as third concept), Content Taxonomy (bucket 6 single-flavor; bucket 7 V1-ratified library; "other" framing), Materialization (stock -> profile -> library precedence), Filesystem Watcher Contract (five-case + capture/swap pipeline + Defenses 1-4 + cleanup notification UX + auto-mode opt-in), Primitive operations (`link()`-based capture/swap; clone modal with five consumers; Make-this-primary; profile-delete prompt UX), Engine integration (declared_gamedirs gates library), Migration (Arc D + Arc E share classifier invariant), Slipgate self-knowledge surface (per-table cadence; delta-sync protocol; Knowledge UI; user-override; two-growth-axes), Cloud catalog interaction (hub-as-gravitational-center triangle; manifest-references-hub-unknown-SHAs placeholder pattern; retroactive enrichment; no-P2P invariant; library separate catalog-distribution path). Items 2 + 4 below now in body; item 5 remains pending Pass 5. Pass 3 brainstorm minutes captured at `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`.
>
> 1. **Materializer modes simplify.** Two modes only: `hardlink` (active-tree materialization) and `copy` (lossless export). The `hardlink_preferred` fallback middle case is dropped -- under slipgate-IS-quakedir, active-tree materialization is single-volume by construction. Edge case: data roots on filesystems without hardlink support (FAT32 / exFAT / some network mounts) blocked at install with a precondition check, not silent copy fallback. **DRAINED into Storage Layout + Primitive Operations 2026-04-28.**
>
> 2. **Sixth content-taxonomy bucket: `user-private` (in-tree, unmanaged).** Files in the materialized tree that are NOT in any manifest and NOT classified into the other five buckets, but the user has marked as "respect, don't touch" (private notes, personal subfolders, half-finished experiments). Preserved across rematerialization, not warehoused, not exported, not synced. Tracked via `<data-root>/profiles/<id>/private.json` listing relative paths. (Affects: Content Taxonomy, Filesystem Watcher Contract -- adds a fifth dispatch case "untracked + user-private" alongside the existing four.) **Pass 3 collapsed to single flavor (user-marked private only); auto-uncertain framing dropped. DRAINED into Content Taxonomy + Filesystem Watcher Contract + Primitive operations 2026-04-29.**
>
> 3. **Manifest gains `declared_gamedirs: string[]`.** Lists the gamedirs the profile expects to materialize ("qw", "painkeep", "hipnotic", etc. -- note: KTX is server-side and runs in `qw/`, not its own gamedir). Launcher offers a per-launch gamedir picker when length > 1. Anchors a future mod/singleplayer/expansion launcher (Painkeep-as-gamedir, hipnotic/rogue expansions) on the same primitive at near-zero cost. **DRAINED into Manifest as Profile 2026-04-28.**
>
> 4. **Cloud-SHA-lookup is load-bearing for the classifier long-run.** Arc E (watcher) ships with local-heuristic classification + deferred submission queue for unknown SHAs. Arc H (cloud catalog) augments lookups with catalog metadata when online. Two-way collaboration: user-confirmed classifications flow back as moderated submission candidates. Offline mode keeps full classifier functionality with reduced precision. Implication: Arc H's catalog data shape must be brainstormed alongside Arc A/B/D/E (locked at design time; can still ship as a later implementation arc). (Affects: Cloud Catalog Interaction, Filesystem Watcher Contract.) **Pass 3 drained the hub-as-gravitational-center triangle, manifest-references-hub-unknown-SHAs placeholder pattern, retroactive enrichment flow, and no-P2P invariant into Cloud catalog interaction 2026-04-29. Catalog data-shape brainstorm itself remains Pass 6 / Arc H scope.**
>
> 5. **Runtime swap class taxonomy.** Class 1: cfg-only swap (HUD, binds, aliases) -- mailslot-driven `exec` / `cfg_load`, no engine restart. Class 2: visual-asset swap (textures, skins, sounds) -- `vid_restart` or next-mapchange, mixed reload-cost per asset category, taxonomy required. Class 3: full profile swap (different stock paks, binaries, gamedirs) -- engine restart required. V1 ships Class 1 deliberate, Class 2 empirical case-by-case, Class 3 default UX = "engine restart required." Mailslot is ezQuake-specific (`\\.\mailslot\ezquake`); FTE IPC TBD. Mailslot ruleset-gating to be verified against ezQuake source via qw-oracle before tournament-context features. (Affects: Engine Integration -- new subsection.)
>
> 6. **(Roadmap-only)** Brainstorm scope covers the full surface (Arcs A through H), not just V1 substrate. Pre-launch greenfield with no production code and no users means design coherence requires committing to cross-arc contracts up front. V1/V1+ remains the implementation-sequence axis but is no longer the design-scope axis.
>
> **Pass 3 carry-forwards (for later passes / Arc H / qw-oracle):**
> - **Arc H catalog data shape** -- standalone-shareable-config dual lifecycle (`spec.cfg`, `demoviewer.cfg`, weapon-script bundles, frag-message packs, alias bundles: catalog-immutable then profile-living; identity pinned at download SHA; per-user edits create downstream SHAs with `added_via: catalog-download:<asset-handle>`); catalog-metadata-divergence configs-vs-assets (configs intrinsically thin -- no author/license/curation across users; assets rich -- author, license, curated category, perceptual-hash neighbors, moderation history -- two metadata schemas at the catalog layer); library separate catalog-distribution path (already cross-linked from Cloud catalog interaction). All resolved by Arc H pre-implementation brainstorm (Pass 6).
> - **Pass 4 watcher contract refinements** -- largely subsumed by 3.4 capture/swap pipeline. Only debounce-window tuning + per-extension integrity-check registry growth remain.
> - **Pass 5 launch UX + runtime swap classes** (anchor item 5) + **manifest backup UX** -- Class 1 / Class 2 / Class 3 swap taxonomy, mailslot ruleset-gating verification against ezQuake source, multi-instance launch UX, backup-state surface ("last backed up: N days ago, K locations").
> - **L1-alpha / L1-beta / L1-gamma / L1-delta tracks (qw-oracle scope, NOT slipgate Managed Mode arcs)** -- ecosystem-tools registry; cross-format binary fingerprinting (PE / AppImage / ELF / Mach-O); engine helpdoc / data-file recognition; stock asset catalog (per-pak file-inside-pak listing). Operator's "other" bucket walked end-to-end as Layer 1 closure work, not slipgate-side. None gate V1; each track-arc lands more data via delta-sync. Methodology + per-track shape captured at `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`.

---

## Foundational concepts

### Content-addressed storage

Every asset slipgate manages is identified by its SHA256 hash. The hash is the primary key for storage, lookup, deduplication, and identity verification.

```
<data-root>/blobs/abc123...def.bin
```

A blob is just bytes. The store doesn't care what the bytes mean (texture, config, pak, executable, sound). The bytes are immutable: once written, a blob is never modified. If "the same logical asset" needs to change, the change produces a new blob with a new hash, and references update to point at the new hash.

This is the same primitive as Git's object store (with hashes instead of names), Nix's `/nix/store/<hash>-<name>/`, OSTree's content-addressed object database. Mature pattern, known tradeoffs, well-understood operational characteristics.

### Manifest as profile

A profile is a JSON document that maps SHA256 hashes to target filesystem paths, plus metadata about each entry. The manifest is small (KB-scale even for setups with hundreds of entries). Sharing a profile is sharing a manifest. Importing a profile is fetching whatever blobs aren't already locally available.

**Manifest is a complete unfiltered snapshot.** When a profile is published or shared, the manifest captures the full state of the user's quakedir. Filtering happens at *consumption*, not at publish -- the import modal lets the receiving user pick which subsets to actually pull (defaults: configs + customizations + map textures for maps you already have; opt-in for large unrelated assets). This mirrors the lossless-export pledge from the publishing side and keeps profile-sharing honest.

**"Unfiltered" means every recognized-role profile-content entry, NOT every byte in the data root.** The publish rule (Pass 3.4 ratified) filters by structural category, not by user judgment:

```
manifest entry iff:
    role in recognized-roles (registry-validated)
  AND role not in user-content-roles (demos, screenshots, logs structurally outside)
  AND role not in library-roles (library content travels via library manifest, not profile)
  AND path not in private.json
```

Unclassified files never reach a manifest. User-content (demos / screenshots / logs) never reaches a manifest. Library content (maps / locs / mod-content) lives in the library manifest, not any profile manifest. Private files never reach a manifest. The rule forces clean discipline: either upgrade an asset to a known role (which is also the hub-submission gesture) OR keep it out. Layer 1 closure work (qw-oracle "other"-bucket walk-through) closes role-recognition gaps via slipgate releases.

#### Schema (Pass 2 ratified)

```json
{
  "schema_version": 1,
  "id": "5d8a3c2b-...",
  "name": "paradoks-default",
  "created_at": "2026-04-28T10:14:00Z",
  "updated_at": "2026-04-28T14:33:00Z",
  "parent_manifest_sha": null,
  "declared_gamedirs": ["qw"],
  "entries": [
    {
      "sha256": "abc123...def",
      "target_path": "id1/pak0.pak",
      "role": "stock:baseline",
      "size": 18954112
    },
    {
      "sha256": "ghi456...uvw",
      "target_path": "qw/config.cfg",
      "role": "user-asset:config",
      "size": 12453,
      "added_via": "migration:initial-extraction"
    },
    {
      "sha256": "jkl789...xyz",
      "target_path": "qw/textures/wads/cs/wall1_2.tga",
      "role": "user-asset:texture",
      "size": 524288,
      "added_via": "user-import:drag-drop"
    }
  ]
}
```

**Identity (2.1.a):** `id` is an immutable UUID -- the profile's stable filesystem path component (`<data-root>/profiles/<uuid>/`). `name` is a mutable display label, unique within a data root (collisions on import suffix `-2`, `-3`). Renaming a profile leaves history, genealogy, and shortcuts intact. Cloning ("fork from active, pick categories") is the fork primitive -- selectable_subsets is NOT in the manifest schema; subset selection happens at fork/import time, computed from the `role` field.

**Schema versioning (2.1.b):** `schema_version: 1` is required. Slipgate ships an append-only migration registry; on load, manifests with `schema_version < CURRENT` run sequential migrations and write back. First-version field; no implicit detection.

**Manifest fingerprint (2.1.c):** `parent_manifest_sha` is the SHA256 of the parent manifest after canonicalization. Canonicalization rules: keys sorted lexicographically at every object level, no trailing whitespace, LF line endings only, UTF-8 with no BOM, numbers in shortest form. The manifest's own SHA is stored externally (in `manifest-history/<timestamp>-<sha>.json` filename), not inside the document. This gives deterministic SHAs across machines without bootstrap-loop problems. Genealogy/credit UX consumption is a later product decision; the data is here if needed.

**Engine compatibility:** No `engine_compatibility` field. Per-cvar warnings are computed at runtime from the qw-oracle Layer 1 data plus the user's installed engine version ("cvar X requires ezQuake 3.6.9; you have 3.5.1 -- feature won't work"). Author-declared compatibility is opinion; cvar-derived compatibility is fact, and the data is already in the knowledge service. Engine still ignores unknown cvars at runtime; user can dismiss the warning and play.

**Atomic write + corruption recovery (2.1.e):** Every manifest write is `manifest.json.tmp` -> fsync -> atomic rename -> fsync parent dir. On profile creation, slipgate immediately writes a backup copy so two copies exist before any session. Validation is eager on write (refuse to write invalid manifests), lazy on read (validate-then-load with structured error). Corruption recovery sequence:
1. Try restoring from most recent `manifest-history/<timestamp>-<sha>.json` entry.
2. If history is empty or also corrupted, offer hash-walk-the-tree rebuild: hash every file in the materialized tree, reconstruct manifest entries from blob registry.
3. If that fails too, surface "profile manifest unrecoverable" with the option to delete the profile.

The combination of (creation backup) + (manifest history per save) + (catalog backup) + (lossless export) + (rebuild-from-tree) means catastrophic loss requires multiple simultaneous failures.

#### Entry schema (Pass 2 ratified)

**Required fields:** `sha256`, `target_path`, `role`. The minimum to materialize.

**Optional but recommended:** `size` (denormalized blob size; avoids stat for "how big is this profile?" UI).

**Optional:** `added_via` (profile-local provenance string with documented prefixes):
- `migration:initial-extraction` -- came in during clean-room migration
- `user-import:drag-drop` / `user-import:file-picker` -- user imported directly
- `catalog-download:<asset-handle>` -- pulled from cloud catalog
- `edit:watcher` -- created by the watcher absorbing an in-place edit
- `fork-from:<profile-id>` -- came along when forking
- `merge-from:<profile-id>` -- came in via selective merge

`added_via` is profile-local provenance ("how did this entry land in MY manifest"), distinct from asset-global authorship. Asset authorship/license/credit metadata lives in the catalog and is fetched by SHA at display time.

**Forbidden in V1:** anything else. Keep entries lean. `selectable_subsets` deferred (the cloning-with-categories UX computes subsets from `role` directly; no DSL needed).

**Role taxonomy is registry-based, not hardcoded.** Slipgate ships a default `asset-roles.json` (the categories known today). When the user is signed in, slipgate optionally refreshes the registry from the catalog. New asset types (KTX-specific stuff, mod content, future categories) are catalog-side data updates -- no slipgate code change required. Authority: catalog admin defines new roles; slipgate consumes. Validation rule on manifest write: every entry's `role` must be in the currently-known registry. Importing a profile with a role not yet in the local registry triggers a refresh attempt or a user prompt. This is one instance of the broader "slipgate self-knowledge surface" pattern (see dedicated section).

**Cross-platform `target_path` rules (2.2.b):**
- Forward slashes only inside manifests; slipgate translates to backslashes on Windows when materializing
- Lowercase normalization for path comparisons (Windows-friendly; Linux profiles cross-port without case-mismatch surprises)
- Reject Windows-illegal characters at write time with a clear error (`:`, `*`, `?`, `<`, `>`, `|`, etc.)
- ~200-char limit on relative path inside the manifest (gives 60 char headroom for the data-root prefix on Windows's 260-char default path limit)

**Within-manifest collision (2.2.c):** Two entries with the same `target_path` are rejected at write time with a structured error. Always a bug; silent winners would hide it. Fork/merge primitives handle this at the operation level.

**`declared_gamedirs` (2.3, drained from anchor item 3):** Ordered list of gamedirs the profile expects to materialize, e.g. `["qw"]` for a normal QW profile, `["qw", "painkeep"]` for a Painkeep-aware profile. The first entry is the **primary** gamedir. KTX is server-side and runs in `qw/`, not its own gamedir.

**Validation rule:** every `target_path`'s first segment must be one of:
- `id1` (universal stock baseline)
- a member of `declared_gamedirs`
- an allowlisted root-level engine file (`ezquake.exe`, `fteqw.exe`, DLLs, etc.)

Entries outside this set are rejected at manifest write time. Merging an entry that introduces a new gamedir is a UI-level concern (the merge flow surfaces "this profile adds gamedir 'painkeep' -- extend yours?" before the merge proceeds) -- the manifest layer never stores entries for undeclared gamedirs.

**Server-pushed gamedirs** (CTF auto-download, etc.) are NOT in the profile manifest. They land in `<data-root>/mod-cache/<mod>/` (cache-ephemera bucket) and are handled by the watcher (Arc E), not the manifest.

#### Launcher UX implications

The launcher displays current state for the active profile: `[Profile: paradoks-default | Client: ezQuake 3.6.9 | Gamedir: qw]`. The primary gamedir is highlighted; user can reorder primaries in profile settings. A per-launch gamedir picker fires only when `declared_gamedirs.length > 1`. For typical QW profiles (single-gamedir `["qw"]`), the picker is invisible.

Forward-compatibility: when slipgate later tackles QuakeInjector-style singleplayer / Painkeep / hipnotic / rogue support, the primitive is already in place. No architectural rework.

### Materialization as view

A manifest is the source of truth. The user sees and the engine reads a "directory tree" that is computed from the manifest by hardlinking (or copying) the warehoused blobs into a tree structure mirroring the target_path entries.

```
<data-root>/profiles/paradoks-default/tree/
  id1/
    pak0.pak           -> hardlink to <data-root>/blobs/abc123...def.bin
    pak1.pak           -> hardlink
  qw/
    config.cfg         -> hardlink to <data-root>/blobs/ghi456...uvw.bin
    autoexec.cfg       -> hardlink
    textures/
      wads/
        cs/
          wall1_2.tga  -> hardlink
    sound/
      weapons/
        r_exp3.wav     -> hardlink
  ezquake.exe          -> hardlink to a binary warehouse blob
```

The tree is what the engine launches against (`ezquake -basedir <data-root>/profiles/paradoks-default/tree/`). Users browse it with their normal file explorer; everything looks like a regular Quake directory because hardlinks are indistinguishable from regular files for read/exec purposes.

The tree is **derived state**. Wiping it and rematerializing from the manifest produces a byte-identical result. The manifest is the source of truth; the tree is a cached materialization.

**Materialization order (Pass 3.3 ratified):** stock baseline -> profile content -> library content. Profile entries get their hardlinks first; library entries fill in remaining target paths the profile didn't claim.

**Profile-overrides-library precedence:** if a profile manifest entry and a library manifest entry resolve to the same `target_path`, the profile entry wins for that profile; the library version is shadowed. This is what makes per-profile loc / map variation clean: a tournament-clean profile can carry vanilla `qw/maps/dm3.bsp` and shadow library's textured-dm3 without needing a second library or schema gymnastics.

**`declared_gamedirs` gates library materialization** in addition to its profile-manifest validation role: library entries materialize into a profile's tree iff their `target_path`'s first segment is `id1` OR is a member of the profile's `declared_gamedirs`. A profile with `declared_gamedirs: ["qw"]` materializes library's qw/* and id1/* but NOT ctf/*, tf/*, painkeep/*, etc. -- even though those entries exist in the library manifest, they are gated out for this profile.

### Primary, active, and launched profiles (Pass 3.2 ratified)

Three concepts that can differ at any moment:

- **Primary profile** -- the user's permanent-ish anchor profile. Default fork target ("Fork from primary" is the one-click for sandbox clones), default launch target if active hasn't been set, mental-model anchor in UI, migration on-ramp's natural landing zone (the user's existing dir becomes their primary by definition). Exactly one. Set on first profile creation (migration sets primary = the migrated profile; fresh-start sets primary = the seeded default). Changed via explicit "Make this primary" action with confirmation. Slipgate UI surfaces "Profile: paradoks-default star primary | Active: experiment-3" when active != primary.
- **Active profile** -- the profile slipgate's UI is currently focused on (ConfigViewer, MyQuake, edits operate against it). Exactly one.
- **Launched profiles** -- the set of profiles with a running engine instance. Zero or more concurrently. ezQuake supports multiple engine instances natively (real use case: idle in a 4on4 server while playing 1on1 in a second instance). Each launched instance binds to its own profile's tree via `-basedir`.

All three can differ. Primary is durable; active is UI focus and switches more freely; launched is process state. A user can have primary `paradoks-default`, active `experiment-3`, and launched `{paradoks-default, tournament-clean}` all simultaneously. Profile switching in the UI sense (`swap_active_profile`) updates the active pointer; "Make this primary" updates primary. Profile launching is a separate operation covered in Engine integration.

What primary unlocks: default fork target, default launch fallback, UI mental-model anchor, migration landing zone. What primary does NOT change: GC logic (refcount-driven, not primary-driven), profile delete safety (any-other-reference-exists is the GC question; primary just adds a stronger UI guard against accidental delete), asset retention (manifest-reference-driven). Primary is one of the manifest sources refcount counts; it does not enter GC logic specially.

Storage: `<data-root>/profile-roles.json` (Pass 3.2; supersedes `active-profile.json`):

```json
{
  "schema_version": 1,
  "primary_profile_id": "uuid",
  "active_profile_id": "uuid",
  "active_since": "2026-04-29T10:14:00Z"
}
```

Tree materialization is independent of all three role pointers -- multiple profiles can be materialized simultaneously regardless of which is primary, active, or launched.

---

## Storage layout

The complete data root structure (Pass 1 ratified):

```
<data-root>/                          <- slipgate's managed install root
  .lock                               <- single-process invariant (PID + hostname + timestamp)
  .pending-swap.json                  <- watcher's notebook of paths needing safe-moment processing (Pass 3.4)
  profile-roles.json                  <- primary + active profile pointers (Pass 3.2; supersedes active-profile.json)
  profile-roles-history.json          <- audit log of role transitions (primary changes, active switches)

  blobs/                              <- UNIFIED content-addressed storage; immutable; any content type
    .refcounts.json                   <- cached SHA -> ref-count index for GC; rebuildable from manifest walk
    ab/                               <- two-char fanout by SHA prefix (256 buckets)
      abcdef0123...bin                <- the blob bytes
      abcdef0123...meta.json          <- per-blob sidecar (first-seen path, source, role-history, content-type-hint)
    cd/
      cdef4567...bin
      cdef4567...meta.json
    ...

  profiles/                           <- per-profile state
    <profile-name-or-uuid>/
      manifest.json                   <- source of truth for profile contents
      manifest-history/               <- prior manifest versions (per-config retention + snapshot retention)
        <timestamp>-<sha>.json
        ...
      private.json                    <- user-private (in-tree, unmanaged) file paths to respect on rematerialization
      tree/                           <- MATERIALIZED dir; engine launches against this
        id1/
          pak0.pak                    <- hardlink to ../../../../blobs/ab/<sha>.bin
          ...
        qw/
          config.cfg                  <- hardlink
          ...
        ezquake.exe                   <- hardlink to a binary blob in unified blobs/
        ...

  library/                            <- bucket 7 (user-library) -- shared base content kept across profiles (Pass 3.3)
    manifest.json                     <- structurally same schema as profile manifest; library-prefixed roles
    manifest-history/                 <- versioning identical to profiles
      <timestamp>-<sha>.json
      ...
    (no tree subdir -- library entries materialize INTO each active profile's tree per declared_gamedirs)

  binaries/                           <- Phase 3.5b binary METADATA (blobs themselves live in unified blobs/)
    <client>/                         <- e.g. ezquake/, fteqw/
      <version>/                      <- e.g. 3.6.9/
        manifest.json                 <- references binary blob by SHA into unified blobs/
        variants/
          <variant>/
            manifest.json
    index.json                        <- active version per (client, variant)

  assets/                             <- asset metadata + indexes (blobs themselves live in unified blobs/)
    by-category/                      <- optional: indexed views of warehoused assets (UI helper, derived)
      textures/
      sounds/
      configs/
      ...
    catalog-cache/                    <- cached metadata from cloud catalog (Arc H)

  overrides/                          <- user-supplied local overrides for self-knowledge tables (Pass 3.5)
    <table-name>.json                 <- e.g. asset-roles.json, mod-fingerprints.json -- prefer over bundled/catalog when present

  user-content/                       <- profile-orthogonal content (NOT warehoused, NOT in any manifest)
    demos/
      server-downloaded/
        <server-host>/<date>/
          <filename>.mvd
      recorded/
        <profile-id>/<date>/
          <filename>.mvd
    screenshots/
      <profile-id>/<date>/
        <filename>.png
    logs/
      <profile-id>/
        <log-files>

  mod-cache/                          <- quarantined per-mod content (TF, CTF, etc.) -- INBOX for passive server downloads (Pass 3.3)
    tf/
      qw/
        progs/tfprogs.dat
        maps/...
        sounds/...
    ctf/
      ...

  release-cache/                      <- Phase 3.5b shipped: GitHub Releases per-channel
    <client>-<channel>.json

  orphaned-profiles/                  <- deleted profiles' manifests, recoverable for 30 days (Pass 3.2)
    <profile-id>/<timestamp>/
      manifest.json
      manifest-history/
      private.json

  orphaned-private/                   <- profile-private files moved aside on profile delete; 30-day recovery (Pass 3.2)
    <profile-id>/<timestamp>/
      <relative-path>/<filename>

  trash/                              <- deferred-deletion buffer for safety
    blobs/<sha[:2]>/<sha>.bin         <- entries pending GC sweep (default 30-day retention)
```

### Unified blob store (Pass 1 ratified)

The blob store is unified across content types. The original draft proposed split `binaries/blobs/` + `assets/blobs/`; Pass 1 collapses this into a single `<data-root>/blobs/` containing all content-addressed bytes regardless of intended use. A binary IS just bytes; an asset IS just bytes; splitting by intended use was the wrong abstraction.

Phase 3.5b's existing `binaries/blobs/<sha>.exe` data migrates to the unified layout via a one-shot conversion script on first launch of the new schema. Domain-specific metadata (per-client version manifests, per-variant manifests, `binaries/index.json`) remains in `<data-root>/binaries/<client>/<version>/...` and references blobs by SHA into the unified store. Same for `<data-root>/assets/` which holds metadata indexes and catalog cache but no longer a blob store of its own.

### Layout decisions ratified in Pass 1

**Two-char fanout.** Blobs are nested under a two-character SHA-prefix directory (`<data-root>/blobs/<sha[:2]>/<sha>.bin`). 256 evenly-distributed buckets (SHA hex distribution is uniform). Handles realistic blob counts (6K-50K typical, 100K+ outlier) without filesystem performance degradation. Standard pattern (Git, Nix, OSTree, IPFS).

**Per-blob sidecar metadata.** Each blob carries a sibling `<sha>.meta.json` in the same fanout bucket. Sidecar records first-seen path, source (migration / cloud-import / user-drop / engine-write), role-history (which manifests have referenced it under what role), content-type-hint, timestamps. Recovery story: blob + sidecar are co-located; `cp -r blobs/` captures both; partial corruption affects one blob's metadata only; editable in any text editor for emergency recovery.

**Refcount index.** `<data-root>/blobs/.refcounts.json` caches `{sha -> ref-count}` updated on every manifest add/remove. GC consults the index instead of walking all manifests on every sweep. Rebuildable from a full manifest walk if corrupted.

### Process model (Pass 1 ratified)

Single slipgate process invariant. Two layers protect this:

- **Tauri single-instance plugin** (`tauri-plugin-single-instance`, v2). OS-level: second-launch signals the first to focus its window and exits. Catches the common case.
- **Data-root lockfile** at `<data-root>/.lock` holding PID + hostname + timestamp. Catches anything escaping the OS-level layer (IDE-launched dev binary alongside production install, manual binary execution, weird shortcut configurations). Stale-lock detection: file age + PID liveness on same hostname; force-unlock prompt if stale.

Within the slipgate process, a single global async mutex (`tokio::sync::Mutex`) serializes warehouse + manifest writes. Reads are concurrent. The volume of contended operations is modest; per-resource locks are not justified for V1. Refinement happens later if profiling shows contention.

Multi-process upgrade path: if V1+ ever adds a background watcher service, the lockfile relaxes to per-resource atomic-rename + compare-and-swap on a manifest version token. The current design is forward-compatible.

### Implementation note (Pass 1 ratified)

Phase 3.5b's `version_warehouse.rs` (~1500 lines, 142 Rust tests) refactors into a generic `content_warehouse.rs` consuming the unified blob store. The binary domain keeps its API (`register_version_at`, `swap_active_version`) as a thin wrapper. The asset domain gets a parallel thin wrapper (`asset_warehouse.rs`) on top of the same generic warehouse. One-shot data migration script handles the existing `binaries/blobs/<sha>.exe` -> `<data-root>/blobs/<sha[:2]>/<sha>.bin` conversion at first launch.

---

## Content taxonomy

Every file slipgate encounters falls into exactly one of seven buckets. The taxonomy is the foundation of the migration classifier (clean-room extraction) and the runtime watcher classifier -- they share the same dispatch logic. Buckets 1-5 are the original Pass 0 set; bucket 6 (user-private) was added in the Pass 1 anchor and ratified in Pass 3.2; bucket 7 (user-library) was surfaced in Pass 2 and ratified in Pass 3.3.

**Files without a recognized role are tree-resident but absent from all manifests.** They surface in MyQuake -> Browse under an "other" view for investigation but have no publish-time UX. The "other" view is a Layer 1 closure to-do list (the qw-oracle "other"-bucket walk-through tracked as L1-alpha / -beta / -gamma / -delta), NOT a content category. As Layer 1 grows, "other" shrinks toward zero.

### Bucket 1: Stock baseline

Files that constitute the irreducible "I have a working Quake" minimum:

- `id1/pak0.pak` -- original Quake content (shareware or registered)
- `id1/pak1.pak` -- registered-version content
- (Optionally `qw/pak0.pak` if the user's install includes it; modern engines don't strictly require it)

**Properties:**
- Bytes are id Software's copyrighted content.
- SHAs are well-known: catalog ships a known-good list of legitimate stock pak hashes (vanilla 1996 registered, Steam re-release, GoG release, nQuake bundled distribution, etc.).
- Catalog NEVER serves these blobs. Verification only: slipgate confirms user has bytes matching a known-good SHA.
- Warehoused locally; hardlinked into every profile tree (every profile depends on these).

### Bucket 2: User assets

Content the user has accumulated as part of their setup. This is the bulk of "what defines a profile."

Subcategories (the `role` field on manifest entries):
- `user-asset:config` -- config.cfg, autoexec.cfg, exec'd subconfigs (scripts, weapon configs, hud configs)
- `user-asset:texture` -- flat-file textures replacing default WAD textures (`qw/textures/wads/...`, `qw/textures/cs/...`, etc.)
- `user-asset:sound` -- replacement weapon sounds, ambient overrides, custom announcer sounds
- `user-asset:hud` -- custom HUD images, scoreboard banners, frag overlays
- `user-asset:skin` -- player skin replacements, team colors
- `user-asset:skybox` -- sky replacement sets
- `user-asset:script` -- custom .cfg files for binds/aliases (often exec'd by the active config chain)
- `user-asset:map` -- custom maps the user wants kept (vs server-cached maps from random pickup servers)
- `user-asset:conchars` -- custom font / charset replacements
- `user-asset:lit` -- map lighting files

**Properties:**
- Cloud-distributable freely.
- Submitted to catalog by users; catalog dedupes and moderates.
- Warehoused; hardlinked into profile trees that reference them.
- Editable: edits go through the watcher, register-as-new-version flow.

### Bucket 3: User-generated owned content

Content the user produced themselves that they want to keep but isn't part of "their setup":

- Recorded demos (`qw/demos/<filename>.mvd`)
- Screenshots (`qw/screenshots/<filename>.png`)
- Local config backups they made manually
- Personal logs (frag log, console log)

**Properties:**
- Profile-orthogonal: surviving across profile switches without being part of a profile manifest.
- Stored under `<data-root>/user-content/` rather than in profile trees.
- Demos auto-routed by source (recorded vs server-downloaded) and by profile context.
- Engine cvars (`demo_dir`, `sshot_dir`, `log_dir`) are rewritten during migration to point here.
- Backed up separately from profiles; user choice whether to include in cloud sync.

### Bucket 4: Cache ephemera (the inbox)

Content that arrived in the user's filesystem because of a server interaction but isn't intentionally part of their setup:

- Server-auto-downloaded maps from public servers (`qw/maps/<servermap>.bsp`)
- Server-pushed sound replacements
- Server-pushed model overrides
- Mod content from joining a TF/CTF/Painkeep server (`qw/progs/tfprogs.dat` and supporting files)

**Properties:**
- **Inbox role (Pass 3.3):** bucket 4 is the *inbox* for content arriving passively from the engine's auto-download. Bucket 7 (user-library) is the *kept* state for content the user explicitly wants persistent across profiles. Promotion moves entries from bucket 4 to bucket 7; demotion moves them back.
- Quarantined in `<data-root>/mod-cache/` rather than profile manifests.
- Mod-fingerprint-classified: known mods (TF, CTF, KTPro, Painkeep, etc.) get bucket-specific paths; unknown content goes to `mod-cache/unclassified/`.
- Hardlinked back into the active profile's tree for engine access during the session.
- NOT in any manifest. Transient by intent.
- User-promotable to bucket 7 (`library:map`, `library:loc`, `library:mod-content`) for "keep this across profiles," or to `user-asset:*` for "keep in this profile only" -- promotion is the user gesture that crosses the inbox-vs-kept boundary.
- Auto-cleanable after idle threshold ("you haven't visited a TF server in 90 days, remove TF mod cache?").

### Bucket 5: Engine runtime state

Files the engine itself writes during normal operation that aren't user-edits:

- ezQuake's `cl_demoname` history
- HUD position state files
- Engine bookmark files
- Crash dumps, `.stackdump` files
- Engine's own log files (separate from user-bound `log_dir`)

**Properties:**
- **Allowlisted** in the watcher policy: changes to these files do NOT trigger register-as-new-version.
- Live in the materialized tree because the engine expects them there.
- Not part of the manifest; not warehoused.
- Per-engine allowlist (different engines write different runtime files).
- Engine-runtime files are profile-private (state for THIS profile's session) -- when materialization rebuilds the tree, engine-runtime files are preserved if present, otherwise the engine recreates them on next launch.

### Bucket 6: User-private (Pass 3.2 ratified)

Files in the materialized tree that the user has marked "respect, don't touch." Personal notes, half-finished experiments, working scratch files, anything the user wants on disk but does not want slipgate to warehouse, manifest, export, or sync.

**Single flavor:** user-marked private. Auto-uncertain framing (Pass 1 anchor) was dropped in Pass 3.2 -- files without recognized roles are tree-resident but absent from all manifests; they surface in Browse under "other" for investigation, with no publish-time UX. That is the Layer 1 closure to-do list described above, NOT a separate flavor of bucket 6.

**Storage:** `<data-root>/profiles/<id>/private.json`, profile-scoped.

**Schema:** `{ "schema_version": 1, "paths": [...] }` where each entry is a profile-tree-relative path. Forward slashes only; lowercase comparison; same path rules as manifest entries (Windows-illegal characters rejected at write, ~200 char limit).

**No glob support in V1.** Explicit paths only. Marking a folder expands to the file set at mark-time; new files added inside that folder later don't auto-inherit privacy. Glob is V1+ refinement if real use cases push for it.

**User gesture:** right-click in MyQuake -> Browse -> "Mark as private" / "Unmark private." Bulk gesture for folder-shaped intent (multi-select then right-click). Action toggles `private.json` membership; tree files untouched physically; only metadata changes.

**Properties:**
- Preserved across rematerialization (atomic-swap pre-step copies `private.json` paths from live tree into temp tree before atomic rename; cost trivially small).
- Profile fork: new profile's `private.json` is empty by default. Privates NOT carried into fork. Clone modal exposes a default-OFF privates section if user wants to opt in.
- Profile delete: prompts to move privates to `<data-root>/orphaned-private/<profile-id>/<timestamp>/` for 30-day recovery (default), or delete.
- Collision with a manifest entry's `target_path` is rejected with structured error -- "This file is part of your profile (role: <X>). Remove from profile first, then mark private." Mark-and-be-in-manifest is incoherent.
- Watcher Case 5: untracked + path in `private.json` -> IGNORE (don't classify, don't prompt, don't warehouse, don't promote).

### Bucket 7: User-library (Pass 3.3 ratified)

Shared base content the user explicitly wants persistent across profiles. The kept counterpart to bucket 4's inbox.

**V1 in-scope:**
- Maps (`.bsp` + `.lit` + `.ent`)
- Locs (`.loc`)
- Mod gamedirs (CTF, TF, Painkeep, hipnotic, rogue -- full gamedir contents including `progs.dat`, `maps/*.bsp`, `sound/**`, `skins/**`, etc.)

**Library role families:**
- `library:map`
- `library:loc`
- `library:mod-content`

**Deferred to V1+** (probably belongs eventually, not load-bearing now): music tracks, demo archive, downloaded sound packs (gray area, mostly profile-bound).

**Out-of-scope** (stay in existing buckets): configs, textures, HUD images, player skins, crosshairs (always profile-bound); demos / screenshots / logs (already in bucket 3); mod-cache content (already in bucket 4 -- the inbox to library's kept).

**Storage:** `<data-root>/library/manifest.json` + `manifest-history/`. Library content addressed via the same unified `<data-root>/blobs/` store, same SHA-keying. Library has NO tree subdir of its own -- entries materialize INTO each active profile's tree per profile's `declared_gamedirs`.

**Library manifest schema** is identical to profile manifest with two differences:
- **No `declared_gamedirs` field** (library uses target paths that imply their gamedir; `qw/maps/dm3.bsp` lands in qw/, period).
- **Roles are library-prefixed** (`library:map`, `library:loc`, `library:mod-content`) rather than `user-asset:*`.

**Materialization rule:** library entries materialize into a profile's tree iff `target_path`'s first segment is `id1` OR is a member of the profile's `declared_gamedirs`. Tournament-clean profile with `declared_gamedirs: ["qw"]` materializes library's qw/* but not ctf/* / tf/* / etc.

**Profile-overrides-library precedence** (Pass 3.3): if a profile manifest has its own entry at the same `target_path` as a library entry, the profile entry wins for that profile; library version is shadowed. Concrete example: a "review casts as clan-B" profile manifest carrying `qw/locs/dm3.loc` at SHA Y wins over library's SHA X for that profile. This handles per-profile loc variation cleanly without library schema gymnastics.

**Promotion gesture (bucket 4 -> bucket 7):**
- Single map / loc: "Keep this <map|loc> across all profiles."
- Whole mod gamedir: "Keep CTF in my library." Bulk promotion across all blobs in the `ctf/` subtree of mod-cache, recorded as library entries with `library:mod-content` role.
- Promotion prompt offers `declared_gamedirs` extension: "Add 'ctf' to active profile's `declared_gamedirs`?" so workflow ends with the user actually able to play CTF in the active profile.
- Demotion: library entry -> "Move back to mod-cache" if the user decides not to keep.

**Manifest publishing rule for library content (Pass 3.3):**
- Library content is profile-orthogonal. It does NOT travel with profile manifests. Sharing your profile shares your profile's manifest only.
- Library has its own publish/share path (Arc H -- "share my map collection," "import this curated loc set"), catalog-distributed-as-asset-bundle, NOT bundled-into-profile-manifests.
- Recipients pull profile content; materialize against their OWN library. If library content matches at SHA, materialization works identically; if not, missing maps fall back to engine's auto-download behavior, which fills the gap server-side as normal.

**Hub-side analytics as a byproduct:** "how many users have the same loc set, how many variants exist for `dm3`" fall out for free from SHA frequency aggregates on opt-in sync. Zero extra architecture.

### Classifier outputs

The classifier (used by both migration extraction and runtime watcher) takes a path + bytes and returns:

```typescript
type ClassifierOutput =
  | { bucket: "stock-baseline"; verified: true | false; known_good_source?: string }
  | { bucket: "user-asset"; subcategory: AssetSubcategory; confidence: "definite" | "probable" }
  | { bucket: "user-content"; subcategory: "demo" | "screenshot" | "log" }
  | { bucket: "cache-ephemera"; mod?: ModFingerprint; quarantine_path: string }
  | { bucket: "engine-runtime"; engine: EngineKind; rule: string }
  | { bucket: "user-library"; subcategory: "map" | "loc" | "mod-content"; confidence: "definite" | "probable" }
  | { bucket: "unclassified"; suggested_action: "prompt-user" }
```

(Bucket 6 user-private is NOT a classifier output -- it's a user gesture against `private.json`. The classifier never produces `user-private`; that bucket is reached via the right-click "Mark as private" gesture in MyQuake -> Browse, and the watcher consults `private.json` directly per Case 5.)

The classifier consumes:
- **Asset bundle data** from Phase 2d-bundle: per-engine `path_rules`, `cvar_bindings`, `loader_sites`, `asset_categories`. ezQuake side shipped; FTE side wiring is a HANDOVER follow-up that becomes load-bearing for this arc.
- **Mod fingerprint registry**: community-curated catalog of "files matching THESE patterns belong to mod X." Lives in qw-oracle Layer 3 or assets.quake.world; consumed by slipgate.
- **Active config chain analysis**: for migration only. Walks the user's cfg chain, identifies cvar references and bind/alias load triggers, marks which assets are "actively loaded" vs orphaned.

---

## Primitive operations

A small set of operations is sufficient to build every Managed-mode feature. Each is a well-defined Rust function. Pass 3 added `make_primary`, `delete_profile`, and the clone-modal-as-selector primitive on top of the original six (Pass 0: register / materialize / swap_active_profile / launch_profile / export / fork / merge).

### `register(bytes) -> sha256` (Pass 0; Pass 3.4 extended)

Hash bytes, write to `blobs/<sha[:2]>/<sha>.bin` if not already present, write/update sidecar `<sha>.meta.json`, increment refcount index, return the SHA. Idempotent: registering the same bytes twice returns the same SHA without rewriting the blob.

**Stage-2 inode-share via `link()` (Pass 3.4):** when Stage 2 of the capture/swap pipeline (see Filesystem watcher contract) processes a tree-resident file the user opted to keep, `register` does NOT copy bytes from the tree into the warehouse. Instead, the warehouse blob shares an inode with the tree file:

- `link(tree_path, blob_path)` -- creates `blob_path` as another name for the inode the tree path already references.
- After: tree path and blob path share a single inode + single set of bytes on disk.
- Same volume guaranteed by structure (active tree + blobs both under `<data-root>`).
- Cost: one directory-entry addition per kept file. Effectively zero disk write.

Implementation may use `link()` directly OR `rename + link-back` (same end state). Cross-platform decision (Windows / Linux / macOS hardlink semantics) deferred to Arc A/B implementation work.

For bytes arriving from outside the tree (catalog download, drag-drop import, migration extraction), `register` falls back to the classic write-to-`blobs/`-then-link-into-tree path. Two arrival paths, same primitive.

**Capture/swap two-stage pattern (Pass 3.4):** `register` is the lower-level primitive Stage 2 calls into. Stage 1 (the watcher) never calls `register`; it only writes to `.pending-swap.json`. The split keeps the warehouse mutation surface concentrated at safe-moment processing -- the engine can never be mid-write when `register` runs.

### `materialize(manifest, target_dir, mode) -> Result<()>`

For each manifest entry, ensure a hardlink (or copy, depending on mode) exists at `target_dir/<entry.target_path>` pointing at `blobs/<entry.sha[:2]>/<entry.sha>.bin`. Idempotent. Removes orphan tree hardlinks (entries present in tree but not in current manifest) -- this is the tree-consistency enforcement point.

Modes (Pass 1 ratified, simplified from earlier draft):
- `hardlink`: active-tree materialization. Single-volume by construction under slipgate-IS-quakedir, so hardlinks always work for normal operation. Install-time precondition rejects data roots on non-hardlink-capable filesystems (FAT32, exFAT, some network mounts) rather than silent fallback.
- `copy`: lossless export. Survives slipgate uninstall. Used by the export primitive.

**Atomic swap (Pass 2.4.a):** materialization builds the new tree at a sibling temp path (`tree.materializing/`) and atomic-renames into `tree/` only when complete. If interrupted mid-materialization (crash, power loss, kill), the active `tree/` is untouched. Disk cost of the temp tree is approximately zero -- both trees are hardlinks to the same blobs (just inode pointers, not data).

**Private-file preservation pre-swap (Pass 3.2):** before the atomic rename, the materializer copies every path listed in the active profile's `private.json` from the live `tree/` into the temp `tree.materializing/`. Cost is small (typically a handful of files, trivially fast). After the atomic rename, private files are still at their original paths in the new tree. Without this pre-swap step, atomic-rename would lose private files because they're absent from every manifest the materializer consults.

**Trust-existing-tree fast path (Pass 2.4.b):** when re-materializing a profile whose tree already exists, materialization checks each entry's hash against the existing tree file and skips files that already match. Stable profiles re-materialize as a no-op fast path (sub-100ms typical). Rebuild only what's actually different. The watcher already maintains tree-vs-manifest consistency at runtime, so the fast path is the common case.

**Watcher self-skip (Pass 2.4.c):** materialization does NOT explicitly suspend the filesystem watcher. The watcher's hash-comparison check naturally skips slipgate's own writes -- the hardlinks materialization creates have hashes matching the manifest's expected hashes, so the watcher sees "tracked SHA at expected path, no real change" and ignores them. Mathematically self-consistent; no synchronization required. Explicit suspension is held in reserve as a fallback if a corner case ever forces it.

**Concurrency model (Pass 2.4.d):** materialization takes the same global async mutex as warehouse + manifest writes. Materialization is fast (sub-second on typical profiles), so brief blocking is acceptable. The mutex serves primarily as a backstop for paths that bypass the UI (e.g., watcher-triggered registers during materialize). The primary serializer is the UI busy-state pattern (next).

**UI busy-state (Pass 2.4.e):** long-running operations (`materialize`, `import`, `fork-with-merge`, migration extraction) put slipgate into a UI-level **busy state**. While busy:
- Profile-level operation buttons disabled (switch, fork, delete, import, export, launch)
- Read-only views remain available (browse profile contents, view configs, see status)
- Progress UX scales by operation duration:
  - Sub-100ms ops: no UI feedback (feels instant)
  - 100ms-2s ops: subtle inline spinner with disabled buttons
  - Multi-second ops (heavy texture imports, first migration, downloading missing blobs): full progress UI (progress bar, current-file indicator, optional stage checklist, cancel button where safe)

This collapses the concurrency surface: simultaneous operations are prevented at the UI layer, the data-layer mutex is defense-in-depth. The pattern matches Phase 3.5's `swap_active_version` flow (active-process check before swap rather than handling conflicts at the data layer).

Operations that happen below the UI (watcher-triggered registers, GC sweep) still go through the mutex; the busy-state only governs user-initiated ops.

### `swap_active_profile(target_profile_id) -> Result<()>`

Update the `active_profile_id` field in `<data-root>/profile-roles.json` to point at the target (UI-focus sense). Re-point any active-profile-bound shortcuts. Optionally re-materialize the target's tree if it's been GC'd or never materialized. Does NOT close any running engine instance -- engine instances are independent of UI active-profile (see Primary, active, and launched profiles).

### `launch_profile(profile_id, mode) -> Result<EngineHandle>`

Launch an engine instance against a profile's materialized tree.

Modes:
- `swap-active`: Class 3 swap. If an engine is currently running against any profile, prompt user; on confirm, close that instance, switch active to target, launch target.
- `new-instance`: launch a parallel engine bound to target's tree without affecting other launched instances (uses ezQuake's native multi-instance support).

The class taxonomy (Class 1 cfg-only / Class 2 vid_restart / Class 3 engine-restart) governs whether a profile-merge or asset-swap operation can avoid `launch_profile` entirely (Class 1 uses mailslot-driven runtime cfg push; details in Engine integration).

### `export(blob_refs, target, format) -> Result<()>`

Generalized from the original draft's profile-only export. Exports an arbitrary set of `(sha, target_path, role?)` tuples to a target location in a chosen format.

- `blob_refs`: drawn from a manifest, OR composed ad-hoc, OR filtered by selector
- `target`: filesystem destination (directory for tree formats, file path for archive formats)
- `format` (Pass 1 ratified, format-extensible):
  - `raw_tree`: directory tree using `materialize(mode=copy)`. The lossless-export pledge specifically ships as this format. Required for V1.
  - `pk3` / `zip`: archive packagers consuming the same blob_refs. Small additive code; community-standard sharing format. Likely in V1+ as a follow-up to Arc F.
  - `pak`: Quake's binary pak format. Custom writer; later if requested.
  - `tar.gz` and similar: trivial siblings of pk3.

Profile export is the specialization `export(manifest_entries(profile), target, format=raw_tree)`. "Share these textures as a pk3" is the same primitive with a filtered blob_refs and a pk3 packager.

### `fork(parent_profile_id, modifications) -> new_profile_id` (Pass 0; Pass 3.2 extended)

Create a new profile whose manifest is the parent's plus a list of modifications:
- `add: [{sha, target_path, role}]` -- new entries
- `remove: [target_path]` -- entries to omit
- `replace: {target_path: new_sha}` -- swap blob references
- `include_privates: boolean` (default false; Pass 3.2) -- opt-in inclusion of source profile's `private.json` paths into the new profile. Default false. Clone modal exposes this as a default-OFF section (see Clone modal as V1 selector primitive below). Privates are physically copied (not hardlinked from manifest) since they're outside the warehouse layer.

The fork operation is purely manifest manipulation; no blobs are copied. Disk cost approximately equals the size of new manifest entries (plus the small set of privates if `include_privates` is true). Genealogy: new profile records `forked_from_profile_id = parent_profile_id` + `parent_manifest_sha = <SHA of parent manifest at fork time>`.

### `merge(into_profile_id, from_profile_id, selector) -> Result<()>`

Apply a subset of `from_profile_id`'s manifest entries to `into_profile_id`'s manifest. Selector is the typed manifest-entry set produced by the clone modal (see below). The "try Milton's visuals only" use case is `merge(into=mine, from=milton, selector=<modal-output filtered to texture + hud roles>)`.

### `make_primary(profile_id) -> Result<()>` (Pass 3.2)

Update the `primary_profile_id` field in `<data-root>/profile-roles.json` to point at the target. Surfaced via a "Make this primary" UI action with confirmation. Idempotent.

What primary changes:
- Default fork target ("Fork from primary" is the one-click for sandbox clones).
- Default launch fallback when active is unset.
- UI mental-model anchor.

What primary does NOT change:
- GC logic (refcount-driven, not primary-driven).
- Asset retention (manifest-reference-driven).
- Profile delete safety (any-other-reference-exists is the GC question; primary just adds an additional UI guard against accidental delete).

### `delete_profile(profile_id) -> Result<()>` (Pass 3.2)

Remove a profile from the data root. Always prompts before destructive action.

For non-primary profiles:

```
Delete profile "<name>"?

  - Manifest will be archived to orphaned-profiles/ (recoverable for 30 days).
  - N assets are referenced ONLY by this profile and will become eligible for GC.
    [Show list] [Import any to primary first]
  - M private files in this profile's tree will move to orphaned-private/ (recoverable for 30 days).
  - Tree will be removed.

  [Cancel]  [Delete]
```

The "N assets referenced only by this profile" line is a refcount query: blobs whose refcount drops to zero after the delete. Refcount captures "not in primary OR any clone OR any other profile" automatically; primary doesn't enter GC logic specially.

For primary profile delete:
- "Primary cannot be deleted while other profiles exist. Choose a new primary first, then retry."
- OR if it is the last profile: "This is your last profile. Deleting it leaves slipgate empty. [Confirm complete reset]."

Archived state retains 30-day recovery in parallel for orphaned profiles + orphaned privates. Recovery is a separate primitive (V1+).

### Clone modal as V1 selector primitive (Pass 3.2 + 3.4 ratified)

The clone modal is the V1 selector primitive -- the user-facing grammar for "subset of a manifest." No declarative DSL, no predicate language. **The UI is the grammar.**

V1 modal shape:

```
Clone profile "<source-name>" -> new profile

  Profile name: [______________]
  Genealogy:    forked_from_profile_id = <source-id>

  Stock baseline           (3 entries, ~50 MB)   [+ all]
  Configs                  (12 entries, ~80 KB)  [+ all]
        + qw/config.cfg
        + qw/autoexec.cfg
        ...
  Textures                 (847 entries, ~120 MB) [+ all]
  Sounds                   (203 entries, ~45 MB)  [+ all]
  HUD                      (28 entries, ~12 MB)   [+ all]
  Player skins             (12 entries, ~8 MB)    [+ all]
  Maps                     (38 entries, ~280 MB)  [+ all]
  Private files            (4 files, ~22 KB)      [- none]
        - qw/notes/strats.txt
        - qw/notes/todo.md
        ...

  Total selected: 1143 entries, ~515 MB           [Cancel]  [Clone]
```

**Defaults:** all role sections checked, privates section unchecked. Toggle granularity: whole role sections, individual entries, top-level select-all / deselect-all. The total-selected line updates live.

**Five consumers (one UI primitive):**

1. **Clone / fork** (profile genealogy) -- the named call site above. Output drives `fork(parent, modifications)`.
2. **Pre-publish review** (manifest sharing) -- operates on the manifest-eligible set; no privates section because privates structurally never reach the manifest layer.
3. **Selective import from another profile** (Arc C-full) -- "Try Milton's visuals only" is the same modal driving `merge(into=mine, from=milton, selector=<modal-output>)`.
4. **Pre-extraction overview** (Arc D migration) -- "I'll extract these N assets, skip these M" is the same modal driving the migration's extract step.
5. **Export for backup** (Arc F lossless export) -- defaults: stock + profile content + library ON; user-content + private OFF.

One UI primitive, five consumers. Subset selection grammar fully resolved. The selector input is a manifest-entry set; consumers vary in how they spend the selected set (clone target, merge target, extract target, archive target).

---

## Filesystem watcher contract

The watcher is the runtime mediator between user/engine actions on the materialized tree and the warehouse-as-source-of-truth model. **Foreground-only for V1** (Pass 1 confirmed; slipgate must be open). Pass 4 may revisit background-service shape if real demand emerges; the data model is forward-compatible.

Pass 3.4 reframed the watcher as a **two-stage capture/swap pipeline** rather than a register-on-event flow. Stage 1 (observe) is the watcher itself, immediate and free and safe during an engine session. Stage 2 (process) runs at safe moments under user control. The separation eliminates the "engine still writing" failure class by structure.

### Five-case dispatch (Pass 3.4 ratified, supersedes Pass 0 four-case)

For every filesystem event in the active profile's tree:

```
event: file changed / appeared / deleted

Case 1: tracked + change matches engine-runtime allowlist
  -> IGNORE (engine wrote its own state file)

Case 2: tracked + change is real edit (user or external)
  -> record (path, size, mtime) in .pending-swap.json
     (manifest update queued for Stage 2, not applied yet)

Case 3: untracked + new file appeared
  -> record in .pending-swap.json with tentative classifier result
     for Stage 2 routing

Case 4: tracked + file deleted
  -> surface at next cleanup notification:
     "Tracked file <path> was deleted. Restore from warehouse, or remove from manifest?"

Case 5 (Pass 3.2): untracked + path in private.json
  -> IGNORE (don't classify, don't prompt, don't warehouse, don't promote)
```

Detection mechanism:
- File watcher (`notify-debouncer-mini`, already used by slipgate's config watcher) provides change events.
- Slipgate compares observed mtime/hash against manifest's expected hash for that target_path; mismatch triggers dispatch.
- Cases 2 + 3 record into `.pending-swap.json` only; **no read of bytes, no hashing, no warehouse mutation, no filesystem mutation**. The watcher is a notebook of paths needing later attention.
- Case 5 short-circuits before any classifier work.

### Capture/swap pipeline (Pass 3.4 ratified)

**Stage 1 -- observe (immediate, free, safe during engine session):**
Watcher appends `(path, size, mtime, tentative-classifier-result)` to `<data-root>/.pending-swap.json`. NO read of bytes, NO hashing, NO warehouse or filesystem mutation. Just a notebook.

**Stage 2 -- process at safe moment, gated on user decision.** Three triggers fire Stage 2:
- **Engine-exit (auto):** when slipgate sees the launched engine instance terminate, surface the cleanup notification.
- **User-invoked (manual):** "Cleanup" button in MyQuake or the app chrome.
- **Idle-nudge (periodic):** unobtrusive notification when `.pending-swap.json` has accumulated entries and the user has been idle for N minutes. Frequency configurable via Settings.

For each pending entry the user opts to keep, Stage 2 performs:
1. Stable-mtime check (file hasn't been written for N seconds, default 5s; tuneable).
2. Hash -> SHA.
3. Integrity check (warn if fails for known file types; allow user override).
4. `link(tree_path, blob_path)` to share inode between tree and warehouse (see `register` in Primitive operations for the inode-share semantics).
5. Update sidecar metadata.
6. Update refcount index.
7. Add manifest entry (library manifest, profile manifest, or `private.json`) per the user-chosen action for that entry.

**Discard route:** `unlink(tree_path)`, never warehoused.

**"Keep without warehousing" route:** leave tree file alone, drop from `.pending-swap.json` (escape hatch for users who want bytes in tree without going through warehouse; costs more disk but is a valid choice).

### Defenses against partial-file capture (Pass 3.4 ratified)

- **Defense 1 -- never process during engine session.** Watcher only OBSERVES; processing only at safe moments. Eliminates whole class of "engine still writing" problems by structure.
- **Defense 2 -- stable-mtime check before hashing.** At safe-moment processing, confirm mtime + size haven't changed in N seconds (default 5s). If still moving, skip this round and re-check on next cleanup pass.
- **Defense 3 -- integrity check per file type.** Layer 1 grows a per-extension integrity-check table (declarative rules: magic bytes + offset/size sanity checks). Run after hashing. Failed integrity = `incomplete` flag in cleanup notification; user can override.
  - `.bsp`: magic bytes + entity-lump pointer offsets within file bounds.
  - `.wav`: RIFF header + chunk sizes <= file size.
  - `.pak`: header entry count + offsets within bounds.
  - `.tga`, `.png`, etc.: minimal header sanity.
- **Defense 4 -- mod-fingerprint partial detection.** If the captured set matches a partial-mod fingerprint, surface "looks like partial CTF (47/95 expected files)" with completion options. Auto-completion gated on Arc H.

### Cleanup notification UX (Pass 3.4 ratified)

Unified surface for pending swaps + classifications + promotions. Surfaces from any of the three triggers (engine-exit, user-invoked, idle-nudge).

```
Cleanup pending -- 47 files captured but not yet organized

Maps from server downloads        (28 files, ~12 MB)
   ctf-bigmap.bsp + dependencies   (5 files)
        [Add to library]  [Discard]
   dm6-classic.bsp                 (1 file)
        [Add to library]  [Discard]
Possible partial mod: CTF         (15 files of expected ~95)
   "Looks like a partial CTF download. [Complete download] [Keep partial] [Discard]"
Unrecognized files                (4 files)
   [Mark all as private] [Review individually]

[Apply selected]  [Snooze 1 hour]  [Settings -> frequency]
```

**Per-entry actions:** Add to library / Add to active profile / Promote to mod-cache / Mark as private / Discard / Review individually. **Bulk actions per category.** "Apply selected" runs Stage-2 processing for chosen items.

### Auto-mode opt-in (Pass 3.4 ratified)

**Default OFF.** The cleanup-notification UX is the default flow; the user always sees what slipgate is about to do.

Opt-in setting: **"Auto-classify and stash post-engine-exit."** High-confidence + integrity-pass entries skip user-decision; route to classifier-determined destination automatically (mod-cache for cache-ephemera with known mods, library for `library:*` classifier outputs). Lower-confidence and integrity-fail entries still surface in the cleanup notification regardless.

### Materialization-time silencing

When slipgate is materializing or rematerializing a tree, it would self-trigger watcher events on every hardlink it creates. The watcher's hash-comparison check naturally skips these (Pass 2.4.c) -- slipgate's writes produce files with hashes matching the manifest's expected hashes, so no real edit is detected. Explicit suspension is held in reserve as a fallback if a corner case ever forces it.

### Debouncing (configs)

Editor saves often produce multiple filesystem events (write-temp, rename, mtime tick). For configs, the Stage-1 observe loop coalesces with a ~10-second debounce: if the same target_path changes again within 10s of the previous record, the entry is updated in-place rather than producing a duplicate. Stage 2's manifest write then produces one history version per logical save event. This prevents 50 manifest versions for one save-every-line edit. See Versioning and history -- Two save paths for the full save-path model.

### Promotion flow

Promotion crosses bucket boundaries:
- Bucket 4 (mod-cache inbox) -> Bucket 7 (library kept): "Keep this <map | loc | mod-gamedir> across all profiles." Library promotion records the entry in the library manifest with `library:*` role; the `link(tree_path, blob_path)` step shares the inode with the unified blob store.
- Bucket 4 (mod-cache inbox) -> Bucket 2 (user-asset, in profile manifest): "Keep this in this profile only." Adds to the active profile's manifest with the appropriate `user-asset:*` role.
- Bucket 3 (user-content) and Bucket 5 (engine-runtime) are NOT promotable -- they're structurally outside profile manifests and library by design.

---

## SHA256 governance

### Identity vs semantic equivalence

SHA256 is the primary identity. Two files with the same bytes are the same asset. Two files with semantically-equivalent content but different bytes (e.g., a PNG re-encoded with different metadata) are different assets.

This is a feature, not a bug. It means:
- The architecture never silently treats different-bytes as same-content (no false dedup; no surprises)
- The catalog can grow assets organically without hashing-as-coincidence problems
- Verification is unambiguous (does the user have THIS exact file? yes/no, no fuzzy matching)

### Submission-time normalization

The "polluting the catalog with format variants" concern is addressed at the catalog layer:

1. User submits an asset (e.g., a texture file)
2. Catalog runs format-specific normalization:
   - Images: strip metadata, canonical encoding, hash the canonical form
   - Audio: canonical sample rate / bit depth / encoding for the role
   - Configs: trailing-whitespace normalization, line-ending normalization
3. Catalog stores both: original bytes AND canonical-form SHA
4. Future submissions of "the same" asset in different formats hit the same canonical SHA and dedupe at submission

This is governance at the cloud layer. Slipgate-the-desktop-app sees the stored asset normally -- it has its own SHA in the catalog. Slipgate doesn't re-implement the normalization.

### Perceptual hashing as moderation aid only

Image dHash / pHash and audio fingerprinting are used at the catalog's submission UI to flag potential duplicates for human moderator review. They are NEVER used as identity (a perceptually-identical image with different bytes is still a different SHA, still a different asset).

### Stock pak handling (copyright)

Stock paks are id Software's copyrighted content. Slipgate handles them carefully:

- The catalog ships a known-good list of stock pak SHAs covering: vanilla 1996 Quake registered, Steam re-release, GOG release, nQuake bundled QuakeWorld free distribution, and any other legitimate sources.
- During migration or first-run, slipgate hashes the user's stock paks and verifies against this list.
- If matched: the user's pak is warehoused locally (not uploaded), and the SHA is recognized as a legitimate baseline.
- If not matched: slipgate refuses to proceed and offers the user a path to obtain a legitimate copy (link to Steam/GOG, link to nQuake distribution).
- The catalog NEVER serves stock pak blobs. Period. This is a non-negotiable copyright boundary.

When users share profile manifests, the manifest references stock pak SHAs. The recipient's slipgate verifies they have matching legitimate stock paks locally. If they do, the import proceeds. If they don't, slipgate refuses (same recovery path: obtain stock paks legitimately).

---

## Engine integration

### Launch via `-basedir`

Engines launch with the active profile's tree as their base directory:

```
ezquake.exe -basedir <data-root>/profiles/<active>/tree/
fteqw.exe -basedir <data-root>/profiles/<active>/tree/
```

`-basedir` is supported by ezQuake, FTE, and most QW-derived engines. It tells the engine "use THIS path as the equivalent of `<exe-dir>` for content lookup." All search-path resolution operates relative to `-basedir`.

The exe itself doesn't need to be IN the tree -- it can launch from anywhere as long as `-basedir` points at the right tree. In practice, slipgate hardlinks the binary into the tree so users have a one-folder install they can browse.

### Search-path resolution

Engines treat their data dir as a search-path overlay. ezQuake-shaped resolution:
1. Engine starts with `<basedir>` as root
2. Loads `<basedir>/id1/` first as the baseline gamedir
3. Within id1, walks pak files in load order (pak0, pak1, pak2, ...) and any flat files
4. Then loads `<basedir>/qw/` as the overlay gamedir (search-path higher priority)
5. Within qw, walks paks then flat files
6. Plus any additional gamedirs added via `-game` or `gamedir` cvar

For any logical path like `qw/textures/wads/sky.tga`, the engine looks in qw/ first (paks, then flat files, with flat files overriding paks for the same path), then falls back to id1/ if not found.

The materialization step honors this resolution by placing each warehoused asset at the path the manifest declares, including any pak-vs-flatfile precedence the user's profile expressed.

### Per-engine path rules

Different engines have slightly different conventions:
- ezQuake: standard search path + ezhud directories + ezquake-specific resource paths
- FTE: extended path conventions, plugin directories, shader directories
- KTX: server-side only -- slipgate doesn't materialize for KTX (it's not a client)
- MVDSV: server-side only -- same
- QWFWD: server-side only -- same

The asset bundle classifier work (Phase 2d-bundle) extracted the per-engine path rules from source. Slipgate's materializer consults this data when resolving target_paths and when classifying assets at migration time.

### `declared_gamedirs` gates two distinct things (Pass 3.3 cross-link)

The profile manifest's `declared_gamedirs` field plays two roles:

1. **Profile-manifest validation** (Pass 2.3): every profile-manifest entry's `target_path` first segment must be `id1`, an allowlisted root-level engine file, or a member of `declared_gamedirs`. Entries outside this set are rejected at write time.
2. **Library-materialization gating** (Pass 3.3): library-manifest entries materialize into a profile's tree iff their `target_path` first segment is `id1` OR is a member of the profile's `declared_gamedirs`. A profile with `declared_gamedirs: ["qw"]` materializes library `qw/*` and `id1/*` only -- `ctf/*`, `tf/*`, `painkeep/*`, etc. are gated out for this profile even though those entries exist in the library manifest.

Together, the two roles ensure the engine's per-launch view shows exactly the gamedirs the profile expects, drawn from both the profile manifest and the (gamedir-filtered) library manifest.

### Engine compatibility (Pass 2 dropped the field)

There is no `engine_compatibility` field on the manifest. Per-cvar warnings are computed at runtime from the qw-oracle Layer 1 data plus the user's installed engine version ("cvar X requires ezQuake 3.6.9; you have 3.5.1 -- feature won't work"). Author-declared compatibility is opinion; cvar-derived compatibility is fact, and the data is already in the knowledge service. Engine still ignores unknown cvars at runtime; user can dismiss the warning and play.

---

## Versioning and history

### Living-file vs immutable-artifact (Pass 2.5 ratified principle)

> **Configs are living files; assets are immutable artifacts.** A config (config.cfg, autoexec.cfg, scripts) is meant to be edited continuously -- its history is dense and worth keeping. An asset (texture, sound, HUD image, skin), once registered, is identified by its bytes; "changing" an asset just creates a new asset with a different SHA.

This dichotomy drives retention policy: generous for configs (per-config history budget, every save is a version), thin for assets (snapshots at meaningful events, since assets rarely change in place anyway). It also frames Pass 3's open question on whether configs and assets should share the same role-taxonomy and catalog-metadata model or diverge.

### Implicit version history

Every register-new-blob operation creates a new immutable warehouse blob. Every manifest update produces a new manifest version. Historical manifest versions are retained under `profiles/<id>/manifest-history/<timestamp>-<sha>.json`. The result is git-shaped versioning at zero additional implementation cost beyond the retention itself.

History storage: **full manifest per version** (not deltas). At KB-scale even on the most edit-heavy profile, deltas are premature optimization. Full manifests are hand-editable in emergencies, trivially diffable with regular tools, no reconstruction code path, no cascade-corruption risk if one delta goes bad.

### Two save paths (Pass 2.5.b)

Edits reach the manifest-history layer through two distinct paths:

**External-edit absorbed by watcher.** When the user edits a config in vim, notepad, an external editor, etc., the OS produces multiple filesystem events for one logical save (write-temp, rename, mtime tick). The watcher's 10-second debounce coalesces these into one history version. This is **noise-coalescing, NOT auto-save** -- the watcher waits for the burst to settle and records one version per logical save.

**Internal save button.** When slipgate's own future config editor lands, edits there are user-initiated: one click of "Save" = one history version. No auto-save. No debounce. The user is in explicit control of when state crystallizes.

Both paths produce one history entry per logical save event.

### Retention policy (Pass 2.5.a + 2.5.c + 2.5.d)

**Auto-version retention for configs:** keep last **500 auto-versions per config** by default. At ~5KB per config x 500 = ~2.5MB per config -- negligible. Lazy auto-prune kicks in at the hard ceiling (oldest pruned on add when over limit). Soft UI nudge appears at a lower threshold (~250 versions): unobtrusive "you have 250+ versions of config.cfg from the last 8 months -- review?" with a button. Non-blocking; user can dismiss.

**Auto-snapshot retention for assets:** 10 auto-snapshots per asset, taken at meaningful events (pre-import, pre-migration, pre-bulk-action). Between snapshots, intermediate blobs are GC-eligible (per GC rules). Assets rarely change in place (per the living-file-vs-asset principle), so 10 snapshots is plenty.

**Settings exposure:** one simple knob -- "Keep last [N] config versions" with a "Reset to defaults" button. No per-asset / per-profile sliders. Power users can tune; default users never see the setting. Cognitive-load minimization is a load-bearing UX principle here.

### Checkpoints (Pass 2.5.d)

Slipgate exposes **checkpoints** as the user-facing concept for "anchor this state, never auto-prune." Two flavors:

- **User checkpoints** -- named, with optional note. User-created. Surfaced in the History panel with a ★ icon and the user's note. Filterable: "show me only my checkpoints" cuts through edit noise.
- **Auto checkpoints** -- system-created at meaningful events (pre-migration, pre-bulk-import, pre-major-config-change-via-slipgate). Same exempt-from-prune treatment, distinct icon.

Both flavors are **exempt from auto-prune**. Pruning only touches auto-versions (the routine edit noise). User checkpoints are unlimited; auto checkpoints follow the per-asset 10-snapshot policy unless user-checkpointed.

The Restore action is forward-linear: clicking Restore on a historical version creates a NEW manifest version with the old bytes, rather than truncating forward history. History is preserved; restoration is a new edit that happens to match an earlier state.

### Per-config history UX

ConfigViewer (existing slipgate feature) gains a History panel:
- Sidebar lists timestamped manifest versions where this config's SHA changed
- Each entry shows auto-summary ("3 cvars changed: cl_cmdrate, fov, ...") computed from blob-vs-blob diff
- Checkpoints (user + auto) surface with their icons and notes
- Filter chip: "show only checkpoints" toggles auto-versions on/off
- Click -> side-by-side diff against current
- Restore button -> register the historical blob's bytes as a new manifest version

### Profile genealogy

Every manifest stores `parent_manifest_sha` and optionally `forked_from_profile_id`. This gives:
- "Show me where this profile came from" -> walk the chain back through the originating profile
- "Show me everything I changed since I forked from paradoks-default" -> diff against parent
- "Promote my changes back upstream" -> cherry-pick semantics for advanced users

None of this is user-visible until ARC-C's polish phase, but the data structure supports it from day one.

### Garbage collection (Pass 1 ratified)

**Source of truth: manifests.** GC walks all manifests (current + retained history) and computes the set of SHAs referenced by any manifest entry. Anything in `<data-root>/blobs/` not in that set is unreferenced and eligible for deletion. The materialized tree's hardlinks are NOT a truth source -- the tree is derived state, not authoritative for liveness.

This decision is load-bearing for Arc G (per-config IDE-shaped restore): retained historical manifests reference older blobs that aren't in any current tree. nlink-as-truth would delete those blobs and break Restore-from-history; manifest-as-truth preserves them correctly.

**Refcount index for performance.** Walking all manifests on every sweep is bounded but not free. `<data-root>/blobs/.refcounts.json` caches `{sha -> ref-count}` and updates on every manifest add/remove. GC reads the index, deletes anything with refcount zero. Index is rebuildable from a full manifest walk if it gets corrupted.

**Tree consistency at rematerialization, not GC.** Removing orphan tree hardlinks (entries in a tree but not in its current manifest) happens during `materialize()`, not during GC. `materialize()` is idempotent and removes-and-recreates tree entries to match the manifest. This naturally drops nlink to zero on truly orphaned blobs (no current manifest reference + no other tree reference) and the kernel frees the inode. Blobs still in retained history retain their warehouse name and stay alive.

**GC frequency:** weekly idle sweep + on-demand "Reclaim space" button. Both supported (architecture spec earlier listed this as an open question; Pass 1 confirms both).

**GC safety:**
- Never delete during active materialization (mutex-coordinated)
- Never delete blobs referenced by `mod-cache/` (quarantined, may be promoted to user-asset)
- Never delete recently-created blobs (within last 24h) -- gives the watcher's debouncing window safety margin
- Move-to-`<data-root>/trash/blobs/<sha[:2]>/<sha>.bin` first; permanent delete only after configurable retention (default 30 days)

**Edge case -- manual tree deletion.** If the user manually `rm -rf`'s a profile tree via Explorer/shell, the orphan tree hardlinks vanish but the warehouse blobs stay live (still referenced by manifest). On next slipgate launch, the watcher sees Case 4 (tracked + file deleted) for every entry. UI prompts: "Profile X tree is gone. Restore from manifest, or delete the profile?" Both options are valid; manifest-as-truth is what makes Restore possible.

### Lossless-export pledge protection (Pass 1 ratified)

The lossless-export pledge -- "press one button, walk away with a portable Quake dir, no slipgate needed" -- is the architecture's most load-bearing user-facing promise. Three automated tests pin it.

**Test 1 -- round-trip integrity (CI from Arc A/B onward).**
1. Build a synthetic profile: stock paks + a few user-asset blobs + a config
2. `export(profile, target=tempdir, format=raw_tree)` (copy mode)
3. Hash every file in tempdir; compare against expected hashes
4. Assert: no missing entries, no extras, no wrong hashes

**Test 2 -- zero slipgate residue (CI from Arc A/B onward).**
1. Run export
2. Walk export tree; assert absence of any slipgate-specific files: no `manifest.json`, no `.meta.json` sidecars, no `.lock`, no `.refcounts.json`, no `private.json`, no `slipgate.*`
3. The export is "just files"; nothing slipgate-specific peeks through

**Test 3 -- post-uninstall launch smoke (CI from Arc F onward).**
1. Run export to a temp location
2. Wipe the slipgate data root entirely (simulating uninstall)
3. Launch ezQuake against the export with `-basedir <export-path>`
4. Assert: engine launches, reads its config, reaches main menu (or runs a known headless smoke check)

Test 3 is the pledge in machine-checkable form -- it either works or it doesn't. Tests 1+2 are byte-comparison only and trivially fast (~ms). Test 3 needs an engine binary in CI and ~5s of runtime; gated to release-candidate level once Arc F lands.

These tests run on every PR that touches Arc A, B, F, or anything affecting materialization. Pledge regressions get caught at PR time, not in production.

---

## Migration from external dir

The clean-room extraction (ARC-D) is the on-ramp for users moving from Light to Managed mode. It is ALSO what new users coming from existing Quake installs run on first-launch.

### Algorithm

```
1. User points slipgate at an existing dir D
2. Walk D, collect every file
3. For each file:
   a. Hash it (defer if very large)
   b. Run classifier with full asset-bundle context
   c. Mark with bucket + role
4. Active-config-chain analysis:
   a. Find autoexec.cfg, config.cfg, exec'd subcfgs
   b. Walk the chain, build cvar-set + bind-set + alias-set + trigger-set
   c. For each path-binding cvar that's set: resolve via engine search-path semantics, mark target file as "actively-referenced"
   d. For each bind/alias action: trace transitively, mark targets as "alias-reachable"
   e. For each trigger: mark its target as "trigger-conditional"
5. Pak-vs-flatfile resolution:
   a. For colliding logical paths, run engine's actual resolution to determine which version is active
   b. Mark inactive version as "shadowed"
6. Build pre-extraction overview:
   a. Will-extract list: stock baseline + actively-referenced + alias-reachable user-assets
   b. Conditional: trigger-conditional user-assets (default-include with confidence flag)
   c. User-content: demos, screenshots, logs (extract to user-content/, profile-orthogonal)
   d. Mod-cache: classified mod-fingerprint matches (extract to mod-cache/)
   e. Skip: shadowed assets, orphaned flatfiles not in any active reference, unclassified noise
   f. Rewrite: absolute-path cvars in configs (demo_dir, sshot_dir, log_dir)
7. Show user the pre-extraction overview via the clone-modal-as-selector primitive (Pass 3.2). User reviews, can per-line decline; bulk-toggle role sections.
8. On accept:
   a. For each will-extract: register blob, build manifest entry (profile manifest for user-asset:* roles, library manifest for library:map / library:loc / library:mod-content roles)
   b. For each rewrite: read config, apply cvar substitutions, register modified blob
   c. Materialize the new profile's tree
   d. Move user-content to user-content/, mod-cache to mod-cache/
   e. Verify the materialized tree boots with engine
   f. Set as primary profile (per Pass 3.2: migration's natural landing zone is the user's primary by definition) and active profile
9. Source dir D is UNTOUCHED throughout.
```

### Classifier shared with watcher (Pass 3.4 invariant)

Step 3b's `classify(path, bytes) -> ClassifierOutput` is **the same function** the runtime watcher uses (see Filesystem watcher contract). Arc D and Arc E share one classifier -- co-design *constraint*, not co-design *suggestion*. A bug fix or rule addition lands in one place and benefits both flows. A divergence between them would surface as "migration extracted X but watcher quarantines X" or vice versa, which would erode trust.

### Maps and locs land in library, not profile (Pass 3.3)

Existing maps and locs in the source dir classify as `library:map` and `library:loc` by default at migration time, NOT as `user-asset:map` and `user-asset:loc`. Rationale: maps and locs are profile-orthogonal accumulated content (bucket 7); a user with maps for two clans wants their maps available in every profile. Per-profile loc variation handled by profile-overrides-library precedence (a "review casts as clan-B" profile carries its own `qw/locs/dm3.loc` SHA which shadows library's SHA for that profile).

The clone-modal-as-selector overview at step 7 surfaces a "Maps -> library" section and a "Locs -> library" section by default; user can override individual entries to "Add to active profile only" if they have profile-specific reasons.

### Pre-extraction overview is the modal (Pass 3.2 cross-link)

Step 7's "show overview" is the same UI primitive as Clone modal, Pre-publish review, Selective import, and Export. Single grammar, five consumers.

### Config sanitization details

During step 6f, scan all configs for filesystem-path cvars and rewrite to slipgate-managed paths:

- `demo_dir` -> `<data-root>/user-content/demos/recorded/<profile-id>/`
- `sshot_dir` -> `<data-root>/user-content/screenshots/<profile-id>/`
- `log_dir`, `log_path`, `cl_log_dir` -> `<data-root>/user-content/logs/<profile-id>/`
- `media_dir`, `cl_demo_dir`, `_demo_path` -> as appropriate
- Custom `exec` directives with absolute paths -> relative to profile tree

The list of path-binding cvars per engine comes from Phase 2d's `cvar_bindings` data with a path-cvar flag (or an extension to that data). Show the user a unified diff of all rewrites; they accept all, review per-line, or decline migration.

### What gets extracted

Default-include (extracted into the new profile):
- All stock baseline files (verified against catalog SHAs)
- All actively-referenced user-assets (cvar-bound resources, exec'd cfgs, bind/alias targets)
- All user-generated owned content -> user-content/
- All classified mod-cache content -> mod-cache/

Default-exclude (NOT extracted, NOT modified, NOT moved):
- Shadowed assets (overridden by another version in search-path resolution)
- Orphan flatfiles unreferenced by any cvar/bind/alias/trigger AND not in a known mod-cache pattern
- Stale/old configs not in the active chain (user is shown a list and can opt-in)
- Crash dumps, temporary files, partial downloads (`.tmp` files)

User-tickable (shown in the overview, default on but user can decline):
- Trigger-conditional assets (might be loaded under conditions the user doesn't currently exercise)
- Alias-reachable but not currently invoked (exec'd by an alias the user has but hasn't called this session)
- Old configs that aren't in the active chain but might be useful for backup

---

## Cloud catalog interaction

### Authentication

Already shipped: Discord OAuth -> matchscheduler cloud function -> Firebase custom token. Slipgate's Auth subsystem authenticates the user with the catalog backend.

### Sync flow

When the user is signed in:
1. Slipgate computes a hash list of all warehoused blobs (or a Bloom filter for efficiency at scale)
2. Sends to catalog: "I have these SHAs"
3. Catalog returns: which SHAs are known (with metadata: name, category, author, license), which are unknown (potential submission candidates)
4. Slipgate displays:
   - Known assets: enriched with catalog metadata
   - Unknown assets: prompted "Submit to catalog? Tag as ___?" (user-curated submission)

### Profile import

User browses catalog (web or in-app), finds a profile, clicks "Import":
1. Catalog returns the profile manifest
2. Slipgate computes which blobs are missing locally
3. Catalog provides download URLs for missing blobs (or refuses if any are stock paks -- slipgate knows it has its own copy)
4. Slipgate downloads, verifies SHAs, warehouses
5. Materializes as a new profile alongside existing ones
6. User can switch / fork / merge / compare from there

### Profile export to catalog

User publishes a profile:
1. Slipgate sends the manifest + which blobs to upload
2. Catalog dedupes against existing assets (some of the user's blobs might already be in the catalog from other users)
3. Slipgate uploads only novel blobs
4. Catalog associates the new manifest with the user's account, adds to public/private listing per user choice
5. URL/handle provided for sharing

### Bandwidth shape

Profile manifests: KB. Negligible.
Stock paks: never transferred (verified locally).
User-asset blobs: transferred only when novel. Most user assets are shared across users; the catalog dedupes aggressively. A typical "import Milton's profile" might be a few MB of unique content, not GB.

The architecture's bandwidth bill scales with novel assets per profile, not total assets per profile. This is what makes the cloud feasible.

### Hub as gravitational center (Pass 3.5 ratified)

The hub is the gravitational center of the slipgate ecosystem. Three-way data flow makes this concrete:

- **App -> hub:** submission candidates (unknown SHAs the user encountered, role-upgrade gestures, partial-mod completion requests).
- **Hub -> app:** delta-sync catalog refresh (see Slipgate self-knowledge surface).
- **App -> app:** shared profile manifests with SHA references (some hub-known, some pending).

The hub is the source of quality metadata, the dedup arbiter, the copyright-safety gate, and the cross-app coordination point. App-to-app sharing happens via manifests, but the bytes those manifests reference flow only through the hub.

### No P2P; manifests carry placeholders for hub-unknown SHAs (Pass 3.5)

- **No peer-to-peer transfers.** Bytes flow only when the hub validates and serves them. Recipients can never download a hub-unknown SHA directly from another user.
- A profile manifest may reference SHAs the recipient's hub does not yet know. The recipient sees: "manifest references N assets not in catalog. Slipgate will notify when they become available." UX: greyed-out asset entries with a "Notify me when this becomes available" workflow.
- "Greyed-out until validated" UX = metadata-incomplete (asset is functional from import once hub serves; rich UI activates retroactively when hub catches up via delta-sync).

### Retroactive metadata enrichment

When a user publishes a manifest with previously-unknown SHAs, slipgate-side queues them for hub submission. Hub moderation accepts (with author / license / curated category metadata) -> next delta-sync to all users delivers the enriched metadata for any of their manifests that already reference those SHAs. Users who imported the manifest before the hub knew the SHAs see the rich UI activate retroactively. The "share my friend's setup before they've published anything to the catalog" flow works without any handshake.

### Library has a separate catalog-distribution path (Pass 3.3 cross-link)

Bucket 7 (user-library) content does NOT travel with profile manifests. Library has its own publish/share path (Arc H -- "share my map collection," "import this curated loc set"), catalog-distributed-as-asset-bundle, NOT bundled-into-profile-manifests. Recipients pull profile content; materialize against their OWN library; missing library entries fall back to engine's auto-download. See Bucket 7: User-library for the full materialization rule.

### Hub-knowledge orthogonality

**Manifest entries are hub-knowledge-orthogonal.** A manifest entry's role + target_path + SHA are determined by what slipgate observed in the user's setup, not by what the hub knows about the asset. Metadata richness (author / license / curated category at the catalog) is a separate axis from manifest membership. Configs are hub-thin by design (no per-config catalog metadata model in V1; see Arc H carry-forwards); assets vary by submission state. Slipgate-side functionality does not gate on hub state -- offline manifests work; offline materialization works; hub augments, never blocks.

---

## Slipgate self-knowledge surface (Pass 3.5 ratified)

Pass 3.5 collapsed an earlier two-class proposal (code-bundled vs catalog-refreshable) into a **single class of refreshable knowledge tables**. Most so-called "code-bundled" tables are pure data with stable consumption contracts -- the wrong abstraction.

### Single class, schema as the only coupling event

- **Schema is the only oracle <-> slipgate coupling event.** Within a stable schema, growth is continuous via delta-sync. Schema bumps are coordinated oracle + slipgate releases (rare, intentional).
- **Slipgate's self-knowledge is mostly a thin caching layer over oracle's tables.** A few slipgate-only tables exist (UI preferences, profile state, engine process tracking) but they are application state, not knowledge tables in the layer1 / 3 sense, and live outside this surface.

### Per-table cadence (V1 policy)

| Table | Refresh trigger | Notes |
|---|---|---|
| Asset-roles registry | on sign-in + on-demand | Small payload, fast. Manifest validation depends on it. |
| Mod-fingerprint registry | on sign-in + on-demand | Used at watcher classify time. Small payload. |
| Engine-runtime allowlist | bundled with slipgate release; refresh on oracle release | Pure data; growth tied to oracle releases. |
| Classifier heuristics | bundled with slipgate release; refresh on oracle release | Pure data; growth tied to oracle releases. |
| File-integrity-check table (declarative rules) | bundled with slipgate release; refresh on oracle release | Declarative rule shape (magic bytes, offset/size checks); not imperative code. |
| Known-good stock pak SHAs | on sign-in + on-demand | Small payload, rare growth. Copyright-verification gate. |
| Layer 1 knowledge service data | bundled with slipgate release tied to oracle snapshot | Larger payload; refresh tied to oracle release cadence. |
| Asset metadata catalog | lazy on-demand per-SHA + bulk-prefetch on sign-in for hot subset | Largest table; doesn't gate V1 functionality. Per-SHA endpoint for misses. |

### Bundled baselines

- Each table ships with a baseline snapshot at slipgate-release time.
- First-launch (offline, never signed in) has a working version of every table.
- First refresh after sign-in pulls delta since baseline.
- Slipgate-fully-offline-forever is functional for all flows; online users get richer + fresher content.

### Delta-sync protocol (single shape across all tables)

```
Client -> server: { table: "<name>", since: "<version>" }
Server -> client: {
  current_version: "<new-version>",
  delta: {
    added:   [...],
    mutated: [...],
    retired: [...]   // tombstones; clients keep them for historical SHA references
  }
}
Client applies delta, bumps stored version stamp
```

- Bandwidth scales with new-additions-since-last-sync, not table size.
- Each table has an independent version stamp; cadences vary per table without coupling.
- Retired entries are tombstones; UI renders them as deprecated; clients keep them in case a manifest references the retired SHA.
- One client implementation handles all tables.

### V1 refresh trigger defaults

- **On sign-in:** all catalog-refreshable tables refresh in parallel.
- **On-demand:** "Refresh slipgate's knowledge" button hits all catalog-refreshable tables.
- **Periodic background polling:** deferred to V1+. Default OFF; user opts in via preferences.
- **Per-asset lazy lookup:** when slipgate UI needs metadata for a SHA it doesn't have cached, lazy-fetch via per-asset endpoint, cache locally.

### "What slipgate knows" UI -- V1 minimum

Settings -> "Knowledge" pane. One screen. For each table:

```
Asset-roles registry            v51    refreshed 2 hours ago    18 roles    [bundled+catalog]
Mod-fingerprint registry        v23    refreshed 2 hours ago    8 mods      [bundled+catalog]
Engine-runtime allowlist        v8     bundled with slipgate v0.4    [code-bundled]
Classifier heuristics           v12    bundled with slipgate v0.4    [code-bundled]
File-integrity-check table      v3     bundled with slipgate v0.4    [code-bundled]
Known-good stock pak SHAs       v6     refreshed 2 hours ago    18 hashes   [bundled+catalog]
Asset metadata catalog          ~84k SHAs cached, last bulk-refresh 2 days ago   [catalog-only]
Layer 1 knowledge service data  v0.4   bundled with slipgate v0.4    [code-bundled]

[Refresh all (catalog-refreshable tables)]
[Use local override for a table]
```

V1+ polish surfaces (deferred): per-table refresh history, diff viewer for what changed in last refresh, per-table opt-in for periodic polling.

### User-override mechanism

- Local override file at `<data-root>/overrides/<table-name>.json`.
- Slipgate prefers local override over bundled / catalog when present.
- Surfaced in Knowledge UI with "using local override" badge per table.
- Removing the override file falls back to normal source.
- Default: no overrides; opt-in and explicit.
- Use cases: testing new asset role pre-submission, debugging classifier behavior, air-gapped catalog mirror.

### Two growth axes (principle)

Slipgate gets smarter on two independent axes:

- **Code (slipgate releases) grows recognition vocabulary.** Classifier heuristics, file-integrity rules, engine-runtime allowlists, Layer 1 snapshots. Each release shrinks the "other" / unrecognized bucket toward zero.
- **Catalog (delta-sync) grows asset corpus + role / mod taxonomies + stock pak SHAs + asset metadata.** Hub-side moderation accepts user submissions; users with manifests referencing previously-unknown SHAs get retroactive metadata enrichment via delta-sync.

These axes operate independently. Code growth doesn't depend on catalog state; catalog growth doesn't depend on code releases. Both contribute to slipgate getting smarter over time, but at different cadences and via different gates.

---

## Open architectural questions

### Pass 1 status

Pass 1 (substrate and storage) ratified the following original-draft questions:

- **Shared-vs-split blob store** -- RESOLVED: unified `<data-root>/blobs/` with two-char fanout. See Storage Layout.
- **GC trigger: idle-time scheduled, on-demand, or both?** -- RESOLVED: both (weekly idle sweep + on-demand "Reclaim space" button). See Garbage Collection.

Pass 1 also added six storage-layer decisions not in the original list, all now in body: per-blob sidecar metadata, refcount index, single-process invariant + lockfile, content_warehouse refactor, materializer modes simplification (hardlink + copy), lossless-export pledge tests.

### Pass 2 status

Pass 2 (manifest schema + materializer mechanics + gamedirs + history) ratified:

- **Manifest format ratification** -- RESOLVED: JSON with canonical SHA computation, schema_version field, full-manifest history (no deltas). See Manifest as Profile.
- **History retention policy defaults** -- RESOLVED with refinement: configs 500 auto-versions per config (was floated as 100; revised generous after living-file principle), assets 10 snapshots per asset, checkpoints exempt from prune. See Versioning and history.
- **Atomic materialization** -- RESOLVED: build-new-and-swap (atomic rename), trust-existing-tree fast path, watcher self-skip via hash, single mutex + UI busy-state pattern. See `materialize()` in Primitive operations.

Pass 2 also added decisions outside the original list, all now in body: registry-based role taxonomy, identity-vs-name separation, manifest atomic write + corruption recovery, engine_compatibility field dropped (computed at runtime from Layer 1 instead), declared_gamedirs schema + validation, two-save-paths model (watcher debounce vs internal save button), checkpoint UX concept.

Pass 2 surfaced and captured for later: configs-as-living-files vs assets-as-immutable-artifacts principle (drained inline), seventh content-taxonomy bucket `user-library` (Pass 3.3 ratified V1; see Bucket 7), slipgate self-knowledge surface (Pass 3.5 fully replaced the placeholder; see Slipgate self-knowledge surface section).

### Pass 3 status

Pass 3 (classifier rules + bucket taxonomy refinements + capture/swap pipeline + self-knowledge surface) ratified:

- **Sixth + seventh bucket boundaries** (item #6 below) -- RESOLVED: bucket 6 single-flavor user-marked-private with `private.json` schema + Case 5 dispatch; bucket 7 V1-ratified library (maps / locs / mod-content) with profile-overrides-library precedence and gamedir-gated materialization. See Bucket 6 + Bucket 7 + Materialization as view.
- **Configs-vs-assets distinction** (item #7 below) -- PARTIALLY RESOLVED: Pass 3.1 reaffirmed shared role registry + shared manifest entry shape + role-keyed retention; catalog-metadata-divergence and standalone-shareable-config dual lifecycle pushed to Arc H carry-forwards.
- **Slipgate self-knowledge surface architecture** (item #8 below) -- RESOLVED: single-class reframed; per-table cadence; delta-sync protocol shape; bundled baselines; "What slipgate knows" UI minimum; user-override mechanism; two-growth-axes principle. See Slipgate self-knowledge surface.
- **Mod fingerprint registry hosting** (item #3 below) -- RESOLVED: bundled-with-slipgate baseline + on-sign-in catalog refresh + on-demand. Folded into self-knowledge surface.
- **Profile-orthogonal user-content directory structure** (item #2 below) -- RESOLVED: by-profile subdirs (`user-content/<profile-id>/`), implicit in Storage Layout.

Pass 3 also added decisions outside the original list, all now in body:

- Manifest publish rule (four-condition filter; recognized-role profile-content only).
- Primary profile concept (third role pointer alongside active + launched); `profile-roles.json` schema.
- Capture/swap two-stage pipeline (`.pending-swap.json` notebook + three swap triggers + Defenses 1-4 + cleanup notification UX + auto-mode opt-in).
- `register` extended with `link()`-based inode-share at Stage 2.
- `make_primary` + `delete_profile` primitives + clone modal as V1 selector primitive (five consumers).
- Hub-as-gravitational-center triangle + manifest-references-hub-unknown-SHAs placeholder pattern + retroactive metadata enrichment + no-P2P invariant + library separate catalog-distribution path + hub-knowledge-orthogonality.
- `declared_gamedirs` plays a second role: gates library materialization in addition to validating profile-manifest entries.
- Migration: maps and locs default-extract to library not user-asset; classifier shared with watcher (Arc D + Arc E invariant); pre-extraction overview is the modal-as-selector primitive; migration's natural landing zone is the user's primary by definition.

Pass 3 carry-forwards (now tracked in the pre-Pass anchor block above; not duplicated here): Arc H standalone-shareable-config dual lifecycle + catalog-metadata-divergence configs-vs-assets; Pass 4 watcher refinements (debounce tuning, integrity-check registry); Pass 5 launch UX + runtime swap classes + manifest backup UX; L1-alpha / -beta / -gamma / -delta tracks for qw-oracle scope.

### Still open (resolution targeted in later passes)

1. **Watcher implementation: foreground-only confirmed for V1** -- Pass 1 + Pass 3.4 ratify. Background service deferred to V1+. Pass 4 only carries refinements (debounce-window tuning + per-extension integrity-check rules as Layer 1 grows).

2. **Profile-orthogonal user-content directory structure** -- RESOLVED: by-profile subdirs (`user-content/<profile-id>/`), implicit in Storage Layout. (Pass 3 closed.)

3. **Mod fingerprint registry hosting** -- RESOLVED: bundled-with-slipgate baseline + on-sign-in catalog refresh + on-demand, per Slipgate self-knowledge surface table. (Pass 3 closed.)

4. **Engine launching: slipgate-launches vs user-launches-via-shortcut?** Both. Slipgate's UI has a Play button (active profile or "launch in new instance"). User can also create OS-level shortcuts pointing at engine.exe with `-basedir` set. Shortcut creation is a UI helper. (Pass 5 -- runtime swap classes + multi-instance launch UX.)

5. **Manifest backup UX** -- surfaced in Pass 1 from the seed-phrase analogy. The manifest is disproportionately valuable (KB-scale, fully reconstructable from). UX should elevate backup state ("last backed up: 14 days ago, 3 backup locations") and offer multiple mechanisms (cloud catalog, local file export, "email me a copy"). (Pass 5 / Arc C-minimal.)

6. **Sixth + seventh bucket boundaries** -- RESOLVED: bucket 6 + bucket 7 ratified per Pass 3.2 + Pass 3.3. (Pass 3 closed.)

7. **Configs-as-assets vs art-as-assets distinction** -- PARTIALLY RESOLVED: shared role registry + shared manifest entry shape locked Pass 3.1; catalog-metadata-divergence + standalone-shareable-config dual lifecycle remain Arc H pre-implementation brainstorm (Pass 6).

8. **Slipgate self-knowledge surface architecture** -- RESOLVED: single-class reframed, per-table cadence, delta-sync protocol, Knowledge UI, override mechanism, two-growth-axes. (Pass 3 closed.)

9. **Arc H catalog data shape** (new in Pass 3 carry-forwards) -- standalone-shareable-config dual lifecycle (`spec.cfg` / `demoviewer.cfg` / weapon-script / frag-message / alias bundles); catalog-metadata-divergence configs-vs-assets (two metadata schemas at catalog layer); library separate-catalog-distribution path (already cross-linked from Cloud catalog interaction). All resolved by Arc H pre-implementation brainstorm. (Pass 6.)

10. **L1-alpha / -beta / -gamma / -delta tracks (qw-oracle scope, NOT slipgate Managed Mode arcs)** -- ecosystem-tools registry, cross-format binary fingerprinting, engine helpdoc / data-file recognition, stock asset catalog. Each lands more Layer 1 data via delta-sync; none gate V1. Methodology + per-track shape captured at `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`. (qw-oracle roadmap; tracked in HANDOVER under qw-oracle backlog.)

---

## Related documents

- **Vision:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
- **Roadmap:** `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
- **Phase 3.5b binary management:** `docs/superpowers/plans/2026-04-26-add-quake-client.md` -- binary half of the warehouse substrate
- **Phase 2d-bundle:** asset-bundle classifier providing per-engine path rules and asset categories (consumer of: `apps/slipgate-app/src/lib/config/data/ezquake-asset-bundle.json`, `fte-asset-bundle.json`)
- **HANDOVER follow-up:** "FTE asset bundle consumer wiring" -- load-bearing for ARC-D's classifier on FTE-using profiles
