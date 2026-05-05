// apps/qw-oracle/scripts/load-community/clans/emit-note.ts
//
// Pure markdown emitter: ParsedClan + ClanFlags -> markdown string.
// No IO, no DB. The CLI (T7) writes the file.

import type { ParsedClan } from './parse.ts';
import type { ClanFlags } from './flags.ts';

// ---------------------------------------------------------------------------
// YAML helpers (private; duplicated from players/emit-note.ts -- no shared module)
// ---------------------------------------------------------------------------

// Characters that require quoting a YAML scalar value.
// Covers: special leading chars, embedded colons/hashes, brackets/braces/pipes,
// angle brackets, exclamation, ampersand, asterisk, question mark, comma,
// double/single quotes, newlines, and leading/trailing whitespace.
const YAML_NEEDS_QUOTE_RE = /[:{}\[\]|>#!&*?,"'\n]|^[- ]| $/;

// Escape a string for YAML flow-scalar use with double quotes.
function yamlEscapeDouble(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

// Return a YAML value representation for a string field.
// null -> '' (bare empty after colon).
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

// ---------------------------------------------------------------------------
// Wikitext-to-markdown conversion (light pass; duplicated from players/emit-note.ts)
// ---------------------------------------------------------------------------

function wikitextToMarkdown(text: string): string {
  // Strip HTML comments.
  let out = text.replace(/<!--[\s\S]*?-->/g, '');

  // Strip wiki magic words and Category: lines.
  out = out.replace(/^__\w+__\s*$/gm, '');
  out = out.replace(/^\[\[Category:[^\]]*\]\]\s*$/gim, '');
  out = out.replace(/^Category:[^\n]*$/gim, '');

  // {{#ev:youtube|<id>|<size>}} -> [YouTube video](https://youtube.com/watch?v=<id>)
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
// Body helpers
// ---------------------------------------------------------------------------

// Sentinel check: returns true when a section value is only a ?? or ??? marker.
function isSentinelOnly(s: string): boolean {
  const t = s.trim();
  return t === '??' || t === '???';
}

// ---------------------------------------------------------------------------
// Frontmatter + body builders
// ---------------------------------------------------------------------------

function buildFrontmatter(c: ParsedClan, f: ClanFlags): string {
  const lines: string[] = [
    `slug: ${yamlStr(c.slug)}`,
    `title: ${yamlStr(c.title)}`,
    `type: clan`,
    `prefix: ${yamlStr(c.prefix)}`,
    `nationality: ${yamlStr(c.nationality)}`,
    `nationality_iso: ${yamlStr(c.nationality_iso)}`,
    `founded_year: ${yamlNum(c.founded_year)}`,
    `founded_month: ${yamlNum(c.founded_month)}`,
    `founded_day: ${yamlNum(c.founded_day)}`,
    `founded_by: ${yamlStr(c.founded_by)}`,
    `disbanded: ${yamlStr(c.disbanded)}`,
    `status: ${c.status}`,
    `irc_channel: ${yamlStr(c.irc_channel)}`,
    `irc_network: ${yamlStr(c.irc_network)}`,
    `website: ${yamlStr(c.website)}`,
    `source_template: ${f.source_template}`,
    `wiki_revision_id: ${c.wiki_revision_id}`,
    `wiki_fetched_at: ${c.wiki_fetched_at}`,
  ];
  return lines.join('\n');
}

function buildBody(c: ParsedClan): string {
  const parts: string[] = [];

  const push = (heading: string, raw: string): void => {
    if (!raw || isSentinelOnly(raw)) return;
    const converted = wikitextToMarkdown(raw).trimEnd();
    if (!converted) return;
    parts.push(`## ${heading}\n\n${converted}`);
  };

  // Narrative intro: no section heading, goes directly as first paragraph.
  if (c.narrative_intro && !isSentinelOnly(c.narrative_intro)) {
    const converted = wikitextToMarkdown(c.narrative_intro).trimEnd();
    if (converted) parts.push(converted);
  }

  push('History', c.history_section);
  push('Achievements', c.achievements_section);
  push('See also', c.see_also_section);
  push('External links', c.external_links_section);

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Build the full markdown note for a clan.
// The _flags argument is accepted for the parallel CLI signature; the emitter
// does not gate on has_note -- the CLI is responsible for that check.
export function buildClanNoteMarkdown(c: ParsedClan, f: ClanFlags): string {
  const fm = buildFrontmatter(c, f);
  const body = buildBody(c);
  if (!body) return `---\n${fm}\n---\n`;
  return `---\n${fm}\n---\n\n${body}\n`;
}
