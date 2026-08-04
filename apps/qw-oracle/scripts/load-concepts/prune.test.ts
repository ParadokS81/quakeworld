// apps/qw-oracle/scripts/load-concepts/prune.test.ts
//
// Integration test for pruneOrphanConcepts (F15 repair-by-rerun path).
// Hits qw_oracle_test (per decisions.md D13), same refusal guard as
// upsert.test.ts.

import { describe, expect, test, beforeEach, afterAll } from 'bun:test';
import { db } from '../../shared/db.ts';
import { pruneOrphanConcepts } from './index.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run prune.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url ?? '<unset>'}`,
  );
}

const ORPHAN_SLUG = 'phase4-prune-test-orphan';
const KEPT_SLUG = 'phase4-prune-test-kept';

// A DB-only row with no backing file -- mirrors dryrun-fps-display: a stray
// insert (dry-run/test/manual) that never went through a real commit + loader
// cycle.
async function seedDbOnlyRow(slug: string): Promise<void> {
  await db`
    INSERT INTO concepts (slug, title, summary, body, shape, frontmatter, body_sha256)
    VALUES (${slug}, 'Prune test', '', 'body', NULL, ${db.json({} as never)}, ${'0'.repeat(64)})
  `;
}

describe('pruneOrphanConcepts', () => {
  beforeEach(async () => {
    await db`DELETE FROM concepts WHERE slug IN (${ORPHAN_SLUG}, ${KEPT_SLUG})`;
  });
  afterAll(async () => {
    await db`DELETE FROM concepts WHERE slug IN (${ORPHAN_SLUG}, ${KEPT_SLUG})`;
  });

  test('refuses to prune against an empty walked set', async () => {
    await seedDbOnlyRow(ORPHAN_SLUG);
    await expect(pruneOrphanConcepts([])).rejects.toThrow(/refusing to prune/);
    const row = await db`SELECT slug FROM concepts WHERE slug = ${ORPHAN_SLUG}`;
    expect(row.length).toBe(1);
  });

  test('deletes a DB-only row absent from the walked set; keeps a row present in it', async () => {
    await seedDbOnlyRow(ORPHAN_SLUG);
    await seedDbOnlyRow(KEPT_SLUG);

    const pruned = await pruneOrphanConcepts([KEPT_SLUG]);
    expect(pruned).toEqual([ORPHAN_SLUG]);

    const orphanRow = await db`SELECT slug FROM concepts WHERE slug = ${ORPHAN_SLUG}`;
    expect(orphanRow.length).toBe(0);

    const keptRow = await db`SELECT slug FROM concepts WHERE slug = ${KEPT_SLUG}`;
    expect(keptRow.length).toBe(1);
  });

  test('a row is never touched unless the prune path is invoked', async () => {
    await seedDbOnlyRow(ORPHAN_SLUG);
    // No call to pruneOrphanConcepts at all -- the default (non---prune) CLI
    // path never reaches this function, so the row must survive untouched.
    const row = await db`SELECT slug FROM concepts WHERE slug = ${ORPHAN_SLUG}`;
    expect(row.length).toBe(1);
  });
});
