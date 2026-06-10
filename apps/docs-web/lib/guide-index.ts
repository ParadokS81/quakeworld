// Build-time entity->guide reverse-index (D7/D15/D19 amendment 2026-06-09).
//
// Reads apps/qw-oracle/curated/concept-notes/*.md front-matter at docs-build
// time, parses each note's `related_entities` list (format: '<project>:<kind>:<name>'
// or '<project>:<kind>:<name>:<scope>'), and builds a reverse lookup map keyed
// by '<project>:<kind>:<name>' (3 segments only; the 4th scope segment is dropped
// -- it is a qualifier on the entity ref, not part of the stable identity used
// by the docs reverse-index). Entries with kind == 'commit' are silently skipped
// (not a docs-surface entity type).
//
// ABSENT corpus is handled gracefully (D11): if the curated/ directory is absent,
// readdirSync throws and the function returns an empty Map. But note: the LIVE
// corpus is NON-EMPTY -- 52 notes resolve 286 refs to real docs entities (verified
// cold). So buildGuideIndex() normally returns a NON-EMPTY map.
//
// RENDER SUPPRESSION (D7/D21, the load-bearing v1 constraint):
// The guides portal (the /guides/<slug> link target) is a LATER docs-web arc.
// Until it ships, rendering any "Used in" link would be a dead 404 (D7 "no dead
// links" + D21 "no guides portal in v1"). The reverse-index is BUILT + unit-tested
// now (wiring proof, D22-style), but render is SUPPRESSED via the flag below. The
// browse.ts wiring point reads GUIDES_PORTAL_LIVE and sets usedInGuides = [] for
// every entity while it is false, so v1 renders ZERO "Used in" links BY
// CONSTRUCTION -- not because the corpus is empty (it isn't). Flip to true in the
// arc that ships the portal. See D7/D19/D21 amendment 2026-06-09.
//
// Uses Node fs/path (build-time only); the module is imported by browse.ts (a
// build-time module), never by a Vue component. D15 clean: logic lives here,
// not in the card.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GuideRef } from './browse-types'

// Render gate (D7/D21). FALSE in docs v1: the guides portal does not exist yet,
// so any "Used in" link would 404. The reverse-index is built + tested regardless
// (the mechanism is proven independent of this flag); only RENDER is gated. The
// arc that ships the guides portal flips this to true.
export const GUIDES_PORTAL_LIVE = false

// Minimal YAML front-matter extractor: strips the leading/trailing '---' fences
// and returns the block as a string. Returns null if the file does not start
// with '---'. Does NOT use a full YAML parser -- the related_entities list is
// structurally simple (a YAML list of strings), parseable with split/trim.
function extractFrontmatter(content: string): string | null {
  if (!content.startsWith('---')) return null
  const end = content.indexOf('\n---', 3)
  if (end === -1) return null
  return content.slice(4, end)
}

// Parse the `related_entities:` YAML list from a raw front-matter string.
// Returns an array of entry strings. Handles the YAML list-item format:
//   related_entities:
//     - project:kind:name
// Returns empty array when the key is absent or the list is empty.
function parseRelatedEntities(fm: string): string[] {
  const lines = fm.split('\n')
  const startIdx = lines.findIndex((l) => l.trimStart().startsWith('related_entities:'))
  if (startIdx === -1) return []

  const entries: string[] = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    // A list item starts with optional whitespace + '- '
    if (/^\s+-\s+/.test(line)) {
      entries.push(line.replace(/^\s+-\s+/, '').trim())
    } else if (line.trimStart().length > 0 && !/^\s/.test(line) && !line.startsWith(' ')) {
      // A non-indented non-empty line signals a new top-level YAML key; stop.
      break
    } else if (line.trim() === '') {
      // Blank lines between items are OK; a blank line after the block stops.
      if (entries.length > 0) break
    }
  }
  return entries
}

// Normalize a related_entities entry to a 3-segment key. Drops the 4th scope
// segment if present. Returns null for entries that are not valid docs-surface
// entity references (fewer than 3 segments, or kind == 'commit').
function toIndexKey(entry: string): string | null {
  const parts = entry.split(':')
  if (parts.length < 3) return null
  const [project, kind, name] = parts
  if (kind === 'commit') return null
  if (!project || !kind || !name) return null
  return `${project}:${kind}:${name}`
}

// Parse a note's slug from its front-matter string. Falls back to null.
function parseSlug(fm: string): string | null {
  const m = fm.match(/^slug:\s*(.+)$/m)
  return m ? m[1].trim() : null
}

// Absolute path to the concept-notes directory. Resolved relative to this
// module's location at apps/docs-web/lib/ via the SAME fileURLToPath pattern
// lib/snapshot.ts uses (consistency; no import.meta.dirname Node-version risk).
// qw-oracle is a SIBLING of docs-web under apps/, so the climb is TWO '..':
// lib/ -> docs-web/ -> apps/, then into qw-oracle/curated/concept-notes/.
// Verified 2026-06-10: this resolves to
// /home/paradoks/projects/quakeworld/apps/qw-oracle/curated/concept-notes (exists).
// (An earlier draft used three '..', overshooting to a nonexistent
// monorepo-root/qw-oracle -- that would have silently emptied the index.)
const NOTES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'qw-oracle',
  'curated',
  'concept-notes'
)

// Build the reverse index. Exported for testing (pass a custom notesDir to
// test against fixture content). build-time callers use the default.
export function buildGuideIndex(
  notesDir: string = NOTES_DIR
): Map<string, GuideRef[]> {
  const index = new Map<string, GuideRef[]>()

  let files: string[]
  try {
    files = readdirSync(notesDir).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  } catch {
    // Directory absent -- graceful empty-corpus path (D11, AUG-3).
    return index
  }

  for (const file of files) {
    const content = readFileSync(join(notesDir, file), 'utf-8')
    const fm = extractFrontmatter(content)
    if (!fm) continue

    const slug = parseSlug(fm)
    if (!slug) continue

    const entries = parseRelatedEntities(fm)
    for (const entry of entries) {
      const key = toIndexKey(entry)
      if (!key) continue

      const ref: GuideRef = {
        slug,
        path: `/guides/${slug}`,
      }

      const existing = index.get(key)
      if (existing) {
        existing.push(ref)
      } else {
        index.set(key, [ref])
      }
    }
  }

  return index
}

// Convenience lookup: returns the GuideRef array for a given entity, or an
// empty array when the entity has no guide associations (the default in v1).
export function getGuideRefs(
  index: Map<string, GuideRef[]>,
  codebase: string,
  type: string,
  name: string
): GuideRef[] {
  return index.get(`${codebase}:${type}:${name}`) ?? []
}
