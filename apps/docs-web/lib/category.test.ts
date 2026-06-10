import { describe, it, expect } from 'vitest'
import type { EntityRecord, CategoryGroup } from './types'
import type { BrowseRow } from './browse-types'
import { resolveCategory, groupByCategory } from './category'

// Cast helpers: test fixtures only supply the fields the functions read.
const rec = (o: Partial<EntityRecord>): EntityRecord => o as EntityRecord
const row = (o: Partial<BrowseRow>): BrowseRow => o as BrowseRow

describe('resolveCategory', () => {
  it('ezQuake cvar id resolves against two-level group fixture', () => {
    const groups: CategoryGroup[] = [
      { id: '43', 'major-group': 'Network', name: 'Downloads' },
    ]
    expect(resolveCategory(rec({ category: '43' }), groups)).toEqual({
      label: 'Downloads',
      major: 'Network',
    })
  })

  it('ezQuake command slug resolves against flat group fixture (no major-group)', () => {
    const groups: CategoryGroup[] = [
      { id: 'action', name: 'Press/Release Actions' },
    ]
    expect(resolveCategory(rec({ category: 'action' }), groups)).toEqual({
      label: 'Press/Release Actions',
      major: undefined,
    })
  })

  it('unresolved id returns raw value as label (D11 graceful degradation)', () => {
    const groups: CategoryGroup[] = [
      { id: '43', 'major-group': 'Network', name: 'Downloads' },
    ]
    expect(resolveCategory(rec({ category: '999' }), groups)).toEqual({ label: '999' })
  })

  it('non-ezQuake codebase (no groups supplied) -> passthrough label', () => {
    expect(resolveCategory(rec({ category: 'userinfo' }))).toEqual({ label: 'userinfo' })
  })

  it('no category field -> undefined (uncategorized)', () => {
    expect(resolveCategory(rec({}))).toBeUndefined()
  })
})

describe('groupByCategory', () => {
  it('rows with categoryLabel appear in sorted buckets; uncategorized rows are LAST', () => {
    const rows = [
      row({ name: 'r1', categoryLabel: 'Network', anchor: 'r1', sourceRef: { file: 'f', line: 1 }, hasHistory: false }),
      row({ name: 'r2', categoryLabel: undefined, anchor: 'r2', sourceRef: { file: 'f', line: 2 }, hasHistory: false }),
      row({ name: 'r3', categoryLabel: 'Audio', anchor: 'r3', sourceRef: { file: 'f', line: 3 }, hasHistory: false }),
      row({ name: 'r4', categoryLabel: undefined, anchor: 'r4', sourceRef: { file: 'f', line: 4 }, hasHistory: false }),
    ]

    const groups = groupByCategory(rows)

    // Sorted labeled buckets first
    expect(groups[0].category).toBe('Audio')
    expect(groups[0].rows).toHaveLength(1)
    expect(groups[1].category).toBe('Network')
    expect(groups[1].rows).toHaveLength(1)

    // Uncategorized LAST
    expect(groups[2].category).toBe('(uncategorized)')
    expect(groups[2].rows).toHaveLength(2)
  })

  it('all rows uncategorized -> single "(uncategorized)" bucket', () => {
    const rows = [
      row({ name: 'r1', anchor: 'r1', sourceRef: { file: 'f', line: 1 }, hasHistory: false }),
    ]
    const groups = groupByCategory(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe('(uncategorized)')
  })

  it('empty input -> empty output', () => {
    expect(groupByCategory([])).toEqual([])
  })

  it('no uncategorized rows -> no "(uncategorized)" bucket', () => {
    const rows = [
      row({ name: 'r1', categoryLabel: 'Video', anchor: 'r1', sourceRef: { file: 'f', line: 1 }, hasHistory: false }),
    ]
    const groups = groupByCategory(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe('Video')
  })
})
