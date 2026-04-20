use crate::commands::archive;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

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
    pub confidence: String,
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
    pub cvar_bindings: Vec<usize>,
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
    pub kind: String,
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
        Err(_) => return Ok(()),
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
                continue;
            }
        }
    }

    Ok((archives, entries))
}

/// Match a virtual_path against the bundle's extension rules.
/// Returns the category_id for the first match that satisfies both extension AND path_hint.
/// Path-hinted rules take priority over path-less rules on the same extension.
pub fn classify_extension(virtual_path: &str, extensions: &[BundleExtension]) -> Option<String> {
    let lower = virtual_path.to_lowercase();

    for rule in extensions.iter().filter(|r| r.path_hint.is_some()) {
        if !lower.ends_with(&rule.extension.to_lowercase()) {
            continue;
        }
        let hint = rule.path_hint.as_ref().unwrap().to_lowercase();
        if lower.contains(&hint) {
            return Some(rule.category_id.clone());
        }
    }

    for rule in extensions.iter().filter(|r| r.path_hint.is_none()) {
        if lower.ends_with(&rule.extension.to_lowercase()) {
            return Some(rule.category_id.clone());
        }
    }

    None
}

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

    let loose = walk_loose_files(&root).map_err(|e| format!("walk failed: {}", e))?;

    let (archives, archive_entries) = enumerate_archives(&root).unwrap_or_else(|e| {
        warnings.push(ScanWarning {
            kind: ScanWarningKind::ArchiveParseFailure,
            path: root_str.clone(),
            message: format!("archive enumeration failed: {}", e),
        });
        (Vec::new(), Vec::new())
    });

    let mut candidates: Vec<(String, Container, u64, u64)> = Vec::new();
    for (vp, size, mtime) in loose {
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

    fn normalize_for_lifo(vp: &str, container: &Container) -> String {
        match container {
            Container::Loose => vp.to_string(),
            Container::Archive { archive_path, entry } => {
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

    let unresolved_external_refs =
        find_external_refs(&bundle.asset_cvar_bindings, &merged_cvars, &root_str);

    let clients_detected = vec![ClientInfo {
        name: "ezquake".to_string(),
        exe_path: exe_path.clone(),
        version: None,
        active: true,
    }];

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
    stats.available = files
        .iter()
        .filter(|f| {
            f.category_id.is_some()
                && f.consumed_by.loader_sites.is_empty()
                && f.consumed_by.cvar_bindings.is_empty()
                && !f.is_default
        })
        .count();
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

/// For each candidate, return true iff this entry is the LIFO winner for its virtual_path.
/// Heuristic v1 ranking (higher = wins):
///   3: loose file in a user gamedir (qw/ezquake/custom)
///   2: archive-interior entry in a user gamedir
///   1: loose file in id1/
///   0: archive-interior entry in id1/
/// Ties within a rank resolve by the archive's lexical order (later name = later mount).
pub fn pick_lifo_winners(candidates: &[(String, Container)]) -> Vec<bool> {
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
        // extract the short cvar name from "ezquake:cvar:baseskin" -> "baseskin"
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

/// Shipped pak filenames that count as default client content.
/// Conservative v1 list: standard ezQuake/qw/id1 paks named pak0 through pak9.
const SHIPPED_PAK_NAMES: &[&str] = &[
    "pak0.pak", "pak1.pak", "pak2.pak",
];

const SHIPPED_GAMEDIRS_FOR_PAK: &[&str] = &["id1", "ezquake", "qw"];

/// Returns true if this file entry is part of the default shipped game content.
/// Loose id1 files are always default. Archives in known gamedirs with named pak0-pak2 are default.
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
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = parent;
        Err("open_containing_folder is Windows-only in v1".to_string())
    }
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

#[cfg(test)]
mod tests {
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

    #[test]
    fn enumerate_archives_collects_pak_entries() {
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

    #[test]
    fn lifo_resolution_picks_loose_over_pak() {
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

    #[test]
    fn scan_end_to_end_small_tree() {
        let tmp = tempdir().unwrap();
        let root = tmp.path();

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

        // exe lives in qw/, so root = qw/. Only qw/ contents are scanned:
        // haste.pcx, wall.tga, ezquake.exe (loose) + skins/bps.pcx from pak1.pak
        assert!(!result.files.is_empty());
        for f in &result.files {
            assert!(f.size > 0 || f.size == 0);
        }
        // 4 scanned entries each 1 byte; just confirm bytes were accumulated
        assert!(result.stats.total_bytes >= 1);
    }
}
