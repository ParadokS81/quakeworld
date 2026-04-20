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
