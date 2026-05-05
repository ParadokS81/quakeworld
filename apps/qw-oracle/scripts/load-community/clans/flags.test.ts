// apps/qw-oracle/scripts/load-community/clans/flags.test.ts
//
// Bun tests for computeClanFlags. Uses snapshot articles from
// apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ as fixtures.
// All flag-output values pinned against smoke run on 2026-05-05.

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseClan, type ParsedClan } from './parse.ts';
import { computeClanFlags } from './flags.ts';
import type { WikiArticle } from '../shared/wiki-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT  = resolve(__dirname, '..', '..', '..');

function loadFlags(slug: string) {
  const path = resolve(APP_ROOT, 'data', 'wiki-snapshots', '2026-05-04', 'articles', `${slug}.json`);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const article = { ...(raw as WikiArticle), slug };
  const parsed = parseClan(article);
  return { parsed, flags: computeClanFlags(parsed) };
}

// ---------------------------------------------------------------------------
// 1. Sublime -- {{Clan-info}}
//    prefix=[s] + founded_year=2011 + founded_by + irc_channel=sublime (4/5 signals)
//    narrative_byte_length=1873 >= 500: has_note=true
// ---------------------------------------------------------------------------

describe('computeClanFlags -- Sublime', () => {
  const { parsed, flags } = loadFlags('Sublime');

  test('source_template is clan_info', () => {
    expect(flags.source_template).toBe('clan_info');
  });

  test('is_substantive (prefix + founded_year + founded_by + irc_channel = 4/5)', () => {
    expect(parsed.prefix).toBe('[s]');
    expect(parsed.founded_year).toBe(2011);
    expect(parsed.founded_by).not.toBeNull();
    expect(parsed.irc_channel).toBe('sublime');
    expect(flags.is_substantive).toBe(true);
  });

  test('has_note (narrative_byte_length >= 500 fires)', () => {
    expect(parsed.narrative_byte_length).toBeGreaterThanOrEqual(500);
    expect(flags.has_note).toBe(true);
  });

  test('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Euthanasia -- {{Infobox 4on4team}}
//    prefix=[E] + founded_year=1997 + founded_by=Ettan + irc_channel=euthanasia (4/5 signals)
//    achievements_count=4 >= 3: has_note=true
// ---------------------------------------------------------------------------

describe('computeClanFlags -- Euthanasia', () => {
  const { parsed, flags } = loadFlags('Euthanasia');

  test('source_template is infobox_4on4team', () => {
    expect(flags.source_template).toBe('infobox_4on4team');
  });

  test('is_substantive (prefix + founded_year + founded_by + irc_channel = 4/5)', () => {
    expect(parsed.prefix).toBe('[E]');
    expect(parsed.founded_year).toBe(1997);
    expect(parsed.founded_by).toContain('Ettan');
    expect(parsed.irc_channel).toBe('euthanasia');
    expect(flags.is_substantive).toBe(true);
  });

  test('has_note (achievements_count >= 3 fires)', () => {
    expect(parsed.achievements_count).toBeGreaterThanOrEqual(3);
    expect(flags.has_note).toBe(true);
  });

  test('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Apocalypse_2000 -- {{Infobox Clan}}
//    prefix=a2k + founded_year=1999 + founded_by + irc_channel=a2k.qw (4/5 signals)
//    narrative_byte_length=6319 >= 500: has_note=true
// ---------------------------------------------------------------------------

describe('computeClanFlags -- Apocalypse_2000', () => {
  const { parsed, flags } = loadFlags('Apocalypse_2000');

  test('source_template is infobox_clan', () => {
    expect(flags.source_template).toBe('infobox_clan');
  });

  test('is_substantive (prefix + founded_year + founded_by + irc_channel = 4/5)', () => {
    expect(parsed.prefix).toBe('a2k');
    expect(parsed.founded_year).toBe(1999);
    expect(parsed.founded_by).not.toBeNull();
    expect(parsed.irc_channel).toBe('a2k.qw');
    expect(flags.is_substantive).toBe(true);
  });

  test('has_note (narrative_byte_length >= 500 fires)', () => {
    expect(parsed.narrative_byte_length).toBeGreaterThanOrEqual(500);
    expect(flags.has_note).toBe(true);
  });

  test('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Firing_Squad -- {{Clan-info}} (F25 corrected: not bullet_prose)
//    prefix=[fs] + founded_year=1995 + founded_by + irc_channel=fs (4/5 signals)
//    narrative_byte_length=4323 >= 500: has_note=true
// ---------------------------------------------------------------------------

describe('computeClanFlags -- Firing_Squad', () => {
  const { parsed, flags } = loadFlags('Firing_Squad');

  test('source_template is clan_info', () => {
    expect(flags.source_template).toBe('clan_info');
  });

  test('is_substantive (prefix + founded_year + founded_by + irc_channel = 4/5)', () => {
    expect(parsed.prefix).toBe('[fs]');
    expect(parsed.founded_year).toBe(1995);
    expect(parsed.founded_by).not.toBeNull();
    expect(parsed.irc_channel).toBe('fs');
    expect(flags.is_substantive).toBe(true);
  });

  test('has_note (narrative_byte_length >= 500 fires)', () => {
    expect(parsed.narrative_byte_length).toBeGreaterThanOrEqual(500);
    expect(flags.has_note).toBe(true);
  });

  test('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Morituri -- bullet_prose, Information section
//    prefix=mor + irc_channel=mor (2/5 signals) -- is_substantive=true
//    has_note=true because external_links_section.length > 0 (107 bytes)
// ---------------------------------------------------------------------------

describe('computeClanFlags -- Morituri', () => {
  const { parsed, flags } = loadFlags('Morituri');

  test('source_template is bullet_prose', () => {
    expect(flags.source_template).toBe('bullet_prose');
  });

  test('is_substantive (prefix + irc_channel = 2/5; founded_year and founded_by are null)', () => {
    expect(parsed.prefix).toBe('mor');
    expect(parsed.irc_channel).toBe('mor');
    expect(parsed.founded_year).toBeNull();
    expect(parsed.founded_by).toBeNull();
    expect(flags.is_substantive).toBe(true);
  });

  test('has_note (external_links_section is non-empty)', () => {
    expect(parsed.external_links_section.length).toBeGreaterThan(0);
    expect(flags.has_note).toBe(true);
  });

  test('is_stub is false', () => {
    expect(flags.is_stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Xband -- bullet_prose, pure prose (F25 substitute)
//    no prefix, no founded_year, no founded_by, no irc_channel (0/4 structured signals)
//    narrative_byte_length=9521 >= 500 (1/5 total) -- is_substantive=false
//    has_note=true because narrative_byte_length >= 500 and has_history=true
// ---------------------------------------------------------------------------

describe('computeClanFlags -- Xband', () => {
  const { parsed, flags } = loadFlags('Xband');

  test('source_template is bullet_prose', () => {
    expect(flags.source_template).toBe('bullet_prose');
  });

  test('is_substantive is false (only hasNarrativeProse fires = 1/5)', () => {
    expect(parsed.prefix).toBeNull();
    expect(parsed.founded_year).toBeNull();
    expect(parsed.founded_by).toBeNull();
    expect(parsed.irc_channel).toBeNull();
    expect(parsed.narrative_byte_length).toBeGreaterThanOrEqual(500);
    expect(flags.is_substantive).toBe(false);
  });

  test('has_note is true (narrative_byte_length >= 500 fires)', () => {
    expect(parsed.narrative_byte_length).toBeGreaterThanOrEqual(500);
    expect(flags.has_note).toBe(true);
  });

  test('is_stub is true (inverse of is_substantive)', () => {
    expect(flags.is_stub).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Synthetic empty-stub -- all-null / zero / empty fields
//    0/5 signals: is_substantive=false, has_note=false, is_stub=true
// ---------------------------------------------------------------------------

describe('computeClanFlags -- empty-stub synthetic', () => {
  const empty: ParsedClan = {
    slug: 'EmptyStub', title: 'Empty Stub',
    prefix: null, nationality: null, nationality_iso: null,
    founded_year: null, founded_month: null, founded_day: null,
    founded_by: null, disbanded: null, status: 'unknown',
    irc_channel: null, irc_network: null, website: null,
    source_template: 'none', source_categories: ['Category:Clans'],
    wiki_revision_id: 0, wiki_fetched_at: '2026-05-04T00:00:00Z',
    narrative_intro: '', history_section: '', info_section: '',
    achievements_section: '', members_section: '',
    see_also_section: '', external_links_section: '',
    narrative_byte_length: 0, has_history: false, achievements_count: 0,
  };
  const flags = computeClanFlags(empty);

  test('is_substantive is false (0/5 signals)', () => {
    expect(flags.is_substantive).toBe(false);
  });

  test('has_note is false (no prose, no history, no achievements, no external links)', () => {
    expect(flags.has_note).toBe(false);
  });

  test('is_stub is true (inverse of is_substantive)', () => {
    expect(flags.is_stub).toBe(true);
  });

  test('source_template is none', () => {
    expect(flags.source_template).toBe('none');
  });
});
