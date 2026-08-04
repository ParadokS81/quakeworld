// apps/qw-oracle/serve/mcp/src/tools/lookup-entity.test.ts
//
// Regression coverage for entity-record.ts's VERSION_TABLE wiring (F12,
// Phase 3 wave B drain): a match_event entity's current snapshot must come
// from match_event_versions, not the emptyVersion() fallback. Also pins the
// documented explicit-only contract (orientation.ts / index.ts type-param
// text) that match_event is excluded from the default bare-name search.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { lookupEntity } from './lookup-entity.ts';

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');

describe.skipIf(!HAS_DB)('lookup_entity (postgres-js)', () => {
  async function cleanup() {
    await db`DELETE FROM match_event_versions WHERE entity_id IN (
      SELECT id FROM entities WHERE canonical_id = 'ktx:match_event:death'
    )`;
    await db`DELETE FROM entities WHERE canonical_id = 'ktx:match_event:death'`;
  }

  beforeAll(async () => {
    await cleanup();
    // Fixture models the real KTX 'death' match_event row (ktxlog_0.1.xsd
    // deathtype complexType): entities row + its match_event_versions row.
    const [entityRow] = await db<{ id: number }[]>`
      INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, created_at, updated_at, description)
      VALUES ('ktx', 'match_event', 'death', 'ktx:match_event:death', 'head', 'head', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', null)
      RETURNING id
    `;
    await db`
      INSERT INTO match_event_versions (entity_id, version, event_name, complex_type, attributes_json, xsd_path, xsd_version, extracted_at)
      VALUES (
        ${entityRow!.id}, 'head', 'death', 'deathtype',
        ${db.json([
          { name: 'time', type: 'xs:decimal', constraint: null },
          { name: 'attacker', type: 'xs:string', constraint: null },
          { name: 'target', type: 'xs:string', constraint: null },
        ])},
        'resources/extralog/ktxlog_0.1.xsd', '0.1', '2026-01-01T00:00:00Z'
      )
    `;
  });

  afterAll(async () => {
    await cleanup();
  });

  test('match_event current snapshot is populated from match_event_versions, not emptyVersion()', async () => {
    const r = await lookupEntity({ name: 'death', project: 'ktx', type: 'match_event' });
    expect(r.results.length).toBe(1);
    const e = r.results[0]!;
    expect(e.type).toBe('match_event');
    expect(e.current.version).toBe('head');
    // help_desc/source_file/source_line have no column on match_event_versions
    // -- they must fall through to null, not throw.
    expect(e.current.help_desc).toBeNull();
    expect(e.current.source_file).toBeNull();
    // The real fields live in type_specific (fetchVersionData's catch-all).
    expect(e.current.type_specific.event_name).toBe('death');
    expect(e.current.type_specific.complex_type).toBe('deathtype');
    expect(Array.isArray(e.current.type_specific.attributes_json)).toBe(true);
    expect((e.current.type_specific.attributes_json as unknown[]).length).toBe(3);
  });

  test('bare (type-omitted) lookup excludes match_event -- explicit type required (F4)', async () => {
    const r = await lookupEntity({ name: 'death', project: 'ktx' });
    expect(r.results.length).toBe(0);
  });
});
