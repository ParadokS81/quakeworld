// apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts
//
// Phase 1 of the KTX L1 apply pass.
//
// Parses ktx-l1-rewrite-drafts-<batch>.md files and applies each card's
// `### Proposed draft` body to `entities.description`, along with the
// stamped provenance fields (description_origin, description_anchor_version,
// description_embedding_stale, shape_classification).
//
// Drafts file shape (one card per `## <entity>` block, separated by `---`):
//   ## <entity_name> (KTX <type>, <category> -- <shape>)
//   - **Status**: drafted | drafted_with_flag
//   - **Source**: ...
//   - **Catalog line**: ...
//   - **Anchor**: <anchor_version>
//   ### Current description
//   > ...
//   ### Shape classification
//   ...
//   ### Proposed draft
//   ```
//   <new description body>
//   ```
//   ### Notes
//   ...
//   ---
//
// Usage:
//   bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts <batch.md>            # dry-run
//   bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts <batch.md> --apply    # write to DB
//   bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts --all                 # dry-run all batches
//   bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts --all --apply         # apply all batches
//
// Idempotent: re-running on the same batch is a no-op when entities already
// hold the recast text (UPDATE compares; we don't blindly bump updated_at).
//
// Spec: docs/superpowers/parking/2026-05-28-ktx-l1-apply-pass-runbook.md

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { sql, closeSql } from './db.ts';

const REVIEWS_DIR = 'apps/qw-oracle/docs/reviews';
const BATCH_GLOB_PREFIX = 'ktx-l1-rewrite-drafts-';

type CardType = 'cvar' | 'command';

interface Card {
  entity_name: string;
  entity_type: CardType;
  shape_raw: string;
  shape_classification: string;
  status: 'drafted' | 'drafted_with_flag';
  anchor: string;
  proposed_body: string;
  batch_slug: string;
  line_in_file: number;
}

interface ApplyResult {
  scanned: number;
  matched: number;
  updated: number;
  skipped_unchanged: number;
  not_found: string[];
  errors: { entity: string; err: string }[];
}

// ----- shape_classification normalizer -----

function normalizeShape(raw: string): string {
  const lower = raw.toLowerCase().trim();

  const shapeIds: string[] = [];
  const re = /shape\s+([0-9]+[a-z]?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    const id = m[1];
    if (id !== undefined) shapeIds.push(`shape_${id}`);
  }

  const hasShapeLess = /\bshape-less\b/.test(lower);

  if (shapeIds.length === 0 && hasShapeLess) {
    const lever = /lever\s+for\s+shape\s+([0-9]+[a-z]?)/.exec(lower);
    const leaf = /leaf\s+of\s+shape\s+([0-9]+[a-z]?)/.exec(lower);
    if (lever && lever[1]) return `shape-less:lever_for_shape_${lever[1]}`;
    if (leaf && leaf[1]) return `shape-less:leaf_of_shape_${leaf[1]}`;
    return 'shape-less';
  }
  if (shapeIds.length === 0) {
    return '';
  }
  if (shapeIds.length === 1 && !hasShapeLess) {
    return shapeIds[0]!;
  }
  const unique = Array.from(new Set(shapeIds)).sort();
  if (hasShapeLess) {
    return `shape-less:gated_by_${unique.join('|')}`;
  }
  return unique.join('|');
}

// ----- markdown parser -----

function parseBatchFile(path: string): Card[] {
  const text = readFileSync(path, 'utf8');
  const slug = basename(path)
    .replace(/^ktx-l1-rewrite-drafts-/, '')
    .replace(/\.md$/, '');

  const cards: Card[] = [];
  // Header shape: ## <name> (KTX <type>, <category> -- <shape>)
  // Shape descriptor may contain inner parens (e.g. "shape-less (canonical for favN_add)"),
  // so we greedy-match through the last `)` before end of line.
  const headerRe = /^## (\S+) \(KTX (cvar|command),\s*(.+?)\s+--\s+(.+)\)\s*$/gm;

  interface HeaderMatch {
    name: string;
    type: CardType;
    shapeRaw: string;
    start: number;
    line: number;
  }
  const headerMatches: HeaderMatch[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(text)) !== null) {
    const name = hm[1];
    const type = hm[2];
    const shapeRaw = hm[4]; // group 4 is the shape descriptor (group 3 is the category)
    if (name === undefined || type === undefined || shapeRaw === undefined) continue;
    headerMatches.push({
      name,
      type: type as CardType,
      shapeRaw: shapeRaw.trim(),
      start: hm.index,
      line: text.slice(0, hm.index).split('\n').length,
    });
  }

  for (let i = 0; i < headerMatches.length; i++) {
    const h = headerMatches[i];
    if (h === undefined) continue;
    const next = headerMatches[i + 1];
    const sectionEnd = next ? next.start : text.length;
    const section = text.slice(h.start, sectionEnd);

    const statusM = /^- \*\*Status\*\*: (drafted_with_flag|drafted)\s*$/m.exec(section);
    if (!statusM || statusM[1] === undefined) continue;
    const anchorM = /^- \*\*Anchor\*\*:\s*(\S+)/m.exec(section);
    if (!anchorM || anchorM[1] === undefined) continue;
    const proposedM = /### Proposed draft\s*\n\n```\n([\s\S]*?)\n```/m.exec(section);
    if (!proposedM || proposedM[1] === undefined) continue;

    cards.push({
      entity_name: h.name,
      entity_type: h.type,
      shape_raw: h.shapeRaw,
      shape_classification: normalizeShape(h.shapeRaw),
      status: statusM[1] as 'drafted' | 'drafted_with_flag',
      anchor: anchorM[1],
      proposed_body: proposedM[1].trimEnd(),
      batch_slug: slug,
      line_in_file: h.line,
    });
  }
  return cards;
}

// ----- DB apply -----

interface EntityRow {
  id: number;
  description: string | null;
  description_origin: string | null;
  description_anchor_version: string | null;
  shape_classification: string | null;
}

type ApplyOutcome =
  | { status: 'updated' }
  | { status: 'unchanged' }
  | { status: 'not_found' }
  | { status: 'error'; err: string };

async function applyCard(card: Card, apply: boolean): Promise<ApplyOutcome> {
  try {
    const rows = await sql<EntityRow[]>`
      SELECT id, description, description_origin, description_anchor_version, shape_classification
      FROM entities
      WHERE project = 'ktx'
        AND type = ${card.entity_type}
        AND name_fold = ${card.entity_name.toLowerCase()}
      LIMIT 1
    `;
    const e = rows[0];
    if (!e) {
      return { status: 'not_found' };
    }

    const shape = card.shape_classification || null;
    if (
      e.description === card.proposed_body &&
      e.description_origin === 'synthesized' &&
      e.description_anchor_version === card.anchor &&
      e.shape_classification === shape
    ) {
      return { status: 'unchanged' };
    }

    if (!apply) {
      return { status: 'updated' };
    }

    // description_origin is 'synthesized' (folded from the former 'recast_v2'
    // tag 2026-06-04): a v2 recast is operator-authored prose like any other
    // synthesized description; the format-unify marker lives in
    // shape_classification, and 'synthesized' is the origin the F-D4a re-derive
    // guard and the origin_vocabulary probe already recognize.
    await sql`
      UPDATE entities
      SET description = ${card.proposed_body},
          description_origin = 'synthesized',
          description_anchor_version = ${card.anchor},
          description_embedding_stale = TRUE,
          description_rereview = FALSE,
          shape_classification = ${shape},
          updated_at = NOW()
      WHERE id = ${e.id}
    `;
    return { status: 'updated' };
  } catch (err) {
    return {
      status: 'error',
      err: err instanceof Error ? err.message : String(err),
    };
  }
}

// ----- batch driver -----

async function applyBatch(batchPath: string, apply: boolean): Promise<ApplyResult> {
  const cards = parseBatchFile(batchPath);
  const result: ApplyResult = {
    scanned: cards.length,
    matched: 0,
    updated: 0,
    skipped_unchanged: 0,
    not_found: [],
    errors: [],
  };

  console.log(
    `\n[${apply ? 'APPLY' : 'DRY-RUN'}] ${basename(batchPath)} -- ${cards.length} cards`,
  );

  for (const card of cards) {
    const r = await applyCard(card, apply);
    if (r.status === 'updated') {
      result.matched++;
      result.updated++;
      console.log(
        `  ${apply ? '+' : '?'} ${card.entity_name.padEnd(30)} ${card.shape_classification.padEnd(20)} ${card.status}`,
      );
    } else if (r.status === 'unchanged') {
      result.matched++;
      result.skipped_unchanged++;
      console.log(`  = ${card.entity_name.padEnd(30)} (unchanged -- already applied)`);
    } else if (r.status === 'not_found') {
      result.not_found.push(card.entity_name);
      console.log(`  - ${card.entity_name.padEnd(30)} NOT FOUND in entities`);
    } else {
      result.errors.push({ entity: card.entity_name, err: r.err });
      console.log(`  ! ${card.entity_name.padEnd(30)} ERROR: ${r.err}`);
    }
  }

  console.log(
    `  -- ${apply ? 'updated' : 'would-update'}: ${result.updated}; unchanged: ${result.skipped_unchanged}; not-found: ${result.not_found.length}; errors: ${result.errors.length}`,
  );
  return result;
}

// ----- main -----

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const all = argv.includes('--all');
  const fileArgs = argv.filter((a) => !a.startsWith('--'));

  let batchPaths: string[] = [];
  if (all) {
    batchPaths = readdirSync(REVIEWS_DIR)
      .filter((f) => f.startsWith(BATCH_GLOB_PREFIX) && f.endsWith('.md'))
      .sort()
      .map((f) => join(REVIEWS_DIR, f));
  } else if (fileArgs.length > 0) {
    batchPaths = fileArgs;
  } else {
    console.error(
      'Usage: bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts <batch.md> [--apply]\n' +
        '       bun apps/qw-oracle/scripts/load-knowledge/apply-ktx-l1-recasts.ts --all [--apply]',
    );
    process.exit(2);
  }

  const total: ApplyResult = {
    scanned: 0,
    matched: 0,
    updated: 0,
    skipped_unchanged: 0,
    not_found: [],
    errors: [],
  };

  for (const p of batchPaths) {
    const r = await applyBatch(p, apply);
    total.scanned += r.scanned;
    total.matched += r.matched;
    total.updated += r.updated;
    total.skipped_unchanged += r.skipped_unchanged;
    total.not_found.push(...r.not_found);
    total.errors.push(...r.errors);
  }

  console.log(`\n=== TOTAL (${apply ? 'APPLIED' : 'DRY-RUN'}) ===`);
  console.log(`  Scanned:        ${total.scanned}`);
  console.log(`  Matched (DB):   ${total.matched}`);
  console.log(`  ${apply ? 'Updated' : 'Would update'}:        ${total.updated}`);
  console.log(`  Unchanged:      ${total.skipped_unchanged}`);
  console.log(`  Not found:      ${total.not_found.length}`);
  if (total.not_found.length > 0) {
    console.log(
      `    ${total.not_found.slice(0, 20).join(', ')}${total.not_found.length > 20 ? ' ...' : ''}`,
    );
  }
  console.log(`  Errors:         ${total.errors.length}`);
  for (const e of total.errors.slice(0, 10)) {
    console.log(`    ${e.entity}: ${e.err}`);
  }

  await closeSql();
  process.exit(total.errors.length > 0 ? 1 : 0);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
