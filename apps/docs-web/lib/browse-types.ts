// The RENDER contract (frontend-derived), distinct from lib/types.ts (the
// build-snapshot EMIT contract). The build-time shaper (lib/browse.ts) produces
// these; the dumb components (EntityBrowse/EntityCard/CodebaseLanding) consume
// them and derive nothing further at render except interactive filter/group
// (which operate on these already-resolved rows). Pure types -- no runtime, no
// fs -- so a .vue component can `import type` from here freely (D15).
import type { EntityValue, DefaultHistoryEntry, SourceRef } from './types'

// Player-facing type word (D5/D18). Absent (undefined) when the entity carries
// no raw_type (commands, macros, cmdline_params; and every non-ezquake/non-qwcl
// type) -> the collapsed-row Type column is then dropped for that whole view.
export type FriendlyType = 'toggle' | 'choice' | 'number' | 'text'

// The two optional collapsed-row columns. Name + Description-preview always
// render; 'type' and 'default' render only when at least one row in the view
// populates them (graceful per-view column drop, D4/D11). Order is fixed:
// Name | Type | Default | Description-preview (no zigzag).
export type ColumnKey = 'type' | 'default'

// One render-ready entity row. Every derivation is already done at build time
// (D15): friendlyType (D18), categoryLabel/categoryMajor (D17), sourceUrl (D8),
// anchor (D22), descriptionPreview (D4 first-sentence). Optional fields are
// simply absent where the underlying L1 data is absent (D11).
export interface BrowseRow {
  name: string
  anchor: string                      // D22: case-folded, stable deep-link fragment
  friendlyType?: FriendlyType         // D18: collapsed-row Type word (cvar only)
  rawType?: string                    // shown on expand (boolean/integer/float/string/enum)
  default?: string                    // collapsed-row Default column
  descriptionPreview?: string         // D4: first sentence, collapsed row
  descriptionFull?: string            // expanded card; also the filter haystack (D3)
  remarks?: string                    // expanded card (caveats/status)
  values?: EntityValue[]              // expanded card value-by-value list
  categoryLabel?: string              // D17: resolved (ezQuake id->name; others passthrough)
  categoryMajor?: string              // ezQuake cvar two-level taxonomy (shown in meta)
  sourceRef: SourceRef                // always present; text fallback when no URL
  sourceUrl?: string                  // D8: GitHub deep link when resolvable
  firstSeen: string                   // D8 version-walk
  lastSeen: string                    // D8 version-walk
  history?: DefaultHistoryEntry[]     // D8: default-value history (ezQuake cvar only)
  hasHistory: boolean                 // convenience: history present + non-empty
  macroType?: string                  // expanded card (ezQuake macro: "expands to")
  arguments?: string                  // expanded card (ezQuake cmdline_param)
  scope?: string                      // expanded card (info_key)
}

// Everything one browse page needs, attached to that page's route params
// (Task 3). The component reads it via useData().params; it never loads data.
export interface BrowseData {
  codebase: string
  displayName: string
  type: string
  version: string                     // snapshot_version (e.g. "head", "1.16-dev")
  rows: BrowseRow[]
  activeColumns: ColumnKey[]          // which optional columns this view renders
  hasCategories: boolean              // gates the Flat/Grouped toggle (D3/D11)
}

// Per-codebase landing payload (Task 5), attached to /<codebase> route params.
export interface CodebaseLandingData {
  codebase: string
  displayName: string
  types: { type: string; count: number; version: string }[]
}
