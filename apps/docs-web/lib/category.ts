// Category resolution and grouping utilities (D17/D3/F7). Pure -- no framework
// imports.
import type { EntityRecord, CategoryGroup } from './types'
import type { BrowseRow } from './browse-types'

// Resolves a raw EntityRecord.category to a display label (and optional
// major-group for two-level ezQuake cvar taxonomy). Returns undefined when the
// record carries no category at all (F5: commands/macros/etc. with no
// category field). Handles three cases:
//   1. No category on record -> undefined.
//   2. No groups supplied (non-ezQuake codebase) -> passthrough the label.
//   3. id lookup against groups -> resolved name + optional major-group;
//      unresolved id shows raw value (D11 graceful degradation).
export function resolveCategory(
  record: EntityRecord,
  groups?: CategoryGroup[]
): { label: string; major?: string } | undefined {
  if (record.category === undefined) return undefined
  if (groups === undefined) return { label: record.category }

  const g = groups.find((g) => g.id === record.category)
  if (g === undefined) return { label: record.category }

  return { label: g.name, major: g['major-group'] }
}

// Buckets rows by categoryLabel, placing uncategorized rows last (F7).
// Rows without a categoryLabel collect into "(uncategorized)".
// Result is sorted ascending by category label, with "(uncategorized)" always
// pinned to the end regardless of sort order.
export function groupByCategory(rows: BrowseRow[]): { category: string; rows: BrowseRow[] }[] {
  const UNCATEGORIZED = '(uncategorized)'
  const buckets = new Map<string, BrowseRow[]>()

  for (const row of rows) {
    const key = row.categoryLabel ?? UNCATEGORIZED
    const bucket = buckets.get(key)
    if (bucket !== undefined) {
      bucket.push(row)
    } else {
      buckets.set(key, [row])
    }
  }

  const groups: { category: string; rows: BrowseRow[] }[] = []
  const uncategorizedBucket = buckets.get(UNCATEGORIZED)

  for (const [category, categoryRows] of buckets) {
    if (category === UNCATEGORIZED) continue
    groups.push({ category, rows: categoryRows })
  }

  groups.sort((a, b) => a.category.localeCompare(b.category))

  if (uncategorizedBucket !== undefined) {
    groups.push({ category: UNCATEGORIZED, rows: uncategorizedBucket })
  }

  return groups
}
