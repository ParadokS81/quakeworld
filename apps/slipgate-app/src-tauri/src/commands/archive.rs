use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;
use zip::ZipArchive;

/// An entry in a PAK or ZIP/PK3 archive.
#[derive(Debug, Clone)]
pub struct ArchiveEntry {
    pub name: String,
    pub size: u64,
}

/// Read the file index from a PAK archive. Returns all entries.
pub fn read_pak_index<R: Read + Seek>(reader: &mut R) -> io::Result<Vec<ArchiveEntry>> {
    // Read 12-byte header
    let mut header = [0u8; 12];
    reader.read_exact(&mut header)?;

    // Verify magic "PACK"
    if &header[0..4] != b"PACK" {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "invalid PAK magic: expected \"PACK\"",
        ));
    }

    let table_offset = u32::from_le_bytes(header[4..8].try_into().unwrap()) as u64;
    let table_size = u32::from_le_bytes(header[8..12].try_into().unwrap()) as u64;
    let entry_count = table_size / 64;

    reader.seek(SeekFrom::Start(table_offset))?;

    let mut entries = Vec::with_capacity(entry_count as usize);

    for _ in 0..entry_count {
        let mut entry_buf = [0u8; 64];
        reader.read_exact(&mut entry_buf)?;

        // Filename: first 56 bytes, null-terminated
        let name_bytes = &entry_buf[0..56];
        let name_len = name_bytes.iter().position(|&b| b == 0).unwrap_or(56);
        let name = String::from_utf8_lossy(&name_bytes[..name_len]).into_owned();

        let size = u32::from_le_bytes(entry_buf[60..64].try_into().unwrap()) as u64;

        entries.push(ArchiveEntry { name, size });
    }

    Ok(entries)
}

/// Extract the content of a specific file from a PAK archive by name.
pub fn read_pak_file<R: Read + Seek>(reader: &mut R, filename: &str) -> io::Result<Vec<u8>> {
    // Read 12-byte header
    let mut header = [0u8; 12];
    reader.read_exact(&mut header)?;

    // Verify magic "PACK"
    if &header[0..4] != b"PACK" {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "invalid PAK magic: expected \"PACK\"",
        ));
    }

    let table_offset = u32::from_le_bytes(header[4..8].try_into().unwrap()) as u64;
    let table_size = u32::from_le_bytes(header[8..12].try_into().unwrap()) as u64;
    let entry_count = table_size / 64;

    reader.seek(SeekFrom::Start(table_offset))?;

    for _ in 0..entry_count {
        let mut entry_buf = [0u8; 64];
        reader.read_exact(&mut entry_buf)?;

        let name_bytes = &entry_buf[0..56];
        let name_len = name_bytes.iter().position(|&b| b == 0).unwrap_or(56);
        let name = String::from_utf8_lossy(&name_bytes[..name_len]);

        if name == filename {
            let data_offset = u32::from_le_bytes(entry_buf[56..60].try_into().unwrap()) as u64;
            let data_size = u32::from_le_bytes(entry_buf[60..64].try_into().unwrap()) as usize;

            reader.seek(SeekFrom::Start(data_offset))?;
            let mut buf = vec![0u8; data_size];
            reader.read_exact(&mut buf)?;
            return Ok(buf);
        }
    }

    Err(io::Error::new(
        io::ErrorKind::NotFound,
        format!("file not found in PAK: {filename}"),
    ))
}

/// Read the file index from a ZIP/PK3 archive. Returns all non-directory entries.
pub fn read_zip_index<R: Read + Seek>(reader: &mut R) -> io::Result<Vec<ArchiveEntry>> {
    let mut archive = ZipArchive::new(reader)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;

    let mut entries = Vec::new();
    for i in 0..archive.len() {
        let entry = archive
            .by_index_raw(i)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
        if entry.is_dir() {
            continue;
        }
        entries.push(ArchiveEntry {
            name: entry.name().to_string(),
            size: entry.size(),
        });
    }

    Ok(entries)
}

/// Extract the content of a specific file from a ZIP/PK3 archive by name.
pub fn read_zip_file<R: Read + Seek>(reader: &mut R, filename: &str) -> io::Result<Vec<u8>> {
    let mut archive = ZipArchive::new(reader)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;

    let mut entry = archive.by_name(filename).map_err(|e| match e {
        zip::result::ZipError::FileNotFound => io::Error::new(
            io::ErrorKind::NotFound,
            format!("file not found in ZIP: {filename}"),
        ),
        other => io::Error::new(io::ErrorKind::InvalidData, other.to_string()),
    })?;

    let mut buf = Vec::new();
    entry.read_to_end(&mut buf)?;
    Ok(buf)
}

// ---------------------------------------------------------------------------
// Unified archive API
// ---------------------------------------------------------------------------

/// Detected archive format.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ArchiveFormat {
    Pak,
    Zip, // covers .zip and .pk3
}

/// Detect archive format from file extension. Returns None for unsupported types.
pub fn detect_format(path: &Path) -> Option<ArchiveFormat> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    match ext.as_str() {
        "pak" => Some(ArchiveFormat::Pak),
        "zip" | "pk3" => Some(ArchiveFormat::Zip),
        _ => None,
    }
}

/// Scan an archive file and return all entries.
pub fn scan_archive(path: &Path) -> io::Result<(ArchiveFormat, Vec<ArchiveEntry>)> {
    let format = detect_format(path).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("unsupported archive format: {}", path.display()),
        )
    })?;

    let mut file = File::open(path)?;
    let entries = match format {
        ArchiveFormat::Pak => read_pak_index(&mut file)?,
        ArchiveFormat::Zip => read_zip_index(&mut file)?,
    };

    Ok((format, entries))
}

/// Extract a specific file from an archive.
pub fn extract_file(path: &Path, filename: &str) -> io::Result<Vec<u8>> {
    let format = detect_format(path).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("unsupported archive format: {}", path.display()),
        )
    })?;

    let mut file = File::open(path)?;
    match format {
        ArchiveFormat::Pak => read_pak_file(&mut file, filename),
        ArchiveFormat::Zip => read_zip_file(&mut file, filename),
    }
}

/// Extract all .cfg files from an archive. Returns (filename, content_string) pairs.
pub fn extract_all_configs(path: &Path) -> io::Result<Vec<(String, String)>> {
    let format = detect_format(path).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("unsupported archive format: {}", path.display()),
        )
    })?;

    let mut file = File::open(path)?;
    let mut results = Vec::new();

    match format {
        ArchiveFormat::Pak => {
            // Get index first, then seek back to extract each matching file.
            let entries = read_pak_index(&mut file)?;
            for entry in entries {
                if entry.name.to_lowercase().ends_with(".cfg") {
                    file.seek(SeekFrom::Start(0))?;
                    let content = read_pak_file(&mut file, &entry.name)?;
                    results.push((entry.name, String::from_utf8_lossy(&content).to_string()));
                }
            }
        }
        ArchiveFormat::Zip => {
            // Iterate all entries in one pass — ZipArchive takes ownership of the reader.
            let mut archive = ZipArchive::new(&mut file)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
            for i in 0..archive.len() {
                let mut entry = archive
                    .by_index(i)
                    .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
                if entry.is_dir() {
                    continue;
                }
                if entry.name().to_lowercase().ends_with(".cfg") {
                    let mut content = Vec::new();
                    entry.read_to_end(&mut content)?;
                    results.push((
                        entry.name().to_string(),
                        String::from_utf8_lossy(&content).to_string(),
                    ));
                }
            }
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    /// Build a PAK archive in memory from a list of (name, data) pairs.
    fn make_test_pak(files: &[(&str, &[u8])]) -> Vec<u8> {
        let entry_count = files.len() as u32;
        let table_size = entry_count * 64;

        // File data starts immediately after the 12-byte header.
        // Compute offsets for each file's data.
        let data_start = 12u32;
        let mut data_offsets = Vec::with_capacity(files.len());
        let mut cursor = data_start;
        for (_, data) in files {
            data_offsets.push(cursor);
            cursor += data.len() as u32;
        }

        // The file table follows all the file data.
        let table_offset = cursor;

        // --- Build the binary ---
        let mut pak = Vec::new();

        // Header
        pak.extend_from_slice(b"PACK");
        pak.extend_from_slice(&table_offset.to_le_bytes());
        pak.extend_from_slice(&table_size.to_le_bytes());

        // File data blobs
        for (_, data) in files {
            pak.extend_from_slice(data);
        }

        // File table entries
        for (i, (name, data)) in files.iter().enumerate() {
            let mut name_buf = [0u8; 56];
            let name_bytes = name.as_bytes();
            let copy_len = name_bytes.len().min(55); // keep a null terminator
            name_buf[..copy_len].copy_from_slice(&name_bytes[..copy_len]);

            pak.extend_from_slice(&name_buf);
            pak.extend_from_slice(&data_offsets[i].to_le_bytes());
            pak.extend_from_slice(&(data.len() as u32).to_le_bytes());
        }

        pak
    }

    #[test]
    fn test_read_pak_index() {
        let files: &[(&str, &[u8])] = &[
            ("maps/e1m1.bsp", b"binary map data"),
            ("sound/player/death.wav", b"audio bytes"),
            ("progs/player.mdl", b"model data here"),
        ];

        let pak_data = make_test_pak(files);
        let mut reader = Cursor::new(pak_data);
        let entries = read_pak_index(&mut reader).expect("should parse index");

        assert_eq!(entries.len(), 3);

        assert_eq!(entries[0].name, "maps/e1m1.bsp");
        assert_eq!(entries[0].size, b"binary map data".len() as u64);

        assert_eq!(entries[1].name, "sound/player/death.wav");
        assert_eq!(entries[1].size, b"audio bytes".len() as u64);

        assert_eq!(entries[2].name, "progs/player.mdl");
        assert_eq!(entries[2].size, b"model data here".len() as u64);
    }

    #[test]
    fn test_read_pak_file() {
        let files: &[(&str, &[u8])] = &[
            ("maps/e1m1.bsp", b"binary map data"),
            ("sound/player/death.wav", b"audio bytes"),
            ("progs/player.mdl", b"model data here"),
        ];

        let pak_data = make_test_pak(files);
        let mut reader = Cursor::new(pak_data);

        let content =
            read_pak_file(&mut reader, "sound/player/death.wav").expect("should extract file");

        assert_eq!(content, b"audio bytes");
    }

    #[test]
    fn test_read_pak_file_not_found() {
        let files: &[(&str, &[u8])] = &[("maps/e1m1.bsp", b"data")];

        let pak_data = make_test_pak(files);
        let mut reader = Cursor::new(pak_data);

        let result = read_pak_file(&mut reader, "does/not/exist.txt");

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::NotFound);
    }

    #[test]
    fn test_invalid_pak_magic() {
        // Deliberately corrupt magic bytes
        let mut bad_header = vec![0u8; 12];
        bad_header[0..4].copy_from_slice(b"JUNK");

        let mut reader = Cursor::new(bad_header);
        let result = read_pak_index(&mut reader);

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::InvalidData);
    }

    // -----------------------------------------------------------------------
    // ZIP helpers and tests
    // -----------------------------------------------------------------------

    /// Build a ZIP archive in memory from a list of (name, data) pairs.
    fn make_test_zip(files: &[(&str, &[u8])]) -> Vec<u8> {
        use std::io::Write;
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
        let files: &[(&str, &[u8])] = &[
            ("maps/e1m1.bsp", b"binary map data"),
            ("config/autoexec.cfg", b"bind a attack"),
        ];

        let zip_data = make_test_zip(files);
        let mut reader = Cursor::new(zip_data);
        let entries = read_zip_index(&mut reader).expect("should parse zip index");

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].name, "maps/e1m1.bsp");
        assert_eq!(entries[0].size, b"binary map data".len() as u64);
        assert_eq!(entries[1].name, "config/autoexec.cfg");
        assert_eq!(entries[1].size, b"bind a attack".len() as u64);
    }

    #[test]
    fn test_read_zip_file() {
        let files: &[(&str, &[u8])] = &[
            ("maps/e1m1.bsp", b"binary map data"),
            ("config/autoexec.cfg", b"bind a attack"),
        ];

        let zip_data = make_test_zip(files);
        let mut reader = Cursor::new(zip_data);

        let content =
            read_zip_file(&mut reader, "config/autoexec.cfg").expect("should extract file");

        assert_eq!(content, b"bind a attack");
    }

    #[test]
    fn test_detect_format() {
        use std::path::Path;

        assert_eq!(
            detect_format(Path::new("pak0.pak")),
            Some(ArchiveFormat::Pak)
        );
        assert_eq!(
            detect_format(Path::new("data.zip")),
            Some(ArchiveFormat::Zip)
        );
        assert_eq!(detect_format(Path::new("qw.pk3")), Some(ArchiveFormat::Zip));
        // Case-insensitive
        assert_eq!(detect_format(Path::new("qw.PK3")), Some(ArchiveFormat::Zip));
        assert_eq!(
            detect_format(Path::new("PAK0.PAK")),
            Some(ArchiveFormat::Pak)
        );
        // Unsupported
        assert_eq!(detect_format(Path::new("autoexec.cfg")), None);
        assert_eq!(detect_format(Path::new("readme.txt")), None);
        assert_eq!(detect_format(Path::new("no_extension")), None);
    }
}
