# Config Source Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add archive reading (PAK/ZIP/PK3), drag-and-drop config comparison, and a dual-source config viewer to the Slipgate app.

**Architecture:** Bottom-up -- build the Rust scanning layer first (archive readers, gamedir detection, ConfigSource assembly), then refactor the frontend to consume two sources. The existing `read_config_chain` stays as an internal function; new `scan_local_install` wraps it with an inventory of all available configs.

**Tech Stack:** Rust (Tauri v2 commands), `zip` crate (already in deps), SolidJS + TypeScript frontend.

**Spec:** `docs/superpowers/specs/2026-04-08-config-source-scanner-design.md`

---

## File Structure

### New files
- `apps/slipgate-app/src-tauri/src/commands/archive.rs` -- PAK/ZIP/PK3 index reading and .cfg extraction
- `apps/slipgate-app/src-tauri/src/commands/scanner.rs` -- ConfigSource types, gamedir detection, scan_local_install, scan_dropped_input, load_config_from_source

### Modified files
- `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` -- rename `ConfigSource` -> `ChainEntrySource`, make `parse_config` and chain-walking functions `pub(crate)`
- `apps/slipgate-app/src-tauri/src/commands/mod.rs` -- add `archive` and `scanner` modules
- `apps/slipgate-app/src-tauri/src/lib.rs` -- register new Tauri commands
- `apps/slipgate-app/src/types.ts` -- rename `ConfigSource` -> `ChainEntrySource`, add `ConfigSourceBundle`, `ConfigEntry`, `SourceOrigin` types
- `apps/slipgate-app/src/components/ConfigViewer.tsx` -- dual-source refactor (sourceA/sourceB signals, drop zone, right panel)
- `apps/slipgate-app/src/components/ConfigChainPanel.tsx` -- add "Other Configs" section
- `apps/slipgate-app/src/components/MyQuakeTab.tsx` -- handle drop events, pass source signals
- `apps/slipgate-app/src/App.tsx` -- update config data flow to use ConfigSourceBundle

---

## Task 1: Rename existing ConfigSource -> ChainEntrySource

The existing `ConfigSource` enum describes how a file entered the chain (Primary, Exec, AutoExec, etc.). We need to free that name for the new top-level `ConfigSource` struct.

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs`
- Modify: `apps/slipgate-app/src/types.ts`
- Modify: `apps/slipgate-app/src/components/ConfigChainPanel.tsx`

- [ ] **Step 1: Rename the Rust enum**

In `ezquake.rs`, rename `ConfigSource` to `ChainEntrySource` everywhere:

```rust
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ChainEntrySource {
    Primary,
    Exec,
    AutoExec,
    ClOnload,
    BoundExec,
    AliasExec,
}
```

Update all usages in `ezquake.rs`: `ConfigSource::Primary` -> `ChainEntrySource::Primary`, etc. The `ConfigFile` struct's `source` field type changes from `ConfigSource` to `ChainEntrySource`. The `walk_exec_refs` parameter type changes similarly.

- [ ] **Step 2: Rename the TypeScript type**

In `types.ts`:

```typescript
export type ChainEntrySource =
  | "primary"
  | "exec"
  | "auto_exec"
  | "cl_onload"
  | "bound_exec"
  | "alias_exec";

export interface ConfigFile {
  name: string;
  relative_path: string;
  source: ChainEntrySource;  // was ConfigSource
  // ... rest unchanged
}
```

In `ConfigChainPanel.tsx`, update the parameter types in `sourceLabel` and `sourceColor` -- these already use `string`, so no code change needed there, just verify the import if `ConfigSource` was explicitly imported.

- [ ] **Step 3: Make chain-walking internals pub(crate)**

In `ezquake.rs`, change visibility of functions needed by the scanner module:

```rust
pub(crate) fn parse_config(content: &str) -> ParsedConfig { ... }
pub(crate) fn extract_exec_refs(command: &str) -> Vec<String> { ... }
pub(crate) fn is_dynamic_ref(exec_ref: &str) -> bool { ... }
pub(crate) fn walk_exec_refs(...) { ... }
pub(crate) fn config_dir_from_exe(exe_path: &Path) -> PathBuf { ... }
```

Also make `ParsedConfig` and its fields `pub(crate)`:

```rust
pub(crate) struct ParsedConfig {
    pub(crate) cvars: HashMap<String, String>,
    pub(crate) bindings: Vec<(String, String)>,
    pub(crate) aliases: HashMap<String, String>,
    pub(crate) exec_refs: Vec<String>,
}
```

- [ ] **Step 4: Verify it compiles**

Run from Windows terminal (the build environment):
```bash
cd C:\Users\Administrator\projects\slipgate-app
bun run tauri build -- --no-bundle 2>&1 | head -20
```

Or just check Rust compilation:
```bash
cargo check -p slipgate-app
```

Expected: compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/ezquake.rs apps/slipgate-app/src/types.ts apps/slipgate-app/src/components/ConfigChainPanel.tsx
git commit -m "refactor: rename ConfigSource -> ChainEntrySource to free name for scanner"
```

---

## Task 2: PAK file reader

Implement reading the Quake PAK archive format. PAK is a simple binary format:
- 12-byte header: `"PACK"` magic (4 bytes) + file table offset (u32 LE) + file table size (u32 LE)
- File table: entries of 64 bytes each: filename (56 bytes, null-padded) + data offset (u32 LE) + data size (u32 LE)

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/archive.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Write PAK reader tests**

Create `archive.rs` with test module first:

```rust
use std::io::{self, Read, Seek, SeekFrom, Cursor};

/// An entry in a PAK or ZIP/PK3 archive.
#[derive(Debug, Clone)]
pub struct ArchiveEntry {
    pub name: String,
    pub size: u64,
}

/// Read the file index from a PAK archive. Returns all entries (not just .cfg).
pub fn read_pak_index<R: Read + Seek>(reader: &mut R) -> io::Result<Vec<ArchiveEntry>> {
    todo!()
}

/// Extract the content of a specific file from a PAK archive by name.
pub fn read_pak_file<R: Read + Seek>(reader: &mut R, filename: &str) -> io::Result<Vec<u8>> {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a minimal PAK file in memory for testing.
    fn make_test_pak(files: &[(&str, &[u8])]) -> Vec<u8> {
        let mut data_section = Vec::new();
        let mut entries: Vec<(String, u32, u32)> = Vec::new(); // (name, offset, size)

        let header_size = 12u32;
        let mut current_offset = header_size;

        for (name, content) in files {
            entries.push((name.to_string(), current_offset, content.len() as u32));
            data_section.extend_from_slice(content);
            current_offset += content.len() as u32;
        }

        let table_offset = current_offset;
        let table_size = (entries.len() * 64) as u32;

        let mut buf = Vec::new();
        // Header
        buf.extend_from_slice(b"PACK");
        buf.extend_from_slice(&table_offset.to_le_bytes());
        buf.extend_from_slice(&table_size.to_le_bytes());
        // Data section
        buf.extend_from_slice(&data_section);
        // File table
        for (name, offset, size) in &entries {
            let mut name_bytes = [0u8; 56];
            let name_raw = name.as_bytes();
            let len = name_raw.len().min(55);
            name_bytes[..len].copy_from_slice(&name_raw[..len]);
            buf.extend_from_slice(&name_bytes);
            buf.extend_from_slice(&offset.to_le_bytes());
            buf.extend_from_slice(&size.to_le_bytes());
        }

        buf
    }

    #[test]
    fn test_read_pak_index() {
        let pak = make_test_pak(&[
            ("config.cfg", b"sensitivity 3\n"),
            ("maps/dm2.bsp", b"fake map data"),
            ("configs/tp.cfg", b"exec teamsays.cfg\n"),
        ]);
        let mut cursor = Cursor::new(pak);
        let entries = read_pak_index(&mut cursor).unwrap();
        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].name, "config.cfg");
        assert_eq!(entries[0].size, 14);
        assert_eq!(entries[1].name, "maps/dm2.bsp");
        assert_eq!(entries[2].name, "configs/tp.cfg");
    }

    #[test]
    fn test_read_pak_file() {
        let pak = make_test_pak(&[
            ("config.cfg", b"sensitivity 3\n"),
            ("other.txt", b"hello"),
        ]);
        let mut cursor = Cursor::new(pak);
        let content = read_pak_file(&mut cursor, "config.cfg").unwrap();
        assert_eq!(content, b"sensitivity 3\n");
    }

    #[test]
    fn test_read_pak_file_not_found() {
        let pak = make_test_pak(&[("a.cfg", b"test")]);
        let mut cursor = Cursor::new(pak);
        let result = read_pak_file(&mut cursor, "nonexistent.cfg");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_pak_magic() {
        let mut bad = vec![0u8; 64];
        bad[..4].copy_from_slice(b"NOPE");
        let mut cursor = Cursor::new(bad);
        let result = read_pak_index(&mut cursor);
        assert!(result.is_err());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cargo test -p slipgate-app archive::tests -- --nocapture
```

Expected: all 4 tests fail with `todo!()` panic.

- [ ] **Step 3: Implement read_pak_index**

```rust
pub fn read_pak_index<R: Read + Seek>(reader: &mut R) -> io::Result<Vec<ArchiveEntry>> {
    // Read 12-byte header
    let mut header = [0u8; 12];
    reader.read_exact(&mut header)?;

    if &header[0..4] != b"PACK" {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "Not a PAK file"));
    }

    let table_offset = u32::from_le_bytes(header[4..8].try_into().unwrap()) as u64;
    let table_size = u32::from_le_bytes(header[8..12].try_into().unwrap()) as u64;
    let entry_count = table_size / 64;

    reader.seek(SeekFrom::Start(table_offset))?;

    let mut entries = Vec::with_capacity(entry_count as usize);
    for _ in 0..entry_count {
        let mut entry_buf = [0u8; 64];
        reader.read_exact(&mut entry_buf)?;

        let name_end = entry_buf[..56].iter().position(|&b| b == 0).unwrap_or(56);
        let name = String::from_utf8_lossy(&entry_buf[..name_end]).to_string();
        let size = u32::from_le_bytes(entry_buf[60..64].try_into().unwrap()) as u64;

        entries.push(ArchiveEntry { name, size });
    }

    Ok(entries)
}
```

- [ ] **Step 4: Implement read_pak_file**

```rust
pub fn read_pak_file<R: Read + Seek>(reader: &mut R, filename: &str) -> io::Result<Vec<u8>> {
    // Read header
    let mut header = [0u8; 12];
    reader.seek(SeekFrom::Start(0))?;
    reader.read_exact(&mut header)?;

    if &header[0..4] != b"PACK" {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "Not a PAK file"));
    }

    let table_offset = u32::from_le_bytes(header[4..8].try_into().unwrap()) as u64;
    let table_size = u32::from_le_bytes(header[8..12].try_into().unwrap()) as u64;
    let entry_count = table_size / 64;

    reader.seek(SeekFrom::Start(table_offset))?;

    for _ in 0..entry_count {
        let mut entry_buf = [0u8; 64];
        reader.read_exact(&mut entry_buf)?;

        let name_end = entry_buf[..56].iter().position(|&b| b == 0).unwrap_or(56);
        let name = String::from_utf8_lossy(&entry_buf[..name_end]).to_string();
        let offset = u32::from_le_bytes(entry_buf[56..60].try_into().unwrap()) as u64;
        let size = u32::from_le_bytes(entry_buf[60..64].try_into().unwrap()) as u64;

        if name == filename {
            reader.seek(SeekFrom::Start(offset))?;
            let mut content = vec![0u8; size as usize];
            reader.read_exact(&mut content)?;
            return Ok(content);
        }
    }

    Err(io::Error::new(io::ErrorKind::NotFound, format!("File not found in PAK: {}", filename)))
}
```

- [ ] **Step 5: Add module to mod.rs**

In `commands/mod.rs`:

```rust
pub mod system;
pub mod ezquake;
pub mod auth;
pub mod updater;
pub mod screenshot;
pub mod watcher;
pub mod archive;
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cargo test -p slipgate-app archive::tests -- --nocapture
```

Expected: all 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/archive.rs apps/slipgate-app/src-tauri/src/commands/mod.rs
git commit -m "feat: PAK archive reader with index and file extraction"
```

---

## Task 3: ZIP/PK3 config extraction

Add ZIP reading to the archive module using the existing `zip` crate. PK3 files are ZIP files with a different extension.

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/archive.rs`

- [ ] **Step 1: Write ZIP reader tests**

Add to `archive.rs` tests:

```rust
    fn make_test_zip(files: &[(&str, &[u8])]) -> Vec<u8> {
        let buf = Vec::new();
        let cursor = Cursor::new(buf);
        let mut writer = zip::ZipWriter::new(cursor);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);
        for (name, content) in files {
            writer.start_file(*name, options).unwrap();
            writer.write_all(content).unwrap();
        }
        writer.finish().unwrap().into_inner()
    }

    #[test]
    fn test_read_zip_index() {
        let zip_data = make_test_zip(&[
            ("config.cfg", b"sensitivity 3\n"),
            ("maps/dm2.bsp", b"fake map data"),
        ]);
        let mut cursor = Cursor::new(zip_data);
        let entries = read_zip_index(&mut cursor).unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].name, "config.cfg");
        assert_eq!(entries[1].name, "maps/dm2.bsp");
    }

    #[test]
    fn test_read_zip_file() {
        let zip_data = make_test_zip(&[
            ("config.cfg", b"sensitivity 3\n"),
            ("other.txt", b"hello"),
        ]);
        let mut cursor = Cursor::new(zip_data);
        let content = read_zip_file(&mut cursor, "config.cfg").unwrap();
        assert_eq!(content, b"sensitivity 3\n");
    }
```

- [ ] **Step 2: Implement read_zip_index and read_zip_file**

Add imports at top of `archive.rs`:

```rust
use zip::ZipArchive;
```

Add functions:

```rust
/// Read the file index from a ZIP/PK3 archive.
pub fn read_zip_index<R: Read + Seek>(reader: &mut R) -> io::Result<Vec<ArchiveEntry>> {
    let archive = ZipArchive::new(reader)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Invalid ZIP: {}", e)))?;

    let entries = (0..archive.len())
        .filter_map(|i| {
            let file = archive.by_index_raw(i).ok()?;
            if file.is_dir() {
                return None;
            }
            Some(ArchiveEntry {
                name: file.name().to_string(),
                size: file.size(),
            })
        })
        .collect();

    Ok(entries)
}

/// Extract the content of a specific file from a ZIP/PK3 archive by name.
pub fn read_zip_file<R: Read + Seek>(reader: &mut R, filename: &str) -> io::Result<Vec<u8>> {
    let mut archive = ZipArchive::new(reader)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Invalid ZIP: {}", e)))?;

    let mut file = archive.by_name(filename)
        .map_err(|e| io::Error::new(io::ErrorKind::NotFound, format!("{}: {}", filename, e)))?;

    let mut content = Vec::with_capacity(file.size() as usize);
    file.read_to_end(&mut content)?;
    Ok(content)
}
```

- [ ] **Step 3: Add unified scan_archive function**

This is the public API -- detects format from extension, delegates to PAK or ZIP reader:

```rust
use std::path::Path;

/// Detected archive format.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ArchiveFormat {
    Pak,
    Zip, // covers .zip and .pk3
}

/// Detect archive format from file extension. Returns None for unsupported types.
pub fn detect_format(path: &Path) -> Option<ArchiveFormat> {
    match path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).as_deref() {
        Some("pak") => Some(ArchiveFormat::Pak),
        Some("zip") | Some("pk3") => Some(ArchiveFormat::Zip),
        _ => None,
    }
}

/// Scan an archive file and return all entries.
pub fn scan_archive(path: &Path) -> io::Result<(ArchiveFormat, Vec<ArchiveEntry>)> {
    let format = detect_format(path)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Unsupported archive format"))?;

    let mut file = std::fs::File::open(path)?;
    let entries = match format {
        ArchiveFormat::Pak => read_pak_index(&mut file)?,
        ArchiveFormat::Zip => read_zip_index(&mut file)?,
    };

    Ok((format, entries))
}

/// Extract a specific file from an archive.
pub fn extract_file(path: &Path, filename: &str) -> io::Result<Vec<u8>> {
    let format = detect_format(path)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Unsupported archive format"))?;

    let mut file = std::fs::File::open(path)?;
    match format {
        ArchiveFormat::Pak => read_pak_file(&mut file, filename),
        ArchiveFormat::Zip => read_zip_file(&mut file, filename),
    }
}

/// Extract all .cfg files from an archive. Returns (filename, content_string) pairs.
pub fn extract_all_configs(path: &Path) -> io::Result<Vec<(String, String)>> {
    let (format, entries) = scan_archive(path)?;
    let cfg_entries: Vec<&ArchiveEntry> = entries.iter()
        .filter(|e| e.name.to_lowercase().ends_with(".cfg"))
        .collect();

    let mut file = std::fs::File::open(path)?;
    let mut results = Vec::new();

    for entry in cfg_entries {
        let content = match format {
            ArchiveFormat::Pak => read_pak_file(&mut file, &entry.name)?,
            ArchiveFormat::Zip => {
                // Re-open for each read since ZipArchive takes ownership of the reader
                let mut f = std::fs::File::open(path)?;
                read_zip_file(&mut f, &entry.name)?
            }
        };
        let text = String::from_utf8_lossy(&content).to_string();
        results.push((entry.name.clone(), text));
    }

    Ok(results)
}
```

- [ ] **Step 4: Add format detection test**

```rust
    #[test]
    fn test_detect_format() {
        assert_eq!(detect_format(Path::new("foo.pak")), Some(ArchiveFormat::Pak));
        assert_eq!(detect_format(Path::new("foo.zip")), Some(ArchiveFormat::Zip));
        assert_eq!(detect_format(Path::new("foo.pk3")), Some(ArchiveFormat::Zip));
        assert_eq!(detect_format(Path::new("foo.PK3")), Some(ArchiveFormat::Zip));
        assert_eq!(detect_format(Path::new("foo.cfg")), None);
        assert_eq!(detect_format(Path::new("foo.txt")), None);
    }
```

- [ ] **Step 5: Run all archive tests**

```bash
cargo test -p slipgate-app archive -- --nocapture
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/archive.rs
git commit -m "feat: ZIP/PK3 reader and unified archive scanning API"
```

---

## Task 4: Gamedir detection

Given a list of file paths (from an archive or directory scan), detect whether they represent a QuakeWorld game directory and identify the active gamedir.

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/scanner.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Write gamedir detection tests**

Create `scanner.rs`:

```rust
use std::path::Path;

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
/// Prefers qw/ > id1/ > any dir with config.cfg > root level.
pub fn detect_gamedir(paths: &[&str]) -> Option<GamedirInfo> {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_gamedir_qw_dir() {
        let paths = vec!["qw/config.cfg", "qw/pak0.pak", "id1/pak0.pak"];
        let result = detect_gamedir(&paths).unwrap();
        assert_eq!(result.prefix, "qw/");
    }

    #[test]
    fn test_detect_gamedir_id1_fallback() {
        let paths = vec!["id1/config.cfg", "id1/pak0.pak"];
        let result = detect_gamedir(&paths).unwrap();
        assert_eq!(result.prefix, "id1/");
    }

    #[test]
    fn test_detect_gamedir_root_level() {
        let paths = vec!["config.cfg", "autoexec.cfg", "teamsays.cfg"];
        let result = detect_gamedir(&paths).unwrap();
        assert_eq!(result.prefix, "");
    }

    #[test]
    fn test_detect_gamedir_nested_configs_dir() {
        let paths = vec!["ezquake/configs/config.cfg", "ezquake/autoexec.cfg"];
        let result = detect_gamedir(&paths).unwrap();
        assert_eq!(result.prefix, "ezquake/");
    }

    #[test]
    fn test_detect_gamedir_no_configs() {
        let paths = vec!["maps/dm2.bsp", "textures/wall.tga"];
        let result = detect_gamedir(&paths);
        assert!(result.is_none());
    }

    #[test]
    fn test_detect_gamedir_prefers_qw_over_id1() {
        let paths = vec!["qw/config.cfg", "id1/config.cfg"];
        let result = detect_gamedir(&paths).unwrap();
        assert_eq!(result.prefix, "qw/");
    }

    #[test]
    fn test_detect_ezquake_client() {
        let paths = vec!["ezquake.exe", "qw/config.cfg"];
        let result = detect_gamedir(&paths).unwrap();
        assert_eq!(result.client.as_deref(), Some("ezquake"));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cargo test -p slipgate-app scanner::tests -- --nocapture
```

- [ ] **Step 3: Implement detect_gamedir**

```rust
pub fn detect_gamedir(paths: &[&str]) -> Option<GamedirInfo> {
    // Collect all directories that contain a config.cfg or autoexec.cfg
    let mut dirs_with_configs: std::collections::HashMap<String, bool> = std::collections::HashMap::new();

    // Detect client executable
    let mut detected_client: Option<String> = None;

    for path in paths {
        let lower = path.to_lowercase();

        // Check for client executables
        if lower.contains("ezquake") && (lower.ends_with(".exe") || !lower.contains('.')) {
            detected_client = Some("ezquake".to_string());
        } else if lower.contains("fteqw") && (lower.ends_with(".exe") || !lower.contains('.')) {
            detected_client = Some("fte".to_string());
        }

        let filename = Path::new(path).file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("")
            .to_lowercase();

        if filename == "config.cfg" || filename == "autoexec.cfg" {
            let dir = if let Some(parent) = Path::new(path).parent() {
                let p = parent.to_string_lossy().replace('\\', "/");
                if p.is_empty() || p == "." {
                    String::new()
                } else {
                    format!("{}/", p)
                }
            } else {
                String::new()
            };
            dirs_with_configs.entry(dir).or_insert(filename == "config.cfg");
        }
    }

    if dirs_with_configs.is_empty() {
        return None;
    }

    // Priority: qw/ > id1/ > ezquake/ > any dir with config.cfg > first found
    let preferred = ["qw/", "id1/", "ezquake/"];
    for pref in &preferred {
        if dirs_with_configs.contains_key(*pref) {
            return Some(GamedirInfo {
                prefix: pref.to_string(),
                client: detected_client,
            });
        }
    }

    // Root level
    if dirs_with_configs.contains_key("") {
        return Some(GamedirInfo {
            prefix: String::new(),
            client: detected_client,
        });
    }

    // Any directory that has config.cfg (not just autoexec.cfg)
    if let Some(dir) = dirs_with_configs.iter()
        .filter(|(_, has_config_cfg)| **has_config_cfg)
        .map(|(dir, _)| dir.clone())
        .next()
    {
        return Some(GamedirInfo {
            prefix: dir,
            client: detected_client,
        });
    }

    // Fallback: any directory with autoexec.cfg
    let dir = dirs_with_configs.keys().next()?.clone();
    Some(GamedirInfo {
        prefix: dir,
        client: detected_client,
    })
}
```

- [ ] **Step 4: Add scanner module to mod.rs**

```rust
pub mod scanner;
```

- [ ] **Step 5: Run tests**

```bash
cargo test -p slipgate-app scanner::tests -- --nocapture
```

Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/scanner.rs apps/slipgate-app/src-tauri/src/commands/mod.rs
git commit -m "feat: gamedir detection heuristic for archives and directories"
```

---

## Task 5: ConfigSource types and scan_local_install

Define the new `ConfigSource` struct and implement `scan_local_install` which wraps the existing `read_config_chain` with an inventory of all available configs (loose + inside paks).

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/scanner.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` (make `read_config_chain` also `pub(crate)` as a function, not just a Tauri command)

- [ ] **Step 1: Define ConfigSource types**

Add to `scanner.rs`:

```rust
use serde::Serialize;
use std::path::PathBuf;
use super::ezquake::{ConfigChain, OtherConfig};
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
```

- [ ] **Step 2: Extract read_config_chain_internal from ezquake.rs**

In `ezquake.rs`, make the core logic callable as a `pub(crate)` function separate from the Tauri command:

```rust
/// Internal function: discover config chain. Called by both the Tauri command and scanner.
pub(crate) fn read_config_chain_internal(exe_path: &Path, config_name: &str) -> Result<ConfigChain, String> {
    // ... (move the body of read_config_chain here, using exe_path: &Path instead of String)
}

#[tauri::command]
pub fn read_config_chain(exe_path: String, config_name: String) -> Result<ConfigChain, String> {
    read_config_chain_internal(&PathBuf::from(&exe_path), &config_name)
}
```

- [ ] **Step 3: Implement scan_local_install**

Add to `scanner.rs`:

```rust
use super::ezquake;

/// Scan a local ezQuake/FTE installation and return a ConfigSourceBundle.
/// Wraps read_config_chain and adds inventory of all .cfg files (loose + inside paks).
pub fn scan_local_install_internal(exe_path: &str, config_name: &str) -> Result<ConfigSourceBundle, String> {
    let path = PathBuf::from(exe_path);
    let cfg_dir = ezquake::config_dir_from_exe(&path);
    let game_dir = cfg_dir.parent().unwrap_or(&cfg_dir).to_path_buf();

    // Get the primary chain
    let chain = ezquake::read_config_chain_internal(&path, config_name)?;

    // Collect paths already in the chain
    let chain_paths: std::collections::HashSet<String> = chain.files.iter()
        .map(|f| f.relative_path.clone())
        .collect();

    // Build available_configs from chain's other_cfgs + scanning paks
    let mut available: Vec<ConfigEntry> = chain.other_cfgs.iter()
        .map(|oc| ConfigEntry {
            filename: oc.name.clone(),
            relative_path: oc.relative_path.clone(),
            size: oc.size_bytes,
            location: ConfigLocation::Loose,
        })
        .collect();

    // Scan pak/pk3 files in game_dir for .cfg files
    let scan_dirs = [game_dir.clone()];
    for dir in &scan_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if !entry_path.is_file() {
                    continue;
                }
                if archive::detect_format(&entry_path).is_none() {
                    continue;
                }
                let pak_name = entry_path.file_name()
                    .unwrap_or_default().to_string_lossy().to_string();

                if let Ok((_, archive_entries)) = archive::scan_archive(&entry_path) {
                    for ae in &archive_entries {
                        if ae.name.to_lowercase().ends_with(".cfg") {
                            let rel = ae.name.clone();
                            if !chain_paths.contains(&rel) {
                                available.push(ConfigEntry {
                                    filename: Path::new(&ae.name)
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
    }

    available.sort_by(|a, b| a.filename.cmp(&b.filename));
    // Deduplicate by relative_path (loose files take priority over pak files)
    available.dedup_by(|a, b| a.relative_path == b.relative_path);

    let label = format!("ezQuake > {}", config_name);

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
```

- [ ] **Step 4: Verify it compiles**

```bash
cargo check -p slipgate-app
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/scanner.rs apps/slipgate-app/src-tauri/src/commands/ezquake.rs
git commit -m "feat: ConfigSourceBundle type and scan_local_install command"
```

---

## Task 6: scan_dropped_input

Handle dropped files: classify input (cfg vs archive vs mixed), scan archives, attempt chain resolution between dropped .cfg files.

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/scanner.rs`

- [ ] **Step 1: Write classification tests**

```rust
    #[test]
    fn test_classify_single_cfg() {
        let result = classify_dropped_paths(&["C:/tmp/config.cfg"]);
        assert_eq!(result.cfg_files.len(), 1);
        assert!(result.archives.is_empty());
    }

    #[test]
    fn test_classify_mixed() {
        let result = classify_dropped_paths(&["config.cfg", "stuff.zip", "tp.pak"]);
        assert_eq!(result.cfg_files.len(), 1);
        assert_eq!(result.archives.len(), 2);
    }

    #[test]
    fn test_classify_ignores_unknown() {
        let result = classify_dropped_paths(&["readme.txt", "map.bsp", "config.cfg"]);
        assert_eq!(result.cfg_files.len(), 1);
        assert!(result.archives.is_empty());
    }
```

- [ ] **Step 2: Implement classify_dropped_paths**

```rust
struct DroppedClassification {
    cfg_files: Vec<PathBuf>,
    archives: Vec<PathBuf>,
}

fn classify_dropped_paths(paths: &[&str]) -> DroppedClassification {
    let mut cfg_files = Vec::new();
    let mut archives = Vec::new();

    for path_str in paths {
        let path = PathBuf::from(path_str);
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        match ext.as_deref() {
            Some("cfg") => cfg_files.push(path),
            Some("pak") | Some("pk3") | Some("zip") => archives.push(path),
            _ => {} // silently ignore
        }
    }

    DroppedClassification { cfg_files, archives }
}
```

- [ ] **Step 3: Implement scan_dropped_input**

```rust
/// Scan dropped files and return a ConfigSourceBundle.
/// Handles single/multiple .cfg files, archives, and mixed drops.
pub fn scan_dropped_input_internal(paths: &[String]) -> Result<ConfigSourceBundle, String> {
    let path_strs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    let classified = classify_dropped_paths(&path_strs);

    let mut all_configs: Vec<(String, String, ConfigLocation)> = Vec::new(); // (relative_path, content, location)

    // Read .cfg files directly
    for cfg_path in &classified.cfg_files {
        let content = std::fs::read(cfg_path)
            .map_err(|e| format!("Failed to read {}: {}", cfg_path.display(), e))?;
        let text = String::from_utf8_lossy(&content).to_string();
        let filename = cfg_path.file_name()
            .unwrap_or_default().to_string_lossy().to_string();
        all_configs.push((filename, text, ConfigLocation::Loose));
    }

    // Extract .cfg files from archives
    for archive_path in &classified.archives {
        match archive::extract_all_configs(archive_path) {
            Ok(configs) => {
                let pak_name = archive_path.file_name()
                    .unwrap_or_default().to_string_lossy().to_string();
                for (name, content) in configs {
                    all_configs.push((
                        name,
                        content,
                        ConfigLocation::InsidePak { pak_name: pak_name.clone() },
                    ));
                }
            }
            Err(e) => {
                eprintln!("Warning: couldn't read {}: {}", archive_path.display(), e);
                // Don't fail the whole operation -- skip this archive
            }
        }
    }

    if all_configs.is_empty() {
        return Err("No config files found in dropped items".to_string());
    }

    // Parse all configs and attempt chain resolution
    let mut chain_files: Vec<super::ezquake::ConfigFile> = Vec::new();
    let mut available_names: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (name, _, _) in &all_configs {
        available_names.insert(name.to_lowercase());
    }

    // Find primary config (config.cfg, or the one with exec refs to other dropped files)
    let mut primary_idx: Option<usize> = None;
    let mut max_refs = 0;

    for (i, (name, content, _)) in all_configs.iter().enumerate() {
        let parsed = super::ezquake::parse_config(content);
        // Check how many exec refs resolve to other dropped files
        let resolved_refs: usize = parsed.exec_refs.iter()
            .filter(|r| {
                let lower = Path::new(r).file_name()
                    .unwrap_or_default().to_str().unwrap_or("").to_lowercase();
                available_names.contains(&lower)
            })
            .count();

        if name.to_lowercase() == "config.cfg" && primary_idx.is_none() {
            primary_idx = Some(i);
            max_refs = resolved_refs;
        } else if resolved_refs > max_refs {
            primary_idx = Some(i);
            max_refs = resolved_refs;
        }
    }

    // Build chain: primary + its resolved exec refs
    let mut chain_indices: std::collections::HashSet<usize> = std::collections::HashSet::new();

    if let Some(pi) = primary_idx {
        let (name, content, _) = &all_configs[pi];
        let parsed = super::ezquake::parse_config(content);
        let line_count = content.lines().count() as u32;

        chain_files.push(super::ezquake::ConfigFile {
            name: name.clone(),
            relative_path: name.clone(),
            source: super::ezquake::ChainEntrySource::Primary,
            referenced_by: None,
            cvars: parsed.cvars,
            binds: parsed.bindings,
            aliases: parsed.aliases,
            exec_refs: parsed.exec_refs.clone(),
            line_count,
        });
        chain_indices.insert(pi);

        // Walk exec refs within the dropped set
        for exec_ref in &parsed.exec_refs {
            let ref_lower = Path::new(exec_ref).file_name()
                .unwrap_or_default().to_str().unwrap_or("").to_lowercase();

            for (j, (jname, jcontent, _)) in all_configs.iter().enumerate() {
                if chain_indices.contains(&j) {
                    continue;
                }
                if jname.to_lowercase() == ref_lower {
                    let jparsed = super::ezquake::parse_config(jcontent);
                    let jlc = jcontent.lines().count() as u32;
                    chain_files.push(super::ezquake::ConfigFile {
                        name: jname.clone(),
                        relative_path: jname.clone(),
                        source: super::ezquake::ChainEntrySource::Exec,
                        referenced_by: Some(super::ezquake::ExecReference {
                            file: name.clone(),
                            context: "exec".to_string(),
                        }),
                        cvars: jparsed.cvars,
                        binds: jparsed.bindings,
                        aliases: jparsed.aliases,
                        exec_refs: jparsed.exec_refs,
                        line_count: jlc,
                    });
                    chain_indices.insert(j);
                    break;
                }
            }
        }
    }

    // Everything not in the chain goes to available_configs
    let available: Vec<ConfigEntry> = all_configs.iter().enumerate()
        .filter(|(i, _)| !chain_indices.contains(i))
        .map(|(_, (name, content, loc))| ConfigEntry {
            filename: name.clone(),
            relative_path: name.clone(),
            size: content.len() as u64,
            location: loc.clone(),
        })
        .collect();

    // Build label
    let label = if classified.archives.len() == 1 && classified.cfg_files.is_empty() {
        let name = classified.archives[0].file_name()
            .unwrap_or_default().to_string_lossy().to_string();
        format!("Dropped: {}", name)
    } else {
        let total = classified.cfg_files.len() + classified.archives.len();
        format!("Dropped: {} file{}", total, if total == 1 { "" } else { "s" })
    };

    // Build origin
    let filenames: Vec<String> = paths.iter()
        .filter_map(|p| Path::new(p).file_name().map(|f| f.to_string_lossy().to_string()))
        .collect();

    let chain = if chain_files.is_empty() {
        None
    } else {
        Some(ConfigChain {
            files: chain_files,
            unresolved: Vec::new(),
            other_cfgs: Vec::new(),
        })
    };

    Ok(ConfigSourceBundle {
        origin: SourceOrigin::DroppedFiles { filenames },
        primary_chain: chain,
        available_configs: available,
        detected_client: None,
        label,
    })
}

#[tauri::command]
pub fn scan_dropped_input(paths: Vec<String>) -> Result<ConfigSourceBundle, String> {
    scan_dropped_input_internal(&paths)
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cargo check -p slipgate-app
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/scanner.rs
git commit -m "feat: scan_dropped_input -- classify and scan dropped files/archives"
```

---

## Task 7: load_config_from_source + register Tauri commands

Implement the on-demand config loader (when user clicks an item in "Other Configs") and register all new commands.

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/scanner.rs`
- Modify: `apps/slipgate-app/src-tauri/src/lib.rs`

- [ ] **Step 1: Implement load_config_from_source**

Add to `scanner.rs`:

```rust
/// Load a specific config file and return it as a minimal ConfigChain (single file).
/// Used when user clicks an item in the "Other Configs" list.
#[tauri::command]
pub fn load_config_from_source(source_type: String, config_path: String, context_path: String) -> Result<ConfigChain, String> {
    let content = match source_type.as_str() {
        "local_install" => {
            // context_path is the exe_path, config_path is relative to gamedir
            let exe_path = PathBuf::from(&context_path);
            let cfg_dir = ezquake::config_dir_from_exe(&exe_path);
            let game_dir = cfg_dir.parent().unwrap_or(&cfg_dir).to_path_buf();

            let full_path = game_dir.join(&config_path);
            std::fs::read(&full_path)
                .map_err(|e| format!("Failed to read {}: {}", full_path.display(), e))?
        }
        "archive" | "inside_pak" => {
            // context_path is the archive path, config_path is the entry name
            archive::extract_file(Path::new(&context_path), &config_path)
                .map_err(|e| format!("Failed to extract {} from {}: {}", config_path, context_path, e))?
        }
        _ => return Err(format!("Unknown source type: {}", source_type)),
    };

    let text = String::from_utf8_lossy(&content).to_string();
    let parsed = ezquake::parse_config(&text);
    let line_count = text.lines().count() as u32;
    let filename = Path::new(&config_path).file_name()
        .unwrap_or_default().to_string_lossy().to_string();

    let file = ezquake::ConfigFile {
        name: filename,
        relative_path: config_path,
        source: ezquake::ChainEntrySource::Primary,
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
```

- [ ] **Step 2: Register all new commands in lib.rs**

In `lib.rs`, add to the `invoke_handler`:

```rust
.invoke_handler(tauri::generate_handler![
    greet,
    commands::system::get_all_specs,
    commands::ezquake::validate_ezquake_path,
    commands::ezquake::read_ezquake_config,
    commands::ezquake::read_config_chain,
    commands::ezquake::launch_ezquake,
    commands::auth::await_oauth_callback,
    commands::updater::check_for_update,
    commands::updater::download_and_install_update,
    commands::updater::check_client_running,
    commands::updater::get_release_changelog,
    commands::screenshot::capture_screenshot,
    commands::watcher::start_config_watch,
    commands::watcher::stop_config_watch,
    // New scanner commands
    commands::scanner::scan_local_install,
    commands::scanner::scan_dropped_input,
    commands::scanner::load_config_from_source,
])
```

- [ ] **Step 3: Verify full build compiles**

```bash
cargo check -p slipgate-app
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/scanner.rs apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat: load_config_from_source + register all scanner Tauri commands"
```

---

## Task 8: Frontend types

Add TypeScript types matching the new Rust structs. Rename existing `ConfigSource` type.

**Files:**
- Modify: `apps/slipgate-app/src/types.ts`

- [ ] **Step 1: Update types.ts**

Rename existing type (already done in Task 1) and add new types:

```typescript
// ── Config source scanner types ─────────────────────────────────────────

export type SourceOriginType = "local_install" | "dropped_files" | "archive";

export interface SourceOrigin {
  type: SourceOriginType;
  exe_path?: string;
  gamedir?: string;
  filenames?: string[];
  path?: string;
  format?: string;
}

export interface ConfigEntry {
  filename: string;
  relative_path: string;
  size: number;
  location: { type: "loose" } | { type: "inside_pak"; pak_name: string };
}

export interface ConfigSourceBundle {
  origin: SourceOrigin;
  primary_chain: ConfigChain | null;
  available_configs: ConfigEntry[];
  detected_client: string | null;
  label: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/slipgate-app && bun run build 2>&1 | tail -5
```

Or just check types:
```bash
bunx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/types.ts
git commit -m "feat: TypeScript types for ConfigSourceBundle, ConfigEntry, SourceOrigin"
```

---

## Task 9: Drag-and-drop handler

Wire up Tauri v2 drag-and-drop events on the config viewer. Dropped files trigger `scan_dropped_input` and populate the right side.

**Files:**
- Modify: `apps/slipgate-app/src/components/MyQuakeTab.tsx`

- [ ] **Step 1: Add drag-drop event listener**

Update `MyQuakeTab.tsx` to listen for Tauri drag-drop events and pass the result down:

```typescript
import { createSignal, Switch, Match, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EzQuakeConfig, ConfigChain, ConfigSourceBundle } from "../types";
import ConfigViewer from "./ConfigViewer";

interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  configChain: ConfigChain | null;
  exePath: string | null;
  configName: string | null;
}

type SubTab = "config" | "visuals" | "matches";

export default function MyQuakeTab(props: MyQuakeTabProps) {
  const [subTab, setSubTab] = createSignal<SubTab>("config");
  const [compareSource, setCompareSource] = createSignal<ConfigSourceBundle | null>(null);
  const [isDragOver, setIsDragOver] = createSignal(false);
  const [dropError, setDropError] = createSignal<string | null>(null);

  // Listen for Tauri drag-drop events
  let unlisten: (() => void) | null = null;
  (async () => {
    const appWindow = getCurrentWindow();
    unlisten = await appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave" || event.payload.type === "cancel") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        handleDrop(event.payload.paths);
      }
    });
  })();
  onCleanup(() => unlisten?.());

  async function handleDrop(paths: string[]) {
    // Filter to supported extensions
    const supported = paths.filter((p) => {
      const ext = p.split(".").pop()?.toLowerCase();
      return ext === "cfg" || ext === "zip" || ext === "pak" || ext === "pk3";
    });

    if (supported.length === 0) {
      setDropError("No .cfg, .zip, .pak, or .pk3 files found");
      setTimeout(() => setDropError(null), 3000);
      return;
    }

    try {
      const source = await invoke<ConfigSourceBundle>("scan_dropped_input", { paths: supported });
      setCompareSource(source);
      setDropError(null);
    } catch (e) {
      setDropError(String(e));
      setTimeout(() => setDropError(null), 5000);
    }
  }

  function clearCompare() {
    setCompareSource(null);
  }

  // ... rest of component renders ConfigViewer with new props
```

- [ ] **Step 2: Pass compareSource to ConfigViewer**

Update the ConfigViewer invocation in the template:

```tsx
<ConfigViewer
  config={props.config}
  configChain={props.configChain}
  exePath={props.exePath}
  configName={props.configName}
  compareSource={compareSource()}
  onClearCompare={clearCompare}
  isDragOver={isDragOver()}
  dropError={dropError()}
/>
```

- [ ] **Step 3: Verify it compiles**

```bash
cd apps/slipgate-app && bunx tsc --noEmit
```

Will show errors because ConfigViewer doesn't accept these props yet -- that's expected, fixed in Task 10.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/MyQuakeTab.tsx
git commit -m "feat: drag-and-drop handler for config files and archives"
```

---

## Task 10: ConfigViewer dual-source refactor

The biggest frontend change. Refactor ConfigViewer to accept a compare source as a `ConfigSourceBundle` instead of pasted text. When present, show two value columns with shared filtering.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`
- Modify: `apps/slipgate-app/src/components/configMerger.ts`

- [ ] **Step 1: Update ConfigViewer props**

Replace the paste-text compare with a source-based compare:

```typescript
interface ConfigViewerProps {
  config: EzQuakeConfig | null;
  configChain: ConfigChain | null;
  exePath: string | null;
  configName: string | null;
  compareSource?: ConfigSourceBundle | null;
  onClearCompare?: () => void;
  isDragOver?: boolean;
  dropError?: string | null;
}
```

- [ ] **Step 2: Replace compare signals**

Remove `compareText`, `compareActive`, `showPasteUI` signals. Replace with signals derived from the `compareSource` prop:

```typescript
// Remove these:
// const [compareText, setCompareText] = ...
// const [compareActive, setCompareActive] = ...
// const [showPasteUI, setShowPasteUI] = ...

// Replace with:
const compareChainData = createMemo(() => {
  const source = props.compareSource;
  if (!source?.primary_chain) return null;
  const allIndices = new Set(source.primary_chain.files.map((_, i) => i));
  return mergeSelectedFiles(source.primary_chain, allIndices);
});

const compareCvars = createMemo((): Map<string, string> => {
  const data = compareChainData();
  if (!data) return new Map();
  return new Map(Object.entries(data.cvars));
});

const isCompareMode = () => compareCvars().size > 0;
```

- [ ] **Step 3: Update the top bar**

Replace the paste-text "Compare" button with the new compare header:

```tsx
{/* Top bar -- left source */}
<div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 flex-wrap">
  <button
    class="flex items-center gap-1.5 text-sm font-semibold text-[var(--sg-text-bright)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
    onClick={() => setConfigExpanded((v) => !v)}
  >
    <span class="text-xs">{configExpanded() ? "▼" : "▶"}</span>
    <span class="badge badge-primary text-xs px-1.5 h-5">ezQuake</span>
    <span class="text-[var(--sg-text-dim)]">›</span>
    <span class="font-mono">{props.configName ?? "config.cfg"}</span>
  </button>

  <div class="flex-1" />

  <Show when={isCompareMode()}>
    <div class="flex items-center gap-2 text-sm text-[var(--sg-text-dim)]">
      <span class="font-mono text-xs">{props.compareSource?.label}</span>
      <button class="btn btn-ghost btn-xs" onClick={props.onClearCompare}>
        ✕
      </button>
    </div>
  </Show>

  <button class="btn btn-primary btn-xs" onClick={() => setViewMode("convert")}>
    Convert to FTE
  </button>
</div>
```

- [ ] **Step 4: Add drop zone overlay**

Add a visual overlay when dragging files over the viewer:

```tsx
{/* Drop zone overlay */}
<Show when={props.isDragOver}>
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 border-2 border-dashed border-[var(--color-primary)] rounded">
    <div class="text-center">
      <p class="text-lg text-[var(--color-primary)] font-semibold">Drop to compare</p>
      <p class="text-xs text-[var(--sg-text-dim)]">.cfg, .zip, .pak, .pk3</p>
    </div>
  </div>
</Show>

{/* Drop error toast */}
<Show when={props.dropError}>
  <div class="absolute top-2 right-2 z-50 bg-error/90 text-error-content text-xs px-3 py-1.5 rounded">
    {props.dropError}
  </div>
</Show>
```

Place these inside the root `<div>` that has `class="flex flex-col h-full overflow-hidden"` -- add `relative` to its classes for absolute positioning to work.

- [ ] **Step 5: Update the content area for dual columns**

The existing cvar rows show a single VALUE column. When in compare mode, show two columns. This change is in `ConfigSettingsSection.tsx` -- update `CvarRow` to accept and display a compare value. The existing compare mode already does this, so verify it still works with the new data source.

The key change: instead of `compareCvars` coming from parsed pasted text, it now comes from `compareChainData()`. The data shape is the same (`Map<string, string>`), so the existing rendering logic should work without changes.

- [ ] **Step 6: Test manually**

Run `bun run tauri dev` on Windows. Verify:
1. Single-source mode looks identical to before
2. Drag a .cfg file onto the viewer -> right side appears with compare values
3. Close compare (✕ button) -> returns to single view
4. Drop zone overlay appears when dragging files

- [ ] **Step 7: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat: dual-source ConfigViewer with drag-and-drop compare"
```

---

## Task 11: ConfigChainPanel -- Other Configs section

Add the "Other Configs" inventory list below the chain files in the expanded panel.

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigChainPanel.tsx`

- [ ] **Step 1: Add Other Configs section**

Update the component to show available configs from the `ConfigSourceBundle`:

```tsx
import { For, Show, createSignal } from "solid-js";
import type { ConfigChain, ConfigEntry } from "../types";

interface ConfigChainPanelProps {
  configChain: ConfigChain;
  selectedFiles: Set<number>;
  onToggleFile: (index: number) => void;
  availableConfigs?: ConfigEntry[];
  onLoadConfig?: (entry: ConfigEntry) => void;
}
```

Add after the unresolved section in the template:

```tsx
{/* Other available configs */}
<Show when={props.availableConfigs && props.availableConfigs.length > 0}>
  {(() => {
    const [expanded, setExpanded] = createSignal(false);
    const configs = () => props.availableConfigs!;
    const visible = () => expanded() ? configs() : configs().slice(0, 3);
    const hasMore = () => configs().length > 3;

    return (
      <div class="mt-2 pt-2 border-t border-[var(--sg-stat-border)]">
        <span class="text-[var(--sg-section-label)] text-[10px] uppercase tracking-wide">
          Other configs ({configs().length})
        </span>
        <div class="mt-1 font-mono">
          <For each={visible()}>
            {(entry) => (
              <div
                class="flex items-center gap-2 py-0.5 cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                onClick={() => props.onLoadConfig?.(entry)}
              >
                <span class="text-[var(--sg-text-dim)]">{entry.filename}</span>
                <Show when={entry.location.type === "inside_pak"}>
                  <span class="text-[10px] text-[var(--sg-section-label)]">
                    ({(entry.location as { type: "inside_pak"; pak_name: string }).pak_name})
                  </span>
                </Show>
              </div>
            )}
          </For>
          <Show when={hasMore()}>
            <button
              class="text-[10px] text-[var(--sg-section-label)] hover:text-[var(--sg-text-dim)] cursor-pointer mt-1"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded() ? "Show less" : `▸ ${configs().length - 3} more...`}
            </button>
          </Show>
        </div>
      </div>
    );
  })()}
</Show>
```

- [ ] **Step 2: Wire up in ConfigViewer**

Pass `availableConfigs` from the source's `available_configs` to ConfigChainPanel. For now, `onLoadConfig` can log the entry -- full implementation (loading into a panel) comes later.

```tsx
<ConfigChainPanel
  configChain={props.configChain!}
  selectedFiles={selectedFiles()}
  onToggleFile={toggleFile}
  availableConfigs={/* from scan_local_install result */}
  onLoadConfig={(entry) => console.log("Load config:", entry)}
/>
```

Note: this requires `ConfigViewer` to receive the `ConfigSourceBundle` from `scan_local_install` (not just the raw `ConfigChain`). This wiring will be completed when App.tsx is updated to use `scan_local_install` instead of `read_config_chain`.

- [ ] **Step 3: Test manually**

Run `bun run tauri dev`. Expand the chain panel. If `scan_local_install` is wired up (or mock data is present), the Other Configs section should appear showing configs not in the chain.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigChainPanel.tsx apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat: Other Configs inventory section in chain panel"
```

---

## Task 12: App.tsx -- wire up scan_local_install

Replace the separate `read_config_chain` calls in App.tsx with `scan_local_install` to get the full ConfigSourceBundle (chain + inventory).

**Files:**
- Modify: `apps/slipgate-app/src/App.tsx`
- Modify: `apps/slipgate-app/src/components/MyQuakeTab.tsx`

- [ ] **Step 1: Update App.tsx state**

Replace `configChain` signal with `configSource`:

```typescript
import type { AllSpecs, MonitorInfo, EzQuakeConfig, EzQuakeInstallation, ConfigSourceBundle } from "./types";

// Replace:
// const [configChain, setConfigChain] = createSignal<ConfigChain | null>(null);
// With:
const [configSource, setConfigSource] = createSignal<ConfigSourceBundle | null>(null);
```

- [ ] **Step 2: Update autoLoadConfig and handleConfigLoaded**

Replace `read_config_chain` calls with `scan_local_install`:

```typescript
// In autoLoadConfig:
const source = await invoke<ConfigSourceBundle>("scan_local_install", { exePath, configName: cfgName });
setConfigSource(source);

// In handleConfigLoaded:
const source = await invoke<ConfigSourceBundle>("scan_local_install", { exePath, configName });
setConfigSource(source);
```

- [ ] **Step 3: Update config-changed listener**

```typescript
// In the config-changed listener:
const source = await invoke<ConfigSourceBundle>("scan_local_install", {
  exePath: exe_path,
  configName: config_name,
});
setConfigSource(source);
```

- [ ] **Step 4: Update MyQuakeTab props**

Pass `configSource` instead of separate `configChain`:

```tsx
<MyQuakeTab
  config={ezConfig()}
  configSource={configSource()}
  exePath={profile() ? getPrimarySetup(profile()!).client.exe_path ?? null : null}
  configName={profile() ? getPrimarySetup(profile()!).client.config_name ?? null : null}
/>
```

Update `MyQuakeTab` to extract `configChain` from `configSource`:

```typescript
interface MyQuakeTabProps {
  config: EzQuakeConfig | null;
  configSource: ConfigSourceBundle | null;
  exePath: string | null;
  configName: string | null;
}

// In the template:
<ConfigViewer
  config={props.config}
  configChain={props.configSource?.primary_chain ?? null}
  exePath={props.exePath}
  configName={props.configName}
  compareSource={compareSource()}
  onClearCompare={clearCompare}
  isDragOver={isDragOver()}
  dropError={dropError()}
  availableConfigs={props.configSource?.available_configs}
/>
```

- [ ] **Step 5: Test manually**

Run `bun run tauri dev`. Verify:
1. App loads and displays config as before
2. Chain panel shows the chain files
3. "Other Configs" section appears in expanded chain panel
4. File watcher still works (edit config.cfg externally, viewer updates)
5. Drag-drop works end-to-end

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/App.tsx apps/slipgate-app/src/components/MyQuakeTab.tsx apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat: wire up scan_local_install for full ConfigSourceBundle flow"
```

---

## Task 13: Re-drop behavior

When files are dropped while the right side already has content, show an inline prompt to add or replace.

**Files:**
- Modify: `apps/slipgate-app/src/components/MyQuakeTab.tsx`

- [ ] **Step 1: Add re-drop state**

```typescript
const [pendingDrop, setPendingDrop] = createSignal<string[] | null>(null);
```

- [ ] **Step 2: Update handleDrop logic**

```typescript
async function handleDrop(paths: string[]) {
  const supported = paths.filter((p) => {
    const ext = p.split(".").pop()?.toLowerCase();
    return ext === "cfg" || ext === "zip" || ext === "pak" || ext === "pk3";
  });

  if (supported.length === 0) {
    setDropError("No .cfg, .zip, .pak, or .pk3 files found");
    setTimeout(() => setDropError(null), 3000);
    return;
  }

  // If right side already has content, ask user
  if (compareSource()) {
    setPendingDrop(supported);
    return;
  }

  await loadDroppedFiles(supported);
}

async function loadDroppedFiles(paths: string[]) {
  try {
    const source = await invoke<ConfigSourceBundle>("scan_dropped_input", { paths });
    setCompareSource(source);
    setDropError(null);
    setPendingDrop(null);
  } catch (e) {
    setDropError(String(e));
    setTimeout(() => setDropError(null), 5000);
  }
}

function handleReplace() {
  const paths = pendingDrop();
  if (paths) loadDroppedFiles(paths);
}

function handleAdd() {
  const paths = pendingDrop();
  const existing = compareSource();
  if (paths && existing) {
    // Merge: re-scan with both old and new paths
    // For simplicity in PoC, just replace
    loadDroppedFiles(paths);
  }
  setPendingDrop(null);
}

function dismissPendingDrop() {
  setPendingDrop(null);
}
```

- [ ] **Step 3: Pass pending state to ConfigViewer**

Add a prompt bar in ConfigViewer (or MyQuakeTab) that shows when `pendingDrop` is set:

```tsx
<Show when={pendingDrop()}>
  <div class="flex items-center gap-2 px-4 py-2 bg-[color-mix(in_oklch,var(--color-primary)_15%,transparent)] border-b border-[var(--color-primary)] text-sm">
    <span class="text-[var(--sg-text-bright)]">
      {pendingDrop()!.length} file{pendingDrop()!.length > 1 ? "s" : ""} dropped.
    </span>
    <button class="btn btn-primary btn-xs" onClick={handleReplace}>Replace</button>
    <button class="btn btn-ghost btn-xs" onClick={dismissPendingDrop}>Cancel</button>
  </div>
</Show>
```

- [ ] **Step 4: Test manually**

1. Drop a .cfg -> right side appears
2. Drop another .cfg -> prompt appears: "Replace" / "Cancel"
3. Click "Replace" -> right side updates
4. Click "Cancel" -> prompt dismisses, right side unchanged

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/MyQuakeTab.tsx
git commit -m "feat: re-drop behavior with replace/cancel prompt"
```

---

## Review Checkpoint

After Task 13, the PoC should be functional:

- [x] PAK/ZIP/PK3 archive reading (Rust)
- [x] Gamedir detection heuristic (Rust)
- [x] ConfigSourceBundle with chain + inventory (Rust)
- [x] scan_local_install / scan_dropped_input / load_config_from_source commands
- [x] Frontend types matching Rust structs
- [x] Drag-and-drop with Tauri events
- [x] Dual-source viewer with shared filtering
- [x] "Other Configs" inventory in chain panel
- [x] Re-drop replace/cancel prompt

**Manual test checklist:**
1. App opens, loads config as before -- no regression
2. Expand chain panel -> "Other Configs" section shows available configs
3. Drag single .cfg onto viewer -> compare mode activates
4. Drag .zip with configs -> scans archive, loads compare source
5. Drag .pak file -> reads PAK format, extracts configs
6. Drop multiple .cfg files -> chain resolution attempted between them
7. Close compare (✕) -> returns to single view
8. Re-drop while compare active -> replace prompt appears
9. File watcher still works after refactor

**Known limitations for PoC (future work):**
- Left-side source swap not implemented (clicks in "Other Configs" log only)
- Nested archives (zip containing pak) not handled
- FTE client support deferred
- "Add to current" in re-drop is replace-only for now
- Gamedir detection in archives not wired to chain resolution within the archive
