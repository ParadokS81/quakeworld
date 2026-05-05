// apps/qw-oracle/scripts/load-community/clans/parse.test.ts
//
// F25: Firing_Squad / Slackers contain Clan-info; Xband added as pure-prose fixture.
//
// Fixture-based tests for parseClan. Reads snapshot JSON directly --
// no fixture copying or mocking. Test author verified all assertions
// against parser smoke output during synthesis.

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseClan } from './parse.ts';
import type { WikiArticle } from '../shared/wiki-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT  = resolve(__dirname, '..', '..', '..');

function loadFixture(slug: string): WikiArticle {
  const path = resolve(APP_ROOT, 'data', 'wiki-snapshots', '2026-05-04', 'articles', `${slug}.json`);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return { ...(raw as WikiArticle), slug };
}

// ---------------------------------------------------------------------------
// 1. Sublime -- {{Clan-info}}
// ---------------------------------------------------------------------------

describe('parseClan -- Sublime (Clan-info)', () => {
  const parsed = parseClan(loadFixture('Sublime'));

  test('source_template is clan_info', () => {
    expect(parsed.source_template).toBe('clan_info');
  });

  test('prefix is [s]', () => {
    expect(parsed.prefix).toBe('[s]');
  });

  test('nationality is Swedish', () => {
    expect(parsed.nationality).toBe('Swedish');
  });

  test('nationality_iso is se', () => {
    expect(parsed.nationality_iso).toBe('se');
  });

  test('founded_year is 2011', () => {
    expect(parsed.founded_year).toBe(2011);
  });

  test('founded_month is 4', () => {
    expect(parsed.founded_month).toBe(4);
  });

  test('founded_day is 13', () => {
    expect(parsed.founded_day).toBe(13);
  });

  test('founded_by contains votary', () => {
    expect(parsed.founded_by).toContain('votary');
  });

  test('irc_channel is sublime', () => {
    expect(parsed.irc_channel).toBe('sublime');
  });

  test('irc_network is QuakeNet', () => {
    expect(parsed.irc_network).toBe('QuakeNet');
  });

  test('status is unknown', () => {
    expect(parsed.status).toBe('unknown');
  });

  test('disbanded is null', () => {
    expect(parsed.disbanded).toBeNull();
  });

  test('history_section is non-empty', () => {
    expect(parsed.history_section.length).toBeGreaterThan(0);
  });

  test('achievements_count is 0', () => {
    expect(parsed.achievements_count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Euthanasia -- {{Infobox 4on4team}}
// ---------------------------------------------------------------------------

describe('parseClan -- Euthanasia (Infobox 4on4team)', () => {
  const parsed = parseClan(loadFixture('Euthanasia'));

  test('source_template is infobox_4on4team', () => {
    expect(parsed.source_template).toBe('infobox_4on4team');
  });

  test('prefix is [E]', () => {
    expect(parsed.prefix).toBe('[E]');
  });

  test('nationality_iso is se', () => {
    expect(parsed.nationality_iso).toBe('se');
  });

  test('nationality is Swedish', () => {
    expect(parsed.nationality).toBe('Swedish');
  });

  test('founded_year is 1997', () => {
    expect(parsed.founded_year).toBe(1997);
  });

  test('founded_month is 4', () => {
    expect(parsed.founded_month).toBe(4);
  });

  test('founded_day is null', () => {
    expect(parsed.founded_day).toBeNull();
  });

  test('founded_by contains Ettan', () => {
    expect(parsed.founded_by).toContain('Ettan');
  });

  test('irc_channel is euthanasia', () => {
    expect(parsed.irc_channel).toBe('euthanasia');
  });

  test('status is Inactive', () => {
    expect(parsed.status).toBe('Inactive');
  });

  test('narrative_intro length > 200', () => {
    expect(parsed.narrative_intro.length).toBeGreaterThan(200);
  });

  test('has_history is false (no ==History== heading)', () => {
    expect(parsed.has_history).toBe(false);
  });

  test('achievements_count >= 4', () => {
    expect(parsed.achievements_count).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// 3. Apocalypse_2000 -- {{Infobox Clan}}
// ---------------------------------------------------------------------------

describe('parseClan -- Apocalypse_2000 (Infobox Clan)', () => {
  const parsed = parseClan(loadFixture('Apocalypse_2000'));

  test('source_template is infobox_clan', () => {
    expect(parsed.source_template).toBe('infobox_clan');
  });

  test('prefix is a2k', () => {
    expect(parsed.prefix).toBe('a2k');
  });

  test('nationality is English', () => {
    expect(parsed.nationality).toBe('English');
  });

  test('nationality_iso is gb', () => {
    expect(parsed.nationality_iso).toBe('gb');
  });

  test('founded_year is 1999', () => {
    expect(parsed.founded_year).toBe(1999);
  });

  test('founded_month is 5', () => {
    expect(parsed.founded_month).toBe(5);
  });

  test('founded_day is 11', () => {
    expect(parsed.founded_day).toBe(11);
  });

  test('founded_by contains Red', () => {
    expect(parsed.founded_by).toContain('Red');
  });

  test('founded_by contains Shadz', () => {
    expect(parsed.founded_by).toContain('Shadz');
  });

  test('irc_channel is a2k.qw', () => {
    expect(parsed.irc_channel).toBe('a2k.qw');
  });

  test('irc_network is QuakeNet', () => {
    expect(parsed.irc_network).toBe('QuakeNet');
  });

  test('status is Active', () => {
    expect(parsed.status).toBe('Active');
  });

  test('website contains apocalypse2000', () => {
    expect(parsed.website).toContain('apocalypse2000');
  });
});

// ---------------------------------------------------------------------------
// 4. Firing_Squad -- clan_info (F25 corrected: not bullet_prose as phase MD assumed)
// ---------------------------------------------------------------------------

describe('parseClan -- Firing_Squad (Clan-info, F25 corrected)', () => {
  const parsed = parseClan(loadFixture('Firing_Squad'));

  test('source_template is clan_info', () => {
    expect(parsed.source_template).toBe('clan_info');
  });

  test('prefix is [fs]', () => {
    expect(parsed.prefix).toBe('[fs]');
  });

  test('nationality is Dutch', () => {
    expect(parsed.nationality).toBe('Dutch');
  });

  test('nationality_iso is nl', () => {
    expect(parsed.nationality_iso).toBe('nl');
  });

  test('founded_year is 1995', () => {
    expect(parsed.founded_year).toBe(1995);
  });

  test('founded_month is null', () => {
    expect(parsed.founded_month).toBeNull();
  });

  test('founded_day is null', () => {
    expect(parsed.founded_day).toBeNull();
  });

  test('founded_by contains krazy', () => {
    expect(parsed.founded_by).toContain('krazy');
  });

  test('founded_by contains smo0k', () => {
    expect(parsed.founded_by).toContain('smo0k');
  });

  test('irc_channel is fs', () => {
    expect(parsed.irc_channel).toBe('fs');
  });

  test('irc_network is QuakeNet', () => {
    expect(parsed.irc_network).toBe('QuakeNet');
  });

  test('status is unknown', () => {
    expect(parsed.status).toBe('unknown');
  });

  test('narrative_intro length > 50 (lead paragraph before infobox)', () => {
    expect(parsed.narrative_intro.length).toBeGreaterThan(50);
  });

  test('history_section length > 500 (rich History section after infobox)', () => {
    expect(parsed.history_section.length).toBeGreaterThan(500);
  });
});

// ---------------------------------------------------------------------------
// 5. Morituri -- bullet_prose with Information section
// ---------------------------------------------------------------------------

describe('parseClan -- Morituri (bullet_prose, Information section)', () => {
  const parsed = parseClan(loadFixture('Morituri'));

  test('source_template is bullet_prose', () => {
    expect(parsed.source_template).toBe('bullet_prose');
  });

  test('prefix is mor', () => {
    expect(parsed.prefix).toBe('mor');
  });

  test('nationality is British', () => {
    expect(parsed.nationality).toBe('British');
  });

  test('nationality_iso is gb (uk->gb normalization)', () => {
    expect(parsed.nationality_iso).toBe('gb');
  });

  test('irc_channel is mor', () => {
    expect(parsed.irc_channel).toBe('mor');
  });

  test('irc_network contains QuakeNet', () => {
    expect(parsed.irc_network).toContain('QuakeNet');
  });

  test('website contains atrophied.co.uk', () => {
    expect(parsed.website).toContain('atrophied.co.uk');
  });

  test('founded_year is null (foundedby field is ???)', () => {
    expect(parsed.founded_year).toBeNull();
  });

  test('founded_by is null', () => {
    expect(parsed.founded_by).toBeNull();
  });

  test('narrative_intro length < 100 (brief introduction placeholder)', () => {
    expect(parsed.narrative_intro.length).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// 6. Xband -- bullet_prose, pure prose, no infobox (F25 substitute fixture)
// ---------------------------------------------------------------------------

describe('parseClan -- Xband (bullet_prose, pure-prose, F25 substitute)', () => {
  const parsed = parseClan(loadFixture('Xband'));

  test('source_template is bullet_prose', () => {
    expect(parsed.source_template).toBe('bullet_prose');
  });

  test('prefix is null (no Information section, no [TAG] in title)', () => {
    expect(parsed.prefix).toBeNull();
  });

  test('nationality is null', () => {
    expect(parsed.nationality).toBeNull();
  });

  test('nationality_iso is null', () => {
    expect(parsed.nationality_iso).toBeNull();
  });

  test('founded_year is null', () => {
    expect(parsed.founded_year).toBeNull();
  });

  test('founded_by is null', () => {
    expect(parsed.founded_by).toBeNull();
  });

  test('irc_channel is null', () => {
    expect(parsed.irc_channel).toBeNull();
  });

  test('has_history is true', () => {
    expect(parsed.has_history).toBe(true);
  });

  test('achievements_count is 0', () => {
    expect(parsed.achievements_count).toBe(0);
  });

  test('narrative_byte_length > 5000 (rich History prose)', () => {
    expect(parsed.narrative_byte_length).toBeGreaterThan(5000);
  });
});
