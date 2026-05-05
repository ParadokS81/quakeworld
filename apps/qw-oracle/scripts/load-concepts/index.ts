// apps/qw-oracle/scripts/load-concepts/index.ts
//
// CLI dispatcher. Walks curated/concept-notes/*.md, parses, runs body-link drift check,
// upserts each, prints a summary.
//
// Bun-native (D2). Uses import.meta.main so the module is also importable from
// tests without auto-running.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../shared/db.ts';
import { parseConceptFile, extractBodyConceptLinks } from './parse.ts';
import { upsertConcept } from './upsert.ts';
import { embedConceptChunks } from '../embed/embed-chunks.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCEPTS_DIR = resolve(__dirname, '..', '..', 'curated', 'concept-notes');

export async function loadAllConcepts(): Promise<{ loaded: number; skipped: number; warnings: number }> {
  const files = readdirSync(CONCEPTS_DIR).filter((f) => f.endsWith('.md'));
  let loaded = 0;
  let skipped = 0;
  let warnings = 0;

  for (const f of files) {
    const fullPath = resolve(CONCEPTS_DIR, f);
    const text = readFileSync(fullPath, 'utf8');
    const parsed = await parseConceptFile(text);
    if (!parsed) {
      skipped++;
      continue;
    }

    const bodyLinks = extractBodyConceptLinks(parsed.body);
    const declared = new Set(parsed.relatedConcepts);
    for (const link of bodyLinks) {
      if (link === parsed.slug) continue;
      if (!declared.has(link)) {
        console.warn(`[load-concepts] WARN ${parsed.slug}: body links concept "${link}" but does not declare it in related_concepts:`);
        warnings++;
      }
    }

    await upsertConcept(parsed);
    loaded++;
  }
  console.log(`[load-concepts] loaded ${loaded}, skipped ${skipped}, warnings ${warnings}`);
  return { loaded, skipped, warnings };
}

if (import.meta.main) {
  try {
    await loadAllConcepts();
    // Layer 3 chunk embedding pass. Runs OUTSIDE the upsert transaction so a
    // Voyage outage cannot roll back structured rows. Confined to the CLI
    // entry block on purpose: helper functions used by tests seed their own
    // chunk rows and would interfere with the candidate query.
    try {
      await embedConceptChunks();
    } catch (err) {
      console.error(`[load-concepts] embedConceptChunks threw: ${(err as Error).message}`);
    }
  } finally {
    await closeDb();
  }
}
