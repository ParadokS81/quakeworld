export interface AudioDevice {
  name: string;
  device_type: "input" | "output";
}

export interface LocEntry {
  name: string;
  x: number;
  y: number;
  z: number;
}

export interface LocScanResult {
  maps: Record<string, LocEntry[]>;
  source_dirs: string[];
}

export interface HidDevice {
  name: string;
  device_type: "mouse" | "keyboard" | "other";
}

export interface AllSpecs {
  cpu: { model: string; cores: number; threads: number };
  gpu: {
    model: string;
    vram_mb: number | null;
    driver_version: string | null;
  } | null;
  ram: { total_gb: number; ddr_generation: string | null };
  os: { name: string; version: string; arch: string };
  display: { refresh_hz: number | null; monitor_name: string | null; manufacturer: string | null };
  audio_devices: AudioDevice[];
  hid_devices: HidDevice[];
}

export interface MonitorInfo {
  name: string | null;
  resolution: string;
  count: number;
}

// EloShapes data types (expanded schema)
export interface MouseEntry {
  handle: string;
  brand: string;
  model: string;
  weight: number | null;
  wireless: boolean | null;
  shape: string | null;          // "ergonomic" | "symmetrical"
  size: string | null;           // "small" | "medium" | "large"
  hand: string | null;           // "right" | "left" | "both"
  sensor: string | null;         // e.g. "PAW3395"
  max_dpi: number | null;
  polling_rate: number | null;
  length: number | null;         // mm
  width: number | null;          // mm
  height: number | null;         // mm
  image: string | null;          // EloShapes PNG filename e.g. "zowie-ec2-wireless.png"
}

export interface MousepadSize {
  name: string;                  // "Small" | "Medium" | "Large" | "XL" | "XXL"
  dimensions: string | null;     // "490 × 420"
}

export interface MousepadEntry {
  handle: string;
  brand: string;
  model: string;
  speed: string | null;          // "control" | "balanced" | "speed"
  texture: string | null;        // "textured" | "smooth"
  firmness: string | null;       // "soft" | "mid" | "firm" | "hard"
  thickness: number | null;      // mm
  surface_material: string | null; // "fabric" | "glass" | "plastic" | "polyester"
  width: number | null;          // mm (single-size pads)
  length: number | null;         // mm
  edges: string | null;          // "stitched" | "raw"
  sizes: MousepadSize[] | null;  // available size variants
}

// User's gear selections (frontend state)
export interface GearProfile {
  mouse: { handle: string; brand: string; model: string } | null;
  mousepad: { handle: string; brand: string; model: string } | null;
  keyboardName: string | null;
  dpi: number | null;
  sensitivity: number | null;
}

// ezQuake integration types
export interface EzQuakeInstallation {
  exe_path: string;
  config_dir: string;
  config_files: string[];
  valid: boolean;
  version: string | null;  // "3.6.6.7947" from PE FileVersionRaw
}

/** A single styled character in a QW nickname (from Rust QW name expander) */
export interface QwStyledChar {
  ch: string;
  color: "w" | "b" | "g"; // white, brown, gold
}

export interface CommandInvocation {
  name: string;
  args: string;
}

export interface MovementKeys {
  forward: string;
  back: string;
  moveleft: string;
  moveright: string;
  jump: string;
  moveup: string;
  movedown: string;
}

export type Weapon = "axe" | "sg" | "ssg" | "ng" | "sng" | "gl" | "rl" | "lg";
export type Method = "quickfire" | "manual";
export type ManualFlavor = "select" | "hold";
export type PathSource = "explicit" | "engine_default";
export type Mechanism =
  | "plus_fire" | "plus_fire_ar" | "weapon_attack" | "impulse_attack"
  | "preselect_weapon" | "preselect_impulse" | "rebind_fire_key"
  | "hold_modifier_rebind" | "generic_fire_key";

export interface FiringPath {
  weapon: Weapon;
  method: Method;
  flavor: ManualFlavor | null;
  trigger_key: string;
  fire_key: string | null;
  source: PathSource;
  mechanism: Mechanism;
  origin_alias_chain: string[];
}

// Backward-compat alias: 6 files reference WeaponBind; rename in place after Tasks 20-21.
export type WeaponBind = FiringPath;

export interface TeamsayBind {
  key: string;           // display name of the key (e.g. "R", "Mouse4", or "CTRL+R" for combos)
  category: string;      // "status", "death", "movement", "items", "enemy", "orders", "powerups", "confirm", "custom"
  label: string;         // short label (e.g. "report", "lost", "safe")
  description: string;   // longer description
  /** First resolved say_team body — raw text, color codes + macros intact. Empty when bind is tp_msg* with no say_team terminal. */
  body?: string;
  /** Set for synthesized modifier-combo entries — the `+alias` name driving the combo. */
  modifier_alias?: string;
}

export interface WeaponChangeDispatch {
  /** Weapon lowercase ("lg", "rl", ...) → dispatched alias name. */
  per_weapon: Record<string, string>;
  /** Fallback alias when no specific branch matches. */
  else_alias: string | null;
}

export interface EzQuakeConfig {
  player_name: string;
  player_name_qw: QwStyledChar[];
  team: string;
  team_qw: QwStyledChar[];
  topcolor: number;
  bottomcolor: number;
  sensitivity: number;
  lg_sensitivity: number | null;  // different sensitivity for LG, if detected
  sensitivity_baseline: number | null;  // else-branch sens if f_weaponchange sets it
  weapon_change_dispatch: WeaponChangeDispatch | null;
  m_yaw: number;
  m_pitch: number;
  m_accel: number;
  fov: number;
  in_raw: boolean;
  vid_usedesktopres: boolean;
  vid_width: number;
  vid_height: number;
  vid_displayfrequency: number;
  cl_maxfps: number;
  movement: MovementKeys;
  weapon_binds: FiringPath[];
  teamsay_binds: TeamsayBind[];
  raw_cvars: Record<string, string>;
  command_invocations: CommandInvocation[];
}

export interface ChainBindClassification {
  weapon_binds: FiringPath[];
  teamsay_binds: TeamsayBind[];
  movement: MovementKeys;
  weapon_change_dispatch: WeaponChangeDispatch | null;
  sensitivity_baseline: number | null;
}

// ─── Client updater types ───────────────────────────────────────────────────

export interface ReleaseNote {
  version: string;
  published_at: string;
  body: string;
  is_newer: boolean;
}

export interface SnapshotCommit {
  sha: string;
  message: string;
  date: string;
}

export interface SnapshotInfo {
  available: boolean;
  filename: string;
  date: string;
  commit: string;
  download_url: string;
  checksum_url: string;
  newer_than_stable: boolean;
  commits_since_stable: SnapshotCommit[];
  ahead_by: number;
}

export interface UpdateCheckResult {
  update_available: boolean;
  current_version: string | null;
  current_build: string | null;
  latest_version: string;
  download_url: string;
  checksums_url: string | null;
  release_notes: ReleaseNote[];
  channel: string;
  snapshot: SnapshotInfo | null;
}

export interface UpdateProgress {
  stage: "downloading" | "verifying" | "backing_up" | "installing" | "done" | "error";
  percent: number | null;
  message: string;
}

export interface UpdateResult {
  success: boolean;
  new_version: string | null;
  backup_path: string | null;
  error: string | null;
}

// ── Config chain discovery ────────────────────────────────────────────────

export type ChainEntrySource =
  | "primary"
  | "exec"
  | "auto_exec"
  | "cl_onload"
  | "bound_exec"
  | "alias_exec";

export interface ExecReference {
  file: string;
  context: string;
}

export interface ConfigFile {
  name: string;
  relative_path: string;
  source: ChainEntrySource;
  referenced_by: ExecReference | null;
  cvars: Record<string, string>;
  /** Cvar names declared via `set`/`set_tp`/`set_calc` — user-created variables */
  user_created: string[];
  binds: [string, string][];
  aliases: Record<string, string>;
  exec_refs: string[];
  line_count: number;
  command_invocations: CommandInvocation[];
}

export interface UnresolvedExec {
  raw_ref: string;
  referenced_by: ExecReference;
}

export interface OtherConfig {
  name: string;
  relative_path: string;
  size_bytes: number;
}

export interface ConfigChain {
  files: ConfigFile[];
  unresolved: UnresolvedExec[];
  other_cfgs: OtherConfig[];
}

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

// Browse mode

export type Container =
  | { kind: "loose" }
  | { kind: "archive"; archive_path: string; entry: string };

export type Confidence = "certain" | "heuristic" | "seed" | "unclassified";

export interface ConsumedBy {
  loader_sites: string[];
  cvar_bindings: number[];
}

export interface ScannedFile {
  virtual_path: string;
  container: Container;
  size: number;
  mtime: number;
  content_hash: string | null;
  category_id: string | null;
  confidence: Confidence;
  search_path_winner: boolean;
  consumed_by: ConsumedBy;
  is_default: boolean;
}

export interface BrowseClientInfo {
  name: string;
  exe_path: string;
  version: string | null;
  active: boolean;
}

export interface ExternalRef {
  cvar_canonical_id: string;
  resolved_path: string;
  exists: boolean;
}

export interface ArchiveInfo {
  archive_path: string;
  kind: "pak" | "pk3" | "zip";
  size: number;
  entry_count: number;
}

export type ScanWarningKind = "archive_parse_failure" | "permission_denied" | "bundle_mismatch";

export interface ScanWarning {
  kind: ScanWarningKind;
  path: string;
  message: string;
}

export interface ScanStats {
  loaded: number;
  available: number;
  unreferenced: number;
  other: number;
  total_bytes: number;
}

export interface ScanResult {
  exe_path: string;
  scan_timestamp: number;
  root: string;
  clients_detected: BrowseClientInfo[];
  gamedirs_detected: string[];
  files: ScannedFile[];
  archives: ArchiveInfo[];
  unresolved_external_refs: ExternalRef[];
  warnings: ScanWarning[];
  stats: ScanStats;
}

export type BrowseModeName = "browse" | "domains";
export type BrowseDomainName = "configs" | "maps" | "matches" | "assets";

export interface BrowseFilterState {
  clients: Set<string>;
  gamedirs: Set<string>;
  categories: Set<string>;
  search: string;
}
