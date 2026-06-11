// Integration tests against the qw_oracle_test Postgres database.
// Run via `bun test` after DATABASE_URL is exported to a qw_oracle_test database.

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import postgres from 'postgres';
import { runMigrations } from '../../db/migrate.js';
import { loadGameplayFromArray, expectedCountsMismatch, type SeedFile } from './load-gameplay.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run load-gameplay.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const sql = postgres(url, { onnotice: () => {} });

// gameplay_entity_defs and gameplay_mechanics both FK into gameplay_sources,
// so CASCADE is required -- truncating gameplay_sources alone would violate
// the FK constraint on the child tables.
const fixture: SeedFile = {
  gameplay_source: {
    id: 'testsrc',
    display_name: 'Test Source',
    description: 'Fixture source for integration tests',
    source_root: '/research/repos/QuakeC-releases',
  },
  monsters: [
    {
      name: 'shambler',
      source_ref: '/research/repos/QuakeC-releases/progs/shambler.qc:397',
      props: {
        health: 600,
        health_source_ref: '/research/repos/QuakeC-releases/progs/shambler.qc:397',
      },
    },
    {
      name: 'ogre',
      source_ref: '/research/repos/QuakeC-releases/progs/ogre.qc:502',
      props: {
        health: 200,
        health_source_ref: '/research/repos/QuakeC-releases/progs/ogre.qc:502',
      },
    },
  ],
  weapons: [
    { name: 'test_weapon', source_ref: 'weapons.qc:1' },
  ],
  projectiles: [],
  items: [],
  mechanics: {
    // 1 constant row -> total mechanics = 1, which matches expected_counts below
    constants: [{ name: 'test_constant', value_numeric: 1, source_ref: 'defs.qc:1' }],
    env_hazards: [],
    player_stats: [],
    powerup_behaviors: [],
    armor_models: [],
    death_rules: [],
    spawn_rules: [],
    dm_mode_rules: [],
  },
  // 2 monsters + 1 weapon = 3 entities; 1 constant = 1 mechanic
  expected_counts: { entities: 3, mechanics: 1 },
};

describe('load-gameplay', () => {
  beforeEach(async () => {
    await runMigrations(sql);
    await sql`TRUNCATE gameplay_sources, gameplay_entity_defs, gameplay_mechanics RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await sql.end();
  });

  it('loads monsters as kind=monster with health in props_json', async () => {
    await loadGameplayFromArray(sql, fixture);
    const rows = await sql`
      SELECT kind, name, props_json FROM gameplay_entity_defs
      WHERE gameplay_source_id = 'testsrc' AND kind = 'monster'
      ORDER BY name
    `;
    expect(rows.length).toBe(2);
    expect(rows[0].name).toBe('ogre');
    expect((rows[0].props_json as { health: number }).health).toBe(200);
    expect(rows[1].name).toBe('shambler');
    expect((rows[1].props_json as { health: number }).health).toBe(600);
  });

  it('expectedCountsMismatch returns null when counts match', async () => {
    const result = await loadGameplayFromArray(sql, fixture);
    expect(expectedCountsMismatch(result)).toBeNull();
  });

  it('expectedCountsMismatch returns a message when counts mismatch', async () => {
    const wrong = { ...fixture, expected_counts: { entities: 99, mechanics: 99 } };
    const result = await loadGameplayFromArray(sql, wrong);
    expect(expectedCountsMismatch(result)).not.toBeNull();
  });

  it('loadGameplayFromArray throws when expected_counts is missing', async () => {
    const noGate = { ...fixture } as unknown as Record<string, unknown>;
    delete noGate.expected_counts;
    await expect(loadGameplayFromArray(sql, noGate as SeedFile)).rejects.toThrow('expected_counts');
  });

  it('double load produces equal totals (idempotency)', async () => {
    const first = await loadGameplayFromArray(sql, fixture);
    const second = await loadGameplayFromArray(sql, fixture);
    expect(second.total.entities).toBe(first.total.entities);
    expect(second.total.mechanics).toBe(first.total.mechanics);
  });

  it('entity-only seed with no mechanics key loads cleanly', async () => {
    const entityOnly: SeedFile = {
      ...fixture,
      mechanics: undefined,
      expected_counts: { entities: 3, mechanics: 0 },
    };
    const result = await loadGameplayFromArray(sql, entityOnly);
    expect(result.total.mechanics).toBe(0);
    expect(expectedCountsMismatch(result)).toBeNull();
  });
});
