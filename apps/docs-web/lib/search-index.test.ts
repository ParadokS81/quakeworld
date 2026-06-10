import { describe, it, expect } from 'vitest'
import { createSearcher, type SearchRecord } from './search-index'
import { buildSearchRecords } from './search-builder'

// Minimal fixture helper -- only the fields createSearcher needs.
const rec = (o: Partial<SearchRecord>): SearchRecord => ({
  id: o.id ?? `${o.codebase ?? 'ez'}:${o.type ?? 'cvar'}:${o.name ?? 'x'}`,
  name: o.name ?? 'x',
  codebase: o.codebase ?? 'ezquake',
  displayName: o.displayName ?? 'ezQuake',
  type: o.type ?? 'cvar',
  anchor: o.anchor ?? (o.name ?? 'x').toLowerCase(),
  url: o.url ?? `/${o.codebase ?? 'ezquake'}/${o.type ?? 'cvar'}#${(o.name ?? 'x').toLowerCase()}`,
  description: o.description,
  friendlyType: o.friendlyType,
})

// (a) Exact-name hit ranks first when boosted.
// Fixture: one record whose name is the query term, one whose name differs but
// whose description contains the query term. Name is boosted 3x, so the
// exact-name record must outscore the description-only record.
describe('createSearcher -- exact-name hit ranks first', () => {
  const records: SearchRecord[] = [
    rec({ id: 'ez:cvar:crosshaircolor', name: 'crosshaircolor', description: 'Sets the color of the crosshair.' }),
    rec({ id: 'ez:cvar:cl_crosshair', name: 'cl_crosshair', description: 'Enable or disable crosshaircolor display.' }),
  ]
  it('exact-name match comes before description-only match', () => {
    const search = createSearcher(records)
    const results = search('crosshaircolor')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('crosshaircolor')
  })
})

// (b) A description-only term finds the record whose description contains it.
describe('createSearcher -- description-only match', () => {
  const records: SearchRecord[] = [
    rec({ id: 'ez:cvar:r_drawflat', name: 'r_drawflat', description: 'Render all surfaces as flat-shaded polygons.' }),
    rec({ id: 'ez:cvar:cl_bob', name: 'cl_bob', description: 'Controls view bobbing.' }),
  ]
  it('description-only term finds the right record', () => {
    const search = createSearcher(records)
    const results = search('polygons')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('r_drawflat')
  })
})

// (c) Every returned result carries url === '/' + codebase + '/' + type + '#' + anchor
// with anchor === name.toLowerCase().
describe('createSearcher -- url and anchor consistency', () => {
  const records: SearchRecord[] = [
    rec({ id: 'ez:cvar:SV_Maxspeed', name: 'SV_Maxspeed', codebase: 'mvdsv', type: 'cvar',
          anchor: 'sv_maxspeed', url: '/mvdsv/cvar#sv_maxspeed', displayName: 'MVDSV' }),
    rec({ id: 'ktx:command:ready', name: 'ready', codebase: 'ktx', type: 'command',
          anchor: 'ready', url: '/ktx/command#ready', displayName: 'KTX' }),
  ]
  it('each result url equals /codebase/type#anchor and anchor equals name.toLowerCase()', () => {
    const search = createSearcher(records)
    // Use wildcard-style broad query that hits both
    const r1 = search('maxspeed')
    expect(r1.length).toBeGreaterThan(0)
    for (const r of r1) {
      expect(r.url).toBe(`/${r.codebase}/${r.type}#${r.anchor}`)
      expect(r.anchor).toBe(r.name.toLowerCase())
    }
    const r2 = search('ready')
    expect(r2.length).toBeGreaterThan(0)
    for (const r of r2) {
      expect(r.url).toBe(`/${r.codebase}/${r.type}#${r.anchor}`)
      expect(r.anchor).toBe(r.name.toLowerCase())
    }
  })
})

// (d) Empty string AND whitespace-only query each return [].
describe('createSearcher -- empty / whitespace query returns []', () => {
  const records: SearchRecord[] = [
    rec({ id: 'ez:cvar:gamma', name: 'gamma', description: 'Screen gamma.' }),
  ]
  const search = createSearcher(records)
  it('empty string returns []', () => {
    expect(search('')).toEqual([])
  })
  it('whitespace-only returns []', () => {
    expect(search('   ')).toEqual([])
  })
})

// (e) buildSearchRecords() over the live data dir: > 0 records; every record has
// non-empty name, id, anchor, url.
describe('buildSearchRecords -- live data smoke', () => {
  it('returns > 0 records and every record has non-empty name, id, anchor, url', () => {
    const records = buildSearchRecords()
    expect(records.length).toBeGreaterThan(0)
    for (const r of records) {
      expect(r.name).toBeTruthy()
      expect(r.id).toBeTruthy()
      expect(r.anchor).toBeTruthy()
      expect(r.url).toBeTruthy()
    }
  })
})
