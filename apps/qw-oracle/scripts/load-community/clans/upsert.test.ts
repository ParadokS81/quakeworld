// apps/qw-oracle/scripts/load-community/clans/upsert.test.ts
//
// Integration test: hits qw_oracle_test (per CLAUDE.md). Refuses to run against
// a non-test DB to prevent accidental clobbering of dev data.

import { describe, expect, test, beforeEach, afterAll } from 'bun:test';
import { db } from '../../../shared/db.ts';
import { upsertClan } from './upsert.ts';
import type { ParsedClan } from './parse.ts';
import type { ClanFlags } from './flags.ts';

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

function makeClan(overrides: Partial<ParsedClan> = {}): ParsedClan {
  return {
    slug: 'test-upsert-fresh-c001',
    title: 'TestClan',
    prefix: null,
    nationality: null,
    nationality_iso: null,
    founded_year: null,
    founded_month: null,
    founded_day: null,
    founded_by: null,
    disbanded: null,
    status: 'unknown',
    irc_channel: null,
    irc_network: null,
    website: null,
    source_template: 'none',
    source_categories: [],
    wiki_revision_id: 12345,
    wiki_fetched_at: '2026-05-04T20:02:42Z',
    narrative_intro: '',
    history_section: '',
    info_section: '',
    achievements_section: '',
    members_section: '',
    see_also_section: '',
    external_links_section: '',
    narrative_byte_length: 0,
    has_history: false,
    achievements_count: 0,
    ...overrides,
  };
}

function makeFlags(overrides: Partial<ClanFlags> = {}): ClanFlags {
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
  'test-upsert-fresh-c001',
  'test-upsert-idempotent-c002',
  'test-upsert-text-array-c003',
  'test-upsert-status-check-c004',
  'Slackers',
  'slackers',
  'test-upsert-4on4team-c006',
];

async function cleanupSlugs(slugs: string[]): Promise<void> {
  for (const slug of slugs) {
    await db`DELETE FROM community.clans WHERE slug = ${slug}`;
  }
}

afterAll(async () => {
  await cleanupSlugs(ALL_TEST_SLUGS);
});

// ---------------------------------------------------------------------------
// Test 1: Fresh insert
// ---------------------------------------------------------------------------

describe('upsertClan -- fresh insert', () => {
  const SLUG = 'test-upsert-fresh-c001';

  beforeEach(async () => {
    await db`DELETE FROM community.clans WHERE slug = ${SLUG}`;
  });

  test('inserts a new clan row with all fields', async () => {
    const c = makeClan({
      slug: SLUG,
      prefix: '[SR]',
      nationality: 'Swedish',
      nationality_iso: 'se',
      founded_year: 1997,
      founded_month: 4,
      status: 'Inactive',
      source_template: 'clan_info',
    });
    // source_template must be consistent between ParsedClan and ClanFlags;
    // flags.source_template is what actually lands in the DB row (upsert uses f.source_template).
    const f = makeFlags({ is_substantive: true, is_stub: false, source_template: 'clan_info' });

    await upsertClan(c, f);

    const rows = await db<{ slug: string; prefix: string | null; is_substantive: boolean; source_template: string }[]>`
      SELECT slug, prefix, nationality, nationality_iso, founded_year, is_substantive, source_template
      FROM community.clans
      WHERE slug = ${SLUG}
    `;

    expect(rows.length).toBe(1);
    const row = rows[0]!;
    expect(row.slug).toBe(SLUG);
    expect(row.prefix).toBe('[SR]');
    expect(row.is_substantive).toBe(true);
    expect(row.source_template).toBe('clan_info');
  });
});

// ---------------------------------------------------------------------------
// Test 2: Re-insert updates idempotently
// ---------------------------------------------------------------------------

describe('upsertClan -- idempotent re-upsert', () => {
  const SLUG = 'test-upsert-idempotent-c002';

  beforeEach(async () => {
    await db`DELETE FROM community.clans WHERE slug = ${SLUG}`;
  });

  test('second call updates prefix; row count stays 1', async () => {
    const c1 = makeClan({ slug: SLUG, prefix: '[OLD]' });
    await upsertClan(c1, makeFlags());

    const c2 = makeClan({ slug: SLUG, prefix: '[NEW]' });
    await upsertClan(c2, makeFlags());

    const rows = await db<{ prefix: string | null }[]>`
      SELECT prefix FROM community.clans WHERE slug = ${SLUG}
    `;
    expect(rows.length).toBe(1);
    expect(rows[0]!.prefix).toBe('[NEW]');
  });
});

// ---------------------------------------------------------------------------
// Test 3: TEXT[] binding gate
// ---------------------------------------------------------------------------

describe('upsertClan -- TEXT[] binding gate', () => {
  const SLUG = 'test-upsert-text-array-c003';

  beforeEach(async () => {
    await db`DELETE FROM community.clans WHERE slug = ${SLUG}`;
  });

  test('source_categories binds as proper TEXT[] (not a string scalar)', async () => {
    const c = makeClan({
      slug: SLUG,
      source_categories: ['Category:Clans', 'Category:Swedish Clans'],
    });

    await upsertClan(c, makeFlags());

    const rows = await db<{ len: number | null; first_elem: string }[]>`
      SELECT
        array_length(source_categories, 1) AS len,
        source_categories[1]               AS first_elem
      FROM community.clans
      WHERE slug = ${SLUG}
    `;

    expect(rows.length).toBe(1);
    const row = rows[0]!;

    // FAIL condition: if len is null or 1, or first_elem looks like a Postgres
    // literal (e.g. '{Category:Clans,Category:Swedish Clans}'), the binding is broken.
    if (row.len === null || row.len === 1) {
      console.error(
        'TEXT[] binding FAILED: array_length returned',
        row.len,
        '-- first_elem value:',
        row.first_elem,
        '-- source_categories bound as string scalar instead of TEXT[].',
        'Switch to sql.array() binding.',
      );
    }

    expect(row.len).toBe(2);
    // first_elem is 1-indexed in Postgres; just assert it is a plain string (not a literal).
    expect(row.first_elem).not.toMatch(/^\{/);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Status CHECK constraint
// ---------------------------------------------------------------------------

describe('upsertClan -- status CHECK constraint', () => {
  const SLUG = 'test-upsert-status-check-c004';

  beforeEach(async () => {
    await db`DELETE FROM community.clans WHERE slug = ${SLUG}`;
  });

  test('valid status "Active" inserts successfully', async () => {
    const c = makeClan({ slug: SLUG, status: 'Active' });
    await expect(upsertClan(c, makeFlags())).resolves.toBeUndefined();

    const rows = await db`SELECT status FROM community.clans WHERE slug = ${SLUG}`;
    expect(rows.length).toBe(1);
    expect((rows[0] as { status: string }).status).toBe('Active');
  });

  test('invalid status throws; no row persists', async () => {
    // Cast to bypass TS type system -- we are intentionally testing the DB constraint.
    const c = makeClan({ slug: SLUG, status: 'BogusStatus' as 'Active' });
    await expect(upsertClan(c, makeFlags())).rejects.toThrow();

    const rows = await db`SELECT count(*) AS cnt FROM community.clans WHERE slug = ${SLUG}`;
    expect(Number((rows[0] as { cnt: string }).cnt)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 5: F7 case-sensitive PK
// ---------------------------------------------------------------------------

describe('upsertClan -- F7 case-sensitive PK', () => {
  beforeEach(async () => {
    await db`DELETE FROM community.clans WHERE slug IN ('Slackers', 'slackers')`;
  });

  test('Slackers and slackers are distinct rows', async () => {
    const c1 = makeClan({ slug: 'Slackers', title: 'Slackers' });
    const c2 = makeClan({ slug: 'slackers', title: 'slackers' });

    await upsertClan(c1, makeFlags());
    await upsertClan(c2, makeFlags());

    const rows = await db<{ cnt: string }[]>`
      SELECT count(*) AS cnt
      FROM community.clans
      WHERE LOWER(slug) = 'slackers'
    `;
    expect(Number(rows[0]!.cnt)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test 6: F10 infobox_4on4team direct insert (regression gate)
// ---------------------------------------------------------------------------

describe('upsertClan -- F10 infobox_4on4team source_template', () => {
  const SLUG = 'test-upsert-4on4team-c006';

  beforeEach(async () => {
    await db`DELETE FROM community.clans WHERE slug = ${SLUG}`;
  });

  test('source_template="infobox_4on4team" persists; CHECK constraint accepts it', async () => {
    const c = makeClan({
      slug: SLUG,
      source_template: 'infobox_4on4team',
    });
    const f = makeFlags({ source_template: 'infobox_4on4team' });

    await expect(upsertClan(c, f)).resolves.toBeUndefined();

    const rows = await db<{ source_template: string }[]>`
      SELECT source_template FROM community.clans WHERE slug = ${SLUG}
    `;
    expect(rows.length).toBe(1);
    expect(rows[0]!.source_template).toBe('infobox_4on4team');
  });
});
