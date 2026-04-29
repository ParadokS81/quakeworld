# Slipgate Managed Mode -- Brainstorm Pass 3 Ratifications

> **Captured 2026-04-29.** Bridge document between the Pass 3 brainstorm session and the canonical drain pass (architecture spec body edits + vision + roadmap + HANDOVER + memory).
>
> **Status:** Brainstorm complete. Drain pending in fresh session. This doc is the source of truth for Pass 3 decisions until those decisions land in their canonical homes; it can be removed (or marked superseded) once drained.
>
> **Companion docs:**
> - Vision: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
> - Architecture: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
> - Roadmap: `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
> - Pass 1 + Pass 2: drained inline in architecture spec anchor block + body sections
>
> **Reading order (for the drain session):** read architecture spec first (Pass 1 + Pass 2 anchor + body) to know current canonical state, then read this doc to know what to add.

---

## Pass 3 brainstorm shape

Five sub-questions ratified, in order:

- **3.1** Configs-vs-assets divergence axis
- **3.2** Bucket six (user-private) + primary profile concept + clone modal as V1 selector primitive
- **3.3** Bucket seven (user-library) boundary + materialization shape; mod gamedirs as library content
- **3.4** Classifier rules + capture/swap pipeline + manifest publish rule
- **3.5** Slipgate self-knowledge surface (single-class reframed)

Plus: layer1 expansion strategy (four-track L1-alpha/beta/gamma/delta) captured as carry-forwards into qw-oracle roadmap (out of scope for slipgate Managed Mode arcs).

---

## 3.1 -- Configs-vs-assets divergence axis

### Locked decisions

- **Shared role registry across configs and assets.** One `asset-roles.json` lists everything: `user-asset:config`, `user-asset:texture`, `user-asset:script`, `user-asset:hud`, `user-asset:sound`, etc. The `user-asset:` prefix is just a discriminator; what determines living-vs-immutable is the role tail, not a separate kingdom.
- **Shared manifest entry shape** (no schema split). Manifest entries stay `{sha256, target_path, role, size?, added_via?}` regardless of role kind. Living-vs-immutable distinction never enters the manifest schema.
- **Per-entry attribution covered by Pass 2 `added_via`** (already locked; reaffirmed). Profile genealogy via `parent_manifest_sha` + `forked_from_profile_id`.
- **Role-keyed retention policy.** Pass 2 locked 500 auto-versions/config + 10 snapshots/asset. That is a `role -> retention-policy` lookup table at GC time, not a schema split. Adding a new role to the registry picks up a default policy.
- **Hub-knowledge richness is orthogonal to living-vs-immutable axis.** Manifest entries are hub-knowledge-orthogonal. Metadata richness (author/license/category at catalog) is a separate axis from manifest membership. Configs are hub-thin by design; assets vary by submission state.

### Carry-forwards (Arc H scope)

- **Catalog-metadata-divergence between configs and assets.** Configs intrinsically thin (no author/license/curation across users); assets rich (author, license, curated category, perceptual-hash neighbors, moderation history). Two metadata schemas at the catalog layer.
- **Standalone-shareable-config dual lifecycle.** Cases like `spec.cfg`, `demoviewer.cfg`, weapon-script bundles, frag-message packs, alias bundles. Catalog-distributed like assets (author, license, curated category, browsable, downloadable a la carte) but config-shaped at consumption (text, editable, often customized after download). Dual lifecycle: immutable-artifact-shaped at catalog (until downloaded), then living-file-shaped in the receiver's profile (after downloaded; SHA at download pins "version 0" reference, post-edit creates new SHAs with per-user history). Resolved by Arc H catalog data shape brainstorm.

### Affected canonical docs

- **Architecture spec Open architectural questions:** add Arc H carry-forward note about catalog-metadata-divergence + standalone-shareable-config dual lifecycle (don't try to land them in body; they belong as Arc H surfaces).

No other body edits needed for 3.1 -- this sub-question reaffirmed already-locked Pass 2 decisions and surfaced two genuinely-Arc-H questions.

---

## 3.2 -- Bucket six + primary profile + clone modal as V1 selector primitive

### Locked decisions: bucket six (user-private)

- **Single flavor:** user-marked private. ".gitignore for the Quake folder."
- **Auto-uncertain framing collapsed:** files without a recognized role are tree-resident but absent from all manifests; they surface in MyQuake -> Browse "other" for investigation, no publish-time UX. The "other" bucket is a layer1 to-do list, not a content category. NOT a separate flavor of bucket six.
- **Storage:** `<data-root>/profiles/<id>/private.json`, profile-scoped.
- **Schema:** `{ "schema_version": 1, "paths": [...] }` where each entry is a profile-tree-relative path. Forward slashes only inside; lowercase comparison; same path rules as manifest entries (Windows-illegal characters rejected at write, ~200 char limit, etc.).
- **No glob support in V1.** Explicit paths only. Marking a folder expands to the file set at mark-time; new files added inside that folder later don't auto-inherit privacy. Glob is V1+ refinement if real use cases push for it.
- **User gesture:** right-click in MyQuake -> Browse -> "Mark as private" / "Unmark private." Bulk gesture for folder-shaped intent (multi-select then right-click). Action toggles `private.json` membership; tree files untouched physically; only metadata changes.
- **Watcher Case 5:** `untracked + path in private.json -> IGNORE` (don't classify, don't prompt, don't warehouse, don't promote). Sits between Case 1 (engine-runtime allowlist) and Case 3 (untracked-needs-classification).
- **Rematerialization preservation:** atomic-swap pre-step copies `private.json` paths from live tree into temp tree before atomic rename. Cost: small (handful of files typically), trivially fast. After rename, private files are still there at their original paths.
- **Profile fork behavior:** new profile's `private.json` is empty by default. Private files NOT carried into fork. User can opt-in to include privates at clone-time via the clone modal (default-OFF section).
- **Profile delete behavior:** prompts to move privates to `<data-root>/orphaned-private/<profile-id>/<timestamp>/` for recovery (default), or delete. 30-day retention same as orphaned profiles.
- **Collision handling:** marking a path that's also a manifest entry's `target_path` is rejected with structured error -- "This file is part of your profile (role: <X>). Remove from profile first, then mark private." Mark-and-be-in-manifest is incoherent.

### Locked decisions: primary profile

- **Add at data-root level**, not per-profile bool. Generalize `active-profile.json` to `profile-roles.json`:
  ```json
  {
    "primary_profile_id": "uuid",
    "active_profile_id": "uuid",
    "active_since": "..."
  }
  ```
- **Set on first profile creation:** migration sets primary = the migrated profile; fresh-start sets primary = the seeded default.
- **Changed via explicit "Make this primary" action** with confirmation. Slipgate UI surfaces "Profile: paradoks-default ★ primary | Active: experiment-3" when active != primary.
- **What primary unlocks:**
  - Default fork target ("Fork from primary" is the one-click for sandbox clones)
  - Default launch target if active hasn't been set
  - Mental-model anchor in UI
  - Migration on-ramp's natural landing zone (the user's existing dir becomes their primary by definition)
- **What primary does NOT change:**
  - GC logic (refcount-driven, not primary-driven)
  - Profile delete safety (any-other-reference-exists is the GC question; primary just adds stronger UI guard)
  - Asset retention (manifest-reference-driven)

### Locked decisions: profile delete prompt UX

For non-primary profiles, prompt:
```
Delete profile "<name>"?

  - Manifest will be archived to orphaned-profiles/ (recoverable for 30 days).
  - N assets are referenced ONLY by this profile and will become eligible for GC.
    [Show list] [Import any to primary first]
  - M private files in this profile's tree will move to orphaned-private/ (recoverable for 30 days).
  - Tree will be removed.

  [Cancel]  [Delete]
```

The "N assets referenced only by this profile" line is a straight refcount query: blobs whose refcount drops to zero after the delete. Refcount captures "not in primary OR any clone OR any other profile" automatically. Primary doesn't enter GC logic; it's just one of the manifest sources refcount counts.

For primary profile delete:
- "Primary cannot be deleted while other profiles exist. Choose a new primary first, then retry."
- OR if last profile: "This is your last profile. Deleting it leaves slipgate empty. [Confirm complete reset]."

### Locked decisions: clone modal as V1 selector primitive

The clone modal collapses the previously-deferred Pass 3.5 mini-pass on selector grammar. The modal-driven action **is** the selector primitive. No declarative DSL, no predicate language. UI is the grammar.

V1 modal shape:
```
Clone profile "<source-name>" -> new profile

  Profile name: [______________]
  Genealogy:    forked_from_profile_id = <source-id> ✓

  ▼ Stock baseline                         (3 entries, ~50 MB)   [✓ all]
  ▼ Configs                                (12 entries, ~80 KB)  [✓ all]
        ✓ qw/config.cfg
        ✓ qw/autoexec.cfg
        ...
  ▼ Textures                               (847 entries, ~120 MB) [✓ all]
  ▼ Sounds                                 (203 entries, ~45 MB)  [✓ all]
  ▼ HUD                                    (28 entries, ~12 MB)   [✓ all]
  ▼ Player skins                           (12 entries, ~8 MB)    [✓ all]
  ▼ Maps                                   (38 entries, ~280 MB)  [✓ all]
  ▼ Private files                          (4 files, ~22 KB)      [□ none]
        □ qw/notes/strats.txt
        □ qw/notes/todo.md
        ...

  Total selected: 1143 entries, ~515 MB           [Cancel]  [Clone]
```

- **Defaults:** all role sections checked, privates section unchecked.
- **Toggle granularity:** whole role sections, individual entries, top-level select-all / deselect-all.
- **Privates section:** present but deliberately default-off; user has to consciously opt in.

**Same modal shape powers FIVE primitives:**

1. **Clone / fork** (profile genealogy)
2. **Pre-publish review** (manifest sharing -- operates on manifest-eligible set; no privates section because privates structurally never reach the manifest layer)
3. **Selective import from another profile** (Arc C-full -- "Try Milton's visuals only" is the same modal driving `merge(into=mine, from=milton, selector=<modal-output>)`)
4. **Pre-extraction overview** (Arc D migration -- "I'll extract these N assets, skip these M" is the same modal driving `migrate(...)`)
5. **Export for backup** (Arc F lossless export -- defaults: stock + profile content + library ON; user-content + private OFF)

One UI primitive, five consumers. Subset selection grammar fully resolved.

### Affected canonical docs (3.2)

- **Architecture spec Storage Layout:** rename `active-profile.json` to `profile-roles.json`; add `primary_profile_id` field.
- **Architecture spec Active vs Launched:** add primary as a third concept distinct from active/launched. Note all three can differ: primary is permanent-ish, active is UI focus, launched is process-state.
- **Architecture spec Content Taxonomy bucket 6:** collapse to single flavor (user-marked private). Remove auto-uncertain dual-flavor language. Add explicit note: "files without recognized roles are tree-resident but absent from all manifests; they surface in Browse for investigation but have no publish-time UX. The 'other' bucket is a layer1 to-do list, not a content category."
- **Architecture spec Filesystem Watcher Contract:** add Case 5 (untracked + path in private.json -> IGNORE).
- **Architecture spec Primitive operations `materialize`:** add private-file preservation pre-swap step.
- **Architecture spec Primitive operations `fork`:** privates default-excluded; modal opt-in available.
- **Architecture spec Primitive operations:** add reference to "Make this primary" action; profile delete prompt UX with refcount-derived assets-unique-to-this-profile message + orphaned-private retention.
- **Architecture spec NEW:** clone modal as selector primitive (could be its own subsection in Primitive operations or in a new "User-facing primitives" section). Note the five consumers.

---

## 3.3 -- Bucket seven (user-library) + mod gamedirs

### Locked decisions: library scope (V1)

- **In-scope V1:**
  - Maps (`.bsp` + `.lit` + `.ent`)
  - Locs (`.loc`)
  - Mod gamedirs (CTF, TF, Painkeep, hipnotic, rogue -- full gamedir contents including `progs.dat`, `maps/*.bsp`, `sound/**`, `skins/**`, etc.)
- **Library role families:**
  - `library:map`
  - `library:loc`
  - `library:mod-content`
- **Deferred to V1+** (probably belongs eventually, not load-bearing now): music tracks, demo archive, downloaded sound packs (gray area, mostly profile-bound).
- **Out-of-scope** (stay in existing buckets): configs, textures, HUD images, player skins, crosshairs (always profile-bound); demos / screenshots / logs (already in user-content/, profile-orthogonal but distinct from library); mod-cache content (already in mod-cache/, separate semantics -- inbox to library's kept).

### Locked decisions: storage layout

```
<data-root>/library/
  manifest.json          ← single library manifest, structurally same schema as profile manifest
  manifest-history/      ← same versioning as profiles
    <timestamp>-<sha>.json

  (no tree subdir -- library doesn't have its own materialized tree;
   library entries materialize INTO each active profile's tree)
```

- Library content addressed via the same unified `<data-root>/blobs/` store, same SHA-keying.
- Library manifest schema is identical to profile manifest with two differences:
  - **No `declared_gamedirs` field** (library uses target paths that imply their gamedir; `qw/maps/dm3.bsp` lands in qw/, period).
  - **Roles are library-prefixed** (`library:map`, `library:loc`, `library:mod-content`) rather than `user-asset:*`.

### Locked decisions: materialization shape

- **Library entries materialize into a profile's tree iff** `target_path`'s first segment is `id1` OR is in profile's `declared_gamedirs`.
- **Profile entries take precedence over library entries** at the same `target_path`. If a profile manifest has its own `qw/maps/dm3.bsp` (custom variant), it wins; library version is shadowed for this profile.
- **Materialization order:** stock baseline -> profile content -> library content. Profile entries get their hardlinks first; library entries fill in remaining target paths the profile didn't claim.

Examples:
- Profile with `declared_gamedirs: ["qw"]` -> library's `qw/**` materializes; `ctf/**`, `tf/**`, etc. do not.
- Profile with `declared_gamedirs: ["qw", "ctf"]` -> qw + ctf library content materialize.
- Tournament-clean profile with `declared_gamedirs: ["qw"]` and explicit profile entry for vanilla `qw/maps/dm3.bsp` -> library's textured-dm3 shadowed for this profile; vanilla wins.

### Locked decisions: bucket 4 (mod-cache) ↔ bucket 7 (library) inbox-vs-kept relationship

- **Bucket 4 (`<data-root>/mod-cache/`)** is the **inbox** for content arriving passively from server auto-download. Quarantined, mod-fingerprint-classified, hardlinked into the active profile's tree so the engine can read it during the session. NOT in any manifest. Transient by intent.
- **Bucket 7 (`<data-root>/library/`)** is the **kept** state for shared base content the user explicitly wants persistent across profiles.
- **Promotion** moves entries from inbox to kept:
  - Single map / loc: "Keep this <map|loc> across all profiles."
  - Whole mod gamedir: "Keep CTF in my library." Bulk promotion across all blobs in the `ctf/` subtree of mod-cache, recorded as library entries with `library:mod-content` role.
  - Demotion path: library entry -> "Move back to mod-cache" if the user decides not to keep.
- **Promotion prompt offers `declared_gamedirs` extension:** "Add 'ctf' to active profile's `declared_gamedirs`?" so workflow ends with the user actually able to play CTF in the active profile.

### Locked decisions: locs as clan-versioned content

- Different clan loc sets are different SHAs.
- Library can hold any one of them per user.
- **Profile-overrides-library precedence handles per-profile loc variation cleanly:** a "review casts as clan-B" profile manifest carries `qw/locs/dm3.loc` at SHA Y -> SHA Y wins for that profile, library SHA X is shadowed.
- Hub-side analytics on "how many users have the same loc set, how many variants exist for `dm3`" fall out for free from SHA frequency aggregates on opt-in sync. Zero extra architecture.

### Locked decisions: manifest publishing rule for library content

- **Library content is profile-orthogonal.** It does NOT travel with profile manifests. Sharing your profile shares your profile's manifest only.
- **Library has its own publish/share path** (Arc H -- "share my map collection," "import this curated loc set"), catalog-distributed-as-asset-bundle, not bundled-into-profile-manifests.
- **Recipients pull profile content; materialize against their OWN library.** If library content matches at SHA, materialization works identically; if not, missing maps fall back to engine's auto-download behavior, which fills the gap server-side as normal.

### Affected canonical docs (3.3)

- **Architecture spec Storage Layout:** add `<data-root>/library/` to the layout block.
- **Architecture spec Content Taxonomy:** expand bucket 7 from carry-forward placeholder to full V1-ratified section. Library role families, materialization rule, promotion gesture, profile-overrides-library precedence, hub-analytics-as-byproduct note.
- **Architecture spec Materialization as view:** clarify materialization order (stock -> profile -> library) + precedence rule.
- **Architecture spec Engine integration:** clarify `declared_gamedirs` gates library materialization (in addition to its existing role of validating `target_path` entries in the profile manifest).
- **Architecture spec Filesystem Watcher Contract bucket 4:** clarify inbox-vs-kept framing; add promotion gesture as a Case-3 outcome.
- **Architecture spec Cloud catalog interaction:** note library has separate Arc H catalog-distribution path.

---

## 3.4 -- Classifier rules + capture/swap pipeline

### Locked decisions: manifest publish rule (final form)

```
manifest entry iff:
    role ∈ recognized-roles (registry-validated)
  ∧ role ∉ user-content-roles (demos, screenshots, logs structurally outside)
  ∧ role ∉ library-roles (library content travels via library manifest, not profile)
  ∧ path ∉ private.json
```

Manifest scope = recognized-Quake profile-content only. Unclassified files never reach a manifest. User-content (demos / screenshots / logs) never reaches a manifest. Library content (maps / locs / mod-content) never reaches a profile manifest (lives in library manifest instead). Private files never reach a manifest.

This is the V1 rule. Forces clean discipline: either upgrade an asset to a known role OR keep it out. The upgrade path (which is also the hub-submission gesture) handles the layer1-gap case by closing gaps via slipgate releases.

### Locked decisions: watcher five-case dispatch

- **Case 1:** tracked + change matches engine-runtime allowlist -> IGNORE.
- **Case 2:** tracked + change is real edit -> record `(path, size, mtime)` in `.pending-swap.json` for safe-moment processing. Manifest update queued, not applied yet.
- **Case 3:** untracked + new file -> record in `.pending-swap.json` for safe-moment classify-and-route.
- **Case 4:** tracked + file deleted -> prompt user at cleanup notification (not immediately). "Tracked file `<path>` was deleted. Restore from warehouse, or remove from manifest?"
- **Case 5:** untracked + path in private.json -> IGNORE (added in 3.2).

### Locked decisions: capture/swap pipeline (separated in time)

**Stage 1 -- observe (immediate, free, safe during engine session):**
- Watcher logs `(path, size, mtime, tentative-classifier-result)` to `<data-root>/.pending-swap.json`.
- NO read of bytes. NO hashing. NO warehouse mutation. NO filesystem mutation.
- Just a notebook of paths needing later attention.

**Stage 2 -- process at safe moment, gated on user decision:**
- **Triggers:** engine-exit (auto), user-invoked "Cleanup" (manual), idle-nudge (periodic notification).
- For each pending entry the user opts to keep:
  1. Stable-mtime check (file hasn't been written in N seconds, default 5s; tuneable).
  2. Hash -> SHA.
  3. Integrity check (warn if fails for known file types; allow user override).
  4. `link(tree_path, blob_path)` to share inode between tree and warehouse.
  5. Update sidecar metadata.
  6. Update refcount index.
  7. Add manifest entry (library, profile, or `private.json`) per user-chosen action.
- **Discard route:** `unlink(tree_path)`, never warehoused.
- **"Keep without warehousing" route:** leave tree file alone, drop from `.pending-swap.json` (escape hatch for users who want bytes in tree without going through warehouse; costs more disk).

### Locked decisions: defenses against partial-file capture

- **Defense 1 -- never process during engine session.** Watcher only OBSERVES; processing only at safe moments. Eliminates whole class of "engine still writing" problems.
- **Defense 2 -- stable-mtime check before hashing.** Even at safe-moment processing: confirm file's mtime + size haven't changed in N seconds (default 5s). If still moving, skip this round and re-check on next cleanup pass.
- **Defense 3 -- integrity check per file type.** Layer1 grows a per-extension integrity-check table (declarative rules: magic bytes + offset/size sanity checks). Run after hashing. Failed integrity = `incomplete` flag in cleanup notification; user can override.
  - `.bsp`: magic bytes + entity-lump pointer offsets within file bounds.
  - `.wav`: RIFF header + chunk sizes ≤ file size.
  - `.pak`: header entry count + offsets within bounds.
  - `.tga`, `.png`, etc.: minimal header sanity.
- **Defense 4 -- mod-fingerprint partial detection.** If captured set matches a partial-mod fingerprint, surface "looks like partial CTF (47/95 expected files)" with completion options. Auto-completion gated on Arc H.

### Locked decisions: cleanup notification UX

Unified surface for pending swaps + classifications + promotions. Surfaces from three triggers (engine-exit, user-invoked, idle-nudge).

```
Cleanup pending -- 47 files captured but not yet organized

▼ Maps from server downloads        (28 files, ~12 MB)
   ▼ ctf-bigmap.bsp + dependencies   (5 files)
        [Add to library]  [Discard]
   ▼ dm6-classic.bsp                 (1 file)
        [Add to library]  [Discard]
▼ Possible partial mod: CTF         (15 files of expected ~95)
   "Looks like a partial CTF download. [Complete download] [Keep partial] [Discard]"
▼ Unrecognized files                (4 files)
   [Mark all as private] [Review individually]

[Apply selected]  [Snooze 1 hour]  [Settings -> frequency]
```

Per-entry actions: Add to library / Add to active profile / Promote to mod-cache / Mark as private / Discard / Review individually. Bulk actions per category. "Apply selected" performs the safe-moment processing for chosen items.

### Locked decisions: auto-mode preference

- **Default OFF.** Cleanup-notification UX is the default flow.
- **Opt-in setting:** "Auto-classify and stash post-engine-exit." High-confidence + integrity-pass entries skip user-decision; route to classifier-determined destination automatically (mod-cache, library based on classifier output). Lower-confidence and integrity-fail entries still surface in cleanup notification.

### Locked decisions: classifier shared by Arc D + Arc E

- Single `classify(path, bytes) -> BucketDecision` function.
- Arc D (migration) and Arc E (watcher) consume the same classifier.
- Migration's pre-extraction overview is the same modal-as-selector primitive.
- Migration walks existing dir, runs same classifier as watcher, builds bucket assignments, surfaces modal. Locked-in design constraint, not a "co-design" suggestion.

### Locked decisions: inode-share via `link()`

- Same volume guaranteed by structure (active tree + blobs both under `<data-root>`).
- `link(tree_path, blob_path)` creates a second hardlink to the existing inode.
- After: tree path and blob path share single inode, single set of bytes on disk.
- Implementation can use either `link()` directly OR `rename + link-back` (same end state). Cross-platform decision (Windows / Linux / macOS hardlink semantics) deferred to Arc A/B implementation work.
- Cost: one directory-entry addition per kept file. Effectively zero disk write.

### Affected canonical docs (3.4)

- **Architecture spec Filesystem Watcher Contract:** revise four-case to five-case (Case 5 = user-private, locked in 3.2). Reframe to capture/swap pipeline. Add `.pending-swap.json` notebook concept. Add three swap triggers (engine-exit, user-invoked, idle-nudge). Add Defense 1-4 against partial-file capture. Add stable-mtime + integrity-check + mod-fingerprint partial detection.
- **Architecture spec Primitive operations:** add capture/swap as a new concept (could extend `register` semantics or introduce a `capture` -> `process` dual-stage model). Add inode-share via `link()` mechanism. Note that `register(bytes)` becomes the lower-level primitive that Stage 2's processing calls into.
- **Architecture spec Manifest as Profile (publish rule):** add three-line filter explicitly under "Manifest is unfiltered snapshot" -- clarifying that "unfiltered" means "of recognized-role profile-content," not "of every byte in the data root."
- **Architecture spec Migration from external dir:** add explicit invariant that Arc D and Arc E share the classifier function.
- **Architecture spec NEW section (or subsection):** Cleanup notification UX. Lives near Filesystem Watcher Contract or Primitive operations.
- **Architecture spec NEW:** auto-mode preference (settings / preferences subsection).

---

## 3.5 -- Slipgate self-knowledge surface (single-class reframed)

### Locked decisions: single class of refreshable knowledge tables

- **Replaces earlier two-class proposal** (code-bundled vs catalog-refreshable). Most so-called "code-bundled" tables are pure data with stable consumption contracts -- the wrong abstraction.
- **Schema is the only oracle <-> slipgate coupling event.** Within a stable schema, growth is continuous via delta-sync. Schema bumps are coordinated oracle+slipgate releases (rare, intentional).
- **Slipgate's self-knowledge is mostly a thin caching layer over oracle's tables.** A few slipgate-only tables exist (UI preferences, profile state, engine process tracking) but they are application state, not knowledge tables in the layer1/3 sense.

### Locked decisions: per-table refresh cadence (V1 policy)

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

### Locked decisions: bundled baselines

- Each table ships with a baseline snapshot at slipgate-release time.
- First-launch (offline, never signed in) has a working version of every table.
- First refresh after sign-in pulls delta since baseline.
- Slipgate-fully-offline-forever is functional for all flows; online users get richer + fresher.

### Locked decisions: delta-sync protocol (single shape across all tables)

```
Client -> server: { table: "<name>", since: "<version>" }
Server -> client: {
  current_version: "<new-version>",
  delta: {
    added:   [...],
    mutated: [...],
    retired: [...]  // tombstones; clients keep them for historical SHA references
  }
}
Client applies delta, bumps stored version stamp
```

- Bandwidth scales with new-additions-since-last-sync, not table size.
- Each table has independent version stamps; cadences vary per table without coupling.
- Retired entries are tombstones; UI renders them as deprecated; clients keep them in case a manifest references the retired SHA.
- One client implementation handles all tables.

### Locked decisions: V1 refresh trigger defaults

- **On sign-in:** all catalog-refreshable tables refresh in parallel.
- **On-demand:** "Refresh slipgate's knowledge" button hits all catalog-refreshable tables.
- **Periodic background polling:** deferred to V1+. Default OFF; user opts in via preferences.
- **Per-asset lazy lookup:** when slipgate UI needs metadata for a SHA it doesn't have cached, lazy-fetch via per-asset endpoint, cache locally.

### Locked decisions: "What slipgate knows" UI -- V1 minimum

Settings -> "Knowledge" pane. One screen. For each table:

```
Asset-roles registry            v51    ↻ refreshed 2 hours ago    18 roles    [bundled+catalog]
Mod-fingerprint registry        v23    ↻ refreshed 2 hours ago    8 mods      [bundled+catalog]
Engine-runtime allowlist        v8     bundled with slipgate v0.4   [code-bundled]
Classifier heuristics           v12    bundled with slipgate v0.4   [code-bundled]
File-integrity-check table      v3     bundled with slipgate v0.4   [code-bundled]
Known-good stock pak SHAs       v6     ↻ refreshed 2 hours ago    18 hashes   [bundled+catalog]
Asset metadata catalog          ~84k SHAs cached, last bulk-refresh 2 days ago [catalog-only]
Layer 1 knowledge service data  v0.4   bundled with slipgate v0.4   [code-bundled]

[Refresh all (catalog-refreshable tables)]
[Use local override for a table]
```

V1+ polish surfaces (deferred): per-table refresh history, diff viewer for what changed in last refresh, per-table opt-in for periodic polling.

### Locked decisions: user-override mechanism

- Local override file at `<data-root>/overrides/<table-name>.json`.
- Slipgate prefers local override over bundled / catalog when present.
- Surfaced in Knowledge UI with "using local override" badge per table.
- Removing the override file falls back to normal source.
- Default: no overrides; opt-in and explicit.
- Use cases: testing new asset role pre-submission, debugging classifier behavior, air-gapped catalog mirror.

### Locked decisions: two growth axes (principle)

- **Code (slipgate releases) grows recognition vocabulary.** Classifier heuristics, file-integrity rules, engine-runtime allowlists, Layer 1 snapshots. Each release shrinks the "other" / unrecognized bucket toward zero.
- **Catalog (delta-sync) grows asset corpus + role/mod taxonomies + stock pak SHAs + asset metadata.** Hub-side moderation accepts user submissions; users with manifests referencing previously-unknown SHAs get retroactive metadata enrichment via delta-sync.
- These axes operate independently. Code growth doesn't depend on catalog state; catalog growth doesn't depend on code releases. Both contribute to slipgate getting smarter over time, but at different cadences and via different gates.

### Locked decisions: hub-as-gravitational-center triangle

Three-way data flow worth making explicit in the spec:

- **App -> hub:** submission candidates (unknown SHAs the user encountered, role-upgrade gestures, partial-mod completion requests).
- **Hub -> app:** delta-sync catalog refresh.
- **App -> app:** shared profile manifests with SHA references (some hub-known, some pending).

Hub is the gravitational center: source of quality metadata, dedup arbiter, copyright-safety gate, cross-app coordination point.

### Locked decisions: manifest-references-hub-unknown-SHAs as placeholders pattern

- Manifests can carry SHA references the recipient's hub doesn't know yet.
- **No P2P transfers.** Bytes only flow when hub validates and serves. Recipients can never download a hub-unknown SHA directly.
- Recipient sees: "manifest references N assets not in catalog. Slipgate will notify when they become available."
- "Notify me when this becomes available" workflow is possible.
- "Greyed-out until validated" UX = metadata-incomplete (asset functional from import once hub serves; rich UI activates retroactively when hub catches up via delta-sync).

### Affected canonical docs (3.5)

- **Architecture spec Slipgate self-knowledge surface section:** REPLACE the placeholder section with the full single-class reframed section. Include per-table cadence table, delta-sync protocol shape, bundled-baselines principle, "What slipgate knows" UI minimum, override mechanism, two-growth-axes principle.
- **Architecture spec Cloud catalog interaction:** add hub-as-gravitational-center triangle. Add manifest-references-hub-unknown-SHAs-as-placeholders pattern. Add retroactive metadata enrichment flow ("greyed-out" -> rich activates on delta-sync). Note no-P2P invariant. Add "library has separate catalog-distribution path" cross-link to 3.3.
- **Architecture spec (general):** clarify hub-knowledge-orthogonality (manifest entries are hub-knowledge-orthogonal; metadata richness is a separate axis from manifest membership). Could go in Cloud catalog interaction or in Manifest as Profile.

---

## Carry-forwards

### L1 expansion strategy (qw-oracle roadmap, NOT slipgate Managed Mode arcs)

Operator's screenshot of MyQuake -> Browse showed the "other" bucket (~55 files of 15122) contains genuine Quake content layer1 hasn't classified yet. Closing the gap is a layer1-side effort, not slipgate-side. Four parallel growth tracks captured for the qw-oracle roadmap:

- **L1-alpha: Ecosystem-tools registry.** Walk operator's "other" bucket end-to-end; trace each file (qizmo.exe, pakexpl.exe, fteqw64.exe.db, ezquake-x86_64.appimage, end1.bin inside paks, ezQuake JSON helpdocs, etc.) to community-source classification. NEW Layer 1 table type `ecosystem_tools`. Curator-authored entries via YAML seed; loader emits typed records; snapshot to slipgate; classifier consumes; Layer 3 concept-note refs link to user-facing context. Initial seed covers well-known tools (qizmo, pakexpl, frikbot, demo-tools, AVI-encoder bundles, server-rcon clients).
- **L1-beta: Cross-format binary fingerprinting.** Extend Phase 3.5b's PE flow to AppImage / ELF / Mach-O. Same `clients` table; new fingerprint backends per-format (AppImage = ELF + squashfs metadata; Mach-O has its own version-string conventions; ELF .note sections often carry build metadata).
- **L1-gamma: Engine helpdoc / data-file recognition.** Extend Phase 2d-bundle output. New roles in the asset-roles registry: `engine-asset:helpdoc-schema`, `engine-asset:helpdoc-content`, `engine-asset:engine-meta`. Path-pattern + extension rules in `path_rules` / `extensions` covering `<engine.pk3>/help/**`, `<engine-dir>/*.xsd`, etc.
- **L1-delta: Stock asset catalog.** NEW Layer 1 table type `stock_pak_contents`. Per-known-stock-pak listing with semantic roles for files-inside-pak (`id1/pak0.pak` decoded with roles for `end1.bin`, `gfx/menu/*`, `progs/*.mdl`, `sound/*`, `demo1.dem` / `demo2.dem` / `demo3.dem`, `quake.rc`, etc.). Loader pak-extracts and classifies; emits one entry per file-inside-pak.

**Methodology for L1-alpha (operator's investigative starting principle):**

> Walk the "other" bucket end-to-end. Take every file in operator's Quake directory that slipgate's classifier doesn't recognize, trace each one back to a concrete community source (which tool produced it, where it lives, what it's used for), classify with a stable role, store in oracle with the right table shape, expose via the same loader -> snapshot -> slipgate consumption flow that asset-bundle and maps already use.

This mirrors the closure pattern that worked for asset mapping (Phase 2d-bundle) and map knowledge (Phase 2e-maps): start from operator's empirical evidence, trace each back to source ground-truth, structure into a Layer 1 table, ship the snapshot. Same methodology, new domain.

Each track is its own qw-oracle-side arc with its own brainstorm + spec + plan. None gates V1; V1 ships with whatever coverage exists at release time, and each track-arc lands more data via delta-sync.

### Arc H carry-forwards (catalog data shape brainstorm)

- Catalog-metadata-divergence between configs and assets (3.1).
- Standalone-shareable-config dual lifecycle (3.1): `spec.cfg`, `demoviewer.cfg`, weapon-script bundles, frag-message packs, alias bundles. Catalog-immutable then profile-living. Identity pinned at download SHA. Author/license/category at catalog. Per-user edits create downstream SHAs; relationship to upstream via `added_via: catalog-download:<asset-handle>`.

### Arc D carry-forwards

- Pre-extraction overview uses modal-as-selector primitive (3.2 / 3.4).
- Trigger-conditional asset handling: include-by-default with confidence flag is recommended; preserved.
- Stock pak verification: blocking (refuse migration) per copyright safety; preserved.
- Multi-engine quake dirs (user has both ezQuake and FTE in same dir): one profile or two -- still open for Arc D brainstorm.

### Arc E carry-forwards

- Mod-fingerprint registry hosting: solved via Class B catalog-refreshable (3.5).
- Background service vs foreground-only: foreground-only V1 confirmed (3.5).
- Watcher behavior during materialization: hash-comparison naturally skips, locked.

---

## Drain instructions for fresh session

A fresh session should perform the following steps to drain Pass 3 ratifications into the canonical docs.

### Step 1 -- Load context

Read in this order:
1. This Pass 3 ratifications doc (`docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`).
2. Architecture spec (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`).
3. Vision spec (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`).
4. Roadmap (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`).
5. HANDOVER index entry "Slipgate Managed Mode pivot."
6. CLAUDE.md (root) and apps/slipgate-app/CLAUDE.md.
7. Memory: `MEMORY.md` and `project_slipgate_tier_ladder.md`.

### Step 2 -- Architecture spec body edits

In `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`:

- **Pre-Pass anchor block:** add `> **Pass 3 status: COMPLETE 2026-04-29.**` line summarizing five sub-questions ratified and drained, mirroring the Pass 1 + Pass 2 status note style. Update or remove "Pass 2 carry-forwards" section since most of those are now drained (replace with "Pass 3 carry-forwards (for later passes / Arc H / qw-oracle)" listing what remains carry-forward).
- **Storage Layout section:** add `<data-root>/library/manifest.json` + `manifest-history/`; rename `active-profile.json` to `profile-roles.json`; add `primary_profile_id` field to the JSON example; add `<data-root>/.pending-swap.json` to the layout; add `<data-root>/orphaned-private/` and `<data-root>/orphaned-profiles/` recovery dirs.
- **Manifest as Profile section:** add the publish-rule three-line filter. Clarify "Manifest is unfiltered snapshot" -- "unfiltered means 'every recognized-role profile-content entry,' not 'every byte in the data root.'"
- **Active vs Launched section:** add primary as third concept distinct from active and launched. Add `profile-roles.json` schema example.
- **Content Taxonomy:**
  - Bucket 4 (cache-ephemera): clarify inbox-vs-kept framing relative to bucket 7.
  - Bucket 6 (user-private): collapse to single flavor (user-marked private). Remove auto-uncertain dual-flavor language.
  - Bucket 7 (user-library): expand from carry-forward placeholder to full V1-ratified section with library role families, materialization rule, promotion gesture, profile-overrides-library precedence, hub-analytics-as-byproduct note.
  - Add general note: "files without recognized roles are tree-resident but absent from all manifests; they surface in Browse for investigation but have no publish-time UX. The 'other' bucket is a layer1 to-do list, not a content category."
- **Materialization as view section:** add materialization order (stock -> profile -> library) + profile-overrides-library precedence rule.
- **Filesystem Watcher Contract section:** revise four-case to five-case (Case 5 = user-private). Reframe to capture/swap pipeline. Add `.pending-swap.json` notebook concept. Add three swap triggers (engine-exit auto, user-invoked manual, idle-nudge periodic). Add Defense 1-4 against partial-file capture (never-during-engine-session, stable-mtime, integrity-check, mod-fingerprint partial detection). Add cleanup notification UX subsection. Add auto-mode opt-in preference.
- **Primitive operations section:**
  - Extend `register(bytes)` semantics with the inode-share via `link()` mechanism.
  - Add or extend description of capture/swap as the two-stage pattern (observe-during-session, process-at-safe-moment).
  - Add `materialize` private-file preservation pre-swap step.
  - Add `fork` privates default-excluded with modal opt-in.
  - Add reference to "Make this primary" action and profile-roles primitive.
  - Add profile delete prompt UX with refcount-derived assets-unique-to-this-profile message + orphaned-private retention.
  - Add NEW: clone modal as selector primitive subsection. Note the five consumers (clone, pre-publish review, selective import, pre-extraction overview, export).
- **Engine integration section:** clarify `declared_gamedirs` gates library materialization in addition to its existing role of validating profile-manifest entries.
- **Migration from external dir section:** add explicit invariant that Arc D and Arc E share the classifier function.
- **Slipgate self-knowledge surface section:** REPLACE the placeholder with the full single-class reframed section. Include:
  - Single-class principle (replaces two-class earlier).
  - Per-table cadence table (eight tables with refresh trigger and notes).
  - Bundled-baselines principle.
  - Delta-sync protocol shape.
  - V1 refresh trigger defaults.
  - "What slipgate knows" UI minimum.
  - User-override mechanism.
  - Two-growth-axes principle.
- **Cloud catalog interaction section:**
  - Add hub-as-gravitational-center triangle.
  - Add manifest-references-hub-unknown-SHAs-as-placeholders pattern (no P2P; bytes only flow when hub serves).
  - Add retroactive metadata enrichment flow.
  - Add "library has separate catalog-distribution path" cross-link.
  - Add hub-knowledge-orthogonality clarification.
- **Open architectural questions section:**
  - Mark Pass 3 items resolved (#6 sixth + seventh bucket boundaries; #7 configs-vs-assets; #8 self-knowledge surface architecture; #2 user-content directory by-profile subdirs implicit in `user-content/<profile-id>/`).
  - Add new carry-forwards: Arc H standalone-shareable-config dual lifecycle; Arc H catalog-metadata-divergence configs-vs-assets; L1-alpha/beta/gamma/delta tracks (qw-oracle scope).
  - Items still open for later passes: Pass 4 watcher contract refinements; Pass 5 launch UX + runtime swap classes (anchor item 5); Pass 5 manifest backup UX; Pass 6 cloud catalog data shape (Arc H pre-implementation brainstorm).

### Step 3 -- Vision spec edits

In `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`:

- **Pre-Pass anchor block:** add `> **Pass 3 status (2026-04-29): COMPLETE.**` line summarizing the five sub-questions and noting principles that landed:
  - Manifest publish rule (recognized-role profile-content only; unrecognized never reaches manifest; user-content + library + private structurally outside).
  - Bucket 7 user-library promoted from carry-forward to V1.
  - Primary profile concept.
  - Capture/swap pipeline (no live read+write; observe-during-session, process-at-safe-moment, link()-based inode-share at user-opt-in).
  - Slipgate-self-knowledge surface single-class reframed.
  - Hub-as-gravitational-center triangle (no P2P; manifests carry placeholders for hub-unknown SHAs).
- **Optionally** in Load-bearing product properties: consider adding a hub-as-gravitational-center property if not already implied. Operator's call -- if drain session deems it duplicative of "Web/desktop split" property #4, skip.

### Step 4 -- Roadmap edits

In `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`:

- **Brainstorm-progress block:** mark Pass 3 COMPLETE 2026-04-29 with five-sub-question summary. Move Pass 4-6 deferred items if any are now resolved (e.g., the previously-noted "watcher contract" Pass 4 item is largely subsumed by Pass 3.4 -- only refinements remain).
- **Per-arc summaries:**
  - **Arc A:** no major change; substrate work unchanged.
  - **Arc B:** add manifest publish rule to key decisions; add primary profile (profile-roles.json); add private-file preservation in materialize.
  - **Arc C-minimal:** add primary profile UI badge + "Make this primary" action; add clone modal as the V1 selector primitive (referenced by C-minimal's Profile-management surface).
  - **Arc D:** add classifier-shared-with-Arc-E invariant; add capture/swap pipeline reference; add modal-as-selector primitive for pre-extraction overview.
  - **Arc E:** add capture/swap pipeline as the watcher's primary contract; add `.pending-swap.json` notebook; add three swap triggers; add Defense 1-4 against partial-file capture; add cleanup notification UX as the user-facing surface; add mod-fingerprint partial detection.
  - **Arc F:** add export modal as fifth consumer of the selector primitive; defaults (stock + profile + library ON; user-content + private OFF).
  - **Arc G:** no major change; per-config history shape stable.
  - **Arc C-full:** add selective-import-from-another-profile modal as another consumer of the selector primitive.
  - **Arc H:** add hub-as-gravitational-center triangle; retroactive metadata enrichment flow; standalone-shareable-config dual lifecycle as a brainstorm sub-question; catalog-metadata-divergence configs-vs-assets as a brainstorm sub-question; library-as-separate-catalog-distribution-path.

### Step 5 -- HANDOVER edits

In `HANDOVER.md`:

- **Update "Slipgate Managed Mode pivot" entry:** mark Pass 3 COMPLETE 2026-04-29; mention bucket 7 user-library, capture/swap pipeline, self-knowledge surface single-class, primary profile, clone-modal-as-V1-selector.
- **Add four L1-track entries to the qw-oracle backlog** (separate entries each):
  - `L1-alpha: Ecosystem-tools registry`
  - `L1-beta: Cross-format binary fingerprinting`
  - `L1-gamma: Engine helpdoc / data-file recognition`
  - `L1-delta: Stock asset catalog`
- Each entry should reference this Pass 3 ratifications doc as the source for scope and methodology.

### Step 6 -- Memory edits

- **Add or update memory entry** summarizing Pass 3 outcomes. Suggested filename: `project_slipgate_managed_mode_passes.md` (if not existing) or update existing entry. Should include high-level pass-by-pass status (Pass 1 substrate, Pass 2 manifest+materializer, Pass 3 buckets+classifier+self-knowledge), key locked principles (manifest publish rule, single-class self-knowledge, capture/swap, hub-as-gravitational-center), and remaining brainstorm passes (4-6).
- **Update MEMORY.md index line** for the managed-mode pivot to reflect Pass 3 complete.

### Step 7 -- Verify and commit

- Read the modified architecture spec end-to-end to verify cross-section consistency (no orphan references, no contradictions between Pass 1 + Pass 2 + Pass 3 ratifications).
- Run a tsc / build sanity check if any code references any of the data structures. (Probably not -- this is doc-only drain.)
- Commit with descriptive message:
  ```
  docs(slipgate): Managed Mode brainstorm Pass 3 (bucket 7 user-library + capture/swap pipeline + self-knowledge surface single-class + primary profile + clone-modal-as-V1-selector)
  ```
- Push to origin.

### Step 8 -- Optional cleanup

- Once drained, this Pass 3 ratifications doc can be moved to a "drained" status or removed. Recommended: keep as Pass 3 minutes alongside the canonical docs (analogous to Pass 1 + Pass 2 having no separate doc but inline anchors -- Pass 3 has both inline anchor and standalone minutes due to scope).

---

## Notes for the drain session

- **Watch for cross-section consistency.** Pass 3 added or revised a lot of subsystem interactions. The clone modal references show up in Primitive operations (3.2), Filesystem watcher contract (3.4), Migration from external dir (3.4), Cloud catalog interaction's library-distribution-path note (3.3), and Storage layout's profile-roles.json (3.2). Cross-references should land cleanly.
- **The Pass 2 carry-forwards subsection in the architecture spec's Pre-Pass anchor block needs revision.** Most of those carry-forwards are now drained (configs-vs-assets, seventh bucket, self-knowledge surface). The remainder become Pass 3 carry-forwards plus the new ones surfaced during Pass 3.
- **The architecture spec is large** (~960 lines pre-drain). Pass 3 drain will add ~200-300 lines net (replacing the self-knowledge surface placeholder section is the biggest swap; bucket 7 expansion is the next biggest; capture/swap pipeline reframe touches multiple sections). Plan for surgical edits rather than full rewrites.
- **The vision spec is more stable.** Pass 3 vision edits are minimal -- one anchor-block status note and one optional load-bearing-property addition.
- **The roadmap is moderate.** Per-arc summary updates plus brainstorm-progress block update.
- **L1-alpha/beta/gamma/delta belong in qw-oracle's roadmap, not this slipgate roadmap.** When drain reaches HANDOVER, the four L1 entries are qw-oracle backlog items; they reference this doc but do not pull into Managed Mode arcs.

---

## Provenance

This doc is the output of a Pass 3 brainstorm session on 2026-04-29 (orchestrator-as-third-terminal pattern, single conversation). Locked decisions were ratified through plain-English Q&A with the operator one sub-question at a time per the locked Pass 1 + Pass 2 brainstorm shape. No code was changed; no canonical docs were edited during the brainstorm session itself.

This bridge doc captures all Pass 3 decisions in canonical form so a fresh-context session can perform the canonical doc drain with full attention budget. The bridge-doc-then-drain pattern matches the operator's `feedback_fresh_context_for_execution.md` memory: brainstorm in one session, capture decisions in a written artifact, execute (in this case drain) in a fresh session.
