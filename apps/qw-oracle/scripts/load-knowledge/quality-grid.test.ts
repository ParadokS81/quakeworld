// Integration tests against the qw_oracle_test Postgres database (D13).

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { runMigrations } from '../../db/migrate.js';
import {
  makeFloorCountProbe,
  makeFloorSourceStateProbe,
  makeGameplayKindProbe,
  probeJsonbNotStrings,
  probeRuntimeFidelityShape,
} from './quality-grid.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run quality-grid.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const sql = postgres(url, { onnotice: () => {} });

async function seed(): Promise<void> {
  await runMigrations(sql);
  // TRUNCATE only the tables this test touches; CASCADE picks up FK dependencies
  // (per-version tables, transitions, etc.) so re-runs start from a clean slate.
  await sql`TRUNCATE entities RESTART IDENTITY CASCADE`;
  await sql`TRUNCATE versions RESTART IDENTITY CASCADE`;
  const now = new Date().toISOString();
  // Seed a versions row so quality-grid probes that JOIN versions don't return
  // empty (the probes themselves only count entities, but we want the test
  // schema to look like a real load).
  await sql`
    INSERT INTO versions (project, version, commit_sha, ordinal, extracted_at)
    VALUES
      ('fte', 'build-6698', 'abc', 6698, ${now}),
      ('ezquake', 'head', 'def', 999999, ${now})
  `;
  await sql`
    INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
    VALUES
      ('fte', 'cvar', 'cv_one', 'fte:cvar:cv_one', 'source_backed', 'build-6698', 'build-6698', ${now}, ${now}),
      ('fte', 'cvar', 'cv_two', 'fte:cvar:cv_two', 'source_backed', 'build-6698', 'build-6698', ${now}, ${now}),
      ('fte', 'command', 'cmd_one', 'fte:command:cmd_one', 'source_backed', 'build-6698', 'build-6698', ${now}, ${now}),
      ('ezquake', 'cvar', 'cv_three', 'ezquake:cvar:cv_three', 'doc_only', 'head', 'head', ${now}, ${now})
  `;
}

describe('makeFloorCountProbe', () => {
  beforeEach(async () => { await seed(); });

  it('returns PASS when count matches expected', async () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
    expect(result.count).toBe(2);
  });

  it('returns FAIL when count differs from expected', async () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 99);
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('FAIL');
    expect(result.count).toBe(2);
  });

  it('skips when project does not match the probe project', async () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = await probe.run({ sql, project: 'ezquake' });
    expect(result.status).toBe('PASS');
    expect(result.summary).toMatch(/skipped/);
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    expect(probe.name).toBe('F1.fte.floor.cvar_count');
    expect(probe.family).toBe('regression');
  });
});

describe('makeFloorSourceStateProbe', () => {
  beforeEach(async () => { await seed(); });

  it('returns PASS when source_state distribution matches', async () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
  });

  it('returns FAIL when source_state distribution differs', async () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 1, doc_only: 1 });
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('FAIL');
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    expect(probe.name).toBe('F1.fte.floor.cvar_source_state');
    expect(probe.family).toBe('regression');
  });
});

describe('makeGameplayKindProbe', () => {
  beforeEach(async () => { await seed(); });

  it('uses canonical probe name', () => {
    const probe = makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27);
    expect(probe.name).toBe('F1.ktx.gameplay_kind.game_mode_count');
    expect(probe.family).toBe('regression');
  });

  it('skips when project does not match the probe gameplay_source_id', async () => {
    const probe = makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27);
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
    expect(result.summary).toMatch(/skipped/);
  });
});

// arc: enforce-L1-runtime-truth -- Track A/B shape probes (Task 4 / F1.runtime_fidelity_shape)
//
// Helper: look up the entity id for the ezquake cvar cv_three (seeded by seed())
// so we can insert cvar_versions / command_versions rows that satisfy the FK.
// cv_three is a cvar; we insert an additional command entity for command tests.
async function seedTrackABEntities(now: string): Promise<{ cvarEntityId: number; cmdEntityId: number }> {
  // Insert an ezquake command entity for Track-A/B command_versions tests.
  await sql`
    INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
    VALUES ('ezquake', 'command', 'cmd_track_test', 'ezquake:command:cmd_track_test', 'source_backed', 'head', 'head', ${now}, ${now})
  `;
  const cvarRows = await sql<{ id: number }[]>`
    SELECT id FROM entities WHERE canonical_id = 'ezquake:cvar:cv_three'
  `;
  const cmdRows = await sql<{ id: number }[]>`
    SELECT id FROM entities WHERE canonical_id = 'ezquake:command:cmd_track_test'
  `;
  const cvarEntityId = cvarRows[0]!.id;
  const cmdEntityId = cmdRows[0]!.id;
  return { cvarEntityId, cmdEntityId };
}

// Well-formed Track-A (callgraph) payload for cvar_versions.
const WELL_FORMED_TRACK_A_CALLGRAPH = {
  conclusion: 'genuine-dead',
  evidence: {
    feeder: 'callgraph',
    per_variant: { client: 'unreachable', server: 'unreachable', win: 'not-compiled', apple: 'not-compiled' },
    address_taken_residue: false,
  },
  dump_confirmation: 'high-confidence-generalized',
};

// Well-formed Track-A (commented-register) payload for command_versions.
const WELL_FORMED_TRACK_A_COMMENTED = {
  conclusion: 'build-excluded',
  evidence: {
    feeder: 'commented-register',
    register_site: { source_file: 'src/cl_main.c', source_line: 42 },
  },
  dump_confirmation: 'high-confidence-generalized',
};

// Well-formed Track-B payload for command_versions.
const WELL_FORMED_TRACK_B = {
  conclusion: 'bare-command',
  evidence: {
    hud_element: 'hud_ammo',
    hud_family: 'bare',
    registration_api: 'Cmd_AddCommand',
    handler_fn: 'HUD_Func_f',
    site: { source_file: 'src/hud.c', source_line: 77 },
  },
  dump_confirmation: 'high-confidence-generalized',
};

describe('probeRuntimeFidelityShape', () => {
  beforeEach(async () => { await seed(); });

  it('PASS -- well-formed Track-A callgraph + commented-register rows + Track-B row', async () => {
    const now = new Date().toISOString();
    const { cvarEntityId, cmdEntityId } = await seedTrackABEntities(now);

    // cvar_versions: well-formed Track-A callgraph
    await sql`
      INSERT INTO cvar_versions (entity_id, version, extracted_at, server_only, track_a_reachability)
      VALUES (${cvarEntityId}, 'head', ${now}, false, ${sql.json(WELL_FORMED_TRACK_A_CALLGRAPH)})
    `;
    // command_versions: well-formed Track-A commented-register
    await sql`
      INSERT INTO command_versions (entity_id, version, extracted_at, track_a_reachability, track_b_hud_recovery)
      VALUES (${cmdEntityId}, 'head', ${now}, ${sql.json(WELL_FORMED_TRACK_A_COMMENTED)}, ${sql.json(WELL_FORMED_TRACK_B)})
    `;

    const result = await probeRuntimeFidelityShape({ sql, project: 'ezquake' });
    expect(result.status).toBe('PASS');
    expect(result.count).toBe(0);
  });

  it('FAIL -- cross-track blend: track_a_reachability carries Track-B evidence keys (hud_element)', async () => {
    // D12 blend guard: a track_a_reachability whose evidence has hud_element is an offender.
    const now = new Date().toISOString();
    const { cvarEntityId } = await seedTrackABEntities(now);

    const blendedTrackA = {
      conclusion: 'genuine-dead',
      evidence: {
        feeder: 'callgraph',
        per_variant: { client: 'unreachable', server: 'unreachable', win: 'not-compiled', apple: 'not-compiled' },
        address_taken_residue: false,
        // Track-B key smuggled into Track-A evidence -- the D12 blend offender
        hud_element: 'hud_ammo',
        hud_family: 'bare',
      },
      dump_confirmation: 'high-confidence-generalized',
    };
    await sql`
      INSERT INTO cvar_versions (entity_id, version, extracted_at, server_only, track_a_reachability)
      VALUES (${cvarEntityId}, 'head', ${now}, false, ${sql.json(blendedTrackA)})
    `;

    const result = await probeRuntimeFidelityShape({ sql, project: 'ezquake' });
    expect(result.status).toBe('FAIL');
    expect(result.count).toBeGreaterThan(0);
  });

  it('FAIL -- both-columns-as-one: single column value carries both Track-A and Track-B evidence keys', async () => {
    // D12: evidence has both feeder/per_variant (Track-A) AND hud_element/hud_family (Track-B).
    // This is the "both-columns-populated-as-one" shape -- a single evidence blob with both tracks merged.
    const now = new Date().toISOString();
    const { cmdEntityId } = await seedTrackABEntities(now);

    const bothTracksPayload = {
      conclusion: 'genuine-dead',
      evidence: {
        feeder: 'callgraph',
        per_variant: { client: 'unreachable', server: 'unreachable', win: 'not-compiled', apple: 'not-compiled' },
        address_taken_residue: false,
        // Track-B keys also present in the same evidence object
        hud_element: 'hud_ammo',
        hud_family: 'bare',
      },
      dump_confirmation: 'high-confidence-generalized',
    };
    // Stored in track_a_reachability -- probe's Track-A blend guard catches it.
    await sql`
      INSERT INTO command_versions (entity_id, version, extracted_at, track_a_reachability)
      VALUES (${cmdEntityId}, 'head', ${now}, ${sql.json(bothTracksPayload)})
    `;

    const result = await probeRuntimeFidelityShape({ sql, project: 'ezquake' });
    expect(result.status).toBe('FAIL');
    expect(result.count).toBeGreaterThan(0);
  });

  it('skips (PASS) for non-ezquake projects', async () => {
    const result = await probeRuntimeFidelityShape({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
    expect(result.summary).toMatch(/skipped/);
  });

  // enforce-L1-runtime-truth Phase 4 / Task 4 -- the level-3-pinned-only
  // assertion Phase 3 deferred. The probe reads the SHIPPED
  // acceptance-validated-ezquake.json (same path the loader/D22 gate read)
  // and the test DB's oracle_meta pin. We derive the agreeing pin FROM the
  // shipped record's validation_commit so the test stays correct if the
  // arc re-pins (no hardcoded 40-char hash). pinsAgree is prefix-tolerant
  // (the record holds the SHORT token; oracle_meta holds the FULL hash),
  // so a record commit of '3f9e724f' agrees with an oracle_meta value of
  // '3f9e724f' + any suffix.
  function shippedValidatedCommit(): string {
    // scripts/load-knowledge/ -> scripts/ -> qw-oracle/ ; data/detection/.
    const here = dirname(fileURLToPath(import.meta.url));
    const recordPath = join(
      here, '..', '..', 'data', 'detection', 'acceptance-validated-ezquake.json',
    );
    const record = JSON.parse(readFileSync(recordPath, 'utf-8')) as {
      status: string;
      validation_commit: string;
    };
    if (record.status !== 'GREEN') {
      throw new Error(
        `Test precondition: acceptance-validated-ezquake.json must be GREEN ` +
        `to exercise the level-3-pinned-only leg; got status=${record.status}. ` +
        `Run accept-runtime-truth.py --stage all first.`,
      );
    }
    return record.validation_commit;
  }

  it('PASS -- dump-confirmed (level-3) row AT the pinned-dump version (head) + pin agrees', async () => {
    const now = new Date().toISOString();
    const { cvarEntityId } = await seedTrackABEntities(now);

    // oracle_meta pin agrees with the SHIPPED record's validation_commit
    // (prefix-tolerant: short token is a prefix of this padded value).
    const agreeingPin = shippedValidatedCommit() + 'a608e516040f02b9557808ff3efda53e';
    await sql`
      INSERT INTO oracle_meta (key, value) VALUES ('ezquake:source_repo_commit', ${agreeingPin})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;

    // A well-formed Track-A spine with dump_confirmation flipped to
    // 'dump-confirmed', stored at version='head' (the pinned-dump version).
    const lvl3AtPinned = { ...WELL_FORMED_TRACK_A_CALLGRAPH, dump_confirmation: 'dump-confirmed' };
    await sql`
      INSERT INTO cvar_versions (entity_id, version, extracted_at, server_only, track_a_reachability)
      VALUES (${cvarEntityId}, 'head', ${now}, false, ${sql.json(lvl3AtPinned)})
    `;

    const result = await probeRuntimeFidelityShape({ sql, project: 'ezquake' });
    expect(result.status).toBe('PASS');
    expect(result.count).toBe(0);
  });

  it('FAIL -- dump-confirmed (level-3) row at a NON-pinned version', async () => {
    const now = new Date().toISOString();
    const { cvarEntityId } = await seedTrackABEntities(now);

    const agreeingPin = shippedValidatedCommit() + 'a608e516040f02b9557808ff3efda53e';
    await sql`
      INSERT INTO oracle_meta (key, value) VALUES ('ezquake:source_repo_commit', ${agreeingPin})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;

    // Same well-formed shape, dump-confirmed, but at a version that is NOT
    // the pinned-dump version -> autonomous level-3 verdict that does not
    // trace to the validated pin -> offender (D19).
    const lvl3NonPinned = { ...WELL_FORMED_TRACK_A_CALLGRAPH, dump_confirmation: 'dump-confirmed' };
    await sql`
      INSERT INTO cvar_versions (entity_id, version, extracted_at, server_only, track_a_reachability)
      VALUES (${cvarEntityId}, 'v9.99-nonpinned', ${now}, false, ${sql.json(lvl3NonPinned)})
    `;

    const result = await probeRuntimeFidelityShape({ sql, project: 'ezquake' });
    expect(result.status).toBe('FAIL');
    expect(result.count).toBeGreaterThan(0);
    expect(result.summary).toMatch(/level-3-non-pinned/);
  });

  it('PASS -- Phase-3-style level-2 (high-confidence-generalized) row still passes (no regression)', async () => {
    const now = new Date().toISOString();
    const { cvarEntityId, cmdEntityId } = await seedTrackABEntities(now);

    // Pin set, but every row is level-2 -- the level-3-pinned-only leg must
    // not flag level-2 rows (it targets dump-confirmed ONLY); the Phase-3
    // shape leg must still pass these well-formed rows.
    const agreeingPin = shippedValidatedCommit() + 'a608e516040f02b9557808ff3efda53e';
    await sql`
      INSERT INTO oracle_meta (key, value) VALUES ('ezquake:source_repo_commit', ${agreeingPin})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    await sql`
      INSERT INTO cvar_versions (entity_id, version, extracted_at, server_only, track_a_reachability)
      VALUES (${cvarEntityId}, 'head', ${now}, false, ${sql.json(WELL_FORMED_TRACK_A_CALLGRAPH)})
    `;
    await sql`
      INSERT INTO command_versions (entity_id, version, extracted_at, track_a_reachability, track_b_hud_recovery)
      VALUES (${cmdEntityId}, 'head', ${now}, ${sql.json(WELL_FORMED_TRACK_A_COMMENTED)}, ${sql.json(WELL_FORMED_TRACK_B)})
    `;

    const result = await probeRuntimeFidelityShape({ sql, project: 'ezquake' });
    expect(result.status).toBe('PASS');
    expect(result.count).toBe(0);
  });
});

describe('probeJsonbNotStrings -- new track_a/b targets', () => {
  beforeEach(async () => { await seed(); });
  afterAll(async () => { await sql.end(); });

  it('PASS -- track_a_reachability stored as JSONB object (not string scalar)', async () => {
    const now = new Date().toISOString();
    const { cvarEntityId } = await seedTrackABEntities(now);
    await sql`
      INSERT INTO cvar_versions (entity_id, version, extracted_at, server_only, track_a_reachability)
      VALUES (${cvarEntityId}, 'head', ${now}, false, ${sql.json(WELL_FORMED_TRACK_A_CALLGRAPH)})
    `;

    const result = await probeJsonbNotStrings({ sql, project: 'ezquake' });
    expect(result.status).toBe('PASS');
  });

  it('FAIL -- track_a_reachability bound as JSON string scalar (jsonb_typeof = string)', async () => {
    // Regression case: the legacy SQLite-era bug stored JSON.stringify output as a JSONB string
    // scalar instead of a JSONB object. This verifies probeJsonbNotStrings detects it.
    const now = new Date().toISOString();
    const { cvarEntityId } = await seedTrackABEntities(now);
    // Deliberately store a JSONB string scalar (the regression shape).
    // postgres-js requires ::jsonb cast when binding a string literal as JSONB.
    await sql`
      INSERT INTO cvar_versions (entity_id, version, extracted_at, server_only, track_a_reachability)
      VALUES (${cvarEntityId}, 'head', ${now}, false, ${JSON.stringify(WELL_FORMED_TRACK_A_CALLGRAPH)}::jsonb)
    `;

    const result = await probeJsonbNotStrings({ sql, project: 'ezquake' });
    expect(result.status).toBe('FAIL');
    expect(result.count).toBeGreaterThan(0);
  });
});
