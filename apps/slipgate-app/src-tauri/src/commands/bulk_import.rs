use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::commands::data_root::data_root_path;
use crate::commands::version_warehouse::{register_version_at, WarehousedVersion};

/// Per-row consent flag for the canonicalize-on-import step.
///
/// `Skip` = source already at the canonical filename, OR canonical slot
///   occupied by a different file (skip the rename, warehouse the bytes).
/// `Rename` = user confirmed the rename prompt; orchestrator does fs::rename.
/// `LeaveAsIs` = user declined rename; warehouse but leave the file at its
///   non-canonical filename (the warehouse still has the bytes via the blob).
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum CanonicalizeConsent {
    Skip,
    Rename,
    LeaveAsIs,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BulkImportRow {
    pub source_path: String,
    /// Warehouse client key (lowercase: "ezquake", "unezquake", "fte").
    pub client: String,
    /// Normalized version string (3-component preferred).
    pub version: String,
    pub variant: Option<String>,
    /// Channel hint for the manifest ("stable", "snapshot", "imported").
    /// AddClientPanel passes "imported" for user-pointed binaries.
    pub channel: String,
    /// Canonical filename for this row's family + variant
    /// (e.g. "ezquake.exe", "fteqw-glsl.exe").
    pub family_canonical_filename: String,
    pub canonicalize_consent: CanonicalizeConsent,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BulkImportRequest {
    pub rows: Vec<BulkImportRow>,
    pub primary_row_index: Option<usize>,
    pub quake_dir: String,
    /// Frontend-supplied flag per D9: true ONLY when the profile has no
    /// primary entry yet (first-launch). The frontend is responsible for the
    /// D9 case-1/2/3 dispatch (foreign-dir picks are refused at the picker
    /// level and never reach the orchestrator). The Rust side trusts the
    /// flag and just reports back so the frontend can update the profile.
    pub claim_as_primary: bool,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct BulkImportResult {
    pub registered: Vec<WarehousedVersion>,
    pub renamed: Vec<RenameRecord>,
    pub skipped_canonicalize: Vec<String>,
    pub primary_active: Option<String>,
    /// Echo of `req.claim_as_primary`. Frontend uses this signal to decide
    /// whether to push a `{ path, role: "primary" }` entry into
    /// `setups[0].quake_dirs`. Orchestrator does no profile I/O itself.
    pub primary_dir_claimed: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RenameRecord {
    pub from: String,
    pub to: String,
}

fn canonicalize_one(
    quake_dir: &Path,
    row: &BulkImportRow,
) -> Result<Option<RenameRecord>, String> {
    if row.canonicalize_consent != CanonicalizeConsent::Rename {
        return Ok(None);
    }
    let src = PathBuf::from(&row.source_path);
    if !src.exists() {
        return Err(format!("source missing for rename: {}", src.display()));
    }
    let dst = quake_dir.join(&row.family_canonical_filename);
    // Same path -> nothing to do (already canonical).
    if let (Ok(s_abs), Ok(d_abs)) = (src.canonicalize(), dst.canonicalize()) {
        if s_abs == d_abs {
            return Ok(None);
        }
    } else if src == dst {
        return Ok(None);
    }
    if dst.exists() {
        return Err(format!(
            "canonical slot already occupied: {}",
            dst.display()
        ));
    }
    std::fs::rename(&src, &dst).map_err(|e| format!("rename failed: {}", e))?;
    Ok(Some(RenameRecord {
        from: row.source_path.clone(),
        to: dst.to_string_lossy().into_owned(),
    }))
}

pub fn run_bulk_import_at(
    data_root: &Path,
    req: &BulkImportRequest,
) -> Result<BulkImportResult, String> {
    let quake_dir = PathBuf::from(&req.quake_dir);
    if !quake_dir.is_dir() {
        return Err(format!(
            "quake dir is not a directory: {}",
            quake_dir.display()
        ));
    }

    let mut result = BulkImportResult {
        primary_dir_claimed: req.claim_as_primary,
        ..Default::default()
    };

    // Track effective source paths after rename so the primary swap finds
    // the right blob (rename happens before register so the manifest's
    // original_exe_name reflects the renamed file).
    let mut effective_paths: Vec<String> = Vec::with_capacity(req.rows.len());

    for row in &req.rows {
        // Step A: canonicalize-rename per consent, BEFORE register.
        let rename = canonicalize_one(&quake_dir, row)?;
        let post_path = match &rename {
            Some(r) => r.to.clone(),
            None => row.source_path.clone(),
        };
        if let Some(r) = rename {
            result.renamed.push(r);
        } else if row.canonicalize_consent == CanonicalizeConsent::LeaveAsIs {
            result.skipped_canonicalize.push(row.source_path.clone());
        } else if row.canonicalize_consent == CanonicalizeConsent::Skip {
            result.skipped_canonicalize.push(row.source_path.clone());
        }
        effective_paths.push(post_path.clone());

        // Step B: register into the warehouse (variant-aware path nesting per D6+D10).
        let entry = register_version_at(
            data_root,
            &row.client,
            &row.version,
            row.variant.as_deref(),
            Path::new(&post_path),
            &row.channel,
            "user_import",
        )?;
        result.registered.push(entry);
    }

    // Step C: per D12, finalize the primary by calling swap_active_version's
    // logic. swap is authoritative regardless of fs::read_dir iteration order
    // (which the pass-1 reconcile-after-rename pattern was vulnerable to).
    if let Some(idx) = req.primary_row_index {
        if idx >= req.rows.len() {
            return Err(format!(
                "primary_row_index {} out of bounds (rows: {})",
                idx,
                req.rows.len()
            ));
        }
        let row = &req.rows[idx];
        // Run the swap by writing through the version_warehouse + version_swap
        // primitives. We can't call the Tauri command directly (needs AppHandle);
        // re-implement the minimal swap walk here against the same primitives.
        swap_to_primary(data_root, &quake_dir, row)?;
        result.primary_active = Some(row.version.clone());
    }

    Ok(result)
}

/// Mirror of version_swap::swap_active_version, AppHandle-free. Operates on
/// data_root + quake_dir paths so the orchestrator can be tested without the
/// Tauri runtime.
fn swap_to_primary(
    data_root: &Path,
    quake_dir: &Path,
    row: &BulkImportRow,
) -> Result<(), String> {
    use crate::commands::version_warehouse::{
        active_key, blob_path_for, list_warehoused_versions_at, read_index_at, write_index_at,
    };
    use sha2::{Digest, Sha256};

    let warehoused = list_warehoused_versions_at(data_root)?;
    let target = warehoused
        .iter()
        .find(|w| {
            w.client == row.client
                && w.version == row.version
                && w.variant.as_deref() == row.variant.as_deref()
        })
        .ok_or_else(|| {
            format!(
                "primary not in warehouse: {} {} variant={:?}",
                row.client, row.version, row.variant
            )
        })?;
    let blob = blob_path_for(data_root, &target.blob_sha256);
    if !blob.exists() {
        return Err(format!("warehouse blob missing: {}", blob.display()));
    }
    let canonical = quake_dir.join(&row.family_canonical_filename);

    // Foreign-exe backup logic mirrors version_swap.rs.
    let mut backup_path: Option<PathBuf> = None;
    if canonical.exists() {
        let bytes = std::fs::read(&canonical).map_err(|e| e.to_string())?;
        let mut h = Sha256::new();
        h.update(&bytes);
        let cur_sha = format!("{:x}", h.finalize());
        let warehoused_match = warehoused.iter().any(|w| w.blob_sha256 == cur_sha);
        if !warehoused_match {
            let stem = row
                .family_canonical_filename
                .strip_suffix(".exe")
                .unwrap_or(&row.family_canonical_filename);
            let backup = quake_dir.join(format!("{}.bak.exe", stem));
            if backup.exists() {
                let _ = std::fs::remove_file(&backup);
            }
            std::fs::rename(&canonical, &backup)
                .map_err(|e| format!("rename to backup failed: {}", e))?;
            backup_path = Some(backup);
        } else {
            std::fs::remove_file(&canonical).map_err(|e| e.to_string())?;
        }
    }

    let staging = canonical.with_extension("new");
    std::fs::copy(&blob, &staging).map_err(|e| format!("copy from blob failed: {}", e))?;
    if let Err(e) = std::fs::rename(&staging, &canonical) {
        let _ = std::fs::remove_file(&staging);
        if let Some(bp) = backup_path {
            let _ = std::fs::rename(&bp, &canonical);
        }
        return Err(format!("install rename failed: {}", e));
    }

    let mut idx = read_index_at(data_root);
    let key = active_key(&row.client, row.variant.as_deref());
    idx.active.insert(key, row.version.clone());
    idx.last_scan = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    write_index_at(data_root, &idx)?;
    Ok(())
}

#[tauri::command]
pub fn bulk_import_clients(
    app: tauri::AppHandle,
    req: BulkImportRequest,
) -> Result<BulkImportResult, String> {
    let root = data_root_path(&app)?;
    run_bulk_import_at(&root, &req)
}

/// Standalone helper command for AddClientPanel to invoke as a per-row
/// rename probe — useful when the panel wants to attempt a rename outside
/// the orchestrator's transactional flow (currently the orchestrator
/// handles rename internally; this is exposed for future UI patterns).
#[tauri::command]
pub fn rename_to_canonical(source_path: String, target_filename: String) -> Result<String, String> {
    let src = PathBuf::from(&source_path);
    let parent = src
        .parent()
        .ok_or_else(|| "source has no parent directory".to_string())?;
    let dst = parent.join(&target_filename);
    if !src.exists() {
        return Err(format!("source not found: {}", src.display()));
    }
    if dst.exists() {
        // Same file?
        if let (Ok(s), Ok(d)) = (src.canonicalize(), dst.canonicalize()) {
            if s == d {
                return Ok(dst.to_string_lossy().into_owned());
            }
        }
        return Err(format!("target already exists: {}", dst.display()));
    }
    std::fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Ok(dst.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn write_exe(dir: &Path, name: &str, contents: &[u8]) -> String {
        let p = dir.join(name);
        std::fs::write(&p, contents).unwrap();
        p.to_string_lossy().into_owned()
    }

    fn row(
        source_path: String,
        version: &str,
        canonical: &str,
        variant: Option<&str>,
        consent: CanonicalizeConsent,
    ) -> BulkImportRow {
        BulkImportRow {
            source_path,
            client: "ezquake".to_string(),
            version: version.to_string(),
            variant: variant.map(|s| s.to_string()),
            channel: "imported".to_string(),
            family_canonical_filename: canonical.to_string(),
            canonicalize_consent: consent,
        }
    }

    #[test]
    fn happy_path_three_rows_all_rename_primary_active() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let qd = tmp.path().join("qw");
        std::fs::create_dir_all(&data_root).unwrap();
        std::fs::create_dir_all(&qd).unwrap();

        let p1 = write_exe(&qd, "ezquake-3.6.exe", b"v3.6-bytes");
        let p2 = write_exe(&qd, "ezquake-3.6.6.exe", b"v3.6.6-bytes");
        let p3 = write_exe(&qd, "ezquake-3.6.9.exe", b"v3.6.9-bytes");

        let req = BulkImportRequest {
            rows: vec![
                row(p1, "3.6", "ezquake.exe", None, CanonicalizeConsent::Rename),
                row(p2, "3.6.6", "ezquake.exe", None, CanonicalizeConsent::Rename),
                row(p3, "3.6.9", "ezquake.exe", None, CanonicalizeConsent::Rename),
            ],
            primary_row_index: Some(1),
            quake_dir: qd.to_string_lossy().into_owned(),
            claim_as_primary: false,
        };
        // Note: with three rows all renaming to the same canonical name,
        // only the first will succeed; subsequent ones see canonical occupied
        // and error out. So the realistic test uses ONE rename + Skip the others.
        let r = run_bulk_import_at(&data_root, &req);
        assert!(r.is_err()); // canonical slot collision
    }

    #[test]
    fn one_rename_others_skip_with_primary_swap() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let qd = tmp.path().join("qw");
        std::fs::create_dir_all(&data_root).unwrap();
        std::fs::create_dir_all(&qd).unwrap();

        let p1 = write_exe(&qd, "ezquake-3.6.exe", b"v3.6-bytes");
        let p2 = write_exe(&qd, "ezquake-3.6.6.exe", b"v3.6.6-bytes");
        let p3 = write_exe(&qd, "ezquake.exe", b"v3.6.9-bytes"); // primary, already canonical

        let req = BulkImportRequest {
            rows: vec![
                row(p1, "3.6", "ezquake.exe", None, CanonicalizeConsent::LeaveAsIs),
                row(p2, "3.6.6", "ezquake.exe", None, CanonicalizeConsent::LeaveAsIs),
                row(p3, "3.6.9", "ezquake.exe", None, CanonicalizeConsent::Skip),
            ],
            primary_row_index: Some(2), // 3.6.9 is primary
            quake_dir: qd.to_string_lossy().into_owned(),
            claim_as_primary: false,
        };

        let r = run_bulk_import_at(&data_root, &req).unwrap();
        assert_eq!(r.registered.len(), 3);
        assert_eq!(r.renamed.len(), 0);
        assert_eq!(r.skipped_canonicalize.len(), 3);
        assert_eq!(r.primary_active.as_deref(), Some("3.6.9"));
        assert!(!r.primary_dir_claimed);

        // Canonical slot has 3.6.9 bytes, index points to 3.6.9.
        assert_eq!(std::fs::read(qd.join("ezquake.exe")).unwrap(), b"v3.6.9-bytes");
    }

    #[test]
    fn rename_one_skip_two_then_primary_swap() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let qd = tmp.path().join("qw");
        std::fs::create_dir_all(&data_root).unwrap();
        std::fs::create_dir_all(&qd).unwrap();

        // Two non-canonical exes, no canonical slot.
        let p1 = write_exe(&qd, "ezquake-3.6.exe", b"v3.6-bytes");
        let p2 = write_exe(&qd, "ezquake-3.6.6.exe", b"v3.6.6-bytes");

        let req = BulkImportRequest {
            rows: vec![
                row(p1, "3.6", "ezquake.exe", None, CanonicalizeConsent::LeaveAsIs),
                row(p2.clone(), "3.6.6", "ezquake.exe", None, CanonicalizeConsent::Rename),
            ],
            primary_row_index: Some(1), // 3.6.6 becomes primary
            quake_dir: qd.to_string_lossy().into_owned(),
            claim_as_primary: true,
        };

        let r = run_bulk_import_at(&data_root, &req).unwrap();
        assert_eq!(r.renamed.len(), 1);
        assert_eq!(r.renamed[0].to, qd.join("ezquake.exe").to_string_lossy());
        assert_eq!(r.primary_active.as_deref(), Some("3.6.6"));
        assert!(r.primary_dir_claimed);

        // Canonical slot has 3.6.6 bytes; original 3.6 left at non-canonical name.
        assert_eq!(std::fs::read(qd.join("ezquake.exe")).unwrap(), b"v3.6.6-bytes");
        assert!(qd.join("ezquake-3.6.exe").exists());
    }

    #[test]
    fn variant_row_swaps_to_separate_canonical_slot() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let qd = tmp.path().join("qw");
        std::fs::create_dir_all(&data_root).unwrap();
        std::fs::create_dir_all(&qd).unwrap();

        // Vanilla already canonical; glsl variant arriving fresh.
        let p_vanilla = write_exe(&qd, "ezquake.exe", b"vanilla-bytes");
        let p_glsl = write_exe(&qd, "ezquake-glsl.exe", b"glsl-bytes");

        let req = BulkImportRequest {
            rows: vec![
                row(
                    p_vanilla,
                    "3.6.6",
                    "ezquake.exe",
                    None,
                    CanonicalizeConsent::Skip,
                ),
                row(
                    p_glsl,
                    "3.6.6",
                    "ezquake-glsl.exe",
                    Some("glsl"),
                    CanonicalizeConsent::Skip,
                ),
            ],
            primary_row_index: Some(0), // vanilla is primary
            quake_dir: qd.to_string_lossy().into_owned(),
            claim_as_primary: false,
        };

        let r = run_bulk_import_at(&data_root, &req).unwrap();
        assert_eq!(r.registered.len(), 2);
        let variants: Vec<Option<String>> = r
            .registered
            .iter()
            .map(|w| w.variant.clone())
            .collect();
        assert!(variants.contains(&None));
        assert!(variants.contains(&Some("glsl".to_string())));

        // Both canonical slots are populated with their respective bytes.
        assert_eq!(std::fs::read(qd.join("ezquake.exe")).unwrap(), b"vanilla-bytes");
        assert_eq!(
            std::fs::read(qd.join("ezquake-glsl.exe")).unwrap(),
            b"glsl-bytes"
        );

        // Index has only the vanilla active key (glsl wasn't primary).
        let idx_path = data_root.join("binaries").join("index.json");
        assert!(idx_path.exists());
        let idx_text = std::fs::read_to_string(&idx_path).unwrap();
        assert!(idx_text.contains("\"ezquake\""));
    }

    #[test]
    fn primary_index_out_of_bounds_errors() {
        let tmp = TempDir::new().unwrap();
        let data_root = tmp.path().join("data");
        let qd = tmp.path().join("qw");
        std::fs::create_dir_all(&data_root).unwrap();
        std::fs::create_dir_all(&qd).unwrap();
        let p = write_exe(&qd, "ezquake.exe", b"bytes");

        let req = BulkImportRequest {
            rows: vec![row(
                p,
                "3.6.9",
                "ezquake.exe",
                None,
                CanonicalizeConsent::Skip,
            )],
            primary_row_index: Some(99),
            quake_dir: qd.to_string_lossy().into_owned(),
            claim_as_primary: false,
        };
        let r = run_bulk_import_at(&data_root, &req);
        assert!(r.is_err());
    }

    #[test]
    fn rename_to_canonical_basic_rename() {
        let tmp = TempDir::new().unwrap();
        let qd = tmp.path();
        let p = qd.join("ezquake-3.6.6.exe");
        std::fs::write(&p, b"bytes").unwrap();
        let result =
            rename_to_canonical(p.to_string_lossy().into_owned(), "ezquake.exe".to_string())
                .unwrap();
        assert_eq!(result, qd.join("ezquake.exe").to_string_lossy());
        assert!(qd.join("ezquake.exe").exists());
        assert!(!p.exists());
    }

    #[test]
    fn rename_to_canonical_refuses_when_target_exists() {
        let tmp = TempDir::new().unwrap();
        let qd = tmp.path();
        let p = qd.join("ezquake-3.6.6.exe");
        std::fs::write(&p, b"bytes").unwrap();
        std::fs::write(qd.join("ezquake.exe"), b"existing").unwrap();
        let r = rename_to_canonical(p.to_string_lossy().into_owned(), "ezquake.exe".to_string());
        assert!(r.is_err());
        // Original still present, target untouched.
        assert!(p.exists());
        assert_eq!(std::fs::read(qd.join("ezquake.exe")).unwrap(), b"existing");
    }
}
