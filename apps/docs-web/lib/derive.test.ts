import { describe, it, expect } from 'vitest'
import type { EntityRecord } from './types'
import { friendlyType } from './derive'

// Cast helper: test fixtures only supply the fields the function reads, so we
// cast to EntityRecord rather than satisfying the full required shape.
const rec = (o: Partial<EntityRecord>): EntityRecord => o as EntityRecord

describe('friendlyType -- ezQuake cvar reachability matrix', () => {
  it('boolean -> toggle', () => {
    expect(friendlyType(rec({ raw_type: 'boolean' }))).toBe('toggle')
  })

  it('enum -> choice', () => {
    expect(friendlyType(rec({ raw_type: 'enum' }))).toBe('choice')
  })

  it('integer WITH value list -> choice (value list triggers choice before integer rule)', () => {
    expect(friendlyType(rec({ raw_type: 'integer', values: [{ name: '0' }] }))).toBe('choice')
  })

  it('integer WITHOUT value list -> number', () => {
    expect(friendlyType(rec({ raw_type: 'integer' }))).toBe('number')
  })

  it('float -> number', () => {
    expect(friendlyType(rec({ raw_type: 'float' }))).toBe('number')
  })

  it('string -> text', () => {
    expect(friendlyType(rec({ raw_type: 'string' }))).toBe('text')
  })
})

describe('friendlyType -- rule-order: boolean WITH value list stays toggle', () => {
  it('boolean + values -> toggle, not choice', () => {
    expect(friendlyType(rec({ raw_type: 'boolean', values: [{ name: 'false' }, { name: 'true' }] }))).toBe('toggle')
  })
})

describe('friendlyType -- QWCL cvar (no enum, no value list -> choice unreachable)', () => {
  it('boolean -> toggle', () => {
    expect(friendlyType(rec({ raw_type: 'boolean' }))).toBe('toggle')
  })

  it('integer -> number', () => {
    expect(friendlyType(rec({ raw_type: 'integer' }))).toBe('number')
  })

  it('float -> number', () => {
    expect(friendlyType(rec({ raw_type: 'float' }))).toBe('number')
  })

  it('string -> text', () => {
    expect(friendlyType(rec({ raw_type: 'string' }))).toBe('text')
  })

  it('QWCL-shaped record (raw_type present, no values) never yields choice', () => {
    for (const rt of ['boolean', 'integer', 'float', 'string']) {
      expect(friendlyType(rec({ raw_type: rt }))).not.toBe('choice')
    }
  })
})

describe('friendlyType -- no raw_type (commands/macros/cmdline_params; ktx/mvdsv/qtv/qwfwd)', () => {
  it('empty record -> undefined', () => {
    expect(friendlyType(rec({}))).toBeUndefined()
  })

  it('record with only name/values but no raw_type -> undefined', () => {
    // values without raw_type: rule 1 fires first (raw_type absent -> undefined)
    expect(friendlyType(rec({ values: [{ name: '0' }] }))).toBeUndefined()
  })
})
