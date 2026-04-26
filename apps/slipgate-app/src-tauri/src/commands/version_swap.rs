use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::commands::data_root::data_root_path;
use crate::commands::version_warehouse::{
    blob_path_for, list_warehoused_versions_at, read_index_at, version_dir_at, write_index_at,
};

#[derive(Serialize, Clone, Debug)]
pub struct SwapResult {
    pub previous_sha256: Option<String>,
    pub previous_was_foreign: bool,
    pub new_version: String,
    pub backup_path: Option<String>,
}

fn hash_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("read failed: {}", e))?;
    let mut h = Sha256::new();
    h.update(&bytes);
    Ok(format!("{:x}", h.finalize()))
}

fn now_epoch_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[tauri::command]
pub fn swap_active_version(
    app: tauri::AppHandle,
    client: String,
    target_version: String,
    quake_dir: String,
    target_exe_name: String,
) -> Result<SwapResult, String> {
    let data_root = data_root_path(&app)?;
    let quake_dir = PathBuf::from(&quake_dir);
    if !quake_dir.exists() {
        return Err(format!("quake dir does not exist: {}", quake_dir.display()));
    }
    let canonical = quake_dir.join(&target_exe_name);

    let warehoused = list_warehoused_versions_at(&data_root)?;
    let target = warehoused
        .iter()
        .find(|w| w.client == client && w.version == target_version)
        .ok_or_else(|| format!("version not in warehouse: {} {}", client, target_version))?;
    let blob = blob_path_for(&data_root, &target.blob_sha256);
    if !blob.exists() {
        return Err(format!("warehouse blob missing: {}", blob.display()));
    }

    // D6: only back up foreign exes; warehouse-known bytes are recoverable from the blob.
    let mut previous_sha256: Option<String> = None;
    let mut previous_was_foreign = false;
    let mut backup_path: Option<String> = None;

    if canonical.exists() {
        let current_sha = hash_file(&canonical)?;
        previous_sha256 = Some(current_sha.clone());
        let warehoused_match = warehoused.iter().any(|w| w.blob_sha256 == current_sha);
        if !warehoused_match {
            previous_was_foreign = true;
            let stem = target_exe_name
                .strip_suffix(".exe")
                .unwrap_or(&target_exe_name);
            let backup = quake_dir.join(format!("{}.bak.exe", stem));
            // Only one foreign-exe-backup retained; older .bak (if any) is overwritten by rename.
            if backup.exists() {
                let _ = fs::remove_file(&backup);
            }
            fs::rename(&canonical, &backup)
                .map_err(|e| format!("rename to backup failed: {}", e))?;
            backup_path = Some(backup.to_string_lossy().into_owned());
        } else {
            fs::remove_file(&canonical)
                .map_err(|e| format!("remove current exe failed: {}", e))?;
        }
    }

    // Transactional copy: blob -> .new -> rename to canonical (atomic on POSIX/NTFS).
    let staging = canonical.with_extension("new");
    fs::copy(&blob, &staging).map_err(|e| format!("copy from blob failed: {}", e))?;
    if let Err(e) = fs::rename(&staging, &canonical) {
        let _ = fs::remove_file(&staging);
        if let Some(ref bp) = backup_path {
            let _ = fs::rename(bp, &canonical);
        }
        return Err(format!("install rename failed: {}", e));
    }

    let mut idx = read_index_at(&data_root);
    idx.active.insert(client.clone(), target_version.clone());
    idx.last_scan = now_epoch_secs();
    write_index_at(&data_root, &idx)?;

    Ok(SwapResult {
        previous_sha256,
        previous_was_foreign,
        new_version: target_version,
        backup_path,
    })
}

#[tauri::command]
pub fn delete_warehoused_version(
    app: tauri::AppHandle,
    client: String,
    version: String,
) -> Result<(), String> {
    let data_root = data_root_path(&app)?;
    let warehoused = list_warehoused_versions_at(&data_root)?;
    let target = warehoused
        .iter()
        .find(|w| w.client == client && w.version == version)
        .ok_or_else(|| format!("not in warehouse: {} {}", client, version))?;

    let idx = read_index_at(&data_root);
    if idx
        .active
        .get(&client)
        .map(|v| v == &version)
        .unwrap_or(false)
    {
        return Err("cannot delete the active version; switch first".into());
    }

    let dir = version_dir_at(&data_root, &client, &version);
    fs::remove_dir_all(&dir).map_err(|e| format!("remove version dir failed: {}", e))?;

    let still_referenced = warehoused
        .iter()
        .any(|w| !(w.client == client && w.version == version) && w.blob_sha256 == target.blob_sha256);
    if !still_referenced {
        let blob = blob_path_for(&data_root, &target.blob_sha256);
        if blob.exists() {
            let _ = fs::remove_file(&blob);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::version_warehouse::{
        blobs_dir_at, register_version_at, warehouse_root_at,
    };
    use tempfile::TempDir;

    fn make_fake_exe(dir: &Path, name: &str, contents: &[u8]) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, contents).unwrap();
        path
    }

    /// Helper: full swap walk without going through the AppHandle.
    /// Mirrors swap_active_version's body so tests can drive it with a TempDir.
    fn swap_at(
        data_root: &Path,
        client: &str,
        target_version: &str,
        quake_dir: &Path,
        target_exe_name: &str,
    ) -> Result<SwapResult, String> {
        let canonical = quake_dir.join(target_exe_name);
        let warehoused = list_warehoused_versions_at(data_root)?;
        let target = warehoused
            .iter()
            .find(|w| w.client == client && w.version == target_version)
            .ok_or_else(|| format!("version not in warehouse: {} {}", client, target_version))?;
        let blob = blob_path_for(data_root, &target.blob_sha256);
        if !blob.exists() {
            return Err(format!("warehouse blob missing: {}", blob.display()));
        }
        let mut previous_sha256: Option<String> = None;
        let mut previous_was_foreign = false;
        let mut backup_path: Option<String> = None;
        if canonical.exists() {
            let current_sha = hash_file(&canonical)?;
            previous_sha256 = Some(current_sha.clone());
            let warehoused_match = warehoused.iter().any(|w| w.blob_sha256 == current_sha);
            if !warehoused_match {
                previous_was_foreign = true;
                let stem = target_exe_name
                    .strip_suffix(".exe")
                    .unwrap_or(target_exe_name);
                let backup = quake_dir.join(format!("{}.bak.exe", stem));
                if backup.exists() {
                    let _ = fs::remove_file(&backup);
                }
                fs::rename(&canonical, &backup).map_err(|e| e.to_string())?;
                backup_path = Some(backup.to_string_lossy().into_owned());
            } else {
                fs::remove_file(&canonical).map_err(|e| e.to_string())?;
            }
        }
        let staging = canonical.with_extension("new");
        fs::copy(&blob, &staging).map_err(|e| e.to_string())?;
        fs::rename(&staging, &canonical).map_err(|e| e.to_string())?;
        let mut idx = read_index_at(data_root);
        idx.active
            .insert(client.to_string(), target_version.to_string());
        idx.last_scan = now_epoch_secs();
        write_index_at(data_root, &idx)?;
        Ok(SwapResult {
            previous_sha256,
            previous_was_foreign,
            new_version: target_version.to_string(),
            backup_path,
        })
    }

    #[test]
    fn swap_with_warehouse_known_previous_does_not_back_up() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let quake_dir = tmp.path().join("qw");
        fs::create_dir_all(&data_root).unwrap();
        fs::create_dir_all(&quake_dir).unwrap();

        let src_a = make_fake_exe(tmp.path(), "src-a.exe", b"version-a-bytes");
        let src_b = make_fake_exe(tmp.path(), "src-b.exe", b"version-b-bytes");
        register_version_at(&data_root, "ezquake", "3.6.6", &src_a, "stable", "test").unwrap();
        register_version_at(&data_root, "ezquake", "3.6.9", &src_b, "stable", "test").unwrap();

        // Pre-place A as the canonical so that swapping to B sees a warehouse-known previous.
        fs::copy(&src_a, quake_dir.join("ezquake.exe")).unwrap();

        let r = swap_at(&data_root, "ezquake", "3.6.9", &quake_dir, "ezquake.exe").unwrap();
        assert!(!r.previous_was_foreign);
        assert!(r.backup_path.is_none());
        assert!(!quake_dir.join("ezquake.bak.exe").exists());
        assert_eq!(fs::read(quake_dir.join("ezquake.exe")).unwrap(), b"version-b-bytes");
        let idx = read_index_at(&data_root);
        assert_eq!(idx.active.get("ezquake").unwrap(), "3.6.9");
    }

    #[test]
    fn swap_with_foreign_previous_creates_bak() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let quake_dir = tmp.path().join("qw");
        fs::create_dir_all(&data_root).unwrap();
        fs::create_dir_all(&quake_dir).unwrap();

        let src = make_fake_exe(tmp.path(), "src.exe", b"warehoused-bytes");
        register_version_at(&data_root, "ezquake", "3.6.9", &src, "stable", "test").unwrap();
        // Drop a foreign exe (bytes not in warehouse) at the canonical path.
        fs::write(quake_dir.join("ezquake.exe"), b"foreign-stranger-bytes").unwrap();

        let r = swap_at(&data_root, "ezquake", "3.6.9", &quake_dir, "ezquake.exe").unwrap();
        assert!(r.previous_was_foreign);
        assert!(r.backup_path.is_some());
        let bak = quake_dir.join("ezquake.bak.exe");
        assert!(bak.exists());
        assert_eq!(fs::read(&bak).unwrap(), b"foreign-stranger-bytes");
        assert_eq!(fs::read(quake_dir.join("ezquake.exe")).unwrap(), b"warehoused-bytes");
    }

    #[test]
    fn swap_to_missing_version_errors() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let quake_dir = tmp.path().join("qw");
        fs::create_dir_all(&data_root).unwrap();
        fs::create_dir_all(&quake_dir).unwrap();
        // No registered versions at all.
        let r = swap_at(&data_root, "ezquake", "3.6.9", &quake_dir, "ezquake.exe");
        assert!(r.is_err());
    }

    /// Helper mirroring delete_warehoused_version for tests.
    fn delete_at(data_root: &Path, client: &str, version: &str) -> Result<(), String> {
        let warehoused = list_warehoused_versions_at(data_root)?;
        let target = warehoused
            .iter()
            .find(|w| w.client == client && w.version == version)
            .ok_or_else(|| format!("not in warehouse: {} {}", client, version))?;
        let idx = read_index_at(data_root);
        if idx
            .active
            .get(client)
            .map(|v| v == version)
            .unwrap_or(false)
        {
            return Err("cannot delete the active version; switch first".into());
        }
        let dir = version_dir_at(data_root, client, version);
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
        let still_referenced = warehoused.iter().any(|w| {
            !(w.client == client && w.version == version) && w.blob_sha256 == target.blob_sha256
        });
        if !still_referenced {
            let blob = blob_path_for(data_root, &target.blob_sha256);
            if blob.exists() {
                let _ = fs::remove_file(&blob);
            }
        }
        Ok(())
    }

    #[test]
    fn delete_non_active_removes_dir_and_gcs_blob() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        fs::create_dir_all(&data_root).unwrap();
        let src = make_fake_exe(tmp.path(), "src.exe", b"only-bytes");
        let entry =
            register_version_at(&data_root, "ezquake", "3.6.6", &src, "stable", "test").unwrap();

        delete_at(&data_root, "ezquake", "3.6.6").unwrap();

        assert!(!version_dir_at(&data_root, "ezquake", "3.6.6").exists());
        assert!(!blob_path_for(&data_root, &entry.blob_sha256).exists());
        // warehouse_root remains; blobs dir might exist but be empty.
        assert!(warehouse_root_at(&data_root).exists());
        let blobs = blobs_dir_at(&data_root);
        if blobs.exists() {
            assert_eq!(fs::read_dir(&blobs).unwrap().count(), 0);
        }
    }

    #[test]
    fn delete_keeps_blob_when_other_manifest_references_it() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        fs::create_dir_all(&data_root).unwrap();
        let src1 = make_fake_exe(tmp.path(), "a.exe", b"shared-bytes");
        let src2 = make_fake_exe(tmp.path(), "b.exe", b"shared-bytes");
        let e1 =
            register_version_at(&data_root, "ezquake", "v1", &src1, "stable", "test").unwrap();
        let _e2 =
            register_version_at(&data_root, "ezquake", "v2", &src2, "stable", "test").unwrap();

        delete_at(&data_root, "ezquake", "v1").unwrap();

        // v2 still references the shared blob; it must survive.
        assert!(blob_path_for(&data_root, &e1.blob_sha256).exists());
        assert!(version_dir_at(&data_root, "ezquake", "v2").exists());
    }

    #[test]
    fn delete_active_refuses() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        fs::create_dir_all(&data_root).unwrap();
        let src = make_fake_exe(tmp.path(), "src.exe", b"x");
        register_version_at(&data_root, "ezquake", "3.6.9", &src, "stable", "test").unwrap();
        let mut idx = read_index_at(&data_root);
        idx.active
            .insert("ezquake".to_string(), "3.6.9".to_string());
        write_index_at(&data_root, &idx).unwrap();

        let r = delete_at(&data_root, "ezquake", "3.6.9");
        assert!(r.is_err());
    }
}
