// apps/qw-oracle/serve/mcp/src/token-match.test.ts
//
// Pure tokeniser/pattern cases -- no fixtures. The SQL fragments are covered
// through the tools that use them (search-mechanics / search-gameplay-entities
// / search-entities tests).

import { describe, expect, test } from 'bun:test';
import { containsPatterns, queryTokens } from './token-match.ts';

describe('queryTokens', () => {
  test('splits on whitespace, lowercases, de-duplicates', () => {
    expect(queryTokens('Splash  self SPLASH damage')).toEqual(['splash', 'self', 'damage']);
  });

  test('keeps underscores unless asked to split on them', () => {
    expect(queryTokens('pm_ktjump')).toEqual(['pm_ktjump']);
    expect(queryTokens('self_splash damage', { splitUnderscore: true })).toEqual(['self', 'splash', 'damage']);
  });

  test('keeps the +/- of commands and cmdline params and the % of macros', () => {
    expect(queryTokens('+attack -nosound %l')).toEqual(['+attack', '-nosound', '%l']);
  });

  test('strips quotes and sentence punctuation at the edges only', () => {
    expect(queryTokens('"pm_ktjump", weapon:frogbot:std?')).toEqual(['pm_ktjump', 'weapon:frogbot:std']);
  });

  test('a lone % or - stays a word; edge-punctuation-only words and empty queries yield none', () => {
    expect(queryTokens('- %')).toEqual(['-', '%']);
    expect(queryTokens('? ... "')).toEqual([]);
    expect(queryTokens('   ')).toEqual([]);
    expect(queryTokens(undefined)).toEqual([]);
  });

  test('caps the token count', () => {
    const many = Array.from({ length: 40 }, (_, i) => `w${i}`).join(' ');
    expect(queryTokens(many).length).toBe(16);
  });
});

describe('containsPatterns', () => {
  test('wraps each token and escapes LIKE wildcards so they match literally', () => {
    expect(containsPatterns(['splash', '%l', 'a_b'])).toEqual(['%splash%', '%\\%l%', '%a\\_b%']);
  });
});
