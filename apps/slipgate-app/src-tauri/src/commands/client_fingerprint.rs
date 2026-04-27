use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClientKind {
    EzQuake,
    UnezQuakeFamily,
    Fte,
    Unknown,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ClientFingerprint {
    pub kind: ClientKind,
    /// Raw version string from PE ProductVersion or FileVersion (whichever is populated).
    pub version: Option<String>,
    /// Filename-derived variant suffix (e.g. "glsl"). None for canonical filenames.
    pub variant: Option<String>,
    pub product_name: Option<String>,
    pub internal_name: Option<String>,
    pub original_filename: Option<String>,
    pub file_description: Option<String>,
    pub company_name: Option<String>,
}

#[derive(Default, Debug, Clone)]
pub struct PeStrings {
    pub company_name: Option<String>,
    pub product_name: Option<String>,
    pub file_version: Option<String>,
    pub product_version: Option<String>,
    pub file_description: Option<String>,
    pub original_filename: Option<String>,
    pub internal_name: Option<String>,
}

// Per F8: trimmed list. -test / -dev too easily false-positive on user files
// like myezquake-test.exe. Add suffixes back when concrete cases arrive.
const KNOWN_VARIANT_SUFFIXES: &[&str] = &["glsl"];

#[cfg(target_os = "windows")]
const STRING_KEYS: &[&str] = &[
    "CompanyName",
    "ProductName",
    "FileVersion",
    "ProductVersion",
    "FileDescription",
    "OriginalFilename",
    "InternalName",
];

#[cfg(target_os = "windows")]
pub fn read_pe_strings(path: &Path) -> Option<PeStrings> {
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW,
    };

    let wide_path: Vec<u16> = path
        .to_string_lossy()
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let mut handle = 0u32;
        let size = GetFileVersionInfoSizeW(PCWSTR(wide_path.as_ptr()), Some(&mut handle));
        if size == 0 {
            return None;
        }

        let mut buffer = vec![0u8; size as usize];
        let ok = GetFileVersionInfoW(
            PCWSTR(wide_path.as_ptr()),
            Some(handle),
            size,
            buffer.as_mut_ptr() as *mut _,
        );
        if !ok.is_ok() {
            return None;
        }

        // 1. Enumerate the translation table.
        let translation_block: Vec<u16> = "\\VarFileInfo\\Translation\0".encode_utf16().collect();
        let mut trans_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
        let mut trans_len: u32 = 0;
        let trans_ok = VerQueryValueW(
            buffer.as_ptr() as *const _,
            PCWSTR(translation_block.as_ptr()),
            &mut trans_ptr,
            &mut trans_len,
        );

        let mut translations: Vec<(u16, u16)> = Vec::new();
        if trans_ok.as_bool() && !trans_ptr.is_null() && trans_len >= 4 {
            // Each entry is two u16: (langid, codepage).
            let entry_count = (trans_len as usize) / 4;
            let words = std::slice::from_raw_parts(trans_ptr as *const u16, entry_count * 2);
            for i in 0..entry_count {
                translations.push((words[i * 2], words[i * 2 + 1]));
            }
        }

        // Fallback: hardcoded en-US Unicode if the translation table is missing.
        if translations.is_empty() {
            translations.push((0x0409, 0x04B0));
        }

        let mut result = PeStrings::default();

        for (lang, cp) in translations {
            let lang_cp = format!("{:04X}{:04X}", lang, cp);
            for key in STRING_KEYS {
                if get_string_for(&result, key).is_some() {
                    continue; // already populated; first hit wins per key
                }
                let sub_block_str = format!("\\StringFileInfo\\{}\\{}\0", lang_cp, key);
                let sub_block: Vec<u16> = sub_block_str.encode_utf16().collect();
                let mut value_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
                let mut value_len: u32 = 0;
                let q_ok = VerQueryValueW(
                    buffer.as_ptr() as *const _,
                    PCWSTR(sub_block.as_ptr()),
                    &mut value_ptr,
                    &mut value_len,
                );
                if !q_ok.as_bool() || value_ptr.is_null() || value_len == 0 {
                    continue;
                }
                // value_len is in characters including trailing null (per docs).
                // Slice to value_len chars; trim a trailing null if present.
                let chars = std::slice::from_raw_parts(value_ptr as *const u16, value_len as usize);
                let end = chars.iter().position(|&c| c == 0).unwrap_or(chars.len());
                let s = String::from_utf16_lossy(&chars[..end]);
                set_string_for(&mut result, key, s);
            }
        }

        Some(result)
    }
}

#[cfg(not(target_os = "windows"))]
pub fn read_pe_strings(_path: &Path) -> Option<PeStrings> {
    None
}

#[cfg(target_os = "windows")]
fn get_string_for<'a>(strings: &'a PeStrings, key: &str) -> Option<&'a str> {
    let v = match key {
        "CompanyName" => &strings.company_name,
        "ProductName" => &strings.product_name,
        "FileVersion" => &strings.file_version,
        "ProductVersion" => &strings.product_version,
        "FileDescription" => &strings.file_description,
        "OriginalFilename" => &strings.original_filename,
        "InternalName" => &strings.internal_name,
        _ => return None,
    };
    v.as_deref()
}

#[cfg(target_os = "windows")]
fn set_string_for(strings: &mut PeStrings, key: &str, value: String) {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return;
    }
    let owned = trimmed.to_string();
    match key {
        "CompanyName" => strings.company_name = Some(owned),
        "ProductName" => strings.product_name = Some(owned),
        "FileVersion" => strings.file_version = Some(owned),
        "ProductVersion" => strings.product_version = Some(owned),
        "FileDescription" => strings.file_description = Some(owned),
        "OriginalFilename" => strings.original_filename = Some(owned),
        "InternalName" => strings.internal_name = Some(owned),
        _ => {}
    }
}

/// Classify the PE strings + filename into a ClientKind.
///
/// Filename matters because the FTE server build (fteqw-sv.exe) shares
/// `InternalName == "ftequake"` with the FTE client (same winquake.rc resource).
/// Per F7 we exclude server builds via filename or FileDescription.
pub fn classify_from_pe_strings(pe: &PeStrings, filename: &str) -> ClientKind {
    if pe.internal_name.as_deref() == Some("ftequake") {
        let stem = filename
            .to_ascii_lowercase()
            .trim_end_matches(".exe")
            .to_string();
        let is_server = stem.starts_with("fteqw-sv")
            || stem.ends_with("-sv")
            || stem.contains("-server")
            || pe
                .file_description
                .as_deref()
                .map(|d| d.to_ascii_lowercase().contains("server"))
                .unwrap_or(false);
        if is_server {
            return ClientKind::Unknown;
        }
        return ClientKind::Fte;
    }

    if pe.product_name.as_deref() == Some("ezQuake") {
        let version_str = pe
            .product_version
            .as_deref()
            .or(pe.file_version.as_deref())
            .or(pe.file_description.as_deref())
            .unwrap_or("");
        let lower = version_str.to_ascii_lowercase();
        // Per D4 substring-not-regex: project identity is a substring, not a structural
        // pattern. "antilag" is invariant across unezQuake's old + modern naming.
        if lower.contains("antilag") || lower.contains("unezquake") {
            return ClientKind::UnezQuakeFamily;
        }
        return ClientKind::EzQuake;
    }

    ClientKind::Unknown
}

pub fn variant_from_filename(filename: &str) -> Option<String> {
    let stem = filename
        .to_ascii_lowercase()
        .trim_end_matches(".exe")
        .to_string();
    for suffix in KNOWN_VARIANT_SUFFIXES {
        if stem.ends_with(&format!("-{}", suffix)) {
            return Some((*suffix).to_string());
        }
    }
    None
}

/// The canonical exe filename slipgate writes for a family + variant.
/// FTE family canonical is `fteqw.exe` (verified at
/// research/repos/fteqw/CMakeLists.txt:1148), NOT `fte.exe`.
pub fn family_canonical_exe(kind: ClientKind, variant: Option<&str>) -> Option<String> {
    let base = match kind {
        ClientKind::EzQuake => "ezquake",
        ClientKind::UnezQuakeFamily => "unezquake",
        ClientKind::Fte => "fteqw",
        ClientKind::Unknown => return None,
    };
    Some(match variant {
        Some(v) => format!("{}-{}.exe", base, v),
        None => format!("{}.exe", base),
    })
}

pub fn fingerprint(path: &Path) -> ClientFingerprint {
    let pe = read_pe_strings(path).unwrap_or_default();
    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let kind = classify_from_pe_strings(&pe, &filename);
    let variant = variant_from_filename(&filename);

    let version = pe
        .product_version
        .clone()
        .or_else(|| pe.file_version.clone());

    ClientFingerprint {
        kind,
        version,
        variant,
        product_name: pe.product_name,
        internal_name: pe.internal_name,
        original_filename: pe.original_filename,
        file_description: pe.file_description,
        company_name: pe.company_name,
    }
}

#[tauri::command]
pub fn fingerprint_exe(path: String) -> Result<ClientFingerprint, String> {
    let p = std::path::PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("file not found: {}", p.display()));
    }
    Ok(fingerprint(&p))
}

#[tauri::command]
pub fn fingerprint_folder(folder: String) -> Result<Vec<(String, ClientFingerprint)>, String> {
    let p = std::path::PathBuf::from(&folder);
    if !p.is_dir() {
        return Err(format!("not a directory: {}", p.display()));
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&p).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        // Skip debug-symbol sidecar files (`foo.exe.db`, `foo.exe.pdb`).
        let lower = name.to_ascii_lowercase();
        if lower.ends_with(".exe.db") || lower.ends_with(".exe.pdb") {
            continue;
        }
        if !lower.ends_with(".exe") {
            continue;
        }
        let fp = fingerprint(&path);
        out.push((path.to_string_lossy().into_owned(), fp));
    }
    Ok(out)
}

/// Per F2 + D7: server-side filter that drops Unknown rows so AddClientPanel
/// never has to render them. Tools (qizmo, wget) and unrecognized binaries
/// are not import candidates.
#[tauri::command]
pub fn scan_clients_in_dir(folder: String) -> Result<Vec<(String, ClientFingerprint)>, String> {
    let all = fingerprint_folder(folder)?;
    Ok(all
        .into_iter()
        .filter(|(_, fp)| fp.kind != ClientKind::Unknown)
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pe(product_name: &str, internal_name: &str, version: &str) -> PeStrings {
        PeStrings {
            product_name: Some(product_name.to_string()),
            internal_name: Some(internal_name.to_string()),
            product_version: Some(version.to_string()),
            ..Default::default()
        }
    }

    #[test]
    fn classify_vanilla_ezquake() {
        let p = pe("ezQuake", "ezquake", "3.6.9");
        assert_eq!(
            classify_from_pe_strings(&p, "ezquake.exe"),
            ClientKind::EzQuake
        );
    }

    #[test]
    fn classify_modern_unezquake() {
        let p = pe("ezQuake", "ezquake", "1.3.5-dev unezquake build");
        assert_eq!(
            classify_from_pe_strings(&p, "unezquake.exe"),
            ClientKind::UnezQuakeFamily
        );
    }

    #[test]
    fn classify_old_unezquake_with_antilag_suffix() {
        let p = pe("ezQuake", "ezquake", "3.6-dev-alpha10-antilag-r402 Build r7289");
        assert_eq!(
            classify_from_pe_strings(&p, "ezquake.exe"),
            ClientKind::UnezQuakeFamily
        );
    }

    #[test]
    fn classify_fte_client() {
        let p = pe("FTE QW", "ftequake", "01.20");
        assert_eq!(
            classify_from_pe_strings(&p, "fteqw.exe"),
            ClientKind::Fte
        );
    }

    #[test]
    fn classify_fte_server_build_excluded_by_filename() {
        // F7: fteqw-sv.exe shares InternalName="ftequake" but is NOT a client.
        let p = pe("FTE QW", "ftequake", "01.20");
        assert_eq!(
            classify_from_pe_strings(&p, "fteqw-sv.exe"),
            ClientKind::Unknown
        );
    }

    #[test]
    fn classify_fte_server_build_excluded_by_filedescription() {
        let mut p = pe("FTE QW", "ftequake", "01.20");
        p.file_description = Some("FTE QuakeWorld Server".to_string());
        assert_eq!(
            classify_from_pe_strings(&p, "fteqw.exe"),
            ClientKind::Unknown
        );
    }

    #[test]
    fn classify_unknown_tool() {
        let p = pe("Some Other Tool", "qizmo", "1.0");
        assert_eq!(
            classify_from_pe_strings(&p, "qizmo.exe"),
            ClientKind::Unknown
        );
    }

    #[test]
    fn classify_handles_case_insensitive_antilag() {
        let p = pe("ezQuake", "ezquake", "3.6 ANTILAG-r5");
        assert_eq!(
            classify_from_pe_strings(&p, "ezquake.exe"),
            ClientKind::UnezQuakeFamily
        );
    }

    #[test]
    fn variant_glsl_detected() {
        assert_eq!(
            variant_from_filename("ezquake-glsl.exe"),
            Some("glsl".to_string())
        );
        assert_eq!(variant_from_filename("ezquake.exe"), None);
    }

    #[test]
    fn variant_debug_no_longer_detected() {
        // F8: -debug suffix removed from KNOWN_VARIANT_SUFFIXES. Add back if a concrete case arrives.
        assert_eq!(variant_from_filename("fteqw-debug.exe"), None);
    }

    #[test]
    fn family_canonical_exe_mapping() {
        // F6: FTE family canonical is fteqw.exe, NOT fte.exe.
        assert_eq!(
            family_canonical_exe(ClientKind::EzQuake, None),
            Some("ezquake.exe".to_string())
        );
        assert_eq!(
            family_canonical_exe(ClientKind::EzQuake, Some("glsl")),
            Some("ezquake-glsl.exe".to_string())
        );
        assert_eq!(
            family_canonical_exe(ClientKind::UnezQuakeFamily, None),
            Some("unezquake.exe".to_string())
        );
        assert_eq!(
            family_canonical_exe(ClientKind::Fte, None),
            Some("fteqw.exe".to_string())
        );
        assert_eq!(family_canonical_exe(ClientKind::Unknown, None), None);
    }
}
