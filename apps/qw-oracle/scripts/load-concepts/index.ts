// apps/qw-oracle/scripts/load-concepts/index.ts
//
// CLI dispatcher. Walks curated/concept-notes/*.md, parses, runs body-link drift check,
// upserts each, prints a summary.
//
// Bun-native (D2). Uses import.meta.main so the module is also importable from
// tests without auto-running.
//
// Flags:
//   --prune   after the walk, delete `concepts` rows whose slug was not seen
//             on disk this run (F15 repair-by-rerun path: a note that never
//             went through a real commit + loader cycle, e.g. a dry-run or
//             test insert, has no file to keep it alive). Default OFF -- an
//             empty/missing curated/concept-notes/ dir must never be read as
//             "prune everything"; see pruneOrphanConcepts's own guard too.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../shared/db.ts';
import { parseConceptFile, extractBodyConceptLinks } from './parse.ts';
import { upsertConcept } from './upsert.ts';
import { embedConceptChunks } from '../embed/embed-chunks.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCEPTS_DIR = resolve(__dirname, '..', '..', 'curated', 'concept-notes');

export async function loadAllConcepts(): Promise<{ loaded: number; skipped: number; warnings: number; walkedSlugs: string[] }> {
  const files = readdirSync(CONCEPTS_DIR).filter((f) => f.endsWith('.md'));
  let loaded = 0;
  let skipped = 0;
  let warnings = 0;
  const walkedSlugs: string[] = [];

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
    walkedSlugs.push(parsed.slug);
  }
  console.log(`[load-concepts] loaded ${loaded}, skipped ${skipped}, warnings ${warnings}`);
  return { loaded, skipped, warnings, walkedSlugs };
}

// Deletes `concepts` rows whose slug is absent from `walkedSlugs` -- residue
// from dry-runs/tests/deleted notes that were never backed by a committed
// file (F15). Relies on migration 005's ON DELETE CASCADE
// (concept_chunks.concept_slug, concept_entities.concept_slug,
// concept_concepts.source_slug all reference concepts(slug)) to clean up
// child rows; no manual child deletes. Refuses to run against an empty
// walked set -- that shape means "the disk walk found nothing," which is a
// caller bug (missing/empty curated/concept-notes/), not "everything is an
// orphan."
export async function pruneOrphanConcepts(walkedSlugs: string[]): Promise<string[]> {
  if (walkedSlugs.length === 0) {
    throw new Error('[load-concepts] refusing to prune: walked slug set is empty (empty or missing curated/concept-notes/?)');
  }
  const orphans = await db<{ slug: string }[]>`
    SELECT slug FROM concepts WHERE slug != ALL(${walkedSlugs}::text[])
  `;
  if (orphans.length === 0) {
    return [];
  }
  const slugs = orphans.map((o) => o.slug);
  for (const slug of slugs) {
    console.log(`[load-concepts] PRUNE ${slug} (no backing file on disk)`);
  }
  await db`DELETE FROM concepts WHERE slug = ANY(${slugs}::text[])`;
  return slugs;
}

if (import.meta.main) {
  const prune = process.argv.includes('--prune');
  try {
    const { walkedSlugs } = await loadAllConcepts();
    if (prune) {
      const pruned = await pruneOrphanConcepts(walkedSlugs);
      console.log(`[load-concepts] pruned ${pruned.length}`);
    }
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
