// apps/qw-oracle/scripts/load-community/clans/emit-note.test.ts
//
// Bun tests for buildClanNoteMarkdown.
// Fixtures are read from data/wiki-snapshots/2026-05-04/articles/.

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseClan } from './parse.ts';
import { computeClanFlags } from './flags.ts';
import { buildClanNoteMarkdown } from './emit-note.ts';
import type { ParsedClan } from './parse.ts';
import type { WikiArticle } from '../shared/wiki-types.ts';
import type { ClanFlags } from './flags.ts';

// ---------------------------------------------------------------------------
// Fixture loader
// ---------------------------------------------------------------------------

const SNAPSHOT_DIR = join(
  import.meta.dirname,
  '../../../data/wiki-snapshots/2026-05-04/articles',
);

function loadArticle(basename: string): WikiArticle {
  const raw = JSON.parse(readFileSync(join(SNAPSHOT_DIR, `${basename}.json`), 'utf8'));
  return { ...raw, slug: basename } as WikiArticle;
}

// Minimal ParsedClan factory for synthetic tests.
function minimalClan(overrides: Partial<ParsedClan> = {}): ParsedClan {
  return {
    slug: 'test-clan',
    title: 'Test Clan',
    prefix: null,
    nationality: null,
    nationality_iso: null,
    founded_year: null,
    founded_month: null,
    founded_day: null,
    founded_by: null,
    disbanded: null,
    status: 'unknown',
    irc_channel: null,
    irc_network: null,
    website: null,
    source_template: 'none',
    source_categories: [],
    wiki_revision_id: 1,
    wiki_fetched_at: '2026-01-01T00:00:00Z',
    narrative_intro: '',
    history_section: '',
    info_section: '',
    achievements_section: '',
    members_section: '',
    see_also_section: '',
    external_links_section: '',
    narrative_byte_length: 0,
    has_history: false,
    achievements_count: 0,
    ...overrides,
  };
}

function minimalFlags(overrides: Partial<ClanFlags> = {}): ClanFlags {
  return {
    is_substantive: false,
    has_note: false,
    is_stub: true,
    source_template: 'none',
    ...overrides,
  };
}

// Helper: extract frontmatter block from a note string (between first --- and second ---).
function extractFrontmatter(note: string): string {
  const fmEnd = note.indexOf('\n---\n', 4);
  return note.slice(4, fmEnd);
}

// ---------------------------------------------------------------------------
// Test 1 -- Euthanasia (infobox_4on4team)
// ---------------------------------------------------------------------------

describe('Test 1: Euthanasia (infobox_4on4team) frontmatter + body', () => {
  const article = loadArticle('Euthanasia');
  const parsed = parseClan(article);
  const flags = computeClanFlags(parsed);
  const note = buildClanNoteMarkdown(parsed, flags);
  const frontmatter = extractFrontmatter(note);

  it('slug is Euthanasia', () => {
    expect(frontmatter).toContain('slug: Euthanasia');
  });

  it('type is clan', () => {
    expect(frontmatter).toContain('type: clan');
  });

  it('prefix is [E] (double-quoted because brackets are special in YAML)', () => {
    expect(frontmatter).toContain('prefix: "[E]"');
  });

  it('nationality is Swedish', () => {
    expect(frontmatter).toContain('nationality: Swedish');
  });

  it('nationality_iso is se', () => {
    expect(frontmatter).toContain('nationality_iso: se');
  });

  it('founded_year is 1997', () => {
    expect(frontmatter).toContain('founded_year: 1997');
  });

  it('source_template is infobox_4on4team', () => {
    expect(frontmatter).toContain('source_template: infobox_4on4team');
  });

  it('body contains the founding narrative paragraph', () => {
    const fmEnd = note.indexOf('\n---\n', 4);
    const body = note.slice(fmEnd + 5);
    // The article lead mentions clan formation; verify there is substantive prose.
    expect(body.length).toBeGreaterThan(0);
    // The narrative intro contains player names from the founding story.
    const hasNarrative = body.includes('Ettan') || body.includes('april') || body.includes('Quakebuddies') || body.includes('Ralle');
    expect(hasNarrative).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 2 -- Firing_Squad (clan_info, F25 corrected)
// ---------------------------------------------------------------------------

describe('Test 2: Firing_Squad (clan_info) frontmatter + history body', () => {
  const article = loadArticle('Firing_Squad');
  const parsed = parseClan(article);
  const flags = computeClanFlags(parsed);
  const note = buildClanNoteMarkdown(parsed, flags);
  const frontmatter = extractFrontmatter(note);

  it('type is clan', () => {
    expect(frontmatter).toContain('type: clan');
  });

  it('source_template is clan_info', () => {
    expect(frontmatter).toContain('source_template: clan_info');
  });

  it('prefix is [fs] (double-quoted)', () => {
    expect(frontmatter).toContain('prefix: "[fs]"');
  });

  it('nationality is Dutch', () => {
    expect(frontmatter).toContain('nationality: Dutch');
  });

  it('nationality_iso is nl', () => {
    expect(frontmatter).toContain('nationality_iso: nl');
  });

  it('founded_year is 1995', () => {
    expect(frontmatter).toContain('founded_year: 1995');
  });

  it('body contains ## History heading', () => {
    expect(note).toContain('## History');
  });
});

// ---------------------------------------------------------------------------
// Test 3 -- Morituri: callable with has_note=false
// ---------------------------------------------------------------------------

describe('Test 3: buildClanNoteMarkdown callable with has_note=false', () => {
  const article = loadArticle('Morituri');
  const parsed = parseClan(article);
  // Override flags to simulate has_note=false (CLI guard scenario).
  const flags: ClanFlags = {
    is_substantive: false,
    has_note: false,
    is_stub: true,
    source_template: parsed.source_template,
  };

  it('does not throw', () => {
    expect(() => buildClanNoteMarkdown(parsed, flags)).not.toThrow();
  });

  const note = buildClanNoteMarkdown(parsed, flags);

  it('returned string starts with ---', () => {
    expect(note.startsWith('---\n')).toBe(true);
  });

  it('frontmatter is non-empty (slug present)', () => {
    const frontmatter = extractFrontmatter(note);
    expect(frontmatter).toContain('slug: Morituri');
  });
});

// ---------------------------------------------------------------------------
// Test 4 -- YAML escaping: founded_by with commas
// ---------------------------------------------------------------------------

describe('Test 4: YAML escaping -- founded_by containing commas', () => {
  const c = minimalClan({ founded_by: 'votary, cara, overdose' });
  const f = minimalFlags({ source_template: 'none' });
  const note = buildClanNoteMarkdown(c, f);
  const frontmatter = extractFrontmatter(note);

  it('founded_by line is double-quoted (comma triggers quoting)', () => {
    expect(frontmatter).toContain('founded_by: "votary, cara, overdose"');
  });
});

// ---------------------------------------------------------------------------
// Test 5 -- YAML escaping: disbanded with colon (confirmed quoting trigger)
// ---------------------------------------------------------------------------

describe('Test 5: YAML escaping -- disbanded with colon', () => {
  // 'merged: with X' contains a colon, which is in YAML_NEEDS_QUOTE_RE -> double-quoted.
  const c = minimalClan({ disbanded: 'merged: with X' });
  const f = minimalFlags({ source_template: 'none' });
  const note = buildClanNoteMarkdown(c, f);
  const frontmatter = extractFrontmatter(note);

  it('disbanded line is double-quoted (colon triggers quoting)', () => {
    expect(frontmatter).toContain('disbanded: "merged: with X"');
  });

  it('plain disbanded without special chars is bare (no unnecessary quoting)', () => {
    const c2 = minimalClan({ disbanded: 'merged with Tossers' });
    const note2 = buildClanNoteMarkdown(c2, f);
    const fm2 = extractFrontmatter(note2);
    // 'merged with Tossers' has no YAML-special chars -- emitted bare.
    expect(fm2).toContain('disbanded: merged with Tossers');
  });
});
