use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ============================================================
// Windows Mailslot IPC — send commands to running ezQuake
// ============================================================

/// Send a console command to a running ezQuake instance via Windows mailslot.
/// ezQuake creates \\.\mailslot\ezquake on startup and polls it every frame.
#[cfg(windows)]
fn send_ipc_command(command: &str) -> Result<(), String> {
    use std::ffi::CString;
    use windows::Win32::Storage::FileSystem::{
        CreateFileA, OPEN_EXISTING, FILE_SHARE_READ,
    };
    use windows::Win32::Foundation::{GENERIC_WRITE, CloseHandle};
    use windows::core::PCSTR;

    let mailslot_path = CString::new(r"\\.\mailslot\ezquake")
        .map_err(|e| format!("Invalid mailslot path: {}", e))?;

    let handle = unsafe {
        CreateFileA(
            PCSTR::from_raw(mailslot_path.as_ptr() as *const u8),
            GENERIC_WRITE.0,
            FILE_SHARE_READ,
            None,
            OPEN_EXISTING,
            Default::default(),
            None,
        )
    }.map_err(|e| format!("Failed to open ezQuake mailslot: {} — is ezQuake running?", e))?;

    let msg = format!("{}\n", command);
    let bytes = msg.as_bytes();
    let mut bytes_written: u32 = 0;

    let result = unsafe {
        windows::Win32::Storage::FileSystem::WriteFile(
            handle,
            Some(bytes),
            Some(&mut bytes_written),
            None,
        )
    };

    unsafe { let _ = CloseHandle(handle); }

    result.map_err(|e| format!("Failed to write to ezQuake mailslot: {}", e))?;
    Ok(())
}

#[cfg(not(windows))]
fn send_ipc_command(_command: &str) -> Result<(), String> {
    Err("IPC not implemented for this platform yet".into())
}

// ============================================================
// Screenshot capture orchestrator
// ============================================================

#[derive(Deserialize)]
pub struct CaptureOptions {
    pub exe_path: String,
    pub output_dir: String,
    pub demo_path: String,
    pub map_path: Option<String>,
    pub screenshot_name: Option<String>,
}

#[derive(Serialize)]
pub struct CaptureResult {
    pub success: bool,
    pub screenshot_path: Option<String>,
    pub error: Option<String>,
}

/// Copy demo and map files to ezQuake's directories.
/// Returns the demo filename for use in the playdemo command.
fn prepare_assets(exe_path: &str, demo_source: &str, map_source: Option<&str>) -> Result<String, String> {
    let exe = PathBuf::from(exe_path);
    let exe_dir = exe.parent().ok_or("Invalid ezQuake path")?;
    let qw_dir = exe_dir.join("qw");

    if !qw_dir.exists() {
        std::fs::create_dir_all(&qw_dir)
            .map_err(|e| format!("Failed to create qw directory: {}", e))?;
    }

    // Copy demo to <exe_dir>/qw/
    let demo_src = PathBuf::from(demo_source);
    if !demo_src.exists() {
        return Err(format!("Demo file not found: {}", demo_source));
    }
    let demo_filename = demo_src
        .file_name()
        .ok_or("Invalid demo filename")?
        .to_string_lossy()
        .to_string();
    std::fs::copy(&demo_src, qw_dir.join(&demo_filename))
        .map_err(|e| format!("Failed to copy demo: {}", e))?;

    // Copy map BSP to <exe_dir>/qw/maps/
    if let Some(map_src_str) = map_source {
        let map_src = PathBuf::from(map_src_str);
        if !map_src.exists() {
            return Err(format!("Map file not found: {}", map_src_str));
        }
        let maps_dir = qw_dir.join("maps");
        if !maps_dir.exists() {
            std::fs::create_dir_all(&maps_dir)
                .map_err(|e| format!("Failed to create maps directory: {}", e))?;
        }
        let map_filename = map_src.file_name().ok_or("Invalid map filename")?;
        std::fs::copy(&map_src, maps_dir.join(map_filename))
            .map_err(|e| format!("Failed to copy map: {}", e))?;
    }

    Ok(demo_filename)
}

/// Baseline settings to normalize before taking screenshots.
/// These compensate for monitor/environment differences — NOT visual choices.
/// Baseline settings sent via IPC to normalize screenshots.
/// cfg_save_onquit is handled via startup args, not here — so these
/// in-memory changes never persist regardless of user's config.
const BASELINE_COMMANDS: &[&str] = &[
    "gl_gamma 1",           // Normalize brightness curve (monitor compensation)
    "gl_contrast 1",        // Normalize contrast (monitor compensation)
    "gl_polyblend 0",       // Disable screen tints (damage flash, pickup glow, powerup)
    "v_dlightcshift 0",     // No dynamic light screen tint
    "gl_cshiftpercent 0",   // Zero out color shift intensity
];

/// POC: Launch ezQuake, play a demo, take a screenshot, quit.
#[tauri::command]
pub async fn capture_screenshot(options: CaptureOptions) -> Result<CaptureResult, String> {
    let exe_path = PathBuf::from(&options.exe_path);
    if !exe_path.exists() {
        return Err("ezQuake executable not found".into());
    }

    let exe_dir = exe_path.parent().ok_or("Invalid ezQuake path")?;

    // Ensure output directory exists
    let output_dir = PathBuf::from(&options.output_dir);
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    // Copy demo and map to ezQuake's directories
    let demo_filename = prepare_assets(
        &options.exe_path,
        &options.demo_path,
        options.map_path.as_deref(),
    )?;

    let screenshot_name = options
        .screenshot_name
        .unwrap_or_else(|| "slipgate_poc_001".to_string());

    // Screenshots go into <exe_dir>/slipgate_captures/ (sshot_dir is relative to exe dir)
    let capture_dir = exe_dir.join("slipgate_captures");
    std::fs::create_dir_all(&capture_dir)
        .map_err(|e| format!("Failed to create capture directory: {}", e))?;

    // Clean up any existing screenshot with this name
    let expected_in_ezquake = capture_dir.join(format!("{}.png", screenshot_name));
    if expected_in_ezquake.exists() {
        let _ = std::fs::remove_file(&expected_in_ezquake);
    }

    // Launch ezQuake with demo paused at start
    let mut cmd = std::process::Command::new(&exe_path);
    cmd.current_dir(exe_dir);
    cmd.args([
        "-nosound",
        "-allowmultiple",
        "+cfg_save_onquit", "0",
        "+cl_demospeed", "0",
        "+sshot_dir", "slipgate_captures",
        "+sshot_format", "png",
        &format!("+playdemo {}", demo_filename),
    ]);

    let child = cmd.spawn()
        .map_err(|e| format!("Failed to launch ezQuake: {}", e))?;
    let child_id = child.id();

    // ── IPC orchestration ──────────────────────────────────────

    // Step 1: Wait for ezQuake to start and load the demo
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;

    // Step 2: Close the console (it opens during demo load)
    let _ = send_ipc_command("toggleconsole");
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    // Step 3: Apply baseline settings for uniform screenshots
    for cmd_str in BASELINE_COMMANDS {
        let _ = send_ipc_command(cmd_str);
    }
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // Step 4: Jump to 5 seconds into the demo
    if let Err(e) = send_ipc_command("demo_jump 5") {
        return Ok(CaptureResult {
            success: false,
            screenshot_path: None,
            error: Some(format!("IPC failed (demo_jump): {}", e)),
        });
    }

    // Step 5: Wait for seek, ensure paused
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    let _ = send_ipc_command("cl_demospeed 0");
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    // Step 6: Take the screenshot
    if let Err(e) = send_ipc_command(&format!("screenshot {}", screenshot_name)) {
        return Ok(CaptureResult {
            success: false,
            screenshot_path: None,
            error: Some(format!("IPC failed (screenshot): {}", e)),
        });
    }

    // Step 7: Wait for file write, then quit
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    let _ = send_ipc_command("quit");
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;

    // ── Find and copy the screenshot ───────────────────────────

    if expected_in_ezquake.exists() {
        let final_path = output_dir.join(format!("{}.png", screenshot_name));
        std::fs::copy(&expected_in_ezquake, &final_path)
            .map_err(|e| format!("Failed to copy screenshot to output: {}", e))?;
        return Ok(CaptureResult {
            success: true,
            screenshot_path: Some(final_path.to_string_lossy().to_string()),
            error: None,
        });
    }

    // Fallback: scan capture dir for any recent screenshot
    if let Ok(entries) = std::fs::read_dir(&capture_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "png" || ext == "tga" || ext == "jpg" {
                    if let Ok(metadata) = path.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            if modified.elapsed().unwrap_or_default().as_secs() < 30 {
                                let dest = output_dir.join(path.file_name().unwrap());
                                let _ = std::fs::copy(&path, &dest);
                                return Ok(CaptureResult {
                                    success: true,
                                    screenshot_path: Some(dest.to_string_lossy().to_string()),
                                    error: Some("Screenshot found with different filename".into()),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(CaptureResult {
        success: false,
        screenshot_path: None,
        error: Some(format!(
            "Screenshot not found in: {}. Process ID was {}.",
            capture_dir.display(),
            child_id
        )),
    })
}
