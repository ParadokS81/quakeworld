// Derives the player-facing "friendly type" word from an EntityRecord (D18).
// Rules are ORDER-SENSITIVE: a boolean cvar with a value list stays 'toggle',
// not 'choice'. Pure -- no framework imports.
import type { EntityRecord } from './types'
import type { FriendlyType } from './browse-types'

export function friendlyType(record: EntityRecord): FriendlyType | undefined {
  if (record.raw_type === undefined) return undefined
  if (record.raw_type === 'boolean') return 'toggle'
  if (record.raw_type === 'enum') return 'choice'
  if (Array.isArray(record.values) && record.values.length > 0) return 'choice'
  if (record.raw_type === 'integer' || record.raw_type === 'float') return 'number'
  if (record.raw_type === 'string') return 'text'
  return undefined
}
