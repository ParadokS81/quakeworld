// apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.test.ts

import { describe, expect, test, beforeAll } from 'bun:test';
import { db } from '../../../../shared/db.ts';
import { redirectToHuman } from './redirect-to-human.ts';

const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)('redirectToHuman', () => {
  beforeAll(async () => {
    // Seed minimal data into qw_oracle_test for the test. Idempotent.
    await db`
      INSERT INTO redirect_targets (topic, display_name, url, description) VALUES
        ('test-helpdesk', 'Test Helpdesk', 'https://example.test/helpdesk', 'A test target.')
      ON CONFLICT (topic) DO UPDATE SET display_name = EXCLUDED.display_name
    `;
  });

  test('returns at least the seeded row', async () => {
    const result = await redirectToHuman({});
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.find((r) => r.topic === 'test-helpdesk')).toBeDefined();
    expect(result.match_quality).toBe('strong');
  });
});
