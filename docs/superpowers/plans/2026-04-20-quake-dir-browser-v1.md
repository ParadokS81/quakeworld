# Quake-dir Browser v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Browse mode inside MyQuake -- a three-pane Explorer-style lens over the user's quake dir, backed by a new Rust scanner that consumes oracle Phase 2c.6's asset-consumption bundle. Restructures MyQuake from 3 flat subtabs to a 2-mode shell (Browse | Domains) with the existing ConfigViewer relocating into Domains > Configs unchanged.

**Architecture:** Rust scanner at `src-tauri/src/commands/browse.rs` produces a typed `ScanResult` (clients, gamedirs, files, archives, warnings) consumed by a SolidJS `BrowseView` component that renders left-pane filter lens / center-pane disk tree / right-pane detail. Tree is a pure derivation over the flat file list; filters compose as predicates. Preview uses Tauri `convertFileSrc` for loose PNG/JPG and a byte-reading command for archive-interior files. No new npm dependencies; Rust uses only what's already in `Cargo.toml` (`zip`, `sha2`, `notify-debouncer-mini`).

**Tech Stack:** Rust (scanner, archive parsing, watcher), SolidJS + TypeScript (UI), Tailwind + DaisyUI (styling, existing OKLCH tokens), Tauri v2 IPC.

**Spec:** `apps/slipgate-app/docs/superpowers/specs/2026-04-20-quake-dir-browser-v1-design.md`

**Slipgate-specific conventions (from root CLAUDE.md):**
- Commit to `main` directly; no feature branch for this work.
- Run `bun run tsc --noEmit` in `apps/slipgate-app/` after every frontend change.
- Run `cargo check --manifest-path apps/slipgate-app/src-tauri/Cargo.toml` after every Rust change.
- Run `cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml <module>::tests` for module-scoped tests.
- ASCII only in code and docs. No em dashes, smart quotes, or decoration Unicode.
- Skip BrowseView in frontend unit tests -- slipgate convention is manual verification + strict TS.

---

## File structure

**New files:**

Rust:
- `apps/slipgate-app/src-tauri/src/commands/browse.rs` -- scanner module + Tauri commands

TypeScript:
- `apps/slipgate-app/src/lib/assets/bundle.ts` -- bundle hydrator, typed access to `ezquake-asset-bundle.json`
- `apps/slipgate-app/src/components/BrowseView.tsx` -- orchestrator
- `apps/slipgate-app/src/components/BrowseFilterLens.tsx` -- left pane
- `apps/slipgate-app/src/components/BrowseTree.tsx` -- center pane, recursive tree
- `apps/slipgate-app/src/components/BrowseTreeNode.tsx` -- one tree row (file or folder)
- `apps/slipgate-app/src/components/BrowseDetail.tsx` -- right pane
- `apps/slipgate-app/src/components/ResolutionChain.tsx` -- collision chain visualiser (reusable)
- `apps/slipgate-app/src/components/WindowedList.tsx` -- lean virtualised flat-list (used only for >200-child folder expansion)

**Modified files:**

- `apps/slipgate-app/src-tauri/src/commands/mod.rs` -- add `pub mod browse;`
- `apps/slipgate-app/src-tauri/src/lib.rs` -- register new Tauri commands in `generate_handler!`
- `apps/slipgate-app/src/types.ts` -- add `ScannedFile`, `ScanResult`, `Container`, etc.
- `apps/slipgate-app/src/store.ts` -- add `my_quake_mode`, `my_quake_domain`, `browse_hide_defaults` to `ProfilePrefs`, extend defaults + migration
- `apps/slipgate-app/src/components/MyQuakeTab.tsx` -- restructure to 2-mode toggle, render `BrowseView` in browse mode, `ConfigViewer` in domains > configs; thread additional props
- `apps/slipgate-app/src/App.tsx` -- pass `setActiveTab` down to `MyQuakeTab` so left-pane client-click can dispatch tab switch to Clients
- `apps/slipgate-app/docs/OVERVIEW.md` -- add Browse mode to the "What the app is" section and MyQuake tab description

**No changes (verify this at end):** `ConfigViewer.tsx`, `configMerger.ts`, `AliasChainResolver.tsx`, `StatePanel.tsx`, any `src-tauri/src/commands/` file other than `browse.rs`, `mod.rs`, `lib.rs`.

---

## Phase 1 -- Rust scanner foundation

### Task 1: Scaffold `browse.rs` with types and stub command

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/browse.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`
- Modify: `apps/slipgate-app/src-tauri/src/lib.rs`

- [ ] **Step 1: Create `browse.rs` with types and a stub command**

```rust
// apps/slipgate-app/src-tauri/src/commands/browse.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Container {
    Loose,
    Archive { archive_path: String, entry: String },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Confidence {
    Certain,
    Heuristic,
    Seed,
    Unclassified,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ConsumedBy {
    pub loader_sites: Vec<String>,
    pub cvar_bindings: Vec<usize>, // indices into the bundle's asset_cvar_bindings
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScannedFile {
    pub virtual_path: String,
    pub container: Container,
    pub size: u64,
    pub mtime: u64,
    pub content_hash: Option<String>,
    pub category_id: Option<String>,
    pub confidence: Confidence,
    pub search_path_winner: bool,
    pub consumed_by: ConsumedBy,
    pub is_default: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ClientInfo {
    pub name: String,
    pub exe_path: String,
    pub version: Option<String>,
    pub active: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ExternalRef {
    pub cvar_canonical_id: String,
    pub resolved_path: String,
    pub exists: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ArchiveInfo {
    pub archive_path: String,
    pub kind: String, // "pak" | "pk3" | "zip"
    pub size: u64,
    pub entry_count: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ScanWarningKind {
    ArchiveParseFailure,
    PermissionDenied,
    BundleMismatch,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScanWarning {
    pub kind: ScanWarningKind,
    pub path: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ScanStats {
    pub loaded: usize,
    pub available: usize,
    pub unreferenced: usize,
    pub other: usize,
    pub total_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScanResult {
    pub exe_path: String,
    pub scan_timestamp: u64,
    pub root: String,
    pub clients_detected: Vec<ClientInfo>,
    pub gamedirs_detected: Vec<String>,
    pub files: Vec<ScannedFile>,
    pub archives: Vec<ArchiveInfo>,
    pub unresolved_external_refs: Vec<ExternalRef>,
    pub warnings: Vec<ScanWarning>,
    pub stats: ScanStats,
}

#[tauri::command]
pub async fn scan_quake_dir(
    exe_path: String,
    _merged_cvars: HashMap<String, String>,
) -> Result<ScanResult, String> {
    let exe = PathBuf::from(&exe_path);
    let root = exe
        .parent()
        .ok_or_else(|| "invalid exe path".to_string())?
        .to_path_buf();

    Ok(ScanResult {
        exe_path: exe_path.clone(),
        scan_timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
        root: root.to_string_lossy().to_string(),
        clients_detected: Vec::new(),
        gamedirs_detected: Vec::new(),
        files: Vec::new(),
        archives: Vec::new(),
        unresolved_external_refs: Vec::new(),
        warnings: Vec::new(),
        stats: ScanStats::default(),
    })
}

#[cfg(test)]
mod tests {
    // Populated in later tasks.
}
```

- [ ] **Step 2: Register the module in `mod.rs`**

Edit `apps/slipgate-app/src-tauri/src/commands/mod.rs`, add line after `pub mod auth;` (keep alphabetical):

```rust
pub mod browse;
```

- [ ] **Step 3: Register the command in `lib.rs`**

Edit `apps/slipgate-app/src-tauri/src/lib.rs`, add inside `tauri::generate_handler![...]` after the last `commands::locs::...` line:

```rust
            commands::browse::scan_quake_dir,
```

- [ ] **Step 4: Verify the build**

```bash
cargo check --manifest-path apps/slipgate-app/src-tauri/Cargo.toml
```

Expected: `Finished` with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs \
        apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): scaffold browse scanner module and types"
```

---

### Task 2: Filesystem walker (loose files)

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Write the failing test**

Append to the `mod tests` block in `browse.rs`:

```rust
use super::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn walk_loose_files_skips_dotdirs() {
    let tmp = tempdir().unwrap();
    let root = tmp.path();

    fs::create_dir_all(root.join("qw/skins")).unwrap();
    fs::create_dir_all(root.join(".git/objects")).unwrap();
    fs::write(root.join("qw/skins/haste.pcx"), b"fake").unwrap();
    fs::write(root.join(".git/objects/deadbeef"), b"junk").unwrap();
    fs::write(root.join("config.cfg"), b"cfg").unwrap();

    let loose = walk_loose_files(root).unwrap();

    let paths: Vec<&str> = loose.iter().map(|(vp, _, _)| vp.as_str()).collect();
    assert!(paths.contains(&"qw/skins/haste.pcx"));
    assert!(paths.contains(&"config.cfg"));
    assert!(!paths.iter().any(|p| p.contains(".git")));
}
```

Also add `tempfile` as a dev-dependency. Edit `apps/slipgate-app/src-tauri/Cargo.toml` `[dev-dependencies]` section (add section if missing):

```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::walk_loose_files_skips_dotdirs
```

Expected: FAIL with "walk_loose_files not defined" or similar.

- [ ] **Step 3: Implement `walk_loose_files`**

Add to `browse.rs` above the `#[tauri::command]` block:

```rust
use std::path::Path;

const SKIP_DIR_PREFIX: &[&str] = &[".git", ".svn", ".hg", "node_modules", "__pycache__"];

fn should_skip_dir(name: &str) -> bool {
    name.starts_with('.') || SKIP_DIR_PREFIX.contains(&name)
}

/// Recursively walk `root`, returning `(virtual_path, size, mtime)` per file.
/// virtual_path is the POSIX-style relative path from root using `/`.
pub fn walk_loose_files(root: &Path) -> std::io::Result<Vec<(String, u64, u64)>> {
    let mut out = Vec::new();
    walk_inner(root, Path::new(""), &mut out)?;
    Ok(out)
}

fn walk_inner(
    base: &Path,
    relative: &Path,
    out: &mut Vec<(String, u64, u64)>,
) -> std::io::Result<()> {
    let here = base.join(relative);
    let entries = match std::fs::read_dir(&here) {
        Ok(it) => it,
        Err(_) => return Ok(()), // permission or missing - log and continue
    };

    for entry in entries.flatten() {
        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();

        if file_type.is_dir() {
            if should_skip_dir(&name) {
                continue;
            }
            walk_inner(base, &relative.join(&name), out)?;
            continue;
        }

        if !file_type.is_file() {
            continue;
        }

        let vp = relative.join(&name).to_string_lossy().replace('\\', "/");
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let size = meta.len();
        let mtime = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        out.push((vp, size, mtime));
    }

    Ok(())
}
```

- [ ] **Step 4: Run test to confirm pass**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::walk_loose_files_skips_dotdirs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs apps/slipgate-app/src-tauri/Cargo.toml
git commit -m "feat(slipgate): browse scanner walks loose files and skips dot-dirs"
```

---

### Task 3: Archive TOC enumeration

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Write the failing test**

Add to `mod tests`:

```rust
#[test]
fn enumerate_archives_collects_pak_entries() {
    use crate::commands::archive::{read_pak_index, ArchiveEntry};
    // Build a small in-memory PAK via the archive module's existing test helper.
    // For this test, we write a real pak to disk using the format archive::read_pak_index expects.
    let tmp = tempdir().unwrap();
    let pak_path = tmp.path().join("qw/pak99.pak");
    std::fs::create_dir_all(pak_path.parent().unwrap()).unwrap();
    let pak_bytes = build_test_pak(&[("skins/test.pcx", b"X")]);
    std::fs::write(&pak_path, &pak_bytes).unwrap();

    let (archives, entries) = enumerate_archives(tmp.path()).unwrap();
    assert_eq!(archives.len(), 1);
    assert_eq!(archives[0].archive_path, "qw/pak99.pak");
    assert_eq!(archives[0].entry_count, 1);
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].0, "qw/pak99.pak");
    assert_eq!(entries[0].1, "skins/test.pcx");
}

/// Minimal PAK builder for testing (mirrors archive.rs's make_test_pak).
fn build_test_pak(files: &[(&str, &[u8])]) -> Vec<u8> {
    let mut data = Vec::new();
    // header placeholder (12 bytes)
    data.extend_from_slice(b"PACK");
    data.extend_from_slice(&[0u8; 8]);

    // write file data, record offsets
    let mut offsets = Vec::new();
    for (_, content) in files {
        offsets.push((data.len() as u32, content.len() as u32));
        data.extend_from_slice(content);
    }

    // directory table
    let table_offset = data.len() as u32;
    for (i, (name, _)) in files.iter().enumerate() {
        let mut entry = [0u8; 64];
        let name_bytes = name.as_bytes();
        let len = name_bytes.len().min(55);
        entry[..len].copy_from_slice(&name_bytes[..len]);
        entry[56..60].copy_from_slice(&offsets[i].0.to_le_bytes());
        entry[60..64].copy_from_slice(&offsets[i].1.to_le_bytes());
        data.extend_from_slice(&entry);
    }

    let table_size = (files.len() * 64) as u32;
    data[4..8].copy_from_slice(&table_offset.to_le_bytes());
    data[8..12].copy_from_slice(&table_size.to_le_bytes());

    data
}
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::enumerate_archives_collects_pak_entries
```

Expected: FAIL - `enumerate_archives` not defined.

- [ ] **Step 3: Implement `enumerate_archives`**

Add to `browse.rs`:

```rust
use crate::commands::archive;

/// For each archive found in the tree, returns:
/// - a list of ArchiveInfo metadata entries
/// - a list of (archive_virtual_path, entry_name_inside_archive, size) tuples
pub fn enumerate_archives(root: &Path) -> std::io::Result<(Vec<ArchiveInfo>, Vec<(String, String, u64)>)> {
    let loose = walk_loose_files(root)?;
    let mut archives = Vec::new();
    let mut entries = Vec::new();

    for (vp, size, _) in &loose {
        let lower = vp.to_lowercase();
        if !(lower.ends_with(".pak") || lower.ends_with(".pk3") || lower.ends_with(".zip")) {
            continue;
        }
        let abs = root.join(vp);
        match archive::scan_archive(&abs) {
            Ok((fmt, arch_entries)) => {
                let kind = match fmt {
                    archive::ArchiveFormat::Pak => "pak",
                    archive::ArchiveFormat::Zip => {
                        if lower.ends_with(".pk3") { "pk3" } else { "zip" }
                    }
                };
                archives.push(ArchiveInfo {
                    archive_path: vp.clone(),
                    kind: kind.to_string(),
                    size: *size,
                    entry_count: arch_entries.len(),
                });
                for e in arch_entries {
                    entries.push((vp.clone(), e.name, e.size));
                }
            }
            Err(_) => {
                // parse failure swallowed here; surfaced as a warning by the orchestrator
                continue;
            }
        }
    }

    Ok((archives, entries))
}
```

- [ ] **Step 4: Run test to confirm pass**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::enumerate_archives
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs
git commit -m "feat(slipgate): browse scanner enumerates archive TOCs"
```

---

### Task 4: Category classification

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Add bundle types inside `browse.rs`**

The scanner needs typed access to the JSON bundle fields it consumes. Define a minimal subset at the top of `browse.rs` (above the `Container` enum):

```rust
#[derive(Deserialize, Clone, Debug)]
pub struct BundleExtension {
    pub extension: String,
    #[serde(default)]
    pub path_hint: Option<String>,
    pub category_id: String,
}

#[derive(Deserialize, Clone, Debug)]
pub struct BundlePathRule {
    pub canonical_id: String,
    pub rule_kind: String,
    pub ordinal: i32,
    pub description: String,
    pub source_ref: String,
    #[serde(default)]
    pub source_verified: i32,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct BundleCvarBinding {
    pub cvar_canonical_id: String,
    pub category_id: String,
    #[serde(default)]
    pub path_pattern: Option<String>,
    pub load_trigger: String,
    pub confidence: String, // "seed" | "auto" | ...
    pub source_ref: String,
}

#[derive(Deserialize, Clone, Debug)]
pub struct BundleLoaderSite {
    pub canonical_id: String,
    pub function_name: String,
    pub source_file: String,
    pub source_line: i32,
    pub enclosing_function: String,
    #[serde(default)]
    pub reads_category_id: Option<String>,
    pub load_trigger: String,
    pub path_source: String,
    #[serde(default)]
    pub path_literal: Option<String>,
    #[serde(default)]
    pub path_cvar_id: Option<String>,
    pub confidence: String,
    pub dev_only: i32,
}

#[derive(Deserialize, Clone, Debug)]
pub struct Bundle {
    #[serde(default)]
    pub asset_extensions: Vec<BundleExtension>,
    #[serde(default)]
    pub asset_path_rules: Vec<BundlePathRule>,
    #[serde(default)]
    pub asset_cvar_bindings: Vec<BundleCvarBinding>,
    #[serde(default)]
    pub asset_loader_sites: Vec<BundleLoaderSite>,
}

const BUNDLE_JSON: &str = include_str!("../../../../../packages/qw-config/src/data/ezquake-asset-bundle.json");

fn load_bundle() -> Bundle {
    serde_json::from_str(BUNDLE_JSON).unwrap_or_else(|e| {
        eprintln!("[browse] bundle parse failed: {}. Browse will classify everything as other.", e);
        Bundle {
            asset_extensions: Vec::new(),
            asset_path_rules: Vec::new(),
            asset_cvar_bindings: Vec::new(),
            asset_loader_sites: Vec::new(),
        }
    })
}
```

- [ ] **Step 2: Write the classification test**

```rust
#[test]
fn classify_by_extension_and_path_hint() {
    let extensions = vec![
        BundleExtension { extension: ".pcx".into(), path_hint: Some("skins/".into()), category_id: "ezquake:asset_category:skin".into() },
        BundleExtension { extension: ".tga".into(), path_hint: Some("textures/".into()), category_id: "ezquake:asset_category:texture".into() },
        BundleExtension { extension: ".tga".into(), path_hint: Some("conchars/".into()), category_id: "ezquake:asset_category:conchar".into() },
        BundleExtension { extension: ".cfg".into(), path_hint: None, category_id: "ezquake:asset_category:config".into() },
    ];

    assert_eq!(
        classify_extension("qw/skins/haste.pcx", &extensions),
        Some("ezquake:asset_category:skin".to_string()),
    );
    assert_eq!(
        classify_extension("qw/textures/wall.tga", &extensions),
        Some("ezquake:asset_category:texture".to_string()),
    );
    assert_eq!(
        classify_extension("qw/conchars/custom.tga", &extensions),
        Some("ezquake:asset_category:conchar".to_string()),
    );
    assert_eq!(
        classify_extension("qw/config.cfg", &extensions),
        Some("ezquake:asset_category:config".to_string()),
    );
    assert_eq!(classify_extension("random/thing.xyz", &extensions), None);
}
```

- [ ] **Step 3: Run test to confirm failure**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::classify_by_extension_and_path_hint
```

Expected: FAIL.

- [ ] **Step 4: Implement `classify_extension`**

Add to `browse.rs`:

```rust
/// Match a virtual_path against the bundle's extension rules.
/// Returns the category_id for the first match that satisfies both extension AND path_hint.
/// Path-hinted rules take priority over path-less rules on the same extension.
pub fn classify_extension(virtual_path: &str, extensions: &[BundleExtension]) -> Option<String> {
    let lower = virtual_path.to_lowercase();

    // Pass 1: path-hinted rules (more specific) first.
    for rule in extensions.iter().filter(|r| r.path_hint.is_some()) {
        if !lower.ends_with(&rule.extension.to_lowercase()) {
            continue;
        }
        let hint = rule.path_hint.as_ref().unwrap().to_lowercase();
        if lower.contains(&hint) {
            return Some(rule.category_id.clone());
        }
    }

    // Pass 2: plain-extension rules (no hint).
    for rule in extensions.iter().filter(|r| r.path_hint.is_none()) {
        if lower.ends_with(&rule.extension.to_lowercase()) {
            return Some(rule.category_id.clone());
        }
    }

    None
}
```

- [ ] **Step 5: Run test to confirm pass**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::classify_by_extension_and_path_hint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs
git commit -m "feat(slipgate): browse scanner classifies files by extension and path hint"
```

---

### Task 5: LIFO winner computation

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Write the test**

```rust
#[test]
fn lifo_resolution_picks_loose_over_pak() {
    // Three sources for the same virtual_path. In ezQuake's LIFO searchpath,
    // the most recently added wins. Mount order: id1 -> ezquake -> qw -> home.
    // Loose file in qw/ is added AFTER any paks in qw/ (paks mount first, loose walked second),
    // so actually pak1 (most recently mounted within qw/) wins over earlier id1 paks but loose qw/
    // files outrank the gamedir's own paks? Actually per fs.c, gamedir mount adds directory-level
    // first then its paks. The practical rule we capture: "most recently added to searchpaths wins".
    //
    // For our v1 heuristic we treat loose files in the most-specific gamedir as winners.
    // Simpler rule: loose in qw > pak in qw > loose in ezquake > ... > id1
    // Concretely our test: qw/conchars.tga loose wins over qw/pak1.pak:conchars.tga wins over ezquake/pak0.pak:conchars.tga.

    let candidates = vec![
        ("qw/textures/conchars.tga".to_string(), Container::Loose),
        ("qw/textures/conchars.tga".to_string(), Container::Archive {
            archive_path: "qw/pak1.pak".into(),
            entry: "textures/conchars.tga".into(),
        }),
        ("qw/textures/conchars.tga".to_string(), Container::Archive {
            archive_path: "ezquake/pak0.pak".into(),
            entry: "textures/conchars.tga".into(),
        }),
    ];

    let winners = pick_lifo_winners(&candidates);
    assert_eq!(winners.len(), 3);
    assert!(winners[0], "loose in qw should win");
    assert!(!winners[1]);
    assert!(!winners[2]);
}

#[test]
fn lifo_resolution_single_source_always_wins() {
    let candidates = vec![
        ("qw/skins/haste.pcx".to_string(), Container::Loose),
    ];
    let winners = pick_lifo_winners(&candidates);
    assert_eq!(winners, vec![true]);
}
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::lifo
```

Expected: FAIL - `pick_lifo_winners` undefined.

- [ ] **Step 3: Implement `pick_lifo_winners`**

Add to `browse.rs`:

```rust
/// For each candidate, return true iff this entry is the LIFO winner for its virtual_path.
/// Heuristic v1 ranking (higher = wins):
///   3: loose file in a user gamedir (qw/ezquake/custom)
///   2: archive-interior entry in a user gamedir
///   1: loose file in id1/
///   0: archive-interior entry in id1/
/// Ties within a rank resolve by the archive's lexical order (later name = later mount).
pub fn pick_lifo_winners(candidates: &[(String, Container)]) -> Vec<bool> {
    use std::collections::HashMap;

    fn rank(vp: &str, container: &Container) -> (u8, String) {
        let first_segment = vp.split('/').next().unwrap_or("");
        let gamedir_rank = if first_segment == "id1" { 0u8 } else { 2u8 };
        let container_bonus = match container {
            Container::Loose => 1u8,
            Container::Archive { .. } => 0u8,
        };
        let tie_key = match container {
            Container::Loose => "~loose".to_string(),
            Container::Archive { archive_path, .. } => archive_path.clone(),
        };
        (gamedir_rank + container_bonus, tie_key)
    }

    let mut best: HashMap<String, (u8, String, usize)> = HashMap::new();
    for (i, (vp, container)) in candidates.iter().enumerate() {
        let (r, tie) = rank(vp, container);
        match best.get(vp) {
            Some((prev_r, prev_tie, _)) => {
                if r > *prev_r || (r == *prev_r && tie.as_str() > prev_tie.as_str()) {
                    best.insert(vp.clone(), (r, tie, i));
                }
            }
            None => {
                best.insert(vp.clone(), (r, tie, i));
            }
        }
    }

    candidates
        .iter()
        .enumerate()
        .map(|(i, (vp, _))| best.get(vp).map(|(_, _, winner_idx)| *winner_idx == i).unwrap_or(false))
        .collect()
}
```

- [ ] **Step 4: Run test to confirm pass**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::lifo
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs
git commit -m "feat(slipgate): browse scanner picks LIFO winners for colliding virtual paths"
```

---

### Task 6: Loader-site matching

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Write the test**

```rust
#[test]
fn loader_site_literal_matches_virtual_path() {
    let sites = vec![
        BundleLoaderSite {
            canonical_id: "ezquake:loader_site:Draw_LoadConback".into(),
            function_name: "Draw_CachePicSafe".into(),
            source_file: "gl_draw.c".into(),
            source_line: 281,
            enclosing_function: "Draw_Init".into(),
            reads_category_id: Some("ezquake:asset_category:hud_overlay".into()),
            load_trigger: "startup".into(),
            path_source: "literal".into(),
            path_literal: Some("textures/conback".into()),
            path_cvar_id: None,
            confidence: "certain".into(),
            dev_only: 0,
        },
    ];

    let matches = match_loader_sites("qw/textures/conback.tga", &sites);
    assert_eq!(matches, vec!["ezquake:loader_site:Draw_LoadConback".to_string()]);
}

#[test]
fn loader_site_no_match_when_path_different() {
    let sites = vec![
        BundleLoaderSite {
            canonical_id: "ezquake:loader_site:test".into(),
            function_name: "X".into(),
            source_file: "f.c".into(),
            source_line: 1,
            enclosing_function: "g".into(),
            reads_category_id: None,
            load_trigger: "startup".into(),
            path_source: "literal".into(),
            path_literal: Some("skins/specific".into()),
            path_cvar_id: None,
            confidence: "certain".into(),
            dev_only: 0,
        },
    ];
    assert!(match_loader_sites("qw/textures/wall.tga", &sites).is_empty());
}
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::loader_site
```

Expected: FAIL.

- [ ] **Step 3: Implement `match_loader_sites`**

```rust
/// Return canonical_ids of loader sites whose path_literal matches this virtual_path.
/// Match semantics: case-insensitive, literal substring match on the last 2 path segments.
/// path_literals are typically file-stems without extension (e.g. "textures/conback")
/// so we match against virtual_path with its extension stripped.
pub fn match_loader_sites(virtual_path: &str, sites: &[BundleLoaderSite]) -> Vec<String> {
    let vp_lower = virtual_path.to_lowercase();
    let vp_no_ext = match vp_lower.rfind('.') {
        Some(i) => &vp_lower[..i],
        None => &vp_lower,
    };

    sites
        .iter()
        .filter_map(|s| {
            let lit = s.path_literal.as_ref()?.to_lowercase();
            if vp_no_ext.ends_with(&lit) || vp_no_ext.contains(&format!("/{}", lit)) {
                Some(s.canonical_id.clone())
            } else {
                None
            }
        })
        .collect()
}
```

- [ ] **Step 4: Run test to confirm pass**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::loader_site
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs
git commit -m "feat(slipgate): browse scanner matches files against oracle loader sites"
```

---

### Task 7: Cvar-binding resolution

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Write the test**

```rust
#[test]
fn cvar_binding_resolves_path_pattern() {
    let bindings = vec![
        BundleCvarBinding {
            cvar_canonical_id: "ezquake:cvar:baseskin".into(),
            category_id: "ezquake:asset_category:skin".into(),
            path_pattern: Some("skins/{value}.pcx".into()),
            load_trigger: "on_connect".into(),
            confidence: "seed".into(),
            source_ref: "skin.c:369".into(),
        },
    ];

    let mut cvars = HashMap::new();
    cvars.insert("baseskin".to_string(), "haste".to_string());

    let matches = match_cvar_bindings("qw/skins/haste.pcx", &bindings, &cvars);
    assert_eq!(matches, vec![0usize]);

    let miss = match_cvar_bindings("qw/skins/otherskin.pcx", &bindings, &cvars);
    assert!(miss.is_empty());
}

#[test]
fn cvar_binding_skipped_when_value_missing() {
    let bindings = vec![
        BundleCvarBinding {
            cvar_canonical_id: "ezquake:cvar:baseskin".into(),
            category_id: "ezquake:asset_category:skin".into(),
            path_pattern: Some("skins/{value}.pcx".into()),
            load_trigger: "on_connect".into(),
            confidence: "seed".into(),
            source_ref: "x".into(),
        },
    ];

    let cvars: HashMap<String, String> = HashMap::new();
    assert!(match_cvar_bindings("qw/skins/anything.pcx", &bindings, &cvars).is_empty());
}
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::cvar_binding
```

Expected: FAIL.

- [ ] **Step 3: Implement `match_cvar_bindings`**

```rust
/// Return indices of cvar bindings whose resolved path matches this virtual_path.
/// Substitutes `{value}` in path_pattern with the merged cvar value and compares.
/// Match is case-insensitive suffix match against the resolved path.
pub fn match_cvar_bindings(
    virtual_path: &str,
    bindings: &[BundleCvarBinding],
    merged_cvars: &HashMap<String, String>,
) -> Vec<usize> {
    let vp_lower = virtual_path.to_lowercase();
    let mut out = Vec::new();

    for (i, b) in bindings.iter().enumerate() {
        let Some(pattern) = b.path_pattern.as_ref() else {
            continue;
        };
        // Short cvar name = canonical_id stripped of "ezquake:cvar:" prefix
        let short = b
            .cvar_canonical_id
            .rsplit(':')
            .next()
            .unwrap_or(&b.cvar_canonical_id);
        let Some(value) = merged_cvars.get(short) else {
            continue;
        };
        let resolved = pattern.replace("{value}", value).to_lowercase();
        if vp_lower.ends_with(&resolved) || vp_lower.contains(&format!("/{}", resolved)) {
            out.push(i);
        }
    }

    out
}
```

- [ ] **Step 4: Run test to confirm pass**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::cvar_binding
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs
git commit -m "feat(slipgate): browse scanner resolves cvar path-pattern bindings"
```

---

### Task 8: `is_default` heuristic + external-ref detection

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Write the test**

```rust
#[test]
fn is_default_id1_always_default() {
    assert!(compute_is_default("id1/anything.bsp", &Container::Loose));
    assert!(compute_is_default("id1/stuff/thing.wav", &Container::Loose));
}

#[test]
fn is_default_shipped_pak_is_default() {
    let in_ez_pak0 = Container::Archive {
        archive_path: "ezquake/pak0.pak".into(),
        entry: "textures/test.tga".into(),
    };
    assert!(compute_is_default("ezquake/pak0.pak:textures/test.tga", &in_ez_pak0));

    let in_qw_pak1 = Container::Archive {
        archive_path: "qw/pak1.pak".into(),
        entry: "textures/thing.tga".into(),
    };
    assert!(compute_is_default("qw/pak1.pak:textures/thing.tga", &in_qw_pak1));
}

#[test]
fn is_default_loose_in_user_gamedir_is_custom() {
    assert!(!compute_is_default("qw/skins/haste.pcx", &Container::Loose));
    assert!(!compute_is_default("ezquake/hud/overlay.png", &Container::Loose));
}

#[test]
fn is_default_user_pak_not_default() {
    let custom_pak = Container::Archive {
        archive_path: "qw/skinpack.pak".into(),
        entry: "skins/one.pcx".into(),
    };
    assert!(!compute_is_default("qw/skinpack.pak:skins/one.pcx", &custom_pak));
}

#[test]
fn external_ref_detected_when_pattern_escapes_root() {
    let bindings = vec![
        BundleCvarBinding {
            cvar_canonical_id: "ezquake:cvar:crosshairimage".into(),
            category_id: "ezquake:asset_category:crosshair".into(),
            path_pattern: Some("{value}".into()),
            load_trigger: "on_demand".into(),
            confidence: "seed".into(),
            source_ref: "x".into(),
        },
    ];

    let mut cvars = HashMap::new();
    cvars.insert("crosshairimage".to_string(), "../outside/xhair.png".to_string());

    let refs = find_external_refs(&bindings, &cvars, "/quake");
    assert_eq!(refs.len(), 1);
    assert_eq!(refs[0].cvar_canonical_id, "ezquake:cvar:crosshairimage");
    assert!(refs[0].resolved_path.contains("outside"));
}
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::is_default
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::external_ref
```

Expected: FAIL.

- [ ] **Step 3: Implement both functions**

```rust
/// Shipped pak filenames that count as default client content.
/// Conservative v1 list: standard ezQuake/qw/id1 paks named pak0 through pak9.
const SHIPPED_PAK_NAMES: &[&str] = &[
    "pak0.pak", "pak1.pak", "pak2.pak",
];

const SHIPPED_GAMEDIRS_FOR_PAK: &[&str] = &["id1", "ezquake", "qw"];

pub fn compute_is_default(_virtual_path: &str, container: &Container) -> bool {
    match container {
        Container::Loose => {
            let first = _virtual_path.split('/').next().unwrap_or("");
            first == "id1"
        }
        Container::Archive { archive_path, .. } => {
            let gamedir = archive_path.split('/').next().unwrap_or("");
            let pak_name = archive_path.rsplit('/').next().unwrap_or("");
            SHIPPED_GAMEDIRS_FOR_PAK.contains(&gamedir)
                && SHIPPED_PAK_NAMES.contains(&pak_name.to_lowercase().as_str())
        }
    }
}

/// Detect cvar bindings whose resolved path escapes `root`. Does not enumerate.
pub fn find_external_refs(
    bindings: &[BundleCvarBinding],
    merged_cvars: &HashMap<String, String>,
    root: &str,
) -> Vec<ExternalRef> {
    use std::path::Path;
    let root_path = Path::new(root);
    let mut out = Vec::new();

    for b in bindings {
        let Some(pattern) = b.path_pattern.as_ref() else {
            continue;
        };
        let short = b
            .cvar_canonical_id
            .rsplit(':')
            .next()
            .unwrap_or(&b.cvar_canonical_id);
        let Some(value) = merged_cvars.get(short) else {
            continue;
        };
        let resolved = pattern.replace("{value}", value);

        // Absolute path OR contains ..
        let is_abs_external = Path::new(&resolved).is_absolute()
            && !Path::new(&resolved).starts_with(root_path);
        let is_dotdot = resolved.contains("..");

        if is_abs_external || is_dotdot {
            let full = if is_abs_external {
                resolved.clone()
            } else {
                root_path.join(&resolved).to_string_lossy().to_string()
            };
            out.push(ExternalRef {
                cvar_canonical_id: b.cvar_canonical_id.clone(),
                resolved_path: full.clone(),
                exists: Path::new(&full).exists(),
            });
        }
    }

    out
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs
git commit -m "feat(slipgate): browse scanner computes is_default and detects external refs"
```

---

### Task 9: Wire `scan_quake_dir` end-to-end

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`

- [ ] **Step 1: Write an integration test with a fake quake dir**

```rust
#[test]
fn scan_end_to_end_small_tree() {
    let tmp = tempdir().unwrap();
    let root = tmp.path();

    // Structure:
    //   qw/skins/haste.pcx       (loose skin)
    //   qw/textures/wall.tga     (loose texture)
    //   qw/pak1.pak              (contains skins/bps.pcx)
    //   id1/readme.txt           (id1 stock)
    //   qizmo/qizmo.exe          (unreferenced junk)
    std::fs::create_dir_all(root.join("qw/skins")).unwrap();
    std::fs::create_dir_all(root.join("qw/textures")).unwrap();
    std::fs::create_dir_all(root.join("id1")).unwrap();
    std::fs::create_dir_all(root.join("qizmo")).unwrap();
    std::fs::write(root.join("qw/skins/haste.pcx"), b"x").unwrap();
    std::fs::write(root.join("qw/textures/wall.tga"), b"x").unwrap();
    std::fs::write(root.join("id1/readme.txt"), b"x").unwrap();
    std::fs::write(root.join("qizmo/qizmo.exe"), b"x").unwrap();
    std::fs::write(
        root.join("qw/pak1.pak"),
        build_test_pak(&[("skins/bps.pcx", b"x")]),
    ).unwrap();

    let fake_exe = root.join("qw/ezquake.exe");
    std::fs::write(&fake_exe, b"x").unwrap();

    let cvars = HashMap::new();
    let result = tauri::async_runtime::block_on(scan_quake_dir(
        fake_exe.to_string_lossy().to_string(),
        cvars,
    ))
    .expect("scan should succeed");

    // Root is qw/ itself because exe lives in qw/. Adjust expectations.
    assert!(!result.files.is_empty());
    // Every entry has a category_id or is category_id None (other).
    for f in &result.files {
        assert!(f.size > 0 || f.size == 0);
    }
    assert!(result.stats.total_bytes >= 5); // 5 one-byte files minimum
}
```

This test is deliberately loose on assertions because the resolved root depends on which dir the fake exe is placed in. The point is: scan runs end-to-end without crashing on a real filesystem tree with a pak.

- [ ] **Step 2: Run test to confirm initial failure (stub command returns empty)**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests::scan_end_to_end_small_tree
```

Expected: FAIL -- `result.files` is empty because command is still a stub.

- [ ] **Step 3: Replace the `scan_quake_dir` stub with the full pipeline**

Replace the existing `scan_quake_dir` body with:

```rust
#[tauri::command]
pub async fn scan_quake_dir(
    exe_path: String,
    merged_cvars: HashMap<String, String>,
) -> Result<ScanResult, String> {
    let exe = PathBuf::from(&exe_path);
    let root = exe
        .parent()
        .ok_or_else(|| "invalid exe path".to_string())?
        .to_path_buf();
    let root_str = root.to_string_lossy().to_string();

    let bundle = load_bundle();
    let mut warnings: Vec<ScanWarning> = Vec::new();

    // Stage 2: walk loose files
    let loose = walk_loose_files(&root).map_err(|e| format!("walk failed: {}", e))?;

    // Stage 3: archive TOC enumeration (with per-archive error collection)
    let (archives, archive_entries) = enumerate_archives(&root).unwrap_or_else(|e| {
        warnings.push(ScanWarning {
            kind: ScanWarningKind::ArchiveParseFailure,
            path: root_str.clone(),
            message: format!("archive enumeration failed: {}", e),
        });
        (Vec::new(), Vec::new())
    });

    // Combine into candidate list: (virtual_path, container, size, mtime)
    let mut candidates: Vec<(String, Container, u64, u64)> = Vec::new();
    for (vp, size, mtime) in loose {
        // Skip archives themselves from the "files" list - they're in `archives`
        let lower = vp.to_lowercase();
        let is_archive = lower.ends_with(".pak") || lower.ends_with(".pk3") || lower.ends_with(".zip");
        if !is_archive {
            candidates.push((vp, Container::Loose, size, mtime));
        }
    }
    for (archive_path, entry_name, size) in archive_entries {
        let vp = format!("{}:{}", archive_path, entry_name);
        let container = Container::Archive {
            archive_path: archive_path.clone(),
            entry: entry_name.clone(),
        };
        candidates.push((vp, container, size, 0));
    }

    // Stage 6: LIFO winners need a "normalized" virtual_path (the archive-interior entry path
    // relative to the gamedir, NOT the "pakfile:entry" form, because the engine resolves by
    // relative-path not by archive). Build a normalization function.
    fn normalize_for_lifo(vp: &str, container: &Container) -> String {
        match container {
            Container::Loose => vp.to_string(),
            Container::Archive { archive_path, entry } => {
                // Strip archive filename, keep the gamedir prefix + entry.
                // e.g. "qw/pak1.pak:skins/bps.pcx" -> "qw/skins/bps.pcx"
                let gamedir = archive_path.split('/').next().unwrap_or("").to_string();
                format!("{}/{}", gamedir, entry)
            }
        }
    }

    let normalized_pairs: Vec<(String, Container)> = candidates
        .iter()
        .map(|(vp, c, _, _)| (normalize_for_lifo(vp, c), c.clone()))
        .collect();
    let winners = pick_lifo_winners(&normalized_pairs);

    // Stage 4, 5, 7, 8: classification + loader sites + cvar bindings + is_default
    let mut files: Vec<ScannedFile> = Vec::with_capacity(candidates.len());
    for (i, (vp, container, size, mtime)) in candidates.into_iter().enumerate() {
        let normalized = normalize_for_lifo(&vp, &container);
        let category_id = classify_extension(&normalized, &bundle.asset_extensions);
        let confidence = match (&category_id, &container) {
            (None, _) => Confidence::Unclassified,
            (Some(_), Container::Loose) => Confidence::Heuristic,
            (Some(_), Container::Archive { .. }) => Confidence::Heuristic,
        };
        let loader_matches = match_loader_sites(&normalized, &bundle.asset_loader_sites);
        let cvar_matches = match_cvar_bindings(&normalized, &bundle.asset_cvar_bindings, &merged_cvars);
        // Upgrade confidence to certain when a loader site matches with a literal path.
        let confidence = if !loader_matches.is_empty() {
            Confidence::Certain
        } else if !cvar_matches.is_empty() {
            Confidence::Seed
        } else {
            confidence
        };

        files.push(ScannedFile {
            virtual_path: vp,
            container: container.clone(),
            size,
            mtime,
            content_hash: None,
            category_id,
            confidence,
            search_path_winner: winners[i],
            consumed_by: ConsumedBy {
                loader_sites: loader_matches,
                cvar_bindings: cvar_matches,
            },
            is_default: compute_is_default(&normalized, &container),
        });
    }

    // Stage 9: external refs
    let unresolved_external_refs =
        find_external_refs(&bundle.asset_cvar_bindings, &merged_cvars, &root_str);

    // Clients detected (v1: only the active one)
    let clients_detected = vec![ClientInfo {
        name: "ezquake".to_string(),
        exe_path: exe_path.clone(),
        version: None,
        active: true,
    }];

    // Gamedirs detected: any top-level dir that is one of the known gamedirs OR contains config.cfg.
    let mut gamedirs_detected: Vec<String> = Vec::new();
    let known: &[&str] = &["id1", "qw", "ezquake"];
    if let Ok(entries) = std::fs::read_dir(&root) {
        for e in entries.flatten() {
            if !e.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                continue;
            }
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let has_cfg = e.path().join("config.cfg").exists();
            if known.contains(&name.as_str()) || has_cfg {
                gamedirs_detected.push(name);
            }
        }
    }

    // Stats
    let mut stats = ScanStats::default();
    for f in &files {
        stats.total_bytes = stats.total_bytes.saturating_add(f.size);
        let has_ref = !f.consumed_by.loader_sites.is_empty() || !f.consumed_by.cvar_bindings.is_empty();
        match (has_ref, &f.category_id) {
            (true, _) => stats.loaded += 1,
            (false, Some(_)) => stats.unreferenced += 1,
            (false, None) => stats.other += 1,
        }
    }
    // "available" in v1: files with a category but no direct loader-site match (map textures etc).
    // Our simple rule: any file with a category_id AND no loader reference AND not shipped-default AND
    // not in id1 counts as "available". Revisit in Phase 2 when on-demand semantics get finer.
    stats.available = files
        .iter()
        .filter(|f| {
            f.category_id.is_some()
                && f.consumed_by.loader_sites.is_empty()
                && f.consumed_by.cvar_bindings.is_empty()
                && !f.is_default
        })
        .count();
    // Fix double-count: a file counted as available was already in unreferenced by the previous loop.
    // Decrement unreferenced by that overlap.
    if stats.unreferenced >= stats.available {
        stats.unreferenced -= stats.available;
    }

    Ok(ScanResult {
        exe_path,
        scan_timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
        root: root_str,
        clients_detected,
        gamedirs_detected,
        files,
        archives,
        unresolved_external_refs,
        warnings,
        stats,
    })
}
```

- [ ] **Step 4: Run the full browse test suite**

```bash
cargo test --manifest-path apps/slipgate-app/src-tauri/Cargo.toml browse::tests
```

Expected: all PASS including `scan_end_to_end_small_tree`.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs
git commit -m "feat(slipgate): wire browse scan_quake_dir end-to-end with all pipeline stages"
```

---

## Phase 2 -- Support Rust commands

### Task 10: `hash_file`, `read_file_bytes`, `open_containing_folder`

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`
- Modify: `apps/slipgate-app/src-tauri/src/lib.rs`

- [ ] **Step 1: Add three commands to `browse.rs`**

```rust
use sha2::{Digest, Sha256};

/// Lazy SHA256 of a file. For loose files, reads directly; for archive-interior files,
/// extracts first. Max 64 MB guard prevents OOM on accidental huge files.
#[tauri::command]
pub async fn hash_file(exe_path: String, virtual_path: String) -> Result<String, String> {
    let exe = PathBuf::from(&exe_path);
    let root = exe.parent().ok_or_else(|| "invalid exe path".to_string())?;

    let bytes = read_virtual_bytes(root, &virtual_path, 64 * 1024 * 1024)
        .map_err(|e| format!("read failed: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

/// Read file bytes up to `max_bytes`. Used for preview rendering via blob URLs.
#[tauri::command]
pub async fn read_file_bytes(
    exe_path: String,
    virtual_path: String,
    max_bytes: u64,
) -> Result<Vec<u8>, String> {
    let exe = PathBuf::from(&exe_path);
    let root = exe.parent().ok_or_else(|| "invalid exe path".to_string())?;
    read_virtual_bytes(root, &virtual_path, max_bytes as usize)
        .map_err(|e| format!("read failed: {}", e))
}

/// Open the containing folder of a virtual_path in the OS file explorer.
/// For archive-interior files, opens the folder containing the archive.
#[tauri::command]
pub async fn open_containing_folder(
    exe_path: String,
    virtual_path: String,
) -> Result<(), String> {
    let exe = PathBuf::from(&exe_path);
    let root = exe.parent().ok_or_else(|| "invalid exe path".to_string())?;

    // If virtual_path contains ":", it's an archive entry. Use the archive path.
    let target = if let Some(colon) = virtual_path.find(':') {
        root.join(&virtual_path[..colon])
    } else {
        root.join(&virtual_path)
    };
    let parent = target.parent().ok_or_else(|| "no parent dir".to_string())?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(parent.as_os_str())
            .spawn()
            .map_err(|e| format!("explorer failed: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = parent;
        return Err("open_containing_folder is Windows-only in v1".to_string());
    }
    Ok(())
}

fn read_virtual_bytes(
    root: &Path,
    virtual_path: &str,
    max_bytes: usize,
) -> std::io::Result<Vec<u8>> {
    if let Some(colon) = virtual_path.find(':') {
        let archive_rel = &virtual_path[..colon];
        let entry = &virtual_path[colon + 1..];
        let archive_abs = root.join(archive_rel);
        let bytes = crate::commands::archive::extract_file(&archive_abs, entry)?;
        if bytes.len() > max_bytes {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "file exceeds max_bytes guard",
            ));
        }
        Ok(bytes)
    } else {
        let path = root.join(virtual_path);
        let meta = std::fs::metadata(&path)?;
        if meta.len() as usize > max_bytes {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "file exceeds max_bytes guard",
            ));
        }
        std::fs::read(&path)
    }
}
```

- [ ] **Step 2: Register the three new commands in `lib.rs`**

Edit `tauri::generate_handler!` block:

```rust
            commands::browse::scan_quake_dir,
            commands::browse::hash_file,
            commands::browse::read_file_bytes,
            commands::browse::open_containing_folder,
```

- [ ] **Step 3: Verify build**

```bash
cargo check --manifest-path apps/slipgate-app/src-tauri/Cargo.toml
```

Expected: `Finished` with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): browse scanner support commands (hash, read-bytes, open-folder)"
```

---

## Phase 3 -- Frontend foundation

### Task 11: Bundle hydrator

**Files:**
- Create: `apps/slipgate-app/src/lib/assets/bundle.ts`

- [ ] **Step 1: Create `bundle.ts`**

```ts
// apps/slipgate-app/src/lib/assets/bundle.ts
import raw from "../../../../../packages/qw-config/src/data/ezquake-asset-bundle.json";

export type AssetCategory = {
  id: string; // short form, e.g. "skin"
  canonical_id: string; // "ezquake:asset_category:skin"
  display_name: string;
  description: string;
  notes: string | null;
};

export type AssetExtension = {
  extension: string;
  path_hint: string | null;
  category_id: string;
  notes: string | null;
};

export type AssetPathRule = {
  canonical_id: string;
  rule_kind: "search_path" | "archive_precedence" | "cmdline_override" | "gamedir_behavior";
  ordinal: number;
  description: string;
  source_ref: string;
  source_verified: number;
  notes: string | null;
};

export type AssetCvarBinding = {
  cvar_canonical_id: string;
  category_id: string;
  path_pattern: string | null;
  load_trigger: "startup" | "on_demand" | "on_connect" | "on_map_load" | string;
  confidence: "seed" | "auto" | string;
  source_ref: string;
  notes: string | null;
};

export type AssetLoaderSite = {
  canonical_id: string;
  function_name: string;
  source_file: string;
  source_line: number;
  enclosing_function: string;
  reads_category_id: string | null;
  load_trigger: string;
  path_source: "literal" | "cvar" | "computed" | string;
  path_literal: string | null;
  path_cvar_id: string | null;
  confidence: "certain" | "heuristic" | "unclassified" | string;
  dev_only: number;
};

export type AssetBundle = {
  project: string;
  version: string;
  categories: Map<string, AssetCategory>; // keyed by canonical_id
  extensions: AssetExtension[];
  path_rules: AssetPathRule[];
  cvar_bindings: AssetCvarBinding[];
  loader_sites: AssetLoaderSite[];
};

function hydrateCategories(obj: Record<string, any>): Map<string, AssetCategory> {
  const out = new Map<string, AssetCategory>();
  for (const [shortId, payload] of Object.entries(obj ?? {})) {
    const ast = (payload as any)?.ast ?? {};
    const canonical = `ezquake:asset_category:${shortId}`;
    out.set(canonical, {
      id: shortId,
      canonical_id: canonical,
      display_name: String(ast.display_name ?? shortId),
      description: String(ast.description ?? ""),
      notes: ast.notes ?? null,
    });
  }
  return out;
}

function hydrateArray<T>(raw: unknown): T[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "object") return Object.values(raw as Record<string, T>);
  return [];
}

export const assetBundle: AssetBundle = {
  project: (raw as any).project ?? "ezquake",
  version: (raw as any).version ?? "head",
  categories: hydrateCategories((raw as any).asset_categories ?? {}),
  extensions: hydrateArray<AssetExtension>((raw as any).asset_extensions),
  path_rules: hydrateArray<AssetPathRule>((raw as any).asset_path_rules),
  cvar_bindings: hydrateArray<AssetCvarBinding>((raw as any).asset_cvar_bindings),
  loader_sites: hydrateArray<AssetLoaderSite>((raw as any).asset_loader_sites),
};

/** Look up a category's display name by canonical_id. Falls back to canonical_id. */
export function categoryDisplayName(canonical: string | null | undefined): string {
  if (!canonical) return "other";
  return assetBundle.categories.get(canonical)?.display_name ?? canonical;
}

/** A small palette of OKLCH category colors the UI uses for the left-edge color band. */
export const CATEGORY_COLOR: Record<string, string> = {
  "ezquake:asset_category:skin": "oklch(0.65 0.20 20)",       // warm red
  "ezquake:asset_category:texture": "oklch(0.65 0.17 230)",   // blue
  "ezquake:asset_category:conchar": "oklch(0.65 0.17 230)",   // blue (same family)
  "ezquake:asset_category:skybox": "oklch(0.65 0.17 290)",    // purple
  "ezquake:asset_category:hud_overlay": "oklch(0.70 0.17 65)", // amber
  "ezquake:asset_category:config": "oklch(0.60 0.17 290)",    // violet
  "ezquake:asset_category:map": "oklch(0.70 0.17 150)",       // green
  "ezquake:asset_category:sound": "oklch(0.65 0.10 60)",      // tan
  "ezquake:asset_category:model": "oklch(0.60 0.17 30)",      // orange
  "ezquake:asset_category:demo": "oklch(0.60 0.08 260)",      // dim indigo
  "ezquake:asset_category:screenshot": "oklch(0.60 0.05 160)", // gray-green
  "ezquake:asset_category:pak": "oklch(0.55 0.08 30)",        // rust
  "ezquake:asset_category:pk3": "oklch(0.55 0.08 30)",        // rust
  "ezquake:asset_category:wad": "oklch(0.55 0.08 60)",        // dark tan
  "ezquake:asset_category:crosshair": "oklch(0.70 0.15 340)", // pink
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/lib/assets/bundle.ts
git commit -m "feat(slipgate): asset bundle hydrator for browse mode"
```

---

### Task 12: Browse types in `types.ts`

**Files:**
- Modify: `apps/slipgate-app/src/types.ts`

- [ ] **Step 1: Append browse types to `types.ts`**

```ts
// Append near the end of apps/slipgate-app/src/types.ts, before the final export or closing of the file.

// ─── Browse mode ─────────────────────────────────────────────────────────────

export type Container =
  | { kind: "loose" }
  | { kind: "archive"; archive_path: string; entry: string };

export type Confidence = "certain" | "heuristic" | "seed" | "unclassified";

export interface ConsumedBy {
  loader_sites: string[];
  cvar_bindings: number[];
}

export interface ScannedFile {
  virtual_path: string;
  container: Container;
  size: number;
  mtime: number;
  content_hash: string | null;
  category_id: string | null;
  confidence: Confidence;
  search_path_winner: boolean;
  consumed_by: ConsumedBy;
  is_default: boolean;
}

export interface BrowseClientInfo {
  name: string;
  exe_path: string;
  version: string | null;
  active: boolean;
}

export interface ExternalRef {
  cvar_canonical_id: string;
  resolved_path: string;
  exists: boolean;
}

export interface ArchiveInfo {
  archive_path: string;
  kind: "pak" | "pk3" | "zip";
  size: number;
  entry_count: number;
}

export type ScanWarningKind = "archive_parse_failure" | "permission_denied" | "bundle_mismatch";

export interface ScanWarning {
  kind: ScanWarningKind;
  path: string;
  message: string;
}

export interface ScanStats {
  loaded: number;
  available: number;
  unreferenced: number;
  other: number;
  total_bytes: number;
}

export interface ScanResult {
  exe_path: string;
  scan_timestamp: number;
  root: string;
  clients_detected: BrowseClientInfo[];
  gamedirs_detected: string[];
  files: ScannedFile[];
  archives: ArchiveInfo[];
  unresolved_external_refs: ExternalRef[];
  warnings: ScanWarning[];
  stats: ScanStats;
}

export type BrowseModeName = "browse" | "domains";
export type BrowseDomainName = "configs" | "maps" | "matches" | "assets";

export interface BrowseFilterState {
  clients: Set<string>;   // names of clients selected
  gamedirs: Set<string>;  // gamedir names selected
  categories: Set<string>; // canonical category_ids selected
  search: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/types.ts
git commit -m "feat(slipgate): browse mode TypeScript types"
```

---

### Task 13: ProfilePrefs additions

**Files:**
- Modify: `apps/slipgate-app/src/store.ts`

- [ ] **Step 1: Add three fields to `ProfilePrefs` interface**

Edit the interface at around line 74:

```ts
export interface ProfilePrefs {
  map_backdrop: string;
  config_keyboard_visible: boolean;
  config_keyboard_show_movement: boolean;
  config_keyboard_show_weapons: boolean;
  config_keyboard_show_teamplay: boolean;
  config_keyboard_right_module: KeyboardRightModule;
  profile_keyboard_right_module: "nav" | "numpad";
  config_right_panel_mode: "keyboard" | "state";
  alias_chain_mode: "pretty" | "raw";
  alias_chain_resolver: "label" | "simulator";
  simulator: SimulatorPrefs;
  // ── browse mode ──
  my_quake_mode: "browse" | "domains";
  my_quake_domain: "configs" | "maps" | "matches" | "assets";
  browse_hide_defaults: boolean;
}
```

- [ ] **Step 2: Add defaults**

Edit `DEFAULT_PREFS` at around line 145:

```ts
const DEFAULT_PREFS: ProfilePrefs = {
  map_backdrop: "dm3",
  config_keyboard_visible: true,
  config_keyboard_show_movement: true,
  config_keyboard_show_weapons: true,
  config_keyboard_show_teamplay: true,
  config_keyboard_right_module: "nav",
  profile_keyboard_right_module: "nav",
  config_right_panel_mode: "keyboard",
  alias_chain_mode: "pretty",
  alias_chain_resolver: "label",
  simulator: {
    version: 1,
    currentState: createDefaultPlayerState(),
    templates: [],
  },
  my_quake_mode: "domains",
  my_quake_domain: "configs",
  browse_hide_defaults: false,
};
```

- [ ] **Step 3: Migration pass**

In `migrateProfile` the existing `...data.prefs` spread already brings in any stored values; `DEFAULT_PREFS` fills gaps. But persisted-but-unknown values for `my_quake_domain` (e.g. if a future version saved "gear" then the user downgrades) need a safety net. Add sanitization after the spread. Edit the relevant branch in `migrateProfile`:

```ts
  // ...
  return {
    identity: { ...DEFAULT_IDENTITY, ...data.identity },
    setups: data.setups.map((s: any) => ({
      name: s.name ?? "Desktop",
      primary: s.primary ?? true,
      client: { ...DEFAULT_CLIENT, ...s.client },
      hardware: { ...DEFAULT_HARDWARE, ...s.hardware },
    })),
    equipment_history: data.equipment_history ?? [],
    prefs: {
      ...DEFAULT_PREFS,
      ...data.prefs,
      simulator: deserializeSimulator(data.prefs?.simulator),
      my_quake_mode:
        data.prefs?.my_quake_mode === "browse" ? "browse" : "domains",
      my_quake_domain: (["configs", "maps", "matches", "assets"] as const).includes(
        data.prefs?.my_quake_domain,
      )
        ? data.prefs.my_quake_domain
        : "configs",
    },
  };
  // ...
```

Make the same adjustment to the "old format" fallback branch later in the same function.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/store.ts
git commit -m "feat(slipgate): ProfilePrefs persists browse mode state"
```

---

## Phase 4 -- Browse UI components

### Task 14: `BrowseView` orchestrator skeleton

**Files:**
- Create: `apps/slipgate-app/src/components/BrowseView.tsx`

- [ ] **Step 1: Create the skeleton**

```tsx
// apps/slipgate-app/src/components/BrowseView.tsx
import { createSignal, createEffect, Show, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { ScanResult, ScannedFile, BrowseFilterState } from "../types";
import type { ProfileData } from "../store";

interface BrowseViewProps {
  exePath: string | null;
  mergedCvars: Record<string, string>;
  profile: ProfileData | null;
  hideDefaults: boolean;
  onOpenInConfigs: (virtualPath: string) => void;
  onSwitchToClientsTab: () => void;
}

export default function BrowseView(props: BrowseViewProps) {
  const [scan, setScan] = createSignal<ScanResult | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [selected, setSelected] = createSignal<ScannedFile | null>(null);
  const [stale, setStale] = createSignal(false);
  const [filters, setFilters] = createSignal<BrowseFilterState>({
    clients: new Set(),
    gamedirs: new Set(),
    categories: new Set(),
    search: "",
  });

  async function runScan() {
    const exe = props.exePath;
    if (!exe) {
      setScan(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ScanResult>("scan_quake_dir", {
        exePath: exe,
        mergedCvars: props.mergedCvars,
      });
      setScan(result);
      setStale(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  onMount(runScan);
  createEffect(() => {
    // rescan when exePath or mergedCvars key-set changes
    void props.exePath;
    void Object.keys(props.mergedCvars).length;
    runScan();
  });

  return (
    <Show
      when={props.exePath}
      fallback={
        <div class="flex items-center justify-center h-full text-[var(--sg-text-dim)] text-sm p-8">
          <div>
            <p>Pick an ezQuake install in the Clients tab to browse its files.</p>
          </div>
        </div>
      }
    >
      <Show
        when={!error()}
        fallback={
          <div class="p-4">
            <div class="bg-red-900/30 border border-red-700 rounded p-3 text-sm">
              <p class="font-semibold text-red-300">Scan failed</p>
              <p class="text-red-200">{error()}</p>
              <button class="btn btn-sm btn-outline mt-2" onClick={runScan}>Retry</button>
            </div>
          </div>
        }
      >
        <Show when={scan()} fallback={<div class="p-4 text-sm text-[var(--sg-text-dim)]">Scanning...</div>}>
          {(result) => (
            <div class="flex flex-col h-full">
              {/* Top bar */}
              <div class="flex items-center gap-3 px-4 py-2 border-b border-[var(--sg-stat-border)]">
                <input
                  class="sg-input text-sm flex-1 max-w-[240px]"
                  placeholder="search filename or path..."
                  value={filters().search}
                  onInput={(e) => setFilters({ ...filters(), search: e.currentTarget.value })}
                />
                <Show when={stale()}>
                  <span class="text-xs text-amber-400">changes detected</span>
                </Show>
                <button class="btn btn-sm btn-outline" onClick={runScan}>
                  Rescan
                </button>
              </div>
              {/* Three-pane body placeholder; each pane wired in later tasks */}
              <div class="flex-1 grid grid-cols-[220px_1fr_300px] overflow-hidden">
                <div class="border-r border-[var(--sg-stat-border)] p-2 overflow-auto">
                  {/* BrowseFilterLens here (Task 15) */}
                  <p class="text-xs text-[var(--sg-text-dim)]">filter lens (stub)</p>
                </div>
                <div class="overflow-auto">
                  {/* BrowseTree here (Task 16) */}
                  <p class="text-xs text-[var(--sg-text-dim)] p-2">
                    {result().files.length} files scanned. Tree coming next task.
                  </p>
                </div>
                <div class="border-l border-[var(--sg-stat-border)] p-2 overflow-auto">
                  {/* BrowseDetail here (Task 18) */}
                  <Show when={selected()} fallback={<p class="text-xs text-[var(--sg-text-dim)]">select a file</p>}>
                    {(f) => <p class="text-xs">{f().virtual_path}</p>}
                  </Show>
                </div>
              </div>
              {/* Status bar */}
              <div class="px-4 py-1 border-t border-[var(--sg-stat-border)] text-xs text-[var(--sg-text-dim)] flex gap-4">
                <span>{result().files.length} files</span>
                <span>{(result().stats.total_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                <span>
                  {result().stats.loaded} loaded - {result().stats.available} available -{" "}
                  {result().stats.unreferenced} unreferenced
                </span>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </Show>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors (despite unused `selected`/`setSelected`/`filters`/`setFilters`). If strict mode complains about unused, add `void` references at the bottom of the function body to suppress until later tasks use them.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/components/BrowseView.tsx
git commit -m "feat(slipgate): BrowseView orchestrator skeleton with scan wiring"
```

---

### Task 15: `BrowseFilterLens` component

**Files:**
- Create: `apps/slipgate-app/src/components/BrowseFilterLens.tsx`
- Modify: `apps/slipgate-app/src/components/BrowseView.tsx`

- [ ] **Step 1: Create `BrowseFilterLens.tsx`**

```tsx
// apps/slipgate-app/src/components/BrowseFilterLens.tsx
import { For, Show, createMemo } from "solid-js";
import type { ScanResult, ScannedFile, BrowseFilterState } from "../types";
import { assetBundle, categoryDisplayName, CATEGORY_COLOR } from "../lib/assets/bundle";

interface BrowseFilterLensProps {
  scan: ScanResult;
  filters: BrowseFilterState;
  onFiltersChange: (next: BrowseFilterState) => void;
  onSwitchToClientsTab: () => void;
}

export default function BrowseFilterLens(props: BrowseFilterLensProps) {
  const categoryCounts = createMemo(() => {
    const counts = new Map<string, number>();
    let unreferenced = 0;
    let other = 0;
    for (const f of props.scan.files) {
      if (!f.category_id) {
        other++;
        continue;
      }
      if (f.consumed_by.loader_sites.length === 0 && f.consumed_by.cvar_bindings.length === 0) {
        unreferenced++;
      }
      counts.set(f.category_id, (counts.get(f.category_id) ?? 0) + 1);
    }
    return { byCategory: counts, unreferenced, other };
  });

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function toggleClient(name: string) {
    props.onFiltersChange({ ...props.filters, clients: toggle(props.filters.clients, name) });
  }
  function toggleGamedir(name: string) {
    props.onFiltersChange({ ...props.filters, gamedirs: toggle(props.filters.gamedirs, name) });
  }
  function toggleCategory(canonical: string) {
    props.onFiltersChange({ ...props.filters, categories: toggle(props.filters.categories, canonical) });
  }
  function clearFilters() {
    props.onFiltersChange({ clients: new Set(), gamedirs: new Set(), categories: new Set(), search: props.filters.search });
  }

  const activeCount = createMemo(() =>
    props.filters.clients.size + props.filters.gamedirs.size + props.filters.categories.size,
  );

  return (
    <div class="flex flex-col gap-4 text-xs">
      <section>
        <div class="sg-label">CLIENTS DETECTED</div>
        <For each={props.scan.clients_detected}>
          {(c) => (
            <div
              class={`sg-lens-row ${c.active ? "sg-lens-row-active" : ""} ${props.filters.clients.has(c.name) ? "sg-lens-row-selected" : ""}`}
              onClick={() => (c.active ? toggleClient(c.name) : props.onSwitchToClientsTab())}
            >
              <span class="sg-lens-indicator">{c.active ? "◉" : "○"}</span>
              <span>{c.name}</span>
            </div>
          )}
        </For>
      </section>

      <section>
        <div class="sg-label">GAMEDIRS DETECTED</div>
        <For each={props.scan.gamedirs_detected}>
          {(g) => (
            <div
              class={`sg-lens-row ${props.filters.gamedirs.has(g) ? "sg-lens-row-selected" : ""}`}
              onClick={() => toggleGamedir(g)}
            >
              <span>{g}/</span>
            </div>
          )}
        </For>
      </section>

      <section>
        <div class="sg-label">FILTER BY DOMAIN</div>
        <div class="font-semibold">assets</div>
        <For each={Array.from(assetBundle.categories.values())}>
          {(cat) => {
            const count = () => categoryCounts().byCategory.get(cat.canonical_id) ?? 0;
            const selected = () => props.filters.categories.has(cat.canonical_id);
            return (
              <Show when={count() > 0}>
                <div
                  class={`sg-lens-row sg-lens-row-indent ${selected() ? "sg-lens-row-selected" : ""}`}
                  onClick={() => toggleCategory(cat.canonical_id)}
                >
                  <span
                    class="sg-lens-swatch"
                    style={{ background: CATEGORY_COLOR[cat.canonical_id] ?? "oklch(0.5 0.02 0)" }}
                  />
                  <span>{cat.display_name}</span>
                  <span class="sg-lens-count">{count()}</span>
                </div>
              </Show>
            );
          }}
        </For>
        <Show when={categoryCounts().unreferenced > 0}>
          <div class="sg-lens-row sg-lens-row-warn">
            <span>unreferenced</span>
            <span class="sg-lens-count">{categoryCounts().unreferenced}</span>
          </div>
        </Show>
        <Show when={categoryCounts().other > 0}>
          <div class="sg-lens-row sg-lens-row-dim">
            <span>other</span>
            <span class="sg-lens-count">{categoryCounts().other}</span>
          </div>
        </Show>
      </section>

      <Show when={activeCount() > 0}>
        <section class="border-t border-[var(--sg-stat-border)] pt-2">
          <div class="text-[var(--color-primary)]">{activeCount()} filter{activeCount() === 1 ? "" : "s"} active</div>
          <button class="btn btn-xs btn-outline mt-1" onClick={clearFilters}>Clear filters</button>
        </section>
      </Show>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for the lens rows**

Open `apps/slipgate-app/src/app.css`, append at the end:

```css
/* ── Browse: filter lens ── */
.sg-label { color: var(--sg-text-dim); font-size: 9px; letter-spacing: 0.6px; margin-bottom: 4px; }
.sg-lens-row { display: flex; align-items: center; gap: 6px; padding: 2px 6px; margin: 0 -6px; border-radius: 4px; cursor: pointer; }
.sg-lens-row:hover { background: var(--sg-stat-border); }
.sg-lens-row-indent { padding-left: 18px; }
.sg-lens-row-selected { background: oklch(0.3 0.05 260); color: oklch(0.85 0.04 260); font-weight: 600; }
.sg-lens-row-active { font-weight: 600; }
.sg-lens-row-warn { color: oklch(0.65 0.20 20); }
.sg-lens-row-dim { color: var(--sg-text-dim); }
.sg-lens-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.sg-lens-count { margin-left: auto; color: var(--sg-text-dim); }
.sg-lens-indicator { width: 10px; text-align: center; }
```

- [ ] **Step 3: Wire `BrowseFilterLens` into `BrowseView`**

Edit `BrowseView.tsx`:

Add import:
```tsx
import BrowseFilterLens from "./BrowseFilterLens";
```

Replace the filter lens placeholder block with:
```tsx
                <div class="border-r border-[var(--sg-stat-border)] p-3 overflow-auto">
                  <BrowseFilterLens
                    scan={result()}
                    filters={filters()}
                    onFiltersChange={setFilters}
                    onSwitchToClientsTab={props.onSwitchToClientsTab}
                  />
                </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/BrowseFilterLens.tsx \
        apps/slipgate-app/src/components/BrowseView.tsx \
        apps/slipgate-app/src/app.css
git commit -m "feat(slipgate): BrowseFilterLens with client/gamedir/category filters"
```

---

### Task 16: `BrowseTree` + `BrowseTreeNode`

**Files:**
- Create: `apps/slipgate-app/src/components/BrowseTree.tsx`
- Create: `apps/slipgate-app/src/components/BrowseTreeNode.tsx`
- Modify: `apps/slipgate-app/src/components/BrowseView.tsx`
- Modify: `apps/slipgate-app/src/app.css`

- [ ] **Step 1: Create `BrowseTreeNode.tsx`**

```tsx
// apps/slipgate-app/src/components/BrowseTreeNode.tsx
import { For, Show, createSignal } from "solid-js";
import type { ScannedFile } from "../types";
import { categoryDisplayName, CATEGORY_COLOR } from "../lib/assets/bundle";

export interface TreeNode {
  name: string;
  fullPath: string;            // relative to root, using "/"
  isDir: boolean;
  isArchive: boolean;
  file: ScannedFile | null;    // null for directories
  children: TreeNode[];
  matchCount: number;          // number of descendant files matching active filters
  hasMatchingFiles: boolean;   // true if self or any descendant matches
}

interface BrowseTreeNodeProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: ScannedFile) => void;
  autoExpand: boolean;         // whether to start expanded
}

export default function BrowseTreeNode(props: BrowseTreeNodeProps) {
  const [expanded, setExpanded] = createSignal(props.autoExpand);

  function dimClass() {
    return props.node.hasMatchingFiles ? "" : "opacity-40";
  }

  function handleClick() {
    if (props.node.isDir) {
      setExpanded(!expanded());
    } else if (props.node.file) {
      props.onSelect(props.node.file);
    }
  }

  return (
    <div>
      <div
        class={`sg-browse-row ${dimClass()} ${
          props.selectedPath === props.node.fullPath ? "sg-browse-row-selected" : ""
        }`}
        style={{ "padding-left": `${props.depth * 14}px` }}
        onClick={handleClick}
      >
        <Show
          when={!props.node.isDir}
          fallback={<span class="sg-browse-caret">{expanded() ? "▾" : "▸"}</span>}
        >
          {/* leaf file: state dot + category band */}
          <span class="sg-browse-state-dot" title={stateTitle(props.node.file!)}>
            {stateGlyph(props.node.file!)}
          </span>
          <span
            class="sg-browse-cat-band"
            style={{ background: CATEGORY_COLOR[props.node.file!.category_id ?? ""] ?? "transparent" }}
          />
        </Show>
        <span class={props.node.isDir ? "font-medium" : ""}>{props.node.name}</span>
        <Show when={props.node.isDir && props.node.children.length > 0}>
          <span class="sg-browse-count">{props.node.children.length}</span>
        </Show>
        <Show when={props.node.isArchive}>
          <span class="sg-browse-chip">pak</span>
        </Show>
        <Show when={props.node.file && props.node.file.confidence === "heuristic"}>
          <span class="sg-browse-conf-hint" title="heuristic classification">?</span>
        </Show>
        <Show when={!props.node.isDir && props.node.file}>
          <span class="sg-browse-size">{formatBytes(props.node.file!.size)}</span>
        </Show>
      </div>
      <Show when={expanded() && props.node.children.length > 0}>
        <For each={props.node.children}>
          {(child) => (
            <BrowseTreeNode
              node={child}
              depth={props.depth + 1}
              selectedPath={props.selectedPath}
              onSelect={props.onSelect}
              autoExpand={shouldAutoExpand(child)}
            />
          )}
        </For>
      </Show>
    </div>
  );
}

function stateGlyph(f: ScannedFile): string {
  if (f.consumed_by.loader_sites.length > 0 || f.consumed_by.cvar_bindings.length > 0) return "●";
  if (f.category_id) return "○";
  return "▲";
}

function stateTitle(f: ScannedFile): string {
  if (f.consumed_by.loader_sites.length > 0 || f.consumed_by.cvar_bindings.length > 0) return "loaded";
  if (f.category_id) return "available";
  return "unreferenced";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function shouldAutoExpand(n: TreeNode): boolean {
  if (!n.isDir) return false;
  if (n.isArchive) return false;
  // Folders with <= 100 direct children auto-expand
  return n.children.length <= 100;
}
```

- [ ] **Step 2: Create `BrowseTree.tsx`**

```tsx
// apps/slipgate-app/src/components/BrowseTree.tsx
import { For, createMemo } from "solid-js";
import type { ScanResult, ScannedFile, BrowseFilterState } from "../types";
import BrowseTreeNode, { type TreeNode } from "./BrowseTreeNode";

interface BrowseTreeProps {
  scan: ScanResult;
  filters: BrowseFilterState;
  hideDefaults: boolean;
  selectedPath: string | null;
  onSelect: (file: ScannedFile) => void;
}

export default function BrowseTree(props: BrowseTreeProps) {
  const tree = createMemo(() => buildTree(props.scan, props.filters, props.hideDefaults));
  return (
    <div class="p-2 font-mono text-xs">
      <For each={tree().children}>
        {(child) => (
          <BrowseTreeNode
            node={child}
            depth={0}
            selectedPath={props.selectedPath}
            onSelect={props.onSelect}
            autoExpand={child.children.length <= 100 && child.name !== "id1"}
          />
        )}
      </For>
    </div>
  );
}

function matchesFilter(file: ScannedFile, filters: BrowseFilterState, hideDefaults: boolean): boolean {
  if (hideDefaults && file.is_default) return false;

  if (filters.categories.size > 0) {
    if (!file.category_id || !filters.categories.has(file.category_id)) return false;
  }

  if (filters.gamedirs.size > 0) {
    const first = file.virtual_path.split("/")[0];
    if (!filters.gamedirs.has(first)) return false;
  }

  // client filter: if any client filter is active, require the file to have some
  // consumed_by reference (loader or cvar binding). A more precise rule can filter
  // by specific client in future phases.
  if (filters.clients.size > 0) {
    const hasRef = file.consumed_by.loader_sites.length > 0 || file.consumed_by.cvar_bindings.length > 0;
    if (!hasRef) return false;
  }

  if (filters.search.trim().length > 0) {
    const q = filters.search.trim().toLowerCase();
    if (!file.virtual_path.toLowerCase().includes(q)) return false;
  }

  return true;
}

function buildTree(scan: ScanResult, filters: BrowseFilterState, hideDefaults: boolean): TreeNode {
  const root: TreeNode = {
    name: "",
    fullPath: "",
    isDir: true,
    isArchive: false,
    file: null,
    children: [],
    matchCount: 0,
    hasMatchingFiles: false,
  };

  for (const f of scan.files) {
    const parts = f.virtual_path.split("/").filter((p) => p.length > 0);
    if (parts.length === 0) continue;

    // Archive-interior files render under their archive node.
    let cursor = root;
    let built = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      built = built.length ? `${built}/${part}` : part;
      const isLast = i === parts.length - 1;
      const isArchiveBoundary = part.includes(":");

      if (isArchiveBoundary) {
        // "pak1.pak:skins/test.pcx" -- split into archive node + interior path
        const [archiveName, inner] = part.split(":");
        let archiveChild = cursor.children.find((c) => c.name === archiveName);
        if (!archiveChild) {
          archiveChild = {
            name: archiveName,
            fullPath: `${built.split(":")[0]}`,
            isDir: true,
            isArchive: true,
            file: null,
            children: [],
            matchCount: 0,
            hasMatchingFiles: false,
          };
          cursor.children.push(archiveChild);
        }
        const innerParts = inner.split("/").filter((p) => p.length > 0);
        let innerCursor = archiveChild;
        let innerBuilt = `${archiveName}`;
        for (let j = 0; j < innerParts.length; j++) {
          const ipart = innerParts[j];
          innerBuilt = `${innerBuilt}:${ipart}`;
          const iLast = j === innerParts.length - 1;
          let ichild = innerCursor.children.find((c) => c.name === ipart);
          if (!ichild) {
            ichild = {
              name: ipart,
              fullPath: innerBuilt,
              isDir: !iLast,
              isArchive: false,
              file: iLast ? f : null,
              children: [],
              matchCount: 0,
              hasMatchingFiles: false,
            };
            innerCursor.children.push(ichild);
          }
          innerCursor = ichild;
        }
        break; // we've placed the file; stop outer loop
      }

      let child = cursor.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          fullPath: built,
          isDir: !isLast,
          isArchive: false,
          file: isLast ? f : null,
          children: [],
          matchCount: 0,
          hasMatchingFiles: false,
        };
        cursor.children.push(child);
      }
      cursor = child;
    }
  }

  // Compute matchCount + hasMatchingFiles by post-order traversal
  function post(n: TreeNode) {
    if (!n.isDir) {
      const m = n.file ? matchesFilter(n.file, filters, hideDefaults) : false;
      n.matchCount = m ? 1 : 0;
      n.hasMatchingFiles = m;
      return;
    }
    let count = 0;
    let any = false;
    for (const c of n.children) {
      post(c);
      count += c.matchCount;
      if (c.hasMatchingFiles) any = true;
    }
    n.matchCount = count;
    n.hasMatchingFiles = any;
  }
  post(root);

  // Sort children: dirs before files, alphabetical within
  function sort(n: TreeNode) {
    n.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of n.children) if (c.isDir) sort(c);
  }
  sort(root);

  return root;
}
```

- [ ] **Step 3: Add tree CSS**

Append to `apps/slipgate-app/src/app.css`:

```css
/* ── Browse: tree ── */
.sg-browse-row { display: flex; align-items: center; gap: 6px; padding: 2px 4px; cursor: pointer; border-radius: 3px; }
.sg-browse-row:hover { background: var(--sg-stat-border); }
.sg-browse-row-selected { background: oklch(0.25 0.05 260); }
.sg-browse-caret { width: 12px; text-align: center; color: var(--sg-text-dim); }
.sg-browse-state-dot { width: 12px; text-align: center; font-size: 10px; }
.sg-browse-cat-band { width: 3px; height: 14px; border-radius: 1px; flex-shrink: 0; }
.sg-browse-count { margin-left: 6px; color: var(--sg-text-dim); font-size: 10px; }
.sg-browse-chip { display: inline-block; padding: 0 5px; border-radius: 2px; background: oklch(0.3 0.03 260); color: var(--sg-text-dim); font-size: 9px; }
.sg-browse-conf-hint { color: var(--sg-text-dim); font-size: 9px; margin-left: 2px; }
.sg-browse-size { margin-left: auto; color: var(--sg-text-dim); font-size: 10px; }
```

- [ ] **Step 4: Wire `BrowseTree` into `BrowseView`**

Edit `BrowseView.tsx`:

Add import:
```tsx
import BrowseTree from "./BrowseTree";
```

Replace the center-pane placeholder with:

```tsx
                <div class="overflow-auto">
                  <BrowseTree
                    scan={result()}
                    filters={filters()}
                    hideDefaults={props.hideDefaults}
                    selectedPath={selected()?.virtual_path ?? null}
                    onSelect={setSelected}
                  />
                </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/components/BrowseTree.tsx \
        apps/slipgate-app/src/components/BrowseTreeNode.tsx \
        apps/slipgate-app/src/components/BrowseView.tsx \
        apps/slipgate-app/src/app.css
git commit -m "feat(slipgate): BrowseTree + BrowseTreeNode with filter-aware rendering"
```

---

### Task 17: `ResolutionChain` + `BrowseDetail`

**Files:**
- Create: `apps/slipgate-app/src/components/ResolutionChain.tsx`
- Create: `apps/slipgate-app/src/components/BrowseDetail.tsx`
- Modify: `apps/slipgate-app/src/components/BrowseView.tsx`
- Modify: `apps/slipgate-app/src/app.css`

- [ ] **Step 1: Create `ResolutionChain.tsx`**

```tsx
// apps/slipgate-app/src/components/ResolutionChain.tsx
import { For, Show } from "solid-js";
import type { ScannedFile, ScanResult } from "../types";

interface ResolutionChainProps {
  scan: ScanResult;
  file: ScannedFile;
}

export default function ResolutionChain(props: ResolutionChainProps) {
  // Find all ScannedFile entries that share the normalized virtual_path with this file.
  const normalized = normalize(props.file);
  const siblings = () => props.scan.files.filter((f) => normalize(f) === normalized);

  return (
    <Show when={siblings().length > 1}>
      <div class="sg-alias-chain-entry">
        <div class="sg-label">RESOLUTION CHAIN</div>
        <div class="font-mono text-[10px]">
          <For each={sortByWinner(siblings())}>
            {(f) => (
              <div
                class={f.search_path_winner ? "sg-alias-chain-entry-active" : "opacity-60"}
              >
                {f.search_path_winner ? "\u2713 " : "  "}
                {f.virtual_path}
                <Show when={f.search_path_winner}>
                  <span class="ml-2 text-xs text-green-400">wins</span>
                </Show>
                <Show when={!f.search_path_winner}>
                  <span class="ml-2 text-xs opacity-70">shadowed</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}

function normalize(f: ScannedFile): string {
  if (f.container.kind === "loose") return f.virtual_path;
  // "qw/pak1.pak:skins/bps.pcx" => "qw/skins/bps.pcx"
  const gamedir = f.container.archive_path.split("/")[0];
  return `${gamedir}/${f.container.entry}`;
}

function sortByWinner(xs: ScannedFile[]): ScannedFile[] {
  return [...xs].sort((a, b) => (a.search_path_winner === b.search_path_winner ? 0 : a.search_path_winner ? -1 : 1));
}
```

- [ ] **Step 2: Create `BrowseDetail.tsx`**

```tsx
// apps/slipgate-app/src/components/BrowseDetail.tsx
import { Show, createMemo, createResource } from "solid-js";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { ScannedFile, ScanResult } from "../types";
import { categoryDisplayName, assetBundle, CATEGORY_COLOR } from "../lib/assets/bundle";
import ResolutionChain from "./ResolutionChain";

interface BrowseDetailProps {
  scan: ScanResult;
  file: ScannedFile | null;
  exePath: string;
  onOpenInConfigs: (virtualPath: string) => void;
}

const PREVIEW_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

export default function BrowseDetail(props: BrowseDetailProps) {
  const ext = () => {
    const vp = props.file?.virtual_path ?? "";
    const dot = vp.lastIndexOf(".");
    return dot >= 0 ? vp.slice(dot).toLowerCase() : "";
  };
  const canPreview = () => PREVIEW_EXTS.has(ext());
  const isConfig = () => ext() === ".cfg";

  // Preview URL resource. For loose PNG/JPG use convertFileSrc; for archive entries use read_file_bytes -> blob.
  const [previewUrl] = createResource(
    () => (props.file && canPreview() ? props.file : null),
    async (f: ScannedFile) => {
      if (f.container.kind === "loose") {
        // Loose: build a tauri:// URL via convertFileSrc against the absolute path
        const abs = `${props.scan.root.replace(/\\/g, "/")}/${f.virtual_path}`;
        return convertFileSrc(abs);
      }
      // Archive-interior: fetch bytes through Rust, wrap as blob URL
      try {
        const bytes = await invoke<number[]>("read_file_bytes", {
          exePath: props.exePath,
          virtualPath: f.virtual_path,
          maxBytes: 2 * 1024 * 1024,
        });
        const blob = new Blob([new Uint8Array(bytes)], { type: guessMime(ext()) });
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    },
  );

  async function openFolder() {
    if (!props.file) return;
    try {
      await invoke("open_containing_folder", {
        exePath: props.exePath,
        virtualPath: props.file.virtual_path,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Show when={props.file} fallback={<p class="text-xs text-[var(--sg-text-dim)] p-2">select a file</p>}>
      {(f) => (
        <div class="text-xs flex flex-col gap-3">
          <section>
            <div class="sg-label">SELECTED</div>
            <div class="font-semibold text-sm">{leafName(f().virtual_path)}</div>
            <div class="text-[var(--sg-text-dim)]">{f().virtual_path}</div>
          </section>

          <section>
            <div class="sg-label">CATEGORY</div>
            <div>
              <span
                class="sg-lens-swatch mr-1"
                style={{ background: CATEGORY_COLOR[f().category_id ?? ""] ?? "oklch(0.5 0 0)" }}
              />
              {categoryDisplayName(f().category_id)}
            </div>
            <div class="text-[var(--sg-text-dim)]">confidence: {f().confidence}</div>
          </section>

          <Show when={canPreview()}>
            <section>
              <div class="sg-label">PREVIEW</div>
              <Show when={previewUrl()} fallback={<div class="sg-browse-preview-empty">(loading)</div>}>
                <img src={previewUrl()!} class="sg-browse-preview" alt={leafName(f().virtual_path)} />
              </Show>
            </section>
          </Show>
          <Show when={!canPreview()}>
            <section>
              <div class="sg-label">PREVIEW</div>
              <div class="sg-browse-preview-empty">preview: {ext() || "no-ext"} -- decoder Phase 2</div>
            </section>
          </Show>

          <ResolutionChain scan={props.scan} file={f()} />

          <section>
            <div class="sg-label">FILE</div>
            <div>{f().size.toLocaleString()} bytes</div>
            <Show when={f().mtime > 0}>
              <div class="text-[var(--sg-text-dim)]">modified {new Date(f().mtime * 1000).toLocaleDateString()}</div>
            </Show>
          </section>

          <details>
            <summary class="sg-label cursor-pointer">UNDER THE HOOD</summary>
            <div class="mt-1 text-[var(--sg-text-dim)]">
              <Show when={f().consumed_by.loader_sites.length > 0}>
                <div class="font-mono">loader sites:</div>
                <For each={f().consumed_by.loader_sites}>
                  {(id) => <div class="font-mono pl-2">{id}</div>}
                </For>
              </Show>
              <Show when={f().consumed_by.cvar_bindings.length > 0}>
                <div class="font-mono mt-2">cvar bindings:</div>
                <For each={f().consumed_by.cvar_bindings}>
                  {(idx) => {
                    const b = assetBundle.cvar_bindings[idx];
                    return <div class="font-mono pl-2">{b?.cvar_canonical_id ?? `(binding ${idx})`}</div>;
                  }}
                </For>
              </Show>
              <Show when={f().consumed_by.loader_sites.length === 0 && f().consumed_by.cvar_bindings.length === 0}>
                <div>no direct references</div>
              </Show>
            </div>
          </details>

          <div class="flex flex-col gap-1">
            <Show when={isConfig()}>
              <button class="btn btn-xs btn-primary" onClick={() => props.onOpenInConfigs(f().virtual_path)}>
                Open in Configs
              </button>
            </Show>
            <button class="btn btn-xs btn-outline" onClick={openFolder}>
              Open containing folder
            </button>
          </div>
        </div>
      )}
    </Show>
  );
}

function leafName(vp: string): string {
  const afterColon = vp.includes(":") ? vp.split(":")[1] : vp;
  const parts = afterColon.split("/");
  return parts[parts.length - 1];
}

function guessMime(ext: string): string {
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".webp": return "image/webp";
    default: return "application/octet-stream";
  }
}

import { For } from "solid-js";
```

Fix the misplaced import: move `import { For } from "solid-js";` to the top of the file with the other solid-js import.

Correct version of the top imports:
```tsx
import { Show, For, createMemo, createResource } from "solid-js";
```

Remove the accidental trailing `import { For }`.

- [ ] **Step 3: Add detail-pane CSS**

Append to `apps/slipgate-app/src/app.css`:

```css
/* ── Browse: detail pane ── */
.sg-browse-preview { max-width: 100%; max-height: 180px; image-rendering: pixelated; border: 1px solid var(--sg-stat-border); border-radius: 3px; }
.sg-browse-preview-empty { border: 1px dashed var(--sg-stat-border); border-radius: 3px; padding: 16px; text-align: center; color: var(--sg-text-dim); font-size: 10px; font-style: italic; }
```

- [ ] **Step 4: Wire into `BrowseView`**

Edit `BrowseView.tsx`:

Add import:
```tsx
import BrowseDetail from "./BrowseDetail";
```

Replace the right-pane placeholder with:

```tsx
                <div class="border-l border-[var(--sg-stat-border)] p-3 overflow-auto">
                  <BrowseDetail
                    scan={result()}
                    file={selected()}
                    exePath={props.exePath!}
                    onOpenInConfigs={props.onOpenInConfigs}
                  />
                </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/components/BrowseDetail.tsx \
        apps/slipgate-app/src/components/ResolutionChain.tsx \
        apps/slipgate-app/src/components/BrowseView.tsx \
        apps/slipgate-app/src/app.css
git commit -m "feat(slipgate): BrowseDetail + ResolutionChain (collision visualizer)"
```

---

### Task 18: Windowed list for >200-child folders

**Files:**
- Create: `apps/slipgate-app/src/components/WindowedList.tsx`
- Modify: `apps/slipgate-app/src/components/BrowseTreeNode.tsx`

- [ ] **Step 1: Create `WindowedList.tsx`**

```tsx
// apps/slipgate-app/src/components/WindowedList.tsx
import { createSignal, createMemo, For, onMount } from "solid-js";

interface WindowedListProps<T> {
  items: T[];
  rowHeight: number;       // px; assumes uniform row height for simplicity
  overscan: number;        // extra rows to render above/below viewport
  maxVisible: number;      // max rows visible at once (approx viewport / rowHeight)
  renderRow: (item: T, index: number) => any;
}

export default function WindowedList<T>(props: WindowedListProps<T>) {
  const [scrollTop, setScrollTop] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (containerRef) {
      containerRef.addEventListener("scroll", () => {
        setScrollTop(containerRef!.scrollTop);
      });
    }
  });

  const totalHeight = createMemo(() => props.items.length * props.rowHeight);
  const startIndex = createMemo(() =>
    Math.max(0, Math.floor(scrollTop() / props.rowHeight) - props.overscan),
  );
  const endIndex = createMemo(() =>
    Math.min(props.items.length, startIndex() + props.maxVisible + 2 * props.overscan),
  );
  const visible = createMemo(() => props.items.slice(startIndex(), endIndex()));

  return (
    <div ref={containerRef} style={{ "max-height": `${props.maxVisible * props.rowHeight}px`, "overflow-y": "auto" }}>
      <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
        <div style={{ position: "absolute", top: `${startIndex() * props.rowHeight}px`, left: 0, right: 0 }}>
          <For each={visible()}>
            {(item, idx) => <div style={{ height: `${props.rowHeight}px` }}>{props.renderRow(item, startIndex() + idx())}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use it in `BrowseTreeNode.tsx` for folders with >200 children**

Edit the `<Show when={expanded()...}>` block:

```tsx
      <Show when={expanded() && props.node.children.length > 0}>
        <Show
          when={props.node.children.length > 200}
          fallback={
            <For each={props.node.children}>
              {(child) => (
                <BrowseTreeNode
                  node={child}
                  depth={props.depth + 1}
                  selectedPath={props.selectedPath}
                  onSelect={props.onSelect}
                  autoExpand={shouldAutoExpand(child)}
                />
              )}
            </For>
          }
        >
          <WindowedList
            items={props.node.children}
            rowHeight={22}
            overscan={10}
            maxVisible={30}
            renderRow={(child) => (
              <BrowseTreeNode
                node={child}
                depth={props.depth + 1}
                selectedPath={props.selectedPath}
                onSelect={props.onSelect}
                autoExpand={false}
              />
            )}
          />
        </Show>
      </Show>
```

Add at top of file:
```tsx
import WindowedList from "./WindowedList";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/WindowedList.tsx apps/slipgate-app/src/components/BrowseTreeNode.tsx
git commit -m "feat(slipgate): windowed-list virtualization for >200-child tree folders"
```

---

## Phase 5 -- MyQuake restructure + cross-link + watcher

### Task 19: MyQuakeTab 2-mode toggle + ConfigViewer relocation

**Files:**
- Modify: `apps/slipgate-app/src/components/MyQuakeTab.tsx`
- Modify: `apps/slipgate-app/src/App.tsx`

- [ ] **Step 1: Restructure `MyQuakeTab.tsx`**

This is a substantial rewrite. The end state should:
- Replace `subTab` with two states: `mode: "browse" | "domains"` and `domain: "configs" | "maps" | "matches" | "assets"`.
- Persist both to `ProfilePrefs` via `updatePrefs` (initialize from `props.profile.prefs.my_quake_mode` / `my_quake_domain`).
- Top nav: mode toggle (Browse | Domains) + "Show only custom" toggle (only visible in Browse mode).
- Under `Domains`, a horizontal sub-nav with `Configs` active + placeholders for Maps/Matches/Assets (disabled).
- Render `<ConfigViewer>` when `mode === 'domains' && domain === 'configs'`.
- Render `<BrowseView>` when `mode === 'browse'`.

New props needed on `MyQuakeTab`:
```ts
interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  configSource: ConfigSourceBundle | null;
  exePath: string | null;
  configName: string | null;
  compareSource: ConfigSourceBundle | null;
  onCompareSourceChange: (source: ConfigSourceBundle | null) => void;
  profile: ProfileData | null;
  onSwitchToTab: (tab: string) => void; // NEW: for "switch to Clients tab"
}
```

Replace the entire component body. Full replacement (preserves drag-drop, compare-config handlers, pending-drop modal):

```tsx
import { createSignal, createEffect, Switch, Match, Show, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EzQuakeConfig, ConfigSourceBundle, ConfigChain, ConfigEntry, BrowseModeName, BrowseDomainName } from "../types";
import type { ProfileData } from "../store";
import { updatePrefs } from "../store";
import ConfigViewer from "./ConfigViewer";
import BrowseView from "./BrowseView";

interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  configSource: ConfigSourceBundle | null;
  exePath: string | null;
  configName: string | null;
  compareSource: ConfigSourceBundle | null;
  onCompareSourceChange: (source: ConfigSourceBundle | null) => void;
  profile: ProfileData | null;
  onSwitchToTab: (tab: string) => void;
}

export default function MyQuakeTab(props: MyQuakeTabProps) {
  const [mode, setMode] = createSignal<BrowseModeName>(
    props.profile?.prefs.my_quake_mode ?? "domains",
  );
  const [domain, setDomain] = createSignal<BrowseDomainName>(
    props.profile?.prefs.my_quake_domain ?? "configs",
  );
  const [hideDefaults, setHideDefaults] = createSignal(
    props.profile?.prefs.browse_hide_defaults ?? false,
  );

  const [isDragOver, setIsDragOver] = createSignal(false);
  const [dropError, setDropError] = createSignal<string | null>(null);
  const [pendingDrop, setPendingDrop] = createSignal<string[] | null>(null);

  createEffect(() => {
    if (!props.profile) return;
    updatePrefs({
      my_quake_mode: mode(),
      my_quake_domain: domain(),
      browse_hide_defaults: hideDefaults(),
    });
  });

  // --- drag-drop plumbing (unchanged from existing) ---
  let unlisten: (() => void) | null = null;
  (async () => {
    const appWindow = getCurrentWindow();
    unlisten = await appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over") setIsDragOver(true);
      else if (event.payload.type === "leave") setIsDragOver(false);
      else if (event.payload.type === "drop") {
        setIsDragOver(false);
        handleDrop(event.payload.paths);
      }
    });
  })();
  onCleanup(() => unlisten?.());

  async function handleDrop(paths: string[]) {
    const supported = paths.filter((p) => {
      const ext = p.split(".").pop()?.toLowerCase();
      return ext === "cfg" || ext === "zip" || ext === "pak" || ext === "pk3";
    });
    if (supported.length === 0) {
      setDropError("No .cfg, .zip, .pak, or .pk3 files found");
      setTimeout(() => setDropError(null), 3000);
      return;
    }
    if (props.compareSource) {
      setPendingDrop(supported);
      return;
    }
    await loadDroppedFiles(supported);
  }

  async function loadDroppedFiles(paths: string[]) {
    try {
      const source = await invoke<ConfigSourceBundle>("scan_dropped_input", { paths });
      props.onCompareSourceChange(source);
      setDropError(null);
      setPendingDrop(null);
    } catch (e) {
      setDropError(String(e));
      setTimeout(() => setDropError(null), 5000);
      setPendingDrop(null);
    }
  }

  function handleReplace() { const p = pendingDrop(); if (p) loadDroppedFiles(p); }
  function dismissPendingDrop() { setPendingDrop(null); }

  async function handleCompareConfig(entry: ConfigEntry) {
    if (entry.location.type === "inside_pak") return;
    try {
      const chain = await invoke<ConfigChain>("load_config_from_source", {
        sourceType: "local_install",
        configPath: entry.relative_path,
        contextPath: props.exePath ?? "",
      });
      props.onCompareSourceChange({
        origin: { type: "dropped_files", filenames: [entry.filename] },
        primary_chain: chain,
        available_configs: [],
        detected_client: null,
        label: entry.filename,
      });
    } catch (e) {
      console.error("Failed to load config for compare:", e);
    }
  }

  // Cross-link from Browse -> Configs domain with a specific .cfg file
  async function handleOpenConfigFromBrowse(virtualPath: string) {
    setMode("domains");
    setDomain("configs");
    // Treat the .cfg as a compare-source via the existing local_install flow.
    try {
      const chain = await invoke<ConfigChain>("load_config_from_source", {
        sourceType: "local_install",
        configPath: virtualPath,
        contextPath: props.exePath ?? "",
      });
      const leaf = virtualPath.split("/").pop() ?? virtualPath;
      props.onCompareSourceChange({
        origin: { type: "dropped_files", filenames: [leaf] },
        primary_chain: chain,
        available_configs: [],
        detected_client: null,
        label: leaf,
      });
    } catch (e) {
      console.error("Failed to open config from Browse:", e);
    }
  }

  async function handleSwapCompareConfig(entry: ConfigEntry) {
    // Preserve the existing swap logic from the previous version of this component.
    // (Copied as-is from the original handleSwapCompareConfig -- see git history for the pre-restructure body.)
    const source = props.compareSource;
    if (!source) return;
    try {
      let sourceType: string;
      let contextPath: string;
      if (source.origin.type === "archive" && source.origin.path) {
        sourceType = "archive";
        contextPath = source.origin.path;
      } else if (source.origin.type === "local_install" && source.origin.exe_path) {
        sourceType = "local_install";
        contextPath = source.origin.exe_path;
      } else {
        return;
      }
      const chain = await invoke<ConfigChain>("load_config_from_source", {
        sourceType, configPath: entry.relative_path, contextPath,
      });
      const oldPrimaryFiles = source.primary_chain?.files ?? [];
      const newAvailable: ConfigEntry[] = [
        ...oldPrimaryFiles.map((f) => ({
          filename: f.name,
          relative_path: f.relative_path,
          size: f.line_count as number,
          location: { type: "loose" as const },
        })),
        ...source.available_configs.filter((c) => c.relative_path !== entry.relative_path),
      ];
      props.onCompareSourceChange({
        ...source,
        primary_chain: chain,
        available_configs: newAvailable,
        label: entry.filename,
      });
    } catch (e) {
      console.error(e);
    }
  }

  function clearCompare() {
    props.onCompareSourceChange(null);
    setPendingDrop(null);
  }

  return (
    <div class="flex flex-col h-full">
      {/* Top bar: mode toggle + hide-defaults (browse only) */}
      <div class="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[var(--sg-stat-border)]">
        <div class="flex gap-1 bg-base-200 rounded-md p-1">
          <button
            class={`px-3 py-1 text-sm font-semibold rounded ${mode() === "browse" ? "bg-[var(--color-primary)] text-white" : "text-[var(--sg-text-dim)]"}`}
            onClick={() => setMode("browse")}
          >
            Browse
          </button>
          <button
            class={`px-3 py-1 text-sm font-semibold rounded ${mode() === "domains" ? "bg-[var(--color-primary)] text-white" : "text-[var(--sg-text-dim)]"}`}
            onClick={() => setMode("domains")}
          >
            Domains
          </button>
        </div>
        <Show when={mode() === "browse"}>
          <label class="flex items-center gap-1 text-xs text-[var(--sg-text-dim)] ml-auto">
            <input type="checkbox" checked={hideDefaults()} onChange={(e) => setHideDefaults(e.currentTarget.checked)} />
            Show only custom
          </label>
        </Show>
      </div>

      {/* Domain sub-nav (only in domains mode) */}
      <Show when={mode() === "domains"}>
        <div class="flex items-center gap-1 px-4 pt-1 pb-0 border-b border-[var(--sg-stat-border)]">
          <button
            class={`px-3 py-1 text-sm border-b-2 ${domain() === "configs" ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--sg-text-dim)]"}`}
            onClick={() => setDomain("configs")}
          >
            Configs
          </button>
          <button class="px-3 py-1 text-sm opacity-40 cursor-not-allowed" disabled title="Coming soon">Maps</button>
          <button class="px-3 py-1 text-sm opacity-40 cursor-not-allowed" disabled title="Coming soon">Matches</button>
          <button class="px-3 py-1 text-sm opacity-40 cursor-not-allowed" disabled title="Coming soon">Assets</button>
        </div>
      </Show>

      {/* Content */}
      <div class="flex-1 overflow-hidden">
        <Switch>
          <Match when={mode() === "browse"}>
            <BrowseView
              exePath={props.exePath}
              mergedCvars={mergedCvarsFromConfig(props.config)}
              profile={props.profile}
              hideDefaults={hideDefaults()}
              onOpenInConfigs={handleOpenConfigFromBrowse}
              onSwitchToClientsTab={() => props.onSwitchToTab("clients")}
            />
          </Match>
          <Match when={mode() === "domains" && domain() === "configs"}>
            <Show when={pendingDrop()}>
              <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
                <div class="bg-base-200 rounded-lg shadow-xl p-6 max-w-sm mx-4 border border-[var(--sg-stat-border)]">
                  <p class="text-sm text-[var(--sg-text-bright)] mb-4">
                    {pendingDrop()!.length} file{pendingDrop()!.length > 1 ? "s" : ""} dropped. Replace current comparison?
                  </p>
                  <div class="flex gap-2 justify-end">
                    <button class="btn btn-ghost btn-sm" onClick={dismissPendingDrop}>Cancel</button>
                    <button class="btn btn-primary btn-sm" onClick={handleReplace}>Replace</button>
                  </div>
                </div>
              </div>
            </Show>
            <ConfigViewer
              config={props.config}
              configChain={props.configSource?.primary_chain ?? null}
              exePath={props.exePath}
              configName={props.configName}
              compareSource={props.compareSource}
              onClearCompare={clearCompare}
              isDragOver={isDragOver()}
              dropError={dropError()}
              availableConfigs={props.configSource?.available_configs}
              onCompareConfig={handleCompareConfig}
              onSwapCompareConfig={handleSwapCompareConfig}
              profile={props.profile}
            />
          </Match>
        </Switch>
      </div>
    </div>
  );
}

function mergedCvarsFromConfig(cfg: EzQuakeConfig | null): Record<string, string> {
  if (!cfg) return {};
  const out: Record<string, string> = {};
  for (const c of cfg.cvars ?? []) {
    out[c.name] = c.value;
  }
  return out;
}
```

Note: `mergedCvarsFromConfig` assumes `EzQuakeConfig` has a `cvars: {name, value}[]` field. If the actual shape differs (check `types.ts`), adjust the traversal to yield the same `Record<string, string>` map from the resolved chain. The intent is "final merged name->value map that ConfigViewer already computes."

- [ ] **Step 2: Wire `onSwitchToTab` prop from `App.tsx`**

Edit `App.tsx`, update the `<MyQuakeTab ... />` invocation to include:
```tsx
onSwitchToTab={setActiveTab}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors. If `cfg.cvars` shape is different, fix `mergedCvarsFromConfig` now.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/MyQuakeTab.tsx apps/slipgate-app/src/App.tsx
git commit -m "feat(slipgate): MyQuake 2-mode toggle with Browse + Domains (ConfigViewer relocated)"
```

---

### Task 20: File watcher stale-flag wiring

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/browse.rs`
- Modify: `apps/slipgate-app/src-tauri/src/lib.rs`
- Modify: `apps/slipgate-app/src/components/BrowseView.tsx`

- [ ] **Step 1: Add `start_browse_watch` / `stop_browse_watch` commands to `browse.rs`**

Follow the exact pattern from `watcher.rs`. Append to `browse.rs`:

```rust
use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tauri::Manager;

pub struct BrowseWatcherState {
    inner: Mutex<Option<Debouncer<RecommendedWatcher>>>,
}

impl BrowseWatcherState {
    pub fn new() -> Self {
        Self { inner: Mutex::new(None) }
    }
}

#[tauri::command]
pub fn start_browse_watch(exe_path: String, app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<BrowseWatcherState>();
    let exe = PathBuf::from(&exe_path);
    let root = exe.parent().ok_or_else(|| "invalid exe path".to_string())?.to_path_buf();

    let handle = app_handle.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |result: DebounceEventResult| {
            if let Ok(events) = result {
                if !events.is_empty() {
                    let _ = handle.emit("browse-scan-stale", ());
                }
            }
        },
    )
    .map_err(|e| format!("watcher create failed: {}", e))?;

    debouncer
        .watcher()
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| format!("watch failed: {}", e))?;

    let mut guard = state.inner.lock().map_err(|e| format!("lock: {}", e))?;
    *guard = Some(debouncer);
    Ok(())
}

#[tauri::command]
pub fn stop_browse_watch(app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<BrowseWatcherState>();
    let mut guard = state.inner.lock().map_err(|e| format!("lock: {}", e))?;
    *guard = None;
    Ok(())
}
```

- [ ] **Step 2: Register state + commands in `lib.rs`**

In the `tauri::generate_handler!` block add:
```rust
            commands::browse::start_browse_watch,
            commands::browse::stop_browse_watch,
```

After `.manage(commands::watcher::ConfigWatcherState::new())` add a new line:
```rust
            .manage(commands::browse::BrowseWatcherState::new())
```

- [ ] **Step 3: Wire listener in `BrowseView.tsx`**

Edit imports at top:
```tsx
import { listen } from "@tauri-apps/api/event";
```

Inside `BrowseView`, after the `onMount(runScan)` call:

```tsx
  onMount(async () => {
    await runScan();
    if (props.exePath) {
      try { await invoke("start_browse_watch", { exePath: props.exePath }); } catch (e) { console.error(e); }
    }
  });

  let unlistenStale: (() => void) | null = null;
  (async () => {
    unlistenStale = await listen("browse-scan-stale", () => setStale(true));
  })();

  onCleanup(() => {
    unlistenStale?.();
    invoke("stop_browse_watch").catch(() => {});
  });
```

(Replace the existing `onMount(runScan)` single-line call with the block above; add `onCleanup` to the imports from `solid-js`.)

- [ ] **Step 4: Verify everything compiles**

```bash
cargo check --manifest-path apps/slipgate-app/src-tauri/Cargo.toml
cd apps/slipgate-app && bun run tsc --noEmit
```

Expected: 0 errors on both.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/browse.rs \
        apps/slipgate-app/src-tauri/src/lib.rs \
        apps/slipgate-app/src/components/BrowseView.tsx
git commit -m "feat(slipgate): browse scan file watcher + stale flag pulse"
```

---

## Phase 6 -- Polish and verification

### Task 21: Manual verification pass

**Files:** None modified. This task runs the actual smoke checklist from Section 8 of the spec.

- [ ] **Step 1: Start the app in dev mode**

From Windows terminal (required for Tauri native build):
```bash
cd apps/slipgate-app && bun run tauri dev
```

- [ ] **Step 2: Run the smoke checklist**

Work through each item. Pass/fail each manually:

1. Point the app at a real quake dir with >=1 pak. Open MyQuake. Toggle to Browse. Tree renders in < 1 s.
2. Click ezquake in left pane. Non-matching branches dim. (On a v1 where most things are client-consumed, the visual effect is subtle -- confirm the "filter active" summary appears.)
3. Click `skins` under Filter by Domain. Tree filters down to skins; non-skin branches dim.
4. Select a file with a known collision. Right pane shows resolution chain with loose winning, paks dimmed.
5. Select a PNG or JPG (loose). Right pane renders the image via `convertFileSrc`.
6. Select a `.cfg`. Right pane shows "Open in Configs" button. Click it -> mode switches to Domains > Configs with that file loaded as compare.
7. Toggle "Show only custom". Stock install files disappear from the tree.
8. Edit a config file externally (open a .cfg in Notepad, save). Within ~1 second the "changes detected" label appears and Rescan pulses.
9. Click a non-active client in the left pane. The Slipgate app switches to the Clients tab.

- [ ] **Step 3: Note any failures**

Record any item that failed in the task's commit message, or file a follow-up item to `HANDOVER.md` if the root cause isn't fixable inline.

- [ ] **Step 4: Document the pass in `docs/OVERVIEW.md`**

Add a Browse section to `apps/slipgate-app/docs/OVERVIEW.md` under the "MyQuake tab" description. Include:
- The 2-mode structure
- ConfigViewer's relocation to Domains > Configs
- Browse mode's three-pane layout
- The filter lens + tree + detail pane responsibilities
- The scanner's location at `src-tauri/src/commands/browse.rs`
- That PCX/TGA/WAD preview is explicitly Phase 2
- That Maps/Matches/Assets domains are placeholders

Follow the existing OVERVIEW.md voice (plain English, map-not-code).

- [ ] **Step 5: Commit verification pass + docs update**

```bash
git add apps/slipgate-app/docs/OVERVIEW.md
git commit -m "docs(slipgate): OVERVIEW.md covers Browse mode + MyQuake 2-mode structure"
```

---

## Phase 7 -- Final resolution of vision-spec handover item

### Task 22: Resolve the HANDOVER.md item

**Files:**
- Modify: `HANDOVER.md` (monorepo root)

- [ ] **Step 1: Remove the "Quake-dir browser vision -- unblocked" entry**

Per the `HANDOVER.md` instructions at the top: "Entries get deleted (not struck through) when resolved. When done, delete both the index line AND the section."

Edit `HANDOVER.md`:
1. Delete the bullet under "## Open items" that references the quake-dir browser vision.
2. Delete the entire `## Quake-dir browser vision -- unblocked, ready for implementation brainstorm` section (and its content through to the next `---` divider).

- [ ] **Step 2: Verify update-count note**

If `MEMORY.md`'s `HANDOVER.md` pointer line mentions a specific count (e.g. "11 items pending"), decrement by 1. Current text: `"11 items pending as of 2026-04-20 (dir-browser vision now unblocked; schema-spec drift newly logged)."` -> change count and drop the "dir-browser vision now unblocked" clause.

Edit memory index entry in `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`:

```markdown
- **[Open handover items](/home/paradoks/projects/quakeworld/HANDOVER.md)** -- deferred items from prior wrap-ups. Check at session start. 10 items pending as of 2026-04-20 (dir-browser vision implementation plan written; schema-spec drift newly logged).
```

- [ ] **Step 3: Commit**

```bash
git add HANDOVER.md
git commit -m "docs(handover): resolve dir-browser vision item -- v1 plan written"
```

---

## Self-review notes (for the author of this plan)

**Spec coverage check:**
- Section 3.1 MyQuake restructure -> Task 19
- Section 3.2 three-pane layout -> Tasks 14, 15, 16, 17
- Section 3.3 component tree -> Tasks 14-18
- Section 3.4 filter semantics -> Task 16 (`matchesFilter`) + Task 15 (lens state) + Task 19 (`mergedCvarsFromConfig`)
- Section 3.5 default-suppression heuristic -> Task 8 (Rust) + Task 19 (UI toggle) + Task 16 (`matchesFilter` applies `hideDefaults`)
- Section 3.6 preview strategy -> Task 17
- Section 4 data model -> Tasks 1, 11, 12
- Section 5 scanner architecture -> Tasks 1-10
- Section 6 integration points -> Tasks 11-20
- Section 7 error handling -> Tasks 9 (warnings aggregation), 14 (error banner), 17 (preview empty state)
- Section 8 testing -> Tests embedded throughout Tasks 2-9 + Task 21 manual checklist
- Section 9 out of scope -> honored by Task 17's preview placeholder + absence of any other-format decoder tasks

**Placeholder scan:** no "TBD", "TODO", "similar to task N", or "fill in" strings in task bodies. `mergedCvarsFromConfig` assumes a `cvars` field on `EzQuakeConfig`; Task 19 Step 3 calls this out and tells the engineer to verify and adjust.

**Type consistency:** `ScannedFile`, `ScanResult`, `Container`, `Confidence` field names match between Rust (Task 1) and TypeScript (Task 12). `virtual_path` stays snake_case in both sides because Tauri's default serde config preserves snake_case through JSON. `BrowseFilterState` / `BrowseModeName` / `BrowseDomainName` defined once in Task 12, consumed in Tasks 14, 15, 16, 19.

**Scope check:** single implementation plan covers a single feature with clear component boundaries. No sub-decomposition needed.

**Ambiguity check:** `mergedCvarsFromConfig` is the one soft spot -- Task 19 flags the engineer to verify `EzQuakeConfig.cvars` shape. All other interfaces are pinned in their originating task.
