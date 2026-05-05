// apps/qw-oracle/scripts/load-community/players/upsert.test.ts
//
// Integration test: hits qw_oracle_test (per decisions.md D13). Refuses to run
// against a non-test DB to prevent an accidental `bun test` from clobbering
// dev data.

import { describe, expect, test, beforeEach, afterAll } from 'bun:test';
import { db } from '../../../shared/db.ts';
import { upsertPlayer } from './upsert.ts';
import type { ParsedPlayer } from './parse.ts';
import type { PlayerFlags } from './flags.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run upsert.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url ?? '<unset>'}`,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(overrides: Partial<ParsedPlayer> = {}): ParsedPlayer {
  return {
    slug: 'test-upsert-fresh-001',
    title: 'TestPlayer',
    display_name: 'TestPlayer',
    aliases: [],
    real_name: null,
    nationality: null,
    nationality_iso: null,
    current_clan: null,
    community_roles: [],
    status: 'Active',
    active_year_start: null,
    active_year_end: null,
    source_template: 'none',
    source_categories: [],
    wiki_revision_id: 12345,
    wiki_fetched_at: '2026-05-04T20:02:42Z',
    // Cross-link inputs (not stored in players row, but required by interface)
    clan_history: [],
    achievements: [],
    // Body fields (not stored in players row)
    narrative_intro: '',
    info_section_extras: '',
    quotes_section: '',
    trivia_section: '',
    media_section: '',
    gallery_section: '',
    see_also_section: '',
    external_links_section: '',
    mouse_settings_present: false,
    crosshair_present: false,
    gallery_image_count: 0,
    ...overrides,
  };
}

function makeFlags(overrides: Partial<PlayerFlags> = {}): PlayerFlags {
  return {
    is_substantive: false,
    has_note: false,
    is_stub: true,
    source_template: 'none',
    ...overrides,
  };
}

// Test slugs used across tests -- cleaned up in afterAll.
const ALL_TEST_SLUGS = [
  'test-upsert-fresh-001',
  'test-upsert-idempotent-002',
  'test-upsert-text-array-003',
  'test-upsert-empty-arrays-004',
  'test-upsert-status-check-005',
  'Acid_fi',
  'acid_fi',
];

async function cleanupSlugs(slugs: string[]): Promise<void> {
  for (const slug of slugs) {
    await db`DELETE FROM community.players WHERE slug = ${slug}`;
  }
}

afterAll(async () => {
  await cleanupSlugs(ALL_TEST_SLUGS);
});

// ---------------------------------------------------------------------------
// Test 1: Fresh insert
// ---------------------------------------------------------------------------

describe('upsertPlayer -- fresh insert', () => {
  const SLUG = 'test-upsert-fresh-001';

  beforeEach(async () => {
    await db`DELETE FROM community.players WHERE slug = ${SLUG}`;
  });

  test('inserts a new player row with all fields', async () => {
    const p = makePlayer({
      slug: SLUG,
      real_name: 'John Smith',
      nationality: 'Finnish',
      nationality_iso: 'fi',
      source_template: 'player_info',
    });
    // source_template must be consistent between ParsedPlayer and PlayerFlags;
    // flags.source_template is what actually lands in the DB row (upsert uses f.source_template).
    const f = makeFlags({ is_substantive: true, is_stub: false, source_template: 'player_info' });

    await upsertPlayer(p, f);

    const rows = await db<{ slug: string; real_name: string; is_substantive: boolean; source_template: string }[]>`
      SELECT slug, real_name, aliases, community_roles, source_categories, is_substantive, source_template
      FROM community.players
      WHERE slug = ${SLUG}
    `;

    expect(rows.length).toBe(1);
    const row = rows[0]!;
    expect(row.slug).toBe(SLUG);
    expect(row.real_name).toBe('John Smith');
    expect(row.is_substantive).toBe(true);
    expect(row.source_template).toBe('player_info');
  });
});

// ---------------------------------------------------------------------------
// Test 2: Re-insert updates idempotently
// ---------------------------------------------------------------------------

describe('upsertPlayer -- idempotent re-upsert', () => {
  const SLUG = 'test-upsert-idempotent-002';

  beforeEach(async () => {
    await db`DELETE FROM community.players WHERE slug = ${SLUG}`;
  });

  test('second call updates real_name; row count stays 1', async () => {
    const p1 = makePlayer({ slug: SLUG, real_name: 'Original Name' });
    await upsertPlayer(p1, makeFlags());

    const p2 = makePlayer({ slug: SLUG, real_name: 'Updated Name' });
    await upsertPlayer(p2, makeFlags());

    const rows = await db<{ real_name: string }[]>`
      SELECT real_name FROM community.players WHERE slug = ${SLUG}
    `;
    expect(rows.length).toBe(1);
    expect(rows[0]!.real_name).toBe('Updated Name');
  });
});

// ---------------------------------------------------------------------------
// Test 3: TEXT[] binding gate (load-bearing)
// ---------------------------------------------------------------------------

describe('upsertPlayer -- TEXT[] binding gate', () => {
  const SLUG = 'test-upsert-text-array-003';

  beforeEach(async () => {
    await db`DELETE FROM community.players WHERE slug = ${SLUG}`;
  });

  test('aliases binds as proper TEXT[] (not a string scalar)', async () => {
    const p = makePlayer({
      slug: SLUG,
      aliases: ['Critical', 'Crit2', 'Maarten'],
      community_roles: ['Trickery TDM League admin'],
    });

    await upsertPlayer(p, makeFlags());

    const rows = await db<{ len: number | null; contains_critical: boolean; first_alias: string }[]>`
      SELECT
        array_length(aliases, 1)             AS len,
        aliases @> ARRAY['Critical']::text[] AS contains_critical,
        aliases[1]                           AS first_alias
      FROM community.players
      WHERE slug = ${SLUG}
    `;

    expect(rows.length).toBe(1);
    const row = rows[0]!;

    // FAIL condition: if len is null or 1, or first_alias looks like a Postgres
    // literal (e.g. '{Critical,Crit2,Maarten}'), the binding is broken.
    if (row.len === null || row.len === 1) {
      console.error(
        'TEXT[] binding FAILED: array_length returned',
        row.len,
        '-- first_alias value:',
        row.first_alias,
        '-- aliases bound as string scalar instead of TEXT[].',
        'Switch to sql.array() binding.',
      );
    }

    expect(row.len).toBe(3);
    expect(row.contains_critical).toBe(true);
    // first_alias is 1-indexed in Postgres; value depends on array storage order.
    // Just assert it is a plain string (not a Postgres literal like '{...}').
    expect(row.first_alias).not.toMatch(/^\{/);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Empty arrays
// ---------------------------------------------------------------------------

describe('upsertPlayer -- empty arrays', () => {
  const SLUG = 'test-upsert-empty-arrays-004';

  beforeEach(async () => {
    await db`DELETE FROM community.players WHERE slug = ${SLUG}`;
  });

  test('empty aliases/community_roles/source_categories bind as empty arrays', async () => {
    const p = makePlayer({
      slug: SLUG,
      aliases: [],
      community_roles: [],
      source_categories: [],
    });

    await upsertPlayer(p, makeFlags());

    const rows = await db<{ aliases: string[] | null; alias_len: number | null }[]>`
      SELECT
        aliases,
        array_length(aliases, 1) AS alias_len
      FROM community.players
      WHERE slug = ${SLUG}
    `;

    expect(rows.length).toBe(1);
    const row = rows[0]!;
    // Postgres returns NULL for array_length of empty array -- that is correct.
    expect(row.alias_len).toBeNull();
    // postgres-js should return an empty array (not null) for an empty TEXT[].
    expect(Array.isArray(row.aliases)).toBe(true);
    expect((row.aliases as string[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Status CHECK constraint
// ---------------------------------------------------------------------------

describe('upsertPlayer -- status CHECK constraint', () => {
  const SLUG = 'test-upsert-status-check-005';

  beforeEach(async () => {
    await db`DELETE FROM community.players WHERE slug = ${SLUG}`;
  });

  test('valid status "Active" inserts successfully', async () => {
    const p = makePlayer({ slug: SLUG, status: 'Active' });
    await expect(upsertPlayer(p, makeFlags())).resolves.toBeUndefined();

    const rows = await db`SELECT status FROM community.players WHERE slug = ${SLUG}`;
    expect(rows.length).toBe(1);
    expect((rows[0] as { status: string }).status).toBe('Active');
  });

  test('invalid status throws; no row persists', async () => {
    // Cast to bypass TS type system -- we are intentionally testing the DB constraint.
    const p = makePlayer({ slug: SLUG, status: 'BogusValue' as 'Active' });
    await expect(upsertPlayer(p, makeFlags())).rejects.toThrow();

    const rows = await db`SELECT count(*) AS cnt FROM community.players WHERE slug = ${SLUG}`;
    expect(Number((rows[0] as { cnt: string }).cnt)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 6: F7 case-sensitive PK
// ---------------------------------------------------------------------------

describe('upsertPlayer -- F7 case-sensitive PK', () => {
  beforeEach(async () => {
    await db`DELETE FROM community.players WHERE slug IN ('Acid_fi', 'acid_fi')`;
  });

  test('Acid_fi and acid_fi are distinct rows', async () => {
    const p1 = makePlayer({ slug: 'Acid_fi', title: 'Acid_fi', display_name: 'Acid_fi' });
    const p2 = makePlayer({ slug: 'acid_fi', title: 'acid_fi', display_name: 'acid_fi' });

    await upsertPlayer(p1, makeFlags());
    await upsertPlayer(p2, makeFlags());

    const rows = await db<{ cnt: string }[]>`
      SELECT count(*) AS cnt
      FROM community.players
      WHERE LOWER(slug) = 'acid_fi'
    `;
    expect(Number(rows[0]!.cnt)).toBe(2);
  });
});
