use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use super::ezquake::config_dir_from_exe;

#[derive(Serialize, Clone)]
pub struct ConfigChangedPayload {
    pub exe_path: String,
    pub config_name: String,
}

struct ConfigWatcherInner {
    _debouncer: Debouncer<RecommendedWatcher>,
    _watched_paths: Vec<PathBuf>,
}

pub struct ConfigWatcherState {
    inner: Mutex<Option<ConfigWatcherInner>>,
}

impl ConfigWatcherState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }
}

/// Find config files from the chain that live outside the configs/ directory.
fn discover_outlier_paths(
    exe_path: &str,
    config_name: &str,
    cfg_dir: &PathBuf,
    game_dir: &PathBuf,
) -> Vec<PathBuf> {
    match super::ezquake::read_config_chain(exe_path.to_string(), config_name.to_string()) {
        Ok(chain) => chain
            .files
            .iter()
            .filter_map(|f| {
                let full_path = game_dir.join(&f.relative_path);
                let canonical = full_path.canonicalize().ok()?;
                let cfg_canonical = cfg_dir.canonicalize().ok()?;
                if !canonical.starts_with(&cfg_canonical) {
                    Some(canonical)
                } else {
                    None
                }
            })
            .collect(),
        Err(_) => Vec::new(),
    }
}

#[tauri::command]
pub fn start_config_watch(
    exe_path: String,
    config_name: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    let state = app_handle.state::<ConfigWatcherState>();

    let exe = PathBuf::from(&exe_path);
    let cfg_dir = config_dir_from_exe(&exe);
    let game_dir = cfg_dir.parent().unwrap_or(&cfg_dir).to_path_buf();

    let outlier_paths = discover_outlier_paths(&exe_path, &config_name, &cfg_dir, &game_dir);

    let mut watch_paths: Vec<PathBuf> = Vec::new();

    // 1. Watch the configs/ directory
    if cfg_dir.exists() {
        watch_paths.push(cfg_dir.clone());
    }

    // 2. Watch autoexec.cfg if it exists outside configs/
    let autoexec = game_dir.join("autoexec.cfg");
    if autoexec.exists() {
        watch_paths.push(autoexec);
    }

    // 3. Watch outlier files from the config chain
    for path in &outlier_paths {
        if path.exists() && !path.starts_with(&cfg_dir) {
            watch_paths.push(path.clone());
        }
    }

    // Create debounced watcher
    let emit_exe = exe_path.clone();
    let emit_cfg = config_name.clone();
    let handle = app_handle.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |result: DebounceEventResult| match result {
            Ok(events) => {
                let cfg_changed = events
                    .iter()
                    .any(|e| e.path.extension().map_or(false, |ext| ext == "cfg"));
                if cfg_changed {
                    let _ = handle.emit(
                        "config-changed",
                        ConfigChangedPayload {
                            exe_path: emit_exe.clone(),
                            config_name: emit_cfg.clone(),
                        },
                    );
                }
            }
            Err(e) => {
                eprintln!("Config watcher error: {:?}", e);
            }
        },
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Register watch paths
    for path in &watch_paths {
        debouncer
            .watcher()
            .watch(path, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch {}: {}", path.display(), e))?;
    }

    println!(
        "Config watcher started: {} paths watched for {}",
        watch_paths.len(),
        config_name
    );
    for p in &watch_paths {
        println!("  watching: {}", p.display());
    }

    // Store in state (drops old watcher if any)
    let mut guard = state
        .inner
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    *guard = Some(ConfigWatcherInner {
        _debouncer: debouncer,
        _watched_paths: watch_paths,
    });

    Ok(())
}

#[tauri::command]
pub fn stop_config_watch(app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<ConfigWatcherState>();
    let mut guard = state
        .inner
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    if guard.is_some() {
        println!("Config watcher stopped");
    }
    *guard = None;
    Ok(())
}
