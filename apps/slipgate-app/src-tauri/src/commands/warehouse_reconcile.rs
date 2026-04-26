use std::path::PathBuf;

use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::commands::data_root::data_root_path;
use crate::commands::version_warehouse::{
    list_warehoused_versions_at, read_index_at, write_index_at, WarehouseIndex,
};

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum ReconcileResult {
    NoActive,
    Matched { version: String },
    Foreign { sha256: String },
}

fn now_epoch_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[tauri::command]
pub fn reconcile_active_version(
    app: tauri::AppHandle,
    client: String,
    canonical_exe_path: String,
) -> Result<ReconcileResult, String> {
    let data_root = data_root_path(&app)?;
    let exe = PathBuf::from(&canonical_exe_path);

    let mut idx: WarehouseIndex = read_index_at(&data_root);

    if !exe.exists() {
        idx.active.remove(&client);
        idx.last_scan = now_epoch_secs();
        write_index_at(&data_root, &idx)?;
        return Ok(ReconcileResult::NoActive);
    }

    let bytes = std::fs::read(&exe).map_err(|e| format!("read failed: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let sha = format!("{:x}", hasher.finalize());

    let warehoused = list_warehoused_versions_at(&data_root)?;
    let matched = warehoused
        .into_iter()
        .find(|w| w.blob_sha256 == sha && w.client == client);
    let result = match matched {
        Some(w) => {
            idx.active.insert(client.clone(), w.version.clone());
            ReconcileResult::Matched { version: w.version }
        }
        None => {
            idx.active.remove(&client);
            ReconcileResult::Foreign { sha256: sha }
        }
    };
    idx.last_scan = now_epoch_secs();
    write_index_at(&data_root, &idx)?;
    Ok(result)
}
