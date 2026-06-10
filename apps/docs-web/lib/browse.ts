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
import { codebaseLabel } from './codebase-label'
import type { BrowseData, BrowseRow, CodebaseLandingData, ColumnKey } from './browse-types'
import { buildCvarLinker } from './cvar-link'
import { buildGuideIndex, getGuideRefs, GUIDES_PORTAL_LIVE } from './guide-index'

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

  // Build the cvar-link resolver for this codebase's entity-name set (D19:
  // within-codebase only). Entity names come from the snapshot entries.
  const allNames = snap.entries.map((e) => e.name)
  const linkDescription = buildCvarLinker(allNames)

  // Build the guide reverse-index ONLY when the guides portal is live (D7/D21).
  // In v1 GUIDES_PORTAL_LIVE is false, so we skip the per-page note reads
  // entirely and attach [] below -- zero "Used in" links render by construction
  // (the corpus is NON-EMPTY; rendering its refs would be 286 dead 404s).
  const guideIdx = GUIDES_PORTAL_LIVE ? buildGuideIndex() : undefined

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
      // D7/D21: suppressed in v1. When the portal ships (flag true), guideIdx is
      // built and this returns the entity's real guide refs.
      usedInGuides: guideIdx ? getGuideRefs(guideIdx, codebase, type, e.name) : [],
      descriptionSegments: (() => {
        if (!e.description) return undefined
        const segs = linkDescription(e.description)
        // A single text-only segment means no links found; omit the field so
        // EntityCard falls back to plain descriptionFull (no performance penalty).
        if (segs.length === 1 && segs[0].kind === 'text') return undefined
        return segs
      })(),
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
    displayName: codebaseLabel(codebase),
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

  return { codebase, displayName: codebaseLabel(codebase), types }
}
