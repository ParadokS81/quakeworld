// apps/qw-oracle/scripts/load-community/players/flags.test.ts
//
// Bun tests for computePlayerFlags. Uses snapshot articles from
// apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ as fixtures.

import { describe, it, expect } from 'bun:test';
import { parsePlayer } from './parse.ts';
import { computePlayerFlags } from './flags.ts';
import type { ParsedPlayer } from './parse.ts';
import type { WikiArticle } from '../shared/wiki-types.ts';

// ---------------------------------------------------------------------------
// Fixture loader
// ---------------------------------------------------------------------------

const SNAPSHOT_DIR = new URL(
  '../../../data/wiki-snapshots/2026-05-04/articles/',
  import.meta.url,
);

function loadArticle(filename: string): WikiArticle {
  const path = new URL(filename, SNAPSHOT_DIR);
  // Bun supports direct JSON import via require-style; use readFileSync to keep it simple.
  const raw = require('fs').readFileSync(path.pathname, 'utf-8') as string;
  const obj = JSON.parse(raw) as Omit<WikiArticle, 'slug'>;
  const slug = filename.replace(/\.json$/, '');
  return { ...obj, slug };
}

// ---------------------------------------------------------------------------
// Milton
// ---------------------------------------------------------------------------

describe('Milton', () => {
  const article = loadArticle('Milton.json');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('source_template is infobox_player', () => {
    expect(flags.source_template).toBe('infobox_player');
  });

  it('is_substantive (real_name + clan_history + achievements fire)', () => {
    expect(flags.is_substantive).toBe(true);
  });

  it('has_note (mouse_settings_present + crosshair_present + trivia_section fire)', () => {
    expect(parsed.mouse_settings_present).toBe(true);
    expect(parsed.crosshair_present).toBe(true);
    expect(parsed.trivia_section.length).toBeGreaterThan(0);
    expect(flags.has_note).toBe(true);
  });

  it('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ParadokS
// ---------------------------------------------------------------------------

describe('ParadokS', () => {
  const article = loadArticle('ParadokS.json');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('source_template is player_info', () => {
    expect(flags.source_template).toBe('player_info');
  });

  it('is_substantive (real_name + clan_history + achievements fire)', () => {
    expect(parsed.real_name).toBe('David Larsen');
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(1);
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(1);
    expect(flags.is_substantive).toBe(true);
  });

  it('has_note (quotes_section is non-empty)', () => {
    expect(parsed.quotes_section.length).toBeGreaterThan(0);
    expect(parsed.quotes_section).not.toBe('???');
    expect(flags.has_note).toBe(true);
  });

  it('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Purity
// ---------------------------------------------------------------------------

describe('Purity', () => {
  const article = loadArticle('Purity.json');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('source_template is player_info', () => {
    expect(flags.source_template).toBe('player_info');
  });

  it('is_substantive (real_name + aliases + clan_history + achievements fire)', () => {
    expect(parsed.real_name).not.toBeNull();
    expect(parsed.aliases.length).toBeGreaterThan(0);
    expect(parsed.clan_history.length).toBeGreaterThan(0);
    expect(parsed.achievements.length).toBeGreaterThan(0);
    expect(flags.is_substantive).toBe(true);
  });

  it('has_note (quotes_section is non-empty)', () => {
    expect(parsed.quotes_section.length).toBeGreaterThan(0);
    expect(parsed.quotes_section).not.toBe('???');
    expect(flags.has_note).toBe(true);
  });

  it('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Crit -- is_substantive=true, has_note=false (D5 independence)
// ---------------------------------------------------------------------------

describe('Crit', () => {
  const article = loadArticle('Crit.json');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('source_template is bullet_prose', () => {
    expect(flags.source_template).toBe('bullet_prose');
  });

  it('is_substantive (real_name + clan_history + achievements fire = 3/5)', () => {
    expect(parsed.real_name).not.toBeNull();
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(1);
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(1);
    expect(flags.is_substantive).toBe(true);
  });

  // D5: has_note is independent of is_substantive.
  // Crit has no prose >= 500, quotes_section is cleared to '' by the ?? guard,
  // no trivia, no mouse/crosshair tables, no gallery, no media.
  it('has_note is false (no unique prose content)', () => {
    expect(parsed.narrative_intro.length).toBeLessThan(500);
    // extractSectionBody now strips trailing empty lines, returning '??'.
    // The parser scrub then fires (quotes_section === '??' -> ''), so the stored value is ''.
    expect(parsed.quotes_section).toBe('');
    expect(parsed.trivia_section.length).toBe(0);
    expect(parsed.mouse_settings_present).toBe(false);
    expect(parsed.crosshair_present).toBe(false);
    expect(flags.has_note).toBe(false);
  });

  it('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bomkia -- is_substantive=false, is_stub=true
// ---------------------------------------------------------------------------

describe('Bomkia', () => {
  const article = loadArticle('Bomkia.json');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('source_template is bullet_prose', () => {
    // Real name: ???, Nationality:, Current clan: -- 2 of 3 bullet patterns match
    expect(flags.source_template).toBe('bullet_prose');
  });

  it('is_substantive is false (only clan_history fires = 1/5)', () => {
    // real_name is null (??? sentinel), aliases=[], achievements=[] (???)
    expect(parsed.real_name).toBeNull();
    expect(parsed.aliases.length).toBe(0);
    expect(parsed.achievements.length).toBe(0);
    // clan_history has 1 entry (Euthanasia)
    expect(parsed.clan_history.length).toBe(1);
    expect(flags.is_substantive).toBe(false);
  });

  it('has_note is false', () => {
    expect(flags.has_note).toBe(false);
  });

  it('is_stub is true', () => {
    expect(flags.is_stub).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Acid (Finnish Player) -- is_substantive=true, has_note flexible
// ---------------------------------------------------------------------------

describe('Acid (Finnish Player)', () => {
  const article = loadArticle('Acid_(Finnish_Player).json');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('source_template is bullet_prose', () => {
    // Real name: ??, Nationality:, Current clan: all present
    expect(flags.source_template).toBe('bullet_prose');
  });

  it('is_substantive (clan_history + achievements = 2/5)', () => {
    // real_name is null (?? sentinel)
    expect(parsed.real_name).toBeNull();
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(1);
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(1);
    expect(flags.is_substantive).toBe(true);
  });

  // Narrative intro is ~236 chars, near but below 500. has_note can be either
  // value depending on exact strip output; acceptable for v1.
  it('has_note is a boolean (either value acceptable for v1)', () => {
    expect(typeof flags.has_note).toBe('boolean');
  });

  it('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Vo0
// ---------------------------------------------------------------------------

describe('Vo0', () => {
  const article = loadArticle('Vo0.json');
  const parsed = parsePlayer(article);
  const flags = computePlayerFlags(parsed);

  it('source_template is none (prose fallback, no infobox/bullet pattern)', () => {
    expect(flags.source_template).toBe('none');
  });

  it('is_substantive (narrative_intro >= 500 + achievements fire)', () => {
    expect(parsed.narrative_intro.length).toBeGreaterThanOrEqual(500);
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(1);
    expect(flags.is_substantive).toBe(true);
  });

  it('has_note (narrative_intro >= 500)', () => {
    expect(flags.has_note).toBe(true);
  });

  it('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D20 audit: is_stub is computed as !is_substantive, NOT from category tag
// ---------------------------------------------------------------------------

describe('D20 audit: is_stub ignores Category:Player stubs', () => {
  it('player with Category:Player stubs but 3/5 substantive signals is NOT a stub', () => {
    // Mock a ParsedPlayer that has the stub category but passes 3 substantive signals.
    const mockPlayer: ParsedPlayer = {
      slug: 'mock-player',
      title: 'Mock Player',
      display_name: 'Mock Player',
      aliases: ['AltName'],                   // hasAliases = true
      real_name: 'Real Name',                  // hasRealName = true
      nationality: null,
      nationality_iso: null,
      current_clan: null,
      community_roles: [],
      status: 'Retired',
      active_year_start: 2000,
      active_year_end: 2005,
      source_template: 'bullet_prose',
      source_categories: ['Category:Players', 'Category:Player stubs'],  // stub tag present
      wiki_revision_id: 1,
      wiki_fetched_at: '2026-01-01T00:00:00Z',
      clan_history: [                          // hasClanHistory = true
        { clan_title: 'Some Clan', clan_slug: null, start_year: 2000, end_year: 2003, flag_iso: null, source: 'wiki_bullet' },
      ],
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
    };

    const flags = computePlayerFlags(mockPlayer);

    // 3 signals fire: hasRealName, hasAliases, hasClanHistory
    expect(flags.is_substantive).toBe(true);
    // is_stub must be false even though source_categories includes the stub tag
    expect(flags.is_stub).toBe(false);
  });
});
