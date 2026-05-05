// apps/qw-oracle/scripts/load-community/shared/wiki-text.ts
//
// Generic wikitext helper functions. Pure: no IO, no DB.
// All inputs are wikitext strings from snapshot articles; non-ASCII data is preserved as-is.

import { nationalityToIso } from './iso-country.ts';

// ---------------------------------------------------------------------------
// Infobox extraction
// ---------------------------------------------------------------------------

/**
 * Return the content INSIDE the outer {{templateName|...}} braces, or null if
 * the template is absent. Case-insensitive on templateName.
 *
 * Handles nested {{ }} one level deep so that fields like |history=\n{{TH|...}}
 * don't cause premature termination.
 */
export function extractInfoboxBlock(wikitext: string, templateName: string): string | null {
  if (!wikitext) return null;

  // Strip HTML comments before searching -- template uses inside <!-- --> are not live.
  const stripped = wikitext.replace(/<!--[\s\S]*?-->/g, '');

  // Build a case-insensitive search prefix: {{ followed by optional whitespace and the name.
  const needle = `{{${templateName}`;
  const lower = stripped.toLowerCase();
  const needleLower = needle.toLowerCase();

  let searchFrom = 0;
  while (searchFrom < lower.length) {
    const start = lower.indexOf(needleLower, searchFrom);
    if (start === -1) return null;

    // After the template name there must be | or }} or whitespace then | or }}.
    const afterName = start + needle.length;
    const ch = stripped[afterName];
    if (ch !== '|' && ch !== '}' && ch !== '\n' && ch !== ' ' && ch !== '\t') {
      // This is a longer template name that starts with our needle -- skip it.
      searchFrom = afterName;
      continue;
    }

    // Walk forward, counting brace depth, to find the matching }}.
    let depth = 0;
    let i = start;
    while (i < stripped.length) {
      if (stripped[i] === '{' && stripped[i + 1] === '{') {
        depth++;
        i += 2;
      } else if (stripped[i] === '}' && stripped[i + 1] === '}') {
        depth--;
        if (depth === 0) {
          // Return content between the opening {{ and closing }}.
          return stripped.slice(start + 2, i);
        }
        i += 2;
      } else {
        i++;
      }
    }

    // Unclosed template -- treat as not found, try next occurrence.
    searchFrom = afterName;
  }

  return null;
}

/**
 * Parse the content returned by extractInfoboxBlock into a key/value map.
 *
 * The block is everything inside the outer {{ }}, i.e. "Infobox player\n|id=Milton\n|...".
 * Fields are separated by | at the top level (not inside nested {{ }} or [[ ]]).
 * The first segment (before the first |) is the template name -- discarded.
 */
export function parseInfoboxFields(block: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Split on top-level pipes.
  const segments = splitTopLevelPipes(block);

  // First segment is the template name -- skip it.
  for (let idx = 1; idx < segments.length; idx++) {
    const seg = segments[idx]!;
    const eqPos = seg.indexOf('=');
    if (eqPos === -1) {
      // Positional parameter -- rare in these infoboxes; skip.
      continue;
    }
    const key = seg.slice(0, eqPos).trim();
    const value = seg.slice(eqPos + 1).trim();
    if (key.length > 0) {
      result[key] = value;
    }
  }

  return result;
}

/** Split a string on | characters that are not inside {{ }} or [[ ]]. */
function splitTopLevelPipes(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;       // tracks {{ depth
  let sqDepth = 0;     // tracks [[ depth
  let start = 0;

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && s[i + 1] === '{') {
      depth++;
      i++;
    } else if (s[i] === '}' && s[i + 1] === '}') {
      if (depth > 0) depth--;
      i++;
    } else if (s[i] === '[' && s[i + 1] === '[') {
      sqDepth++;
      i++;
    } else if (s[i] === ']' && s[i + 1] === ']') {
      if (sqDepth > 0) sqDepth--;
      i++;
    } else if (s[i] === '|' && depth === 0 && sqDepth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

// ---------------------------------------------------------------------------
// Section body extraction
// ---------------------------------------------------------------------------

/**
 * Return the text between ==headingTitle== and the next == heading, or end of
 * document. Heading whitespace around the title is ignored. Case-insensitive.
 * Returns null if heading is absent.
 */
export function extractSectionBody(wikitext: string, headingTitle: string): string | null {
  if (!wikitext) return null;

  // Match == ... <title> ... == with optional surrounding whitespace; not a sub-heading (===).
  // We do a case-insensitive search manually.
  const lower = wikitext.toLowerCase();
  const titleLower = headingTitle.toLowerCase();

  // Find lines that start with == (but not ===) and contain the title.
  const headingRe = /^(=+)\s*(.*?)\s*\1\s*$/m;
  const lines = wikitext.split('\n');
  const linesLower = lower.split('\n');

  let startLine = -1;
  let headingLevel = 2;

  for (let i = 0; i < lines.length; i++) {
    const lineL = linesLower[i]!.trim();
    const m = headingRe.exec(lines[i]!);
    if (!m) continue;
    const level = m[1]!.length;
    const titlePart = m[2]!.toLowerCase();
    if (level === 2 && titlePart === titleLower) {
      startLine = i;
      headingLevel = level;
      break;
    }
  }

  if (startLine === -1) return null;

  // Collect lines until the next heading of the same or higher level.
  const nextHeadingRe = /^(=+)\s/;
  const bodyLines: string[] = [];
  for (let i = startLine + 1; i < lines.length; i++) {
    const m = nextHeadingRe.exec(lines[i]!);
    if (m && m[1]!.length <= headingLevel) break;
    bodyLines.push(lines[i]!);
  }

  return bodyLines.join('\n');
}

// ---------------------------------------------------------------------------
// Markup stripping
// ---------------------------------------------------------------------------

/**
 * Remove wikimarkup for byte-length measurement (D6/D7 thresholds).
 * Does NOT strip arbitrary templates -- only wikilinks, image links,
 * ref tags, and emphasis markers.
 *
 * Result is plain text with collapsed whitespace.
 */
export function stripWikiMarkup(text: string): string {
  let s = text;

  // Remove <ref>...</ref> including multi-line.
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  // Remove self-closing <ref .../>.
  s = s.replace(/<ref[^/]*(\/)?>/gi, '');

  // Remove [[Image:...]] or [[File:...]] patterns entirely.
  s = s.replace(/\[\[(?:Image|File):[^\]]*\]\]/gi, '');

  // Resolve [[Foo|Bar]] -> Bar, [[Foo]] -> Foo.
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');

  // Remove ''' and '' emphasis markers.
  s = s.replace(/'{2,3}/g, '');

  // Collapse multiple whitespace (including newlines) into a single space.
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

// ---------------------------------------------------------------------------
// Link resolution
// ---------------------------------------------------------------------------

/**
 * Parse a single [[Foo|Bar]] or [[Foo]] wiki link.
 * If the input is not a wiki link pattern, returns the input for both fields.
 */
export function resolveWikiLink(linkText: string): { target: string; display: string } {
  const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(linkText.trim());
  if (!m) return { target: linkText, display: linkText };
  const target = m[1]!.trim();
  const display = m[2] !== undefined ? m[2]!.trim() : target;
  return { target, display };
}

// ---------------------------------------------------------------------------
// Category-derived nationality
// ---------------------------------------------------------------------------

/**
 * Look for a Category:<X> Players entry and resolve <X> to an ISO code.
 * Returns null if no resolvable nationality category is found.
 */
export function extractCategoryNationality(
  categories: string[],
): { nationality: string; iso: string } | null {
  for (const cat of categories) {
    // Match "Category:Finnish Players" or "Category:Finnish players" (case-insensitive suffix).
    const m = /^Category:(.+?)\s+players$/i.exec(cat);
    if (!m) continue;
    const candidate = m[1]!.trim();
    const iso = nationalityToIso(candidate);
    if (iso !== null) {
      return { nationality: candidate, iso };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Flag ISO extraction
// ---------------------------------------------------------------------------

/**
 * Find the first [[Image:flag_<iso>.gif]] (or [[image:...]]) and return the
 * ISO code (e.g. 'fi', 'se', 'dk'). Returns null if no match.
 */
export function extractFlagIso(text: string): string | null {
  const m = /\[\[(?:Image|image|File|file):flag_([a-z]{2})\.gif\]\]/i.exec(text);
  return m ? m[1]!.toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// CSV / wiki-link list splitting
// ---------------------------------------------------------------------------

/**
 * Split on commas, trim each part, filter empty strings and placeholder tokens
 * ('???', '??'). Case-preserving.
 */
export function splitCsv(s: string): string[] {
  return s
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== '???' && p !== '??');
}

/**
 * Split a string of "[[A]], [[B|C]]" on commas, resolve each link to its
 * display text, trim, filter empty strings.
 */
export function splitWikiLinks(s: string): string[] {
  return s
    .split(',')
    .map((p) => resolveWikiLink(p.trim()).display.trim())
    .filter((p) => p.length > 0);
}

// ---------------------------------------------------------------------------
// Year parsing
// ---------------------------------------------------------------------------

/**
 * Extract the first 4-digit year (1900-2099) from a string.
 * Handles [[1997]] link form. Returns null on miss.
 */
export function parseYear(s: string): number | null {
  // Strip wiki link brackets first.
  const clean = s.replace(/\[\[(\d{4})\]\]/g, '$1');
  const m = /\b((?:19|20)\d{2})\b/.exec(clean);
  return m ? parseInt(m[1]!, 10) : null;
}

// ---------------------------------------------------------------------------
// Dash normalization
// ---------------------------------------------------------------------------

/**
 * Replace Unicode dashes (em-dash U+2014, en-dash U+2013, figure-dash U+2012)
 * with ASCII hyphen-minus. Wiki editors sometimes paste these from word processors.
 */
export function normalizeDash(s: string): string {
  // U+2014 em dash, U+2013 en dash, U+2012 figure dash.
  return s.replace(/[‒–—]/g, '-');
}
