// Build-time cvar-to-cvar link resolver (D7/D15/D19). Takes the set of entity
// names for one codebase and a description text, returns pre-computed spans so
// EntityCard renders cvar names as clickable anchors without v-html (D15 / AUG-2).
//
// D19 constraint: resolution is WITHIN one codebase only. Cross-fork auto-link
// would assert a false equivalence (forks share names but differ in meaning).
//
// Detection rule: a cvar name is recognized when it appears as a whole token --
// preceded by a word boundary (start-of-string, whitespace, or punctuation) and
// followed by a word boundary. Most cvar names use underscores (treated as
// word characters for this purpose: a match must be exact).
//
// Performance: name set is sorted longest-first so a longer name wins over a
// shorter prefix when both match at the same position (e.g., 'cl_weaponhide_axe'
// beats 'cl_weaponhide').
//
// Pure -- no fs, no Vue, no framework imports (D15).
import type { DescriptionSegment } from './browse-types'
import { entityAnchor } from './anchor'

// Build a resolver for one codebase's entity-name set. Returns a function that
// accepts a description string and produces the segment array. The set is compiled
// once (call buildCvarLinker) and reused across all entities in the codebase.
export function buildCvarLinker(
  entityNames: string[]
): (description: string) => DescriptionSegment[] {
  if (entityNames.length === 0) {
    return (text) => [{ kind: 'text', text }]
  }

  // Sort longest-first: a greedy scan at each position picks the longest match,
  // preventing a shorter prefix from winning when both overlap.
  const sorted = [...entityNames].sort((a, b) => b.length - a.length)

  // Escape each name for use in a regex alternation.
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  // Word-boundary pattern: a cvar name must be preceded/followed by a character
  // that is NOT a word character (letter, digit, underscore). Start/end of
  // string also qualifies. We use lookahead/lookbehind for zero-width matching.
  const pattern = new RegExp(
    `(?<![\\w])(?:${escaped.join('|')})(?![\\w])`,
    'g'
  )

  return function linkDescription(text: string): DescriptionSegment[] {
    const segments: DescriptionSegment[] = []
    let last = 0

    for (const match of text.matchAll(pattern)) {
      const start = match.index!
      const name = match[0]

      if (start > last) {
        segments.push({ kind: 'text', text: text.slice(last, start) })
      }
      segments.push({ kind: 'link', name, anchor: entityAnchor(name) })
      last = start + name.length
    }

    if (last < text.length) {
      segments.push({ kind: 'text', text: text.slice(last) })
    }

    // If no links were found, return undefined-signal: a single text segment
    // is equivalent to no linking having occurred. Browse.ts omits the field
    // when the result is a single-text-only segment (optimization: card skips
    // segment render and falls back to descriptionFull plain text).
    return segments
  }
}
