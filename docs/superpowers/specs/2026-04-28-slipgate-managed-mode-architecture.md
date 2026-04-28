# Slipgate Managed Mode — Architecture

> **Captured 2026-04-28** alongside the vision spec (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`). This document defines the data model, storage layout, primitive operations, content taxonomy, watcher contract, SHA256 governance, and engine integration that the Managed Mode arc roadmap (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`) implements.
>
> **Reading order:** Read VISION first for the why. Read this for the how. Read ROADMAP for the when.

> **Update 2026-04-28 (pre-Pass-1 anchor):** Six decisions ratified during the orchestrator briefing extend this document before the Arc A+B brainstorm Pass 1. They are summarized below as anchor points; the body is being revised pass-by-pass to integrate them as brainstorm work crystallizes. Until each pass is drained, where the body and this anchor diverge, the anchor is authoritative.
>
> **Pass 1 status: COMPLETE 2026-04-28.** Substrate and storage decisions drained into body — see Storage Layout (Unified blob store, Layout decisions ratified, Process model, Implementation note), Primitive operations (register/materialize/export updated), Active profile vs launched profiles, Garbage collection (manifest-as-truth + refcount), Lossless-export pledge protection. Item 1 below is now in body; items 2-6 remain pending later passes.
>
> 1. **Materializer modes simplify.** Two modes only: `hardlink` (active-tree materialization) and `copy` (lossless export). The `hardlink_preferred` fallback middle case is dropped — under slipgate-IS-quakedir, active-tree materialization is single-volume by construction. Edge case: data roots on filesystems without hardlink support (FAT32 / exFAT / some network mounts) blocked at install with a precondition check, not silent copy fallback. **DRAINED into Storage Layout + Primitive Operations 2026-04-28.**
>
> 2. **Sixth content-taxonomy bucket: `user-private` (in-tree, unmanaged).** Files in the materialized tree that are NOT in any manifest and NOT classified into the other five buckets, but the user has marked as "respect, don't touch" (private notes, personal subfolders, half-finished experiments). Preserved across rematerialization, not warehoused, not exported, not synced. Tracked via `<data-root>/profiles/<id>/private.json` listing relative paths. (Affects: Content Taxonomy, Filesystem Watcher Contract — adds a fifth dispatch case "untracked + user-private" alongside the existing four.)
>
> 3. **Manifest gains `declared_gamedirs: string[]`.** Lists the gamedirs the profile expects to materialize ("qw", "ktx", "painkeep", etc.). Launcher offers a per-launch gamedir picker when length > 1. Anchors a future mod/singleplayer/expansion launcher (Painkeep-as-gamedir, hipnotic/rogue expansions) on the same primitive at near-zero cost. (Affects: Manifest as Profile, Engine Integration.)
>
> 4. **Cloud-SHA-lookup is load-bearing for the classifier long-run.** Arc E (watcher) ships with local-heuristic classification + deferred submission queue for unknown SHAs. Arc H (cloud catalog) augments lookups with catalog metadata when online. Two-way collaboration: user-confirmed classifications flow back as moderated submission candidates. Offline mode keeps full classifier functionality with reduced precision. Implication: Arc H's catalog data shape must be brainstormed alongside Arc A/B/D/E (locked at design time; can still ship as a later implementation arc). (Affects: Cloud Catalog Interaction, Filesystem Watcher Contract.)
>
> 5. **Runtime swap class taxonomy.** Class 1: cfg-only swap (HUD, binds, aliases) — mailslot-driven `exec` / `cfg_load`, no engine restart. Class 2: visual-asset swap (textures, skins, sounds) — `vid_restart` or next-mapchange, mixed reload-cost per asset category, taxonomy required. Class 3: full profile swap (different stock paks, binaries, gamedirs) — engine restart required. V1 ships Class 1 deliberate, Class 2 empirical case-by-case, Class 3 default UX = "engine restart required." Mailslot is ezQuake-specific (`\\.\mailslot\ezquake`); FTE IPC TBD. Mailslot ruleset-gating to be verified against ezQuake source via qw-oracle before tournament-context features. (Affects: Engine Integration — new subsection.)
>
> 6. **(Roadmap-only)** Brainstorm scope covers the full surface (Arcs A through H), not just V1 substrate. Pre-launch greenfield with no production code and no users means design coherence requires committing to cross-arc contracts up front. V1/V1+ remains the implementation-sequence axis but is no longer the design-scope axis.

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

A profile is a JSON document that maps SHA256 hashes to target filesystem paths, plus metadata about each entry (role, source, timestamps).

```json
{
  "id": "uuid",
  "name": "paradoks-default",
  "created_at": "2026-04-28T10:14:00Z",
  "updated_at": "2026-04-28T14:33:00Z",
  "parent_manifest_sha": null,
  "engine_compatibility": ["ezquake@3.6+", "fteqw@5800+"],
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
      "added_via": "user-import"
    }
  ],
  "selectable_subsets": [
    { "name": "visuals", "filter": "role:user-asset:texture | role:user-asset:skybox | role:user-asset:hud" },
    { "name": "configs", "filter": "role:user-asset:config" }
  ]
}
```

The manifest is small (KB-scale even for setups with hundreds of entries). Sharing a profile is sharing a manifest. Importing a profile is fetching whatever blobs aren't already locally available.

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

### Active profile vs launched profiles

Two concepts that can differ at any moment:

- **Active profile** — the profile slipgate's UI is currently focused on (ConfigViewer, MyQuake, edits operate against it). Exactly one. Recorded in `<data-root>/active-profile.json`.
- **Launched profiles** — the set of profiles with a running engine instance. Zero or more concurrently. ezQuake supports multiple engine instances natively (real use case: idle in a 4on4 server while playing 1on1 in a second instance). Each launched instance binds to its own profile's tree via `-basedir`.

The two sets can diverge. A user can launch profile X, then switch slipgate's UI focus to profile Y for editing. X's engine continues; slipgate's UI reflects Y. Profile switching in the UI sense (`swap_active_profile`) updates the active pointer. Profile launching is a separate operation covered in Engine integration.

`<data-root>/active-profile.json`:

```json
{
  "active_profile_id": "uuid",
  "active_since": "2026-04-28T14:33:00Z"
}
```

Tree materialization is independent of both activeness and launched-state — multiple profiles can be materialized simultaneously regardless of which is active or launched.

---

## Storage layout

The complete data root structure (Pass 1 ratified):

```
<data-root>/                          ← slipgate's managed install root
  .lock                               ← single-process invariant (PID + hostname + timestamp)
  active-profile.json                 ← which profile slipgate's UI is focused on
  active-profile-history.json         ← audit log of activeness transitions
  
  blobs/                              ← UNIFIED content-addressed storage; immutable; any content type
    .refcounts.json                   ← cached SHA -> ref-count index for GC; rebuildable from manifest walk
    ab/                               ← two-char fanout by SHA prefix (256 buckets)
      abcdef0123...bin                ← the blob bytes
      abcdef0123...meta.json          ← per-blob sidecar (first-seen path, source, role-history, content-type-hint)
    cd/
      cdef4567...bin
      cdef4567...meta.json
    ...
  
  profiles/                           ← per-profile state
    <profile-name-or-uuid>/
      manifest.json                   ← source of truth for profile contents
      manifest-history/               ← prior manifest versions (per-config retention + snapshot retention)
        <timestamp>-<sha>.json
        ...
      private.json                    ← user-private (in-tree, unmanaged) file paths to respect on rematerialization
      tree/                           ← MATERIALIZED dir; engine launches against this
        id1/
          pak0.pak                    ← hardlink to ../../../../blobs/ab/<sha>.bin
          ...
        qw/
          config.cfg                  ← hardlink
          ...
        ezquake.exe                   ← hardlink to a binary blob in unified blobs/
        ...
  
  binaries/                           ← Phase 3.5b binary METADATA (blobs themselves live in unified blobs/)
    <client>/                         ← e.g. ezquake/, fteqw/
      <version>/                      ← e.g. 3.6.9/
        manifest.json                 ← references binary blob by SHA into unified blobs/
        variants/
          <variant>/
            manifest.json
    index.json                        ← active version per (client, variant)
  
  assets/                             ← asset metadata + indexes (blobs themselves live in unified blobs/)
    by-category/                      ← optional: indexed views of warehoused assets (UI helper, derived)
      textures/
      sounds/
      configs/
      ...
    catalog-cache/                    ← cached metadata from cloud catalog (Arc H)
  
  user-content/                       ← profile-orthogonal content (NOT warehoused, NOT in any manifest)
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
  
  mod-cache/                          ← quarantined per-mod content (TF, CTF, etc.)
    tf/
      qw/
        progs/tfprogs.dat
        maps/...
        sounds/...
    ctf/
      ...
  
  release-cache/                      ← Phase 3.5b shipped: GitHub Releases per-channel
    <client>-<channel>.json
  
  trash/                              ← deferred-deletion buffer for safety
    blobs/<sha[:2]>/<sha>.bin         ← entries pending GC sweep (default 30-day retention)
    profiles-orphaned/                ← deleted profiles' manifests, recoverable
```

### Unified blob store (Pass 1 ratified)

The blob store is unified across content types. The original draft proposed split `binaries/blobs/` + `assets/blobs/`; Pass 1 collapses this into a single `<data-root>/blobs/` containing all content-addressed bytes regardless of intended use. A binary IS just bytes; an asset IS just bytes; splitting by intended use was the wrong abstraction.

Phase 3.5b's existing `binaries/blobs/<sha>.exe` data migrates to the unified layout via a one-shot conversion script on first launch of the new schema. Domain-specific metadata (per-client version manifests, per-variant manifests, `binaries/index.json`) remains in `<data-root>/binaries/<client>/<version>/...` and references blobs by SHA into the unified store. Same for `<data-root>/assets/` which holds metadata indexes and catalog cache but no longer a blob store of its own.

### Layout decisions ratified in Pass 1

**Two-char fanout.** Blobs are nested under a two-character SHA-prefix directory (`<data-root>/blobs/<sha[:2]>/<sha>.bin`). 256 evenly-distributed buckets (SHA hex distribution is uniform). Handles realistic blob counts (6K-50K typical, 100K+ outlier) without filesystem performance degradation. Standard pattern (Git, Nix, OSTree, IPFS).

**Per-blob sidecar metadata.** Each blob carries a sibling `<sha>.meta.json` in the same fanout bucket. Sidecar records first-seen path, source (migration / cloud-import / user-drop / engine-write), role-history (which manifests have referenced it under what role), content-type-hint, timestamps. Recovery story: blob + sidecar are co-located; `cp -r blobs/` captures both; partial corruption affects one blob's metadata only; editable in any text editor for emergency recovery.

**Refcount index.** `<data-root>/blobs/.refcounts.json` caches `{sha → ref-count}` updated on every manifest add/remove. GC consults the index instead of walking all manifests on every sweep. Rebuildable from a full manifest walk if corrupted.

### Process model (Pass 1 ratified)

Single slipgate process invariant. Two layers protect this:

- **Tauri single-instance plugin** (`tauri-plugin-single-instance`, v2). OS-level: second-launch signals the first to focus its window and exits. Catches the common case.
- **Data-root lockfile** at `<data-root>/.lock` holding PID + hostname + timestamp. Catches anything escaping the OS-level layer (IDE-launched dev binary alongside production install, manual binary execution, weird shortcut configurations). Stale-lock detection: file age + PID liveness on same hostname; force-unlock prompt if stale.

Within the slipgate process, a single global async mutex (`tokio::sync::Mutex`) serializes warehouse + manifest writes. Reads are concurrent. The volume of contended operations is modest; per-resource locks are not justified for V1. Refinement happens later if profiling shows contention.

Multi-process upgrade path: if V1+ ever adds a background watcher service, the lockfile relaxes to per-resource atomic-rename + compare-and-swap on a manifest version token. The current design is forward-compatible.

### Implementation note (Pass 1 ratified)

Phase 3.5b's `version_warehouse.rs` (~1500 lines, 142 Rust tests) refactors into a generic `content_warehouse.rs` consuming the unified blob store. The binary domain keeps its API (`register_version_at`, `swap_active_version`) as a thin wrapper. The asset domain gets a parallel thin wrapper (`asset_warehouse.rs`) on top of the same generic warehouse. One-shot data migration script handles the existing `binaries/blobs/<sha>.exe` → `<data-root>/blobs/<sha[:2]>/<sha>.bin` conversion at first launch.

---

## Content taxonomy

Every file slipgate encounters falls into exactly one of five buckets. The taxonomy is the foundation of the migration classifier (clean-room extraction) and the runtime watcher classifier — they share the same dispatch logic.

### Bucket 1: Stock baseline

Files that constitute the irreducible "I have a working Quake" minimum:

- `id1/pak0.pak` — original Quake content (shareware or registered)
- `id1/pak1.pak` — registered-version content
- (Optionally `qw/pak0.pak` if the user's install includes it; modern engines don't strictly require it)

**Properties:**
- Bytes are id Software's copyrighted content.
- SHAs are well-known: catalog ships a known-good list of legitimate stock pak hashes (vanilla 1996 registered, Steam re-release, GoG release, nQuake bundled distribution, etc.).
- Catalog NEVER serves these blobs. Verification only: slipgate confirms user has bytes matching a known-good SHA.
- Warehoused locally; hardlinked into every profile tree (every profile depends on these).

### Bucket 2: User assets

Content the user has accumulated as part of their setup. This is the bulk of "what defines a profile."

Subcategories (the `role` field on manifest entries):
- `user-asset:config` — config.cfg, autoexec.cfg, exec'd subconfigs (scripts, weapon configs, hud configs)
- `user-asset:texture` — flat-file textures replacing default WAD textures (`qw/textures/wads/...`, `qw/textures/cs/...`, etc.)
- `user-asset:sound` — replacement weapon sounds, ambient overrides, custom announcer sounds
- `user-asset:hud` — custom HUD images, scoreboard banners, frag overlays
- `user-asset:skin` — player skin replacements, team colors
- `user-asset:skybox` — sky replacement sets
- `user-asset:script` — custom .cfg files for binds/aliases (often exec'd by the active config chain)
- `user-asset:map` — custom maps the user wants kept (vs server-cached maps from random pickup servers)
- `user-asset:conchars` — custom font / charset replacements
- `user-asset:lit` — map lighting files

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

### Bucket 4: Cache ephemera

Content that arrived in the user's filesystem because of a server interaction but isn't intentionally part of their setup:

- Server-auto-downloaded maps from public servers (`qw/maps/<servermap>.bsp`)
- Server-pushed sound replacements
- Server-pushed model overrides
- Mod content from joining a TF/CTF/Painkeep server (`qw/progs/tfprogs.dat` and supporting files)

**Properties:**
- Quarantined in `<data-root>/mod-cache/` rather than profile manifests.
- Mod-fingerprint-classified: known mods (TF, CTF, KTPro, Painkeep, etc.) get bucket-specific paths; unknown content goes to `mod-cache/unclassified/`.
- Hardlinked back into the active profile's tree for engine access.
- User-promotable to `user-asset:*` if they decide to keep something.
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
- Engine-runtime files are profile-private (state for THIS profile's session) — when materialization rebuilds the tree, engine-runtime files are preserved if present, otherwise the engine recreates them on next launch.

### Classifier outputs

The classifier (used by both migration extraction and runtime watcher) takes a path + bytes and returns:

```typescript
type ClassifierOutput =
  | { bucket: "stock-baseline"; verified: true | false; known_good_source?: string }
  | { bucket: "user-asset"; subcategory: AssetSubcategory; confidence: "definite" | "probable" }
  | { bucket: "user-content"; subcategory: "demo" | "screenshot" | "log" }
  | { bucket: "cache-ephemera"; mod?: ModFingerprint; quarantine_path: string }
  | { bucket: "engine-runtime"; engine: EngineKind; rule: string }
  | { bucket: "unclassified"; suggested_action: "prompt-user" }
```

The classifier consumes:
- **Asset bundle data** from Phase 2d-bundle: per-engine `path_rules`, `cvar_bindings`, `loader_sites`, `asset_categories`. ezQuake side shipped; FTE side wiring is a HANDOVER follow-up that becomes load-bearing for this arc.
- **Mod fingerprint registry**: community-curated catalog of "files matching THESE patterns belong to mod X." Lives in qw-oracle Layer 3 or assets.quake.world; consumed by slipgate.
- **Active config chain analysis**: for migration only. Walks the user's cfg chain, identifies cvar references and bind/alias load triggers, marks which assets are "actively loaded" vs orphaned.

---

## Primitive operations

Six operations are sufficient to build every Managed-mode feature. Each is a small, well-defined Rust function.

### `register(bytes) -> sha256`

Hash bytes, write to `blobs/<sha[:2]>/<sha>.bin` if not already present, write/update sidecar `<sha>.meta.json`, increment refcount index, return the SHA. Idempotent: registering the same bytes twice returns the same SHA without rewriting the blob.

### `materialize(manifest, target_dir, mode) -> Result<()>`

For each manifest entry, ensure a hardlink (or copy, depending on mode) exists at `target_dir/<entry.target_path>` pointing at `blobs/<entry.sha[:2]>/<entry.sha>.bin`. Idempotent. Removes orphan tree hardlinks (entries present in tree but not in current manifest) — this is the tree-consistency enforcement point.

Modes (Pass 1 ratified, simplified from earlier draft):
- `hardlink`: active-tree materialization. Single-volume by construction under slipgate-IS-quakedir, so hardlinks always work for normal operation. Install-time precondition rejects data roots on non-hardlink-capable filesystems (FAT32, exFAT, some network mounts) rather than silent fallback.
- `copy`: lossless export. Survives slipgate uninstall. Used by the export primitive.

### `swap_active_profile(target_profile_id) -> Result<()>`

Update `active-profile.json` to point at the target (UI-focus sense). Re-point any active-profile-bound shortcuts. Optionally re-materialize the target's tree if it's been GC'd or never materialized. Does NOT close any running engine instance — engine instances are independent of UI active-profile (see Active vs Launched).

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

### `fork(parent_profile_id, modifications) -> new_profile_id`

Create a new profile whose manifest is the parent's plus a list of modifications:
- `add: [{sha, target_path, role}]` — new entries
- `remove: [target_path]` — entries to omit
- `replace: {target_path: new_sha}` — swap blob references

The fork operation is purely manifest manipulation; no blobs are copied. Disk cost ≈ size of new manifest entries.

### `merge(into_profile_id, from_profile_id, selector) -> Result<()>`

Apply a subset of `from_profile_id`'s manifest entries to `into_profile_id`'s manifest. Selector is a filter expression like `role:user-asset:texture`. The "try Milton's visuals only" use case is `merge(into=mine, from=milton, selector="role:user-asset:texture | role:user-asset:hud")`.

---

## Filesystem watcher contract

The watcher is the runtime mediator between user/engine actions on the materialized tree and the warehouse-as-source-of-truth model. It runs while slipgate is open OR ambiently as a background service (open question for ARC-E).

### Four-case dispatch

For every filesystem event in the active profile's tree:

```
event: file changed (mtime, hash, or both differ from manifest)
  ┌─────────────────────────────────────────────────────────────┐
  │ Case 1: tracked + change matches engine-runtime allowlist   │
  │   → IGNORE (engine wrote its own state file)                │
  ├─────────────────────────────────────────────────────────────┤
  │ Case 2: tracked + change is real edit (user or external)    │
  │   → register new blob → update manifest → rematerialize     │
  ├─────────────────────────────────────────────────────────────┤
  │ Case 3: untracked + new file appeared                       │
  │   → run classifier → quarantine OR prompt user              │
  ├─────────────────────────────────────────────────────────────┤
  │ Case 4: tracked + file deleted                              │
  │   → prompt user: "remove from manifest? restore?"           │
  └─────────────────────────────────────────────────────────────┘
```

Detection mechanism:
- File watcher (`notify-debouncer-mini`, already used by slipgate's config watcher) provides change events
- Slipgate compares observed mtime/hash against manifest's expected hash for that target_path
- Mismatch triggers dispatch

### Debouncing

Editor saves often produce multiple filesystem events (write-temp, rename, mtime tick). The watcher debounces with a ~10-second window: if the same target_path changes again within 10s of the previous register-new-version, the new version REPLACES the previous (rather than creating a separate manifest version). This prevents 50 manifest versions for one logical edit from a save-every-line user.

### Materialization-time silencing

When slipgate is materializing or rematerializing a tree, it would self-trigger watcher events on every hardlink it creates. Mitigation:
- Suspend the watcher during materialization
- After materialization completes, the watcher resumes from a fresh baseline

OR (preferred): the watcher's hash-comparison check naturally skips these — slipgate's writes produce files with hashes matching the manifest's expected hashes, so no real edit is detected.

### Quarantine policy

For Case 3 (new untracked file appeared):
- Run classifier on path + bytes
- If classified as `cache-ephemera` with a known mod → move to `mod-cache/<mod>/<original-path>`, hardlink back to active profile tree
- If classified as `user-content` (demo, screenshot) → move to `user-content/<category>/<profile-id>/<date>/...`
- If classified as `user-asset:*` with high confidence → prompt user: "New asset detected. Add to active profile manifest? [Yes / Save to library only / Discard]"
- If `unclassified` → prompt user with file metadata + suggested classification, let them choose

### Promotion flow

Files in `mod-cache/` or `user-content/` can be promoted to manifest entries by user action: "I want to keep this map permanently in my profile." Promotion = read the file, register as warehouse blob, add manifest entry with appropriate role.

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

This is governance at the cloud layer. Slipgate-the-desktop-app sees the stored asset normally — it has its own SHA in the catalog. Slipgate doesn't re-implement the normalization.

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

The exe itself doesn't need to be IN the tree — it can launch from anywhere as long as `-basedir` points at the right tree. In practice, slipgate hardlinks the binary into the tree so users have a one-folder install they can browse.

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
- KTX: server-side only — slipgate doesn't materialize for KTX (it's not a client)
- MVDSV: server-side only — same
- QWFWD: server-side only — same

The asset bundle classifier work (Phase 2d-bundle) extracted the per-engine path rules from source. Slipgate's materializer consults this data when resolving target_paths and when classifying assets at migration time.

### Engine compatibility hints

Profile manifests can declare `engine_compatibility`:

```json
"engine_compatibility": ["ezquake@3.6+", "fteqw@5800+"]
```

This is informational — slipgate doesn't refuse to launch a profile against an engine that doesn't match, but it warns the user. Used for cases like "this profile uses ezhud features that need ezQuake 3.6+" or "this profile contains FTE shaders that won't work in ezQuake."

The compatibility info isn't extracted automatically; it's set by the profile author (or migrated from heuristics — e.g., if the manifest contains files in `ezhud/` paths, infer ezQuake compatibility).

---

## Versioning and history

### Implicit version history

Every register-new-blob operation creates a new immutable warehouse blob. Every manifest update produces a new manifest version. If the architecture retains historical manifest versions (under `profiles/<id>/manifest-history/`), the result is git-shaped versioning at zero additional implementation cost beyond the retention itself.

Two retention policies exist:

**Per-save retention (configs):**
- Every manifest update for a config's SHA change creates a retained historical manifest version
- Historical blobs stay alive (referenced by their manifest version) until that history version is pruned
- Storage cost: each manifest is KB-scale; configs are KB-scale; even 1000 saves cost MB-scale, not GB

**Snapshot retention (other assets):**
- Manifest versions retained only at meaningful moments: pre-import, pre-migration, pre-profile-switch, pre-bulk-action, daily idle, manual user "save state" with label
- Between snapshots, intermediate blobs are GC-eligible

### Per-config history UX

ConfigViewer (existing slipgate feature) gains a History panel:
- Sidebar lists timestamped manifest versions where this config's SHA changed
- Each entry shows auto-summary ("3 cvars changed: cl_cmdrate, fov, ...") computed from blob-vs-blob diff
- User-labeled snapshots show their label
- Click → side-by-side diff against current
- Restore button → register the historical blob's bytes as a new manifest version (forward-linear, doesn't truncate forward history)

### Profile genealogy

Every manifest stores `parent_manifest_sha` and optionally `forked_from_profile_id`. This gives:
- "Show me where this profile came from" → walk the chain back through the originating profile
- "Show me everything I changed since I forked from paradoks-default" → diff against parent
- "Promote my changes back upstream" → cherry-pick semantics for advanced users

None of this is user-visible until ARC-C's polish phase, but the data structure supports it from day one.

### Garbage collection (Pass 1 ratified)

**Source of truth: manifests.** GC walks all manifests (current + retained history) and computes the set of SHAs referenced by any manifest entry. Anything in `<data-root>/blobs/` not in that set is unreferenced and eligible for deletion. The materialized tree's hardlinks are NOT a truth source — the tree is derived state, not authoritative for liveness.

This decision is load-bearing for Arc G (per-config IDE-shaped restore): retained historical manifests reference older blobs that aren't in any current tree. nlink-as-truth would delete those blobs and break Restore-from-history; manifest-as-truth preserves them correctly.

**Refcount index for performance.** Walking all manifests on every sweep is bounded but not free. `<data-root>/blobs/.refcounts.json` caches `{sha → ref-count}` and updates on every manifest add/remove. GC reads the index, deletes anything with refcount zero. Index is rebuildable from a full manifest walk if it gets corrupted.

**Tree consistency at rematerialization, not GC.** Removing orphan tree hardlinks (entries in a tree but not in its current manifest) happens during `materialize()`, not during GC. `materialize()` is idempotent and removes-and-recreates tree entries to match the manifest. This naturally drops nlink to zero on truly orphaned blobs (no current manifest reference + no other tree reference) and the kernel frees the inode. Blobs still in retained history retain their warehouse name and stay alive.

**GC frequency:** weekly idle sweep + on-demand "Reclaim space" button. Both supported (architecture spec earlier listed this as an open question; Pass 1 confirms both).

**GC safety:**
- Never delete during active materialization (mutex-coordinated)
- Never delete blobs referenced by `mod-cache/` (quarantined, may be promoted to user-asset)
- Never delete recently-created blobs (within last 24h) — gives the watcher's debouncing window safety margin
- Move-to-`<data-root>/trash/blobs/<sha[:2]>/<sha>.bin` first; permanent delete only after configurable retention (default 30 days)

**Edge case — manual tree deletion.** If the user manually `rm -rf`'s a profile tree via Explorer/shell, the orphan tree hardlinks vanish but the warehouse blobs stay live (still referenced by manifest). On next slipgate launch, the watcher sees Case 4 (tracked + file deleted) for every entry. UI prompts: "Profile X tree is gone. Restore from manifest, or delete the profile?" Both options are valid; manifest-as-truth is what makes Restore possible.

### Lossless-export pledge protection (Pass 1 ratified)

The lossless-export pledge — "press one button, walk away with a portable Quake dir, no slipgate needed" — is the architecture's most load-bearing user-facing promise. Three automated tests pin it.

**Test 1 — round-trip integrity (CI from Arc A/B onward).**
1. Build a synthetic profile: stock paks + a few user-asset blobs + a config
2. `export(profile, target=tempdir, format=raw_tree)` (copy mode)
3. Hash every file in tempdir; compare against expected hashes
4. Assert: no missing entries, no extras, no wrong hashes

**Test 2 — zero slipgate residue (CI from Arc A/B onward).**
1. Run export
2. Walk export tree; assert absence of any slipgate-specific files: no `manifest.json`, no `.meta.json` sidecars, no `.lock`, no `.refcounts.json`, no `private.json`, no `slipgate.*`
3. The export is "just files"; nothing slipgate-specific peeks through

**Test 3 — post-uninstall launch smoke (CI from Arc F onward).**
1. Run export to a temp location
2. Wipe the slipgate data root entirely (simulating uninstall)
3. Launch ezQuake against the export with `-basedir <export-path>`
4. Assert: engine launches, reads its config, reaches main menu (or runs a known headless smoke check)

Test 3 is the pledge in machine-checkable form — it either works or it doesn't. Tests 1+2 are byte-comparison only and trivially fast (~ms). Test 3 needs an engine binary in CI and ~5s of runtime; gated to release-candidate level once Arc F lands.

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
7. Show user the overview line-by-line. User reviews, can per-line decline.
8. On accept:
   a. For each will-extract: register blob, build manifest entry
   b. For each rewrite: read config, apply cvar substitutions, register modified blob
   c. Materialize the new profile's tree
   d. Move user-content to user-content/, mod-cache to mod-cache/
   e. Verify the materialized tree boots with engine
   f. Set as active profile
9. Source dir D is UNTOUCHED throughout.
```

### Config sanitization details

During step 6f, scan all configs for filesystem-path cvars and rewrite to slipgate-managed paths:

- `demo_dir` → `<data-root>/user-content/demos/recorded/<profile-id>/`
- `sshot_dir` → `<data-root>/user-content/screenshots/<profile-id>/`
- `log_dir`, `log_path`, `cl_log_dir` → `<data-root>/user-content/logs/<profile-id>/`
- `media_dir`, `cl_demo_dir`, `_demo_path` → as appropriate
- Custom `exec` directives with absolute paths → relative to profile tree

The list of path-binding cvars per engine comes from Phase 2d's `cvar_bindings` data with a path-cvar flag (or an extension to that data). Show the user a unified diff of all rewrites; they accept all, review per-line, or decline migration.

### What gets extracted

Default-include (extracted into the new profile):
- All stock baseline files (verified against catalog SHAs)
- All actively-referenced user-assets (cvar-bound resources, exec'd cfgs, bind/alias targets)
- All user-generated owned content → user-content/
- All classified mod-cache content → mod-cache/

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

Already shipped: Discord OAuth → matchscheduler cloud function → Firebase custom token. Slipgate's Auth subsystem authenticates the user with the catalog backend.

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
3. Catalog provides download URLs for missing blobs (or refuses if any are stock paks — slipgate knows it has its own copy)
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

---

## Open architectural questions

### Pass 1 status

Pass 1 (substrate and storage) ratified the following original-draft questions:

- **Shared-vs-split blob store** — RESOLVED: unified `<data-root>/blobs/` with two-char fanout. See Storage Layout.
- **GC trigger: idle-time scheduled, on-demand, or both?** — RESOLVED: both (weekly idle sweep + on-demand "Reclaim space" button). See Garbage Collection.

Pass 1 also added six storage-layer decisions not in the original list, all now in body: per-blob sidecar metadata, refcount index, single-process invariant + lockfile, content_warehouse refactor, materializer modes simplification (hardlink + copy), lossless-export pledge tests.

### Still open (resolution targeted in later passes)

1. **Manifest format ratification** — JSON ergonomics are good but verbose for KB-scale data. Sticking with JSON unless concrete reason emerges. (Pass 2.)

2. **History retention policy defaults** — keep last N versions, last N days, or last N MB? Operator preference + storage budget. Recommended: per-config keep last 100 versions, per-asset keep last 10 snapshots, retention configurable. (Pass 2.)

3. **Watcher implementation: foreground-only or background service?** Foreground-only (slipgate must be open) is simpler. Background service allows always-on management but adds Windows service complexity. Pass 1 confirms foreground-only for V1; Process Model design is forward-compatible to background-service later. (Pass 4 final ratification.)

4. **Profile-orthogonal user-content directory structure** — by-profile subdirs vs flat with metadata? Recommended: by-profile subdirs for filesystem clarity, with cross-profile views computed in the UI. (Pass 3.)

5. **Mod fingerprint registry hosting** — qw-oracle Layer 3 vs assets.quake.world vs slipgate-bundled? Recommended: bundled-with-slipgate as a baseline, augmentable from a community-curated cloud source. (Pass 3.)

6. **Engine launching: slipgate-launches vs user-launches-via-shortcut?** Both. Slipgate's UI has a Play button (active profile or "launch in new instance"). User can also create OS-level shortcuts pointing at engine.exe with `-basedir` set. Shortcut creation is a UI helper. (Pass 5 — runtime swap classes + multi-instance launch UX.)

7. **Manifest backup UX** — surfaced in Pass 1 from the seed-phrase analogy. The manifest is disproportionately valuable (KB-scale, fully reconstructable from). UX should elevate backup state ("last backed up: 14 days ago, 3 backup locations") and offer multiple mechanisms (cloud catalog, local file export, "email me a copy"). (Pass 5 / Arc C-minimal.)

---

## Related documents

- **Vision:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
- **Roadmap:** `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
- **Phase 3.5b binary management:** `docs/superpowers/plans/2026-04-26-add-quake-client.md` — binary half of the warehouse substrate
- **Phase 2d-bundle:** asset-bundle classifier providing per-engine path rules and asset categories (consumer of: `apps/slipgate-app/src/lib/config/data/ezquake-asset-bundle.json`, `fte-asset-bundle.json`)
- **HANDOVER follow-up:** "FTE asset bundle consumer wiring" — load-bearing for ARC-D's classifier on FTE-using profiles
