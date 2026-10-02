// apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.test.ts
//
// Word matching for search_gameplay_entities. Same defect as search_mechanics:
// "rocket launcher" matched nothing because the stored name is
// rocket_launcher. Own fixture source ('wm-test'), `zz`-prefixed words.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { searchGameplayEntities } from './search-gameplay-entities.ts';

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');
const SRC = 'wm-test';

describe.skipIf(!HAS_DB)('search_gameplay_entities word matching (postgres-js)', () => {
  async function cleanup() {
    await db`DELETE FROM gameplay_entity_defs WHERE gameplay_source_id = ${SRC}`;
    await db`DELETE FROM gameplay_sources WHERE id = ${SRC}`;
  }

  const names = async (query: string) =>
    (await searchGameplayEntities({ query, gameplay_source: SRC })).results.map((r) => `${r.kind}:${r.name}`);

  beforeAll(async () => {
    await cleanup();
    await db`INSERT INTO gameplay_sources (id, display_name, description, source_root) VALUES (${SRC}, 'wm', 'fixture', 'x')`;
    await db`
      INSERT INTO gameplay_entity_defs (gameplay_source_id, kind, name, classname, ruleset_gate_json, source_ref, props_json) VALUES
        (${SRC}, 'weapon', 'zz_rocket_launcher', 'weapon_zzrocketlauncher', '{}', 'x', '{}'),
        (${SRC}, 'item', 'pickup_zz_rocket_launcher', 'weapon_zzrocketlauncher', '{}', 'x', '{}'),
        (${SRC}, 'item', 'zz_yellow_armor', 'item_armor2', '{}', 'x', '{}'),
        (${SRC}, 'item', 'aaa_classname_only', 'zzfoo', '{}', 'x', '{}'),
        (${SRC}, 'weapon', 'zzfoo_name_hit', null, '{}', 'x', '{}')
    `;
  });

  afterAll(cleanup);

  test('a space-separated name finds the underscore-separated row', async () => {
    expect(await names('zz rocket launcher')).toEqual(['item:pickup_zz_rocket_launcher', 'weapon:zz_rocket_launcher']);
    expect(await names('ZZ yellow armor')).toEqual(['item:zz_yellow_armor']);
  });

  test('words may be split across name and classname', async () => {
    expect(await names('yellow item_armor2')).toEqual(['item:zz_yellow_armor']);
  });

  test('every word is required', async () => {
    expect(await names('zz rocket unrelatedword')).toEqual([]);
  });

  test('orders name hits before classname hits', async () => {
    // kind order alone would put the item row first
    expect(await names('zzfoo')).toEqual(['weapon:zzfoo_name_hit', 'item:aaa_classname_only']);
  });
});
