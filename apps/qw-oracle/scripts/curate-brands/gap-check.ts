// apps/qw-oracle/scripts/curate-brands/gap-check.ts
//
// Phase A drift report. Compares brand-pre-fill.json (machine-derived) and
// brand-curation-state.json (operator-curated) against the wiki snapshot to
// surface members that fell through the cracks.
//
// Three checks:
//   [1] Per-brand member diff: members in pre-fill but absent from state
//       (silent drops, e.g. EQL_Pro) and members in state but absent from
//       pre-fill (operator-added; may be redirect aliases).
//   [2] Pre-fill tournaments not in any state bucket. Confirms operator's
//       inventory left pane shows them as unassigned.
//   [3] Snapshot articles carrying a tournament-shape infobox but never
//       reached pre-fill (UKCML pattern -- not in any Navbox + not in a
//       tournament category, so the auto-discovery missed them).
//
// Run:  bun apps/qw-oracle/scripts/curate-brands/gap-check.ts

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SNAPSHOT_ROOT = 'apps/qw-oracle/data/wiki-snapshots/2026-05-04';
const ARTICLES_DIR = join(SNAPSHOT_ROOT, 'articles');
const PRE_FILL = 'apps/qw-oracle/scripts/curate-brands/brand-pre-fill.json';
const STATE = 'apps/qw-oracle/scripts/curate-brands/brand-curation-state.json';

// Mirrors pre-fill.ts TOURNAMENT_CATEGORIES. Anchor for Check 3 -- we want
// articles with one of these categories that pre-fill didn't recognize, NOT
// articles with a tournament infobox (match-report pages embed Infobox league
// from their parent and would false-positive).
const TOURNAMENT_CATEGORIES = new Set([
  'Category:Online Tournaments',
  'Category:Team Tournaments',
  'Category:Leagues',
  'Category:Offline Tournaments',
  'Category:LAN Tournaments',
  'Category:Online Seasonal League Tournaments',
  'Category:Online Draft Tournaments',
]);

const EXCLUDE_CATEGORIES = new Set([
  'Category:Matchreports',
]);

type PreFillBrand = { slug: string; members: string[]; brand_overview_slug?: string };
type PreFillTournament = { slug: string; title: string };
type PreFill = {
  snapshot: string;
  generated_at: string;
  brands_pre_filled: PreFillBrand[];
  tournaments: PreFillTournament[];
  unassigned: string[];
  sub_pages_by_parent: Record<string, string[]>;
};

type StateBrand = { slug: string; members: string[]; type: string; state: string };
type State = { snapshot: string; exported_at: string; brands: StateBrand[] };

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function hasTournamentCategory(categories: string[]): boolean {
  return categories.some(c => TOURNAMENT_CATEGORIES.has(c));
}

function hasExcludeCategory(categories: string[]): boolean {
  return categories.some(c => EXCLUDE_CATEGORIES.has(c));
}

function diff<T>(a: Set<T>, b: Set<T>): T[] {
  return [...a].filter(x => !b.has(x));
}

function main() {
  const pre = readJson<PreFill>(PRE_FILL);
  const state = readJson<State>(STATE);

  const stateBySlug = new Map(state.brands.map(b => [b.slug, b]));
  const preBySlug = new Map(pre.brands_pre_filled.map(b => [b.slug, b]));

  console.log('=== curate-brands gap check ===');
  console.log(`snapshot:  ${pre.snapshot}`);
  console.log(`pre-fill:  ${pre.generated_at}`);
  console.log(`state:     ${state.exported_at}`);
  console.log(`brands:    ${pre.brands_pre_filled.length} pre-filled / ${state.brands.length} curated`);
  console.log();

  // [1] Per-brand member diff
  console.log('[1] Per-brand member diff (pre-fill vs state)');
  let totalDropped = 0;
  let totalAdded = 0;
  let brandsTouched = 0;

  // Brands present in pre-fill
  for (const pb of pre.brands_pre_filled) {
    const sb = stateBySlug.get(pb.slug);
    if (!sb) {
      console.log(`  brand "${pb.slug}" present in pre-fill, ABSENT from state -- ${pb.members.length} members orphaned`);
      totalDropped += pb.members.length;
      brandsTouched++;
      continue;
    }
    const preSet = new Set(pb.members);
    const stateSet = new Set(sb.members);
    const dropped = diff(preSet, stateSet);
    const added = diff(stateSet, preSet);
    if (dropped.length === 0 && added.length === 0) continue;
    brandsTouched++;
    console.log(`  ${pb.slug} (${sb.type}/${sb.state}):`);
    for (const m of dropped) console.log(`    - DROPPED: ${m}`);
    for (const m of added) console.log(`    + ADDED:   ${m}`);
    totalDropped += dropped.length;
    totalAdded += added.length;
  }

  // Brands present in state but not pre-fill (synthesized buckets)
  // Don't flag these as "added members" -- whole bucket is operator's call.
  // But tally so the operator sees the synthesized count.
  const synthesizedOnly = state.brands.filter(b => !preBySlug.has(b.slug));
  if (synthesizedOnly.length > 0) {
    console.log(`  (${synthesizedOnly.length} state brand(s) absent from pre-fill -- synthesized by operator)`);
  }

  console.log(`  total dropped: ${totalDropped}  added: ${totalAdded}  brands touched: ${brandsTouched}`);
  console.log();

  // [2] Pre-fill tournaments not in any state bucket
  console.log('[2] Pre-fill tournaments not in any state bucket');
  const allStateMembers = new Set<string>();
  for (const b of state.brands) for (const m of b.members) allStateMembers.add(m);

  const orphans = pre.tournaments
    .filter(t => !allStateMembers.has(t.slug))
    .map(t => t.slug);

  if (orphans.length === 0) {
    console.log('  none');
  } else {
    const cap = 50;
    for (const s of orphans.slice(0, cap)) console.log(`  - ${s}`);
    if (orphans.length > cap) console.log(`  ... and ${orphans.length - cap} more`);
  }
  console.log(`  total orphans: ${orphans.length}`);
  console.log();

  // [3] Snapshot articles in a tournament-shape category that pre-fill didn't
  //     recognize (UKCML pattern). Filter by category, not by infobox -- many
  //     real UKCML-style pages have no infobox at all (pure prose), and
  //     filtering by infobox false-positives on match-report sub-pages.
  console.log('[3] Snapshot articles in tournament category missing from pre-fill (UKCML pattern)');

  const recognized = new Set(pre.tournaments.map(t => t.slug));
  const knownBrandOverviews = new Set<string>();
  for (const b of pre.brands_pre_filled) {
    if (b.brand_overview_slug) knownBrandOverviews.add(b.brand_overview_slug);
  }
  for (const b of state.brands) {
    const bo = (b as any).brand_overview_slug;
    if (bo) knownBrandOverviews.add(bo);
  }

  const subPages = new Set<string>();
  for (const list of Object.values(pre.sub_pages_by_parent ?? {})) {
    for (const s of list) subPages.add(s);
  }

  const articleFiles = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json'));
  const ukcmlPattern: string[] = [];

  for (const f of articleFiles) {
    const slug = f.slice(0, -'.json'.length);
    if (recognized.has(slug)) continue;
    if (subPages.has(slug)) continue;
    if (knownBrandOverviews.has(slug)) continue;
    const article = readJson<{ categories?: string[] }>(join(ARTICLES_DIR, f));
    const cats = article.categories ?? [];
    if (!hasTournamentCategory(cats)) continue;
    if (hasExcludeCategory(cats)) continue;
    ukcmlPattern.push(slug);
  }

  if (ukcmlPattern.length === 0) {
    console.log('  none');
  } else {
    const cap = 100;
    for (const s of ukcmlPattern.slice(0, cap)) console.log(`  - ${s}`);
    if (ukcmlPattern.length > cap) console.log(`  ... and ${ukcmlPattern.length - cap} more`);
  }
  console.log(`  total UKCML-pattern: ${ukcmlPattern.length}`);
  console.log();

  // Summary
  console.log('=== summary ===');
  console.log(`  [1] silently-dropped members:        ${totalDropped}`);
  console.log(`  [1] operator-added (within prefill): ${totalAdded}`);
  console.log(`  [1] synthesized state-only brands:   ${synthesizedOnly.length}`);
  console.log(`  [2] tournament orphans (unassigned): ${orphans.length}`);
  console.log(`  [3] UKCML-pattern (missed by prefill): ${ukcmlPattern.length}`);
}

if (import.meta.main) {
  main();
}
