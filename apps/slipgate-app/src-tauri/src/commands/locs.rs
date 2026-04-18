use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

// ezQuake / QW .loc format is plain text, one entry per line:
//   <x> <y> <z> <name...>
// The first three tokens are integer world coordinates; the rest of the
// line is a free-form location name (may contain spaces). Files live under
// `<exe_dir>/<gamedir>/locs/<mapname>.loc` where gamedir is typically
// `qw` or `ezquake`. We scan both candidate gamedirs and union the result
// keyed by map name (file stem).

#[derive(Serialize, Clone, Debug)]
pub struct LocEntry {
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[derive(Serialize, Clone, Debug)]
pub struct LocScanResult {
    pub maps: HashMap<String, Vec<LocEntry>>,
    pub source_dirs: Vec<String>,
}

fn parse_loc_file(contents: &str) -> Vec<LocEntry> {
    let mut out = Vec::new();
    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("//") {
            continue;
        }
        let mut parts = trimmed.splitn(4, char::is_whitespace);
        let Some(x_s) = parts.next() else { continue };
        let Some(y_s) = parts.next() else { continue };
        let Some(z_s) = parts.next() else { continue };
        let Some(name) = parts.next() else { continue };
        let (Ok(x), Ok(y), Ok(z)) = (x_s.parse::<i32>(), y_s.parse::<i32>(), z_s.parse::<i32>())
        else {
            continue;
        };
        out.push(LocEntry {
            name: name.trim().to_string(),
            x,
            y,
            z,
        });
    }
    out
}

fn scan_dir(dir: &Path) -> HashMap<String, Vec<LocEntry>> {
    let mut maps = HashMap::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return maps;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.extension().and_then(|e| e.to_str()) != Some("loc") {
            continue;
        }
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let Ok(contents) = std::fs::read_to_string(&path) else {
            continue;
        };
        let locs = parse_loc_file(&contents);
        if !locs.is_empty() {
            maps.insert(stem.to_lowercase(), locs);
        }
    }
    maps
}

#[tauri::command]
pub fn scan_loc_files(exe_path: String) -> Result<LocScanResult, String> {
    let path = PathBuf::from(&exe_path);
    let exe_dir = path.parent().ok_or_else(|| "invalid exe path".to_string())?;

    let candidates = ["qw", "ezquake"];
    let mut maps: HashMap<String, Vec<LocEntry>> = HashMap::new();
    let mut source_dirs = Vec::new();

    for gamedir in candidates {
        let locs_dir = exe_dir.join(gamedir).join("locs");
        if !locs_dir.is_dir() {
            continue;
        }
        source_dirs.push(locs_dir.to_string_lossy().to_string());
        let scanned = scan_dir(&locs_dir);
        // Merge — first gamedir wins per map name; later candidates only
        // fill in maps not already present. qw/ is the engine default
        // location so it takes precedence.
        for (k, v) in scanned {
            maps.entry(k).or_insert(v);
        }
    }

    Ok(LocScanResult { maps, source_dirs })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_lines() {
        let raw = "10 20 30 Pent\n-100 -200 50 RA room\n";
        let out = parse_loc_file(raw);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].name, "Pent");
        assert_eq!(out[0].x, 10);
        assert_eq!(out[1].name, "RA room");
        assert_eq!(out[1].x, -100);
    }

    #[test]
    fn skips_blank_and_comments() {
        let raw = "\n// comment\n1 2 3 Spot\n";
        let out = parse_loc_file(raw);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].name, "Spot");
    }

    #[test]
    fn skips_malformed() {
        let raw = "not a loc line\n1 2 3 Good\n10 20 bad_z Bad\n";
        let out = parse_loc_file(raw);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].name, "Good");
    }
}
