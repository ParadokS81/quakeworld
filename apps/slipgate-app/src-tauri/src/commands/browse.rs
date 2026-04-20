use crate::commands::archive;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

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
}
