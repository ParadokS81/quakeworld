// Client-side text filter for the browse view (D3). Pure -- no framework
// imports. Case-insensitive at the data layer per project convention.
import type { BrowseRow } from './browse-types'

export function filterEntries(rows: BrowseRow[], query: string): BrowseRow[] {
  const q = query.trim().toLowerCase()
  if (q === '') return rows
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(q) ||
      (row.descriptionFull ?? '').toLowerCase().includes(q)
  )
}
