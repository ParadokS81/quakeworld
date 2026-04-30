// apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.test.ts
//
// Uses node:test + tsx because better-sqlite3 is a native Node addon that
// Bun cannot load. Run with:
//   cd apps/qw-oracle
//   tsx --test scripts/load-knowledge/review/findings-help-json-classifications.test.ts

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';
import { findHelpJsonClassifications } from './findings-help-json-classifications.js';

describe('findHelpJsonClassifications', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE entities (
        id INTEGER PRIMARY KEY,
        project TEXT,
        type TEXT,
        name TEXT,
        source_state TEXT
      );
      INSERT INTO entities (project, type, name, source_state) VALUES
        ('ezquake', 'cmdline_param', '-classified', 'doc_only'),
        ('ezquake', 'cmdline_param', '-unclassified', 'doc_only'),
        ('ezquake', 'cmdline_param', '-active', 'source_backed');
    `);
  });

  it('emits a finding for each unclassified doc_only entity', () => {
    const seed = { '-classified': { classification: 'never_implemented' } };
    const findings = findHelpJsonClassifications(db, 'ezquake', seed);
    assert.equal(findings.length, 1);
    const f = findings[0]!;
    assert.equal(f.bucket, 'help-json-classification');
    assert.equal(f.evidence.entity_ref, 'ezquake:cmdline_param:-unclassified');
    assert.equal(f.id, 'help-json-classification:ezquake:cmdline_param:-unclassified');
    assert.equal(f.proposed_disposition?.kind, 'classify');
  });

  it('zero findings when seed covers all doc_only entries', () => {
    const seed = {
      '-classified': { classification: 'never_implemented' },
      '-unclassified': { classification: 'never_implemented' },
    };
    const findings = findHelpJsonClassifications(db, 'ezquake', seed);
    assert.equal(findings.length, 0);
  });
});
