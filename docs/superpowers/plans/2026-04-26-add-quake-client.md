# Add Quake Client — Phase 3.5b of Quake Dir Control

> **PASS-2 REVISION APPLIED 2026-04-27 evening.** Phase 3.5a (`docs/superpowers/plans/2026-04-27-clients-as-myquake-domain.md`) shipped on `d07e275` + the nav-flatten polish on `f6f2b39`; this plan now reflects post-3.5a reality. Pass-2 absorbed the reviewer's F2-F14 findings and the four open operator decisions surfaced during the 2026-04-27 design conversation. F1 (entry-point ambiguity) dissolved under 3.5a's restructure — AddClientPanel now lives inside ClientsDomain, no router-jump or modal-overlay needed. Plan is execution-ready.
>
> **What changed in pass-2** (deltas from the 2026-04-27 afternoon first-pass revision in commit `01e4081`):
> - Goal updated for honest scope (Tier-2 nudge fires only for stable + unezQuake channels in 3.5b; FTE + ezQuake-snapshot rows render identity but no upgrade-nudge UX — F14).
> - Architecture: drop "router into MyQuake → Browse → Clients filter" framing. The 3.5a + nav-flatten left MyQuake with a single flat nav: `[Browse] | [Clients] [Configs] [Maps] [Matches] [Assets]`. AddClientPanel renders inside the Clients view (`ClientsDomain.tsx`) when the user clicks "Add Quake client" on the existing VersionWarehouse panel.
> - Critical context items 7, 8, 13 rewritten — pre-3.5a framing of "MyQuake browser is passive" / "CLIENTS DETECTED sidebar" / "Clients filter view" no longer applies.
> - D6 reframed (F4): variant is a separate `variant: Option<String>` field on `WarehousedVersion`, NOT a version-key suffix. Warehouse path becomes `binaries/ezquake/3.6.6/variants/glsl/manifest.json` (nested under the version dir). Version-resolution lib stays variant-naive. Decoupling avoids contaminating oracle's snapshot-consumer downstream.
> - D7 reframed: Unknown filtering happens at the AddClientPanel checklist level, not "in MyQuake's Browse view's Clients filter" (no such filter exists post-3.5a).
> - New D9: Multi-quake-dir semantics (F10). Bulk-import dir defaults to warehouse-only without claiming the dir as primary. Promoting a dir to primary is a separate explicit action.
> - New D10: Variant-decoupled architecture detail (F4 implementation note). The version-resolution lib stays variant-naive; variants are a property of the binary, not the version.
> - New D11: release_cache per-channel cache files (F13). `release-cache/<client>-<channel>.json` keys, not `release-cache/<client>.json`.
> - Sub-phase 1 tasks updated (F4 implementation, F6 fteqw.exe canonical, F7 FTE server-build exclusion, F8 KNOWN_VARIANT_SUFFIXES trimmed to `["glsl"]`).
> - Sub-phase 2 tasks updated (F13 per-channel keys, F9 honest matcher documentation).
> - Sub-phase 3 collapsed dramatically (F2). Most of the original sub-phase 3 (Clients filter category in Browse, actionable sidebar rows) was for the pre-3.5a IA. After 3.5a, sub-phase 3 reduces to: a thin `scan_clients_in_dir` Tauri wrapper around `fingerprint_folder` + frontend wrapper. Empty-Tier-2-data UI handling moves to sub-phase 4 task 4.2 step 4 (lives in ClientImportRow.tsx).
> - Sub-phase 4 tasks updated (F1 dissolved, F3 new bulk-import orchestrator command, F5 swap_active_version for primary, F10 warehouse-only default, F11 Delete-from-disk deferred, F12 rename_to_canonical command in file-structure preview + registration steps).
> - File-structure preview updated for the new commands.
> - Self-review + What-NOT-covered updated for the new shape.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Single-button "Add Quake client" flow inside MyQuake → Clients that identifies clients in a chosen folder via PE-string fingerprinting, lets the user bulk-import all detected clients with one tick-list interaction, surfaces three-tier identity honestly (family / matched-to-official / unrecognized), and makes the "switch to latest official" path one click away from any unrecognized state.

**Honest goal scope (3.5b):** The "switch to latest official" Tier-2 nudge fires for client channels with live release-cache data — ezQuake stable, unezQuake (both via GitHub Releases), KTX/MVDSV/QWFWD (relevant for the updater consumer, not the fingerprinter directly). It does NOT fire for ezQuake snapshot or FTE in 3.5b: BuildsQuakeworld scraping for snapshot lives in the updater today and is intentionally NOT replicated into release_cache for this phase; FTE has no "official release" concept (continuous nightly builds at fte.triptohell.info). Snapshot + FTE rows render identity (family + version + verified-or-unrecognized status) but skip the upgrade-nudge UX. Both are documented stub states; future arcs widen Tier-2 coverage.

**Position in roadmap:** Phase 3.5b of Quake Dir Control — runs after Phase 3.5a (`2026-04-27-clients-as-myquake-domain.md`, shipped `d07e275`) + the MyQuake nav flatten (`f6f2b39`). Position between Phase 3 (swap + UI + delete) and Phase 4 (oracle snapshot widening). Phases 4-5 (diff viewer) only deliver value when multiple versions exist in the warehouse, which only happens at scale once Add Client exists. Sequence-wise this puts user-facing value first, internal plumbing later.

**Position in the bigger picture (added 2026-04-27 second-pass review):** This phase is the first explicit Tier 1 → Tier 2 crossing in slipgate's four-tier opt-in ladder (don't use / read-only / managed versions / full dir management — see memory `project_slipgate_tier_ladder.md`). Phase 3.5 builds the binary-domain consumer of the warehouse + swap substrate Phase 2/3 already shipped. That substrate (content-addressed blobs + per-thing manifests + top-level index + atomic-rename swap to canonical slot) generalizes to non-binary content; future arcs (asset warehouse + 1-click texture-set switching, bundle install, clean-room migration) reuse the same primitives at parallel `<data-root>/<kind>/...` roots — see HANDOVER's "Tier 3 future arcs" entry. So Phase 3.5's design choices set precedent for far more than just this feature. Two consequences worth being conscious of: (1) the action grammar Phase 3.5 establishes on Clients-Domain rows (Import / Set primary / Remove from warehouse / Switch) will be reused on every future Domain (Assets, Bundles, Maps, Matches); (2) the bulk-import flow's UI shell (entry-point button → folder/file picker → checklist with default-select-all → primary radio → bulk import) will be the same shell future bundle-install / clean-room-migration flows reuse, with only the source changing (existing files on disk → assets.quake.world catalog).

**Architecture:** A `ClientFingerprint` Rust module reads PE StringFileInfo (translation table enumeration + InternalName/ProductName/version-string lookup) to identify Quake clients in any folder slipgate scans. A `release_cache` Rust module owns per-(client, channel) GitHub Releases data (per-channel JSON files at `<data-root>/release-cache/<client>-<channel>.json`), refresh-on-launch with 24h staleness check. A new `bulk_import_clients` Rust command orchestrates the import-flow Rust side (per-row hash → register → optional canonicalize-rename → swap_active_version for the primary). The "Add Quake client" entry-point button (Phase 3 stubbed it in `VersionWarehouse.tsx`) opens an `AddClientPanel` overlay component inside MyQuake → Clients (where ClientsDomain hosts VersionWarehouse). User picks a folder or specific exe; the panel calls `scan_clients_in_dir` (a thin Tauri wrapper around `fingerprint_folder`); the panel renders a default-select-all checklist of detected clients with primary-radio; user clicks Import; the panel calls `bulk_import_clients`.

**Tech stack:** Tauri v2 + SolidJS + Rust + Bun (unchanged from earlier QDC phases). PE-string reading via `windows::Win32::Storage::FileSystem::VerQueryValueW` (already used by `ezquake.rs:read_exe_version`). Release-cache fetches via `reqwest` (already in use by `updater.rs`). Frontend tests `bun:test`.

---

## Critical context for the engineer

Read this section before starting. These gotchas are not optional knowledge.

1. **Phases 0+1+2+3+3.5a + nav-flatten are SHIPPED.** Read `apps/slipgate-app/docs/QUAKE-DIR-CONTROL.md` and the parent plan `docs/superpowers/plans/2026-04-26-quake-dir-control.md` first. Then read `2026-04-27-clients-as-myquake-domain.md` (Phase 3.5a). Then look at the current `MyQuakeTab.tsx` to see the flat-nav post-nav-flatten state. The version warehouse panel Phase 3 built (now inside `ClientsDomain.tsx`) is where the "Add Quake client" button lives; this phase wires that button to a new AddClientPanel.

2. **Tauri command registration is two-step.** Adding a new Tauri command requires `pub mod <name>;` in `src-tauri/src/commands/mod.rs` AND the `#[tauri::command]` function listed in `tauri::generate_handler![]` in `src-tauri/src/lib.rs`. Forgetting either side gives a runtime "command not found" error in the frontend, not a compile error.

3. **`ezquake.rs:read_exe_version` is the existing PE-reading model.** Lines 1763-1819 show the full pattern: `GetFileVersionInfoSizeW` → `GetFileVersionInfoW` → `VerQueryValueW` for the `\` sub-block (which gives `VS_FIXEDFILEINFO` numeric version). The new fingerprinter reuses this scaffolding but does additional `VerQueryValueW` calls for the `\StringFileInfo\<lang+cp>\<KeyName>` paths to read CompanyName, ProductName, InternalName, FileVersion, ProductVersion strings.

4. **Translation table enumeration is mandatory, not optional.** Different clients use different langid+codepage combinations:
   - ezQuake uses `040904B0` (US English / Unicode 04B0)
   - FTE uses `080904B0` (UK English / Unicode 04B0)
   - Other forks may use other combinations
   The fingerprinter MUST query `\VarFileInfo\Translation` first to get the list of available pairs, then iterate them building `\StringFileInfo\<lang+cp>\<KeyName>` paths. Hardcoding `040904B0` will fail on FTE binaries.

5. **`parse_pe_version` is now `pub` in `commands/updater.rs:157`** (made pub during Phase 2 normalization fix `ae875ca`). Reuse it for normalizing version strings from numeric VS_FIXEDFILEINFO when needed; it's the canonical helper for the "3.6.6.7947" → "3.6.6" conversion.

6. **`read_exe_version` is Windows-only.** `commands/ezquake.rs:1765` is `#[cfg(target_os = "windows")]`; the Linux fallback returns None. WSL dev mode cannot read PE versions. The same pattern applies to ALL PE-string reading. The new `ClientFingerprint` module returns `Unknown` on non-Windows. Tests use Windows-only `#[cfg(target_os = "windows")]` guards or fixture data that doesn't depend on PE parsing.

7. **MyQuake's IA after 3.5a + nav-flatten:** flat top-row nav `[Browse] | [Clients] [Configs] [Maps] [Matches] [Assets]` with `[Rescan] [Dump inventory]` right-aligned. Clients view is rendered by `ClientsDomain.tsx` and contains Installation + Versions sections (the Versions section IS the Phase 3 `VersionWarehouse.tsx` panel, with the existing stubbed "Add Quake client" button). This phase ADDS an `AddClientPanel` component that opens as an overlay (or replaces ClientsDomain content temporarily) when the user clicks the Add-Client button, and handles the bulk-import flow. ClientsDomain itself doesn't gain new sections — AddClientPanel is a transient sibling surface.

8. **The CLIENTS DETECTED sidebar from pre-3.5a is gone.** It was a Browse-mode-only sidebar listing detected clients in the user's quake dir. After 3.5a, client management is in the Clients view (Domain), not in Browse's sidebar. This phase does NOT bring it back. The "what clients are detected in this folder" list now appears inside AddClientPanel's checklist when the user explicitly initiates an Add-Client flow with a chosen folder.

9. **Updater already fetches GitHub Releases — and stays as-is in Phase 3.5.** `commands/updater.rs:fetch_github_releases` (around line 182) is the existing ad-hoc fetch. Phase 3.5 adds `release_cache` module as a parallel system for the fingerprinter's Tier-2 lookup needs. Consolidating updater to consume `release_cache` is **deferred to a future cleanup arc** — touching shipped/working code for a non-functional consolidation isn't worth the regression risk in this phase. Two systems coexist for now; consolidation lands when there's a functional reason to touch the updater (e.g. future "release notes panel" feature).

10. **No new heavy Rust deps.** `reqwest`, `serde_json`, `sha2`, `tokio` are all already in `Cargo.toml`. The release-cache fetches use `reqwest`; cache files use `serde_json`. No new crates needed.

11. **FTE distribution model is fundamentally different.** FTE has no concept of "official release" — it's continuous nightly builds at `fte.triptohell.info` with build numbers in the thousands. The `release_cache` module's per-client policy MUST treat FTE differently: skip Tier 2 entirely. The fingerprinter classifies FTE binaries as "FTE QW (build NNN)" without judgment. The upgrade-nudge UX for FTE becomes "build NNN is from <date>; latest available is build MMM" rather than "this is unrecognized."

12. **Default-select-all is the bulk-import policy** (operator's stated workflow: "i can just import all"). When the user opens the Add Client checklist, every detected client row is pre-ticked. User unticks the ones they don't want; the affirmative bulk action ("Import selected") is the primary CTA. This matches operator's actual workflow on a multi-version quake dir AND nudges users toward an organized warehouse.

13. **Unknown / non-client exes are filtered before the user sees the import list.** AddClientPanel's checklist shows ONLY fingerprinter-classified clients (ezQuake / unezQuake-family / FTE). Tools (qizmo, qwdtools), debug symbols (`.exe.db`), generic utilities (wget), and unrecognized binaries are NOT in the checklist — there's no "tick this random.exe to import" option. The fingerprinter's Unknown classification is a pre-filter; `scan_clients_in_dir` already drops Unknown rows server-side so they never cross the Tauri boundary.

14. **No FTE config parsing in this phase.** The fingerprinter classifying a binary as FTE means slipgate knows to warehouse it as an FTE client. It does NOT mean slipgate can read FTE configs, classify FTE binds, or interact with FTE's gamedir conventions. That's a separate massive arc tracked elsewhere. This phase produces "switch between exes" capability for FTE; understanding FTE's content is future work.

15. **unezQuake repo is locally cloned** at `research/repos/unezquake/` (gitignored). Use it for authority lookups during fingerprinter development — e.g., confirming what their .rc file says, what cvars distinguish them from vanilla ezQuake, what their GitHub Releases naming scheme is.

16. **Slipgate dev devtools `invoke()` calls don't work** (per `reference_slipgate_devtools_invoke.md`). For Phase 3.5 verification, prefer filesystem inspection (`<data-root>/release-cache/<client>.json`, `<data-root>/binaries/<client>/<version>/manifest.json`) and PowerShell one-liners over devtools-driven checks.

---

## Design decisions

These resolve structural choices made during the 2026-04-26 evening design conversation. Each is written as **decision + rationale + which sub-phase implements it**.

### D1. Single button entry point inside ClientsDomain

**Decision:** The "Add Quake client" button (Phase 3 stubbed it inside `VersionWarehouse.tsx`) opens an `AddClientPanel` component inside the same MyQuake → Clients view. The panel can render as an overlay over the existing Versions list, or as a temporary mode-replacement of the Clients view, or inline above the Versions list — all three are within the design space; pick during sub-phase 4 task 4.3 by what feels right against the live app.

**Why:** Operator's stated framing: "i would attempt to make it a single point of entry to simplify it for the user. Add Quake client, and then we have some good ui that guides the user to show us to the quake folder to scan, or a direct exe." Discovery-and-curation in one step replaces the alternatives of either auto-importing everything found (warehouse bloat) or refusing to act (forces user to type paths).

Pre-3.5a versions of this plan said "router into MyQuake → Browse → Clients filter" — that framing dissolved because (a) Browse's Clients filter never existed, (b) 3.5a moved client management out of Browse and into Domains, (c) Browse is gated on `props.exePath` and a Tier 1 → Tier 2 user has no exePath yet so Browse is a dead end for the entry. ClientsDomain hosts everything client-related; AddClientPanel slots in there cleanly.

**Phase:** Sub-phase 4 (entry-point flow).

### D2. Default-select-all in the import checklist

**Decision:** When the user opens the Clients filter checklist, every detected client row is pre-ticked. Primary CTA is "Import selected." User unticks rows they don't want; if they want only one, they untick the others.

**Why:** Operator's workflow: "i can just import all, so i have a functional overview of what my quake dir consist of and i can easy switch to another." Default-select-all matches that workflow with one click ("Import selected") rather than N clicks to tick each row. Also nudges toward an organized warehouse — even users who weren't planning to "import everything" get the value of "now I know what's in my quake dir" without extra friction.

For users who only want one client warehoused (operator's "perfect world" target state), the cost is N-1 unticks — still trivial for typical dirs (1-5 clients).

**Phase:** Sub-phase 4 (entry-point flow).

### D3. release_cache as a parallel module; updater refactor deferred

**Decision:** New `commands/release_cache.rs` module owns GitHub Releases data fetching for Phase 3.5's fingerprinter Tier-2 lookups. Caches at `<data-root>/release-cache/<client>-<channel>.json` (per D11 — per-channel keying, not per-client). Refresh-on-launch with 24-hour staleness check. Phase 3.5 does **NOT** refactor `commands/updater.rs:fetch_github_releases` to consume `release_cache` — the two systems coexist as parallel fetchers for now. Consolidation is deferred to a future cleanup arc.

**Why coexistence over refactor:**

- Updater is shipped, working, and not under active development. Refactoring it to consume `release_cache` is a non-functional consolidation. Phase 3.5's risk surface is already substantial (PE-string parsing, MyQuake actionability, bulk-import flow); adding updater regression risk for no user-visible benefit is bad ROI.
- Two GitHub Releases fetchers in one app is mildly wasteful (~2KB per refresh, both 24-hour cached) but not harmful.
- Consolidation has a natural future trigger: when a feature like "release notes panel" or "show me what changed in 3.6.10" lands, it'll want the same data both updater and `release_cache` already fetch. That's the moment to consolidate — not a speculative cleanup pass during 3.5.

**Why a shared module at all (vs `release_cache` living inside the fingerprinter):**

- Fingerprinter needs the full release list per client to test "is this version official?" (Tier-2 lookup).
- `release_cache` is small and content-shaped (clients have releases; releases have metadata). Easier to test in isolation than as a fingerprinter sub-component.
- Future asset/bundle work likely wants its own catalog cache (parallel `asset_catalog_cache` against assets.quake.world); shipping `release_cache` as a clean module establishes the pattern for those parallels.

**Phase:** Sub-phase 2 (release_cache module only — no updater refactor in this phase).

### D4. Substring-not-regex fingerprinting

**Decision:** Version-string matching uses substrings (case-insensitive), not regex patterns. The unezQuake-family rule is `version_string contains "antilag"`, not `^3\.\d+-dev-alpha\d+-antilag-r\d+$` or any other structural pattern.

**Why:** Projects evolve naming schemes. dusty-qw/unezquake demonstrated this in operator's real binary: version `3.6-dev-alpha10-antilag-r402` (pre-public era) vs modern `1.x` semver releases. A regex matching the old form fails on the new form and vice versa. The substring `antilag` is invariant — it's the project's identity, present in every version string and in every cvar grouping under "Antilag Support" in their README.

Captured in `feedback_substring_not_regex_fingerprinting.md` as a reusable principle.

**Phase:** Sub-phase 1 (ClientFingerprint module).

### D5. Per-client distribution policy table

**Decision:** Different clients have fundamentally different distribution shapes. The three-tier identity model (family / matched-to-official / unrecognized) doesn't apply uniformly. Per-client policy:

| Client | Distribution model | Tier 2 viable? |
|---|---|---|
| ezQuake stable | GitHub Releases (~30) | Yes |
| ezQuake snapshot | builds.quakeworld.nu (rolling) | Yes (live) |
| KTX | GitHub Releases (~30) | Yes |
| MVDSV | GitHub Releases (~30) | Yes |
| QWFWD | GitHub Releases (~30) | Yes |
| unezQuake | GitHub Releases (~30+) at dusty-qw/unezquake | Yes |
| FTE | Continuous nightly builds at fte.triptohell.info | **No** |

For FTE, asking "is this an official release?" doesn't map. Skip Tier 2 entirely; classify as `FTE QW (build NNN)` without judgment. Upgrade-nudge becomes "build NNN is from <date>; latest available is build MMM."

**Why:** Forcing FTE through a Tier 2 check would either (a) require maintaining a list of thousands of build numbers as "official" (pointless — they all are), or (b) classify every FTE binary as "unrecognized" (false). Different clients want different policies; the per-client table is the cleanest way to encode that.

**Phase:** Sub-phase 2 (release_cache module).

### D6. Variant tiebreaker rule (filename-suffix → separate variant field, NOT version key)

**Decision:** When the same client+version exists with different bytes (different sha256) due to a known filename-suffix variant (e.g. ezQuake 3.6.6 shipping as `ezquake.exe` AND `ezquake-glsl.exe`), the variant is stored as a **separate `variant: Option<String>` field on `WarehousedVersion`**, NOT as a suffix on the version key. The warehouse path nests variants under the version dir:

- `binaries/ezquake/3.6.6/manifest.json` — vanilla 3.6.6
- `binaries/ezquake/3.6.6/variants/glsl/manifest.json` — glsl variant of 3.6.6

Recognized variant suffixes (sub-phase 1's `KNOWN_VARIANT_SUFFIXES`): `["glsl"]` only — the broader list (`debug`, `dev`, `test`) was trimmed during pass-2 review per F8 because those suffixes too easily false-positive on user files like `myezquake-test.exe`. Add suffixes back as needed when a concrete case arrives.

Unknown filename suffixes fall through to refuse-and-prompt: "You already have ezQuake 3.6.6 warehoused. This binary has different bytes — replace, keep with custom variant tag, or skip?"

**Canonical-naming under D8.** Variants are canonical-named with a stable suffix. The variant's canonical slot is `<quake-dir>/<family>-<variant>.exe` (e.g. `<quake-dir>/ezquake-glsl.exe`). Switching to a `-glsl` version writes to `ezquake-glsl.exe`; switching to vanilla writes to `ezquake.exe`. Both can coexist as separate canonical slots in the same dir because they're separate canonical *files*, each with its own active version pointer in `index.json`.

**Why decouple variant from version key (pass-2 reframe per F4):** The first-pass D6 encoded variant in the version key (`3.6.6-glsl`). That contaminates the shared `qw-version-resolution` lib (`packages/qw-version-resolution/`): `parseVersionSpec("3.6.6-glsl")` returns `{kind: "tag", value: "3.6.6-glsl"}` which sorts lexically between `3.6.6` and `3.6.7` — fine for adjacent display, but oracle's snapshot consumer (Phase 4/5 diff viewer) keys `first_seen_version` / `last_seen_version` / `default_history` by the same VersionSpec strings. A glsl variant whose engine cvars are byte-identical to vanilla 3.6.6 would not match any oracle row keyed on "3.6.6" — it would falsely appear to introduce/retire cvars.

Decoupling: variant becomes an orthogonal axis. Version-resolution lib stays variant-naive. Oracle's snapshot consumer keeps treating "3.6.6" as one row. Variants are a property of the binary instance, not the version. See D10 for the architectural detail.

**Why these are real cases:** Variants are an ezQuake-historical reality (old GLSL builds shipped alongside vanilla). Without the variant axis, collisions silently overwrite manifests at register time (only second-imported manifest sticks). The fix is small (one filename inspection at register time + a nested manifest path) and prevents data loss.

**Phase:** Sub-phase 1 (ClientFingerprint module exposes `variant: Option<String>` from filename inspection); sub-phase 4 (`bulk_import_clients` orchestrator passes variant to register_version which writes the nested manifest path).

### D7. Unknown clients filtered before the user sees the checklist

**Decision:** AddClientPanel's checklist shows ONLY fingerprinter-classified clients (ezQuake / unezQuake-family / FTE). Tools, debug symbols, generic utilities, and unrecognized binaries are NOT in the checklist. The fingerprinter's Unknown classification is a pre-filter applied server-side: `scan_clients_in_dir` calls `fingerprint_folder` and drops Unknown rows before returning.

**Why:** Importing `qizmo.exe` or `wget.exe` as a "Quake client" is meaningless; offering it as an option degrades the import experience. Users who genuinely have a custom client we don't recognize can fall back to the foreign-exe Import affordance Phase 3 already shipped (commit `e157e42`) on the VersionWarehouse panel, which works on a single user-pointed exe path and doesn't require fingerprint classification.

**Phase:** Sub-phase 3 (`scan_clients_in_dir` server-side filter); sub-phase 4 (no Unknown rows ever reach AddClientPanel's checklist).

### D8. Canonical-only naming for slipgate-managed binary slots

**Decision:** When slipgate writes a client binary into a user's quake dir, the destination is always `<quake-dir>/<family>.exe` (`ezquake.exe`, `unezquake.exe`, `fte.exe`, etc.) — or for filename-suffix variants per D6, `<quake-dir>/<family>-<variant>.exe`. No mode toggle. No per-import-decision. Canonical-only.

This applies in every code path that writes a binary:
- **Updater install** — already canonical (atomic rename to `ezquake.exe`).
- **Phase 3 swap** — already canonical (`swap_active_version` writes to the canonical slot).
- **Phase 3.5 bulk-import** — canonical via the canonicalize-on-import step in sub-phase 4 (rename source if non-canonical, with user confirmation when canonical slot is empty; refuse with prompt when canonical slot already exists).
- **Future fresh-install / clean-room migration / bundle install** — canonical by construction.

**Why:** The product is a four-tier opt-in ladder (don't use / read-only / managed versions / full dir management — see memory `project_slipgate_tier_ladder.md`). Users who don't want slipgate to canonicalize their files express that by staying at Tier 0 or Tier 1 — slipgate doesn't write at all in those tiers, so naming policy is moot. There's no need for a Tier-2-flavor that writes-but-preserves-filenames.

The originally-considered "default canonical with messy-mode opt-out" framing was dropped during the 2026-04-27 second-pass review because:

1. **Side-by-side simultaneous binaries is portable-mode multi-install territory**, not messy-mode territory. Phase 1 already shipped portable-mode (`<exe-dir>/data/portable.flag`). A user who genuinely needs two ezQuake binaries runnable at once sets up two quake dirs each with their own portable slipgate root. Each dir has its own canonical `ezquake.exe`. Both runnable, both Steam-pinnable. No toggles in slipgate's product.

2. **Bundles will absorb most "I want multiple setups" needs anyway.** "I want my slackers_tp setup AND my custom setup, switch with one click" is a bundle-switching question (different teamsay configs / HUD overlays / scoreboard graphics layered on top of a shared binary), not a binary-version question. See HANDOVER's "Tier 3 future arcs" entry.

3. **The misleading-state UX bug is concrete.** Phase 3's brief filename-preserving polish (commit reverted in `f6fe481`) produced files named `ezquake-3.6.6.exe` containing 3.6.9 bytes after a switch. Canonical-only eliminates this class of bug entirely.

4. **Steam pins / Discord rich-presence / batch files / shortcuts** all reference paths. Canonical-only means version switches preserve every external integration the user has set up. Preserve-mode breaks all of them on every switch.

**Profile schema gain (small, plural-shaped per D9):** Add `setups[0].quake_dirs: QuakeDirEntry[]` array (NOT a singular `quake_dir: string`). `QuakeDirEntry` shape: `{ path: string, role: "primary", label?: string }`. In 3.5b only `role: "primary"` exists and the array contains at most one entry. The plural shape is intentional: future Tier-3 arcs (clean-room migration, player-profile bundles) add entries with future role values without further schema migration. Migration: existing v2 profile with `client.exe_path` populated produces `quake_dirs: [{ path: <parent of exe_path>, role: "primary" }]`. One-shot migrator on profile load. The canonical exe per family is fully derivable: `<primary.path>/<family>.exe` (or `<family>-<variant>.exe` for variants).

**No Settings tab toggle.** Drop. Phase 3.5 does NOT add Settings UI for canonical-mode.

**No mode-switching prompts.** Drop. There are no modes.

**Phase:** Sub-phase 4 (canonicalize-on-import step in the bulk-import flow); profile schema migration is a pre-step in App.tsx mount.

### D9. Single primary quake dir; bulk-import refuses non-primary picks (schema plural-shaped for future)

**Decision:** Slipgate manages exactly one primary quake dir. AddClientPanel's folder picker either matches that primary, or sets it on first run. Foreign-dir picks are refused with a friendly error. Schema is plural-shaped (`quake_dirs: QuakeDirEntry[]`) so future Tier-3 arcs (clean-room migration, player-profile bundles) add entries without a second schema migration; in 3.5b the array has exactly one `role: "primary"` entry.

Three cases under bulk-import:

1. **Profile has no primary entry yet** (first-launch / fresh-install user): the picker is unrestricted; the picked folder becomes the primary. Set `setups[0].quake_dirs = [{ path: <picked>, role: "primary" }]`. AddClientPanel renders "I'll set this folder as your primary Quake dir" notice.

2. **Profile has a primary entry, picked folder matches** (after path normalization — case-folding, trailing-slash, symlink resolution): bulk-import proceeds normally — canonicalize-rename inside the dir, swap_active_version for the primary row.

3. **Profile has a primary entry, picked folder is different**: refuse the import. AddClientPanel shows a friendly error: "slipgate is managing `<existing_primary_path>`. The folder you picked is somewhere else. To browse there, change your primary dir first (currently no UI — point slipgate at a new exe via the path picker on Versions, or wait for Tier-3 features)." User navigates back, picks the primary dir, retries.

**Why this is the right shape (replaces pass-1's "warehouse-only-without-claiming"):** Operator clarification 2026-04-27 evening: slipgate isn't designed for multiple simultaneously-managed quake dirs. There's no UI path for it; users don't expect it. The "warehouse-only-from-foreign-dir" path was a footgun (warehoused bytes from `D:\OldQuake\` are silently switchable INTO `C:\Quake`'s canonical slot — surprising). Refusing foreign picks keeps the model honest: one primary, one source of truth, no surprise switches.

**Why plural-shaped schema even though we're enforcing single primary in 3.5b:** Future Tier-3 arcs need multi-dir support. Clean-room migration produces a fresh slipgate-managed dir; the user's old messy dir might stick around as a `role: "secondary-readonly"` registered dir for browsing. Player-profile bundles might create `role: "profile"` dirs for A/B switching between "your setup" and "Milton's setup" without bulldozing yours. Schema-once: the `quake_dirs: QuakeDirEntry[]` shape accommodates future role values without breaking existing consumers. Migrating from `quake_dir: string` later would force every consumer to update; doing it once now is cheaper.

This matches the "tier crossing is button-click, not global setting" principle from `project_slipgate_tier_ladder.md` — Tier 2 is single-primary; Tier 3 features earn their entries by the user explicitly invoking them.

**Phase:** Sub-phase 4 (refuse-foreign-pick logic in AddClientPanel + `bulk_import_clients` Rust orchestrator validates against existing primary entry; schema migration in store.ts's `migrateProfile()`).

### D10. Variant decoupled from version-resolution lib (architectural detail)

**Decision:** Variants are stored as `variant: Option<String>` on `WarehousedVersion`, with manifest path nested as `binaries/<client>/<version>/variants/<variant>/manifest.json`. `qw-version-resolution`'s `VersionSpec` parser stays variant-naive — `parseVersionSpec("3.6.6")` is the same parse regardless of which variant of 3.6.6 is being looked at.

This is the architectural follow-through on D6's reframe. Two consequences:

- **Oracle snapshot consumer (Phase 4/5 diff viewer)** keys on the version-resolution lib's `VersionSpec` strings. With variant decoupled, the diff viewer reads "ezQuake 3.6.6" as one canonical row; if the user has both vanilla and glsl variants warehoused, the diff viewer doesn't double-count or mis-attribute cvars. Both warehouse manifests reference the same upstream version's data.

- **Future oracle work** — when oracle gets multi-variant awareness (engine has multiple build variants like glsl/non-glsl that genuinely diverge in cvar set, e.g. `r_lerpframes` may exist only in glsl), the variant axis can be added orthogonally to the version axis without breaking either. Today this isn't a concern: glsl variants are byte-different but cvar-identical-to-vanilla per known evidence; the architecture just leaves room for future divergence.

**Why architectural-D, not just-an-implementation-detail-of-D6:** The decoupling decision is load-bearing for cross-codebase work (oracle + slipgate + version-resolution lib all stay clean). Worth documenting as its own D so future Claude reading the plan understands why it's not just "convenience field."

**Phase:** Sub-phase 1 (ClientFingerprint emits variant); sub-phase 4 (register_version stores it nested); no version-resolution lib changes needed.

### D11. release_cache keys per-(client, channel), not per-client

**Decision:** Cache files at `<data-root>/release-cache/<client>-<channel>.json`, NOT `<data-root>/release-cache/<client>.json`. Examples:
- `release-cache/ezquake-stable.json` — GitHub Releases for ezQuake stable channel
- `release-cache/ezquake-snapshot.json` — Stub/empty in 3.5b (BuildsQuakeworld scraper deferred)
- `release-cache/ktx-stable.json`
- `release-cache/mvdsv-stable.json`
- `release-cache/qwfwd-stable.json`
- `release-cache/unezquake-stable.json`
- `release-cache/fte-builds.json` — Stub/empty in 3.5b (`fte.triptohell.info` scraper deferred)

`distribution_for(client, channel)` returns the right `DistributionShape` for each pair. `matches_official_release(cache, version_str)` operates on a single per-channel cache.

**Why:** Reviewer's F13. ezQuake stable + ezQuake snapshot have completely different distribution shapes (GitHub Releases vs builds.quakeworld.nu scrape). Keying by `(client, channel)` separates them cleanly without forcing the cache file's internal shape to embed both arrays. Future asset-warehouse / bundle-cache files can follow the same `<thing>-<axis>.json` pattern.

**Phase:** Sub-phase 2 (release_cache module structure).

### D12. Primary-radio uses `swap_active_version`, not `reconcile_active_version`

**Decision:** When AddClientPanel's import flow finishes processing all ticked rows, it calls `swap_active_version(client, target_version, quake_dir, target_exe_name)` for the primary-selected row. NOT `reconcile_active_version`.

**Why:** Reviewer's F5 caught a concrete failure case in pass-1's plan: `reconcile_active_version` observes whatever bytes happen to be at the canonical exe path and marks that version active. Iteration order over `std::fs::read_dir` is filesystem-dependent. If the user picks 3.6 as primary but `ezquake-3.5.exe` happens to be processed first (gets renamed to `ezquake.exe`), then `ezquake-3.6.exe` hits the "canonical occupied → skip rename" branch, then reconcile hashes `ezquake.exe` and finds 3.5 → user's primary choice is silently ignored.

`swap_active_version` writes the chosen version's bytes to the canonical slot (atomic rename via Phase 3's existing logic) and updates `index.active` directly. Authoritative regardless of iteration order.

**Phase:** Sub-phase 4 (`bulk_import_clients` orchestrator final step calls `swap_active_version` with the primary row's target).

---

## File-structure preview

**New Rust modules** (sub-phases 1-2):
- `src-tauri/src/commands/client_fingerprint.rs` — PE StringFileInfo reader + classification rules + variant detection. New Tauri commands: `fingerprint_exe(path)`, `fingerprint_folder(folder)`, `scan_clients_in_dir(folder)` — last is a thin wrapper around fingerprint_folder that drops Unknown rows server-side (per D7).
- `src-tauri/src/commands/release_cache.rs` — GitHub Releases fetch + per-(client, channel) cache (per D11). New Tauri commands: `get_release_cache(client, channel)`, `refresh_all_release_caches()`.
- `src-tauri/src/commands/bulk_import.rs` — orchestrator command `bulk_import_clients(rows, primary_row_index, quake_dir)` (per F3) that handles per-row hash → register → optional canonicalize-rename → swap_active_version for the primary (per D12). Plus a small helper `rename_to_canonical(source_path, family, variant?)` exposed as its own Tauri command for AddClientPanel to invoke during the per-row confirmation prompts (per F12).

**Modified Rust files**:
- `src-tauri/src/commands/mod.rs` — register new modules
- `src-tauri/src/lib.rs` — register new Tauri commands (`fingerprint_exe`, `fingerprint_folder`, `scan_clients_in_dir`, `get_release_cache`, `refresh_all_release_caches`, `bulk_import_clients`, `rename_to_canonical`)
- `src-tauri/src/commands/version_warehouse.rs` — extend `WarehousedVersion` with `variant: Option<String>` field; nested manifest path under `binaries/<client>/<version>/variants/<variant>/manifest.json` (per D6 + D10). `register_version_at` accepts an optional variant arg.
- `src-tauri/src/commands/updater.rs` — NO refactor in this phase per D3. `release_cache` lives as a parallel system; updater stays as-is.

**New SolidJS files** (sub-phases 3-4):
- `src/lib/quake-dir/clientFingerprint.ts` — frontend wrapper for `fingerprint_exe`, `fingerprint_folder`, `scan_clients_in_dir`
- `src/lib/quake-dir/clientFingerprint.test.ts`
- `src/lib/quake-dir/releaseCache.ts` — frontend wrapper for `get_release_cache`, `refresh_all_release_caches`
- `src/lib/quake-dir/releaseCache.test.ts`
- `src/lib/quake-dir/bulkImport.ts` — frontend wrapper for `bulk_import_clients`, `rename_to_canonical`
- `src/lib/quake-dir/bulkImport.test.ts`
- `src/lib/quake-dir/addClientFlow.ts` — orchestrates the import flow (calls scan → match against cache → emit checklist data → invoke bulk_import_clients on confirm)
- `src/lib/quake-dir/addClientFlow.test.ts`
- `src/components/AddClientPanel.tsx` — folder/exe picker + checklist + primary-radio + import button UI; renders inside ClientsDomain (per D1)
- `src/components/ClientImportRow.tsx` — single-row component with three-tier identity surfacing + empty-Tier-2-data graceful handling (per F9 + F14)

**Modified SolidJS files**:
- `src/components/ClientsDomain.tsx` — host AddClientPanel as an overlay-or-mode-replacement when the user clicks "Add Quake client" on the existing VersionWarehouse panel (per D1). The Versions section's stubbed button gets wired up; the rest of ClientsDomain stays unchanged.
- `src/components/VersionWarehouse.tsx` — wire the "Add Quake client" button to set the AddClientPanel-open signal in ClientsDomain (or use a shared signal/context — pick during sub-phase 4).
- `src/store.ts` — `Setup` interface gains `quake_dirs: QuakeDirEntry[]` field (top-level on Setup, not nested under `client`). Type: `interface QuakeDirEntry { path: string; role: "primary"; label?: string; }`. In 3.5b only `role: "primary"` exists, array contains 0 or 1 entry. Derived from `setups[0].client.exe_path` parent on first migration of a v2 profile. `migrateProfile()` handles the one-shot migration. Plural-shaped per D9 to accommodate future Tier-3 role values without further migration. No `clients[family].mode` field; canonical-only naming (D8) makes per-family mode unnecessary.

**Profile schema gain (per D8 + D9):** as listed above under store.ts. Single new field (`quake_dirs`), single migration step, no schema-version bump (still v2 — duck-typing detects whether `quake_dirs` is present). The role-string-union grows in future arcs (`"primary" | "secondary-readonly" | "profile" | ...`) without changing the array shape.

---

## Sub-phase 1: ClientFingerprint Rust module

**Sessions:** 1 (~2-3 hours)
**Goal:** Pure-Rust module that takes a path and returns a `ClientFingerprint` enum classifying it as ezQuake / unezQuake-family / FTE / Unknown, with version + variant. Includes the FTE server-build exclusion (F7), trimmed `KNOWN_VARIANT_SUFFIXES` (F8), and the family→canonical-filename mapping with FTE-specific override (F6: `fteqw.exe`, not `fte.exe`).

### Task 1.1: Module skeleton + types

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/client_fingerprint.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Define enum + result type**

```rust
// apps/slipgate-app/src-tauri/src/commands/client_fingerprint.rs
use std::path::Path;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ClientKind {
    EzQuake,
    UnezQuakeFamily,
    Fte,
    Unknown,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ClientFingerprint {
    pub kind: ClientKind,
    pub version: Option<String>,        // raw version string from PE FileVersion or ProductVersion
    pub variant: Option<String>,        // filename-derived variant suffix (e.g., "glsl", "debug")
    pub product_name: Option<String>,   // raw PE ProductName
    pub internal_name: Option<String>,  // raw PE InternalName
    pub original_filename: Option<String>, // raw PE OriginalFilename
}

#[cfg(target_os = "windows")]
fn read_pe_strings(path: &Path) -> Option<PeStrings> {
    // ... uses windows crate, mirrors read_exe_version pattern in ezquake.rs
    // Enumerates translation table, queries each for InternalName, ProductName,
    // FileVersion, ProductVersion, OriginalFilename, CompanyName, FileDescription
    todo!()
}

#[cfg(not(target_os = "windows"))]
fn read_pe_strings(_path: &Path) -> Option<PeStrings> {
    None
}

#[derive(Default, Debug)]
struct PeStrings {
    company_name: Option<String>,
    product_name: Option<String>,
    file_version: Option<String>,
    product_version: Option<String>,
    file_description: Option<String>,
    original_filename: Option<String>,
    internal_name: Option<String>,
}
```

- [ ] **Step 2: Wire `pub mod client_fingerprint;` in commands/mod.rs**

### Task 1.2: PE StringFileInfo reader

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/client_fingerprint.rs`

- [ ] **Step 1: Implement read_pe_strings on Windows**

Pattern: mirror `ezquake.rs:read_exe_version` for the size + load + first-VerQueryValue (root sub-block) calls, then add the additional VerQueryValue calls:

1. Query `\VarFileInfo\Translation` to get the list of (lang, codepage) pairs
2. For each pair, build sub-block paths like `\StringFileInfo\<langhex+cphex>\InternalName` etc.
3. Query each KeyName (InternalName, ProductName, CompanyName, FileVersion, ProductVersion, OriginalFilename, FileDescription) under each translation; first hit wins per key

Reference the `windows::Win32::Storage::FileSystem::VerQueryValueW` signature; the lang+cp value is two u16 words at the returned pointer. Format as zero-padded hex like `040904B0`.

Return None if `GetFileVersionInfoSizeW` returns 0 (no version info present).

- [ ] **Step 2: Add 3 unit tests using fixture-style approach**

Pure-Rust tests can't easily exercise the PE reader without real Windows binaries. Two approaches:

- (a) Mark the read_pe_strings tests `#[cfg(target_os = "windows")]` and use small fixture binaries (e.g., bundled in `tests/fixtures/` if any exist; otherwise skip)
- (b) Skip direct read_pe_strings tests and exercise the classification logic separately (see Task 1.3)

Default to (b) for portability — write classification tests that take `PeStrings` literals and call the classifier function directly.

### Task 1.3: Classification rules

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/client_fingerprint.rs`

- [ ] **Step 1: Implement classify_from_pe_strings**

```rust
pub fn classify_from_pe_strings(pe: &PeStrings, filename: &str) -> ClientKind {
    // FTE check first — InternalName is the most stable signal.
    // BUT: FTE server build (fteqw-sv.exe) shares InternalName="ftequake" with the client
    // (same winquake.rc resource file). Filter the server build out via filename or
    // FileDescription. Per F7.
    if pe.internal_name.as_deref() == Some("ftequake") {
        let stem = filename.trim_end_matches(".exe").to_ascii_lowercase();
        let is_server = stem.starts_with("fteqw-sv")
            || stem.ends_with("-sv")
            || pe.file_description.as_deref().map_or(false, |d|
                d.to_ascii_lowercase().contains("server")
            );
        if is_server {
            return ClientKind::Unknown;
        }
        return ClientKind::Fte;
    }

    // ezQuake family check via ProductName
    if pe.product_name.as_deref() == Some("ezQuake") {
        // Distinguish ezQuake vs unezQuake-family via version string substring
        let version_str = pe.product_version.as_deref()
            .or(pe.file_version.as_deref())
            .or(pe.file_description.as_deref())
            .unwrap_or("");

        if version_str.to_ascii_lowercase().contains("antilag")
            || version_str.to_ascii_lowercase().contains("unezquake")
        {
            return ClientKind::UnezQuakeFamily;
        }
        return ClientKind::EzQuake;
    }

    ClientKind::Unknown
}
```

Note the signature change vs pass-1: classifier now takes `filename` because the FTE server-build exclusion needs filename info that isn't available in PE strings alone. Update the test call sites accordingly.

- [ ] **Step 2: Variant suffix detection from filename (per F8 — narrowed list)**

```rust
// Trimmed from the original ["glsl", "debug", "dev", "test"] per F8:
// "-test" / "-dev" too easily false-positive on user files (e.g. myezquake-test.exe).
// Add suffixes back as needed when concrete cases arrive.
const KNOWN_VARIANT_SUFFIXES: &[&str] = &["glsl"];

pub fn variant_from_filename(filename: &str) -> Option<String> {
    let stem = filename.trim_end_matches(".exe").to_ascii_lowercase();
    for suffix in KNOWN_VARIANT_SUFFIXES {
        if stem.ends_with(&format!("-{}", suffix)) {
            return Some(suffix.to_string());
        }
    }
    None
}
```

- [ ] **Step 2b: Family → canonical-filename mapping (per F6)**

```rust
/// The canonical exe filename for a family in a managed quake dir.
/// Variants append `-<variant>` before the .exe suffix.
pub fn family_canonical_exe(kind: ClientKind, variant: Option<&str>) -> Option<String> {
    let base = match kind {
        ClientKind::EzQuake => "ezquake",
        ClientKind::UnezQuakeFamily => "unezquake",
        ClientKind::Fte => "fteqw", // NOT "fte" — verified at research/repos/fteqw/CMakeLists.txt:1148
        ClientKind::Unknown => return None,
    };
    Some(match variant {
        Some(v) => format!("{}-{}.exe", base, v),
        None => format!("{}.exe", base),
    })
}
```

- [ ] **Step 3: Top-level fingerprint function**

```rust
pub fn fingerprint(path: &Path) -> ClientFingerprint {
    let pe = read_pe_strings(path).unwrap_or_default();
    let kind = classify_from_pe_strings(&pe);
    let filename = path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let variant = variant_from_filename(&filename);

    ClientFingerprint {
        kind,
        version: pe.product_version.or(pe.file_version),
        variant,
        product_name: pe.product_name,
        internal_name: pe.internal_name,
        original_filename: pe.original_filename,
    }
}

#[tauri::command]
pub fn fingerprint_exe(path: String) -> Result<ClientFingerprint, String> {
    let p = std::path::PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("file not found: {}", p.display()));
    }
    Ok(fingerprint(&p))
}

#[tauri::command]
pub fn fingerprint_folder(folder: String) -> Result<Vec<(String, ClientFingerprint)>, String> {
    let p = std::path::PathBuf::from(&folder);
    if !p.is_dir() {
        return Err(format!("not a directory: {}", p.display()));
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&p).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().map(|e| e == "exe").unwrap_or(false) {
            // Skip .exe.db debug symbol files
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.ends_with(".exe.db") { continue; }
            let fp = fingerprint(&path);
            out.push((path.to_string_lossy().into_owned(), fp));
        }
    }
    Ok(out)
}
```

- [ ] **Step 4: Unit tests (10 tests; updated for the F4/F6/F7/F8 changes)**

Test classification logic directly with literal PeStrings + filename:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn pe(product_name: &str, internal_name: &str, version: &str) -> PeStrings {
        PeStrings {
            product_name: Some(product_name.to_string()),
            internal_name: Some(internal_name.to_string()),
            product_version: Some(version.to_string()),
            ..Default::default()
        }
    }

    #[test]
    fn classify_vanilla_ezquake() {
        let p = pe("ezQuake", "ezquake", "3.6.9");
        assert_eq!(classify_from_pe_strings(&p, "ezquake.exe"), ClientKind::EzQuake);
    }

    #[test]
    fn classify_modern_unezquake() {
        let p = pe("ezQuake", "ezquake", "1.3.5-dev unezquake build");
        assert_eq!(classify_from_pe_strings(&p, "unezquake.exe"), ClientKind::UnezQuakeFamily);
    }

    #[test]
    fn classify_old_unezquake_with_antilag_suffix() {
        let p = pe("ezQuake", "ezquake", "3.6-dev-alpha10-antilag-r402 Build r7289");
        assert_eq!(classify_from_pe_strings(&p, "ezquake.exe"), ClientKind::UnezQuakeFamily);
    }

    #[test]
    fn classify_fte_client() {
        let p = pe("FTE QW", "ftequake", "01.20");
        assert_eq!(classify_from_pe_strings(&p, "fteqw.exe"), ClientKind::Fte);
    }

    #[test]
    fn classify_fte_server_build_excluded() {
        // F7: fteqw-sv.exe shares InternalName="ftequake" but is NOT a client.
        let p = pe("FTE QW", "ftequake", "01.20");
        assert_eq!(classify_from_pe_strings(&p, "fteqw-sv.exe"), ClientKind::Unknown);
    }

    #[test]
    fn classify_fte_server_build_excluded_via_filedescription() {
        // Defense-in-depth: even if filename were misleading, FileDescription "Server" excludes.
        let mut p = pe("FTE QW", "ftequake", "01.20");
        p.file_description = Some("FTE QuakeWorld Server".to_string());
        assert_eq!(classify_from_pe_strings(&p, "fteqw.exe"), ClientKind::Unknown);
    }

    #[test]
    fn classify_unknown() {
        let p = pe("Some Other Tool", "qizmo", "1.0");
        assert_eq!(classify_from_pe_strings(&p, "qizmo.exe"), ClientKind::Unknown);
    }

    #[test]
    fn classify_handles_case_insensitive_antilag() {
        let p = pe("ezQuake", "ezquake", "3.6 ANTILAG-r5");
        assert_eq!(classify_from_pe_strings(&p, "ezquake.exe"), ClientKind::UnezQuakeFamily);
    }

    #[test]
    fn variant_glsl_detected() {
        assert_eq!(variant_from_filename("ezquake-glsl.exe"), Some("glsl".to_string()));
        assert_eq!(variant_from_filename("ezquake.exe"), None);
    }

    #[test]
    fn variant_debug_no_longer_detected() {
        // F8: -debug suffix removed from KNOWN_VARIANT_SUFFIXES. Add back if a concrete case arrives.
        assert_eq!(variant_from_filename("fteqw-debug.exe"), None);
    }

    #[test]
    fn family_canonical_exe_mapping() {
        // F6: FTE family canonical is fteqw.exe, NOT fte.exe.
        assert_eq!(family_canonical_exe(ClientKind::EzQuake, None), Some("ezquake.exe".to_string()));
        assert_eq!(family_canonical_exe(ClientKind::EzQuake, Some("glsl")), Some("ezquake-glsl.exe".to_string()));
        assert_eq!(family_canonical_exe(ClientKind::UnezQuakeFamily, None), Some("unezquake.exe".to_string()));
        assert_eq!(family_canonical_exe(ClientKind::Fte, None), Some("fteqw.exe".to_string()));
        assert_eq!(family_canonical_exe(ClientKind::Unknown, None), None);
    }
}
```

- [ ] **Step 5: Add `scan_clients_in_dir` Tauri command (per F2 / D7)**

Wraps `fingerprint_folder` and drops Unknown-classified rows server-side. AddClientPanel never sees Unknown rows.

```rust
#[tauri::command]
pub fn scan_clients_in_dir(folder: String) -> Result<Vec<(String, ClientFingerprint)>, String> {
    let all = fingerprint_folder(folder)?;
    Ok(all.into_iter().filter(|(_, fp)| fp.kind != ClientKind::Unknown).collect())
}
```

- [ ] **Step 6: Build + test**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet && cargo test --quiet client_fingerprint
```

Expected: clean build, 10 tests pass.

- [ ] **Step 7: Wire `fingerprint_exe`, `fingerprint_folder`, `scan_clients_in_dir` in lib.rs handler block**

- [ ] **Step 8: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/client_fingerprint.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs \
        apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): client_fingerprint module — PE strings + variant + scan_clients_in_dir"
```

---

## Sub-phase 2: release_cache module + updater refactor

**Sessions:** 1 (~2 hours)
**Goal:** Single source of truth for GitHub Releases data per client. Replaces updater's ad-hoc fetch.

### Task 2.1: release_cache module

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/release_cache.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Module + types**

```rust
// apps/slipgate-app/src-tauri/src/commands/release_cache.rs
use std::path::PathBuf;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use crate::commands::data_root::data_root_path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReleaseEntry {
    pub tag: String,            // "3.6.9", "v1.46", etc.
    pub published_at: String,   // ISO 8601 from GitHub
    pub download_url: Option<String>,
    pub asset_sha256: Option<String>, // if checksums.txt is parseable
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ClientReleaseCache {
    pub client: String,
    pub channel: String,        // "stable" | "snapshot" | "builds" — per D11
    pub last_fetched: u64,      // unix epoch seconds
    pub releases: Vec<ReleaseEntry>,
    pub source: String,         // "github_releases", "builds_quakeworld_nu", "fte_triptohell", etc.
}

const CACHE_TTL_SECS: u64 = 24 * 60 * 60; // 24 hours

#[derive(Clone, Copy, Debug)]
pub enum DistributionShape {
    GitHubReleases { owner: &'static str, repo: &'static str },
    BuildsQuakeworld,   // ezQuake snapshot — STUB in 3.5b (deferred), see F14
    FteTripToHell,      // FTE continuous builds — STUB in 3.5b (deferred), see F14
}

/// Per D11: keyed by (client, channel). Returns the distribution shape for the pair.
/// In 3.5b only the GitHubReleases variants return real data; the other two are stubs.
pub fn distribution_for(client: &str, channel: &str) -> Option<DistributionShape> {
    match (client, channel) {
        ("ezquake", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "ezquake", repo: "ezquake-source"
        }),
        ("ezquake", "snapshot") => Some(DistributionShape::BuildsQuakeworld),
        ("ktx", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group", repo: "ktx"
        }),
        ("mvdsv", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group", repo: "mvdsv"
        }),
        ("qwfwd", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group", repo: "qwfwd"
        }),
        ("unezquake", "stable") => Some(DistributionShape::GitHubReleases {
            owner: "dusty-qw", repo: "unezquake"
        }),
        ("fte", "builds") => Some(DistributionShape::FteTripToHell),
        _ => None,
    }
}

pub fn supports_tier2(client: &str, channel: &str) -> bool {
    matches!(distribution_for(client, channel), Some(DistributionShape::GitHubReleases { .. }))
}
```

- [ ] **Step 2: Cache file I/O**

```rust
fn cache_path(data_root: &std::path::Path, client: &str, channel: &str) -> PathBuf {
    // Per D11: keyed by client + channel.
    data_root.join("release-cache").join(format!("{}-{}.json", client, channel))
}

pub fn read_cache(data_root: &std::path::Path, client: &str, channel: &str) -> Option<ClientReleaseCache> {
    let path = cache_path(data_root, client, channel);
    if !path.exists() { return None; }
    let text = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn write_cache(data_root: &std::path::Path, cache: &ClientReleaseCache) -> Result<(), String> {
    let path = cache_path(data_root, &cache.client, &cache.channel);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path,
        serde_json::to_string_pretty(cache).map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())
}

pub fn is_stale(cache: &ClientReleaseCache) -> bool {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    now.saturating_sub(cache.last_fetched) > CACHE_TTL_SECS
}
```

- [ ] **Step 3: Fetcher (GitHub Releases path)**

```rust
async fn fetch_github_releases(owner: &str, repo: &str) -> Result<Vec<ReleaseEntry>, String> {
    let url = format!("https://api.github.com/repos/{}/{}/releases", owner, repo);
    let resp = reqwest::Client::new()
        .get(&url)
        .header("User-Agent", "slipgate-app")
        .send().await
        .map_err(|e| e.to_string())?;
    let releases: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
    let entries = releases.iter().map(|r| ReleaseEntry {
        tag: r["tag_name"].as_str().unwrap_or("").to_string(),
        published_at: r["published_at"].as_str().unwrap_or("").to_string(),
        download_url: r["assets"].as_array()
            .and_then(|a| a.first())
            .and_then(|a| a["browser_download_url"].as_str())
            .map(|s| s.to_string()),
        asset_sha256: None, // populate later if needed
    }).collect();
    Ok(entries)
}

// Stub for FTE; build server scrape happens here
async fn fetch_fte_builds() -> Result<Vec<ReleaseEntry>, String> {
    // TODO: scrape fte.triptohell.info; for now return empty so the rest works
    Ok(Vec::new())
}
```

- [ ] **Step 4: Top-level get_releases (cache-or-fetch)**

```rust
pub async fn get_releases(
    data_root: &std::path::Path,
    client: &str,
    channel: &str,
) -> Result<ClientReleaseCache, String> {
    if let Some(cache) = read_cache(data_root, client, channel) {
        if !is_stale(&cache) {
            return Ok(cache);
        }
    }

    let dist = distribution_for(client, channel)
        .ok_or_else(|| format!("no distribution shape for ({}, {})", client, channel))?;

    let releases = match dist {
        DistributionShape::GitHubReleases { owner, repo } => {
            fetch_github_releases(owner, repo).await?
        }
        DistributionShape::FteTripToHell => fetch_fte_builds().await?,
        DistributionShape::BuildsQuakeworld => {
            // F14 + D3: stub in 3.5b. Existing snapshot scraper lives in updater.rs;
            // not duplicated into release_cache for this phase. Empty cache is fine —
            // matches_official_release returns false for any version, snapshot rows
            // render identity but skip Tier-2 nudge.
            Vec::new()
        }
    };

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let cache = ClientReleaseCache {
        client: client.to_string(),
        channel: channel.to_string(),
        last_fetched: now,
        releases,
        source: format!("{:?}", dist),
    };
    write_cache(data_root, &cache)?;
    Ok(cache)
}

#[tauri::command]
pub async fn get_release_cache(
    app: tauri::AppHandle,
    client: String,
    channel: String,
) -> Result<ClientReleaseCache, String> {
    let root = data_root_path(&app)?;
    get_releases(&root, &client, &channel).await
}

#[tauri::command]
pub async fn refresh_all_release_caches(
    app: tauri::AppHandle,
) -> Result<HashMap<String, ClientReleaseCache>, String> {
    let root = data_root_path(&app)?;
    let mut out = HashMap::new();
    // Per D11: per-(client, channel) keys. Iterate the full matrix.
    let pairs = [
        ("ezquake", "stable"),
        ("ezquake", "snapshot"),  // stub in 3.5b
        ("ktx", "stable"),
        ("mvdsv", "stable"),
        ("qwfwd", "stable"),
        ("unezquake", "stable"),
        ("fte", "builds"),         // stub in 3.5b
    ];
    for (client, channel) in pairs {
        if let Ok(cache) = get_releases(&root, client, channel).await {
            out.insert(format!("{}-{}", client, channel), cache);
        }
    }
    Ok(out)
}
```

- [ ] **Step 5: Tier-2 lookup helper (per F9 — normalize before matching)**

Reviewer's F9 caught that strict-equality matching produces false negatives on common cases. PE FileVersion is "3.6.6.7949" (4-component); GitHub release tag is "3.6.6". Normalize via `parse_pe_version` before comparing.

```rust
pub fn matches_official_release(cache: &ClientReleaseCache, version_str: &str) -> bool {
    use crate::commands::updater::parse_pe_version;

    // Normalize the binary's version string to a 3-component form when possible.
    let normalized = parse_pe_version(version_str)
        .map(|(sv, _)| sv.to_string())
        .unwrap_or_else(|| version_str.to_string());

    cache.releases.iter().any(|r| {
        let tag = &r.tag;
        // Three match shapes: exact tag, "v" prefix, normalized exact.
        tag == version_str
            || *tag == format!("v{}", version_str)
            || *tag == normalized
            || *tag == format!("v{}", normalized)
    })
}
```

**Known residual false-negatives** (documented per F9 + F14):
- Old unezQuake-family builds with version strings like `"3.6-dev-alpha10-antilag-r402"` don't normalize to a sensible tag and won't match. They render as Tier 3 ("unrecognized") — accurate for those binaries since they predate dusty-qw/unezquake's first release.
- Snapshot binaries match nothing because the snapshot cache is stubbed empty in 3.5b.
- FTE binaries match nothing because the FTE cache is stubbed empty in 3.5b.

These are honest limits, not bugs. Future arcs widen Tier-2 coverage when scrapers ship.

- [ ] **Step 6: Tests**

Tests for cache I/O (per-channel paths) + staleness + matches_official_release (exact, v-prefix, normalized cases) + the channel-keying invariant (writing client="ezquake" channel="stable" doesn't pollute client="ezquake" channel="snapshot"). Use TempDir. Skip live fetching (network-dependent).

- [ ] **Step 7: Build + test + commit**

### Task 2.2: Updater stays as-is (no refactor in this phase)

Per D3, Phase 3.5 does NOT refactor the updater to consume `release_cache`. The two systems coexist as parallel fetchers. This task is a no-op in 3.5; consolidation is deferred to a future cleanup arc with a functional trigger (e.g. release-notes panel feature).

If a future agent reading this plan is tempted to do the refactor anyway: don't. Updater is shipped/working, the refactor is non-functional, and Phase 3.5's risk surface is already substantial. Leave it.

---

## Sub-phase 3: Frontend wrappers for fingerprint + release_cache

**Sessions:** 1 (~30-60 min — collapsed dramatically post-3.5a per F2)
**Goal:** Thin frontend wrappers around the Rust commands shipped in sub-phases 1+2. The original sub-phase 3 (MyQuake browser augmentation, Clients filter category, actionable sidebar rows) was for the pre-3.5a IA — those concerns dissolved when 3.5a moved client management out of Browse and into a Domain. After 3.5a, all "MyQuake augmentation" work that survives reduces to wrapping the Rust commands so AddClientPanel can use them.

Per-row rendering with three-tier identity + empty-Tier-2 handling + action grammar consistency moves to sub-phase 4 task 4.2 (lives inside `ClientImportRow.tsx`, which is part of AddClientPanel).

### Task 3.1: Frontend wrapper for `client_fingerprint` commands

- [ ] Create `src/lib/quake-dir/clientFingerprint.ts` with `fingerprintExe`, `fingerprintFolder`, and `scanClientsInDir` wrappers + TS types matching the Rust `ClientFingerprint` + `ClientKind` shapes.
- [ ] Create `src/lib/quake-dir/clientFingerprint.test.ts` with 3 wrapper tests using the inline-invoke pattern Phase 2 established (mock the underlying Tauri invoke for unit tests; integration smoke happens later on Windows).

### Task 3.2: Frontend wrapper for `release_cache` commands

- [ ] Create `src/lib/quake-dir/releaseCache.ts` with `getReleaseCache(client, channel)` and `refreshAllReleaseCaches()` wrappers + TS types for `ClientReleaseCache` + `ReleaseEntry`.
- [ ] Create `src/lib/quake-dir/releaseCache.test.ts` with 2-3 wrapper tests using the inline-invoke pattern.

### Task 3.3: No browser-augmentation work in 3.5b

Per the 2026-04-27 second-pass review, the originally-planned Browse-mode augmentations are no longer applicable:

- ❌ ~~Add "Clients" filter category to MyQuake's Browse sidebar.~~ Browse view stays focused on filesystem inspection. Clients live in the Clients Domain.
- ❌ ~~Wire fingerprint into the existing scan_quake_dir.~~ Per F2, fingerprint runs only when AddClientPanel explicitly invokes `scan_clients_in_dir` for a user-picked folder. `scan_quake_dir` stays unchanged.
- ❌ ~~CLIENTS DETECTED sidebar actionable rows.~~ Sidebar is gone post-3.5a. Action verbs live on VersionWarehouse rows (Phase 3 shipped) and on AddClientPanel checklist rows (sub-phase 4).

This task is intentionally empty. Listed for discoverability so a future agent reading the plan understands "no, MyQuake Browse is NOT augmented in 3.5b."

### Task 3.4: Commit

- [ ] `git add` the two new files + tests + lib.rs registration changes from sub-phases 1+2 if any are still pending.
- [ ] Single commit: `feat(slipgate): frontend wrappers for client_fingerprint + release_cache`

---

## Sub-phase 4: Add Quake client entry-point flow + bulk_import_clients orchestrator

**Sessions:** 1-2 (~3-4 hours total)
**Goal:** The "Add Quake client" button on VersionWarehouse opens AddClientPanel inside ClientsDomain. User picks a folder or specific exe; panel renders a default-select-all checklist of fingerprinter-classified clients with three-tier identity + primary-radio; on Import, the new `bulk_import_clients` Rust command orchestrates per-row hash → register → optional canonicalize-rename → swap_active_version-for-primary atomically.

### Task 4.1: `bulk_import_clients` Rust orchestrator (per F3 + D9 + D12)

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/bulk_import.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`, `lib.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/version_warehouse.rs` — extend `WarehousedVersion` with `variant: Option<String>` per D6+D10; nested manifest path under `binaries/<client>/<version>/variants/<variant>/manifest.json`; `register_version_at` accepts an optional variant arg.

- [ ] **Step 1: Define request/response types**

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct BulkImportRow {
    pub source_path: String,           // absolute path to the .exe
    pub client: String,                // "ezquake" | "unezquake" | "fte" — from fingerprinter
    pub version: String,               // normalized version string
    pub variant: Option<String>,       // "glsl" | None — from fingerprinter
    pub family_canonical_filename: String, // e.g. "ezquake.exe", "fteqw-glsl.exe"
    pub canonicalize_consent: CanonicalizeConsent,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum CanonicalizeConsent {
    Skip,            // already canonical, OR canonical slot occupied (skip-with-toast case)
    Rename,          // user confirmed the rename prompt
    LeaveAsIs,       // user declined the rename prompt; warehouse but no rename
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkImportRequest {
    pub rows: Vec<BulkImportRow>,
    pub primary_row_index: Option<usize>, // index into rows; None = no primary set
    pub quake_dir: String,                 // chosen folder (must match existing primary or be the
                                            // first primary; AddClientPanel enforces this UI-side
                                            // and the orchestrator validates Rust-side per D9)
    pub claim_as_primary: bool,            // per D9 case 1: true ONLY when profile.quake_dirs is
                                            // empty (first-launch) — populates the primary entry.
                                            // For case 2 (matches existing primary): false (no-op).
                                            // For case 3 (mismatch): orchestrator returns error
                                            // before any work is done.
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkImportResult {
    pub registered: Vec<WarehousedVersion>,
    pub renamed: Vec<(String, String)>, // (from, to) for canonicalize-rename steps that succeeded
    pub skipped_canonicalize: Vec<String>, // source paths that landed in skip-with-toast state
    pub primary_active: Option<String>, // the version that became active (if primary_row_index was set)
    pub primary_dir_set: bool,          // whether profile.quake_dirs got the primary entry populated
                                         // (true only on first-launch claim per D9 case 1)
}

#[tauri::command]
pub async fn bulk_import_clients(
    app: tauri::AppHandle,
    req: BulkImportRequest,
) -> Result<BulkImportResult, String> { /* see Step 2 */ }
```

- [ ] **Step 2: Implement orchestrator**

Pseudocode:

```
# 0. Pre-flight per D9: validate req.quake_dir against the profile's primary entry.
let profile = read_profile()
let existing_primary = profile.setups[0].quake_dirs.iter().find(|e| e.role == "primary")
match existing_primary:
    None:
        # D9 case 1: no primary set yet. claim_as_primary must be true; we'll
        # populate the primary entry at the end. Orchestrator continues.
        if !req.claim_as_primary:
            return Err("no primary quake dir set yet but claim_as_primary is false; this is a frontend bug")
    Some(entry):
        if path_normalize(&entry.path) == path_normalize(&req.quake_dir):
            # D9 case 2: matches existing primary. claim_as_primary should be false (no-op).
            if req.claim_as_primary:
                # frontend got into a confused state; treat as case 2 anyway
            (proceed)
        else:
            # D9 case 3: mismatch. Refuse before any side-effects.
            return Err(format!("slipgate manages {}; can't import from {}", entry.path, req.quake_dir))

for (i, row) in req.rows.enumerate():
    # 1. Hash + register (extends register_version_at with variant arg per D6+D10)
    let manifest = register_version_at(
        client=row.client,
        version=row.version,
        variant=row.variant,
        source_exe=row.source_path,
        channel=if row.is_snapshot { "snapshot" } else { "stable" }, # honest channel from fingerprint
        origin="user_import",
    )
    result.registered.push(manifest)

    # 2. Canonicalize-rename per CanonicalizeConsent
    match row.canonicalize_consent:
        Skip: (no-op)
        LeaveAsIs: result.skipped_canonicalize.push(row.source_path)
        Rename:
            let target = req.quake_dir.join(row.family_canonical_filename)
            fs::rename(row.source_path, target)?
            result.renamed.push((row.source_path, target))

# 3. After all rows: swap to primary's version (per D12 — NOT reconcile)
if let Some(idx) = req.primary_row_index:
    let row = &req.rows[idx]
    swap_active_version(
        client=row.client,
        target_version=row.version,
        target_variant=row.variant,
        quake_dir=req.quake_dir,
        target_exe_name=row.family_canonical_filename,
    )?
    result.primary_active = Some(row.version)

# 4. Per D9 case 1: populate primary entry on first-launch claim
if existing_primary.is_none() && req.claim_as_primary:
    let mut updated = profile.clone()
    updated.setups[0].quake_dirs.push(QuakeDirEntry {
        path: req.quake_dir.clone(),
        role: "primary",
        label: None,
    })
    write_profile(&updated)?
    result.primary_dir_set = true
```

The frontend (AddClientPanel) determines `claim_as_primary` per D9's three cases: no existing primary → true; matches existing primary → false; mismatch → AddClientPanel never submits the request (shows error and routes user back to picker). The Rust orchestrator double-checks the validation as a safety net.

- [ ] **Step 3: Implement `rename_to_canonical` helper command (per F12)**

Useful for AddClientPanel to invoke during the per-row prompt (rename happens before bulk_import_clients orchestrates the post-rename register step? OR bulk_import_clients handles the rename internally? Choice: handle internally per Step 2's `CanonicalizeConsent::Rename` branch — but expose a separate `rename_to_canonical` Tauri command anyway for any future UI that wants it standalone).

```rust
#[tauri::command]
pub fn rename_to_canonical(source_path: String, target_filename: String) -> Result<String, String> {
    let src = std::path::PathBuf::from(&source_path);
    let parent = src.parent().ok_or("source has no parent")?;
    let dst = parent.join(&target_filename);
    if dst.exists() {
        return Err(format!("target {} already exists", dst.display()));
    }
    std::fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Ok(dst.to_string_lossy().into_owned())
}
```

- [ ] **Step 4: Tests**

Unit tests for the orchestrator using TempDir + mock exe files. Cover:
- Happy path (3 rows, primary at index 1, all need canonicalize, all consent to Rename)
- LeaveAsIs path (user declined one rename; that row warehouses but stays at non-canonical filename)
- Skip path (canonical slot occupied; row's source stays alongside as duplicate)
- D9 case 1: no existing primary, claim_as_primary=true → primary entry populated
- D9 case 2: existing primary matches picked dir, claim_as_primary=false → no profile change, import proceeds
- D9 case 3: existing primary differs from picked dir → orchestrator returns error before any side-effects (validates AddClientPanel's UI-side refuse)
- D12 case: primary row's swap_active_version is called with correct target_version + target_exe_name

- [ ] **Step 5: Wire commands in lib.rs (`bulk_import_clients`, `rename_to_canonical`); commit**

### Task 4.2: AddClientPanel component

**Files:**
- Create: `apps/slipgate-app/src/components/AddClientPanel.tsx`
- Create: `apps/slipgate-app/src/components/ClientImportRow.tsx`

- [ ] **Step 1: Panel layout**

Two affordances at the top: "Pick a folder" + "Pick a specific exe" (file picker buttons via `@tauri-apps/plugin-dialog`). Both feed into the same checklist screen.

The panel renders inside ClientsDomain when an `addingClient` signal is true (set by VersionWarehouse's "Add Quake client" button). Choose between overlay-on-top-of-Versions vs replace-Versions-temporarily during this step — both are within the design space; the implementer can pick what feels right against the live app. Lean: replace-temporarily with a clear "← Back to Versions" affordance at top, since it's a focused multi-step flow.

- [ ] **Step 2: Folder/exe picker → scan**

After the user picks a folder (or single exe), call `scanClientsInDir(folder)` (or `fingerprintExe(path)` for a single exe). Loading state during the scan. Empty result → "No Quake clients found in this folder" with a link back to the picker. Non-empty result → render checklist (Step 3).

- [ ] **Step 3: Checklist screen**

For each fingerprinter-classified row (Unknown rows already filtered server-side per D7), render via `ClientImportRow`:
- Checkbox (default ticked per D2)
- Three-tier identity surface (see ClientImportRow spec below)
- Filename (basename) + relative path
- Version (normalized via `parse_pe_version` if applicable)
- Variant badge (e.g. `[glsl]`) if present
- Primary radio (one selected at a time across all rows)
- Canonicalize-on-import per-row affordance: small text below the row showing which prompt will fire on Import: "Will rename `ezquake-3.6.6.exe` → `ezquake.exe`" (case A), "Will leave at `ezquake-3.6.6.exe` (canonical slot occupied)" (case C), or "Already canonical" (case B). Defaults to case-A consent = Rename; user can toggle individual rows to LeaveAsIs.

Top of checklist: dir-targeting indicator per D9. Two states (foreign-dir picks are intercepted before reaching the checklist): "Will set this as your primary Quake dir" (no existing primary — D9 case 1) OR "Managing primary: `<path>`" (matches existing primary — D9 case 2). The foreign-dir case (D9 case 3) is intercepted at the picker level: AddClientPanel detects the mismatch immediately after the user picks, shows an inline error toast ("slipgate manages `<existing_primary>`. The folder you picked is somewhere else. Pick your primary dir, or set a new one by clearing the existing primary first."), and routes the user back to the picker without ever rendering the checklist.

Bottom: "Import N selected" button (count updates live).

- [ ] **Step 4: Wire to `bulk_import_clients`**

On Import click:
1. Build `BulkImportRequest` from current row state (selected rows, primary radio, quake_dir, claim_as_primary flag set per D9 logic: true if no existing primary, false if matches existing primary; mismatch case never reaches Import — AddClientPanel intercepts at picker time).
2. Call `bulk_import_clients` via the frontend wrapper.
3. Show a result toast: "Imported N clients; <client>-<version> is now active". On error, show the error message and don't navigate away.
4. On success, set `addingClient = false` to dismiss the panel; ClientsDomain re-renders Versions list which now includes the new manifests.

- [ ] **Step 5: ClientImportRow — three-tier identity surface + empty-Tier-2 handling (per F9 + F14)**

The `ClientImportRow` component renders the identity badge based on:
- Family (from fingerprint: `EzQuake` / `UnezQuakeFamily` / `Fte`)
- Version (from fingerprint, normalized)
- Tier-2 verdict (from `matches_official_release` against the appropriate cache):

| Family | Cache available? | Tier-2 match? | Render |
|---|---|---|---|
| ezQuake | yes (stable) | yes | "ezQuake 3.6.9 (verified official)" |
| ezQuake | yes (stable) | no | "ezQuake 3.6.9 (unrecognized build)" |
| ezQuake | snapshot stub | n/a (per F14) | "ezQuake snapshot (build NNN)" — no Tier-2 verdict |
| unezQuake | yes (stable) | yes | "unezQuake 1.3.5 (verified official)" |
| unezQuake | yes (stable) | no | "unezQuake-family (unrecognized build)" |
| FTE | builds stub | n/a (per F14) | "FTE QW (build NNN)" — no Tier-2 verdict |

Branch on `cache.releases.length === 0` to detect stub state and skip the Tier-3-unrecognized claim. Per F14, this is honest — not lying about coverage we don't have.

For Tier-3-unrecognized rows, render an inline upgrade-nudge: "Latest official is ezQuake 3.6.10 — switch to that?" with a button that initiates a download via the existing updater flow. (The button can route to the Feed tab → Updates section pre-filtered to the relevant client; future polish can make it a one-click switch directly.) For stub-state rows (FTE, ezQuake snapshot), no upgrade-nudge — just identity rendering.

- [ ] **Step 6: Action grammar consistency** (per Position-in-bigger-picture)

The verbs Phase 3.5 establishes on this surface — Import, Set primary (radio), Switch (on existing VersionWarehouse rows), Remove from warehouse — will be reused on every future Domain (Assets, Bundles, Maps, Matches). Use semantic DaisyUI classes consistently (`btn-primary` for Import, `btn-error` for destructive actions, `btn-ghost` for non-destructive secondary). No new components-shared lib in this phase — just consistent class usage so future Domain rows inherit the visual grammar.

- [ ] **Step 7: Tests + commit**

Unit tests for AddClientPanel state management (selected rows, primary radio, dir-targeting state). Integration test for the full flow (mock invoke, simulate folder pick → scan → render checklist → click Import → assert bulk_import_clients was called with expected args).

### Task 4.3: Wire Add Client button in VersionWarehouse

**Files:**
- Modify: `apps/slipgate-app/src/components/VersionWarehouse.tsx` (Phase 3 stubbed this button)
- Modify: `apps/slipgate-app/src/components/ClientsDomain.tsx` (host the AddClientPanel state)

**Design:** AddClientPanel renders inside ClientsDomain, NOT as a modal overlay or a router-jump to MyQuake → Browse. Per D1 (pass-2 reframe), client management lives entirely inside the Clients view of MyQuake post-3.5a.

- [ ] **Step 1:** Add an `addingClient: boolean` signal to ClientsDomain (or a context/store signal — pick whichever fits the existing pattern; ClientsDomain-local is fine for this scope).

- [ ] **Step 2:** Replace VersionWarehouse's stub `onClick` for the "Add Quake client" button with a call that sets `addingClient = true`. May need to thread the setter via props or context.

- [ ] **Step 3:** ClientsDomain renders `<AddClientPanel onClose={() => setAddingClient(false)} />` when `addingClient === true`, else renders the normal Installation + Versions content.

- [ ] **Step 4: Final integration test** (manual on Windows): click Add Client → see AddClientPanel inside the same Clients view → pick a folder → see checklist → Import → confirm warehouse populated → confirm primary version is now active per VersionWarehouse → close panel → see Versions list reflect the new state.

---

## Self-review against goal

Goal restated (post-pass-2): Single-button "Add Quake client" inside MyQuake → Clients identifies clients in a chosen folder via PE-string fingerprinting, lets the user bulk-import all detected clients with one tick-list interaction, surfaces three-tier identity honestly (with documented stub states for FTE + ezQuake-snapshot per F14), and makes the "switch to latest official" path one click away from any unrecognized state where Tier-2 cache data exists.

Sub-phase 1 ships the fingerprinter (with F4 variant decoupling, F6 fteqw.exe canonical, F7 FTE server-build exclusion, F8 trimmed variant suffixes, scan_clients_in_dir Unknown-filter wrapper). Sub-phase 2 ships release_cache (parallel system per D3, per-(client, channel) keying per D11+F13, F9 normalized matcher with documented residual false-negatives). Sub-phase 3 ships frontend wrappers (collapsed dramatically post-3.5a per F2). Sub-phase 4 ships AddClientPanel + bulk_import_clients orchestrator (D8 canonicalize-on-import, D9 warehouse-only-by-default for non-matching dirs, D12 swap-not-reconcile for primary).

Three-tier identity (D5 + F14): Tier-2 nudge fires only for client-channels with live cache data (ezQuake stable, unezQuake stable, KTX/MVDSV/QWFWD stable). FTE + ezQuake snapshot render identity but skip Tier-2 verdict per the stub-state branches in `ClientImportRow`. This is honest — F14 acknowledges 3.5b ships partial Tier-2 coverage; future arcs widen.

Bulk import: D2 default-select-all + sub-phase 4 checklist UI cover this exactly. Canonical-only naming (D8) embeds via `bulk_import_clients`'s per-row CanonicalizeConsent flow (Rename / LeaveAsIs / Skip with toast for canonical-slot-occupied). Profile gains `setups[0].quake_dirs` (plural-shaped per D9) with the primary entry populated on first-launch claim only; foreign-dir picks are refused at the picker level.

Variant decoupling (D6 + D10 + F4): variants stored as `variant: Option<String>` on `WarehousedVersion`; nested manifest path under `binaries/<client>/<version>/variants/<variant>/manifest.json`; version-resolution lib stays variant-naive; oracle's snapshot consumer reads "ezQuake 3.6.6" as one canonical row regardless of variant. Architectural cleanliness for Phase 4/5.

Primary selection (D12 + F5): `swap_active_version` is authoritative regardless of `std::fs::read_dir` iteration order, unlike the pass-1 plan's reconcile-after-rename-loop pattern which was vulnerable to iteration-order-dependent silent overrides.

Position in bigger picture: this phase is the first explicit Tier 1 → Tier 2 crossing in the four-tier opt-in ladder (memory `project_slipgate_tier_ladder.md`). The action grammar (Import / Set primary / Switch / Remove from warehouse) and the bulk-import flow shell are precedents future Tier 3 arcs (asset warehouse, bundle install, clean-room migration — captured in HANDOVER's "Tier 3 future arcs" entry) reuse wholesale. The pass-2 reframes (D6/D10 variant decoupling, D11 per-channel cache files, D9 warehouse-only-by-default) preserve substrate cleanliness for those future arcs.

---

## What this plan does NOT cover

- **FTE config parsing.** Fingerprinter classifies a binary as FTE; warehouse stores it. Slipgate can't read FTE configs, classify FTE binds, etc. That's a separate massive arc.
- **Multi-language UI.** All strings remain English-only.
- **Cross-machine warehouse sync** (the D9 "share my versioned setup" use case from the parent QDC plan). Future arc.
- **Bulk export** (export all warehoused versions to a zip). Operator confirmed this isn't wanted; bulk import is the primary use case.
- **GLSL-vs-vanilla cvar diffing.** Variants are warehoused independently with the variant field per D6+D10; comparing them feature-wise is Phase 5's diff viewer's job, not this phase.
- **Active warehoused-version garbage collection** (delete old blobs when no manifest references them). Future cleanup arc.
- **Updater consolidation onto release_cache.** Per D3, updater stays as-is in 3.5b. Consolidation is a deferred future cleanup arc with a functional trigger (release-notes panel or similar).
- **Settings tab opt-out toggle for canonical-mode.** Per D8, there is no toggle. The four-tier opt-in ladder makes "users who don't want slipgate to canonicalize their files" a Tier 0/1 lifestyle choice, not a Tier 2 mode preference.
- **Mode-switching prompts** ("you're in messy mode, want to switch to canonical?"). Per D8, there are no modes.
- **Multi-quake-dir UI affordances.** Per D9, slipgate enforces single-primary in 3.5b. Foreign-dir bulk-import picks are refused. Users who want to retarget primary point slipgate at a new exe via the existing path picker on Versions; the parent dir of that exe becomes the new primary on first import after the change. A future Settings-tab "Quake dirs" manager (with explicit add/remove/promote actions) lands when Tier-3 arcs need it (clean-room migration, player-profile bundles). The schema is plural-shaped (`quake_dirs: QuakeDirEntry[]`) to accommodate future role values without further migration.
- **"Make this my primary Quake dir" affordance** specifically. Same reasoning. 3.5b refuses foreign picks; doesn't offer in-flow retargeting.
- **Player profiles / share-via-hashlist features.** Surfaced in design conversation 2026-04-27 evening as a future arc (load Milton's setup by hash list, swap between own profile and another's, dedupe against locally-existing assets). See HANDOVER's "Player profiles (bundle-shaped, share-via-hashlist)" entry. Bundle-shaped infrastructure shared with the slackers_tp-style bundle install future arc; not 3.5b scope.
- **Clean-room extraction / migration.** Future Tier-3 arc that produces a fresh slipgate-managed dir from an existing messy one. Captured in HANDOVER's "Tier 3 future arcs" entry. Not 3.5b scope; the plural-shaped `quake_dirs` schema is the substrate that makes it cheap to land later.
- **Delete-from-disk action on warehoused / non-warehoused exes** (per F11). The Phase-3 VersionWarehouse rows already have a Delete button (which removes the warehouse manifest + GC's the blob if unreferenced); a separate "Delete the source exe from disk" action was sketched in pass-1 but is deferred to a future arc. Reasoning: it's destructive, needs careful safety guards (refuse if path matches the canonical slot, refuse if path matches an active version's source), and isn't load-bearing for 3.5b's goal. Users with leftover non-canonical exes after import can delete via Windows Explorer for now.
- **Tier-2 nudge for FTE + ezQuake snapshot.** Per F14, those rows render identity (family + version) but skip the upgrade-nudge UX in 3.5b — their cache stubs return empty. Future arcs (FTE: scrape fte.triptohell.info; ezQuake snapshot: integrate the existing updater scraper into release_cache) widen Tier-2 coverage.
- **Asset warehouse / 1-click texture-set switching / bundle install / clean-room migration.** All Tier 3 future arcs that share Phase 2/3's warehouse substrate. Captured in HANDOVER's "Tier 3 future arcs" entry. Phase 3.5b establishes the precedents (action grammar, AddClientPanel shell, canonicalize-on-import flow, swap-not-reconcile pattern) but does not implement any non-binary content management.
- **`fteplug_*.dll` plugin classification.** The fingerprinter classifies `.exe` files only. FTE plugin DLLs sit in the user's quake dir but are not Quake clients in the warehouse sense. They surface in MyQuake's Browse view as Client Plugin (existing classification) but are not in the import list.

---

## Execution handoff

Plan ready for execution in a fresh terminal.

1. Open a fresh Claude session.
2. Verify required commits are in HEAD: `git log --oneline | head -10` should show recent commits including:
   - `f6fe481` (canonical-mode revert from Phase 3 polish)
   - `01e4081` (Phase 3.5 first-pass plan revision)
   - `475d59e` (3.5a/3.5b split)
   - `b3f57e1` (3.5a scope expansion)
   - `d07e275` (Phase 3.5a IA restructure shipped)
   - `f6f2b39` (MyQuake nav-flatten polish)
   - This pass-2 revision commit (latest)
3. Read this plan in full plus the parent `2026-04-26-quake-dir-control.md` Phase 3 section, plus `2026-04-27-clients-as-myquake-domain.md` for 3.5a context.
4. Use `superpowers:executing-plans` (or `superpowers:subagent-driven-development` if subagents are working well).
5. Each sub-phase is one shippable commit cluster; commit + push at sub-phase boundaries. Sub-phase 4 might split into 4a (Rust orchestrator + tests) and 4b (frontend AddClientPanel + integration) if size warrants.

**Estimated total execution time:** 8-12 hours across 3-4 fresh-terminal sessions, vs. the original 6-8hr estimate. Pass-2 added the bulk_import_clients orchestrator (~2hr), variant decoupling Rust changes in version_warehouse.rs (~1hr), and the per-row CanonicalizeConsent UX surface (~1hr). Sub-phase 3 collapsed to ~30min (saves ~2hr vs the original Browse-augmentation scope).
