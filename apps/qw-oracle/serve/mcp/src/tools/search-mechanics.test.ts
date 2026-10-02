// apps/qw-oracle/serve/mcp/src/tools/search-mechanics.test.ts
//
// Word-matching + relevance order for search_mechanics. Regression for the
// whole-string ILIKE: "splash self damage radius" found nothing because no row
// holds that exact phrase, though one row carries all four words. Seeds its own
// source ('wm-test') in qw_oracle_test and deletes it in afterAll, so it does
// not touch the id1/ktx fixtures of ktx-serving.test.ts. Words are prefixed
// `zz` so no other fixture can match them.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { searchMechanics } from './search-mechanics.ts';

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');
const SRC = 'wm-test';

describe.skipIf(!HAS_DB)('search_mechanics word matching (postgres-js)', () => {
  async function cleanup() {
    await db`DELETE FROM gameplay_mechanics WHERE gameplay_source_id = ${SRC}`;
    await db`DELETE FROM gameplay_sources WHERE id = ${SRC}`;
  }

  const names = async (query: string, extra: Record<string, unknown> = {}) =>
    (await searchMechanics({ query, gameplay_source: SRC, ...extra })).results.map((r) => r.name);

  beforeAll(async () => {
    await cleanup();
    await db`INSERT INTO gameplay_sources (id, display_name, description, source_root) VALUES (${SRC}, 'wm', 'fixture', 'x')`;
    await db`
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, value_text, notes, source_ref) VALUES
        (${SRC}, 'constant', 'self_zzsplash_half_damage', null,
          'The radius damage you take from your own rocket is half what others take.', 'x'),
        (${SRC}, 'constant', 'zzsplash_falloff_gradient', 'points_eq_damage_minus_half_distance',
          'Radius damage is NOT flat; it falls off with distance from the blast.', 'x'),
        -- relevance order: alphabetical (aaa, bbb, zzz) is the reverse of name > value > notes
        (${SRC}, 'constant', 'aaa_notes_only', null, 'mentions zzrank in passing', 'x'),
        (${SRC}, 'constant', 'bbb_value_only', 'zzrank', null, 'x'),
        (${SRC}, 'constant', 'zzz_zzrank_name_hit', null, null, 'x'),
        (${SRC}, 'loc_macro', '%zzloc', null, null, 'x')
    `;
  });

  afterAll(cleanup);

  test('matches a multi-word query whose words sit in different columns', async () => {
    // name has zzsplash/self/damage; notes has radius. No row holds the phrase.
    expect(await names('zzsplash self damage radius')).toEqual(['self_zzsplash_half_damage']);
  });

  test('every word is required', async () => {
    expect(await names('zzsplash radius')).toEqual(['self_zzsplash_half_damage', 'zzsplash_falloff_gradient']);
    expect(await names('zzsplash self unrelatedword')).toEqual([]);
  });

  test('underscore and space are interchangeable, case does not matter', async () => {
    expect(await names('self zzsplash')).toEqual(['self_zzsplash_half_damage']);
    expect(await names('SELF_ZZSPLASH')).toEqual(['self_zzsplash_half_damage']);
  });

  test('orders name hits before value hits before notes hits', async () => {
    expect(await names('zzrank')).toEqual(['zzz_zzrank_name_hit', 'bbb_value_only', 'aaa_notes_only']);
  });

  test('without a query the listing keeps source/kind/name order', async () => {
    expect(await names('', { kind: 'constant' })).toEqual([
      'aaa_notes_only', 'bbb_value_only', 'self_zzsplash_half_damage', 'zzsplash_falloff_gradient', 'zzz_zzrank_name_hit',
    ]);
  });

  test('a typed % is a literal character, not a wildcard', async () => {
    expect(await names('%')).toEqual(['%zzloc']);
  });

  test('a query of only whitespace or quotes matches nothing rather than listing everything', async () => {
    expect(await names('   ')).toEqual([]);
    expect(await names('""')).toEqual([]);
  });

  test('a query nothing matches still returns none', async () => {
    const r = await searchMechanics({ query: 'zzabsent', gameplay_source: SRC });
    expect(r.results).toEqual([]);
    expect(r.match_quality).toBe('none');
  });
});
