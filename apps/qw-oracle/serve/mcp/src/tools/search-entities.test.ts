// apps/qw-oracle/serve/mcp/src/tools/search-entities.test.ts
//
// Name leg of search_entities. Regression: the lexical leg only read
// description_tsv and the semantic leg only description_embedding, so a query
// that IS an entity's name (pm_ktjump, smackdown) surfaced it only by luck, and
// an entity with no description (about a quarter of the user-facing rows) was
// unreachable. Fixtures carry no embedding and, where it matters, no
// description, so only the name leg can find them. Needs qw_oracle_test; the
// semantic leg runs too when VOYAGE_API_KEY is set (it finds nothing here --
// no fixture has an embedding).

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { searchEntities } from './search-entities.ts';

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');

// [project, type, name, description] -- `zz` words so nothing else matches.
const FIXTURES: [string, string, string, string | null][] = [
  ['ezquake', 'cvar', 'pm_zzjump', 'Keeps jump height consistent while the player is still on the ground.'],
  ['fte', 'cvar', 'pm_zzjump', null],
  ['ezquake', 'ruleset', 'zzsmack', null],
  ['ezquake', 'cvar', 'zzsmack_helper', null],
  ['ezquake', 'cvar', 'zzother', 'Related to zzsmack rulesets.'],
  // six names carry `zzcommon`: shared vocabulary, not a distinctive word
  ['ezquake', 'cvar', 'zzcommon', null],
  ...['a', 'b', 'c', 'd', 'e'].map((x): [string, string, string, null] => ['ezquake', 'cvar', `zzcommon_${x}`, null]),
  ['ezquake', 'command', '+zzhold', null],
  ['ezquake', 'command', '-zzhold', null],
  ['qwcl', 'cmdline_param', '-zzflag', null],
  ['ezquake', 'cvar', 'zzbob_scale', 'Controls the screen wobble amplitude.'],
];
const ids = FIXTURES.map(([project, type, name]) => `${project}:${type}:${name}`);

describe.skipIf(!HAS_DB)('search_entities name leg (postgres-js)', () => {
  const found = async (args: Parameters<typeof searchEntities>[0]) =>
    (await searchEntities(args)).results.map((r) => r.id);

  async function cleanup() {
    await db`DELETE FROM entities WHERE canonical_id IN ${db(ids)}`;
  }

  beforeAll(async () => {
    await cleanup();
    for (const [project, type, name, description] of FIXTURES) {
      await db`
        INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, created_at, updated_at, description)
        VALUES (${project}, ${type}, ${name}, ${`${project}:${type}:${name}`}, 'head', 'head',
                '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', ${description})
      `;
    }
  });

  afterAll(cleanup);

  test('finds a cvar by its exact name although no description mentions it', async () => {
    const r = await found({ query: 'pm_zzjump' });
    expect(r).toContain('ezquake:cvar:pm_zzjump');
    expect(r).toContain('fte:cvar:pm_zzjump');
  });

  test('finds a description-less entity, and the name inside a longer query', async () => {
    const r = await searchEntities({ query: 'zzsmack ruleset restrictions' });
    expect(r.results.map((e) => e.id)).toContain('ezquake:ruleset:zzsmack');
    expect(r.match_quality).not.toBe('none');
  });

  test('a one-word query ranks the exact name above partial-name and description hits', async () => {
    // zzother mentions zzsmack in its description (lexical hit), zzsmack_helper
    // only contains it in its name. The ruleset IS zzsmack and has no
    // description at all, so only its two name votes can put it first.
    expect(await found({ query: 'zzsmack' })).toEqual([
      'ezquake:ruleset:zzsmack', 'ezquake:cvar:zzother', 'ezquake:cvar:zzsmack_helper',
    ]);
  });

  test('in a longer query only a word that IS a name counts, not a word inside a name', async () => {
    // zzsmack_helper contains the word but is not named by it
    expect(await found({ query: 'zzsmack restrictions' })).toEqual(['ezquake:ruleset:zzsmack']);
  });

  test('in a longer query a word shared by many names does not name an entity', async () => {
    expect(await found({ query: 'zzcommon restrictions' })).toEqual([]);
    // as a one-word query it is a name lookup again, exact name first
    expect((await found({ query: 'zzcommon' }))[0]).toBe('ezquake:cvar:zzcommon');
  });

  test('name match is case-insensitive and also matches a partial name', async () => {
    expect(await found({ query: 'PM_ZZJUMP' })).toContain('ezquake:cvar:pm_zzjump');
    expect(await found({ query: 'zzjump' })).toContain('fte:cvar:pm_zzjump');
  });

  test('respects the project and type filters', async () => {
    expect(await found({ query: 'pm_zzjump', project: 'fte' })).toEqual(['fte:cvar:pm_zzjump']);
    expect(await found({ query: 'zzsmack', type: 'ruleset' })).toEqual(['ezquake:ruleset:zzsmack']);
    expect(await found({ query: 'zzsmack', type: 'cvar' })).toEqual(['ezquake:cvar:zzother', 'ezquake:cvar:zzsmack_helper']);
  });

  test('a leading + or - is honoured on an exact hit and ignored for the sibling', async () => {
    expect(await found({ query: '+zzhold' })).toEqual(['ezquake:command:+zzhold', 'ezquake:command:-zzhold']);
    // type-scoped: the description leg reads a leading '-' as "NOT word" and
    // matches every row, which would bury the exact hit in unrelated ones
    expect(await found({ query: '-zzflag', type: 'cmdline_param' })).toEqual(['qwcl:cmdline_param:-zzflag']);
    expect((await found({ query: 'zzhold' })).sort()).toEqual(['ezquake:command:+zzhold', 'ezquake:command:-zzhold']);
  });

  test('description matches still work (lexical leg untouched)', async () => {
    expect(await found({ query: 'screen wobble amplitude' })).toContain('ezquake:cvar:zzbob_scale');
  });
});
