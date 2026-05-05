// apps/qw-oracle/scripts/load-community/clans/index.ts
//
// CLI dispatcher: walk the 2026-05-04 snapshot, parse each clan article,
// upsert the community.clans row, and (when has_note=true) write the
// curated/clan-notes/<slug>.md file.
//
// Flags:
//   --dry-run           parse + count only; no DB write, no note write.
//   --limit N           stop after N articles are processed (smoke runs).
//   --slug <slug>       single-article rerun (debugging a specific clan).
//   --snapshot <date>   override snapshot date (default: 2026-05-04).

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../../shared/db.ts';
import { parseClan } from './parse.ts';
import { computeClanFlags } from './flags.ts';
import { upsertClan } from './upsert.ts';
import { buildClanNoteMarkdown } from './emit-note.ts';
import type { WikiArticle } from '../shared/wiki-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT  = resolve(__dirname, '..', '..', '..');
const NOTES_DIR = resolve(APP_ROOT, 'curated', 'clan-notes');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

interface Args {
  dryRun:   boolean;
  limit:    number | null;
  slug:     string | null;
  snapshot: string;
}

function parseArgs(): Args {
  const args: Args = { dryRun: false, limit: null, slug: null, snapshot: '2026-05-04' };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--limit') args.limit = Number(process.argv[++i]);
    else if (a === '--slug') args.slug = process.argv[++i] ?? null;
    else if (a === '--snapshot') args.snapshot = process.argv[++i] ?? '2026-05-04';
  }
  return args;
}

// ---------------------------------------------------------------------------
// Category filter
// ---------------------------------------------------------------------------

function isClanArticle(article: WikiArticle): boolean {
  // Wiki convention: all clan articles are tagged Category:Clans directly.
  // No fallback regex -- sub-categories like 'Category:American Clans' include
  // the parent tag in the exported article JSON, so the primary check is sufficient.
  // (F11 live recon: no clan article relies solely on a sub-category tag.)
  return article.categories.includes('Category:Clans');
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function loadAllClans(args: Args = parseArgs()): Promise<{
  scanned: number; loaded: number; notesWritten: number; skipped: number; warnings: number;
}> {
  const articlesDir = resolve(APP_ROOT, 'data', 'wiki-snapshots', args.snapshot, 'articles');
  // F17: readdirSync includes dotfiles (e.g. .devil.json). Do NOT use ls or glob.
  const files = readdirSync(articlesDir).filter((f) => f.endsWith('.json'));

  let scanned = 0, loaded = 0, notesWritten = 0, skipped = 0, warnings = 0;

  for (const f of files) {
    if (args.slug && f !== `${args.slug}.json`) continue;
    const slug = f.replace(/\.json$/, '');
    const fullPath = resolve(articlesDir, f);

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (e) {
      console.warn(`[load-clans] WARN parse-fail ${slug}: ${(e as Error).message}`);
      warnings++;
      continue;
    }

    const article: WikiArticle = { ...(raw as WikiArticle), slug };
    scanned++;

    if (!isClanArticle(article)) {
      skipped++;
      continue;
    }

    const parsed = parseClan(article);
    const flags  = computeClanFlags(parsed);

    if (!args.dryRun) {
      await upsertClan(parsed, flags);
      loaded++;
      if (flags.has_note) {
        mkdirSync(NOTES_DIR, { recursive: true });
        const md = buildClanNoteMarkdown(parsed, flags);
        writeFileSync(resolve(NOTES_DIR, `${slug}.md`), md, 'utf8');
        notesWritten++;
      }
    } else {
      loaded++;   // dry-run counts what would have been loaded
      if (flags.has_note) notesWritten++;
    }

    if (args.limit !== null && loaded >= args.limit) break;
  }

  console.log(`[load-clans] scanned ${scanned}, loaded ${loaded}, notes ${notesWritten}, skipped ${skipped}, warnings ${warnings}`);
  return { scanned, loaded, notesWritten, skipped, warnings };
}

// Exported for Phase 5 cross-link backfill.
// Returns a Map of clan_title -> clan_slug from the live community.clans table.
// Must be called AFTER a full load run. Phase 5 imports this to resolve
// player_clan_eras.clan_title (raw from wiki) to community.clans.slug.
export async function getClanTitleToSlugMap(): Promise<Map<string, string>> {
  const rows = await db<{ slug: string; title: string }[]>`
    SELECT slug, title FROM community.clans
  `;
  return new Map(rows.map((r) => [r.title, r.slug]));
}

if (import.meta.main) {
  try {
    await loadAllClans();
  } finally {
    await closeDb();
  }
}
