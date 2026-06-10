// Build-time only. Imports snapshot (fs-dependent). Never imported by the Vue
// component -- only by the VitePress data loader (search-records.data.ts).
import { listSnapshots, loadSnapshot } from './snapshot'
import { friendlyType } from './derive'
import { entityAnchor } from './anchor'
import { codebaseLabel } from './codebase-label'
import type { SearchRecord } from './search-index'

// Enumerate every snapshot into a flat record list for the MiniSearch index.
export function buildSearchRecords(): SearchRecord[] {
  const records: SearchRecord[] = []
  for (const { codebase, type } of listSnapshots()) {
    const snap = loadSnapshot(codebase, type)
    const displayName = codebaseLabel(codebase)
    for (const e of snap.entries) {
      const anchor = entityAnchor(e.name)
      records.push({
        id: `${codebase}:${type}:${e.name}`,
        name: e.name,
        description: e.description,
        codebase,
        displayName,
        type,
        friendlyType: friendlyType(e),
        anchor,
        url: `/${codebase}/${type}#${anchor}`,
      })
    }
  }
  return records
}
