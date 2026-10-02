// apps/qw-oracle/serve/mcp/src/token-match.ts
//
// Shared word-level matching for the tools whose lexical leg is a substring
// match over short name/notes columns (search_mechanics and
// search_gameplay_entities via wordMatch; the name leg of search_entities
// reuses the tokeniser). A
// whole-string ILIKE only fires when the caller types the exact phrase stored
// in the row, which no multi-word query does ("splash self damage radius" vs
// a row named self_splash_half_damage). Here the query is cut into words and
// each word has to appear somewhere in the row.

import { db } from './db.ts';

// A public endpoint feeds these tools; every extra token is another scan over
// the table, and past this many words the tail adds no selectivity anyway.
const MAX_TOKENS = 16;

// Quotes and sentence punctuation around a word are the caller's typing, not
// part of the name. Internal characters (`:`, `-`, `+`, `%`) stay: entity names
// carry them (`+attack`, `weapon:frogbot:std`, `%l`).
const EDGE_PUNCTUATION = /^[\s"'`()[\]{}<>,;.!?:]+|[\s"'`()[\]{}<>,;.!?:]+$/g;

// Lowercased, de-duplicated words of a query. `splitUnderscore` treats `_` as a
// word break, for tools whose stored names use underscores where a person types
// spaces. A lone `%` or `-` survives as a word: it asks for a literal one.
export function queryTokens(
  query: string | undefined,
  opts: { splitUnderscore?: boolean } = {},
): string[] {
  if (!query) return [];
  const splitter = opts.splitUnderscore ? /[\s_]+/ : /\s+/;
  const tokens = query
    .toLowerCase()
    .split(splitter)
    .map((t) => t.replace(EDGE_PUNCTUATION, ''))
    .filter((t) => t !== '');
  return [...new Set(tokens)].slice(0, MAX_TOKENS);
}

// `%word%` ILIKE patterns with LIKE's own wildcards escaped, so a typed `%` or
// `_` is a literal character and not "match anything".
export function containsPatterns(tokens: string[]): string[] {
  return tokens.map((t) => `%${t.replace(/[\\%_]/g, '\\$&')}%`);
}

// WHERE fragment: every pattern matches somewhere in the listed columns. NULL
// columns are skipped (concat_ws), and the single-space separator cannot be
// bridged by a token because tokens never contain whitespace.
function matchesAllTokens(columns: string[], patterns: string[]) {
  return db`concat_ws(' ', ${db(columns)}) ILIKE ALL (${patterns}::text[])`;
}

// How many of the patterns hit one column.
function tokenHits(column: string, patterns: string[]) {
  return db`(SELECT count(*) FROM unnest(${patterns}::text[]) AS p WHERE ${db(column)} ILIKE p)`;
}

// The two SQL fragments a word-matched tool needs for `query` over `columns`:
// an `AND ...` filter, and ranking keys (each ending in a comma, to sit in
// front of the tool's own ORDER BY) that put hits in earlier columns first --
// pass columns most-significant first. No query means no filter and no
// ranking, so a plain listing keeps the tool's own order. A query made only of
// punctuation matches nothing, as it did under the whole-string ILIKE, rather
// than turning into "list everything".
export function wordMatch(query: string | undefined, columns: string[]) {
  const patterns = containsPatterns(queryTokens(query, { splitUnderscore: true }));
  if (patterns.length === 0) return { where: query ? db`AND FALSE` : db``, rank: db`` };
  return {
    where: db`AND ${matchesAllTokens(columns, patterns)}`,
    rank: columns.reduce((acc, c) => db`${acc} ${tokenHits(c, patterns)} DESC,`, db``),
  };
}
