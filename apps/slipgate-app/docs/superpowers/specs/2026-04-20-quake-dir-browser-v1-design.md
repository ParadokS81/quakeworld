---
Doc type: current - Design spec. Supersedes the 2026-04-19 vision spec as the live design doc for this feature. Keep until implementation lands and stabilizes.
---

# Quake-dir Browser v1 - Design Spec

**Date:** 2026-04-20
**Status:** Design approved. Ready for implementation planning.
**Scope:** The "Browse" mode in the MyQuake tab. Read-only lens over the user's quake dir using the oracle-extracted ezQuake asset-consumption model. Sibling to ConfigViewer; lives alongside Domain mode in a restructured MyQuake.

## Related prior work

- Vision spec: `apps/slipgate-app/docs/superpowers/specs/2026-04-19-quake-dir-browser-vision-design.md` (this spec supersedes it)
- Oracle extraction design: `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md`
- Oracle bundle data: `packages/qw-config/src/data/ezquake-asset-bundle.json` (schema v3, ezQuake `head`)
- ConfigViewer resolution: `apps/slipgate-app/docs/EZQUAKE-RESOLUTION.md`
- ConfigViewer parser: `apps/slipgate-app/docs/CFG-PARSER.md`
- Alias-chain rendering convention: `apps/slipgate-app/docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md`
- MyQuake current state: `apps/slipgate-app/docs/OVERVIEW.md` section "MyQuake tab"
- HANDOVER.md entry: "Quake-dir browser vision -- unblocked"

---

## 1. Purpose

A user's quake dir accretes junk across years of play: extracted paks, forgotten skins, old demos, stale screenshots, orphaned .bat files from Qizmo-era tools. Windows Explorer is hostile to the job of understanding what any of that content is for; other platforms are worse. No tool today can tell a user "this file is loaded by your current config," "this one is shadowed by a pak entry," or "this folder is junk from an app you removed years ago."

The Browse mode turns the quake dir into a legible surface. Built on top of the oracle-extracted ezQuake asset-consumption model (schema v3), it renders the filesystem as an Explorer-style tree with every file carrying its loaded-state, category, and collision context as visual decoration. The user can filter by client, by gamedir, by asset domain; see file resolution chains inline; and distinguish custom additions from stock install content with a single toggle.

v1 ships the scanner, classification pipeline, and three-pane UI. It does NOT ship asset decoding (PCX/TGA/WAD/MDL remain Phase 2), write operations of any kind, or cross-install comparison. v1's success is: "I understand what is in my quake dir for the first time in years."

The feature sits at the same conceptual level as ConfigViewer relative to configs: a transparent, read-only lens that demystifies a domain of the user's install and earns the right to offer write operations later once the classification model has proven trustworthy.

## 2. Goals and non-goals

**Goals:**

- Restructure MyQuake's top-level navigation to a two-mode shape (`Browse` | `Domains`) and relocate the existing ConfigViewer into `Domains > Configs` without behavioural changes to ConfigViewer itself.
- Scan the user's quake dir (including archive interiors) and produce a flat list of file records classified against oracle's asset model.
- Surface the scan through an Explorer-style tree with filter lens overlays (clients / gamedirs / domain categories) and a selection detail pane.
- Visualise file collision resolution (LIFO search-path winner vs shadowed entries) using the alias-chain visual convention already established.
- Render opportunistic PNG/JPG previews for image files the webview can display natively.
- Distinguish loaded / available / unreferenced / other files with a visual state system scaled for real quake-dir noise.
- Provide a "Show only custom" toggle that hides stock install content, parallel to ConfigViewer's default-suppression.
- Cross-link Browse to the `Configs` domain for `.cfg` files: right-side action opens the selected config in ConfigViewer.
- Honour the ConfigViewer-resolved cvar map so cvar-path bindings (e.g. `enemyskin ../my_old_skins/enemy.pcx`) resolve to the user's actual active config, not generic defaults.
- Gracefully degrade when inputs are missing (no exePath selected, oracle bundle malformed, archive parse failure).

**Non-goals:**

- Asset preview beyond PNG/JPG (PCX, TGA, WAD, MDL, BSP decoding deferred to Phase 2).
- Any write operation: no delete, move, rename, or in-place edit.
- Compare across installs (ezQuake vs FTE vs multiple ezQuake installs). v1 is single-install anchored via existing `exePath`.
- Enumerating external-path references (when a cvar resolves outside the quake dir). Flagged in the detail pane but not walked.
- Integration with a future central asset collection (`assets.quake.world`) or GitHub-backup feature. The data model is shaped to accommodate them later without migration.
- Maps, Matches, Assets domain dashboards. They appear as disabled placeholders in the Domain sub-nav but render no content. Each domain is its own future spec.
- FTE, MVDSV, KTX asset-consumption extraction. Oracle Phase 2d/2e will deliver these; Browse adapts trivially once the bundle format extends to multiple projects.
- Modifying ConfigViewer's internals. ConfigViewer relocates as-is into Domain mode.

## 3. Architecture

### 3.1 MyQuake restructure

Current structure: `MyQuakeTab.tsx` renders a horizontal sub-tab bar with three subtabs (`Config` / `Visuals` / `Matches`). Config hosts ConfigViewer; Visuals and Matches are disabled placeholders.

New structure: `MyQuakeTab.tsx` renders a two-mode toggle (`Browse` | `Domains`). Under Domains, a horizontal sub-nav lists available domains. For v1: `Configs` (active) + `Maps`, `Matches`, `Assets` as disabled placeholders. The existing ConfigViewer renders under `Domains > Configs` unchanged.

### 3.2 Browse-mode layout

Three-pane composition:

- **Left (fixed ~220 px):** filter lens panel. Three sections stacked vertically.
  - *Clients Detected* - the active client highlighted, other clients (if present) listed display-only with a "switch install" affordance.
  - *Gamedirs Detected* - `id1`, `ezquake`, `qw`, plus any subfolder matching gamedir heuristics. Click to filter to that gamedir subtree.
  - *Filter by Domain* - nested list: `assets > {skins, textures, conchars, skyboxes, sounds, models, hud overlays}`, `matches > {demos, screenshots, logs}`, `configs`, `unreferenced`, `other`. Each leaf shows its count. Click to add/remove from active filter.
  - Footer: "N filters active" summary + "Clear filters" button.
- **Center (flex):** Explorer-style file tree. Every file row shows a category color band, a state dot (loaded / available / unreferenced), the filename, the resolved path, and a pak-chip when the file lives inside an archive. Active filters apply as overlays: non-matching branches dim and collapse with a "(no matches)" label; matching branches auto-expand. Virtualised rendering for folders with many children.
- **Right (fixed ~300 px):** selection detail pane. File header, preview slot (PNG/JPG inline image or Phase-2 placeholder), resolution chain (only when >1 source), file metadata, collapsible "Under the hood" (loader sites + cvar bindings + applied path rules), action buttons ("Open containing folder", "Open in Configs" for .cfg files).

Top bar: search box, Rescan button, mode toggle (above the three panes, owned by `MyQuakeTab`).

### 3.3 Component tree

```
MyQuakeTab.tsx                        (existing, extended)
  |- BrowseView.tsx                   (new, orchestrator)
  |    |- BrowseFilterLens.tsx        (new, left pane)
  |    |- BrowseTree.tsx              (new, center pane)
  |    |    |- BrowseTreeNode.tsx     (new, recursive)
  |    |- BrowseDetail.tsx            (new, right pane)
  |         |- ResolutionChain.tsx    (new, reusable)
  |- ConfigViewer.tsx                 (existing, relocated under Domains > Configs)
```

No changes to ConfigViewer. No changes to `configMerger.ts`, `AliasChainResolver.tsx`, `StatePanel.tsx`, or any simulator file.

### 3.4 Filter semantics

"Consumed by ezquake" = the union of three sets (pinned from brainstorm):

1. Files under the client's search-path gamedirs whose virtual path matches at least one `asset_loader_site.path_literal` or is the winning source for any path in the loader-site index.
2. Files referenced by any `asset_cvar_binding.path_pattern` after substituting the user's merged-config cvar value into the `{value}` slot.
3. Files the engine loads on map load (all textures/sounds/entities inside a `.bsp` - treated as "available" in v1 since we do not know which map will be played).

Files outside the client's search-path AND not referenced by any cvar binding are not consumed by ezquake. A `.bat` file or an .exe anywhere in the dir is `other`. A `.pcx` in `my_old_skins/` with no cvar pointing there is `unreferenced` (we know it is a skin; it is just dormant).

When the user applies the **ezquake client filter**, dim every tree node not in set (1) ∪ (2) ∪ (3). When the user applies a **gamedir filter** (e.g. `qw/`), dim every node outside that subtree. When the user applies a **domain filter** (e.g. `skins`), expand all branches containing category matches and dim non-matching branches. Filters compose: clicking ezquake + skins yields "skins ezquake would load under the current config."

### 3.5 Default-suppression ("Show only custom")

A toggle in the top bar suppresses files flagged `is_default = true`. Heuristic for v1:

- Files inside an archive shipped by the client install (ezQuake's standard `pak0.pak`, `pak1.pak` under `ezquake/` or `qw/`): `is_default = true`.
- Files in `id1/` that match a known-stock id1 manifest (stub in v1; initially treat all of `id1/` as default).
- Any loose file in a gamedir directory outside `id1/`: `is_default = false`.
- Any file in a user-added gamedir (detected but not in the canonical list): `is_default = false`.

The heuristic is improvable later: once `assets.quake.world` ships a manifest of known-stock asset hashes, `is_default` can be computed from a hash match instead of the shipped-archive proxy. The data model already reserves a `content_hash` slot for this (see 4.1).

### 3.6 Preview strategy

v1 supports PNG and JPG inline rendering via a plain `<img src="...">` pointed at a temporary file URL the Rust side exposes (see 5.2). Any other format shows a labelled placeholder ("preview: .pcx - decoder Phase 2") in the same slot. When the user selects a folder or archive node (not a file), the preview slot is hidden entirely.

## 4. Data model

### 4.1 `ScannedFile` - the per-file record

```ts
type Container =
  | { kind: 'loose' }
  | { kind: 'archive'; archive_path: string; entry: string };

type ScannedFile = {
  virtual_path: string;              // "qw/textures/conback.tga"
  container: Container;
  size: number;                      // bytes
  mtime: number;                     // unix seconds; archive mtime when container.kind === 'archive'
  content_hash?: string;             // sha256; unset in v1 until a consumer asks
  category_id: string | null;        // "ezquake:asset_category:texture" or null when unclassified
  confidence: 'certain' | 'heuristic' | 'seed' | 'unclassified';
  search_path_winner: boolean;       // true if this entry wins LIFO lookup for its virtual_path
  consumed_by: {
    loader_sites: string[];          // canonical_ids from asset_loader_sites
    cvar_bindings: string[];         // indices into asset_cvar_bindings with resolved matches
  };
  is_default: boolean;               // per Section 3.5 heuristic
};
```

### 4.2 `ScanResult` - the top-level scan output

```ts
type ClientInfo = {
  name: 'ezquake' | 'fte' | string;
  exe_path: string;
  version: string | null;
  active: boolean;                   // true for the currently-anchored install
};

type ExternalRef = {
  cvar_canonical_id: string;
  resolved_path: string;             // path outside the scanned root
  exists: boolean;                   // filesystem existence check, non-enumerating
};

type ArchiveInfo = {
  archive_path: string;              // "qw/pak1.pak"
  kind: 'pak' | 'pk3' | 'zip';
  size: number;
  entry_count: number;
};

type ScanWarning = {
  kind: 'archive_parse_failure' | 'permission_denied' | 'bundle_mismatch';
  path: string;
  message: string;
};

type ScanResult = {
  exe_path: string;
  scan_timestamp: number;
  root: string;                      // resolved quake-dir absolute path
  clients_detected: ClientInfo[];
  gamedirs_detected: string[];       // ["id1", "ezquake", "qw"] plus any custom
  files: ScannedFile[];              // flat; tree is derived
  archives: ArchiveInfo[];
  unresolved_external_refs: ExternalRef[];
  warnings: ScanWarning[];
  stats: {
    loaded: number;
    available: number;
    unreferenced: number;
    other: number;
    total_bytes: number;
  };
};
```

### 4.3 Derivations (computed client-side)

The tree is a pure function of `(files, filterState, hideDefaults, selectedNode)`. No separate tree data structure is stored. Grouping by disk path is a memoised derivation in `BrowseView`. Filtering is a predicate composition over `files`. Selection is a single path string.

The left-pane counts are derivations over `files`: `filterState.clients` from `clients_detected`, gamedir counts by prefix grouping, category counts by `category_id`.

## 5. Scanner architecture

### 5.1 Rust command surface

New module: `src-tauri/src/commands/browse.rs`. Registered in `mod.rs` and `tauri::generate_handler!` in `lib.rs`.

Commands:

```rust
#[tauri::command]
async fn scan_quake_dir(
    exe_path: String,
    merged_cvars: HashMap<String, String>,
) -> Result<ScanResult, String>;

#[tauri::command]
async fn hash_file(
    exe_path: String,
    virtual_path: String,
) -> Result<String, String>; // sha256 hex, lazy

#[tauri::command]
async fn open_containing_folder(
    exe_path: String,
    virtual_path: String,
) -> Result<(), String>; // opens Windows Explorer at the file's directory
```

Reuses:
- `archive.rs` for pak/pk3/zip TOC reads.
- `validate_ezquake_path` / `ezquake.rs` root-resolution helpers.
- `watcher.rs` patterns (notify-debouncer-mini) for freshness events.

### 5.2 Preview file serving

To render PNG/JPG in the webview, the Rust side exposes a command:

```rust
#[tauri::command]
async fn read_file_bytes(
    exe_path: String,
    virtual_path: String,
    max_bytes: u64,         // safety cap, v1 enforces 2 MB
) -> Result<Vec<u8>, String>;
```

Frontend turns the bytes into a blob URL for the `<img>` src. Archive-interior files go through `archive.rs` extractors. Loose files are read directly. Max 2 MB keeps the IPC channel sane; larger images fall back to the placeholder.

### 5.3 Scanner stages

1. **Resolve root.** From `exe_path`, compute the quake-dir root (parent dir of the exe).
2. **Walk the tree.** `walkdir` recursive enumeration. Skip `.git`, `.svn`, `node_modules`, and any dir whose name starts with a dot. Collect `{relative_path, size, mtime}` per file.
3. **Enumerate archive TOCs.** For every `.pak`/`.pk3`/`.zip` found, open with `archive.rs` and emit one entry per TOC row with `container.kind = 'archive'`.
4. **Classify categories.** For each entry, match `(extension, path_hint)` against `asset_extensions` from the bundle. `path_hint` disambiguates `.tga` between `texture` and `conchar`. Store `category_id` + `confidence`. No match = null category, `confidence = 'unclassified'`.
5. **Resolve loader-site + cvar-binding refs.** For each entry:
   - If any `asset_loader_site.path_literal` matches `virtual_path` (case-insensitive, last two path segments), push that `canonical_id` into `consumed_by.loader_sites`.
   - For each `asset_cvar_binding`, substitute the merged-cvar value into `path_pattern` and test if it matches `virtual_path`. Push matching indices into `consumed_by.cvar_bindings`.
6. **Apply LIFO search-path rule.** Group entries by `virtual_path`, sort by oracle's `asset_path_rules` ordinal (head of `fs_searchpaths` wins; within archives, pak ordering by number/lex). Mark winner `search_path_winner = true`.
7. **Compute `is_default`** per Section 3.5 heuristic.
8. **Flag external refs.** For cvar bindings whose resolved path escapes the scanned root, emit an `ExternalRef` with `exists = std::path::Path::exists(resolved)` but do NOT enumerate the external root.
9. **Compile stats.** Count loaded / available / unreferenced / other, sum bytes.

All stages run in sequence, single-threaded. No async inside the scan itself; the command is `async` only to keep the Tauri thread free.

### 5.4 Performance budget

Measured against the reference dataset (8,622 loose files + 96 folders + 22 GB, of which 6,600 files are demos in a single subtree, plus ~10-20 archives):

- Cold metadata scan: target < 800 ms.
- Warm rescan (OS cache hot): target < 300 ms.
- Classification + LIFO passes on ~15,000 virtual entries: target < 100 ms combined.
- Hashing a 22 GB tree would take minutes; hashing is deferred and lazy.

No progress UI in v1 because the measured times stay below the perceived-latency threshold. If a real-world install exceeds 1.5 s, revisit and add a progress event.

### 5.5 Freshness and watcher

When `scan_quake_dir` runs, register a `notify-debouncer-mini` watch on the scanned root. File-change events emit a `browse-scan-stale` Tauri event to the frontend. Frontend sets a "stale" flag and pulses the Rescan button. We do NOT auto-rescan - config edits generate bursts of events, auto-rescan would thrash. User clicks Rescan when ready.

On `exe_path` change or `MyQuakeTab` unmount, stop the watcher. Only one watcher at a time.

### 5.6 Tree rendering and virtualisation

`BrowseTree.tsx` renders the derived tree. Threshold rules:

- Root and detected gamedirs auto-expand one level on first render.
- Folders with ≤ 100 direct children auto-expand.
- Folders with > 100 direct children render collapsed with a count badge (`▸ demos/ - 6,600 files`).
- Archive entries (pak/pk3 contents) always render collapsed on first render.
- Any folder node whose direct-child count exceeds 200 uses virtualised child rendering (windowed list), regardless of expand state.

Virtualisation library: prefer `@tanstack/virtual` if it's already a dependency; otherwise a small custom windowed list (30 lines of SolidJS). Avoid adding a heavy dependency solely for this.

## 6. Integration points

### 6.1 `exePath` and config chain

`BrowseView` receives `exePath`, the current `mergedCvarMap`, and `configChain` (for change-watching) as props from `MyQuakeTab`. Same plumbing ConfigViewer uses. On `exePath` or `config` change, run `scan_quake_dir` with the new values.

### 6.2 Oracle bundle consumption

The bundle JSON is imported at build time:

```ts
// src/lib/assets/bundle.ts
import rawBundle from '../../../../packages/qw-config/src/data/ezquake-asset-bundle.json';
export const assetBundle = hydrateBundle(rawBundle);
```

`hydrateBundle` is a thin wrapper that converts the on-disk shape (objects keyed by short IDs, arrays of rows) into typed structures (`Map<categoryId, AssetCategory>`, `AssetExtension[]`, `AssetPathRule[]`, `AssetCvarBinding[]`, `AssetLoaderSite[]`) with runtime validation of the expected fields. On validation failure, log a warning and return a minimally-populated bundle so Browse degrades to "no classification" rather than crashing.

### 6.3 Cross-link to Configs domain

`BrowseDetail` renders an "Open in Configs" button for files with `.cfg` extension. Click handler:

```ts
onOpenInConfigs(file) {
  props.onModeChange('domains');
  props.onDomainChange('configs');
  props.onCompareConfigRequest(file); // existing ConfigViewer path
}
```

Other domain cross-links (`.mvd` -> Matches, `.pcx` -> Assets) render the button disabled with a tooltip ("available when the Matches domain ships"). The disabled state makes the architecture visible to the user immediately.

### 6.4 Clients tab switch

Clicking a non-active client in the left pane's Clients Detected section dispatches `setActiveTab('clients')` via `App.tsx`'s tab router prop. Does NOT auto-switch the active install - the user is handed over to Clients tab to do that deliberately.

### 6.5 Persistence

`ProfilePrefs` gains:

```ts
type BrowsePrefs = {
  my_quake_mode: 'browse' | 'domains';
  my_quake_domain: 'configs' | 'maps' | 'matches' | 'assets';
  browse_hide_defaults: boolean;
  // filter state intentionally NOT persisted - session-only
};
```

`my_quake_domain` defaults to `'configs'` (the only live domain in v1). Unsupported values (a future domain's value persisted across a downgrade) fall back to `'configs'`.

## 7. Error handling

- **Invalid or missing `exe_path`:** `BrowseView` renders the empty-state prompt: "Pick an ezQuake install in the Clients tab." No scan attempted.
- **Scan command failure (permission, IO):** `scan_quake_dir` returns `Err(String)`. `BrowseView` shows a red banner with the message and a Retry button. Rest of the app unaffected.
- **Archive parse failure:** `archive.rs` returns an error for that specific file; scanner logs it, skips the archive (treats it as a zero-entry container), and appends a `ScanWarning` with `kind: 'archive_parse_failure'`. Status-bar shows "1 archive could not be read" chip.
- **Oracle bundle validation failure:** `hydrateBundle` logs a warning, returns a shell bundle. Browse renders the tree with all files classified as `category_id: null`. User sees everything as "other" but the app still works.
- **External cvar reference to nonexistent path:** `ExternalRef.exists = false`. Shown in detail pane as "Cvar references external path (not found)".
- **Watcher registration failure:** Log, continue without file watching. User has to manually Rescan. Non-blocking.

Errors never prompt the user to resolve them inline. Every error is either a banner (scan failed) or a subtle status chip (warnings). The user decides when to Retry.

## 8. Testing

Per slipgate convention: Rust side gets unit tests for pure logic; frontend relies on manual verification + TypeScript strictness + Biome lint.

**Rust tests in `browse.rs`:**

1. **Classification.** Fake file list + mocked bundle subset. Assert:
   - `.pcx` under `skins/` -> category `skin`, confidence `certain` (if literal loader-site match) or `heuristic` (otherwise).
   - `.pcx` under `tmp/` -> category null, confidence `unclassified`.
   - `.tga` under `textures/` -> category `texture`. Same `.tga` under `conchars/` -> `conchar`.
   - `.bat`, `.exe`, unknown extensions -> category null.
2. **LIFO winner.** Same virtual_path in three sources (loose, pak1, ezquake/pak0). Assert the loose entry wins and `search_path_winner = true` is set only on that one.
3. **`is_default` heuristic.** Entry in `ezquake/pak0.pak` -> `is_default = true`. Entry in `qw/skins/haste.pcx` loose -> `is_default = false`. Entry in `id1/anything` -> `is_default = true`.
4. **Cvar-binding resolution.** Given `asset_cvar_binding.path_pattern = "skins/{value}.pcx"` and merged-cvar `enemyskin = "haste"`, assert that `qw/skins/haste.pcx` is marked with that binding in `consumed_by.cvar_bindings`.
5. **External-ref detection.** Given merged-cvar `enemyskin = "C:/external/foo.pcx"`, assert entry does NOT appear in `files` and DOES appear in `unresolved_external_refs` with the appropriate `exists` flag.

**Existing `archive.rs` tests** already cover pak/pk3 parsing; reused directly by the scanner.

**Frontend:** no component unit tests. Manual verification checklist (documented in the spec):

1. Point the app at a real quake dir with ≥ 1 pak. Open Browse. Tree renders in < 1 s.
2. Click ezquake in left pane. Non-matching branches dim.
3. Click `skins` under Filter by Domain. Matching files highlight; non-matching branches collapse to "(no matches)".
4. Select a file with a known collision (e.g. `conchars.tga` loose + in pak). Right pane shows resolution chain with loose winning.
5. Select a PNG or JPG. Right pane renders the image inline.
6. Select a `.cfg`. Right pane shows "Open in Configs" button. Click it. Mode switches to Domains > Configs with that file loaded.
7. Toggle "Show only custom". Stock install files disappear.
8. Edit a config file externally. Rescan button pulses within 1 second.
9. Click a non-active client in left pane. Tab switches to Clients.

Testing confirms shape, not exhaustive state space. Regressions surface through use.

## 9. Out of scope (explicit)

The following are OUT of v1. Each gets its own spec when its time comes:

- **Asset preview beyond PNG/JPG.** PCX, TGA, WAD, MDL, BSP viewer. Phase 2.
- **Write operations.** Delete, move, rename, edit. Phase 3 (clean-room export) and later.
- **Multi-install comparison.** Compare-across-installs UI. Future.
- **External-path enumeration.** Walking file trees outside the quake dir root. Phase 2 if usage justifies it.
- **Thumbnails generation/caching.** No thumbnail cache, no pre-rendering. PNG/JPG render through direct file read each time.
- **Central asset collection integration (`assets.quake.world`).** Data model reserves `content_hash` slot; no network calls in v1.
- **GitHub backup integration.** Separate feature, separate spec.
- **Maps, Matches, Assets domain dashboards.** Each is a future spec on its own.
- **FTE / MVDSV / KTX / QWFWD asset consumption.** Oracle Phase 2d/2e adds these; Browse extends trivially once the bundle format supports multiple projects.

## 10. Success criteria

v1 has succeeded when:

1. MyQuake's two-mode nav works; ConfigViewer still functions identically under Domains > Configs.
2. A user opens Browse, sees their quake dir as an Explorer tree with every file categorised, state-chipped, and placed in disk reality.
3. Clicking the `skins` domain filter surfaces all skins across loose files, paks, and gamedirs in under 200 ms of interaction time.
4. The resolution chain renders for a known collision case (e.g. `conchars.tga` loose + paked) showing the LIFO winner and shadowed entries.
5. PNG/JPG files render inline preview in the right pane.
6. The "Show only custom" toggle hides shipped-install noise.
7. Clicking a `.cfg` in Browse and choosing "Open in Configs" lands the user in ConfigViewer with that file loaded.
8. The scanner handles an 8,000+ file / 22 GB quake dir in under 1 s cold.
9. Unreferenced junk (Qizmo executables, old .bat files) is findable as a first-class category.

## 11. Open questions (to resolve during implementation or defer explicitly)

1. **Debounce on watcher-driven stale flag.** Set the pulse after 500 ms of event quiet? Or immediately on any event? Lean: immediate, but allow the Rescan itself to debounce.
2. **Archive-interior preview for PNG/JPG.** Are any PNGs/JPGs actually stored inside paks in the wild? If yes, the preview command needs to extract bytes via `archive.rs`. If no, skip that codepath for v1 and add when proven needed. Probably answer is yes (pk3s often contain PNG textures). Plan to support it from the start.
3. **Search box behavior.** Substring match on filename? On full virtual_path? Defer to implementation; start with filename-only, extend if it feels shallow.
4. **"Stock" detection for `id1/`.** v1 treats all of `id1/` as default. Is there a world where users put custom content in `id1/` and want it visible when Show-only-custom is on? Probably not common; defer until someone complains.
5. **Tree sort order.** Alphabetical ascending? Dirs before files? Defer to implementation; Explorer convention is dirs-first-alphabetical.

## 12. What this spec is not

- Not an implementation plan. The plan is written next as `docs/superpowers/plans/2026-04-20-quake-dir-browser-v1.md`.
- Not a commitment to pixel-exact layouts. Component shapes, state rules, and interaction semantics are pinned; visual polish is iteration territory during implementation.
- Not a commitment to a specific virtualisation library. The scanner contract and tree component behaviour are pinned; the library choice is an implementation detail.
- Not the final word on MyQuake's architecture. Future domains (Maps/Matches/Assets) may reshape Domain mode's internals; Browse mode's shell is stable regardless.
