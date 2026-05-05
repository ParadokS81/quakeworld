// apps/qw-oracle/scripts/load-community/players/index.ts
//
// CLI dispatcher: walk the 2026-05-04 snapshot, parse each player article,
// upsert the community.players row, and (when has_note=true) write the
// curated/player-notes/<slug>.md file.
//
// Flags:
//   --dry-run           parse + count only; no DB write, no note write.
//   --limit N           stop after N articles are processed (smoke runs).
//   --slug <slug>       single-article rerun (debugging a specific player).
//   --snapshot <date>   override snapshot date (default: 2026-05-04).

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb } from '../../../shared/db.ts';
import { parsePlayer } from './parse.ts';
import { computePlayerFlags } from './flags.ts';
import { upsertPlayer } from './upsert.ts';
import { buildNoteMarkdown } from './emit-note.ts';
import type { WikiArticle } from '../shared/wiki-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT  = resolve(__dirname, '..', '..', '..');
const NOTES_DIR = resolve(APP_ROOT, 'curated', 'player-notes');

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

function isPlayerArticle(article: WikiArticle): boolean {
  // Primary signal: directly in Category:Players.
  // Fallback: some articles (e.g. Vo0) are only in a nationality sub-category
  // (Category:Dutch Players) due to a wiki-editorial omission. The pattern
  // /^Category:.+ Players$/ catches all such cases without opening the filter
  // to non-player articles (the word "Players" at the end is unique to player
  // nationality categories in the QWiki taxonomy).
  return article.categories.some(
    c => c === 'Category:Players' || /^Category:.+ Players$/.test(c),
  );
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function loadAllPlayers(args: Args = parseArgs()): Promise<{
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
      console.warn(`[load-players] WARN parse-fail ${slug}: ${(e as Error).message}`);
      warnings++;
      continue;
    }

    const article: WikiArticle = { ...(raw as WikiArticle), slug };
    scanned++;

    if (!isPlayerArticle(article)) {
      skipped++;
      continue;
    }

    const parsed = parsePlayer(article);
    const flags  = computePlayerFlags(parsed);

    if (!args.dryRun) {
      await upsertPlayer(parsed, flags);
      loaded++;
      if (flags.has_note) {
        mkdirSync(NOTES_DIR, { recursive: true });
        const md = buildNoteMarkdown(parsed, flags);
        writeFileSync(resolve(NOTES_DIR, `${slug}.md`), md, 'utf8');
        notesWritten++;
      }
    } else {
      loaded++;   // dry-run counts what would have been loaded
      if (flags.has_note) notesWritten++;
    }

    if (args.limit !== null && loaded >= args.limit) break;
  }

  console.log(`[load-players] scanned ${scanned}, loaded ${loaded}, notes ${notesWritten}, skipped ${skipped}, warnings ${warnings}`);
  return { scanned, loaded, notesWritten, skipped, warnings };
}

if (import.meta.main) {
  try {
    await loadAllPlayers();
  } finally {
    await closeDb();
  }
}
