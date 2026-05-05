// apps/qw-oracle/scripts/load-community/shared/wiki-text.test.ts
//
// Tests use real articles from the snapshot so we validate against actual data shapes.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractInfoboxBlock,
  parseInfoboxFields,
  extractSectionBody,
  stripWikiMarkup,
  resolveWikiLink,
  extractCategoryNationality,
  extractFlagIso,
  splitCsv,
  splitWikiLinks,
  parseYear,
  normalizeDash,
} from './wiki-text.ts';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const SNAPSHOT_DIR = join(
  import.meta.dir,
  '../../../data/wiki-snapshots/2026-05-04/articles',
);

function loadArticle(slug: string): { wikitext: string; categories: string[] } {
  const raw = readFileSync(join(SNAPSHOT_DIR, `${slug}.json`), 'utf-8');
  const parsed = JSON.parse(raw) as { wikitext: string; categories: string[] };
  return { wikitext: parsed.wikitext, categories: parsed.categories };
}

const milton = loadArticle('Milton');
const paradoks = loadArticle('ParadokS');
const crit = loadArticle('Crit');

// ---------------------------------------------------------------------------
// extractInfoboxBlock
// ---------------------------------------------------------------------------

describe('extractInfoboxBlock', () => {
  test('Milton has {{Infobox player}} -- returns non-null block', () => {
    const block = extractInfoboxBlock(milton.wikitext, 'Infobox player');
    expect(block).not.toBeNull();
    expect(block).toContain('id=Milton');
  });

  test('ParadokS has {{Player-info}} -- returns non-null block', () => {
    const block = extractInfoboxBlock(paradoks.wikitext, 'Player-info');
    expect(block).not.toBeNull();
    expect(block).toContain('realname');
  });

  test('Crit has no live infobox (only inside HTML comment) -- returns null', () => {
    // Crit's {{Infobox Player}} is inside <!-- --> so it is NOT a real template use.
    // Our extractor scans raw wikitext; HTML comments are not stripped here.
    // The test verifies null for the non-commented template name "Infobox player" (lowercase p).
    // (The commented block uses "Infobox Player" with capital P and is inside <!-- -->.)
    const block = extractInfoboxBlock(crit.wikitext, 'Infobox player');
    expect(block).toBeNull();
  });

  test('empty wikitext returns null', () => {
    expect(extractInfoboxBlock('', 'Infobox player')).toBeNull();
  });

  test('case-insensitive template name match', () => {
    const block = extractInfoboxBlock(milton.wikitext, 'INFOBOX PLAYER');
    expect(block).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseInfoboxFields
// ---------------------------------------------------------------------------

describe('parseInfoboxFields', () => {
  test("Milton's infobox contains id, name, country fields", () => {
    const block = extractInfoboxBlock(milton.wikitext, 'Infobox player')!;
    const fields = parseInfoboxFields(block);
    expect(fields['id']).toBe('Milton');
    expect(fields['name']).toBe('Joni Sivula');
    expect(fields['country']).toBe('Finland');
  });

  test("Milton's infobox history field is present and contains TH templates", () => {
    const block = extractInfoboxBlock(milton.wikitext, 'Infobox player')!;
    const fields = parseInfoboxFields(block);
    expect(fields['history']).toBeDefined();
    expect(fields['history']).toContain('{{TH|');
  });

  test('empty value yields empty string, not undefined', () => {
    const block = extractInfoboxBlock(milton.wikitext, 'Infobox player')!;
    const fields = parseInfoboxFields(block);
    // |ids= is present with an empty value in Milton.
    expect(fields['ids']).toBe('');
  });
});

// ---------------------------------------------------------------------------
// extractSectionBody
// ---------------------------------------------------------------------------

describe('extractSectionBody', () => {
  test("Milton's Achievements section is non-null and non-empty", () => {
    const body = extractSectionBody(milton.wikitext, 'Achievements');
    expect(body).not.toBeNull();
    expect(body!.trim().length).toBeGreaterThan(0);
    expect(body).toContain('Achievement');
  });

  test('case-insensitive heading match', () => {
    const body = extractSectionBody(milton.wikitext, 'achievements');
    expect(body).not.toBeNull();
  });

  test('absent section returns null', () => {
    expect(extractSectionBody(milton.wikitext, 'NoSuchSection')).toBeNull();
  });

  test('empty wikitext returns null', () => {
    expect(extractSectionBody('', 'Achievements')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stripWikiMarkup
// ---------------------------------------------------------------------------

describe('stripWikiMarkup', () => {
  test('resolves [[Foo|Bar]] to Bar and removes [[Image:flag_fi.gif]]', () => {
    const result = stripWikiMarkup('[[Foo|Bar]] some [[Image:flag_fi.gif]] text');
    expect(result).toBe('Bar some text');
  });

  test('resolves [[Foo]] to Foo', () => {
    expect(stripWikiMarkup('[[Foo]] bar')).toBe('Foo bar');
  });

  test('removes <ref>...</ref> tags including multi-line', () => {
    const input = 'before<ref>citation\ntext</ref>after';
    expect(stripWikiMarkup(input)).toBe('beforeafter');
  });

  test("removes '' and ''' emphasis markers", () => {
    expect(stripWikiMarkup("'''bold''' and ''italic''")).toBe('bold and italic');
  });

  test('collapses multiple whitespace to single space', () => {
    expect(stripWikiMarkup('a   b\n\nc')).toBe('a b c');
  });
});

// ---------------------------------------------------------------------------
// resolveWikiLink
// ---------------------------------------------------------------------------

describe('resolveWikiLink', () => {
  test('[[Foo|Bar]] -> { target: Foo, display: Bar }', () => {
    expect(resolveWikiLink('[[Foo|Bar]]')).toEqual({ target: 'Foo', display: 'Bar' });
  });

  test('[[Foo]] -> { target: Foo, display: Foo }', () => {
    expect(resolveWikiLink('[[Foo]]')).toEqual({ target: 'Foo', display: 'Foo' });
  });

  test('plain string (not a wiki link) -> both fields are the input', () => {
    expect(resolveWikiLink('plain text')).toEqual({ target: 'plain text', display: 'plain text' });
  });
});

// ---------------------------------------------------------------------------
// extractCategoryNationality
// ---------------------------------------------------------------------------

describe('extractCategoryNationality', () => {
  test('Finnish Players category -> { nationality: Finnish, iso: fi }', () => {
    const result = extractCategoryNationality(['Category:Finnish Players', 'Category:Players']);
    expect(result).toEqual({ nationality: 'Finnish', iso: 'fi' });
  });

  test('no nationality category -> null', () => {
    expect(extractCategoryNationality(['Category:Players'])).toBeNull();
  });

  test('Milton categories resolve to Finnish/fi', () => {
    const result = extractCategoryNationality(milton.categories);
    expect(result).not.toBeNull();
    expect(result!.iso).toBe('fi');
  });

  test('Crit categories resolve to Dutch/nl', () => {
    const result = extractCategoryNationality(crit.categories);
    expect(result).not.toBeNull();
    expect(result!.iso).toBe('nl');
  });

  test('empty categories array -> null', () => {
    expect(extractCategoryNationality([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractFlagIso
// ---------------------------------------------------------------------------

describe('extractFlagIso', () => {
  test('[[Image:flag_fi.gif]] Finnish -> fi', () => {
    expect(extractFlagIso('[[Image:flag_fi.gif]] Finnish')).toBe('fi');
  });

  test('no flag pattern -> null', () => {
    expect(extractFlagIso('just some text')).toBeNull();
  });

  test('case-insensitive on Image:', () => {
    expect(extractFlagIso('[[image:flag_se.gif]]')).toBe('se');
  });
});

// ---------------------------------------------------------------------------
// parseYear
// ---------------------------------------------------------------------------

describe('parseYear', () => {
  test('[[1997]] link form -> 1997', () => {
    expect(parseYear('[[1997]]')).toBe(1997);
  });

  test('bare year in sentence -> 2003', () => {
    expect(parseYear('spawned in 2003 ...')).toBe(2003);
  });

  test('no year -> null', () => {
    expect(parseYear('no year here')).toBeNull();
  });

  test('first year wins when multiple present', () => {
    expect(parseYear('2007 - 2010')).toBe(2007);
  });
});

// ---------------------------------------------------------------------------
// splitCsv
// ---------------------------------------------------------------------------

describe('splitCsv', () => {
  test('filters empty strings and placeholder tokens', () => {
    expect(splitCsv('a, b, ???, c')).toEqual(['a', 'b', 'c']);
  });

  test('filters ?? token', () => {
    expect(splitCsv('a, ??, b')).toEqual(['a', 'b']);
  });

  test('empty string -> empty array', () => {
    expect(splitCsv('')).toEqual([]);
  });

  test('single value -> [value]', () => {
    expect(splitCsv('solo')).toEqual(['solo']);
  });
});

// ---------------------------------------------------------------------------
// normalizeDash
// ---------------------------------------------------------------------------

describe('normalizeDash', () => {
  test('en-dash U+2013 -> ASCII hyphen', () => {
    expect(normalizeDash('2007–Present')).toBe('2007-Present');
  });

  test('em-dash U+2014 -> ASCII hyphen', () => {
    expect(normalizeDash('2007—Present')).toBe('2007-Present');
  });

  test('figure-dash U+2012 -> ASCII hyphen', () => {
    expect(normalizeDash('2007‒Present')).toBe('2007-Present');
  });

  test('ASCII hyphen unchanged', () => {
    expect(normalizeDash('2007-Present')).toBe('2007-Present');
  });
});
