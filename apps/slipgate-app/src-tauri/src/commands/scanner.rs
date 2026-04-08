use std::path::PathBuf;
use serde::Serialize;
use super::ezquake::{self, ConfigChain, ConfigFile, ChainEntrySource, ExecReference};
use super::archive;

/// Where a config source originated.
#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SourceOrigin {
    LocalInstall { exe_path: String, gamedir: String },
    DroppedFiles { filenames: Vec<String> },
    Archive { path: String, format: String },
}

/// A config file found during scanning that is NOT part of the primary chain.
#[derive(Serialize, Clone, Debug)]
pub struct ConfigEntry {
    pub filename: String,
    pub relative_path: String,
    pub size: u64,
    pub location: ConfigLocation,
}

#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ConfigLocation {
    Loose,
    InsidePak { pak_name: String },
}

/// A complete config source: origin, resolved chain, and inventory of other configs.
#[derive(Serialize, Clone, Debug)]
pub struct ConfigSourceBundle {
    pub origin: SourceOrigin,
    pub primary_chain: Option<ConfigChain>,
    pub available_configs: Vec<ConfigEntry>,
    pub detected_client: Option<String>,
    pub label: String,
}

/// Scan a local ezQuake/FTE installation and return a ConfigSourceBundle.
pub fn scan_local_install_internal(exe_path: &str, config_name: &str) -> Result<ConfigSourceBundle, String> {
    let path = PathBuf::from(exe_path);
    let cfg_dir = ezquake::config_dir_from_exe(&path);
    let game_dir = cfg_dir.parent().unwrap_or(&cfg_dir).to_path_buf();

    // Get the primary chain using existing logic
    let chain = ezquake::read_config_chain_internal(&path, config_name)?;

    // Collect paths already in the chain (to avoid duplicates)
    let chain_paths: std::collections::HashSet<String> = chain.files.iter()
        .map(|f| f.relative_path.clone())
        .collect();

    // Build available_configs from chain's other_cfgs (loose files already found)
    let mut available: Vec<ConfigEntry> = chain.other_cfgs.iter()
        .map(|oc| ConfigEntry {
            filename: oc.name.clone(),
            relative_path: oc.relative_path.clone(),
            size: oc.size_bytes,
            location: ConfigLocation::Loose,
        })
        .collect();

    // Also scan pak/pk3 files in game_dir for .cfg files
    if let Ok(entries) = std::fs::read_dir(&game_dir) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if !entry_path.is_file() { continue; }
            if archive::detect_format(&entry_path).is_none() { continue; }

            let pak_name = entry_path.file_name()
                .unwrap_or_default().to_string_lossy().to_string();

            if let Ok((_, archive_entries)) = archive::scan_archive(&entry_path) {
                for ae in &archive_entries {
                    if ae.name.to_lowercase().ends_with(".cfg") {
                        let rel = ae.name.clone();
                        if !chain_paths.contains(&rel) {
                            available.push(ConfigEntry {
                                filename: std::path::Path::new(&ae.name)
                                    .file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                                    .to_string(),
                                relative_path: rel,
                                size: ae.size,
                                location: ConfigLocation::InsidePak {
                                    pak_name: pak_name.clone(),
                                },
                            });
                        }
                    }
                }
            }
        }
    }

    available.sort_by(|a, b| a.filename.cmp(&b.filename));
    // Deduplicate by relative_path
    available.dedup_by(|a, b| a.relative_path == b.relative_path);

    let label = format!("ezQuake › {}", config_name);

    Ok(ConfigSourceBundle {
        origin: SourceOrigin::LocalInstall {
            exe_path: exe_path.to_string(),
            gamedir: game_dir.to_string_lossy().to_string(),
        },
        primary_chain: Some(chain),
        available_configs: available,
        detected_client: Some("ezquake".to_string()),
        label,
    })
}

#[tauri::command]
pub fn scan_local_install(exe_path: String, config_name: String) -> Result<ConfigSourceBundle, String> {
    scan_local_install_internal(&exe_path, &config_name)
}

/// Detected gamedir info from an archive or directory scan.
#[derive(Debug, Clone)]
pub struct GamedirInfo {
    /// Path prefix for the gamedir (e.g. "qw/", "" for root-level)
    pub prefix: String,
    /// Which client was detected (if identifiable)
    pub client: Option<String>,
}

/// Detect gamedir structure from a list of file paths.
/// Looks for directories containing config.cfg or autoexec.cfg.
/// Priority: qw/ > id1/ > ezquake/ > root level ("") > any dir with config.cfg > any dir with autoexec.cfg
pub fn detect_gamedir(paths: &[&str]) -> Option<GamedirInfo> {
    // Normalize all paths: replace backslashes with forward slashes
    let normalized: Vec<String> = paths
        .iter()
        .map(|p| p.replace('\\', "/"))
        .collect();

    // Detect client from executable names
    let client = detect_client(&normalized);

    // Collect directories that contain config.cfg or autoexec.cfg
    let mut config_dirs: Vec<String> = Vec::new();
    let mut autoexec_dirs: Vec<String> = Vec::new();

    for path in &normalized {
        let filename = path.rsplit('/').next().unwrap_or(path);
        let filename_lower = filename.to_lowercase();
        let parent = get_parent_prefix(path);

        if filename_lower == "config.cfg" {
            if !config_dirs.contains(&parent) {
                config_dirs.push(parent);
            }
        } else if filename_lower == "autoexec.cfg" {
            if !autoexec_dirs.contains(&parent) {
                autoexec_dirs.push(parent);
            }
        }
    }

    if config_dirs.is_empty() && autoexec_dirs.is_empty() {
        return None;
    }

    // Priority order for known gamedirs (by prefix)
    let priority_prefixes = ["qw/", "id1/", "ezquake/"];

    // Check config_dirs first, then autoexec_dirs, in priority order
    for candidate_dirs in [&config_dirs, &autoexec_dirs] {
        // Check priority prefixes
        for &priority in &priority_prefixes {
            for dir in candidate_dirs.iter() {
                // dir is either "" (root) or "something/" — check if it starts with the priority prefix
                if dir == priority || dir.starts_with(priority) {
                    return Some(GamedirInfo {
                        prefix: dir.clone(),
                        client,
                    });
                }
            }
        }

        // Check root level (empty prefix)
        for dir in candidate_dirs.iter() {
            if dir.is_empty() {
                return Some(GamedirInfo {
                    prefix: String::new(),
                    client,
                });
            }
        }

        // Fall through to any dir in this category
        if let Some(dir) = candidate_dirs.first() {
            return Some(GamedirInfo {
                prefix: dir.clone(),
                client,
            });
        }
    }

    None
}

/// Extract the parent directory prefix from a normalized (forward-slash) path.
/// Returns "" for root-level files, "dir/" for files one level deep, etc.
fn get_parent_prefix(path: &str) -> String {
    match path.rfind('/') {
        Some(idx) => format!("{}/", &path[..idx]),
        None => String::new(),
    }
}

/// Detect client from executable file names in the path list.
fn detect_client(normalized_paths: &[String]) -> Option<String> {
    for path in normalized_paths {
        let filename = path.rsplit('/').next().unwrap_or(path);
        let lower = filename.to_lowercase();
        if lower.starts_with("ezquake") && lower.ends_with(".exe") {
            return Some("ezquake".to_string());
        }
        if lower.starts_with("fteqw") && lower.ends_with(".exe") {
            return Some("fte".to_string());
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Dropped file scanning
// ---------------------------------------------------------------------------

/// Classification of paths provided via a drag-and-drop operation.
struct DroppedClassification {
    cfg_files: Vec<PathBuf>,
    archives: Vec<PathBuf>,
}

/// Classify a slice of path strings into .cfg files and supported archives.
/// Anything else (textures, maps, readmes, etc.) is silently ignored.
fn classify_dropped_paths(paths: &[&str]) -> DroppedClassification {
    let mut cfg_files = Vec::new();
    let mut archives = Vec::new();

    for &p in paths {
        let path = PathBuf::from(p);
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        match ext.as_str() {
            "cfg" => cfg_files.push(path),
            "pak" | "pk3" | "zip" => archives.push(path),
            _ => {} // ignore
        }
    }

    DroppedClassification { cfg_files, archives }
}

/// Internal implementation of scan_dropped_input.
/// Exposed separately so it can be tested without the Tauri command wrapper.
pub fn scan_dropped_input_internal(paths: &[String]) -> Result<ConfigSourceBundle, String> {
    let path_strs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    let classified = classify_dropped_paths(&path_strs);

    // Collect all configs as (name, content, location) tuples.
    // "name" is the bare filename (e.g. "config.cfg").
    // "content" is the UTF-8 text content.
    // ConfigLocation tells the UI where it came from.
    let mut all_configs: Vec<(String, String, ConfigLocation)> = Vec::new();

    // Read directly-dropped .cfg files from the filesystem.
    for cfg_path in &classified.cfg_files {
        let name = cfg_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let bytes = std::fs::read(cfg_path)
            .map_err(|e| format!("Failed to read {}: {}", cfg_path.display(), e))?;
        let content = String::from_utf8_lossy(&bytes).to_string();

        all_configs.push((name, content, ConfigLocation::Loose));
    }

    // Extract .cfg files from each archive. Errors are non-fatal — log and skip.
    for archive_path in &classified.archives {
        let pak_name = archive_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        match archive::extract_all_configs(archive_path) {
            Ok(pairs) => {
                for (entry_path, content) in pairs {
                    // Use the bare filename as the name for lookup / display.
                    let name = std::path::Path::new(&entry_path)
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    all_configs.push((
                        name,
                        content,
                        ConfigLocation::InsidePak { pak_name: pak_name.clone() },
                    ));
                }
            }
            Err(e) => {
                eprintln!("scan_dropped_input: skipping archive {}: {}", archive_path.display(), e);
            }
        }
    }

    if all_configs.is_empty() {
        return Err("No config files found in dropped items".to_string());
    }

    // -----------------------------------------------------------------------
    // Chain resolution
    // -----------------------------------------------------------------------
    // Find the primary config. Prefer "config.cfg". If not present, prefer the
    // file with the most exec refs that match other dropped filenames.
    // -----------------------------------------------------------------------

    // Build a lookup: lowercase filename → index into all_configs.
    let name_index: std::collections::HashMap<String, usize> = all_configs
        .iter()
        .enumerate()
        .map(|(i, (name, _, _))| (name.to_lowercase(), i))
        .collect();

    // Find primary index.
    let primary_idx = if let Some(&idx) = name_index.get("config.cfg") {
        idx
    } else {
        // Pick the file with the most exec refs pointing to other dropped files.
        let mut best_idx = 0;
        let mut best_score = 0usize;

        for (i, (_, content, _)) in all_configs.iter().enumerate() {
            let parsed = ezquake::parse_config(content);
            let score = parsed.exec_refs.iter().filter(|r| {
                let ref_filename = std::path::Path::new(r.as_str())
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_lowercase();
                name_index.contains_key(&ref_filename) && {
                    // Don't count self-references.
                    let self_name = all_configs[i].0.to_lowercase();
                    ref_filename != self_name
                }
            }).count();

            if score > best_score {
                best_score = score;
                best_idx = i;
            }
        }

        best_idx
    };

    // Parse the primary config.
    let (primary_name, primary_content, _primary_location) = &all_configs[primary_idx];
    let primary_parsed = ezquake::parse_config(primary_content);
    let primary_line_count = primary_content.lines().count() as u32;

    // Build the primary ConfigFile.
    let primary_file = ConfigFile {
        name: primary_name.clone(),
        relative_path: primary_name.clone(),
        source: ChainEntrySource::Primary,
        referenced_by: None,
        cvars: primary_parsed.cvars,
        binds: primary_parsed.bindings,
        aliases: primary_parsed.aliases,
        exec_refs: primary_parsed.exec_refs.clone(),
        line_count: primary_line_count,
    };

    // Resolve exec refs from the primary that point to other dropped files.
    // One level deep only — no recursion.
    let mut chain_files: Vec<ConfigFile> = vec![primary_file];
    let mut chained_indices: std::collections::HashSet<usize> = std::collections::HashSet::new();
    chained_indices.insert(primary_idx);

    for exec_ref in &primary_parsed.exec_refs {
        // Match on the bare filename of the exec ref.
        let ref_filename = std::path::Path::new(exec_ref.as_str())
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();

        if let Some(&ref_idx) = name_index.get(&ref_filename) {
            if chained_indices.contains(&ref_idx) {
                continue; // already in chain (avoid duplicates)
            }
            chained_indices.insert(ref_idx);

            let (ref_name, ref_content, _) = &all_configs[ref_idx];
            let ref_parsed = ezquake::parse_config(ref_content);
            let ref_line_count = ref_content.lines().count() as u32;

            chain_files.push(ConfigFile {
                name: ref_name.clone(),
                relative_path: ref_name.clone(),
                source: ChainEntrySource::Exec,
                referenced_by: Some(ExecReference {
                    file: primary_name.clone(),
                    context: "exec".to_string(),
                }),
                cvars: ref_parsed.cvars,
                binds: ref_parsed.bindings,
                aliases: ref_parsed.aliases,
                exec_refs: ref_parsed.exec_refs,
                line_count: ref_line_count,
            });
        }
    }

    // Everything not in the chain goes to available_configs.
    let mut available_configs: Vec<ConfigEntry> = Vec::new();
    for (i, (name, content, location)) in all_configs.iter().enumerate() {
        if chained_indices.contains(&i) {
            continue;
        }
        let size = content.len() as u64;
        available_configs.push(ConfigEntry {
            filename: name.clone(),
            relative_path: name.clone(),
            size,
            location: location.clone(),
        });
    }

    // -----------------------------------------------------------------------
    // Label
    // -----------------------------------------------------------------------
    let label = if classified.archives.len() == 1 && classified.cfg_files.is_empty() {
        let archive_name = classified.archives[0]
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        format!("Dropped: {}", archive_name)
    } else {
        format!("Dropped: {} file{}", paths.len(), if paths.len() == 1 { "" } else { "s" })
    };

    // -----------------------------------------------------------------------
    // Origin
    // -----------------------------------------------------------------------
    let filenames: Vec<String> = paths.iter().map(|p| {
        PathBuf::from(p)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
    }).collect();

    let chain = ConfigChain {
        files: chain_files,
        unresolved: Vec::new(),
        other_cfgs: Vec::new(),
    };

    Ok(ConfigSourceBundle {
        origin: SourceOrigin::DroppedFiles { filenames },
        primary_chain: Some(chain),
        available_configs,
        detected_client: None,
        label,
    })
}

#[tauri::command]
pub fn scan_dropped_input(paths: Vec<String>) -> Result<ConfigSourceBundle, String> {
    scan_dropped_input_internal(&paths)
}

/// Load a specific config file and return it as a minimal ConfigChain (single file).
/// Used when user clicks an item in the "Other Configs" list.
///
/// source_type: "local_install" or "archive" or "inside_pak"
/// config_path: for local_install = relative path from gamedir; for archive = entry name in archive
/// context_path: for local_install = exe_path; for archive = archive file path
#[tauri::command]
pub fn load_config_from_source(source_type: String, config_path: String, context_path: String) -> Result<ConfigChain, String> {
    let content = match source_type.as_str() {
        "local_install" => {
            let exe_path = PathBuf::from(&context_path);
            let cfg_dir = ezquake::config_dir_from_exe(&exe_path);
            let game_dir = cfg_dir.parent().unwrap_or(&cfg_dir).to_path_buf();
            let full_path = game_dir.join(&config_path);
            std::fs::read(&full_path)
                .map_err(|e| format!("Failed to read {}: {}", full_path.display(), e))?
        }
        "archive" | "inside_pak" => {
            archive::extract_file(std::path::Path::new(&context_path), &config_path)
                .map_err(|e| format!("Failed to extract {} from {}: {}", config_path, context_path, e))?
        }
        _ => return Err(format!("Unknown source type: {}", source_type)),
    };

    let text = String::from_utf8_lossy(&content).to_string();
    let parsed = ezquake::parse_config(&text);
    let line_count = text.lines().count() as u32;
    let filename = std::path::Path::new(&config_path).file_name()
        .unwrap_or_default().to_string_lossy().to_string();

    let file = ConfigFile {
        name: filename,
        relative_path: config_path,
        source: ChainEntrySource::Primary,
        referenced_by: None,
        cvars: parsed.cvars,
        binds: parsed.bindings,
        aliases: parsed.aliases,
        exec_refs: parsed.exec_refs,
        line_count,
    };

    Ok(ConfigChain {
        files: vec![file],
        unresolved: Vec::new(),
        other_cfgs: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_gamedir_qw_dir() {
        let paths = &[
            "qw/config.cfg",
            "qw/pak0.pak",
            "id1/pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.prefix, "qw/");
    }

    #[test]
    fn test_detect_gamedir_id1_fallback() {
        let paths = &[
            "id1/config.cfg",
            "id1/pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.prefix, "id1/");
    }

    #[test]
    fn test_detect_gamedir_root_level() {
        let paths = &[
            "config.cfg",
            "autoexec.cfg",
            "pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.prefix, "");
    }

    #[test]
    fn test_detect_gamedir_nested_configs_dir() {
        let paths = &[
            "ezquake/configs/config.cfg",
            "ezquake/pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        // Direct parent of config.cfg is "ezquake/configs/"
        assert_eq!(result.prefix, "ezquake/configs/");
    }

    #[test]
    fn test_detect_gamedir_no_configs() {
        let paths = &[
            "id1/pak0.pak",
            "qw/pak0.pak",
            "somefile.txt",
        ];
        let result = detect_gamedir(paths);
        assert!(result.is_none());
    }

    #[test]
    fn test_detect_gamedir_prefers_qw_over_id1() {
        let paths = &[
            "id1/config.cfg",
            "qw/config.cfg",
            "id1/pak0.pak",
            "qw/pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.prefix, "qw/");
    }

    #[test]
    fn test_detect_ezquake_client() {
        let paths = &[
            "ezquake.exe",
            "qw/config.cfg",
            "id1/pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.client, Some("ezquake".to_string()));
    }

    #[test]
    fn test_detect_fte_client() {
        let paths = &[
            "fteqw64.exe",
            "qw/autoexec.cfg",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.client, Some("fte".to_string()));
    }

    #[test]
    fn test_detect_gamedir_backslash_paths() {
        let paths = &[
            r"qw\config.cfg",
            r"id1\pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.prefix, "qw/");
    }

    #[test]
    fn test_detect_gamedir_case_insensitive_filename() {
        let paths = &[
            "qw/Config.CFG",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir even with mixed case");
        assert_eq!(result.prefix, "qw/");
    }

    #[test]
    fn test_detect_gamedir_autoexec_only() {
        let paths = &[
            "qw/autoexec.cfg",
            "id1/pak0.pak",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir from autoexec");
        assert_eq!(result.prefix, "qw/");
    }

    #[test]
    fn test_detect_gamedir_no_client() {
        let paths = &[
            "qw/config.cfg",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.client, None);
    }

    #[test]
    fn test_detect_gamedir_ezquake_dir_priority_over_unknown() {
        let paths = &[
            "ezquake/config.cfg",
            "somedir/config.cfg",
        ];
        let result = detect_gamedir(paths).expect("should detect gamedir");
        assert_eq!(result.prefix, "ezquake/");
    }
}
