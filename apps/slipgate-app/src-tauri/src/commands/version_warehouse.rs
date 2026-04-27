use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::commands::data_root::data_root_path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WarehousedVersion {
    pub client: String,
    pub version: String,
    pub channel: String,
    pub blob_sha256: String,
    pub original_exe_name: String,
    pub size_bytes: u64,
    pub downloaded_at: u64,
    pub source: String,
    /// Filename-derived variant (e.g. "glsl"). None for canonical filenames.
    /// Decoupled from the version key per D6+D10 so qw-version-resolution
    /// stays variant-naive and oracle's snapshot consumer reads "3.6.6" as
    /// one canonical row regardless of variant.
    #[serde(default)]
    pub variant: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct WarehouseIndex {
    pub schema_version: u32,
    pub active: std::collections::HashMap<String, String>,
    pub last_scan: u64,
}

const SCHEMA_VERSION: u32 = 1;

pub fn warehouse_root_at(data_root: &Path) -> PathBuf {
    data_root.join("binaries")
}

pub fn blobs_dir_at(data_root: &Path) -> PathBuf {
    warehouse_root_at(data_root).join("blobs")
}

pub fn version_dir_at(data_root: &Path, client: &str, version: &str) -> PathBuf {
    warehouse_root_at(data_root).join(client).join(version)
}

/// Manifest dir for a specific (client, version, variant). Per D6+D10, variants
/// nest under `binaries/<client>/<version>/variants/<variant>/`; vanilla
/// (variant=None) stays at `binaries/<client>/<version>/`.
pub fn manifest_dir_at(
    data_root: &Path,
    client: &str,
    version: &str,
    variant: Option<&str>,
) -> PathBuf {
    let base = version_dir_at(data_root, client, version);
    match variant {
        Some(v) => base.join("variants").join(v),
        None => base,
    }
}

/// Synthesized key for the warehouse index's `active` map. Vanilla entries
/// remain bare `<client>` for back-compat; variants live at `<client>:<variant>`
/// so `(client, variant=None)` and `(client, variant=Some("glsl"))` are
/// independent active pointers (their canonical slots are separate filenames).
pub fn active_key(client: &str, variant: Option<&str>) -> String {
    match variant {
        Some(v) => format!("{}:{}", client, v),
        None => client.to_string(),
    }
}

pub fn index_path_at(data_root: &Path) -> PathBuf {
    warehouse_root_at(data_root).join("index.json")
}

pub fn blob_path_for(data_root: &Path, sha256: &str) -> PathBuf {
    blobs_dir_at(data_root).join(format!("{}.exe", sha256))
}

fn now_epoch_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn hash_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("read failed for hashing: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

pub fn read_index_at(data_root: &Path) -> WarehouseIndex {
    let path = index_path_at(data_root);
    if !path.exists() {
        return WarehouseIndex {
            schema_version: SCHEMA_VERSION,
            ..Default::default()
        };
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| WarehouseIndex {
            schema_version: SCHEMA_VERSION,
            ..Default::default()
        })
}

pub fn write_index_at(data_root: &Path, idx: &WarehouseIndex) -> Result<(), String> {
    let path = index_path_at(data_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(
        &path,
        serde_json::to_string_pretty(idx).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("write index failed: {}", e))
}

pub fn register_version_at(
    data_root: &Path,
    client: &str,
    version: &str,
    variant: Option<&str>,
    src_exe: &Path,
    channel: &str,
    source: &str,
) -> Result<WarehousedVersion, String> {
    let sha = hash_file(src_exe)?;

    let blobs_dir = blobs_dir_at(data_root);
    fs::create_dir_all(&blobs_dir).map_err(|e| e.to_string())?;
    let blob_path = blobs_dir.join(format!("{}.exe", &sha));
    if !blob_path.exists() {
        fs::copy(src_exe, &blob_path).map_err(|e| format!("blob write failed: {}", e))?;
    }

    let dir = manifest_dir_at(data_root, client, version, variant);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let original_exe_name = src_exe
        .file_name()
        .ok_or("source exe has no filename")?
        .to_string_lossy()
        .into_owned();
    let metadata = fs::metadata(src_exe).map_err(|e| e.to_string())?;
    let entry = WarehousedVersion {
        client: client.to_string(),
        version: version.to_string(),
        channel: channel.to_string(),
        blob_sha256: sha,
        original_exe_name,
        size_bytes: metadata.len(),
        downloaded_at: now_epoch_secs(),
        source: source.to_string(),
        variant: variant.map(|s| s.to_string()),
    };
    let manifest_path = dir.join("manifest.json");
    fs::write(
        &manifest_path,
        serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(entry)
}

fn read_manifest_at(path: &Path) -> Result<WarehousedVersion, String> {
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str::<WarehousedVersion>(&text)
        .map_err(|e| format!("manifest parse failed at {}: {}", path.display(), e))
}

pub fn list_warehoused_versions_at(data_root: &Path) -> Result<Vec<WarehousedVersion>, String> {
    let root = warehouse_root_at(data_root);
    if !root.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for client_entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let client_entry = client_entry.map_err(|e| e.to_string())?;
        let client_path = client_entry.path();
        if !client_path.is_dir() {
            continue;
        }
        let name = client_entry.file_name().to_string_lossy().into_owned();
        if name == "blobs" {
            continue;
        }
        for version_entry in fs::read_dir(&client_path).map_err(|e| e.to_string())? {
            let version_entry = version_entry.map_err(|e| e.to_string())?;
            let version_path = version_entry.path();
            if !version_path.is_dir() {
                continue;
            }
            // Vanilla manifest at <version>/manifest.json
            let manifest_path = version_path.join("manifest.json");
            if manifest_path.exists() {
                out.push(read_manifest_at(&manifest_path)?);
            }
            // Variant manifests at <version>/variants/<variant>/manifest.json
            let variants_dir = version_path.join("variants");
            if variants_dir.is_dir() {
                for variant_entry in fs::read_dir(&variants_dir).map_err(|e| e.to_string())? {
                    let variant_entry = variant_entry.map_err(|e| e.to_string())?;
                    let variant_path = variant_entry.path();
                    if !variant_path.is_dir() {
                        continue;
                    }
                    let v_manifest = variant_path.join("manifest.json");
                    if v_manifest.exists() {
                        out.push(read_manifest_at(&v_manifest)?);
                    }
                }
            }
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn list_warehoused_versions(app: tauri::AppHandle) -> Result<Vec<WarehousedVersion>, String> {
    let root = data_root_path(&app)?;
    list_warehoused_versions_at(&root)
}

#[tauri::command]
pub fn read_warehouse_index(app: tauri::AppHandle) -> Result<WarehouseIndex, String> {
    let root = data_root_path(&app)?;
    Ok(read_index_at(&root))
}

#[tauri::command]
pub fn import_existing_install(
    app: tauri::AppHandle,
    client: String,
    exe_path: String,
) -> Result<WarehousedVersion, String> {
    let exe_path = PathBuf::from(&exe_path);
    if !exe_path.exists() {
        return Err(format!("exe not found: {}", exe_path.display()));
    }
    let raw = crate::commands::ezquake::read_exe_version(&exe_path)
        .ok_or("could not read version from exe (Linux/dev cannot read PE versions)")?;
    let version = crate::commands::updater::parse_pe_version(&raw)
        .map(|(sv, _)| sv.to_string())
        .unwrap_or(raw);
    let root = data_root_path(&app)?;
    // Foreign-exe Import affordance: variant inferred from the source filename
    // (so an import of `ezquake-glsl.exe` warehouses under the glsl variant slot
    // instead of colliding with vanilla 3.6.6).
    let filename = exe_path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let variant = crate::commands::client_fingerprint::variant_from_filename(&filename);
    register_version_at(
        &root,
        &client,
        &version,
        variant.as_deref(),
        &exe_path,
        "imported",
        "user_import",
    )
}

pub fn register_version(
    app: &tauri::AppHandle,
    client: &str,
    version: &str,
    src_exe: &Path,
    channel: &str,
    source: &str,
) -> Result<WarehousedVersion, String> {
    let root = data_root_path(app)?;
    // Updater path always installs to the canonical filename, so variant is None.
    register_version_at(&root, client, version, None, src_exe, channel, source)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_fake_exe(dir: &Path, name: &str, contents: &[u8]) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, contents).unwrap();
        path
    }

    #[test]
    fn empty_warehouse_returns_empty_list() {
        let tmp = TempDir::new().unwrap();
        assert!(list_warehoused_versions_at(tmp.path()).unwrap().is_empty());
    }

    #[test]
    fn register_writes_blob_and_manifest() {
        let tmp = TempDir::new().unwrap();
        let src = make_fake_exe(tmp.path(), "src.exe", b"fake exe contents");
        let entry = register_version_at(
            tmp.path(),
            "ezquake",
            "3.6.9",
            None,
            &src,
            "stable",
            "github_release",
        )
        .unwrap();
        assert_eq!(entry.client, "ezquake");
        assert_eq!(entry.version, "3.6.9");
        assert_eq!(entry.size_bytes, 17);
        assert_eq!(entry.blob_sha256.len(), 64);
        assert!(entry.variant.is_none());
        let blob = blob_path_for(tmp.path(), &entry.blob_sha256);
        assert!(blob.exists());
    }

    #[test]
    fn duplicate_bytes_share_blob() {
        let tmp = TempDir::new().unwrap();
        let src1 = make_fake_exe(tmp.path(), "a.exe", b"identical");
        let src2 = make_fake_exe(tmp.path(), "b.exe", b"identical");
        let e1 = register_version_at(tmp.path(), "ezquake", "v1", None, &src1, "stable", "src")
            .unwrap();
        let e2 = register_version_at(tmp.path(), "ezquake", "v2", None, &src2, "stable", "src")
            .unwrap();
        assert_eq!(e1.blob_sha256, e2.blob_sha256);
        let blob_count = fs::read_dir(blobs_dir_at(tmp.path())).unwrap().count();
        assert_eq!(blob_count, 1);
    }

    #[test]
    fn list_skips_dirs_without_manifest_and_blobs_dir() {
        let tmp = TempDir::new().unwrap();
        let bogus = tmp.path().join("binaries/ezquake/no-manifest");
        fs::create_dir_all(&bogus).unwrap();
        fs::write(bogus.join("ezquake.exe"), b"orphan").unwrap();
        fs::create_dir_all(blobs_dir_at(tmp.path())).unwrap();
        assert!(list_warehoused_versions_at(tmp.path()).unwrap().is_empty());
    }

    #[test]
    fn list_handles_multiple_clients() {
        let tmp = TempDir::new().unwrap();
        let exe1 = make_fake_exe(tmp.path(), "a.exe", b"a");
        let exe2 = make_fake_exe(tmp.path(), "b.exe", b"b");
        register_version_at(tmp.path(), "ezquake", "3.6.9", None, &exe1, "stable", "src").unwrap();
        register_version_at(tmp.path(), "ktx", "1.45", None, &exe2, "stable", "src").unwrap();
        let listed = list_warehoused_versions_at(tmp.path()).unwrap();
        assert_eq!(listed.len(), 2);
    }

    #[test]
    fn register_with_variant_writes_nested_manifest() {
        let tmp = TempDir::new().unwrap();
        let src = make_fake_exe(tmp.path(), "ezquake-glsl.exe", b"glsl-bytes");
        let entry = register_version_at(
            tmp.path(),
            "ezquake",
            "3.6.6",
            Some("glsl"),
            &src,
            "stable",
            "github_release",
        )
        .unwrap();
        assert_eq!(entry.variant.as_deref(), Some("glsl"));
        let nested = manifest_dir_at(tmp.path(), "ezquake", "3.6.6", Some("glsl"))
            .join("manifest.json");
        assert!(nested.exists());
        let listed = list_warehoused_versions_at(tmp.path()).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].variant.as_deref(), Some("glsl"));
    }

    #[test]
    fn list_finds_vanilla_and_variant_for_same_version() {
        let tmp = TempDir::new().unwrap();
        let vanilla = make_fake_exe(tmp.path(), "ezquake.exe", b"vanilla");
        let glsl = make_fake_exe(tmp.path(), "ezquake-glsl.exe", b"glsl");
        register_version_at(tmp.path(), "ezquake", "3.6.6", None, &vanilla, "stable", "test")
            .unwrap();
        register_version_at(
            tmp.path(),
            "ezquake",
            "3.6.6",
            Some("glsl"),
            &glsl,
            "stable",
            "test",
        )
        .unwrap();
        let listed = list_warehoused_versions_at(tmp.path()).unwrap();
        assert_eq!(listed.len(), 2);
        let variants: Vec<Option<String>> = listed.iter().map(|v| v.variant.clone()).collect();
        assert!(variants.contains(&None));
        assert!(variants.contains(&Some("glsl".to_string())));
    }

    #[test]
    fn active_key_synthesis() {
        assert_eq!(active_key("ezquake", None), "ezquake");
        assert_eq!(active_key("ezquake", Some("glsl")), "ezquake:glsl");
    }

    #[test]
    fn index_round_trip() {
        let tmp = TempDir::new().unwrap();
        fs::create_dir_all(warehouse_root_at(tmp.path())).unwrap();
        let mut idx = read_index_at(tmp.path());
        idx.active
            .insert("ezquake".to_string(), "3.6.9".to_string());
        idx.last_scan = 1714000000;
        write_index_at(tmp.path(), &idx).unwrap();
        let read = read_index_at(tmp.path());
        assert_eq!(read.active.get("ezquake").unwrap(), "3.6.9");
        assert_eq!(read.schema_version, SCHEMA_VERSION);
    }
}
