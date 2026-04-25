import matter from 'gray-matter';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConceptNote, EntityType } from './types.ts';

const ENTITY_TYPES: ReadonlySet<string> = new Set<EntityType>([
  'cvar',
  'command',
  'macro',
  'cmdline_param',
  'ruleset',
]);

// Notes use canonical_id strings like ezquake:cvar:cl_bob in their
// related_entities[] frontmatter. Some refs use non-entity prefixes
// (commit, pr, extension, etc.) that don't map to Layer 1 rows; we keep
// those in external_refs for the asking LLM to inspect but never index
// them in the reverse-lookup map.
function partitionRefs(raw: unknown[]): { entities: string[]; external: string[] } {
  const entities: string[] = [];
  const external: string[] = [];
  for (const ref of raw) {
    if (typeof ref !== 'string') continue;
    const parts = ref.split(':');
    if (parts.length !== 3) {
      external.push(ref);
      continue;
    }
    if (ENTITY_TYPES.has(parts[1])) {
      entities.push(ref);
    } else {
      external.push(ref);
    }
  }
  return { entities, external };
}

export function loadAllConcepts(conceptsDir: string): Map<string, ConceptNote> {
  const out = new Map<string, ConceptNote>();
  const files = readdirSync(conceptsDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const text = readFileSync(resolve(conceptsDir, file), 'utf8');
    const parsed = matter(text);
    const fm = parsed.data as Record<string, unknown>;
    // Only load files whose frontmatter declares a slug. Cleanly excludes
    // README.md, OPERATIONS.md, _gap-report.md, _schema.md, etc.
    const slug = fm.slug;
    if (typeof slug !== 'string' || slug.length === 0) continue;

    const id = `concept:${slug}`;
    const rawRefs = Array.isArray(fm.related_entities) ? fm.related_entities : [];
    const { entities, external } = partitionRefs(rawRefs);

    out.set(id, {
      id,
      title: typeof fm.title === 'string' ? fm.title : id,
      body: parsed.content.trim(),
      related_entities: entities,
      external_refs: external,
      frontmatter: fm,
    });
  }
  return out;
}
