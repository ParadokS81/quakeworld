import { describe, it, expect } from 'vitest'
import { buildCvarLinker } from './cvar-link'

describe('buildCvarLinker', () => {
  const names = ['cl_weaponhide', 'cl_weaponhide_axe', 'sensitivity', 'r_drawviewmodel']

  it('returns a single text segment when no cvar names appear', () => {
    const link = buildCvarLinker(names)
    expect(link('Nothing matches here.')).toEqual([
      { kind: 'text', text: 'Nothing matches here.' }
    ])
  })

  it('links a cvar name in the middle of text', () => {
    const link = buildCvarLinker(names)
    const result = link('Use sensitivity to adjust mouse speed.')
    expect(result).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'link', name: 'sensitivity', anchor: 'sensitivity' },
      { kind: 'text', text: ' to adjust mouse speed.' }
    ])
  })

  it('prefers the longer name over a shorter prefix at the same position', () => {
    // cl_weaponhide_axe starts with cl_weaponhide; the longer name must win.
    const link = buildCvarLinker(names)
    const result = link('Set cl_weaponhide_axe to 0.')
    expect(result.find((s) => s.kind === 'link' && s.name === 'cl_weaponhide_axe')).toBeTruthy()
    expect(result.find((s) => s.kind === 'link' && s.name === 'cl_weaponhide')).toBeUndefined()
  })

  it('does not link a name that is a substring of a non-word boundary token', () => {
    // "sensitivity_scale" contains "sensitivity" but the boundary check must block it.
    const link = buildCvarLinker(names)
    const result = link('Affects sensitivity_scale calculation.')
    expect(result.every((s) => s.kind === 'text')).toBe(true)
  })

  it('links multiple occurrences in one description', () => {
    const link = buildCvarLinker(names)
    const result = link('See r_drawviewmodel and sensitivity.')
    const links = result.filter((s) => s.kind === 'link')
    expect(links).toHaveLength(2)
    expect(links[0]).toMatchObject({ kind: 'link', name: 'r_drawviewmodel' })
    expect(links[1]).toMatchObject({ kind: 'link', name: 'sensitivity' })
  })

  it('returns a single text segment when entity-name set is empty', () => {
    const link = buildCvarLinker([])
    expect(link('some text')).toEqual([{ kind: 'text', text: 'some text' }])
  })

  it('anchor is the case-folded name (D22)', () => {
    const link = buildCvarLinker(['R_DrawViewmodel'])
    const result = link('See R_DrawViewmodel.')
    const seg = result.find((s) => s.kind === 'link')
    expect(seg).toMatchObject({ kind: 'link', name: 'R_DrawViewmodel', anchor: 'r_drawviewmodel' })
  })
})
