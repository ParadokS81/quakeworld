# Add Quake Client — Phase 3.5b of Quake Dir Control

> **PHASE SPLIT (2026-04-27 second-pass review):** This plan is Phase 3.5b — the bulk-import + fingerprinter feature work. Phase 3.5a (`docs/superpowers/plans/2026-04-27-clients-as-myquake-domain.md`) MUST ship first. 3.5a is a pure information-architecture restructure that absorbs the standalone Clients tab into MyQuake → Domains → Clients; 3.5b builds the new flow inside the new IA. After 3.5a ships, this plan needs a pass-2 revision to absorb (a) the reviewer's F1-F14 findings from the 2026-04-27 second-pass review and (b) four open operator decisions (multi-quake-dir semantics, variant encoding decoupled from version key, release_cache channel modeling, primary-radio uses swap_active_version not reconcile_active_version). Do NOT execute this plan as currently written — it predates both the IA restructure and the F-series findings.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Single-button "Add Quake client" flow that routes through MyQuake's existing browser, identifies clients via PE-string fingerprinting, lets the user bulk-import all detected clients with one tick-list interaction, surfaces three-tier identity honestly (family / matched-to-official / unrecognized), and makes the "switch to latest official" path one click away from any unrecognized state.

**Position in roadmap:** Phase 3.5 of Quake Dir Control — between Phase 3 (swap + UI + delete) and Phase 4 (oracle snapshot widening). Reasoning: Phase 3 ships the swap mechanism. The next thing the user wants is "let me add more clients to switch between." Phases 4-5 (diff viewer) only deliver value when multiple versions exist in the warehouse, which only happens at scale once Add Client exists. Sequence-wise this puts user-facing value first, internal plumbing later.

**Position in the bigger picture (added 2026-04-27 second-pass review):** This phase is the first explicit Tier 1 → Tier 2 crossing in slipgate's four-tier opt-in ladder (don't use / read-only / managed versions / full dir management — see memory `project_slipgate_tier_ladder.md`). Phase 3.5 builds the binary-domain consumer of the warehouse + swap substrate Phase 2/3 already shipped. That substrate (content-addressed blobs + per-thing manifests + top-level index + atomic-rename swap to canonical slot) generalizes to non-binary content; future arcs (asset warehouse + 1-click texture-set switching, bundle install, clean-room migration) reuse the same primitives at parallel `<data-root>/<kind>/...` roots — see HANDOVER's "Tier 3 future arcs" entry. So Phase 3.5's design choices set precedent for far more than just this feature. Two consequences worth being conscious of: (1) the action grammar Phase 3.5 establishes on Clients-domain rows (Import / Set primary / Remove from warehouse / Switch / Delete from disk) will be reused on every future Domain (Assets, Bundles, Maps, Matches); (2) the bulk-import flow's UI shell (entry-point button → folder/file picker → checklist with default-select-all → primary radio → bulk import) will be the same shell future bundle-install / clean-room-migration flows reuse, with only the source changing (existing files on disk → assets.quake.world catalog).

**Architecture:** A `ClientFingerprint` Rust module reads PE StringFileInfo (translation table enumeration + InternalName/ProductName/version-string lookup) to identify Quake clients in any folder slipgate scans. A `release_cache` Rust module owns per-client GitHub Releases data (with per-client distribution-shape policy — FTE skips Tier 2 entirely because no canonical release concept exists), refreshes-on-launch, replaces the updater's existing ad-hoc release fetching as a side benefit. MyQuake's existing browser (currently passive — read-only file classification) gains a Clients first-class category with actionable Import / Set primary / Remove rows. The "Add Quake client" entry-point button (stubbed in Phase 3) becomes a routed jump into MyQuake → Browse → Clients filter, where the user sees a default-select-all checklist of detected clients, ticks/unticks, picks one as primary, and bulk-imports.

**Tech stack:** Tauri v2 + SolidJS + Rust + Bun (unchanged from earlier QDC phases). PE-string reading via `windows::Win32::Storage::FileSystem::VerQueryValueW` (already used by `ezquake.rs:read_exe_version`). Release-cache fetches via `reqwest` (already in use by `updater.rs`). Frontend tests `bun:test`.

---

## Critical context for the engineer

Read this section before starting. These gotchas are not optional knowledge.

1. **Phases 0+1+2 of Quake Dir Control are SHIPPED.** Read `apps/slipgate-app/docs/QUAKE-DIR-CONTROL.md` and the parent plan `docs/superpowers/plans/2026-04-26-quake-dir-control.md` first. Phase 3 (swap + UI + delete) MUST ship before this Phase 3.5 — the version warehouse panel Phase 3 builds is where the "Add Quake client" button lives.

2. **Tauri command registration is two-step.** Adding a new Tauri command requires `pub mod <name>;` in `src-tauri/src/commands/mod.rs` AND the `#[tauri::command]` function listed in `tauri::generate_handler![]` in `src-tauri/src/lib.rs`. Forgetting either side gives a runtime "command not found" error in the frontend, not a compile error.

3. **`ezquake.rs:read_exe_version` is the existing PE-reading model.** Lines 1763-1819 show the full pattern: `GetFileVersionInfoSizeW` → `GetFileVersionInfoW` → `VerQueryValueW` for the `\` sub-block (which gives `VS_FIXEDFILEINFO` numeric version). The new fingerprinter reuses this scaffolding but does additional `VerQueryValueW` calls for the `\StringFileInfo\<lang+cp>\<KeyName>` paths to read CompanyName, ProductName, InternalName, FileVersion, ProductVersion strings.

4. **Translation table enumeration is mandatory, not optional.** Different clients use different langid+codepage combinations:
   - ezQuake uses `040904B0` (US English / Unicode 04B0)
   - FTE uses `080904B0` (UK English / Unicode 04B0)
   - Other forks may use other combinations
   The fingerprinter MUST query `\VarFileInfo\Translation` first to get the list of available pairs, then iterate them building `\StringFileInfo\<lang+cp>\<KeyName>` paths. Hardcoding `040904B0` will fail on FTE binaries.

5. **`parse_pe_version` is now `pub` in `commands/updater.rs:157`** (made pub during Phase 2 normalization fix `ae875ca`). Reuse it for normalizing version strings from numeric VS_FIXEDFILEINFO when needed; it's the canonical helper for the "3.6.6.7947" → "3.6.6" conversion.

6. **`read_exe_version` is Windows-only.** `commands/ezquake.rs:1765` is `#[cfg(target_os = "windows")]`; the Linux fallback returns None. WSL dev mode cannot read PE versions. The same pattern applies to ALL PE-string reading. The new `ClientFingerprint` module returns `Unknown` on non-Windows. Tests use Windows-only `#[cfg(target_os = "windows")]` guards or fixture data that doesn't depend on PE parsing.

7. **MyQuake browser is currently passive.** `apps/slipgate-app/src/components/MyQuakeTab.tsx` (and the underlying browser components under `MyQuake*`) currently does directory walking, file classification by type, and read-only display. NO actionable rows exist today. This phase introduces the first action layer — Import / Set primary / Remove on Client rows. Match the existing visual pattern (DaisyUI semantic classes, OKLCH theme) and don't introduce a new interaction paradigm.

8. **CLIENTS DETECTED sidebar already exists.** Look at MyQuakeTab's left sidebar — the "CLIENTS DETECTED [*] ezquake" line. This is currently a passive label. This phase upgrades it: each detected client becomes an actionable row showing warehouse status (warehoused / not warehoused / active) with hover or right-click revealing actions.

9. **Updater already fetches GitHub Releases — and stays as-is in Phase 3.5.** `commands/updater.rs:fetch_github_releases` (around line 182) is the existing ad-hoc fetch. Phase 3.5 adds `release_cache` module as a parallel system for the fingerprinter's Tier-2 lookup needs. Consolidating updater to consume `release_cache` is **deferred to a future cleanup arc** — touching shipped/working code for a non-functional consolidation isn't worth the regression risk in this phase. Two systems coexist for now; consolidation lands when there's a functional reason to touch the updater (e.g. future "release notes panel" feature).

10. **No new heavy Rust deps.** `reqwest`, `serde_json`, `sha2`, `tokio` are all already in `Cargo.toml`. The release-cache fetches use `reqwest`; cache files use `serde_json`. No new crates needed.

11. **FTE distribution model is fundamentally different.** FTE has no concept of "official release" — it's continuous nightly builds at `fte.triptohell.info` with build numbers in the thousands. The `release_cache` module's per-client policy MUST treat FTE differently: skip Tier 2 entirely. The fingerprinter classifies FTE binaries as "FTE QW (build NNN)" without judgment. The upgrade-nudge UX for FTE becomes "build NNN is from <date>; latest available is build MMM" rather than "this is unrecognized."

12. **Default-select-all is the bulk-import policy** (operator's stated workflow: "i can just import all"). When the user opens the Add Client checklist, every detected client row is pre-ticked. User unticks the ones they don't want; the affirmative bulk action ("Import selected") is the primary CTA. This matches operator's actual workflow on a multi-version quake dir AND nudges users toward an organized warehouse.

13. **Unknown / non-client exes are filtered before the user sees the import list.** When MyQuake's browser shows Clients filter, only fingerprinter-classified clients appear. Tools (qizmo, qwdtools), debug symbols (`.exe.db`), generic utilities (wget), and unrecognized binaries are NOT in the import list — there's no "tick this random.exe to import" option. They're still visible in MyQuake's general browser (categorized as Tools or Other), just not as importable clients.

14. **No FTE config parsing in this phase.** The fingerprinter classifying a binary as FTE means slipgate knows to warehouse it as an FTE client. It does NOT mean slipgate can read FTE configs, classify FTE binds, or interact with FTE's gamedir conventions. That's a separate massive arc tracked elsewhere. This phase produces "switch between exes" capability for FTE; understanding FTE's content is future work.

15. **unezQuake repo is locally cloned** at `research/repos/unezquake/` (gitignored). Use it for authority lookups during fingerprinter development — e.g., confirming what their .rc file says, what cvars distinguish them from vanilla ezQuake, what their GitHub Releases naming scheme is.

16. **Slipgate dev devtools `invoke()` calls don't work** (per `reference_slipgate_devtools_invoke.md`). For Phase 3.5 verification, prefer filesystem inspection (`<data-root>/release-cache/<client>.json`, `<data-root>/binaries/<client>/<version>/manifest.json`) and PowerShell one-liners over devtools-driven checks.

---

## Design decisions

These resolve structural choices made during the 2026-04-26 evening design conversation. Each is written as **decision + rationale + which sub-phase implements it**.

### D1. Single button entry point, not multiple

**Decision:** One button labeled "Add Quake client" lives at the top of the version warehouse panel (Phase 3 stubs it). Clicking it routes to MyQuake → Browse → Clients filter rather than opening a separate modal/wizard.

**Why:** Operator's stated framing: "i would attempt to make it a single point of entry to simplify it for the user. Add Quake client, and then we have some good ui that guides the user to show us to the quake folder to scan, or a direct exe. but the main concept should resolve some of the burden." Discovery-and-curation in one step replaces the alternative of either auto-importing everything found (warehouse bloat) or refusing to act (forces user to type paths). Users see the result of a scan, pick what they want, done.

Beautifully unifies with MyQuake — it's already the user's "look at my Quake stuff" surface. Adding "manage client warehouse" to that surface doesn't introduce a new mental model. No separate wizard to design, build, and maintain.

**Phase:** Sub-phase 4 (entry-point flow).

### D2. Default-select-all in the import checklist

**Decision:** When the user opens the Clients filter checklist, every detected client row is pre-ticked. Primary CTA is "Import selected." User unticks rows they don't want; if they want only one, they untick the others.

**Why:** Operator's workflow: "i can just import all, so i have a functional overview of what my quake dir consist of and i can easy switch to another." Default-select-all matches that workflow with one click ("Import selected") rather than N clicks to tick each row. Also nudges toward an organized warehouse — even users who weren't planning to "import everything" get the value of "now I know what's in my quake dir" without extra friction.

For users who only want one client warehoused (operator's "perfect world" target state), the cost is N-1 unticks — still trivial for typical dirs (1-5 clients).

**Phase:** Sub-phase 4 (entry-point flow).

### D3. release_cache as a parallel module; updater refactor deferred

**Decision:** New `commands/release_cache.rs` module owns GitHub Releases data fetching for Phase 3.5's fingerprinter Tier-2 lookups. Caches at `<data-root>/release-cache/<client>.json`. Refresh-on-launch with 24-hour staleness check. Phase 3.5 does **NOT** refactor `commands/updater.rs:fetch_github_releases` to consume `release_cache` — the two systems coexist as parallel fetchers for now. Consolidation is deferred to a future cleanup arc.

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

### D6. Variant tiebreaker rule (filename-suffix → version-key suffix)

**Decision:** When the same client+version exists with different bytes (different sha256), append the filename-derived variant suffix to the version key. Example: ezQuake 3.6.6 has historically shipped as `ezquake.exe` AND `ezquake-glsl.exe` — same PE strings, same version, different binaries. Filename suffix `-glsl` becomes version-key suffix → warehouse paths become `binaries/ezquake/3.6.6/manifest.json` and `binaries/ezquake/3.6.6-glsl/manifest.json`. No collision.

Recognized variant suffixes: `-glsl`, `-debug`, `-dev`, `-test` (extensible list). Unknown suffixes fall through to refuse-and-prompt: "You already have ezQuake 3.6.6 warehoused. This binary has different bytes — replace, keep with custom variant tag, or skip?"

**Canonical-naming under D8.** Variants are NOT a messy-mode escape hatch — they're canonical-named with a stable suffix. The variant's canonical slot is `<quake-dir>/<family>-<variant>.exe` (e.g. `<quake-dir>/ezquake-glsl.exe`). Switching to a `-glsl` version writes to `ezquake-glsl.exe`; switching to vanilla writes to `ezquake.exe`. Both can coexist as separate canonical slots in the same dir without conflict because they're separate canonical *files*, each with its own active version pointer. This is the one case where a quake dir holds two simultaneously-active client binaries from the same family — and both are canonical.

**Why:** Variants are a real ezQuake-historical case (old GLSL builds shipped alongside vanilla). Collisions silently overwrite manifests today (only second-imported manifest sticks). The fix is small (one filename inspection at register time) and prevents data loss.

**Phase:** Sub-phase 1 (ClientFingerprint module exposes variant suffix; sub-phase 4 uses it during register_version calls).

### D7. Unknown clients filtered before the user sees the import list

**Decision:** The Clients filter view in MyQuake shows ONLY fingerprinter-classified clients (ezQuake / unezQuake-family / FTE). Tools, debug symbols, generic utilities, and unrecognized binaries are NOT in the import list. They're still visible in MyQuake's general browser (categorized as Tools or Other in existing classification), just not as importable clients.

**Why:** Importing `qizmo.exe` or `wget.exe` as a "Quake client" is meaningless; offering it as an option degrades the import experience. The fingerprinter's Unknown classification is a pre-filter, not a selectable option. Users who genuinely have a custom client we don't recognize can use the existing path-picker fallback (the simpler one Phase 3 might build as a stubbed alternative entry point), or wait for fingerprinter rule additions.

**Phase:** Sub-phase 3 (MyQuake browser augmentation).

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

**Profile schema gain (small):** Lift `quake_dir` to a top-level `setups[0].quake_dir` field, derived from `client.exe_path` parent on first migration. No `clients[family].mode` field. No mode tracking. The canonical exe per family is fully derivable: `<setups[0].quake_dir>/<family>.exe` (or `<family>-<variant>.exe` for variants). One-shot migrator on profile load handles existing v2 profiles.

**No Settings tab toggle.** Drop. Phase 3.5 does NOT add Settings UI for canonical-mode.

**No mode-switching prompts.** Drop. There are no modes.

**Phase:** Sub-phase 4 (canonicalize-on-import step in the bulk-import flow); profile schema migration is a pre-step in App.tsx mount.

---

## File-structure preview

**New Rust modules** (sub-phases 1-2):
- `src-tauri/src/commands/client_fingerprint.rs` — PE StringFileInfo reader + classification rules + variant suffix detection
- `src-tauri/src/commands/release_cache.rs` — GitHub Releases fetch + cache + per-client policy

**Modified Rust files**:
- `src-tauri/src/commands/mod.rs` — register new modules
- `src-tauri/src/lib.rs` — register new Tauri commands
- `src-tauri/src/commands/updater.rs` — NO refactor in this phase. `release_cache` lives as a parallel system; updater stays as-is. Consolidating updater's existing `fetch_github_releases` to consume `release_cache` is deferred to a future cleanup arc to keep Phase 3.5's risk surface small (the updater is shipped + working code; touching it for a non-functional consolidation is not worth the regression risk this phase). See sub-phase 2 for the explicit decision.

**New SolidJS files** (sub-phases 3-4):
- `src/lib/quake-dir/clientFingerprint.ts` — frontend wrapper
- `src/lib/quake-dir/clientFingerprint.test.ts`
- `src/lib/quake-dir/releaseCache.ts` — frontend wrapper
- `src/lib/quake-dir/releaseCache.test.ts`
- `src/lib/quake-dir/addClientFlow.ts` — orchestrates the bulk-import flow (calls fingerprint → match against cache → show checklist data → import selected)
- `src/lib/quake-dir/addClientFlow.test.ts`
- `src/components/AddClientPanel.tsx` — the checklist + primary-picker + import button UI
- `src/components/ClientImportRow.tsx` — single-row component with three-tier identity surfacing

**Modified SolidJS files**:
- `src/components/MyQuakeTab.tsx` — Clients first-class category in the existing browser; CLIENTS DETECTED sidebar gains actionable rows
- `src/components/VersionWarehouse.tsx` — wire the "Add Quake client" button (Phase 3 stubbed it) to route into MyQuake → Browse → Clients filter (locked design; see sub-phase 4 task 4.3)
- The MyQuake browser file-classification layer (wherever the existing type categorization lives) — gain a "Clients" type that calls the fingerprinter on each .exe

**Profile schema gain (per D8):**
- `src/store.ts` — `Setup` interface gains `quake_dir: string | null` field (top-level on Setup, not nested under `client`). Derived from `setups[0].client.exe_path` parent on first migration of a v2 profile. `migrateProfile()` handles the one-shot migration. No `clients[family].mode` field; canonical-only naming makes per-family mode unnecessary.

---

## Sub-phase 1: ClientFingerprint Rust module

**Sessions:** 1 (~2 hours)
**Goal:** Pure-Rust module that takes a path and returns a `ClientFingerprint` enum classifying it as ezQuake / unezQuake-family / FTE / Unknown, with version + variant suffix.

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
pub fn classify_from_pe_strings(pe: &PeStrings) -> ClientKind {
    // FTE check first — InternalName is the most stable signal
    if pe.internal_name.as_deref() == Some("ftequake") {
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

- [ ] **Step 2: Variant suffix detection from filename**

```rust
const KNOWN_VARIANT_SUFFIXES: &[&str] = &["glsl", "debug", "dev", "test"];

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

- [ ] **Step 4: Unit tests (8 tests)**

Test classification logic directly with literal PeStrings:

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
        assert_eq!(classify_from_pe_strings(&p), ClientKind::EzQuake);
    }

    #[test]
    fn classify_modern_unezquake() {
        let p = pe("ezQuake", "ezquake", "1.3.5-dev unezquake build");
        assert_eq!(classify_from_pe_strings(&p), ClientKind::UnezQuakeFamily);
    }

    #[test]
    fn classify_old_unezquake_with_antilag_suffix() {
        let p = pe("ezQuake", "ezquake", "3.6-dev-alpha10-antilag-r402 Build r7289");
        assert_eq!(classify_from_pe_strings(&p), ClientKind::UnezQuakeFamily);
    }

    #[test]
    fn classify_fte() {
        let p = pe("FTE QW", "ftequake", "01.20");
        assert_eq!(classify_from_pe_strings(&p), ClientKind::Fte);
    }

    #[test]
    fn classify_unknown() {
        let p = pe("Some Other Tool", "qizmo", "1.0");
        assert_eq!(classify_from_pe_strings(&p), ClientKind::Unknown);
    }

    #[test]
    fn classify_handles_case_insensitive_antilag() {
        let p = pe("ezQuake", "ezquake", "3.6 ANTILAG-r5");
        assert_eq!(classify_from_pe_strings(&p), ClientKind::UnezQuakeFamily);
    }

    #[test]
    fn variant_glsl_detected() {
        assert_eq!(variant_from_filename("ezquake-glsl.exe"), Some("glsl".to_string()));
        assert_eq!(variant_from_filename("ezquake.exe"), None);
    }

    #[test]
    fn variant_debug_detected() {
        assert_eq!(variant_from_filename("fteqw-debug.exe"), Some("debug".to_string()));
    }
}
```

- [ ] **Step 5: Build + test**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet && cargo test --quiet client_fingerprint
```

Expected: clean build, 8 tests pass.

- [ ] **Step 6: Wire fingerprint_exe + fingerprint_folder in lib.rs handler block**

- [ ] **Step 7: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/client_fingerprint.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs \
        apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): client_fingerprint module with PE strings classification"
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
    pub last_fetched: u64,      // unix epoch seconds
    pub releases: Vec<ReleaseEntry>,
    pub source: String,         // "github_releases", "builds_quakeworld_nu", "fte_triptohell", etc.
}

const CACHE_TTL_SECS: u64 = 24 * 60 * 60; // 24 hours

#[derive(Clone, Copy, Debug)]
pub enum DistributionShape {
    GitHubReleases { owner: &'static str, repo: &'static str },
    BuildsQuakeworld,
    FteTripToHell,
}

pub fn distribution_for(client: &str) -> Option<DistributionShape> {
    match client {
        "ezquake" => Some(DistributionShape::GitHubReleases {
            owner: "ezquake", repo: "ezquake-source"
        }),
        "ktx" => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group", repo: "ktx"
        }),
        "mvdsv" => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group", repo: "mvdsv"
        }),
        "qwfwd" => Some(DistributionShape::GitHubReleases {
            owner: "QW-Group", repo: "qwfwd"
        }),
        "unezquake" => Some(DistributionShape::GitHubReleases {
            owner: "dusty-qw", repo: "unezquake"
        }),
        "fte" => Some(DistributionShape::FteTripToHell),
        _ => None,
    }
}

pub fn supports_tier2(client: &str) -> bool {
    !matches!(distribution_for(client), Some(DistributionShape::FteTripToHell))
}
```

- [ ] **Step 2: Cache file I/O**

```rust
fn cache_path(data_root: &std::path::Path, client: &str) -> PathBuf {
    data_root.join("release-cache").join(format!("{}.json", client))
}

pub fn read_cache(data_root: &std::path::Path, client: &str) -> Option<ClientReleaseCache> {
    let path = cache_path(data_root, client);
    if !path.exists() { return None; }
    let text = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn write_cache(data_root: &std::path::Path, cache: &ClientReleaseCache) -> Result<(), String> {
    let path = cache_path(data_root, &cache.client);
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
) -> Result<ClientReleaseCache, String> {
    if let Some(cache) = read_cache(data_root, client) {
        if !is_stale(&cache) {
            return Ok(cache);
        }
    }

    let dist = distribution_for(client)
        .ok_or_else(|| format!("no distribution shape for client '{}'", client))?;

    let releases = match dist {
        DistributionShape::GitHubReleases { owner, repo } => {
            fetch_github_releases(owner, repo).await?
        }
        DistributionShape::FteTripToHell => fetch_fte_builds().await?,
        DistributionShape::BuildsQuakeworld => {
            // existing scraper lives in updater.rs; keep the dependency direction
            // sane by stubbing here for this phase
            Vec::new()
        }
    };

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let cache = ClientReleaseCache {
        client: client.to_string(),
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
) -> Result<ClientReleaseCache, String> {
    let root = data_root_path(&app)?;
    get_releases(&root, &client).await
}

#[tauri::command]
pub async fn refresh_all_release_caches(
    app: tauri::AppHandle,
) -> Result<HashMap<String, ClientReleaseCache>, String> {
    let root = data_root_path(&app)?;
    let mut out = HashMap::new();
    for client in ["ezquake", "ktx", "mvdsv", "qwfwd", "unezquake", "fte"] {
        if let Ok(cache) = get_releases(&root, client).await {
            out.insert(client.to_string(), cache);
        }
    }
    Ok(out)
}
```

- [ ] **Step 5: Tier-2 lookup helper**

```rust
pub fn matches_official_release(cache: &ClientReleaseCache, version_str: &str) -> bool {
    cache.releases.iter().any(|r| r.tag == version_str || r.tag == format!("v{}", version_str))
}
```

- [ ] **Step 6: Tests**

Tests for cache I/O + staleness + matches_official_release using TempDir. Skip live fetching (network-dependent).

- [ ] **Step 7: Build + test + commit**

### Task 2.2: Updater stays as-is (no refactor in this phase)

Per D3, Phase 3.5 does NOT refactor the updater to consume `release_cache`. The two systems coexist as parallel fetchers. This task is a no-op in 3.5; consolidation is deferred to a future cleanup arc with a functional trigger (e.g. release-notes panel feature).

If a future agent reading this plan is tempted to do the refactor anyway: don't. Updater is shipped/working, the refactor is non-functional, and Phase 3.5's risk surface is already substantial. Leave it.

---

## Sub-phase 3: MyQuake browser augmentation

**Sessions:** 1 (~2-3 hours)
**Goal:** MyQuake's existing browser gets a "Clients" first-class category. CLIENTS DETECTED sidebar gains actionable rows.

### Task 3.1: Frontend wrapper for fingerprint commands

- [ ] Create `src/lib/quake-dir/clientFingerprint.ts` with `fingerprintExe` and `fingerprintFolder` wrappers + types matching the Rust `ClientFingerprint` shape.
- [ ] Test file with 3 wrapper tests using the inline-invoke pattern Phase 2 established.

### Task 3.2: MyQuake browser Clients category

**Files:**
- Modify: `apps/slipgate-app/src/components/MyQuakeTab.tsx` (or wherever the file-classification layer lives)

- [ ] **Step 1: Wire fingerprint into the existing scan**

When the existing browser walks a directory, it currently classifies files by type. Add a parallel classification: for each `.exe` (excluding `.exe.db`), call `fingerprintExe`. Store the `ClientFingerprint` result alongside the existing file metadata.

- [ ] **Step 2: Add "Clients" filter category to the left sidebar**

Existing categories: Configuration Files, Crosshair Image, Texture, etc. Add "Clients" with a count of fingerprinter-classified clients (Unknown excluded). Clicking the filter shows only clients in the main browser pane.

- [ ] **Step 3: Make CLIENTS DETECTED sidebar rows actionable**

Each detected client row gains:
- Status pill: warehoused / not warehoused / active
- Hover or right-click reveals: Import / Set as primary / Remove from warehouse / Delete from disk
- Three-tier identity surface (small label or icon): "ezQuake 3.6.9 (verified official)" / "unezQuake-family (build 1.3.5)" / "ezQuake (unrecognized build)" / "FTE QW (build NNN)"

**Empty-Tier-2-data handling:** Per D5's per-client distribution policy table, FTE rows always have `releaseCache.releases.length === 0` (FTE doesn't ship via GitHub Releases — it's continuous nightly builds at fte.triptohell.info, intentionally stubbed in 3.5). The row component MUST NOT render "unrecognized" in this case — that's a Tier 3 identity claim that doesn't apply to FTE. Render FTE rows as `FTE QW (build NNN)` with no Tier 2 cross-check — if the build number can be parsed from the version string, surface it; otherwise just `FTE QW (<version-string>)`. The same handling applies to ezQuake snapshot rows until the BuildsQuakeworld scraper lands in `release_cache` (also intentionally stubbed in 3.5 — see sub-phase 2's `fetch_fte_builds` and `BuildsQuakeworld` arm comments). The row's "upgrade-nudge" UX adapts in parallel: for FTE, show "build NNN, latest build available is build MMM" if cache eventually surfaces it, otherwise omit. Critical-context #11 carries this rule for the engineer.

- [ ] **Step 4: Action grammar consistency note (per Position-in-bigger-picture)**

The verbs Phase 3.5 establishes on Client-domain rows — Import / Set primary or Set active / Remove from warehouse / Switch / Delete from disk — will be reused on every future Domain (Assets, Bundles, Maps, Matches). Use semantic DaisyUI classes consistently (e.g. `btn-primary` for Import, `btn-error` for destructive actions like Remove and Delete-from-disk, `btn-ghost` for non-destructive secondary actions like Set primary) so future Domain rows can match the visual grammar without re-deriving the design choice. No new components-shared lib in this phase — just consistent class usage.

- [ ] **Step 5: Tests + commit**

---

## Sub-phase 4: Add Quake client entry-point flow

**Sessions:** 1 (~2-3 hours)
**Goal:** The "Add Quake client" button (Phase 3 stubbed it) now routes to MyQuake → Browse → Clients filter, presents a default-select-all checklist, lets the user bulk-import.

### Task 4.1: addClientFlow orchestrator

- [ ] Create `src/lib/quake-dir/addClientFlow.ts`:
  - Takes a folder path (or single exe path) input
  - Calls `fingerprintFolder` (or `fingerprintExe`)
  - For each fingerprinted client, calls `releaseCache.get` and computes Tier 2 match status
  - Returns a list of `ImportCandidate` rows with all the data the UI needs

- [ ] Tests with the inline-invoke pattern (5-6 tests covering bulk-import, single-exe import, all-known, all-unknown, FTE-skip-tier2 cases).

### Task 4.2: AddClientPanel component

**Files:**
- Create: `apps/slipgate-app/src/components/AddClientPanel.tsx`
- Create: `apps/slipgate-app/src/components/ClientImportRow.tsx`

- [ ] **Step 1: Panel layout**

Two affordances: "Pick a folder" + "Pick a specific exe" (file picker buttons). Both feed into the same checklist screen.

- [ ] **Step 2: Checklist screen**

Default-all-ticked rows showing each detected client. Each row:
- Checkbox (default ticked)
- Three-tier identity surface
- Filename + path
- Version
- Variant suffix (if any)
- Primary radio button (one row gets selected as primary)

Bottom: "Import N selected" button (count updates as user ticks/unticks).

- [ ] **Step 3: Wire to register_version + reconcile_active_version + canonicalize-on-import (per D8)**

On Import click, for each ticked row, in order:

1. **Hash + write blob + write manifest** via `import_existing_install` (existing flow from Phase 2).

2. **Canonicalize the source filename if needed (D8 step):**
   - Compute the canonical filename: `<family>.exe` for vanilla, `<family>-<variant>.exe` if a known variant suffix is present (per D6's known-variant list).
   - Read the row's source filename and compare to canonical.
   - If source filename is non-canonical AND no canonical file exists in the same dir yet:
     - Show a confirmation prompt: "About to rename `<source-filename>` → `<canonical-filename>` so slipgate can manage versions. OK?", default-yes.
     - On confirm: rename source to canonical via Tauri `rename` Rust command (add a small `rename_to_canonical` command if one doesn't already exist; reuse existing fs primitives).
     - On decline: leave source as-is, but warn the user via toast that "slipgate will manage `<canonical-filename>` going forward; switching versions will write there even though this binary stayed at `<source-filename>`. Consider renaming via MyQuake later."
   - If source filename is non-canonical AND `<canonical-filename>` already exists in the same dir:
     - Skip the rename. Show an info toast: "`<canonical-filename>` already exists in this dir; the imported binary stays at `<source-filename>` as a duplicate copy. You can delete it later via MyQuake's 'Delete from disk' action if you don't need it."
   - If source filename IS canonical: no-op.

3. **After all rows processed**, call `reconcile_active_version` for the primary-selected row to set its version active.

4. **Profile schema update (D8 schema gain):** persist `setups[0].quake_dir = <selected dir from folder picker, or parent of selected exe>` on the same store.set call as the active-version pointer.

- [ ] **Step 4: Empty-Tier-2-data graceful handling (per D5 / sub-phase 3 cross-reference)**

If a row's `releaseCache` returned no releases (FTE always; ezQuake snapshot until BuildsQuakeworld scraper lands), the row's three-tier identity surface should NOT show "unrecognized" — it should show the family + version straight from the fingerprinter without a Tier 2 verdict, and the upgrade-nudge UX should adapt: for FTE specifically, "build NNN is from <date>; latest build available is build MMM" rather than "this is unrecognized" (per critical-context #11). Implementation lives in `ClientImportRow.tsx` — branch on `releaseCache.releases.length === 0 && releaseCache.source === "fte_triptohell"` (or the equivalent for snapshot-channel stub state).

- [ ] **Step 5: Tests + commit**

### Task 4.3: Wire Add Client button in VersionWarehouse (router-jump locked design)

**Files:**
- Modify: `apps/slipgate-app/src/components/VersionWarehouse.tsx` (Phase 3 stubbed this button)

**Design:** Replace the stub onClick with a router call to MyQuake → Browse → Clients filter. NOT a modal. Locked during 2026-04-27 second-pass review.

**Why router over modal:** Per the bigger-picture position note at the top of this plan, MyQuake is the load-bearing surface for all future Domain dashboards (Clients today; Assets, Bundles, Maps, Matches in future). Routing the Add-Client entry through MyQuake establishes the pattern that all "manage X" actions originate in MyQuake's Browse/Domains surfaces, not as standalone modals overlaid on whichever tab the user happens to be in. Modal would work for 3.5 but would create a precedent we'd have to walk back when bundle install / texture-set install land.

- [ ] **Step 1:** Replace the stub onClick with `setActiveTab("myquake"); setMyQuakeMode("browse"); setMyQuakeFilter("clients")` (or whatever the existing state shape is — check `App.tsx` and `MyQuakeTab.tsx` for the actual signal names).

- [ ] **Step 2:** Final integration test: click Add Client → see MyQuake open with Clients filter active → see folder picker (or detect existing dir state) → pick a folder → see checklist → import all → confirm warehouse populated → return to Clients tab → see VersionWarehouse panel reflect the new versions.

---

## Self-review against goal

Goal restated: Single-button "Add Quake client" routed through MyQuake's existing browser, identifies clients via PE-string fingerprinting, lets the user bulk-import all detected clients with one tick-list interaction, surfaces three-tier identity honestly, makes "switch to latest official" one click away from any unrecognized state.

Sub-phase 1 ships the fingerprinter. Sub-phase 2 ships the release-cache (parallel system; no updater refactor per D3). Sub-phase 3 surfaces fingerprint + release-cache results in MyQuake's existing browser. Sub-phase 4 wires the entry-point flow with bulk-import UX, including the canonicalize-on-import step (D8) and the locked router-jump design (task 4.3). Each sub-phase is independently shippable; the order respects dependencies (fingerprinter before MyQuake integration; release-cache before Tier 2 surfacing).

Three-tier identity: D5 per-client policy table covers when each tier applies. Sub-phase 3 surfaces all three tiers in the row component, with the empty-Tier-2-data graceful handling for FTE / ezQuake-snapshot stub states. Sub-phase 4 wires the upgrade nudge inline on Tier 3 rows.

Bulk import: D2 default-select-all + sub-phase 4 checklist UI cover this exactly. Canonical-only naming (D8) embeds in task 4.2 step 3 — rename source to `<family>.exe` on import with confirmation when canonical slot is empty, leave-as-duplicate when slot is occupied. Profile gains `setups[0].quake_dir`; no per-family mode field.

Position in bigger picture: this phase is the first explicit Tier 1 → Tier 2 crossing in the four-tier opt-in ladder (memory `project_slipgate_tier_ladder.md`). The action grammar (Import / Set primary / Remove from warehouse / Switch / Delete from disk) and the bulk-import flow shell are precedents future Tier 3 arcs (asset warehouse, bundle install, clean-room migration — captured in HANDOVER's "Tier 3 future arcs" entry) reuse wholesale. So the plan's self-imposed discipline isn't just about Phase 3.5 quality; it's about not painting the substrate into a corner.

---

## What this plan does NOT cover

- **FTE config parsing.** Fingerprinter classifies a binary as FTE; warehouse stores it. Slipgate can't read FTE configs, classify FTE binds, etc. That's a separate massive arc.
- **Multi-language UI.** All strings remain English-only.
- **Cross-machine warehouse sync** (the D9 "share my versioned setup" use case from the parent QDC plan). Future arc.
- **Bulk export** (export all warehoused versions to a zip). Operator confirmed this isn't wanted; bulk import is the primary use case.
- **GLSL-vs-vanilla cvar diffing.** Variants are warehoused independently; comparing them feature-wise is Phase 5's diff viewer's job, not this phase.
- **Active warehoused-version garbage collection** (delete old blobs when no manifest references them). Future cleanup arc.
- **Updater consolidation onto release_cache.** Per D3, updater stays as-is in 3.5. Consolidation is a deferred future cleanup arc with a functional trigger (release-notes panel or similar).
- **Settings tab opt-out toggle for canonical-mode.** Per D8, there is no toggle. The four-tier opt-in ladder makes "users who don't want slipgate to canonicalize their files" a Tier 0/1 lifestyle choice, not a Tier 2 mode preference. This is intentional — see HANDOVER's "Canonical-mode default for warehoused clients" entry for the reframe.
- **Mode-switching prompts** ("you're in messy mode, want to switch to canonical?"). Per D8, there are no modes.
- **Asset warehouse / 1-click texture-set switching / bundle install / clean-room migration.** All of these are Tier 3 future arcs that share Phase 2/3's warehouse substrate. Captured in HANDOVER's "Tier 3 future arcs" entry. Phase 3.5 establishes the precedents (action grammar, MyQuake routing, bulk-import shell) but does not implement any non-binary content management.
- **`fteplug_*.dll` plugin classification.** The fingerprinter classifies `.exe` files only. FTE plugin DLLs sit in the user's quake dir but are not Quake clients in the warehouse sense. They surface in MyQuake's general browser as Client Plugin (existing classification) but are not in the import list. Future asset-warehouse arc may treat plugins as a managed asset kind; out of scope for 3.5.

---

## Execution handoff

Plan ready for execution in a fresh terminal. Recommended workflow:

1. Open a fresh Claude session.
2. Verify Phase 3 is shipped: `git log --oneline | head -20` should show Phase 3 commits past `31f8b97`.
3. Read this plan in full plus the parent `2026-04-26-quake-dir-control.md` Phase 3 section.
4. Use `superpowers:executing-plans` (or `superpowers:subagent-driven-development` if subagents are working well).
5. Each sub-phase is one shippable commit cluster; commit + push at sub-phase boundaries.
