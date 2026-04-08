use std::collections::HashMap;

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
        let lower = path.to_lowercase();
        let filename = path.rsplit('/').next().unwrap_or(path);
        let filename_lower = filename.to_lowercase();
        let parent = get_parent_prefix(path);

        if filename_lower == "config.cfg" {
            if !config_dirs.contains(&parent) {
                config_dirs.push(parent);
            }
        } else if filename_lower == "autoexec.cfg" {
            let _ = lower; // used above via filename_lower
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

/// Collect unique parent prefixes from a list of normalized paths that match a filename predicate.
#[allow(dead_code)]
fn collect_dirs_by_filename<F>(normalized_paths: &[String], predicate: F) -> Vec<String>
where
    F: Fn(&str) -> bool,
{
    let mut dirs: Vec<String> = Vec::new();
    for path in normalized_paths {
        let filename = path.rsplit('/').next().unwrap_or(path);
        if predicate(filename) {
            let parent = get_parent_prefix(path);
            if !dirs.contains(&parent) {
                dirs.push(parent);
            }
        }
    }
    dirs
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
