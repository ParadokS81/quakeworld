# System Specs Collection

> **Doc type: current** — Describes what the hardware scan actually collects and how, as shipped. Updated 2026-04-11 after the audit replaced the original planning doc with reality.

This was the original motivation for the app: a browser can't read hardware reliably, so the desktop companion does it. The scan runs on every app start (never persisted) and populates the Profile tab.

## What's collected

All collected via a single Tauri command `get_all_specs()` in `src-tauri/src/commands/system.rs`. Full scan runs sub-500ms on a typical desktop.

### Hardware

| Spec | Source | Notes |
|---|---|---|
| **CPU model** | `sysinfo` crate | Cleaned up via `clean_cpu_model()` to strip "Processor" suffixes |
| **CPU cores + threads** | `sysinfo` | Physical vs logical |
| **GPU model** | WMI — `Win32_VideoController` | Picks highest-VRAM GPU if multiple |
| **GPU VRAM (MB)** | WMI — `AdapterRAM` field | Deserialized as `Option<i64>` (wmi crate quirk) |
| **GPU driver version** | WMI — `DriverVersion` | Useful for troubleshooting |
| **RAM total (GB)** | `sysinfo` | Rounded |
| **DDR generation** | WMI — `Win32_PhysicalMemory.SMBIOSMemoryType` | DDR2/3/4/5 — maps from SMBIOS codes (20=DDR, 21=DDR2, 24=DDR3, 26=DDR4, 34=DDR5) |
| **Monitor name + manufacturer** | WMI — `root\WMI` namespace, `WmiMonitorID` | Byte arrays decoded to strings, EDID manufacturer codes mapped to brand names (AUS→ASUS, GSM→LG, etc.) |
| **Display refresh rate** | WMI — `Win32_VideoController.CurrentRefreshRate` | Hz |
| **Display resolution** | Tauri monitor API + ezQuake config | Tauri for desktop, config for in-game |
| **Audio endpoints** | WMI — `Win32_PnPEntity WHERE PNPClass='AudioEndpoint'` | Filters out virtual devices (Voicemeeter, VB-Audio, Steam Streaming) |
| **USB HID devices (mouse + keyboard)** | SetupAPI — native Windows tree walk | Returns real product names like "BenQ ZOWIE Gaming Mouse", not "HID-compliant mouse" |

### Software

| Spec | Source | Notes |
|---|---|---|
| **OS name + version** | `sysinfo` | "Windows 11 Pro 23H2" etc. |
| **OS architecture** | `std::env::consts::ARCH` | x86_64 vs ARM |
| **ezQuake detection + version** | PE `FileVersionRaw` from `ezquake.exe` | See `src-tauri/src/commands/ezquake.rs:read_exe_version` |
| **ezQuake config-derived settings** | Config parser | FOV, sens, resolution — see `CFG-PARSER.md` |

### What's NOT collected (privacy)

- MAC addresses, IP addresses, network identifiers
- Running process list (beyond ezQuake detection)
- Browser history, installed software, file listings
- Anything a player wouldn't willingly post on a forum

Principle: only collect what a player would willingly type into a forum post about their setup.

## Data shape

The actual TypeScript interface (see `src/types.ts`):

```typescript
export interface AllSpecs {
  cpu: CpuInfo;
  gpu: GpuInfo | null;         // null on non-Windows
  ram: RamInfo;
  os: OsInfo;
  display: DisplayInfo | null; // null on non-Windows
  audio_devices: AudioDevice[];
  hid_devices: HidDevice[];
}

export interface CpuInfo { model: string; cores: number; threads: number; }
export interface GpuInfo { model: string; vram_mb: number | null; driver_version: string | null; }
export interface RamInfo { total_gb: number; ddr_generation: string | null; }
export interface OsInfo  { name: string; version: string; arch: string; }
export interface DisplayInfo  { refresh_hz: number | null; monitor_name: string | null; manufacturer: string | null; }
export interface AudioDevice { name: string; device_type: "input" | "output"; }
export interface HidDevice   { name: string; device_type: "mouse" | "keyboard"; }
```

Rust-side structs match 1:1 with serde `rename_all = "snake_case"` implied by the TS shape. See `src-tauri/src/commands/system.rs` for the authoritative definitions.

## Platform coverage

**Windows-only in practice.** Non-Windows branches exist in `system.rs` but return `None`/empty for GPU, display, audio, HID, and DDR generation. Linux and macOS would need their own implementations (sysfs / lspci / system_profiler) — not planned.

## GPU detection — why WMI not wgpu

The original plan document suggested using `wgpu::Instance` to enumerate adapters cross-platform. That approach was replaced with direct WMI queries because:

- `wgpu` adds ~5 MB to the binary and pulls in Vulkan/DX12 runtime dependencies
- `wgpu` doesn't expose VRAM size directly (just backend + vendor ID)
- WMI gives us driver version + refresh rate in the same query batch
- WMI is Windows-only, but so is the app

Code reference: `src-tauri/src/commands/system.rs:137-189` for the GPU query chain.

## USB HID peripherals — why SetupAPI not WMI

WMI's `Win32_PnPEntity WHERE PNPClass = 'Mouse'` returns "HID-compliant mouse" — generic garbage. USB parent devices return "USB Composite Device" — also generic. The real product name is in `DEVPKEY_Device_BusReportedDeviceDesc`, a PnP device property NOT exposed through WMI.

The SetupAPI implementation walks the device tree bottom-up: enumerate mouse/keyboard class devices, walk `CM_Get_Parent` up the tree to find the USB parent, read the bus-reported descriptor via `CM_Get_DevNode_PropertyW`. Result: real brand names like "BenQ ZOWIE Gaming Mouse" instead of generic class names.

Caveats:
- USB only — Bluetooth and PS/2 peripherals return nothing
- Bus-reported name is the dongle/receiver name, not the exact model ("BenQ ZOWIE Gaming Mouse", not "EC2-C")
- For exact model, users pick from the EloShapes-backed gear selector (see `PERIPHERAL-SELECTOR.md`)

See `src-tauri/src/commands/system.rs:231-337` for the walk-up implementation, and `memory/reference_slipgate_tauri_windows.md` for the full list of gotchas.

## Refresh behavior

Specs are re-scanned on every app start, never saved. User-set overrides (display res override, Hz override, audio out override) ARE saved in the profile store and take priority over auto-detected values — see the merge priority in `OVERVIEW.md`'s store schema section.

## Performance reference

Full `get_all_specs()` completes in **~300-500ms** on a Ryzen 9 3900X. The previous PowerShell-based approach (before the WMI rewrite) was ~5 seconds. Don't regress this — if anyone adds a new data source, profile the whole scan and make sure it stays under 500ms.
