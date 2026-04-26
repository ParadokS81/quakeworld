use std::path::PathBuf;

use serde::Serialize;
use tauri::Manager;

#[derive(Serialize, Clone, Debug)]
pub struct DataRootInfo {
    pub path: String,
    pub mode: DataRootMode,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DataRootMode {
    Portable,
    Installed,
}

#[tauri::command]
pub fn get_data_root(app: tauri::AppHandle) -> Result<DataRootInfo, String> {
    resolve_data_root(&app).map_err(|e| e.to_string())
}

fn resolve_data_root(app: &tauri::AppHandle) -> Result<DataRootInfo, std::io::Error> {
    let exe_dir = std::env::current_exe()?
        .parent()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::Other, "no exe dir"))?
        .to_path_buf();

    let portable_marker = exe_dir.join("data").join("portable.flag");
    if portable_marker.exists() {
        let portable_root = exe_dir.join("data");
        std::fs::create_dir_all(&portable_root)?;
        return Ok(DataRootInfo {
            path: portable_root.to_string_lossy().into_owned(),
            mode: DataRootMode::Portable,
        });
    }

    let installed_root = app
        .path()
        .app_data_dir()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    std::fs::create_dir_all(&installed_root)?;

    Ok(DataRootInfo {
        path: installed_root.to_string_lossy().into_owned(),
        mode: DataRootMode::Installed,
    })
}

pub fn data_root_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    resolve_data_root(app)
        .map(|info| PathBuf::from(info.path))
        .map_err(|e| e.to_string())
}
