// apps/qw-oracle/scripts/curate-brands/pre-fill.ts
//
// Phase 4 brand-pages discovery -- pre-fill pass.
// Reads the wiki snapshot, identifies tournament-shape articles + navboxes,
// pre-assigns articles to brands via navbox membership. Output JSON feeds
// the curate-brands HTML tracker tool for manual operator curation.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SNAPSHOT_ROOT = 'apps/qw-oracle/data/wiki-snapshots/2026-05-04';
const ARTICLES_DIR = join(SNAPSHOT_ROOT, 'articles');
const TEMPLATES_DIR = join(SNAPSHOT_ROOT, 'templates');
const REDIRECTS_FILE = join(SNAPSHOT_ROOT, 'redirects.json');
const OUTPUT = 'apps/qw-oracle/scripts/curate-brands/brand-pre-fill.json';

const TOURNAMENT_CATEGORIES = new Set([
  'Category:Online Tournaments',
  'Category:Team Tournaments',
  'Category:Leagues',
  'Category:Offline Tournaments',
  'Category:LAN Tournaments',
  'Category:Online Seasonal League Tournaments',
  'Category:Online Draft Tournaments',
]);

const BRAND_INFOBOX_TEMPLATES = [
  'Infobox league',
  'Infobox lan',
  'Infobox cup',
  'Infobox tournament',
];

function readJson(path: string): any | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractField(wikitext: string, field: string): string | null {
  // Match field value up to next newline. Pipes inside [[...]] piped wikilinks
  // and {{...}} nested templates are preserved (the prior `[^\n|]+` form
  // truncated at the first pipe and broke `|title=[[X|Display]] Events` cases).
  const re = new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n]+)`, 'i');
  const m = wikitext.match(re);
  return m && m[1].trim() ? m[1].trim() : null;
}

function extractYear(article: any): number | null {
  for (const cat of article.categories ?? []) {
    const m = cat.match(/^Category:(\d{4})$/);
    if (m) return parseInt(m[1]);
  }
  for (const field of ['sdate', 'year']) {
    const v = extractField(article.wikitext, field);
    if (v) {
      const m = v.match(/^(\d{4})/);
      if (m) return parseInt(m[1]);
    }
  }
  return null;
}

function extractMode(wikitext: string): string | null {
  const format = extractField(wikitext, 'format') ?? extractField(wikitext, 'mode');
  if (!format) return null;
  if (/4on4/i.test(format)) return '4on4';
  if (/2on2/i.test(format)) return '2on2';
  if (/1on1|duel/i.test(format)) return '1on1';
  if (/ffa/i.test(format)) return 'ffa';
  if (/ctf/i.test(format)) return 'ctf';
  return null;
}

function detectCompetitionType(wikitext: string): string | null {
  if (wikitext.includes('{{Infobox league')) return 'league';
  if (wikitext.includes('{{Infobox lan')) return 'lan';
  if (wikitext.includes('{{Infobox cup')) return 'cup';
  if (wikitext.includes('{{Infobox tournament')) return 'tournament';
  return null;
}

// Cleans common wikilink + {{player|...}} template syntax to plain names.
// `{{player|name|flag=fi}}` -> `name`; `[[X|Display]]` -> `Display`.
function cleanWikiNames(s: string): string {
  return s
    .replace(/\{\{player\|([^|}]+?)(?:\|[^}]*)?\}\}/gi, '$1')
    .replace(/\{\{flag\|[^}]+\}\}/gi, '')
    .replace(/\[\[([^\]|]+?)\|([^\]]+?)\]\]/g, '$2')
    .replace(/\[\[([^\]]+?)\]\]/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractAdmin(wikitext: string): string | null {
  for (const field of ['admin', 'admins', 'organizer', 'organiser', 'organizers', 'organisers']) {
    const v = extractField(wikitext, field);
    if (v) {
      const cleaned = cleanWikiNames(v);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

// First non-template prose line. Strips template invocations, comments,
// category links, and section headings, then returns the first non-empty
// remaining line with wikilinks flattened.
function extractIntroSentence(wikitext: string): string | null {
  let text = wikitext;
  let prev;
  do {
    prev = text;
    text = text.replace(/\{\{[^{}]*?\}\}/gs, '');
  } while (text !== prev);
  text = text.replace(/<!--.*?-->/gs, '');
  text = text.replace(/\[\[Category:[^\]]+\]\]/g, '');
  text = text.replace(/^==+[^=\n]+==+\s*$/gm, '');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('|') || line.startsWith('}}') || line.startsWith('{{') || line.startsWith('*') || line.startsWith('#')) continue;
    const cleaned = line
      .replace(/\[\[([^\]|]+?)\|([^\]]+?)\]\]/g, '$2')
      .replace(/\[\[([^\]]+?)\]\]/g, '$1')
      .replace(/'''([^']+)'''/g, '$1')
      .replace(/''([^']+)''/g, '$1')
      .replace(/<[^>]+>/g, '');
    const trimmed = cleaned.trim();
    if (trimmed.length < 10) continue; // skip stray fragments
    return trimmed;
  }
  return null;
}

function extractNavboxRefs(wikitext: string): string[] {
  const matches = [...wikitext.matchAll(/\{\{([^}|\n]+?[Nn]avbox[^}|\n]*?)\}\}/g)];
  return [...new Set(matches.map((m) => m[1].trim()))];
}

function detectBrandInfobox(wikitext: string): boolean {
  return BRAND_INFOBOX_TEMPLATES.some((t) => wikitext.includes(`{{${t}`));
}

function isNavbox(template: any): boolean {
  if (template.categories?.includes('Category:Events Navboxes')) return true;
  return /^\s*\{\{Navbox(?:\s|\||\n)/.test(template.wikitext ?? '');
}

function parseNavboxMembers(wikitext: string): { label: string; members: string[] }[] {
  const groups: { label: string; members: string[] }[] = [];
  const sections = wikitext.split(/(?=\|\s*group\d+\s*=)/);
  for (const section of sections) {
    const groupMatch = section.match(/\|\s*group\d+\s*=\s*([^\n|]+)/);
    if (!groupMatch) continue;
    const label = groupMatch[1].trim();
    const memberMatches = [
      ...section.matchAll(/^\s*\*\s*\[\[([^\]|\n]+?)(?:\|[^\]]*)?\]\]/gm),
    ];
    const members = memberMatches.map((m) => m[1].trim().replace(/ /g, '_'));
    if (members.length > 0) {
      groups.push({ label, members });
    }
  }
  return groups;
}

function extractTitleWikilink(wikitext: string): { wikilink: string | null; text: string } {
  // Use extractField (line-anchored, pipe-tolerant) so piped wikilinks like
  // `[[X|Y]] Events` survive instead of being truncated at the inner pipe.
  const titleText = extractField(wikitext, 'title');
  if (!titleText) return { wikilink: null, text: '' };
  const wikiMatch = titleText.match(/\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/);
  return {
    wikilink: wikiMatch ? wikiMatch[1].trim().replace(/ /g, '_') : null,
    text: titleText,
  };
}

console.log('Reading redirects...');
const redirectsRaw = readJson(REDIRECTS_FILE) ?? [];
const redirectMap = new Map<string, string>();
for (const r of redirectsRaw) {
  if (r?.from && r?.to) {
    redirectMap.set(r.from.replace(/ /g, '_'), r.to.replace(/ /g, '_'));
  }
}
console.log(`  ${redirectMap.size} redirects loaded.`);

function resolveSlug(slug: string, articleSet: Set<string>): string | null {
  if (articleSet.has(slug)) return slug;
  const target = redirectMap.get(slug);
  if (target && articleSet.has(target)) return target;
  return null;
}

console.log('Reading articles...');
const articleFiles = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.json'));
const articleSet = new Set<string>();
const allTournamentArticles: any[] = []; // top-level + sub-pages combined

for (const file of articleFiles) {
  const article = readJson(join(ARTICLES_DIR, file));
  if (!article) continue;
  const slug = file.replace(/\.json$/, '');
  articleSet.add(slug);
  const cats = article.categories ?? [];
  let isT = false;
  for (const c of cats) {
    if (TOURNAMENT_CATEGORIES.has(c)) {
      isT = true;
      break;
    }
  }
  if (!isT) continue;
  allTournamentArticles.push({
    slug,
    title: article.title,
    year: extractYear(article),
    sdate: extractField(article.wikitext, 'sdate'),
    mode: extractMode(article.wikitext),
    competition_type: detectCompetitionType(article.wikitext),
    has_brand_infobox: detectBrandInfobox(article.wikitext),
    navbox_refs: extractNavboxRefs(article.wikitext),
    admin: extractAdmin(article.wikitext),
    intro_sentence: extractIntroSentence(article.wikitext),
  });
}
console.log(`  ${allTournamentArticles.length} tournament-shape articles found (top-level + sub-pages).`);

// Partition top-level vs sub-pages and build the parent->children index.
// A sub-page is an article whose slug ends with `__<suffix>` where:
//   (a) `<parent-before-last-__>` exists as another article in the snapshot, AND
//   (b) `<suffix>` matches a known metadata-tab pattern (Division_N / Information
//       / Playoffs / Rules / Groups / etc.).
// This rule preserves real-tournament hierarchical names (`The_Big_4__Season_1`,
// `Quakeworld_Eternal__Dm3`) as top-level while nesting metadata-tab sub-pages
// under their parent.
const METADATA_TAB_RE = /^(division[_-]?[a-z0-9]+|group[_-]?[a-z0-9]*|groups|information|info[_-]?rules?[_-]*|rules?[_-]*|standings?|results?|schedule|signups?|teams?|players?|bracket|draft|playoffs?)$/i;
const subPagesByParent = new Map<string, string[]>();
const topLevelTournaments: any[] = [];
for (const t of allTournamentArticles) {
  const lastSplit = t.slug.lastIndexOf('__');
  if (lastSplit > 0) {
    const parent = t.slug.substring(0, lastSplit);
    const suffix = t.slug.substring(lastSplit + 2);
    if (articleSet.has(parent) && METADATA_TAB_RE.test(suffix)) {
      if (!subPagesByParent.has(parent)) subPagesByParent.set(parent, []);
      subPagesByParent.get(parent)!.push(t.slug);
      continue;
    }
  }
  topLevelTournaments.push(t);
}

// Attach sub_pages array to each top-level article (informational; UI nests
// children under parent on chevron expand).
for (const t of topLevelTournaments) {
  t.sub_pages = subPagesByParent.get(t.slug) ?? [];
}
console.log(`  ${topLevelTournaments.length} top-level / ${allTournamentArticles.length - topLevelTournaments.length} sub-pages.`);

console.log('Reading templates...');
const templateFiles = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json'));
const navboxes: any[] = [];
for (const file of templateFiles) {
  const template = readJson(join(TEMPLATES_DIR, file));
  if (!template) continue;
  if (!isNavbox(template)) continue;
  const slug = file.replace(/^Template_/, '').replace(/\.json$/, '');
  const titleInfo = extractTitleWikilink(template.wikitext);
  const nameField = extractField(template.wikitext, 'name');
  const groups = parseNavboxMembers(template.wikitext);
  navboxes.push({
    slug,
    name: nameField ?? slug,
    title_wikilink: titleInfo.wikilink,
    title_text: titleInfo.text,
    groups,
  });
}
console.log(`  ${navboxes.length} navbox templates found.`);

console.log('Pre-filling brand assignments...');
const brandPreFills: any[] = [];
const assignedTournaments = new Set<string>();

for (const navbox of navboxes) {
  const memberSet = new Set<string>();
  const formatLines: any[] = [];
  for (const group of navbox.groups) {
    const validMembers = group.members.filter((m: string) => articleSet.has(m));
    if (validMembers.length > 0) {
      formatLines.push({ label: group.label, member_slugs: validMembers });
      for (const m of validMembers) memberSet.add(m);
    }
  }
  if (memberSet.size === 0) continue;
  const brandOverviewSlug = navbox.title_wikilink
    ? resolveSlug(navbox.title_wikilink, articleSet)
    : null;
  const candidateLabel = brandOverviewSlug
    ? brandOverviewSlug.replace(/_/g, ' ')
    : navbox.name.replace(/[Nn]avbox/g, '').trim() ||
      navbox.slug.replace(/_/g, ' ');
  const brandSlug = brandOverviewSlug
    ? slugify(brandOverviewSlug)
    : slugify(navbox.slug.replace(/[Nn]avbox/g, ''));
  brandPreFills.push({
    slug: brandSlug,
    navbox_slug: navbox.slug,
    brand_overview_slug: brandOverviewSlug,
    candidate_label: candidateLabel,
    members: [...memberSet],
    format_lines: formatLines,
  });
  for (const m of memberSet) assignedTournaments.add(m);
}

// Brand-overview pages are not curation units (they're the wiki homepage of
// the brand bucket itself). Drop them from the tournament inventory; the
// bucket already carries a `brand_overview_slug` pointer for the wiki link.
const brandOverviewSlugs = new Set(
  brandPreFills.map((b) => b.brand_overview_slug).filter((s): s is string => !!s),
);

// Heuristic: drop supplementary pages that have tournament categories but
// aren't actual tournaments (Hall of Fame, Map Pool, etc.).
const SUPPLEMENTARY_RE = /(_hall_of_fame|_map_pool|_records|_archive|_history|_sponsors)$/i;

const cleanedTopLevelTournaments = topLevelTournaments.filter((t) => {
  if (brandOverviewSlugs.has(t.slug)) return false;
  if (SUPPLEMENTARY_RE.test(t.slug)) return false;
  return true;
});
const droppedBrandOverview = topLevelTournaments.length - cleanedTopLevelTournaments.length;

// Unassigned = top-level tournament articles not picked up by any navbox.
// Sub-pages are not curation units (they ride along with their parent).
const unassigned = cleanedTopLevelTournaments
  .filter((t) => !assignedTournaments.has(t.slug))
  .map((t) => t.slug);

const navboxesWithNoBrandOverview = navboxes
  .filter((n) => !n.title_wikilink || !resolveSlug(n.title_wikilink, articleSet))
  .map((n) => ({ slug: n.slug, title_text: n.title_text }));

const emptyNavboxes = navboxes
  .filter((n) => n.groups.every((g: any) => g.members.length === 0))
  .map((n) => n.slug);

const output = {
  generated_at: new Date().toISOString(),
  snapshot: '2026-05-04',
  // Top-level tournament articles only. Sub-pages live in `sub_pages_by_parent`
  // and ride along with their parent in the UI; they are not curation units.
  tournaments: cleanedTopLevelTournaments,
  sub_pages_by_parent: Object.fromEntries(subPagesByParent),
  brands_pre_filled: brandPreFills,
  unassigned,
  navboxes_with_no_brand_overview: navboxesWithNoBrandOverview,
  empty_navboxes: emptyNavboxes,
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
// Also write a JS module for the HTML tracker (avoids fetch / file:// CORS).
const JS_OUTPUT = OUTPUT.replace(/\.json$/, '.js');
writeFileSync(
  JS_OUTPUT,
  `window.BRAND_PREFILL = ${JSON.stringify(output)};\n`,
);

console.log(`\nWrote ${OUTPUT}`);
console.log(`Wrote ${JS_OUTPUT}`);
console.log('Stats:');
console.log(`  top-level tournament articles: ${output.tournaments.length}`);
console.log(`  dropped (brand-overview + supplementary): ${droppedBrandOverview}`);
console.log(`  sub-page articles: ${allTournamentArticles.length - topLevelTournaments.length}`);
console.log(`  parents with sub-pages: ${subPagesByParent.size}`);
console.log(`  brands pre-filled: ${output.brands_pre_filled.length}`);
console.log(`  tournaments assigned: ${assignedTournaments.size}`);
console.log(`  tournaments unassigned (top-level only): ${output.unassigned.length}`);
console.log(`  navboxes with no brand overview: ${output.navboxes_with_no_brand_overview.length}`);
console.log(`  empty navboxes: ${output.empty_navboxes.length}`);
