import { describe, it, expect } from 'vitest'
import { buildGuideIndex, getGuideRefs, GUIDES_PORTAL_LIVE } from './guide-index'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'

function makeFixtureDir(notes: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'guide-index-test-'))
  for (const [name, content] of Object.entries(notes)) {
    writeFileSync(join(dir, name), content, 'utf-8')
  }
  return dir
}

describe('buildGuideIndex', () => {
  it('returns empty map for absent directory', () => {
    const idx = buildGuideIndex('/nonexistent/path')
    expect(idx.size).toBe(0)
  })

  it('returns empty map when no notes carry related_entities', () => {
    const dir = makeFixtureDir({
      'plain.md': '---\ntitle: "No entities"\nslug: plain\n---\n\nBody.',
    })
    const idx = buildGuideIndex(dir)
    expect(idx.size).toBe(0)
  })

  it('indexes a note that has related_entities', () => {
    const dir = makeFixtureDir({
      'weapon-scripts.md': [
        '---',
        'slug: weapon-scripts',
        'related_entities:',
        '  - ezquake:cvar:cl_weaponpreselect',
        '  - ezquake:command:weapon',
        '---',
        '',
        'Body.',
      ].join('\n'),
    })
    const idx = buildGuideIndex(dir)
    expect(idx.size).toBe(2)
    expect(idx.get('ezquake:cvar:cl_weaponpreselect')).toEqual([
      { slug: 'weapon-scripts', path: '/guides/weapon-scripts' }
    ])
  })

  it('drops commit-kind entries', () => {
    const dir = makeFixtureDir({
      'a.md': [
        '---',
        'slug: a',
        'related_entities:',
        '  - ezquake:commit:7c328aa4',
        '  - ezquake:cvar:sensitivity',
        '---',
      ].join('\n'),
    })
    const idx = buildGuideIndex(dir)
    expect(idx.has('ezquake:commit:7c328aa4')).toBe(false)
    expect(idx.has('ezquake:cvar:sensitivity')).toBe(true)
  })

  it('normalizes 4-segment entries to 3-segment keys', () => {
    const dir = makeFixtureDir({
      'b.md': [
        '---',
        'slug: b',
        'related_entities:',
        '  - mvdsv:info_key:w_rank:userinfo',
        '---',
      ].join('\n'),
    })
    const idx = buildGuideIndex(dir)
    // 4th segment ':userinfo' is dropped; key is 3 segments
    expect(idx.has('mvdsv:info_key:w_rank')).toBe(true)
    expect(idx.has('mvdsv:info_key:w_rank:userinfo')).toBe(false)
  })

  it('skips files starting with underscore', () => {
    const dir = makeFixtureDir({
      '_private.md': '---\nslug: private\nrelated_entities:\n  - ezquake:cvar:x\n---\n',
    })
    const idx = buildGuideIndex(dir)
    expect(idx.size).toBe(0)
  })

  it('accumulates multiple notes referencing the same entity', () => {
    const dir = makeFixtureDir({
      'note1.md': '---\nslug: note1\nrelated_entities:\n  - ezquake:cvar:sensitivity\n---\n',
      'note2.md': '---\nslug: note2\nrelated_entities:\n  - ezquake:cvar:sensitivity\n---\n',
    })
    const idx = buildGuideIndex(dir)
    const refs = idx.get('ezquake:cvar:sensitivity')
    expect(refs).toHaveLength(2)
  })
})

describe('getGuideRefs', () => {
  it('returns empty array for unknown entity', () => {
    const idx = new Map()
    expect(getGuideRefs(idx, 'ezquake', 'cvar', 'cl_weaponpreselect')).toEqual([])
  })
})

describe('GUIDES_PORTAL_LIVE (render suppression, D7/D21)', () => {
  it('is false in docs v1 -- the guides portal does not exist yet', () => {
    // This is the BY-CONSTRUCTION no-dead-links guarantee. While false, browse.ts
    // sets usedInGuides=[] for every entity even though buildGuideIndex resolves
    // real refs. Do NOT flip until the guides portal arc ships.
    expect(GUIDES_PORTAL_LIVE).toBe(false)
  })
})

describe('live corpus (proves the mechanism against real notes)', () => {
  it('builds a NON-EMPTY index from the real concept-notes dir', () => {
    // The default-arg path reads apps/qw-oracle/curated/concept-notes. The live
    // corpus carries 286 resolvable refs, so the index is non-empty -- which is
    // exactly WHY render must be suppressed (GUIDES_PORTAL_LIVE) rather than
    // relying on an empty corpus.
    const idx = buildGuideIndex()
    expect(idx.size).toBeGreaterThan(0)
    // Spot-check a ref verified present in apps/docs-web/data/ktx-cvar.json.
    expect(getGuideRefs(idx, 'ktx', 'cvar', 'k_mode').length).toBeGreaterThan(0)
  })
})
