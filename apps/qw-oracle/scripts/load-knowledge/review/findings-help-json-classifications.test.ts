// apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts
//
// Integration tests against the qw_oracle_test Postgres database (D13).

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import postgres from 'postgres';
import { runMigrations } from '../../../db/migrate.js';
import { findHelpJsonClassifications } from './findings-help-json-classifications.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run findings-help-json-classifications.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

const sql = postgres(url, { onnotice: () => {} });

describe('findHelpJsonClassifications', () => {
  beforeEach(async () => {
    await runMigrations(sql);
    await sql`TRUNCATE entities RESTART IDENTITY CASCADE`;
    const now = new Date().toISOString();
    await sql`
      INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
      VALUES
        ('ezquake', 'cmdline_param', '-classified',   'ezquake:cmdline_param:-classified',   'doc_only',      'head', 'head', ${now}, ${now}),
        ('ezquake', 'cmdline_param', '-unclassified', 'ezquake:cmdline_param:-unclassified', 'doc_only',      'head', 'head', ${now}, ${now}),
        ('ezquake', 'cmdline_param', '-active',       'ezquake:cmdline_param:-active',       'source_backed', 'head', 'head', ${now}, ${now})
    `;
  });

  afterAll(async () => { await sql.end(); });

  it('emits a finding for each unclassified doc_only entity', async () => {
    const seed = { '-classified': { classification: 'never_implemented' } };
    const findings = await findHelpJsonClassifications(sql, 'ezquake', seed);
    expect(findings.length).toBe(1);
    const f = findings[0]!;
    expect(f.bucket).toBe('help-json-classification');
    expect(f.evidence.entity_ref).toBe('ezquake:cmdline_param:-unclassified');
    expect(f.id).toBe('help-json-classification:ezquake:cmdline_param:-unclassified');
    expect(f.proposed_disposition?.kind).toBe('classify');
  });

  it('zero findings when seed covers all doc_only entries', async () => {
    const seed = {
      '-classified': { classification: 'never_implemented' },
      '-unclassified': { classification: 'never_implemented' },
    };
    const findings = await findHelpJsonClassifications(sql, 'ezquake', seed);
    expect(findings.length).toBe(0);
  });
});
