// apps/qw-oracle/scripts/load-community/players/emit-note.test.ts
//
// Bun tests for buildNoteMarkdown.
// Fixtures are read from data/wiki-snapshots/2026-05-04/articles/.

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePlayer } from './parse.ts';
import { computePlayerFlags } from './flags.ts';
import { buildNoteMarkdown } from './emit-note.ts';
import type { ParsedPlayer } from './parse.ts';
import type { WikiArticle } from '../shared/wiki-types.ts';

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

// Minimal ParsedPlayer factory for synthetic tests.
// Only the fields relevant to each test need non-default values.
function minimalPlayer(overrides: Partial<ParsedPlayer> = {}): ParsedPlayer {
  return {
    slug: 'test-player',
    title: 'Test Player',
    display_name: 'Test Player',
    aliases: [],
    real_name: null,
    nationality: null,
    nationality_iso: null,
    current_clan: null,
    community_roles: [],
    status: 'unknown',
    active_year_start: null,
    active_year_end: null,
    source_template: 'none',
    source_categories: [],
    wiki_revision_id: 1,
    wiki_fetched_at: '2026-01-01T00:00:00Z',
    clan_history: [],
    achievements: [],
    narrative_intro: '',
    info_section_extras: '',
    quotes_section: '',
    trivia_section: '',
    media_section: '',
    gallery_section: '',
    see_also_section: '',
    external_links_section: '',
    mouse_settings_present: false,
    crosshair_present: false,
    gallery_image_count: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1 -- Milton frontmatter fields
// ---------------------------------------------------------------------------

describe('Test 1: Milton frontmatter fields', () => {
  const article = loadArticle('Milton');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);
  const note = buildNoteMarkdown(parsed, flags);

  // Extract just the frontmatter block (between first --- and second ---)
  const fmEnd = note.indexOf('\n---\n', 4);
  const frontmatter = note.slice(4, fmEnd);

  it('slug is Milton', () => {
    expect(frontmatter).toContain('slug: Milton');
  });

  it('real_name contains Joni Sivula', () => {
    // May be quoted: real_name: "Joni Sivula" or real_name: Joni Sivula
    expect(frontmatter).toMatch(/real_name:.*Joni Sivula/);
  });

  it('nationality is Finnish', () => {
    expect(frontmatter).toContain('nationality: Finnish');
  });

  it('current_clan contains Black Book', () => {
    expect(frontmatter).toMatch(/current_clan:.*Black Book/);
  });

  it('status is Active', () => {
    expect(frontmatter).toContain('status: Active');
  });

  it('active_year_start is 1997', () => {
    expect(frontmatter).toContain('active_year_start: 1997');
  });

  it('body contains trivia or equipment content', () => {
    const body = note.slice(fmEnd + 5); // skip past the closing ---\n\n
    // Milton has trivia_section and mouse_settings_present; the body should have
    // at least a Trivia section or mouse settings table content.
    expect(body.length).toBeGreaterThan(0);
    const hasTrivia = body.includes('## Trivia') || body.includes('Mouse') || body.includes('{{Mouse');
    expect(hasTrivia).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 2 -- ParadokS has_note=true
// ---------------------------------------------------------------------------

describe('Test 2: ParadokS has_note=true', () => {
  const article = loadArticle('ParadokS');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('has_note is true', () => {
    expect(flags.has_note).toBe(true);
  });

  const note = buildNoteMarkdown(parsed, flags);
  const fmEnd = note.indexOf('\n---\n', 4);
  const frontmatter = note.slice(4, fmEnd);

  it('nationality is Danish', () => {
    expect(frontmatter).toContain('nationality: Danish');
  });

  it('body is non-empty (narrative intro or quotes)', () => {
    const afterDelim = note.indexOf('\n---\n', 4) + 5;
    const body = note.slice(afterDelim);
    expect(body.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3 -- Crit callable even with has_note=false
// ---------------------------------------------------------------------------

describe('Test 3: Crit callable with has_note=false', () => {
  const article = loadArticle('Crit');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('has_note is false', () => {
    expect(flags.has_note).toBe(false);
  });

  it('buildNoteMarkdown does not throw', () => {
    expect(() => buildNoteMarkdown(parsed, flags)).not.toThrow();
  });

  const note = buildNoteMarkdown(parsed, flags);

  it('returned string starts with ---', () => {
    expect(note.startsWith('---\n')).toBe(true);
  });

  it('body does not contain Quotes with ?? content', () => {
    // The ?? sentinel must not appear under a ## Quotes heading.
    const quotesIdx = note.indexOf('## Quotes');
    if (quotesIdx !== -1) {
      // If a Quotes section exists (it should not for Crit), verify it has real content.
      const quotesContent = note.slice(quotesIdx, quotesIdx + 60);
      expect(quotesContent).not.toContain('??');
    } else {
      // No Quotes section at all is the expected outcome.
      expect(note.indexOf('## Quotes')).toBe(-1);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 4 -- YAML escaping: apostrophe in real_name
// ---------------------------------------------------------------------------

describe('Test 4: YAML escaping -- apostrophe in real_name', () => {
  const p = minimalPlayer({ real_name: "O'Brien" });
  const flags = computePlayerFlags(p);
  const note = buildNoteMarkdown(p, flags);

  const fmEnd = note.indexOf('\n---\n', 4);
  const frontmatter = note.slice(4, fmEnd);

  it('real_name line uses double quotes around the value', () => {
    // The apostrophe requires quoting; we expect double-quote wrapping.
    expect(frontmatter).toMatch(/real_name: "O'Brien"/);
  });
});

// ---------------------------------------------------------------------------
// Test 5 -- Empty aliases renders as []
// ---------------------------------------------------------------------------

describe('Test 5: Empty aliases', () => {
  const p = minimalPlayer({ aliases: [] });
  const flags = computePlayerFlags(p);
  const note = buildNoteMarkdown(p, flags);

  const fmEnd = note.indexOf('\n---\n', 4);
  const frontmatter = note.slice(4, fmEnd);

  it('aliases field is []', () => {
    expect(frontmatter).toContain('aliases: []');
  });
});

// ---------------------------------------------------------------------------
// Test 6 -- YouTube embed conversion
// ---------------------------------------------------------------------------

describe('Test 6: YouTube embed conversion', () => {
  const p = minimalPlayer({ media_section: '{{#ev:youtube|abc123|300}}' });
  const flags = computePlayerFlags(p);
  const note = buildNoteMarkdown(p, flags);

  it('body contains the youtube URL', () => {
    expect(note).toContain('https://youtube.com/watch?v=abc123');
  });
});
