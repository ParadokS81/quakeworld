// Build-time browse shaper (D15). Imports snapshot.ts (Node/fs) and calls the
// pure derive/category/version-walk/anchor/source-link functions; produces
// render-ready BrowseData and CodebaseLandingData slices that the .paths.ts
// route loaders attach to per-page params. The Vue components read these via
// useData().params and derive nothing further at render time.
import { listSnapshots, loadSnapshot } from './snapshot'
import { friendlyType } from './derive'
import { resolveCategory } from './category'
import { versionWalk } from './version-walk'
import { entityAnchor } from './anchor'
import { sourceUrl } from './source-link'
import type { BrowseData, BrowseRow, CodebaseLandingData, ColumnKey } from './browse-types'

// Returns s up to and including the first ". " (period + space) OR up to the
// first newline, whichever comes first. Falls back to the full string when
// neither boundary exists. Most descriptions are short so this is a near-no-op.
function firstSentence(s: string): string {
  const newline = s.indexOf('\n')
  const periodSpace = s.indexOf('. ')

  if (newline === -1 && periodSpace === -1) return s

  if (newline === -1) return s.slice(0, periodSpace + 2) // include ". "
  if (periodSpace === -1) return s.slice(0, newline)

  // Both found -- take whichever boundary is earlier.
  return periodSpace < newline ? s.slice(0, periodSpace + 2) : s.slice(0, newline)
}

// Produces all render-ready fields for a single (codebase, type) browse page.
// Every derivation (friendly type, category label, source URL, version walk,
// anchor, description preview) is resolved here at build time (D15).
export function shapeBrowse(codebase: string, type: string): BrowseData {
  const snap = loadSnapshot(codebase, type)

  const rows: BrowseRow[] = snap.entries.map((e) => {
    const c = resolveCategory(e, snap.groups)
    const walk = versionWalk(e)

    const row: BrowseRow = {
      name: e.name,
      anchor: entityAnchor(e.name),
      friendlyType: friendlyType(e),
      rawType: e.raw_type,
      default: e.default,
      descriptionFull: e.description,
      descriptionPreview: e.description ? firstSentence(e.description) : undefined,
      remarks: e.remarks,
      values: e.values,
      categoryLabel: c?.label,
      categoryMajor: c?.major,
      sourceRef: e.source_ref,
      sourceUrl: sourceUrl(codebase, snap._meta, e.source_ref),
      firstSeen: walk.firstSeen,
      lastSeen: walk.lastSeen,
      history: walk.history,
      hasHistory: walk.hasHistory,
      macroType: e.macro_type,
      arguments: e.arguments,
      scope: e.scope,
    }
    return row
  })

  // Fixed column order: 'type' before 'default' (D4/D11).
  const activeColumns: ColumnKey[] = []
  if (rows.some((r) => r.friendlyType !== undefined)) activeColumns.push('type')
  if (rows.some((r) => r.default !== undefined)) activeColumns.push('default')

  const hasCategories = rows.some((r) => r.categoryLabel !== undefined)

  return {
    codebase,
    type,
    version: snap._meta.snapshot_version,
    rows,
    activeColumns,
    hasCategories,
  }
}

// Produces the per-codebase landing summary: one entry per type file on disk.
// Sorted ascending by type so the landing page renders in stable order.
export function shapeCodebaseLanding(codebase: string): CodebaseLandingData {
  const types = listSnapshots()
    .filter((s) => s.codebase === codebase)
    .map(({ type }) => {
      const snap = loadSnapshot(codebase, type)
      return { type, count: snap.entries.length, version: snap._meta.snapshot_version }
    })
    .sort((a, b) => a.type.localeCompare(b.type))

  return { codebase, types }
}
