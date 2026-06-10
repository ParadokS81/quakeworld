// Extracts version-walk fields from an EntityRecord (D8). Pure -- no framework
// imports.
import type { EntityRecord, DefaultHistoryEntry } from './types'

export function versionWalk(record: EntityRecord): {
  firstSeen: string
  lastSeen: string
  history?: DefaultHistoryEntry[]
  hasHistory: boolean
} {
  const hasHistory =
    Array.isArray(record.default_history) && record.default_history.length > 0
  return {
    firstSeen: record.first_seen,
    lastSeen: record.last_seen,
    history: record.default_history,
    hasHistory,
  }
}
