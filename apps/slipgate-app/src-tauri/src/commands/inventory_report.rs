use crate::commands::browse::{scan_quake_dir, Container, ScanResult, ScannedFile};
use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;

fn human_bytes(n: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut v = n as f64;
    let mut i = 0usize;
    while v >= 1024.0 && i < UNITS.len() - 1 {
        v /= 1024.0;
        i += 1;
    }
    if i == 0 {
        format!("{} {}", n, UNITS[i])
    } else {
        format!("{:.2} {}", v, UNITS[i])
    }
}

fn ext_of(vp: &str) -> String {
    let name = vp.rsplit('/').next().unwrap_or(vp);
    let name = name.rsplit(':').next().unwrap_or(name);
    match name.rfind('.') {
        Some(i) if i > 0 => name[i..].to_lowercase(),
        _ => "(no-ext)".to_string(),
    }
}

/// Virtual path includes archive spec when archive. Strip that off and return
/// the real location on disk (loose path) OR archive_path for archive entries.
fn disk_path(f: &ScannedFile) -> String {
    match &f.container {
        Container::Loose => f.virtual_path.clone(),
        Container::Archive { archive_path, entry } => format!("{}::{}", archive_path, entry),
    }
}

fn first_segment(vp: &str) -> String {
    let clean = vp.split(':').next().unwrap_or(vp);
    clean.split('/').next().unwrap_or("").to_string()
}

fn gamedir_of(f: &ScannedFile) -> String {
    let source_path = match &f.container {
        Container::Loose => f.virtual_path.as_str(),
        Container::Archive { archive_path, .. } => archive_path.as_str(),
    };
    let first = first_segment(source_path);
    if first.is_empty() {
        "(root)".to_string()
    } else if source_path.contains('/') {
        first
    } else {
        "(root)".to_string()
    }
}

struct ExtBucket {
    count: usize,
    bytes: u64,
    category: Option<String>,
    default_count: usize,
    loose_count: usize,
    archived_count: usize,
    gamedirs: HashMap<String, usize>,
    samples: Vec<String>,
}

impl ExtBucket {
    fn new() -> Self {
        Self {
            count: 0,
            bytes: 0,
            category: None,
            default_count: 0,
            loose_count: 0,
            archived_count: 0,
            gamedirs: HashMap::new(),
            samples: Vec::new(),
        }
    }
    fn push(&mut self, f: &ScannedFile) {
        self.count += 1;
        self.bytes = self.bytes.saturating_add(f.size);
        if self.category.is_none() {
            self.category = f.category_id.clone();
        }
        if f.is_default {
            self.default_count += 1;
        }
        match f.container {
            Container::Loose => self.loose_count += 1,
            Container::Archive { .. } => self.archived_count += 1,
        }
        *self.gamedirs.entry(gamedir_of(f)).or_insert(0) += 1;
        if self.samples.len() < 5 {
            self.samples.push(disk_path(f));
        }
    }
}

fn format_report(scan: &ScanResult) -> String {
    let mut out = String::new();

    let total_files = scan.files.len();
    let loose_count = scan.files.iter().filter(|f| matches!(f.container, Container::Loose)).count();
    let archived_count = total_files - loose_count;

    let pak_count = scan.archives.iter().filter(|a| a.kind == "pak").count();
    let pk3_count = scan.archives.iter().filter(|a| a.kind == "pk3").count();
    let zip_count = scan.archives.iter().filter(|a| a.kind == "zip").count();

    out.push_str("# Quake Dir Inventory\n\n");
    out.push_str(&format!("- **Root:** `{}`\n", scan.root));
    out.push_str(&format!("- **Exe:** `{}`\n", scan.exe_path));
    out.push_str(&format!("- **Scanned at (unix):** {}\n\n", scan.scan_timestamp));

    out.push_str("## Summary\n\n");
    out.push_str(&format!(
        "- Total files: **{}** ({} loose + {} inside archives)\n",
        total_files, loose_count, archived_count
    ));
    out.push_str(&format!("- Total bytes: **{}**\n", human_bytes(scan.stats.total_bytes)));
    out.push_str(&format!(
        "- Archives: **{}** ({} .pak + {} .pk3 + {} .zip)\n",
        scan.archives.len(),
        pak_count,
        pk3_count,
        zip_count
    ));
    let clients: Vec<String> = scan.clients_detected.iter().map(|c| c.name.clone()).collect();
    out.push_str(&format!("- Clients detected: {}\n", if clients.is_empty() { "(none)".to_string() } else { clients.join(", ") }));
    out.push_str(&format!(
        "- Gamedirs detected: {}\n\n",
        if scan.gamedirs_detected.is_empty() { "(none)".to_string() } else { scan.gamedirs_detected.join(", ") }
    ));

    out.push_str("### Stats buckets (disjoint — sum = total files)\n\n");
    out.push_str("| Bucket | Files | Meaning |\n");
    out.push_str("|---|---:|---|\n");
    out.push_str(&format!("| Loaded | {} | engine references this file (loader site or cvar binding hit) |\n", scan.stats.loaded));
    out.push_str(&format!("| Available | {} | classified as an asset, no active reference — could be loaded |\n", scan.stats.available));
    out.push_str(&format!("| Shipped | {} | default Quake content (id1 loose or pak0/pak1 entries) with no active reference |\n", scan.stats.shipped));
    out.push_str(&format!("| Other | {} | no recognized category — binaries, logs, metadata, unknown |\n\n", scan.stats.other));

    // Per-gamedir rollup.
    let mut by_gamedir: BTreeMap<String, (usize, u64)> = BTreeMap::new();
    for f in &scan.files {
        let entry = by_gamedir.entry(gamedir_of(f)).or_insert((0, 0));
        entry.0 += 1;
        entry.1 = entry.1.saturating_add(f.size);
    }
    out.push_str("## Files by gamedir\n\n");
    out.push_str("| Gamedir | Files | Bytes |\n");
    out.push_str("|---|---:|---:|\n");
    for (gd, (n, b)) in &by_gamedir {
        out.push_str(&format!("| `{}` | {} | {} |\n", gd, n, human_bytes(*b)));
    }
    out.push('\n');

    // Extension buckets.
    let mut exts: HashMap<String, ExtBucket> = HashMap::new();
    for f in &scan.files {
        exts.entry(ext_of(&f.virtual_path)).or_insert_with(ExtBucket::new).push(f);
    }
    let mut ext_sorted: Vec<(String, ExtBucket)> = exts.into_iter().collect();
    ext_sorted.sort_by(|a, b| b.1.count.cmp(&a.1.count));

    out.push_str("## Files by extension (all)\n\n");
    out.push_str("| Extension | Count | Bytes | Category | Default / Custom | Loose / Archived |\n");
    out.push_str("|---|---:|---:|---|---:|---:|\n");
    for (ext, b) in &ext_sorted {
        let cat = b.category.clone().unwrap_or_else(|| "(none)".to_string());
        let custom = b.count.saturating_sub(b.default_count);
        out.push_str(&format!(
            "| `{}` | {} | {} | {} | {} / {} | {} / {} |\n",
            ext, b.count, human_bytes(b.bytes), cat, b.default_count, custom, b.loose_count, b.archived_count
        ));
    }
    out.push('\n');

    // "Other" deep-dive: which extensions fell through classification.
    let other_exts: Vec<(String, ExtBucket)> = ext_sorted.iter()
        .filter(|(_, b)| b.category.is_none())
        .map(|(e, b)| (e.clone(), ExtBucket {
            count: b.count, bytes: b.bytes, category: b.category.clone(),
            default_count: b.default_count, loose_count: b.loose_count, archived_count: b.archived_count,
            gamedirs: b.gamedirs.clone(), samples: b.samples.clone(),
        })).collect();
    out.push_str(&format!("## Unclassified extensions ({} distinct)\n\n", other_exts.len()));
    out.push_str("Everything here lands in the **Other** bucket. These are candidates for new category rules OR thematic groupings.\n\n");
    for (ext, b) in &other_exts {
        out.push_str(&format!("### `{}` — {} files, {}\n\n", ext, b.count, human_bytes(b.bytes)));
        let mut gds: Vec<(&String, &usize)> = b.gamedirs.iter().collect();
        gds.sort_by(|a, b| b.1.cmp(a.1));
        let gd_str: Vec<String> = gds.iter().map(|(g, n)| format!("{} ({})", g, n)).collect();
        out.push_str(&format!("- Gamedirs: {}\n", gd_str.join(", ")));
        out.push_str(&format!("- Loose / Archived: {} / {}\n", b.loose_count, b.archived_count));
        out.push_str("- Samples:\n");
        for s in &b.samples {
            out.push_str(&format!("  - `{}`\n", s));
        }
        out.push('\n');
    }

    // Per-extension detail for classified extensions.
    out.push_str("## Classified extensions — detail\n\n");
    for (ext, b) in ext_sorted.iter().filter(|(_, b)| b.category.is_some()) {
        out.push_str(&format!("### `{}` — {} files, {}\n\n", ext, b.count, human_bytes(b.bytes)));
        out.push_str(&format!("- Category: **{}**\n", b.category.clone().unwrap_or_default()));
        out.push_str(&format!("- Default-shipped: {} / Custom: {}\n", b.default_count, b.count - b.default_count));
        out.push_str(&format!("- Loose / Archived: {} / {}\n", b.loose_count, b.archived_count));
        let mut gds: Vec<(&String, &usize)> = b.gamedirs.iter().collect();
        gds.sort_by(|a, b| b.1.cmp(a.1));
        let gd_str: Vec<String> = gds.iter().map(|(g, n)| format!("{} ({})", g, n)).collect();
        out.push_str(&format!("- Gamedirs: {}\n", gd_str.join(", ")));
        out.push_str("- Samples:\n");
        for s in &b.samples {
            out.push_str(&format!("  - `{}`\n", s));
        }
        out.push('\n');
    }

    // Archives.
    out.push_str(&format!("## Archives ({})\n\n", scan.archives.len()));
    if scan.archives.is_empty() {
        out.push_str("_(none)_\n\n");
    } else {
        out.push_str("| Path | Kind | Entries | Size |\n");
        out.push_str("|---|---|---:|---:|\n");
        let mut ars = scan.archives.clone();
        ars.sort_by(|a, b| b.size.cmp(&a.size));
        for a in &ars {
            out.push_str(&format!("| `{}` | {} | {} | {} |\n", a.archive_path, a.kind, a.entry_count, human_bytes(a.size)));
        }
        out.push('\n');
    }

    // Match groups (demo + screenshot + log triangles).
    let mut groups: BTreeMap<String, Vec<&ScannedFile>> = BTreeMap::new();
    for f in &scan.files {
        if let Some(gid) = &f.match_group_id {
            groups.entry(gid.clone()).or_default().push(f);
        }
    }
    out.push_str(&format!("## Match groups ({} bundles)\n\n", groups.len()));
    if !groups.is_empty() {
        out.push_str("Files paired by `(parent_dir, basename_stem)` — demo + screenshot + log triangles.\n\n");
        out.push_str("| Group id | Members |\n");
        out.push_str("|---|---|\n");
        let mut shown = 0usize;
        for (gid, members) in &groups {
            if shown >= 20 { break; }
            let names: Vec<String> = members.iter().map(|f| format!("`{}`", ext_of(&f.virtual_path))).collect();
            out.push_str(&format!("| `{}` | {} |\n", gid, names.join(" + ")));
            shown += 1;
        }
        if groups.len() > 20 {
            out.push_str(&format!("\n_(+ {} more groups elided)_\n", groups.len() - 20));
        }
        out.push('\n');
    }

    // Unresolved external refs.
    out.push_str(&format!("## Unresolved external refs ({})\n\n", scan.unresolved_external_refs.len()));
    if scan.unresolved_external_refs.is_empty() {
        out.push_str("_(none)_\n\n");
    } else {
        out.push_str("| Cvar | Resolved path | Exists |\n");
        out.push_str("|---|---|---|\n");
        for r in &scan.unresolved_external_refs {
            out.push_str(&format!("| `{}` | `{}` | {} |\n", r.cvar_canonical_id, r.resolved_path, r.exists));
        }
        out.push('\n');
    }

    // Warnings.
    out.push_str(&format!("## Warnings ({})\n\n", scan.warnings.len()));
    if scan.warnings.is_empty() {
        out.push_str("_(none)_\n\n");
    } else {
        for w in &scan.warnings {
            out.push_str(&format!("- **{:?}** — `{}`: {}\n", w.kind, w.path, w.message));
        }
        out.push('\n');
    }

    out
}

#[tauri::command]
pub async fn dump_inventory_report(
    exe_path: String,
    merged_cvars: HashMap<String, String>,
    out_path: String,
) -> Result<String, String> {
    // Resolve relative out_path against the scan root (exe's parent) so the report
    // lands next to the quake dir on Windows and is reachable from WSL via /mnt/c/...
    let requested = PathBuf::from(&out_path);
    let resolved: PathBuf = if requested.is_absolute() {
        requested
    } else {
        let exe = PathBuf::from(&exe_path);
        let root = exe
            .parent()
            .ok_or_else(|| "invalid exe path".to_string())?
            .to_path_buf();
        root.join(requested)
    };

    let scan = scan_quake_dir(exe_path, merged_cvars).await?;
    let report = format_report(&scan);
    if let Some(parent) = resolved.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create_dir_all {}: {}", parent.display(), e))?;
    }
    std::fs::write(&resolved, &report).map_err(|e| format!("write {}: {}", resolved.display(), e))?;
    Ok(resolved.to_string_lossy().to_string())
}
