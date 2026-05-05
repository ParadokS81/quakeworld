// apps/qw-oracle/scripts/load-community/players/emit-note.ts
//
// Pure markdown emitter: ParsedPlayer + PlayerFlags -> markdown string.
// No IO, no DB. The CLI (Task 8) writes the file.

import type { ParsedPlayer } from './parse.ts';
import type { PlayerFlags } from './flags.ts';

// ---------------------------------------------------------------------------
// YAML helpers
// ---------------------------------------------------------------------------

// Characters that require quoting a YAML scalar value.
// Covers: special leading chars, embedded colons/hashes, brackets/braces/pipes,
// angle brackets, exclamation, ampersand, asterisk, question mark, comma,
// double/single quotes, newlines, and leading/trailing whitespace.
// Single quotes are included because YAML block scalars treat ' as the start
// of a single-quoted scalar, which is ambiguous without explicit quoting.
const YAML_NEEDS_QUOTE_RE = /[:{}\[\]|>#!&*?,"'\n]|^[- ]| $/;

// Escape a string for YAML flow-scalar use with double quotes.
// Handles backslash, double-quote, and newline inside the value.
function yamlEscapeDouble(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

// Return a YAML value representation for a string field.
// null -> '' (bare empty after colon).
// Non-empty strings that require quoting get double-quoted.
function yamlStr(v: string | null): string {
  if (v === null) return '';
  if (v === '') return '';
  if (YAML_NEEDS_QUOTE_RE.test(v) || /^['"]/.test(v)) {
    return `"${yamlEscapeDouble(v)}"`;
  }
  return v;
}

// Return a YAML value representation for a number | null field.
function yamlNum(v: number | null): string {
  if (v === null) return '';
  return String(v);
}

// Return a YAML flow-sequence for a string array.
// Empty array -> '[]'.
// Each item is quoted if it needs quoting.
function yamlArr(items: string[]): string {
  if (items.length === 0) return '[]';
  const mapped = items.map(item => {
    if (YAML_NEEDS_QUOTE_RE.test(item) || /^['"]/.test(item)) {
      return `"${yamlEscapeDouble(item)}"`;
    }
    return item;
  });
  return `[${mapped.join(', ')}]`;
}

// Build the YAML frontmatter block (without the --- delimiters).
// Only stable row fields go here (D18). Body overlay carries the rest.
function buildFrontmatter(p: ParsedPlayer): string {
  const lines: string[] = [
    `slug: ${yamlStr(p.slug)}`,
    `title: ${yamlStr(p.title)}`,
    `type: player`,
    `display_name: ${yamlStr(p.display_name)}`,
    `real_name: ${yamlStr(p.real_name)}`,
    `aliases: ${yamlArr(p.aliases)}`,
    `nationality: ${yamlStr(p.nationality)}`,
    `nationality_iso: ${yamlStr(p.nationality_iso)}`,
    `current_clan: ${yamlStr(p.current_clan)}`,
    `active_year_start: ${yamlNum(p.active_year_start)}`,
    `active_year_end: ${yamlNum(p.active_year_end)}`,
    `status: ${p.status}`,
    `community_roles: ${yamlArr(p.community_roles)}`,
    `source_template: ${p.source_template}`,
    `wiki_revision_id: ${p.wiki_revision_id}`,
    `wiki_fetched_at: ${p.wiki_fetched_at}`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Wikitext-to-markdown conversion (light pass)
// ---------------------------------------------------------------------------

// Convert a subset of wikitext to markdown.
// Deferred richer conversion (Phase 6) will handle templates like
// {{Mouse settings table|...}} -- for now those pass through verbatim.
function wikitextToMarkdown(text: string): string {
  // Strip HTML comments.
  let out = text.replace(/<!--[\s\S]*?-->/g, '');

  // Strip wiki magic words and Category: lines that appear at the end of article
  // sections (they trail the last section body with no following == heading).
  out = out.replace(/^__\w+__\s*$/gm, '');
  out = out.replace(/^\[\[Category:[^\]]*\]\]\s*$/gim, '');
  out = out.replace(/^Category:[^\n]*$/gim, '');

  // {{#ev:youtube|<id>|<size>}} -> [YouTube video](https://youtube.com/watch?v=<id>)
  // Also handle optional third arg or missing size.
  out = out.replace(
    /\{\{#ev:youtube\|([^|{}]+)(?:\|[^{}]*)?\}\}/gi,
    (_match, id: string) => `[YouTube video](https://youtube.com/watch?v=${id.trim()})`,
  );

  // [[Foo|Bar]] -> Bar
  out = out.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_m, _target, display: string) => display);

  // [[Foo]] -> Foo
  out = out.replace(/\[\[([^\]]+)\]\]/g, (_m, target: string) => target);

  return out;
}

// ---------------------------------------------------------------------------
// Body section builder
// ---------------------------------------------------------------------------

// Sentinel check: returns true when a section value is only a ?? or ??? marker.
function isSentinelOnly(s: string): boolean {
  const t = s.trim();
  return t === '??' || t === '???';
}

// Build the body text from body-only fields.
// Returns '' when all sections are empty / sentinel-only.
function buildBody(p: ParsedPlayer): string {
  const parts: string[] = [];

  const push = (heading: string, raw: string) => {
    if (!raw || isSentinelOnly(raw)) return;
    const converted = wikitextToMarkdown(raw).trimEnd();
    if (!converted) return;
    parts.push(`## ${heading}\n\n${converted}`);
  };

  // Narrative intro: no section heading, goes directly as first paragraph.
  if (p.narrative_intro && !isSentinelOnly(p.narrative_intro)) {
    const converted = wikitextToMarkdown(p.narrative_intro).trimEnd();
    if (converted) parts.push(converted);
  }

  push('Information', p.info_section_extras);
  push('Quotes', p.quotes_section);
  push('Trivia', p.trivia_section);
  push('Media', p.media_section);
  push('Gallery', p.gallery_section);
  push('See also', p.see_also_section);
  push('External links', p.external_links_section);

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Build the full markdown note for a player.
// The _flags argument is accepted for CLI/D7 context but the emitter itself
// does not gate on has_note -- the CLI is responsible for that check.
export function buildNoteMarkdown(p: ParsedPlayer, _f: PlayerFlags): string {
  const frontmatter = buildFrontmatter(p);
  const body = buildBody(p);

  if (!body) {
    return `---\n${frontmatter}\n---\n`;
  }
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}
