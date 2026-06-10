// The docs-snapshot data contract -- the shape build-snapshot (Phase 1) emits
// into apps/docs-web/data/<codebase>-<type>.json. VERIFIED against the live
// Phase-1 output across all 20 files / 5016 records (2026-06-10), NOT copied
// from the spec: the spec's D13 record list is stale (it lists a friendly_type
// field that is NOT emitted -- friendly_type is derived in the frontend in
// Phase 2b, D13/D18 -- and omits scope/macro_type/arguments, which ARE
// emitted). Fields are OMITTED, not null-filled, when the underlying L1 data is
// absent (D11/D13) -- hence the optionals. Framework-agnostic (D15): no
// Vue/VitePress import.

export interface SnapshotMeta {
  schema_version: string   // always "docs-snapshot-v1" (verified, all 20 files)
  generated_at: string     // ISO-8601 timestamp
  codebase: string         // ezquake | ktx | mvdsv | qtv | qwcl | qwfwd
  type: string             // cvar | command | macro | cmdline_param | info_key
  snapshot_version: string // per-codebase frozen version (D16): ezquake/ktx/mvdsv = head; qtv = 1.16-dev; qwfwd = 1.40-dev; qwcl = 2.33
  upstream_commit: string  // git SHA for ezquake/ktx/mvdsv/qwcl; a version STRING for qtv/qwfwd (F6) -- consumers must not assume a 40-char SHA
}

// A value-by-value entry on an enum/boolean cvar (ezquake cvar only).
export interface EntityValue {
  name: string
  description?: string
}

// One step in an ezquake cvar's default-value history (version-walk, D8).
export interface DefaultHistoryEntry {
  version: string
  value: string
}

export interface SourceRef {
  file: string
  line: number
}

export interface EntityRecord {
  // present on EVERY record (5016/5016, verified):
  name: string
  first_seen: string
  last_seen: string
  source_ref: SourceRef

  // present where the L1 data exists; OMITTED otherwise (D11/D13). The
  // annotation after each field is the verified data home, not a guess:
  category?: string                       // ezquake cvar/command: a group id matched against Snapshot.groups[].id (numeric string for cvars e.g. "43"; slug for commands e.g. "action"); every other codebase: a human label string (D17)
  description?: string                    // 4062/5016 records
  default?: string                        // 3272/5016; absent on commands; some KTX cvars are mode-set
  raw_type?: string                       // ezquake cvar + qwcl cvar ONLY (boolean/integer/float/string/enum); the basis for the friendly type word (D18, derived in 2b)
  values?: EntityValue[]                  // ezquake cvar ONLY (its enum/boolean cvars); QWCL has none
  remarks?: string                        // ezquake cmdline_param/command/cvar ONLY (caveats/status)
  scope?: string                          // info_key ONLY (ktx/mvdsv/qwfwd) -- e.g. "userinfo"
  default_history?: DefaultHistoryEntry[] // ezquake cvar ONLY (version-walk, D8)
  macro_type?: string                     // ezquake macro ONLY -- e.g. "integer"
  arguments?: string                      // ezquake cmdline_param ONLY -- e.g. "<path>"
}

// ezquake-cvar.json + ezquake-command.json ONLY. Maps a category id
// (EntityRecord.category) to a label; resolution matches EntityRecord.category
// against CategoryGroup.id. Two shapes, both verified against the live JSON:
// cvar groups carry a two-level taxonomy { id (numeric string e.g. "43"),
// major-group, name }; command groups are FLAT { id (slug e.g. "action"),
// name } with NO major-group (0/14). Hence major-group is optional. Absent
// entirely for the other 5 codebases (their category is already a label
// string), hence groups is optional on Snapshot. The hyphenated key matches
// the emitted JSON verbatim.
export interface CategoryGroup {
  id: string
  "major-group"?: string
  name: string
}

export interface Snapshot {
  _meta: SnapshotMeta
  entries: EntityRecord[]
  groups?: CategoryGroup[]
}
